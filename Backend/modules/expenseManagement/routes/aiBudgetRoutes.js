const express = require('express')
const router = express.Router()
const http = require('http')
const https = require('https')
const { protect, authorize } = require('../../../middleware/auth')

const normalizeAiBaseUrl = (rawValue) => {
  const raw = String(rawValue || '').trim()
  if (!raw) return ''
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  return withProtocol.replace(/\/+$/, '')
}

const AI_BASE_URL = normalizeAiBaseUrl(process.env.AI_BASE_URL)
const AI_HOST = process.env.AI_HOST || 'localhost'
const AI_PORT = parseInt(process.env.AI_SERVICE_PORT || process.env.AI_PORT || '5001', 10)
const BUDGET_AI_TIMEOUT_MS = parseInt(process.env.BUDGET_AI_TIMEOUT_MS || '60000', 10)

// Resolve target either from full AI base URL (deployment) or host/port (local dev).
const resolveAiTarget = (path, timeout) => {
  if (AI_BASE_URL) {
    try {
      const base = new URL(AI_BASE_URL)
      const prefix = base.pathname && base.pathname !== '/' ? base.pathname.replace(/\/$/, '') : ''
      return {
        client: base.protocol === 'https:' ? https : http,
        options: {
          protocol: base.protocol,
          hostname: base.hostname,
          port: base.port || (base.protocol === 'https:' ? 443 : 80),
          path: `${prefix}${path}`,
          timeout,
        },
      }
    } catch {
      // Fall back to host/port mode when AI_BASE_URL is malformed.
    }
  }

  return {
    client: http,
    options: { host: AI_HOST, port: AI_PORT, path, timeout },
  }
}

const aiMonitorCounters = {
  totalRequests: 0,
  successfulResponses: 0,
  unavailableResponses: 0,
  timeoutResponses: 0,
  invalidResponses: 0,
  fallbackCycles: 0,
  applyServerAiSplit: 0,
  applyFallbackAiSplit: 0,
  applyRuleDefaultSplit: 0,
  applyCustomSplit: 0,
}

const checkAiServiceHealth = () => new Promise((resolve) => {
  const { client, options } = resolveAiTarget('/health', 4000)
  const req = client.get(
    options,
    (healthRes) => {
      let raw = ''
      healthRes.on('data', (chunk) => { raw += chunk })
      healthRes.on('end', () => {
        if (healthRes.statusCode !== 200) {
          resolve({ status: 'down', detail: `HTTP ${healthRes.statusCode}` })
          return
        }
        try {
          const parsed = JSON.parse(raw)
          resolve({ status: 'ok', service: parsed?.service || 'travelgenie-ai' })
        } catch {
          resolve({ status: 'degraded', detail: 'Invalid health payload' })
        }
      })
    }
  )

  req.on('timeout', () => {
    req.destroy()
    resolve({ status: 'down', detail: 'timeout' })
  })
  req.on('error', (err) => resolve({ status: 'down', detail: err.message }))
})

/**
 * GET /api/budget/ai-recommend
 * Proxies to Flask Budget AI endpoint.
 * Query params: district_id, total_budget (required), hotel_budget, days, hotel_nights,
 *               currency, selected_place_ids, selected_hotel_ids,
 *               split_food_pct, split_transport_pct, split_activities_pct
 */
