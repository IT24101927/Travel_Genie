import { useState, useEffect, useRef } from 'react'
import { clearUserData } from '../../utils/clearUserData'
import { API_BASE } from '../../config/api'
import { Link, useNavigate } from 'react-router-dom'
import { DAILY_SPLIT_DEFAULT, normalizeDailySplit, deriveAiFallbackSplit, validateStartToBudgetHandoff } from '../../utils/budgetPlanning'
import './TripBudget.css'

function isSameDailySplit(a, b) {
  const left = normalizeDailySplit(a)
  const right = normalizeDailySplit(b)
  return (
    left.food === right.food
    && left.transport === right.transport
    && left.activities_misc === right.activities_misc
  )
}

function mapHotel(h) {
  return {
    _id:        String(h.hotel_id || h.place_id),
    hotel_id:   h.hotel_id || null,
    place_id:   h.place_id || null,
    name:       h.place?.name        || h.name       || '',
    category:   h.hotel_type         || h.category   || 'hotel',
    starRating: h.star_class         || h.starRating  || 0,
    priceRange: { min: parseFloat(h.price_per_night) || 0, max: parseFloat(h.price_per_night) || 0, currency: 'LKR' },
    address:    { city: h.place?.district?.name || '' },
    description:h.place?.description || h.description || '',
    amenities:  Array.isArray(h.amenities) ? h.amenities : [],
    images:     [
      ...(h.image_url ? [{ url: h.image_url }] : []),
      ...(h.place?.images || []).map(img => ({ url: img.image_url || img.url || '' })),
    ],
    rating:     h.rating || 0,
    weather_label: h.weather_label || '',
    temperature: h.temperature ?? null,
  }
}

function weatherPresentation(value) {
  const token = String(value || '').trim().toLowerCase()
  if (!token) return { emoji: '🌀', label: 'Unknown' }
  if (token.includes('rain') || token.includes('storm') || token.includes('thunder')) return { emoji: '🌧️', label: 'Rainy' }
  if (token.includes('snow') || token.includes('ice') || token.includes('cold')) return { emoji: '❄️', label: 'Cold' }
  if (token.includes('fog') || token.includes('mist') || token.includes('cloud') || token.includes('mixed')) return { emoji: '🌤️', label: 'Mild' }
  if (token.includes('good') || token.includes('sun') || token.includes('clear')) return { emoji: '☀️', label: 'Sunny' }
  return { emoji: '🌀', label: 'Unknown' }
}

// Hotel prices are stored in LKR. LKR_RATES = units of target currency per 1 LKR
const LKR_RATES = { LKR: 1, USD: 0.0033, EUR: 0.0031 }
const CURRENCY_DECIMALS = { LKR: 0, USD: 0, EUR: 0 }

function getCurrencyDecimals(code) {
  return Object.prototype.hasOwnProperty.call(CURRENCY_DECIMALS, code) ? CURRENCY_DECIMALS[code] : 2
}

function roundByCurrency(value, code) {
  const decimals = getCurrencyDecimals(code)
  const factor = 10 ** decimals
  return Math.round((Number(value) || 0) * factor) / factor
}

function convertFromLKR(lkr, code) {
  return roundByCurrency((lkr || 0) * (LKR_RATES[code] || 1), code)
}

function convertToLKR(amount, fromCode) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0) return 0
  const fromRate = LKR_RATES[fromCode] || 1
  return value / fromRate
}

function convertCurrencyAmount(amount, fromCode, toCode) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0) return 0
  const fromRate = LKR_RATES[fromCode] || 1
  const toRate = LKR_RATES[toCode] || 1
  const inLkr = value / fromRate
  return Math.max(0, roundByCurrency(inLkr * toRate, toCode))
}

function diffDaysLocal(startStr, endStr) {
  if (!startStr || !endStr) return 0
  const s = new Date(startStr + 'T00:00:00')
  const e = new Date(endStr + 'T00:00:00')
  return Math.max(0, Math.round((e - s) / 86400000))
}

function getHotelNightlyRange(hotel) {
  const min = Number(hotel?.priceRange?.min ?? hotel?.price_per_night ?? 0) || 0
  const rawMax = Number(hotel?.priceRange?.max ?? hotel?.price_per_night ?? min)
  const max = rawMax > 0 ? rawMax : min
  return { min, max: Math.max(min, max) }
}

const CURRENCIES = [
  { code: 'LKR', symbol: 'Rs', label: 'Sri Lankan Rupee', flag: '🇱🇰' },
  { code: 'USD', symbol: '$',  label: 'US Dollar',        flag: '🇺🇸' },
  { code: 'EUR', symbol: '€',  label: 'Euro',             flag: '🇪🇺' },
]

const QUICK_TOTALS_LKR   = [25000, 50000, 100000, 150000, 200000, 300000]
const QUICK_TOTALS_USD   = [100, 250, 500, 1000, 2000, 5000]
const QUICK_TOTALS_EUR   = [100, 250, 500, 1000, 2000, 5000]

function getQuickTotals(code) {
  if (code === 'LKR') return QUICK_TOTALS_LKR
  if (code === 'USD') return QUICK_TOTALS_USD
  if (code === 'EUR') return QUICK_TOTALS_EUR
  return QUICK_TOTALS_USD
}

