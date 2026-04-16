const express = require('express')
const router  = express.Router()
const http    = require('http')
const https   = require('https')
const { Op, literal } = require('sequelize')
const { protect, authorize } = require('../../../middleware/auth')
const Place = require('../models/Place')
const Tag = require('../../tagManagement/models/Tag')
const UserInterest = require('../../userManagement/models/UserInterest')

const normalizeAiBaseUrl = (rawValue) => {
  const raw = String(rawValue || '').trim()
  if (!raw) return ''
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  return withProtocol.replace(/\/+$/, '')
}

const AI_BASE_URL = normalizeAiBaseUrl(process.env.AI_BASE_URL)
const AI_HOST = process.env.AI_HOST || 'localhost'
const AI_PORT = parseInt(process.env.AI_SERVICE_PORT || process.env.AI_PORT || '5001', 10)
const PLACE_AI_TIMEOUT_MS = parseInt(process.env.PLACE_AI_TIMEOUT_MS || '35000', 10)
const PLACE_AI_CACHE_TTL_MS = parseInt(process.env.PLACE_AI_CACHE_TTL_MS || '300000', 10)
const MAX_TOP_N = 100

// In-memory cache avoids repeated AI round-trips for identical query params.
const placeRecommendationCache = new Map()

const cacheKeyFor = ({ userId, districtId, topN }) => `${userId}:${districtId}:${topN}`

const getCachedRecommendations = (key) => {
  const entry = placeRecommendationCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    placeRecommendationCache.delete(key)
    return null
  }
  return entry.payload
}

const setCachedRecommendations = (key, payload) => {
  placeRecommendationCache.set(key, {
    payload,
    expiresAt: Date.now() + PLACE_AI_CACHE_TTL_MS,
  })
}

const parseDurationHours = (duration) => {
  if (!duration) return 0
  const text = String(duration).toLowerCase().trim()
  if (!text) return 0
  if (text.includes('full day')) return 8
  if (text.includes('half day')) return 4

  const rangeMatch = text.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/)
  if (rangeMatch) {
    const low = Number(rangeMatch[1])
    const high = Number(rangeMatch[2])
    if (Number.isFinite(low) && Number.isFinite(high)) return Math.round((low + high) / 2)
  }

  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)/)
  if (hourMatch) {
    const hours = Number(hourMatch[1])
    if (Number.isFinite(hours)) return Math.max(1, Math.round(hours))
  }

  const dayMatch = text.match(/(\d+(?:\.\d+)?)\s*(d|day|days)/)
  if (dayMatch) {
    const days = Number(dayMatch[1])
    if (Number.isFinite(days)) return Math.max(8, Math.round(days * 8))
  }

  return 0
}

const buildFallbackRecommendations = async ({ userId, districtId, topN, reason }) => {
  // Fallback ranking uses user interest tags + place rating so UX stays usable
  // even during AI cold starts or transient upstream failures.
  const interests = await UserInterest.findAll({
    where: { user_id: userId },
    attributes: ['tag_id'],
    raw: true,
  })
  const interestTagSet = new Set(interests.map((row) => Number(row.tag_id)).filter((v) => Number.isFinite(v)))

  const placeRows = await Place.findAll({
    where: {
      district_id: districtId,
      isActive: true,
      place_id: { [Op.notIn]: literal('(SELECT "place_id" FROM "hotels")') },
    },
    include: [{
      model: Tag,
      as: 'tags',
      attributes: ['tag_id', 'tag_name'],
      through: { attributes: [] },
      required: false,
    }],
    order: [['rating', 'DESC'], ['review_count', 'DESC'], ['name', 'ASC']],
    limit: Math.min(Math.max(topN * 3, topN), MAX_TOP_N),
  })

  const scored = placeRows
    .map((row) => {
      const place = row.toJSON()
      const tags = Array.isArray(place.tags) ? place.tags : []
      const matchedTags = tags.filter((tag) => interestTagSet.has(Number(tag.tag_id)))
      const interestBoost = matchedTags.length * 1.5
      const baseRating = Number(place.rating || 0)
      const finalScore = Number((baseRating + interestBoost).toFixed(3))

      return {
        place_id: place.place_id,
        place_name: place.name || '',
        place_description: place.description || '',
        type: place.type || '',
        duration_hours: parseDurationHours(place.duration),
        image_url: place.image_url || '',
        tag_names: tags.map((tag) => tag.tag_name).filter(Boolean).join(', '),
        rating: Number(place.rating || 0),
        lat: place.lat,
        lng: place.lng,
        final_score: finalScore,
        weather_adjusted_score: finalScore,
        weather_label: 'unknown',
        match_reason: matchedTags.length > 0
          ? `Matched ${matchedTags.length} of your interest tags`
          : 'Ranked by rating and review count',
        temperature: null,
        fallback_reason: reason,
      }
    })
    .sort((a, b) => (b.weather_adjusted_score - a.weather_adjusted_score) || (b.rating - a.rating))
    .slice(0, topN)

  return {
    user_id: userId,
    district_id: districtId,
    count: scored.length,
    recommendations: scored,
    fallback: true,
  }
}

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
 * GET /api/places/ai-recommend
 * Proxies to the Flask AI recommendation service.
 * Query params: district_id (required), top_n (optional, default 15)
 * Auth: Bearer token (user_id taken from authenticated session)
 */
