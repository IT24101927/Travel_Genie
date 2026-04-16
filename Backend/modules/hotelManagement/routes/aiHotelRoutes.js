const express = require('express')
const router = express.Router()
const http = require('http')
const https = require('https')
const { Op } = require('sequelize')
const { protect, authorize } = require('../../../middleware/auth')
const Hotel = require('../models/Hotel')
const Place = require('../../placeManagement/models/Place')
const District = require('../../placeManagement/models/District')
const UserPreference = require('../../userManagement/models/UserPreference')

const normalizeAiBaseUrl = (rawValue) => {
  const raw = String(rawValue || '').trim()
  if (!raw) return ''
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  return withProtocol.replace(/\/+$/, '')
}

const AI_BASE_URL = normalizeAiBaseUrl(process.env.AI_BASE_URL)
const AI_HOST = process.env.AI_HOST || 'localhost'
const AI_PORT = parseInt(process.env.AI_SERVICE_PORT || process.env.AI_PORT || '5001', 10)
const HOTEL_AI_TIMEOUT_MS = parseInt(process.env.HOTEL_AI_TIMEOUT_MS || '35000', 10)
const HOTEL_AI_CACHE_TTL_MS = parseInt(process.env.HOTEL_AI_CACHE_TTL_MS || '300000', 10)
const MAX_TOP_N = 100

// In-memory cache avoids repeating expensive AI requests for same user/context.
const hotelRecommendationCache = new Map()

const cacheKeyFor = ({ userId, districtId, topN, hotelType }) => `${userId}:${districtId}:${topN}:${hotelType || 'all'}`

const getCachedRecommendations = (key) => {
  const entry = hotelRecommendationCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    hotelRecommendationCache.delete(key)
    return null
  }
  return entry.payload
}

const setCachedRecommendations = (key, payload) => {
  hotelRecommendationCache.set(key, {
    payload,
    expiresAt: Date.now() + HOTEL_AI_CACHE_TTL_MS,
  })
}

const matchesWeatherPreference = (preferredWeather, hotelType) => {
  const pref = String(preferredWeather || '').toLowerCase().trim()
  const type = String(hotelType || '').toLowerCase().trim()
  if (!pref || pref === 'any' || pref === 'all') return true
  if (pref === 'rainy') return type.includes('resort') || type.includes('boutique') || type.includes('villa')
  if (pref === 'sunny') return type.includes('resort') || type.includes('hotel') || type.includes('villa')
  if (pref === 'cool') return type.includes('boutique') || type.includes('villa') || type.includes('guesthouse')
  return false
}

const buildFallbackRecommendations = async ({ userId, districtId, topN, hotelType, reason }) => {
  // If AI is unavailable, build a deterministic ranking from hotel quality signals
  // plus the user's weather preference.
  const pref = await UserPreference.findByPk(userId, {
    attributes: ['regional_prefs'],
    raw: true,
  })
  const preferredWeather = pref?.regional_prefs?.preferred_weather || 'Any'

  const hotelWhere = {}
  if (hotelType) hotelWhere.hotel_type = hotelType

  const rows = await Hotel.findAll({
    where: hotelWhere,
    include: [{
      model: Place,
      as: 'place',
      required: true,
      where: { district_id: districtId, isActive: true },
      include: [{ model: District, as: 'district', attributes: ['district_id', 'name', 'province'] }],
    }],
    order: [['rating', 'DESC'], ['review_count', 'DESC'], ['hotel_id', 'ASC']],
    limit: Math.min(Math.max(topN * 3, topN), MAX_TOP_N),
  })

  const recommendations = rows
    .map((row) => {
      const hotel = row.toJSON()
      const baseScore = Number(hotel.rating || 0) * 20
      const starBoost = Number(hotel.star_class || 0) * 4
      const reviewBoost = Math.min(Number(hotel.review_count || 0) / 10, 10)
      const weatherMatch = matchesWeatherPreference(preferredWeather, hotel.hotel_type)
      const weatherBoost = weatherMatch ? 6 : 0
      const scorePct = Math.max(0, Math.min(100, Math.round(baseScore + starBoost + reviewBoost + weatherBoost)))

      return {
        ...hotel,
        final_score: scorePct,
        weather_adjusted_score: scorePct,
        recommendation_score: scorePct,
        recommendation_reason: weatherMatch
          ? 'Ranked by quality and your weather preference'
          : 'Ranked by quality and review count',
        recommendation_badges: [
          Number(hotel.rating || 0) >= 4 ? 'Highly rated' : null,
          Number(hotel.star_class || 0) >= 4 ? `${hotel.star_class}-star stay` : null,
          weatherMatch ? 'Weather fit' : null,
        ].filter(Boolean),
        weather_label: 'unknown',
        temperature: null,
        fallback_reason: reason,
      }
    })
    .sort((a, b) => (Number(b.weather_adjusted_score || 0) - Number(a.weather_adjusted_score || 0)))
    .slice(0, topN)

  return {
    user_id: userId,
    district_id: districtId,
    count: recommendations.length,
    recommendations,
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
 * GET /api/hotels/ai-recommend
 * Proxies to Flask Hotel AI endpoint.
 * Query params: district_id (required), top_n (optional, default 12)
 * Auth: Bearer token (user_id is taken from authenticated session)
 */
router.get('/ai-recommend', protect, (req, res) => {
  const { district_id, top_n = 12, hotel_type } = req.query
  const user_id = req.user?.id
  const districtId = parseInt(district_id, 10)
  const topN = Math.min(Math.max(parseInt(top_n, 10) || 12, 1), MAX_TOP_N)
  const hotelType = hotel_type ? String(hotel_type).toLowerCase().trim() : ''

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

  const key = cacheKeyFor({ userId: user_id, districtId, topN, hotelType })
  const cached = getCachedRecommendations(key)
  if (cached) {
    return res.json({ success: true, ...cached, cacheHit: true })
  }

  const query = new URLSearchParams({
    user_id: String(user_id),
    district_id: String(districtId),
    top_n: String(topN),
  })
  if (hotelType) query.set('hotel_type', hotelType)

  const aiPath = `/hotels/recommend?${query.toString()}`
  const { client, options } = resolveAiTarget(aiPath, HOTEL_AI_TIMEOUT_MS)
  let hasResponded = false

  const sendFallback = async (reason) => {
    if (hasResponded || res.headersSent) return
    try {
      const fallbackPayload = await buildFallbackRecommendations({
        userId: user_id,
        districtId,
        topN,
        hotelType,
        reason,
      })
      // Keep fallback responses uncached so refresh can quickly recover to live AI.
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
      proxyRes.on('data', (chunk) => { raw += chunk })
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