function formatMoney(value, symbol) {
  const num = Number(value || 0)
  const currencyCode = symbol === '$' ? 'USD' : symbol === '€' ? 'EUR' : 'LKR'
  const decimals = getCurrencyDecimals(currencyCode)
  return `${symbol}${num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

export default function TripBudget({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const layoutRef = useRef(null)
  const rightColRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [district] = useState(() => {
    try { return JSON.parse(localStorage.getItem('selectedDistrict') || 'null') }
    catch { return null }
  })
  const [prefs,       setPrefs]       = useState(null)
  const [selectedPlaces, setSelectedPlaces] = useState([])
  const [selectedHotelsList, setSelectedHotelsList] = useState([])
  const [districtHotels, setDistrictHotels] = useState([])
  const [recommendedHotels, setRecommendedHotels] = useState([])
  const [aiWeatherById, setAiWeatherById] = useState({})

  // Budget state
  const [currency,     setCurrency]     = useState('LKR')
  const [totalBudget,  setTotalBudget]  = useState('')
  const [hotelBudget,  setHotelBudget]  = useState('')
  const [totalRaw,     setTotalRaw]     = useState('')
  const [hotelRaw,     setHotelRaw]     = useState('')
  const [isTotalFocused, setIsTotalFocused] = useState(false)
  const [isHotelFocused, setIsHotelFocused] = useState(false)
  const [tripDays,     setTripDays]     = useState('')
  const [showMoreHotels, setShowMoreHotels] = useState(false)
  const [budgetAi, setBudgetAi] = useState(null)
  const [budgetAiLoading, setBudgetAiLoading] = useState(false)
  const [budgetAiError, setBudgetAiError] = useState('')
  const [budgetAiRetrySeq, setBudgetAiRetrySeq] = useState(0)
  const [dailySplit, setDailySplit] = useState(DAILY_SPLIT_DEFAULT)
  const [dailySplitTouched, setDailySplitTouched] = useState(false)
  const [splitSource, setSplitSource] = useState('default')
  const lastAvailabilityRef = useRef('unknown')
  const canonicalBudgetRef = useRef({ totalLkr: null, hotelLkr: null })

  useEffect(() => {
    localStorage.setItem('et_displayCurrency', currency)
  }, [currency])

  const setCanonicalAmount = (kind, amount, code = currency) => {
    const numeric = Number(amount)
    const key = kind === 'total' ? 'totalLkr' : 'hotelLkr'
    if (!Number.isFinite(numeric) || numeric <= 0) {
      canonicalBudgetRef.current[key] = null
      return
    }
    canonicalBudgetRef.current[key] = convertToLKR(numeric, code)
  }

  const trackBudgetMetric = (name) => {
    try {
      const current = JSON.parse(localStorage.getItem('budgetAiMetrics') || '{}')
      current[name] = (Number(current[name]) || 0) + 1
      current.updatedAt = new Date().toISOString()
      localStorage.setItem('budgetAiMetrics', JSON.stringify(current))
    } catch {
      // Ignore storage failures in telemetry tracking.
    }
  }

  const reportBudgetAiEvent = async (eventName) => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      await fetch(`${API_BASE}/budget/ai-monitor-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ event: eventName }),
      })
    } catch {
      // Keep UX unaffected when monitor reporting fails.
    }
  }

  useEffect(() => {
    const raw = localStorage.getItem('selectedDistrict')
    if (!raw) { navigate('/plan-trip'); return }
    const dist = JSON.parse(raw)

    if (dist.district_id) {
      fetch(`${API_BASE}/hotels/district/${dist.district_id}`)
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          if (json?.success && json.data?.length > 0) {
            setDistrictHotels(json.data.map(mapHotel))
          }
        })
        .catch(() => {})
    }

    const prefsRaw = localStorage.getItem('tripPreferences')
    const prefsData = prefsRaw ? (() => { try { return JSON.parse(prefsRaw) } catch { return null } })() : null
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (prefsData) setPrefs(prefsData)

    try {
      const placesRaw = localStorage.getItem('selectedPlaces')
      const placesParsed = placesRaw ? JSON.parse(placesRaw) : []
      setSelectedPlaces(Array.isArray(placesParsed) ? placesParsed : [])
    } catch {
      setSelectedPlaces([])
    }

    // Load selected hotels — prefer the multi array (only if non-empty), fall back to single
    const hotelsRaw = localStorage.getItem('selectedHotels')
    const hotelRaw  = localStorage.getItem('selectedHotel')
    const hotelList = []
    if (hotelsRaw) {
      try {
        const parsed = JSON.parse(hotelsRaw)
        if (Array.isArray(parsed) && parsed.length > 0) hotelList.push(...parsed)
      } catch {
        // Ignore malformed cached selected hotels.
      }
    }
    if (hotelList.length === 0 && hotelRaw) {
      try {
        const h = JSON.parse(hotelRaw)
        hotelList.push({ ...h, nights: h.hotelNights || h.nights || 1 })
      } catch {
        // Ignore malformed cached selected hotel.
      }
    }
    setSelectedHotelsList(hotelList)

    // Total hotel nights — hotels may not have nights set if loaded from HotelPicker
    // treat missing nights as 1 per hotel
    const totalHotelNights = hotelList.reduce((s, h) => s + (Number(h.nights) || 1), 0)

    // Minimum trip days = span from start date to last hotel checkout
    const startDate = prefsData?.startDate || ''
    const lastCO = hotelList.length > 0
      ? hotelList.reduce((max, h) => (h.checkOut && h.checkOut > max ? h.checkOut : max), '')
      : ''
    const autoSpan = (startDate && lastCO) ? diffDaysLocal(startDate, lastCO) : 0
    const minStart = Math.max(autoSpan, prefsData?.days ? Number(prefsData.days) : 1)

    // Restore saved budget
    const savedBudget = localStorage.getItem('tripBudget')
    if (savedBudget) {
      try {
        const b = JSON.parse(savedBudget)
        setCurrency(b.currency ?? 'LKR')
        setTotalBudget(b.totalBudget ?? '')
        setHotelBudget(b.hotelBudget ?? '')
        setTotalRaw(b.totalBudget !== undefined && b.totalBudget !== null ? String(b.totalBudget) : '')
        setHotelRaw(b.hotelBudget !== undefined && b.hotelBudget !== null ? String(b.hotelBudget) : '')
        if (b.totalBudget) setCanonicalAmount('total', b.totalBudget, b.currency ?? 'LKR')
        if (b.hotelBudget) setCanonicalAmount('hotel', b.hotelBudget, b.currency ?? 'LKR')
        // Always start at least at minStart
        const savedDays = b.tripDays ? Number(b.tripDays) : 0
        // Restore saved total trip days (may be more than hotel nights)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (savedDays > 0) setTripDays(String(savedDays))
        if (b.dailySplit) {
          setDailySplit(normalizeDailySplit(b.dailySplit))
          setDailySplitTouched(true)
        }
        if (b.splitSource) setSplitSource(String(b.splitSource))
      } catch {
        // Ignore malformed cached trip budget.
      }
    } else {
      // No saved budget — pick currency from profile preferences
      const profileCurr = localStorage.getItem('et_displayCurrency')
      if (profileCurr) setCurrency(profileCurr)
    }

    const handoffCheck = validateStartToBudgetHandoff({
      selectedDistrict: dist,
      tripPreferences: prefsData,
      selectedHotels: hotelList,
      selectedHotel: hotelList[0] || null,
    })
    if (!handoffCheck.ok) {
      trackBudgetMetric('handoffValidationWarnings')
      localStorage.setItem('budgetHandoffIssues', JSON.stringify(handoffCheck.issues))
    }
  }, [navigate])

  useEffect(() => {
    let active = true
    const districtId = district?.district_id
    if (!districtId) return

    const load = async () => {
      const placeIds = selectedPlaces
        .map(p => p.id || p.place_id)
        .filter(Boolean)
        .join(',')

      const params = new URLSearchParams({ district_id: String(districtId) })
      if (placeIds) params.set('selected_place_ids', placeIds)
      if (prefs?.hotelType && prefs.hotelType !== 'any') params.set('hotel_type', prefs.hotelType)
      if (prefs?.days) params.set('nights', String(prefs.days))
      if (hotelBudget) {
        params.set('hotel_budget', String(hotelBudget))
        params.set('currency', currency)
      }

      let weatherMap = {}
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const aiParams = new URLSearchParams({ district_id: String(districtId), top_n: '100' })
          if (prefs?.hotelType && prefs.hotelType !== 'any') aiParams.set('hotel_type', prefs.hotelType)
          const aiRes = await fetch(`${API_BASE}/hotels/ai-recommend?${aiParams.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          const aiJson = aiRes.ok ? await aiRes.json() : null
          const aiRows = Array.isArray(aiJson?.recommendations) ? aiJson.recommendations : []
          weatherMap = aiRows.reduce((acc, h) => {
            const key = String(h.hotel_id || h.place_id || '')
            if (key) {
              acc[key] = {
                weather_label: h.weather_label || '',
                temperature: h.temperature ?? null,
              }
            }
            return acc
          }, {})
        } catch {
          weatherMap = {}
        }
      }

      if (active) setAiWeatherById(weatherMap)

      try {
        const res = await fetch(`${API_BASE}/hotels/recommended?${params.toString()}`)
        const json = res.ok ? await res.json() : null
        if (!active) return
        if (!json?.success || !Array.isArray(json.data) || !json.data.length) {
          setRecommendedHotels([])
          return
        }

        const mapped = json.data.map(h => {
          const base = mapHotel(h)
          const weather = weatherMap[String(h.hotel_id || h.place_id || '')] || {}
          return {
            ...base,
            weather_label: weather.weather_label || base.weather_label || '',
            temperature: weather.temperature ?? base.temperature ?? null,
            recommendation_score: h.recommendation_score,
            recommendation_badges: h.recommendation_badges || [],
            within_budget: h.within_budget,
            distance_km: h.distance_km,
          }
        })

        const selectedIds = new Set(selectedHotelsList.map(sh => sh._id))
        const unselected = mapped.filter(h => !selectedIds.has(h._id))

        if (hotelBudget) {
          const withinBudget = unselected.filter(h => h.within_budget === true)
          setRecommendedHotels((withinBudget.length > 0 ? withinBudget : unselected).slice(0, 8))
        } else {
          setRecommendedHotels(unselected.slice(0, 8))
        }
      } catch {
        if (active) setRecommendedHotels([])
      }
    }

    load()

    return () => { active = false }
  }, [district, selectedPlaces, prefs, hotelBudget, currency, selectedHotelsList])

  useEffect(() => {
    let active = true
    let retryDelayId = null
    const districtId = district?.district_id
    const total = Number(totalBudget)
    const hotel = Number(hotelBudget)
    const days = Number(tripDays || prefs?.days || 1)
    const token = localStorage.getItem('token')

    if (!token || !districtId || !total || total <= 0 || !Number.isFinite(days) || days <= 0) {
      setBudgetAi(null)
      setBudgetAiError('')
      setBudgetAiLoading(false)
      localStorage.removeItem('tripBudgetAI')
      return () => { active = false }
    }

    const loadBudgetAi = async (attempt = 0) => {
      setBudgetAiLoading(true)
      setBudgetAiError('')

      const selectedHotelIds = selectedHotelsList
        .map((h) => h.hotel_id || h._id)
        .filter(Boolean)
        .join(',')

      const selectedHotelNights = selectedHotelsList.reduce(
        (sum, h) => sum + Math.max(1, Number(h?.nights) || 1),
        0
      )

      const params = new URLSearchParams({
        district_id: String(districtId),
        total_budget: String(total),
        hotel_budget: String(Number.isFinite(hotel) ? hotel : 0),
        days: String(days),
        hotel_nights: String(selectedHotelNights),
        currency,
      })

      if (selectedHotelIds) params.set('selected_hotel_ids', selectedHotelIds)

      try {
        // Budget AI can cold-start; keep first timeout longer, then retry faster.
        const timeoutMs = attempt === 0 ? 30000 : 20000
        const controller = new AbortController()
        const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

        let res = null
        try {
          params.set('_retry', String(budgetAiRetrySeq))
          params.set('_attempt', String(attempt))
          params.set('_ts', String(Date.now()))

          res = await fetch(`${API_BASE}/budget/ai-recommend?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
            cache: 'no-store',
          })
        } finally {
          window.clearTimeout(timeoutId)
        }

        const json = res.ok ? await res.json() : null

        if (!active) return

        if (!json?.success) {
          setBudgetAi(null)
          setBudgetAiError(json?.message || json?.error || 'Unable to fetch budget recommendation right now.')
          localStorage.removeItem('tripBudgetAI')
          trackBudgetMetric('aiUnavailable')
          return
        }

        setBudgetAi(json)
        localStorage.setItem('tripBudgetAI', JSON.stringify(json))
        trackBudgetMetric('aiAvailable')
      } catch (error) {
        if (!active) return

        const isTimeout = error?.name === 'AbortError'
        const canRetry = attempt < 2
        if (canRetry) {
          // Gentle backoff keeps UI responsive while giving AI time to recover.
          retryDelayId = window.setTimeout(() => {
            if (!active) return
            loadBudgetAi(attempt + 1)
          }, 1200 * (attempt + 1))
          return
        }

        setBudgetAi(null)
        setBudgetAiError(isTimeout
          ? 'Budget AI is taking too long right now. Please retry.'
          : 'Budget AI is temporarily unavailable.')
        localStorage.removeItem('tripBudgetAI')
        trackBudgetMetric('aiUnavailable')
      } finally {
        if (active) setBudgetAiLoading(false)
      }
    }

    loadBudgetAi()

    return () => {
      active = false
      if (retryDelayId) window.clearTimeout(retryDelayId)
    }
  }, [district, totalBudget, hotelBudget, tripDays, prefs, selectedHotelsList, currency, budgetAiRetrySeq])

  const retryBudgetAiPlan = () => {
    if (budgetAiLoading) return
    setBudgetAiLoading(true)
    setBudgetAiError('')
    setBudgetAiRetrySeq((value) => value + 1)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    clearUserData()
    navigate('/')
  }

  const handleTotalInput = (val) => {
    const num = val.replace(/[^0-9]/g, '')
    setTotalRaw(num)
    setTotalBudget(num)
    setCanonicalAmount('total', num)
  }

  const handleHotelInput = (val) => {
    const num = val.replace(/[^0-9]/g, '')
    setHotelRaw(num)
    setHotelBudget(num)
    setCanonicalAmount('hotel', num)
  }

  const formatWithCommas = (digits) => {
    const clean = String(digits || '').replace(/[^0-9]/g, '')
    if (!clean) return ''
    return Number(clean).toLocaleString()
  }

  const normalizeLeadingZeros = (digits) => {
    const clean = String(digits || '').replace(/[^0-9]/g, '')
    if (!clean) return ''
    const normalized = String(Number(clean))
    return normalized === '0' ? '' : normalized
  }

  const handleTotalBlur = () => {
    setIsTotalFocused(false)
    const normalized = normalizeLeadingZeros(totalRaw)
    setTotalRaw(normalized)
    setTotalBudget(normalized)
    setCanonicalAmount('total', normalized)
  }

  const handleHotelBlur = () => {
    setIsHotelFocused(false)
    const normalized = normalizeLeadingZeros(hotelRaw)
    setHotelRaw(normalized)
    setHotelBudget(normalized)
    setCanonicalAmount('hotel', normalized)
  }

  // ── Hotel grid helpers ──────────────────────────────────────────────────────
  const syncHotelsToStorage = (list) => {
    localStorage.setItem('selectedHotels', JSON.stringify(list))
    if (list.length > 0) {
      const primary = list[0]
      localStorage.setItem('selectedHotel', JSON.stringify({ ...primary, hotelNights: primary.nights }))
    } else {
      localStorage.removeItem('selectedHotel')
    }
  }

  const handlePickHotel = (h) => {
    const totalUsed = selectedHotelsList.reduce((s, sh) => s + (sh.nights || 1), 0)
    if (totalNightsCap && totalUsed >= Number(totalNightsCap)) return
    if (selectedHotelsList.some(sh => sh._id === h._id)) return
    const newList = [...selectedHotelsList, { ...h, nights: 1 }]
    setSelectedHotelsList(newList)
    syncHotelsToStorage(newList)
  }

  const handleRemoveHotel = (id) => {
    const newList = selectedHotelsList.filter(sh => sh._id !== id)
    setSelectedHotelsList(newList)
    syncHotelsToStorage(newList)
  }

  // Nights cap = hotel nights from prefs (prefs.days = total hotel nights to book)
  const totalNightsCap = (prefs?.days && Number(prefs.days) > 0)
    ? Math.max(1, Number(prefs.days))
    : null

  // Total nights already assigned across all selected hotels
  const totalNightsUsed = selectedHotelsList.reduce((s, sh) => s + (sh.nights || 1), 0)

  // Hotel nights from prefs (used for nights cap display)
  const prefsDays = prefs?.days ? Number(prefs.days) : 1

  // Auto-derive total trip days: span from trip start to the LAST hotel checkout date
  const lastCheckOut = selectedHotelsList.length > 0
    ? selectedHotelsList.reduce((max, h) => (h.checkOut && h.checkOut > max ? h.checkOut : max), '')
    : ''
  const autoTripDays = (prefs?.startDate && lastCheckOut)
    ? Math.max(1, diffDaysLocal(prefs.startDate, lastCheckOut))
    : prefsDays

  // Minimum trip days = auto span from hotel dates (or prefs nights if no hotels yet)
  const minDays = autoTripDays

  // Auto-set tripDays to minDays whenever prefs load and tripDays is too low
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTripDays(prev => {
      const cur = Number(prev) || 0
      return cur < minDays ? String(minDays) : prev
    })
  }, [minDays])

  // Nights already assigned to hotels OTHER than `id`
  const nightsUsedByOthers = (id) =>
    selectedHotelsList.filter(sh => sh._id !== id).reduce((s, sh) => s + (sh.nights || 1), 0)

  // Maximum nights for a specific hotel
  const maxNightsFor = (id) =>
    totalNightsCap ? Math.max(1, totalNightsCap - nightsUsedByOthers(id)) : 30

  const handleChangeNights = (id, delta) => {
    const max = maxNightsFor(id)
    const newList = selectedHotelsList.map(sh => {
      if (sh._id !== id) return sh
      return { ...sh, nights: Math.min(max, Math.max(1, (sh.nights || 1) + delta)) }
    })
    setSelectedHotelsList(newList)
    syncHotelsToStorage(newList)
  }
  // ───────────────────────────────────────────────────────────────────────────

  const handleContinue = () => {
    if (!totalBudget || !hotelBudget || !tripDays || Number(tripDays) < minDays) return

    const budget = {
      currency,
      totalBudget: totalBudget ? Number(totalBudget) : null,
      hotelBudget: hotelBudget ? Number(hotelBudget) : null,
      tripDays:    Number(tripDays),
      dailySplit: normalizeDailySplit(dailySplit),
      splitSource,
      aiMode: budgetAi?.ai_daily_plan?.percentages ? 'server' : 'fallback',
    }
    localStorage.setItem('tripBudget', JSON.stringify(budget))
    if (budgetAi) {
      localStorage.setItem('tripBudgetAI', JSON.stringify(budgetAi))
    }
    navigate('/trip-details')
  }

  if (!district) return null

  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || ''
  const quickTotals = getQuickTotals(currency)

  const setTotalBudgetAmount = (amount) => {
    const normalized = Math.max(0, Math.round(Number(amount) || 0))
    setTotalBudget(normalized)
    setTotalRaw(String(normalized))
    setCanonicalAmount('total', normalized)
  }

  const setHotelBudgetAmount = (amount) => {
    const normalized = Math.max(0, Math.round(Number(amount) || 0))
    setHotelBudget(normalized)
    setHotelRaw(String(normalized))
    setCanonicalAmount('hotel', normalized)
  }

  const hotelQuickPicks = (() => {
    const totalNum = Number(totalBudget) || 0
    if (totalNum > 0) {
      return [30, 40, 50, 60, 70].map(pct => ({
        key: `pct-${pct}`,
        amount: Math.round((totalNum * pct) / 100),
        label: `${pct}%`,
      }))
    }
    return quickTotals.map(n => ({ key: `amt-${n}`, amount: n, label: 'Quick' }))
  })()

  const hotelPercent =
    totalBudget && hotelBudget && Number(totalBudget) > 0
      ? Math.min(100, Math.round((Number(hotelBudget) / Number(totalBudget)) * 100))
      : null

  const selectedHotelsMinTotalLKR = selectedHotelsList.reduce((sum, h) => {
    const nightly = getHotelNightlyRange(h)
    return sum + (nightly.min * (h?.nights || 1))
  }, 0)
  const selectedHotelsMaxTotalLKR = selectedHotelsList.reduce((sum, h) => {
    const nightly = getHotelNightlyRange(h)
    return sum + (nightly.max * (h?.nights || 1))
  }, 0)
  const selectedHotelsMinTotal = convertFromLKR(selectedHotelsMinTotalLKR, currency)
  const selectedHotelsMaxTotal = convertFromLKR(selectedHotelsMaxTotalLKR, currency)
  const selectedHotelsAvgTotal = Math.round((selectedHotelsMinTotal + selectedHotelsMaxTotal) / 2)
  const selectedVsHotelBudgetDiff = hotelBudget ? (Number(hotelBudget) - selectedHotelsAvgTotal) : null

  const remainingBudget =
    totalBudget && hotelBudget
      ? Number(totalBudget) - Number(hotelBudget)
      : null

  const isBudgetIncomplete = !totalBudget || !hotelBudget
  const totalBudgetMissing = !totalBudget
  const hotelBudgetMissing = !hotelBudget
  const isTripDaysInvalid = !tripDays || Number(tripDays) < minDays
  const isHotelOverTotal = !!hotelBudget && !!totalBudget && Number(hotelBudget) > Number(totalBudget)
  const canContinue = !isBudgetIncomplete && !isTripDaysInvalid && !isHotelOverTotal
  const ruleDays = Math.max(Number(tripDays || prefsDays || 1), 1)
  const aiDailyPlan = budgetAi?.ai_daily_plan || null
  const totalHotelNightsForAi = selectedHotelsList.reduce((sum, h) => sum + Math.max(1, Number(h?.nights) || 1), 0)
  const hotelNightsForAi = Math.max(totalHotelNightsForAi, 1)
  const normalizedSplit = normalizeDailySplit(dailySplit)
  const plannedTotal = Number(totalBudget || 0)
  const plannedHotel = Number(hotelBudget || 0)
  const plannedRemaining = Math.max(plannedTotal - plannedHotel, 0)
  const localAiSuggestedSplit = deriveAiFallbackSplit({
    ruleDays,
    hotelNights: hotelNightsForAi,
    selectedHotelsCount: selectedHotelsList.length,
    plannedRemaining,
  })
  const aiSuggestedSplit = normalizeDailySplit(aiDailyPlan?.percentages || localAiSuggestedSplit)
  const isServerAiSplit = !!aiDailyPlan?.percentages
  const splitAmounts = {
    food: (plannedRemaining * normalizedSplit.food) / 100,
    transport: (plannedRemaining * normalizedSplit.transport) / 100,
    activities_misc: (plannedRemaining * normalizedSplit.activities_misc) / 100,
  }
  const splitPerDay = {
    food: splitAmounts.food / ruleDays,
    transport: splitAmounts.transport / ruleDays,
    activities_misc: splitAmounts.activities_misc / ruleDays,
  }
  const splitTotalPercent = normalizedSplit.food + normalizedSplit.transport + normalizedSplit.activities_misc
  const perDayNonHotelBudget = ruleDays > 0 ? (plannedRemaining / ruleDays) : 0
  const applyAiSplit = () => {
    // Applying AI split resets manual mode and marks whether data came from
    // server AI percentages or deterministic local fallback percentages.
    setDailySplit(aiSuggestedSplit)
    setDailySplitTouched(false)
    const source = isServerAiSplit ? 'ai-server' : 'ai-fallback'
    setSplitSource(source)
    if (source === 'ai-server') {
      trackBudgetMetric('applyServerAiSplit')
      reportBudgetAiEvent('apply_server_ai_split')
    } else {
      trackBudgetMetric('applyFallbackAiSplit')
      reportBudgetAiEvent('apply_fallback_ai_split')
    }
  }

  const resetRuleSplit = () => {
    setDailySplit({ ...DAILY_SPLIT_DEFAULT })
    setDailySplitTouched(true)
    setSplitSource('rule-default')
    trackBudgetMetric('applyRuleDefaultSplit')
    reportBudgetAiEvent('apply_rule_default_split')
  }

  const updateSplitValue = (key, value) => {
    const keys = ['food', 'transport', 'activities_misc']
    const safeValue = Math.max(0, Math.min(100, Math.round(Number(value) || 0)))
    const others = keys.filter((k) => k !== key)
    const current = normalizeDailySplit(dailySplit)
    const currentOtherTotal = others.reduce((sum, k) => sum + current[k], 0)
    const remaining = Math.max(0, 100 - safeValue)

    const candidate = { ...current, [key]: safeValue }
    if (currentOtherTotal <= 0) {
      candidate[others[0]] = Math.floor(remaining / 2)
      candidate[others[1]] = remaining - candidate[others[0]]
    } else {
      candidate[others[0]] = (current[others[0]] / currentOtherTotal) * remaining
      candidate[others[1]] = (current[others[1]] / currentOtherTotal) * remaining
    }

    setDailySplit(normalizeDailySplit(candidate))
    setDailySplitTouched(true)
    if (splitSource !== 'custom') {
      trackBudgetMetric('customSplitAdjustments')
      reportBudgetAiEvent('apply_custom_split')
    }
    setSplitSource('custom')
  }

  useEffect(() => {
    if (dailySplitTouched) return
    if (!isSameDailySplit(dailySplit, aiSuggestedSplit)) {
      setDailySplit(aiSuggestedSplit)
    }
    const nextSource = isServerAiSplit ? 'ai-server' : 'ai-fallback'
    if (splitSource !== nextSource) {
      setSplitSource(nextSource)
    }
  }, [aiDailyPlan, dailySplitTouched, isServerAiSplit, aiSuggestedSplit, dailySplit, splitSource])

  useEffect(() => {
    if (plannedTotal <= 0) return

    const mode = isServerAiSplit ? 'server' : 'fallback'
    if (lastAvailabilityRef.current === mode) return

    lastAvailabilityRef.current = mode
    if (mode === 'server') {
      trackBudgetMetric('serverSuggestionCycles')
    } else {
      trackBudgetMetric('fallbackSuggestionCycles')
      reportBudgetAiEvent('fallback_cycle')
    }
  }, [isServerAiSplit, plannedTotal])

  useEffect(() => {
    let rafId = null

    const syncRightPanelScroll = () => {
      const layoutEl = layoutRef.current
      const rightEl = rightColRef.current
      if (!layoutEl || !rightEl) return

      const rightMax = rightEl.scrollHeight - rightEl.clientHeight
      if (rightMax <= 0) return

      const rect = layoutEl.getBoundingClientRect()
      const viewportH = window.innerHeight || document.documentElement.clientHeight || 1
      const travel = Math.max(layoutEl.offsetHeight - viewportH, 1)

      // 0 when layout enters viewport top, 1 when layout bottom approaches viewport bottom.
      const progress = Math.min(1, Math.max(0, (-rect.top) / travel))
      rightEl.scrollTop = rightMax * progress
    }

    const onScrollOrResize = () => {
      if (rafId) return
      rafId = window.requestAnimationFrame(() => {
        syncRightPanelScroll()
        rafId = null
      })
    }

    syncRightPanelScroll()
    window.addEventListener('scroll', onScrollOrResize, { passive: true })
    window.addEventListener('resize', onScrollOrResize)

    return () => {
      window.removeEventListener('scroll', onScrollOrResize)
      window.removeEventListener('resize', onScrollOrResize)
      if (rafId) window.cancelAnimationFrame(rafId)
    }
  }, [districtHotels.length, recommendedHotels.length, selectedHotelsList.length, budgetAiLoading, plannedRemaining, ruleDays])

  return (
    <div className="tb-page">

      {/* ── Nav ── */}
      <nav className="dashboard-nav glass-nav">
        <div className="nav-container">
          <button className="logo" onClick={() => navigate('/dashboard')} style={{background:'none',border:'none',cursor:'pointer',padding:0}}>Travel<span>Genie</span></button>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <span className={`hamburger ${menuOpen ? 'open' : ''}`} />
          </button>
          <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li><Link to="/plan-trip">Plan a Trip</Link></li>
            <li><Link to="/profile">Profile</Link></li>
          </ul>
          <div className="nav-actions">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'light' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              )}
            </button>
            <button className="btn-logout" onClick={handleLogout}>Log Out</button>
          </div>
        </div>
      </nav>

      {/* ── Hero / Step indicator ── */}
      <section className="tb-hero">
        <div className="tb-hero-inner">
          <div className="tb-steps">
            <div className="tb-step done" onClick={() => navigate('/plan-trip')} title="Choose District">
              <span className="tb-step-num">1</span>
              <span className="tb-step-label">District</span>
            </div>
            <div className="tb-step-line done" />
            <div className="tb-step done" onClick={() => navigate('/district-explore')} title="Pick Places">
              <span className="tb-step-num">2</span>
              <span className="tb-step-label">Places</span>
            </div>
            <div className="tb-step-line done" />
            <div className="tb-step done" onClick={() => navigate('/trip-preferences')} title="Set Preferences">
              <span className="tb-step-num">3</span>
              <span className="tb-step-label">Preferences</span>
            </div>
            <div className="tb-step-line done" />
            <div className="tb-step done" onClick={() => navigate('/hotel-picker')} title="Choose Hotel">
              <span className="tb-step-num">4</span>
              <span className="tb-step-label">Hotel</span>
            </div>
            <div className="tb-step-line done" />
            <div className="tb-step active">
              <span className="tb-step-num">5</span>
              <span className="tb-step-label">Budget</span>
            </div>
            <div className="tb-step-line" />
            <div className="tb-step">
              <span className="tb-step-num">6</span>
              <span className="tb-step-label">Details</span>
            </div>
          </div>

          <p className="tb-eyebrow">💰 {district.province} Province · {district.name}</p>
          <h1>Set your <em>budget</em></h1>
          <p className="tb-hero-sub">Tell us how much you'd like to spend — we'll help you plan accordingly.</p>
        </div>
      </section>

      {/* ── Body ── */}
      <div className="tb-body">
        <div className="tb-layout" ref={layoutRef}>

          {/* ══ LEFT COLUMN — Trip Budget + Hotel Budget ══ */}
          <div className="tb-col-left">

            {/* ── Section 2: Total Trip Budget ── */}
            <section className="tb-section">
              <div className="tb-section-header">
                <span className="tb-section-icon">🗺️</span>
                <div>
                  <h2>Total trip budget</h2>
                  <p>Your overall spend limit for the entire trip including food, transport, activities &amp; accommodation</p>
                </div>
              </div>

              <div className={`tb-input-wrap${totalBudgetMissing ? ' invalid' : ''}`}>
                <span className="tb-input-prefix">{sym}</span>
                <input
                  className="tb-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 150,000"
                  value={isTotalFocused ? totalRaw : formatWithCommas(totalRaw)}
                  onChange={e => handleTotalInput(e.target.value)}
                  onFocus={() => setIsTotalFocused(true)}
                  onBlur={handleTotalBlur}
                  aria-invalid={totalBudgetMissing}
                />
                <span className="tb-input-suffix">{currency}</span>
              </div>
              {totalBudgetMissing && (
                <p className="tb-field-error">Enter your total trip budget to continue.</p>
              )}

              <div className="tb-quick-chips">
                <span className="tb-chips-label">Quick pick:</span>
                {quickTotals.map(n => (
                  <button
                    key={n}
                    className={`tb-quick-chip ${String(totalBudget) === String(n) ? 'active' : ''}`}
                    onClick={() => setTotalBudgetAmount(n)}
                  >
                    {formatMoney(n, sym)}
                  </button>
                ))}
              </div>
            </section>

            {/* ── Section 3: Hotel Budget ── */}
            <section className="tb-section tb-hotel-budget-section">
              <div className="tb-section-header">
                <span className="tb-section-icon">🏨</span>
                <div>
                  <h2>Hotel budget</h2>
                  <p>
                    {selectedHotelsList.length > 0
                      ? `Set your accommodation budget based on your ${selectedHotelsList.length > 1 ? `${selectedHotelsList.length} selected hotels` : 'selected hotel'}`
                      : 'How much you plan to spend on accommodation for the stay'}
                  </p>
                </div>
              </div>

              <div className={`tb-input-wrap${hotelBudgetMissing ? ' invalid' : ''}`}>
                <span className="tb-input-prefix">{sym}</span>
                <input
                  className="tb-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 50,000"
                  value={isHotelFocused ? hotelRaw : formatWithCommas(hotelRaw)}
                  onChange={e => handleHotelInput(e.target.value)}
                  onFocus={() => setIsHotelFocused(true)}
                  onBlur={handleHotelBlur}
                  aria-invalid={hotelBudgetMissing}
                />
                <span className="tb-input-suffix">{currency}</span>
              </div>
              {hotelBudgetMissing && (
                <p className="tb-field-error">Enter your hotel budget to continue.</p>
              )}

              <div className="tb-quick-chips">
                <span className="tb-chips-label">Quick hotel:</span>
                {hotelQuickPicks.map(pick => (
                  <button
                    key={pick.key}
                    className={`tb-quick-chip ${String(hotelBudget) === String(pick.amount) ? 'active' : ''}`}
                    onClick={() => setHotelBudgetAmount(pick.amount)}
                    title={pick.label !== 'Quick' ? `${pick.label} of total budget` : undefined}
                  >
                    {formatMoney(Number(pick.amount), sym)}
                  </button>
                ))}
              </div>

              {/* Breakdown bar */}
              {hotelPercent !== null && (
                <div className="tb-breakdown">
                  <div className="tb-breakdown-bar">
                    <div className="tb-breakdown-fill hotel" style={{ width: `${hotelPercent}%` }} />
                    <div className="tb-breakdown-fill other" style={{ width: `${Math.max(0, 100 - hotelPercent)}%` }} />
                  </div>
                  <div className="tb-breakdown-legend">
                    <span className="tb-legend-dot hotel" /> Hotel: {hotelPercent}%
                    <span className="tb-legend-dot other" /> Other: {Math.max(0, 100 - hotelPercent)}%
                    {remainingBudget !== null && (
                      <span className="tb-remaining">
                        {remainingBudget >= 0
                          ? `· ${formatMoney(remainingBudget, sym)} remaining for activities & food`
                          : `· ⚠️ Hotel exceeds total budget by ${formatMoney(Math.abs(remainingBudget), sym)}`}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {hotelBudget && totalBudget && Number(hotelBudget) > Number(totalBudget) && (
                <p className="tb-warning">⚠️ Hotel budget exceeds your total trip budget. Please adjust.</p>
              )}

              {selectedHotelsList.length > 0 && (
                <div className="tb-selected-total-box">
                  <div className="tb-selected-total-title">Selected Hotels Full Total</div>
                  <div className="tb-selected-total-value">
                    {formatMoney(selectedHotelsMinTotal, sym)} - {formatMoney(selectedHotelsMaxTotal, sym)}
                    <span className="tb-selected-total-cur"> {currency}</span>
                  </div>
                  <div className="tb-selected-total-meta">
                    {totalNightsUsed} night{totalNightsUsed !== 1 ? 's' : ''} across {selectedHotelsList.length} hotel{selectedHotelsList.length !== 1 ? 's' : ''}
                    {selectedVsHotelBudgetDiff !== null && (
                      <span className={selectedVsHotelBudgetDiff >= 0 ? 'tb-selected-total-ok' : 'tb-selected-total-over'}>
                        {selectedVsHotelBudgetDiff >= 0
                          ? ` · within hotel budget by ${formatMoney(selectedVsHotelBudgetDiff, sym)}`
                          : ` · over hotel budget by ${formatMoney(Math.abs(selectedVsHotelBudgetDiff), sym)}`}
                      </span>
                    )}
                  </div>
                  <div className="tb-selected-total-actions">
                    <button
                      type="button"
                      className="tb-selected-total-btn tb-selected-total-btn-primary"
                      onClick={() => setHotelBudgetAmount(selectedHotelsMaxTotal)}
                    >
                      Quick select full total
                    </button>
                  </div>
                </div>
              )}

              {/* ── Hotels in this district ── */}
              {(() => {
                if (!districtHotels.length) return null
                const budgetLKR = hotelBudget ? Number(hotelBudget) / (LKR_RATES[currency] || 1) : null
                const selectedIds = new Set(selectedHotelsList.map(sh => sh._id))
                const baseAvailableHotels = districtHotels.filter(h => !selectedIds.has(h._id))
                const sortedByPrice = [...baseAvailableHotels].sort((a, b) => (a.priceRange?.min || 0) - (b.priceRange?.min || 0))
                const affordableHotels = budgetLKR
                  ? sortedByPrice.filter(h => (h.priceRange?.min || 0) <= budgetLKR)
                  : sortedByPrice
                const usingAffordableSet = budgetLKR && affordableHotels.length > 0
                const visiblePool = usingAffordableSet ? affordableHotels : sortedByPrice
                const maxVisibleHotels = showMoreHotels ? 24 : 12
                const availableHotels = visiblePool.slice(0, maxVisibleHotels)
                return (
                  <>
                    {/* ── Recommended Hotels Block ── */}
                    {selectedHotelsList.length > 0 && (
                      <div className="tb-hotel-grid-section">
                        <div className="tb-hotel-grid-header">
                          <span className="tb-hotel-grid-title">✅ Currently Selected Hotels</span>
                          <span className="tb-hotel-grid-hint">
                            {selectedHotelsList.length} selected · adjust nights or remove below
                          </span>
                        </div>
                        <div className="tb-hotel-grid">
                          {selectedHotelsList.map(h => {
                            const selectedEntry = selectedHotelsList.find(sh => sh._id === h._id)
                            const nightly = getHotelNightlyRange(h)
                            return (
                              <div key={`selected_${h._id}`} className="tb-hg-card selected" style={{ cursor: 'default' }}>
                                <div className="tb-hg-img-wrap">
                                  <img src={h.images?.[0]?.url} alt={h.name} className="tb-hg-img" />
                                  <span className="tb-hg-selected-badge">
                                    ✓ {selectedEntry?.nights ? `${selectedEntry.nights} night${selectedEntry.nights !== 1 ? 's' : ''}` : 'Selected'}
                                  </span>
                                </div>
                                <div className="tb-hg-info">
                                  <span className="tb-hg-name">{h.name}</span>
                                  <span className="tb-hg-stars">{'★'.repeat(h.starRating)}{'☆'.repeat(Math.max(0, 5 - h.starRating))}</span>
                                  <span className="tb-hg-price">
                                    {formatMoney(convertFromLKR(nightly.min, currency), sym)}
                                    -{formatMoney(convertFromLKR(nightly.max, currency), sym)}
                                    <span className="tb-hg-price-cur">&nbsp;{currency}/night</span>
                                  </span>
                                  {!!h.weather_label && (
                                    <span className="tb-hg-weather">
                                      {weatherPresentation(h.weather_label).emoji} {weatherPresentation(h.weather_label).label}
                                      {h.temperature != null ? ` · ${Math.round(Number(h.temperature))}°C` : ''}
                                    </span>
                                  )}
                                  <div className="tb-hg-actions">
                                    <div className="tb-hg-nights-row">
                                      <span className="tb-hg-nights-label">🌙 Nights:</span>
                                      <div className="tb-hg-stepper">
                                        <button type="button" className="tb-hg-step-btn"
                                          onClick={e => { e.stopPropagation(); handleChangeNights(h._id, -1) }}
                                          disabled={(selectedEntry?.nights || 1) <= 1}
                                        >−</button>
                                        <span className="tb-hg-step-val">{selectedEntry?.nights || 1}</span>
                                        <button type="button" className="tb-hg-step-btn"
                                          onClick={e => { e.stopPropagation(); handleChangeNights(h._id, +1) }}
                                          disabled={(selectedEntry?.nights || 1) >= maxNightsFor(h._id)}
                                        >+</button>
                                      </div>
                                      {totalNightsCap && <span className="tb-hg-nights-cap">/ {maxNightsFor(h._id)} max</span>}
                                    </div>
                                    <span className="tb-hg-nights-total">
                                      {formatMoney(convertFromLKR(nightly.min * (selectedEntry?.nights || 1), currency), sym)}
                                      -{formatMoney(convertFromLKR(nightly.max * (selectedEntry?.nights || 1), currency), sym)} total
                                    </span>
                                    <button type="button" className="tb-hg-remove-btn"
                                      onClick={e => { e.stopPropagation(); handleRemoveHotel(h._id) }}
                                    >✕ Remove</button>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* ── Recommended Hotels Block ── */}
                    {recommendedHotels.length > 0 && (() => {
                      const selectedIds = new Set(selectedHotelsList.map(sh => sh._id))
                      const recoVisible = recommendedHotels.filter(h => !selectedIds.has(h._id))
                      if (!recoVisible.length) return null
                      const totalNightsUsed = selectedHotelsList.reduce((s, sh) => s + (sh.nights || 1), 0)
                      const nightsFull = totalNightsCap != null && totalNightsUsed >= Number(totalNightsCap)
                      return (
                        <div className="tb-hotel-grid-section tb-hotel-reco-section">
                          <div className="tb-hotel-grid-header">
                            <span className="tb-hotel-grid-title">✨ Recommended for your trip</span>
                            <span className="tb-hotel-grid-hint">Matched to your selected places, nights and budget</span>
                          </div>
                          <p className="tb-hotel-reco-sub">Scored by proximity, budget, type and rating from your step 1-5 plan.</p>
                          <div className="tb-hotel-grid tb-hotel-grid--twelve">
                            {recoVisible.map(h => {
                              const affordable = budgetLKR ? h.priceRange.min <= budgetLKR : null
                              const score = Number(h.recommendation_score || 0)
                              const w = weatherPresentation(h.weather_label)
                              return (
                                <div
                                  key={`reco_${h._id}`}
                                  className={`tb-hg-card tb-hg-card--reco${budgetLKR && !affordable ? ' unaffordable' : ''}`}
                                  onClick={() => !nightsFull && affordable !== false && handlePickHotel(h)}
                                  style={{ cursor: affordable === false || nightsFull ? 'default' : 'pointer' }}
                                >
                                  <div className="tb-hg-img-wrap">
                                    <img src={h.images?.[0]?.url} alt={h.name} className="tb-hg-img" />
                                    <span className="tb-hg-reco-badge">✨ Recommended · {Math.round(score * 100)}% match</span>
                                    {budgetLKR && (
                                      <span className={`tb-hg-afford-badge ${affordable ? 'yes' : 'no'}`}>
                                        {affordable ? 'Within budget' : 'Over budget'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="tb-hg-info">
                                    <span className="tb-hg-name">{h.name}</span>
                                    <span className="tb-hg-stars">{'★'.repeat(h.starRating)}{'☆'.repeat(Math.max(0, 5 - h.starRating))}</span>
                                    {h.recommendation_badges?.length > 0 && (
                                      <div className="tb-hg-reco-tags">
                                        {h.recommendation_badges.slice(0, 3).map(b => (
                                          <span key={b} className="tb-hg-reco-tag">{b}</span>
                                        ))}
                                      </div>
                                    )}
                                    <span className="tb-hg-price">
                                      {formatMoney(convertFromLKR(h.priceRange.min, currency), sym)}
                                      -{formatMoney(convertFromLKR(h.priceRange.max || h.priceRange.min, currency), sym)}
                                      <span className="tb-hg-price-cur">&nbsp;{currency}/night</span>
                                    </span>
                                    {!!h.weather_label && (
                                      <span className="tb-hg-weather">{w.emoji} {w.label}{h.temperature != null ? ` · ${Math.round(Number(h.temperature))}°C` : ''}</span>
                                    )}
                                    {nightsFull ? (
                                      <button type="button" className="tb-hg-pick-btn full" disabled>🌙 Nights full</button>
                                    ) : affordable !== false ? (
                                      <button
                                        type="button"
                                        className="tb-hg-pick-btn"
                                        onClick={e => { e.stopPropagation(); handlePickHotel(h) }}
                                      >Pick &amp; set nights →</button>
                                    ) : (
                                      <span className="tb-hg-over-label">Over budget</span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()}

                    <div className="tb-hotel-grid-section">
                      <div className="tb-hotel-grid-header">
                        <span className="tb-hotel-grid-title">
                          🏨 More Hotels in {district?.name} ({availableHotels.length}/{visiblePool.length})
                        </span>
                        {hotelBudget && (
                          <span className="tb-hotel-grid-hint">
                            {usingAffordableSet
                              ? <>Matching your budget: <strong>{formatMoney(Number(hotelBudget), sym)}</strong>/night</>
                              : <>No exact matches, showing nearest options for <strong>{formatMoney(Number(hotelBudget), sym)}</strong>/night</>}
                          </span>
                        )}
                      </div>
                      <div className="tb-hotel-grid tb-hotel-grid--twelve">
                        {(() => {
                          const totalNightsUsed = selectedHotelsList.reduce((s, sh) => s + (sh.nights || 1), 0)
                          const nightsFull = totalNightsCap != null && totalNightsUsed >= Number(totalNightsCap)
                          return availableHotels.map(h => {
                            const affordable = budgetLKR ? h.priceRange.min <= budgetLKR : null
                            const isNightsFull = nightsFull
                            return (
                              <div
                                key={h._id}
                                className={`tb-hg-card${budgetLKR && !affordable ? ' unaffordable' : ''}`}
                                onClick={() => !isNightsFull && affordable !== false && handlePickHotel(h)}
                                style={{ cursor: affordable === false || isNightsFull ? 'default' : 'pointer' }}
                              >
                                <div className="tb-hg-img-wrap">
                                  <img src={h.images?.[0]?.url} alt={h.name} className="tb-hg-img" />
                                  {budgetLKR && (
                                    <span className={`tb-hg-afford-badge ${affordable ? 'yes' : 'no'}`}>
                                      {affordable ? 'Within budget' : 'Over budget'}
                                    </span>
                                  )}
                                </div>
                                <div className="tb-hg-info">
                                  <span className="tb-hg-name">{h.name}</span>
                                  <span className="tb-hg-stars">{'★'.repeat(h.starRating)}{'☆'.repeat(Math.max(0, 5 - h.starRating))}</span>
                                  <span className="tb-hg-price">
                                    {formatMoney(convertFromLKR(h.priceRange.min, currency), sym)}
                                    -{formatMoney(convertFromLKR(h.priceRange.max, currency), sym)}
                                    <span className="tb-hg-price-cur">&nbsp;{currency}/night</span>
                                  </span>
                                  {!!h.weather_label && (
                                    <span className="tb-hg-weather">
                                      {weatherPresentation(h.weather_label).emoji} {weatherPresentation(h.weather_label).label}
                                      {h.temperature != null ? ` · ${Math.round(Number(h.temperature))}°C` : ''}
                                    </span>
                                  )}
                                  {isNightsFull ? (
                                    <button type="button" className="tb-hg-pick-btn full" disabled>
                                      🌙 Nights full
                                    </button>
                                  ) : affordable !== false ? (
                                    <button
                                      type="button"
                                      className="tb-hg-pick-btn"
                                      onClick={e => { e.stopPropagation(); handlePickHotel(h) }}
                                    >Pick &amp; set nights →</button>
                                  ) : (
                                    <span className="tb-hg-over-label">Over budget</span>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        })()}
                      </div>
                      {visiblePool.length > 12 && (
                        <div className="tb-hotel-grid-actions">
                          <button
                            type="button"
                            className="tb-hotel-grid-more-btn"
                            onClick={() => setShowMoreHotels(v => !v)}
                          >
                            {showMoreHotels ? 'Show less' : 'Show more'}
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
            </section>

          </div>{/* end tb-col-left */}

          {/* ══ RIGHT COLUMN — Currency + Days ══ */}
          <div className="tb-col-right" ref={rightColRef}>

            {/* ── Section 1: Total Trip Duration ── */}
            <section className="tb-section tb-days-section">
              <div className="tb-section-header">
                <span className="tb-section-icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </span>
                <div>
                  <h2>Total trip days</h2>
                  <p>Full duration including non-hotel days{district?.name ? ` in ${district.name}` : ''}</p>
                </div>
              </div>

              <div className="tb-days-wrap">
                <div className="tb-days-stepper">
                  <button
                    className="tb-days-btn"
                    onClick={() => setTripDays(d => String(Math.max(minDays, (Number(d) || minDays) - 1)))}
                    disabled={(Number(tripDays) || 0) <= minDays}
                    aria-label="Decrease days"
                  >−</button>
                  <div className="tb-days-display">
                    <span className="tb-days-number">{tripDays || minDays}</span>
                    <span className="tb-days-unit">{Number(tripDays || minDays) === 1 ? 'day' : 'days'}</span>
                  </div>
                  <button
                    className="tb-days-btn"
                    onClick={() => setTripDays(d => String(Math.min(365, Math.max(minDays, (Number(d) || 0) + 1))))}
                    aria-label="Increase days"
                  >+</button>
                </div>

                <div className="tb-quick-chips tb-days-chips">
                  {[1, 2, 3, 5, 7, 10, 14].map(d => (
                    <button
                      key={d}
                      className={`tb-quick-chip ${String(tripDays) === String(d) ? 'active' : ''}`}
                      onClick={() => setTripDays(String(d))}
                      disabled={d < minDays}
                      title={d < minDays ? `Min ${minDays} days (hotel dates span)` : ''}
                    >{d}d</button>
                  ))}
                </div>

                {/* Hotel nights info line */}
                <p className="tb-days-min-note">
                  🏨 Hotel stay: <strong>{totalNightsUsed} night{totalNightsUsed !== 1 ? 's' : ''}</strong> across {selectedHotelsList.length > 0 ? selectedHotelsList.length : 0} hotel{selectedHotelsList.length !== 1 ? 's' : ''}
                  {autoTripDays > 0 && (
                    <> · trip span <strong>{autoTripDays} day{autoTripDays !== 1 ? 's' : ''}</strong>{Number(tripDays) > autoTripDays ? ` (+${Number(tripDays) - autoTripDays} extended)` : ''}</>
                  )}
                </p>

                {tripDays && totalBudget && Number(tripDays) > 0 && (
                  <p className="tb-days-hint">
                    ≈ <strong>{formatMoney((Number(totalBudget) - Number(hotelBudget || 0)) / Number(tripDays), sym)}</strong> per day based on your remaining budget (total - hotel)
                  </p>
                )}
              </div>
            </section>

            {/* ── Section 2: Currency ── */}
            <section className="tb-section tb-currency-section">
              <div className="tb-currency-header">
                <div className="tb-currency-title-row">
                  <span className="tb-currency-globe">💱</span>
                  <div>
                    <h2>Budget Currency</h2>
                    <p>All amounts will be shown in your chosen currency</p>
                  </div>
                </div>
                <div className="tb-currency-active-badge">
                  {CURRENCIES.find(c => c.code === currency)?.flag}
                  <span className="tb-cab-sym">{CURRENCIES.find(c => c.code === currency)?.symbol}</span>
                  <span className="tb-cab-code">{currency}</span>
                </div>
              </div>
              <div className="tb-currency-strip">
                {CURRENCIES.map(c => (
                  <button
                    key={c.code}
                    className={`tb-cs-btn${currency === c.code ? ' active' : ''}`}
                    onClick={() => {
                      if (c.code === currency) return
                      const totalLkr = canonicalBudgetRef.current.totalLkr ?? (totalBudget ? convertToLKR(totalBudget, currency) : 0)
                      const hotelLkr = canonicalBudgetRef.current.hotelLkr ?? (hotelBudget ? convertToLKR(hotelBudget, currency) : 0)
                      const nextTotal = totalLkr > 0 ? convertFromLKR(totalLkr, c.code) : 0
                      const nextHotel = hotelLkr > 0 ? convertFromLKR(hotelLkr, c.code) : 0
                      setCurrency(c.code)
                      setTotalBudget(nextTotal > 0 ? nextTotal : '')
                      setHotelBudget(nextHotel > 0 ? nextHotel : '')
                      setTotalRaw(nextTotal > 0 ? String(nextTotal) : '')
                      setHotelRaw(nextHotel > 0 ? String(nextHotel) : '')
                    }}
                  >
                    <span className="tb-cs-flag">{c.flag}</span>
                    <span className="tb-cs-sym">{c.symbol}</span>
                    <span className="tb-cs-code">{c.code}</span>
                    <span className="tb-cs-name">{c.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* ── Section 3: AI daily budget plan (adjustable) ── */}
            <section className="tb-section tb-ai-section">
              <div className="tb-section-header">
                <span className="tb-section-icon">🎯</span>
                <div>
                  <h2>AI Daily Budget Plan</h2>
                  <p>Get a recommended daily split, adjust it, and continue with confidence.</p>
                </div>
              </div>

              {budgetAiLoading && <p className="tb-ai-loading">Generating AI daily plan...</p>}
              {!budgetAiLoading && budgetAiError && <p className="tb-ai-error">{budgetAiError}</p>}
              {!budgetAiLoading && !plannedTotal && (
                <p className="tb-ai-muted">Enter total budget and hotel budget to generate your daily plan.</p>
              )}

              {!budgetAiLoading && plannedTotal > 0 && (
                <>
                  <div className="tb-ai-guide-grid">
                    <article className="tb-ai-guide-item">
                      <span className="tb-ai-guide-step">Step 1</span>
                      <strong>Apply AI split</strong>
                      <p>Use the AI suggestion as your starting point.</p>
                    </article>
                    <article className="tb-ai-guide-item">
                      <span className="tb-ai-guide-step">Step 2</span>
                      <strong>Adjust sliders</strong>
                      <p>Move percentages until they match your travel style.</p>
                    </article>
                    <article className="tb-ai-guide-item">
                      <span className="tb-ai-guide-step">Step 3</span>
                      <strong>Review per-day budget</strong>
                      <p>Check your daily spend before saving and continuing.</p>
                    </article>
                  </div>

                  <div className="tb-ai-legend-grid">
                    <article className="tb-ai-legend-item">
                      <span>Full budget</span>
                      <strong>{formatMoney(plannedTotal, sym)}</strong>
                    </article>
                    <article className="tb-ai-legend-item">
                      <span>Hotel set-aside</span>
                      <strong>{formatMoney(plannedHotel, sym)}</strong>
                    </article>
                    <article className="tb-ai-legend-item">
                      <span>Non-hotel budget</span>
                      <strong>{formatMoney(plannedRemaining, sym)}</strong>
                    </article>
                    <article className="tb-ai-legend-item">
                      <span>Total trip days</span>
                      <strong>{ruleDays} day{ruleDays !== 1 ? 's' : ''}</strong>
                    </article>
                    <article className="tb-ai-legend-item">
                      <span>Per-day non-hotel budget</span>
                      <strong>{formatMoney(perDayNonHotelBudget, sym)} / day</strong>
                    </article>
                  </div>

                  <div className="tb-ai-actions">
                    <button
                      type="button"
                      className="tb-ai-action-btn tb-ai-action-btn-primary"
                      onClick={applyAiSplit}
                      disabled={plannedTotal <= 0 || ruleDays <= 0}
                      title={isServerAiSplit ? 'Apply AI suggested split' : 'Apply local AI fallback split'}
                    >
                      {isServerAiSplit ? 'Apply recommended split' : 'Apply fallback split'}
                    </button>
                    <button
                      type="button"
                      className="tb-ai-action-btn"
                      onClick={resetRuleSplit}
                    >
                      Use balanced split (55 / 30 / 15)
                    </button>
                    {budgetAiError && (
                      <button
                        type="button"
                        className="tb-ai-action-btn"
                        onClick={retryBudgetAiPlan}
                        disabled={budgetAiLoading}
                      >
                        Retry AI plan
                      </button>
                    )}
                  </div>

                  <div className="tb-ai-adjust-grid">
                    <div className={`tb-ai-sum-check ${splitTotalPercent === 100 ? 'ok' : 'warn'}`}>
                      <span>Split total</span>
                      <strong>{splitTotalPercent}% {splitTotalPercent === 100 ? 'perfect' : '(target: 100%)'}</strong>
                    </div>

                    <article className="tb-ai-adjust-item">
                      <div className="tb-ai-adjust-head">
                        <span>🍽️ Food</span>
                        <strong>{normalizedSplit.food}%</strong>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={normalizedSplit.food}
                        onChange={(e) => updateSplitValue('food', e.target.value)}
                      />
                      <div className="tb-ai-adjust-meta">
                        <span>{formatMoney(splitPerDay.food, sym)} / day</span>
                        <span>{formatMoney(splitAmounts.food, sym)} total</span>
                      </div>
                    </article>

                    <article className="tb-ai-adjust-item">
                      <div className="tb-ai-adjust-head">
                        <span>🚗 Transport</span>
                        <strong>{normalizedSplit.transport}%</strong>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={normalizedSplit.transport}
                        onChange={(e) => updateSplitValue('transport', e.target.value)}
                      />
                      <div className="tb-ai-adjust-meta">
                        <span>{formatMoney(splitPerDay.transport, sym)} / day</span>
                        <span>{formatMoney(splitAmounts.transport, sym)} total</span>
                      </div>
                    </article>

                    <article className="tb-ai-adjust-item">
                      <div className="tb-ai-adjust-head">
                        <span>✨ Activities & Misc</span>
                        <strong>{normalizedSplit.activities_misc}%</strong>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={normalizedSplit.activities_misc}
                        onChange={(e) => updateSplitValue('activities_misc', e.target.value)}
                      />
                      <div className="tb-ai-adjust-meta">
                        <span>{formatMoney(splitPerDay.activities_misc, sym)} / day</span>
                        <span>{formatMoney(splitAmounts.activities_misc, sym)} total</span>
                      </div>
                    </article>
                  </div>

                  <div className="tb-ai-split">
                    <h3>Where your budget goes</h3>
                    <p>Based on your non-hotel budget and current slider values.</p>

                    <div className="tb-ai-split-grid">
                      <article className="tb-ai-split-item">
                        <div className="tb-ai-split-head">🏨 Hotel</div>
                        <strong>{formatMoney(plannedHotel, sym)}</strong>
                        <span>{plannedTotal > 0 ? Math.round((plannedHotel / plannedTotal) * 100) : 0}%</span>
                      </article>

                      <article className="tb-ai-split-item tb-ai-split-item--remaining">
                        <div className="tb-ai-split-head">Remaining</div>
                        <strong>{formatMoney(plannedRemaining, sym)}</strong>
                        <span>{plannedTotal > 0 ? Math.round((plannedRemaining / plannedTotal) * 100) : 0}% of total</span>
                      </article>

                      <article className="tb-ai-split-item">
                        <div className="tb-ai-split-head">🍽️ Food</div>
                        <strong>{formatMoney(splitAmounts.food, sym)}</strong>
                        <span>{normalizedSplit.food}% of remaining</span>
                        <small>{formatMoney(splitPerDay.food, sym)} / day × {ruleDays} day{ruleDays !== 1 ? 's' : ''}</small>
                      </article>

                      <article className="tb-ai-split-item">
                        <div className="tb-ai-split-head">🚗 Transport</div>
                        <strong>{formatMoney(splitAmounts.transport, sym)}</strong>
                        <span>{normalizedSplit.transport}% of remaining</span>
                        <small>{formatMoney(splitPerDay.transport, sym)} / day × {ruleDays} day{ruleDays !== 1 ? 's' : ''}</small>
                      </article>

                      <article className="tb-ai-split-item">
                        <div className="tb-ai-split-head">✨ Activities & Misc</div>
                        <strong>{formatMoney(splitAmounts.activities_misc, sym)}</strong>
                        <span>{normalizedSplit.activities_misc}% of remaining</span>
                        <small>{formatMoney(splitPerDay.activities_misc, sym)} / day × {ruleDays} day{ruleDays !== 1 ? 's' : ''}</small>
                      </article>
                    </div>
                  </div>

                  <div className="tb-ai-explain">
                    <h4>Quick summary</h4>
                    <div className="tb-ai-explain-row">
                      <span>Recommended split</span>
                      <strong>
                        {isServerAiSplit
                          ? `Food ${aiDailyPlan.percentages.food}% · Transport ${aiDailyPlan.percentages.transport}% · Activities & Misc ${aiDailyPlan.percentages.activities_misc}%`
                          : `Food ${aiSuggestedSplit.food}% · Transport ${aiSuggestedSplit.transport}% · Activities & Misc ${aiSuggestedSplit.activities_misc}%`}
                      </strong>
                    </div>
                    <div className="tb-ai-explain-row">
                      <span>Your non-hotel budget per day</span>
                      <strong>{formatMoney(perDayNonHotelBudget, sym)} / day</strong>
                    </div>
                    <div className="tb-ai-explain-row">
                      <span>Plan type</span>
                      <strong>
                        {splitSource === 'custom'
                          ? 'Custom plan (edited by you)'
                          : splitSource === 'rule-default'
                          ? 'Balanced plan (55/30/15)'
                          : 'AI recommended plan'}
                      </strong>
                    </div>
                    {budgetAiError && (
                      <div className="tb-ai-explain-row">
                        <span>AI status</span>
                        <strong>AI is temporarily unavailable. You can still continue with the balanced split and adjust sliders manually.</strong>
                      </div>
                    )}
                    {dailySplitTouched && (
                      <div className="tb-ai-explain-row">
                        <span>Tip</span>
                        <strong>You can tap “Apply recommended split” anytime to restore AI values.</strong>
                      </div>
                    )}
                    {isHotelOverTotal && (
                      <div className="tb-ai-explain-row">
                        <span>Important</span>
                        <strong>Your hotel budget is higher than your total budget. Please adjust it to continue.</strong>
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>

          </div>{/* end tb-col-right */}
        </div>{/* end tb-layout */}

        {/* ── Summary + CTA ── */}
        <div className="tb-cta-bar">
          <button className="tb-back-btn" onClick={() => navigate('/hotel-picker')}>
            ← Back
          </button>

          <div className="tb-summary">
            {totalBudget
              ? <span className="tb-summary-chip">🗺️ {formatMoney(Number(totalBudget), sym)} total</span>
              : <span className="tb-summary-chip muted">🗺️ Total not set</span>}
            {hotelBudget
              ? <span className="tb-summary-chip">🏨 {formatMoney(Number(hotelBudget), sym)} hotel</span>
              : <span className="tb-summary-chip muted">🏨 Hotel not set</span>}
            {selectedHotelsList.length > 0 && (
              <span className="tb-summary-chip">✅ Selected ~ {formatMoney(selectedHotelsAvgTotal, sym)}</span>
            )}
            <span className="tb-summary-chip">🗓️ {tripDays || prefsDays} {Number(tripDays || prefsDays) === 1 ? 'day' : 'days'}{Number(tripDays) > prefsDays ? ` (${prefsDays}n hotel)` : ''}</span>
          </div>

          <button
            className="tb-continue-btn"
            onClick={handleContinue}
            disabled={!canContinue}
          >
            Continue
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12,5 19,12 12,19"/>
            </svg>
          </button>
        </div>
          {(isTripDaysInvalid || isHotelOverTotal) && (
          <p className="tb-days-required" style={{ marginTop: '10px', textAlign: 'right' }}>
            {isTripDaysInvalid
              ? `⚠️ Total trip days must be at least ${minDays} (your hotel nights).`
              : '⚠️ Hotel budget cannot be greater than total trip budget.'}
          </p>
        )}
      </div>
    </div>
  )
}