router.get('/ai-recommend', protect, (req, res) => {
  const { district_id, top_n = 15 } = req.query
  const user_id = req.user?.id
  const districtId = parseInt(district_id, 10)
  const topN = Math.min(Math.max(parseInt(top_n, 10) || 15, 1), MAX_TOP_N)

  if (!district_id) {
    return res.status(400).json({ success: false, message: 'district_id is required' })
  }
  if (!Number.isInteger(districtId) || districtId <= 0) {
    return res.status(400).json({ success: false, message: 'district_id must be a positive integer' })
  }

  aiMonitorCounters.totalRequests += 1
  if (!user_id) {
    return res.status(401).json({ success: false, message: 'Not authenticated' })
  }

  const key = cacheKeyFor({ userId: user_id, districtId, topN })
  const cached = getCachedRecommendations(key)
  if (cached) {
    return res.json({ success: true, ...cached, cacheHit: true })
  }

  const query  = new URLSearchParams({ user_id: String(user_id), district_id: String(districtId), top_n: String(topN) })
  const aiPath = `/recommend?${query.toString()}`
  const { client, options } = resolveAiTarget(aiPath, PLACE_AI_TIMEOUT_MS)
  let hasResponded = false

  const sendFallback = async (reason) => {
    if (hasResponded || res.headersSent) return
    try {
      const fallbackPayload = await buildFallbackRecommendations({
        userId: user_id,
        districtId,
        topN,
        reason,
      })
      // Do not cache fallback payloads; immediate retries should still attempt live AI.
      hasResponded = true
      return res.json({ success: true, ...fallbackPayload })
    } catch {
      hasResponded = true
      return res.status(503).json({
        success: false,
        message: 'AI service is unavailable. Please try again shortly.',
      })
    }
  }

  const proxyReq = client.get(
    options,
    (proxyRes) => {
      let raw = ''
      proxyRes.on('data', chunk => { raw += chunk })
      proxyRes.on('end', async () => {
        if (hasResponded || res.headersSent) return
        try {
          const parsed = JSON.parse(raw)
          if (proxyRes.statusCode === 200) {
            aiMonitorCounters.successfulResponses += 1
            setCachedRecommendations(key, parsed)
            hasResponded = true
            return res.json({ success: true, ...parsed })
          }
          aiMonitorCounters.unavailableResponses += 1
          return sendFallback('unavailable')
        } catch {
          aiMonitorCounters.invalidResponses += 1
          return sendFallback('invalid')
        }
      })
    }
  )

  proxyReq.on('timeout', () => {
    proxyReq.destroy()
    aiMonitorCounters.timeoutResponses += 1
    return sendFallback('timeout')
  })

  proxyReq.on('error', () => {
    aiMonitorCounters.unavailableResponses += 1
    return sendFallback('unavailable')
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
