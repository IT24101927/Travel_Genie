const express = require('express')
const router = express.Router()
const http = require('http')
const https = require('https')
const { protect, authorize } = require('../../../middleware/auth')

const AI_BASE_URL = process.env.AI_BASE_URL || ''
const AI_HOST = process.env.AI_HOST || 'localhost'
const AI_PORT = parseInt(process.env.AI_SERVICE_PORT || '5001', 10)

const resolveAiTarget = (path, timeout) => {
  if (AI_BASE_URL) {
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
 * GET /api/hotels/ai-recommend
 * Proxies to Flask Hotel AI endpoint.
 * Query params: district_id (required), top_n (optional, default 12)
 * Auth: Bearer token (user_id is taken from authenticated session)
 */
router.get('/ai-recommend', protect, (req, res) => {
  const { district_id, top_n = 12 } = req.query
  const user_id = req.user?.id

  if (!district_id) {
    return res.status(400).json({ success: false, message: 'district_id is required' })
  }

  aiMonitorCounters.totalRequests += 1
  if (!user_id) {
    return res.status(401).json({ success: false, message: 'Not authenticated' })
  }

  const query = new URLSearchParams({
    user_id: String(user_id),
    district_id: String(district_id),
    top_n: String(top_n),
  })
  const aiPath = `/hotels/recommend?${query.toString()}`
  const { client, options } = resolveAiTarget(aiPath, 60000)

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

router.get('/ai-monitor', protect, authorize('admin'), (req, res) => {
  const availabilityRate = aiMonitorCounters.totalRequests > 0
    ? (aiMonitorCounters.successfulResponses / aiMonitorCounters.totalRequests)
    : 0

  return res.json({
    success: true,
    metrics: {
      ...aiMonitorCounters,
      availabilityRate,
      fallbackUsageRate: 0,
    },
  })
})

router.get('/ai-service-health', protect, authorize('admin'), async (req, res) => {
  const health = await checkAiServiceHealth()
  return res.json({ success: true, health })
})

module.exports = router