router.get('/ai-recommend', protect, (req, res) => {
  const {
    district_id,
    total_budget,
    hotel_budget = 0,
    days = 1,
    hotel_nights = 0,
    currency = 'LKR',
    selected_place_ids = '',
    selected_hotel_ids = '',
    split_food_pct = '',
    split_transport_pct = '',
    split_activities_pct = '',
  } = req.query

  const user_id = req.user?.id

  if (!district_id) {
    return res.status(400).json({ success: false, message: 'district_id is required' })
  }
  if (total_budget === undefined || total_budget === null || total_budget === '') {
    return res.status(400).json({ success: false, message: 'total_budget is required' })
  }
  if (!user_id) {
    return res.status(401).json({ success: false, message: 'Not authenticated' })
  }

  aiMonitorCounters.totalRequests += 1

  // Forward the full planner context so AI can build per-day split and category guidance.
  const query = new URLSearchParams({
    user_id: String(user_id),
    district_id: String(district_id),
    total_budget: String(total_budget),
    hotel_budget: String(hotel_budget),
    days: String(days),
    hotel_nights: String(hotel_nights),
    currency: String(currency),
    selected_place_ids: String(selected_place_ids || ''),
    selected_hotel_ids: String(selected_hotel_ids || ''),
    split_food_pct: String(split_food_pct || ''),
    split_transport_pct: String(split_transport_pct || ''),
    split_activities_pct: String(split_activities_pct || ''),
  })

  const aiPath = `/budget/recommend?${query.toString()}`
  const { client, options } = resolveAiTarget(aiPath, BUDGET_AI_TIMEOUT_MS)

  const proxyReq = client.get(
    options,
    (proxyRes) => {
      let raw = ''
      proxyRes.on('data', (chunk) => { raw += chunk })
      proxyRes.on('end', () => {
        try {
          const parsed = JSON.parse(raw)
          if (proxyRes.statusCode === 200) {
            aiMonitorCounters.successfulResponses += 1
            return res.json({ success: true, ...parsed })
          }
          aiMonitorCounters.unavailableResponses += 1
          return res.status(proxyRes.statusCode).json({ success: false, ...(parsed || {}) })
        } catch {
          aiMonitorCounters.invalidResponses += 1
          return res.status(502).json({ success: false, message: 'Invalid response from AI service' })
        }
      })
    }
  )

  proxyReq.on('timeout', () => {
    proxyReq.destroy()
    aiMonitorCounters.timeoutResponses += 1
    if (!res.headersSent) {
      res.status(504).json({ success: false, message: 'AI service timed out' })
    }
  })

  proxyReq.on('error', (err) => {
    aiMonitorCounters.unavailableResponses += 1
    if (!res.headersSent) {
      res.status(503).json({
        success: false,
        message: 'AI service is unavailable. Make sure the recommendation server is running.',
        ...(process.env.NODE_ENV !== 'production' ? { detail: err.message } : {}),
      })
    }
  })
})

router.post('/ai-monitor-event', protect, (req, res) => {
  const event = String(req.body?.event || '').trim()
  // Events are intentionally whitelisted so clients cannot mutate arbitrary metrics.
  const supported = new Set([
    'fallback_cycle',
    'apply_server_ai_split',
    'apply_fallback_ai_split',
    'apply_rule_default_split',
    'apply_custom_split',
  ])

  if (!supported.has(event)) {
    return res.status(400).json({ success: false, message: 'Unsupported monitor event' })
  }

  const counterMap = {
    fallback_cycle: 'fallbackCycles',
    apply_server_ai_split: 'applyServerAiSplit',
    apply_fallback_ai_split: 'applyFallbackAiSplit',
    apply_rule_default_split: 'applyRuleDefaultSplit',
    apply_custom_split: 'applyCustomSplit',
  }

  aiMonitorCounters[counterMap[event]] += 1
  return res.json({ success: true })
})

router.get('/ai-monitor', protect, authorize('admin'), (req, res) => {
  const availabilityRate = aiMonitorCounters.totalRequests > 0
    ? (aiMonitorCounters.successfulResponses / aiMonitorCounters.totalRequests)
    : 0

  const appliedSplitEvents = aiMonitorCounters.applyServerAiSplit + aiMonitorCounters.applyFallbackAiSplit
  const fallbackUsageRate = appliedSplitEvents > 0
    ? (aiMonitorCounters.applyFallbackAiSplit / appliedSplitEvents)
    : 0

  return res.json({
    success: true,
    metrics: {
      ...aiMonitorCounters,
      availabilityRate,
      fallbackUsageRate,
    },
  })
})

router.get('/ai-service-health', protect, authorize('admin'), async (req, res) => {
  const health = await checkAiServiceHealth()
  return res.json({ success: true, health })
})

module.exports = router
