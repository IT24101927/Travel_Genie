import { useState, useEffect, useCallback, useRef } from 'react'
import { clearUserData } from '../../utils/clearUserData'
import { API_BASE } from '../../config/api'
import { useNavigate, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './TripDetails.css'
import '../../App.css'

const SL_CENTER = [7.8731, 80.7718]

function createTdPin(emoji, bg, size = 32) {
  return L.divIcon({
    html: `<div style="background:${bg};width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2.5px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:${Math.round(size*0.44)}px;line-height:1;">${emoji}</span></div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -(size + 4)],
  })
}

function TdMapFitBounds({ points, resetSignal = 0 }) {
  const map = useMap()
  useEffect(() => {
    const run = () => {
      map.invalidateSize()
      const valid = points.filter(p => p.lat && p.lng)
      if (!valid.length) return
      if (valid.length === 1) { map.setView([valid[0].lat, valid[0].lng], 13, { animate: true }) }
      else { map.fitBounds(L.latLngBounds(valid.map(p => [p.lat, p.lng])), { padding: [48, 48], maxZoom: 14, animate: true }) }
    }
    const t = setTimeout(run, resetSignal > 0 ? 50 : 200)
    return () => clearTimeout(t)
  }, [points, map, resetSignal])
  return null
}

function TdResetOnMapClick({ points }) {
  const map = useMap()
  useMapEvents({
    click() {
      const valid = points.filter(p => p.lat && p.lng)
      if (!valid.length) return
      if (valid.length === 1) {
        map.setView([valid[0].lat, valid[0].lng], 13, { animate: true })
      } else {
        map.fitBounds(L.latLngBounds(valid.map(p => [p.lat, p.lng])), { padding: [48, 48], maxZoom: 14, animate: true })
      }
    }
  })
  return null
}

// ── helpers ──────────────────────────────────────────────
function calcTripDays(start, end) {
  if (!start || !end) return 0
  const toUtcDate = (value) => {
    const datePart = String(value).slice(0, 10)
    const [y, m, d] = datePart.split('-').map(Number)
    if (!y || !m || !d) return NaN
    return Date.UTC(y, m - 1, d)
  }
  const s = toUtcDate(start)
  const e = toUtcDate(end)
  if (!Number.isFinite(s) || !Number.isFinite(e)) return 0
  // Return number of nights (check-in to check-out = nights, not inclusive days)
  const diffDays = Math.floor((e - s) / (1000 * 60 * 60 * 24))
  return Math.max(1, diffDays)
}
function addDays(dateStr, days) {
  if (!dateStr || days === undefined || days === null) return ''
  const d = new Date(dateStr)
  d.setDate(d.getDate() + Number(days || 0))
  return d.toISOString().split('T')[0]
}

function toMoneyNumber(value) {
  if (value === undefined || value === null || value === '') return 0
  const normalized = String(value).replace(/,/g, '')
  const num = Number(normalized)
  return Number.isFinite(num) ? num : 0
}

function normalizeSplitForDetails(split) {
  const keys = ['food', 'transport', 'activities_misc']
  const fallback = { food: 55, transport: 30, activities_misc: 15 }
  const values = keys.map((key) => Math.max(Number(split?.[key]) || 0, 0))
  const total = values.reduce((sum, value) => sum + value, 0)
  if (total <= 0) return fallback

  const scaled = values.map((value) => (value / total) * 100)
  const base = scaled.map((value) => Math.floor(value))
  let remainder = 100 - base.reduce((sum, value) => sum + value, 0)
  const order = scaled
    .map((value, idx) => ({ idx, frac: value - base[idx] }))
    .sort((a, b) => (b.frac - a.frac) || (a.idx - b.idx))

  let i = 0
  while (remainder > 0) {
    base[order[i % order.length].idx] += 1
    remainder -= 1
    i += 1
  }

  return {
    food: base[0],
    transport: base[1],
    activities_misc: base[2],
  }
}

// ════════════════════════════════════════════════════════════
export default function TripDetails({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('currentUser') || '{}') } catch { return {} }
  })()
  const currentUserId = currentUser?.id != null ? String(currentUser.id) : ''
  const currentUserEmail = (currentUser?.email || '').toLowerCase()
  const isOwnedByCurrentUser = useCallback((trip) => {
    const ownerId = trip?.ownerId != null ? String(trip.ownerId) : ''
    const ownerEmail = (trip?.ownerEmail || '').toLowerCase()
    if (!ownerId && !ownerEmail) return true
    return (ownerId && ownerId === currentUserId) || (ownerEmail && ownerEmail === currentUserEmail)
  }, [currentUserEmail, currentUserId])

  const [destination] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('selectedDistrict') || localStorage.getItem('selectedDestination') || 'null')
    } catch {
      return null
    }
  })
  const [hotel, setHotel] = useState(null)
  const [budget, setBudget] = useState(null)
  const [prefs, setPrefs] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedPlaces, setSelectedPlaces] = useState([])
  const [selectedHotels, setSelectedHotels] = useState([])

  // form state
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })()
  const [tripName, setTripName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [mapResetSignal, setMapResetSignal] = useState(0)
  const mapCardRef = useRef(null)

  // Zoom back out when user clicks outside the map card
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mapCardRef.current && !mapCardRef.current.contains(e.target)) {
        setMapResetSignal(s => s + 1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Load district/destination + user from localStorage ──
  useEffect(() => {
    const destRaw = localStorage.getItem('selectedDistrict') || localStorage.getItem('selectedDestination')
    const userRaw = localStorage.getItem('currentUser')
    if (destRaw) {
      const dest = JSON.parse(destRaw)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTripName(`My trip to ${dest.name}`)
    } else {
      navigate('/plan-trip')
    }
    const hotelRaw = localStorage.getItem('selectedHotel')
    if (hotelRaw) {
      const parsedHotel = JSON.parse(hotelRaw)
      setHotel(parsedHotel)
    }

    // Pre-fill trip dates — prefer prefs startDate (authoritative), fall back to hotel dates
    if (!localStorage.getItem('editingTripId')) {
      const prefsRaw2 = localStorage.getItem('tripPreferences')
      const prefs2 = prefsRaw2 ? (() => { try { return JSON.parse(prefsRaw2) } catch { return null } })() : null
      const budgetRaw2 = localStorage.getItem('tripBudget')
      const budget2 = budgetRaw2 ? (() => { try { return JSON.parse(budgetRaw2) } catch { return null } })() : null
      // Prefer total trip days from budget page; fall back to hotel nights from prefs
      const totalDays = budget2?.tripDays || prefs2?.days
      if (prefs2?.startDate && totalDays) {
        // Compute end date from start date + total trip days using local date arithmetic
        const [y, m, d] = prefs2.startDate.split('-').map(Number)
        const end = new Date(y, m - 1, d + Number(totalDays))
        const endStr = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`
        setStartDate(prefs2.startDate)
        setEndDate(endStr)
      } else if (hotelRaw) {
        // Fallback: derive dates from hotel check-in/check-out
        const parsedHotel = JSON.parse(hotelRaw)
        if (parsedHotel.checkIn && parsedHotel.checkOut) {
          let earliestCI = parsedHotel.checkIn
          let latestCO = parsedHotel.checkOut
          try {
            const allHotels = JSON.parse(localStorage.getItem('selectedHotels') || '[]')
            allHotels.forEach(h => {
              if (h.checkIn && h.checkIn < earliestCI) earliestCI = h.checkIn
              if (h.checkOut && h.checkOut > latestCO) latestCO = h.checkOut
            })
          } catch { /* ignore */ }
          setStartDate(earliestCI)
          setEndDate(latestCO)
        }
      }
    }
    const budgetRaw = localStorage.getItem('tripBudget')
    if (budgetRaw) setBudget(JSON.parse(budgetRaw))
    const prefsRaw = localStorage.getItem('tripPreferences')
    if (prefsRaw) setPrefs(JSON.parse(prefsRaw))
    if (userRaw) { JSON.parse(userRaw) }

    // Load selected places and hotels for the overview map
    try { setSelectedPlaces(JSON.parse(localStorage.getItem('selectedPlaces') || '[]')) } catch { /* ignore */ }
    try { setSelectedHotels(JSON.parse(localStorage.getItem('selectedHotels') || '[]')) } catch { /* ignore */ }

    // ── If editing an existing trip, pre-fill name / dates / notes ──
    const editingId = localStorage.getItem('editingTripId')
    if (editingId) {
      setIsEditing(true)
      const trips = JSON.parse(localStorage.getItem('myTrips') || '[]')
      const existing = trips.find(t => {
        if (!isOwnedByCurrentUser(t)) return false
        const localId = String(t.id || t._id || '')
        const dbId = String(t.dbTripId || '')
        const target = String(editingId)
        return localId === target || dbId === target
      })

      if (existing) {
        setTripName(existing.tripName || '')
        setStartDate(existing.startDate ? existing.startDate.slice(0, 10) : '')
        setEndDate(existing.endDate ? existing.endDate.slice(0, 10) : '')
        setNotes(existing.notes || '')
      } else {
        const token = localStorage.getItem('token')
        if (token) {
          fetch(`${API_BASE}/trips/${editingId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then(r => r.ok ? r.json() : null)
            .then(json => {
              const t = json?.data
              if (!t) return
              setTripName(t.title || '')
              setStartDate(t.start_date ? String(t.start_date).slice(0, 10) : '')
              setEndDate(t.end_date ? String(t.end_date).slice(0, 10) : '')
              setNotes(t.notes || '')
            })
            .catch(() => {})
        }
      }
    }
  }, [navigate, isOwnedByCurrentUser])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    clearUserData()
    navigate('/')
  }

  const tripDaysCount = calcTripDays(startDate, endDate)

  // ── Budget calculations ──
  const CURRENCY_SYM = { LKR: 'Rs', USD: '$', EUR: '€', GBP: '£' }
  const budSym       = CURRENCY_SYM[budget?.currency] || ''
  const budTotal     = budget?.totalBudget  || 0
  const budHotel     = budget?.hotelBudget  || 0
  const budRemaining = Math.max(budTotal - budHotel, 0)
  const split = normalizeSplitForDetails(budget?.dailySplit)
  const budDays      = Number(budget?.tripDays) > 0 ? Number(budget.tripDays) : (tripDaysCount > 0 ? tripDaysCount : (prefs?.days || 1))
  const budFood      = Math.round(budRemaining * (split.food / 100))
  const budTravel    = Math.round(budRemaining * (split.transport / 100))
  const budMisc      = budRemaining - budFood - budTravel
  const pctHotel     = budTotal > 0 ? Math.round((budHotel   / budTotal) * 100) : 0
  const pctFood      = budTotal > 0 ? Math.round((budFood     / budTotal) * 100) : 0
  const pctTravel    = budTotal > 0 ? Math.round((budTravel   / budTotal) * 100) : 0
  const pctMisc      = 100 - pctHotel - pctFood - pctTravel
  const foodPerDay   = budDays > 0 ? Math.round(budFood   / budDays) : 0
  const travelPerDay = budDays > 0 ? Math.round(budTravel / budDays) : 0

  // ── Validate ──
  function validate() {
    const e = {}
    if (!tripName.trim()) e.tripName = 'Trip name is required.'
    // startDate is locked (read-only from preferences) — no user validation needed
    if (!endDate) e.endDate = 'Please choose a return date.'
    if (startDate && endDate && endDate < startDate) e.endDate = 'Return date cannot be before start date.'
    return e
  }

  // ── Save / Update ──
  function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSaving(true)

    const editingId = localStorage.getItem('editingTripId')
    const selectedPlaces = (() => {
      try { return JSON.parse(localStorage.getItem('selectedPlaces') || '[]') } catch { return [] }
    })()
    const selectedHotels = (() => {
      try { return JSON.parse(localStorage.getItem('selectedHotels') || '[]') } catch { return [] }
    })()

    const updatedFields = {
      ownerId: currentUser?.id ?? null,
      ownerEmail: currentUser?.email || null,
      destinationId: destination?.id || destination?._id,
      districtFrontendId: destination?.id || null,
      destinationName: destination?.name,
      destinationCity: destination?.city,
      destinationCountry: destination?.country,
      destinationImage: destination?.images?.[0] || destination?.image,
      category: destination?.category,
      hotelId: hotel?._id || null,
      hotelName: hotel?.name || null,
      hotelCategory: hotel?.category || null,
      hotelStars: hotel?.starRating || hotel?.star_class || null,
      hotelPriceMin: hotel?.priceRange?.min || hotel?.price_per_night || null,
      hotelPriceCurrency: hotel?.priceRange?.currency || 'LKR',
      totalBudget: budget?.totalBudget ?? null,
      hotelBudget: budget?.hotelBudget ?? null,
      budgetCurrency: budget?.currency ?? null,
      dailySplit: normalizeSplitForDetails(budget?.dailySplit),
      splitSource: budget?.splitSource || null,
      tripName: tripName.trim(),
      startDate,
      endDate,
      tripDays: tripDaysCount,
      nights: selectedHotels.reduce((s, h) => s + (Number(h.nights) || 0), 0) || prefs?.days || 0,
      notes: notes.trim(),
      status: 'planned',
      estimatedCost: destination?.costRange || '',
      districtName: destination?.name,
      provinceName: destination?.province,
      selectedPlaces,
      selectedHotels,
    }

    if (editingId) {
      // ── UPDATE existing trip ──
      const existing = JSON.parse(localStorage.getItem('myTrips') || '[]')
      const isEditingTarget = (t) => {
        if (!isOwnedByCurrentUser(t)) return false
        const localId = String(t.id || t._id || '')
        const dbId = String(t.dbTripId || '')
        const target = String(editingId)
        return localId === target || dbId === target
      }
      const existingTrip = existing.find(isEditingTarget)
      const updated = existing.map(t =>
        isEditingTarget(t)
          ? { ...t, ...updatedFields, id: t.id || t._id, createdAt: t.createdAt, dbTripId: t.dbTripId }
          : t
      )

      const syncTripBudgetCache = (tripLike) => {
        const budget = toMoneyNumber(tripLike?.totalBudget ?? tripLike?.total_budget)
        if (budget <= 0) return
        const ids = [tripLike?.id, tripLike?._id, tripLike?.dbTripId, tripLike?.trip_id]
          .filter(v => v !== undefined && v !== null && v !== '')
          .map(v => String(v))
        if (!ids.length) return
        const stored = (() => { try { return JSON.parse(localStorage.getItem('tripBudgets') || '{}') } catch { return {} } })()
        let changed = false
        ids.forEach((id) => {
          if (Number(stored[id] || 0) !== budget) {
            stored[id] = budget
            changed = true
          }
        })
        if (changed) localStorage.setItem('tripBudgets', JSON.stringify(stored))
      }

      const syncTripBudgetSplitCache = (tripLike) => {
        const split = normalizeSplitForDetails(tripLike?.dailySplit || budget?.dailySplit)
        const ids = [tripLike?.id, tripLike?._id, tripLike?.dbTripId, tripLike?.trip_id]
          .filter(v => v !== undefined && v !== null && v !== '')
          .map(v => String(v))
        if (!ids.length) return

        const stored = (() => { try { return JSON.parse(localStorage.getItem('tripBudgetSplits') || '{}') } catch { return {} } })()
        let changed = false
        ids.forEach((id) => {
          const prev = stored[id] || {}
          if (
            Number(prev.food) !== Number(split.food) ||
            Number(prev.transport) !== Number(split.transport) ||
            Number(prev.activities_misc) !== Number(split.activities_misc)
          ) {
            stored[id] = split
            changed = true
          }
        })
        if (changed) localStorage.setItem('tripBudgetSplits', JSON.stringify(stored))
      }

      const finalizeEdit = (tripList = updated) => {
        localStorage.setItem('myTrips', JSON.stringify(tripList))
        const editedTrip = tripList.find((t) => {
          const localId = String(t.id || t._id || '')
          const dbTripId = String(t.dbTripId || '')
          const target = String(editingId)
          return localId === target || dbTripId === target
        })
        if (editedTrip) syncTripBudgetCache(editedTrip)
        if (editedTrip) syncTripBudgetSplitCache(editedTrip)
        localStorage.removeItem('editingTripId')
        setSaving(false)
        setSubmitted(true)
        setTimeout(() => navigate('/dashboard'), 2800)
      }

      const syncUpdatedTripFromApi = async (dbTripId, fallbackTrips) => {
        const tokenNow = localStorage.getItem('token')
        if (!tokenNow || !dbTripId) return fallbackTrips
        try {
          const res = await fetch(`${API_BASE}/trips/my`, {
            headers: { Authorization: `Bearer ${tokenNow}` },
          })
          if (!res.ok) return fallbackTrips
          const json = await res.json().catch(() => null)
          const fresh = Array.isArray(json?.data)
            ? json.data.find((t) => String(t.trip_id) === String(dbTripId))
            : null
          if (!fresh) return fallbackTrips

          const normalized = {
            ownerId: currentUser?.id ?? null,
            ownerEmail: currentUser?.email || null,
            id: fresh.trip_id,
            dbTripId: fresh.trip_id,
            tripName: fresh.title,
            startDate: fresh.start_date ? String(fresh.start_date).slice(0, 10) : '',
            endDate: fresh.end_date ? String(fresh.end_date).slice(0, 10) : '',
            tripDays: Number(fresh.num_days) > 0 ? Number(fresh.num_days) : calcTripDays(fresh.start_date, fresh.end_date),
            nights: Number(fresh.num_days) > 0 ? Math.max(0, Number(fresh.num_days) - 1) : Math.max(0, calcTripDays(fresh.start_date, fresh.end_date) - 1),
            totalBudget: fresh.total_budget != null ? Number(fresh.total_budget) : 0,
            hotelBudget: fresh.hotel_budget != null ? Number(fresh.hotel_budget) : 0,
            budgetCurrency: fresh.budget_currency || 'LKR',
            destinationName: fresh.district?.name || destination?.name || '',
            destinationCity: fresh.district?.province ? `${fresh.district.province} Province` : (destination?.city || ''),
            destinationId: fresh.district?.district_id || destination?.district_id || destination?.id || null,
            provinceName: fresh.district?.province || destination?.province || '',
            hotelId: fresh.hotel_place_id || null,
            hotelName: fresh.hotel_name || null,
            hotelCategory: fresh.hotel_category || null,
            hotelStars: fresh.hotel_star_class || null,
            hotelPriceMin: fresh.hotel_price_min != null ? Number(fresh.hotel_price_min) : null,
            hotelPriceCurrency: fresh.hotel_price_currency || 'LKR',
            notes: fresh.notes || '',
            status: fresh.status || 'planned',
            selectedPlaces: Array.isArray(fresh.selected_places) ? fresh.selected_places : selectedPlaces,
            selectedHotels: Array.isArray(fresh.selected_hotels) ? fresh.selected_hotels : selectedHotels,
          }

          const synced = fallbackTrips.map((t) => {
            const localId = String(t.id || t._id || '')
            const localDbId = String(t.dbTripId || '')
            const target = String(editingId)
            const match = localId === target || localDbId === target || localDbId === String(dbTripId)
            return match ? { ...t, ...normalized, id: t.id || normalized.id, dbTripId: normalized.dbTripId } : t
          })
          return synced
        } catch {
          return fallbackTrips
        }
      }

      // Also sync to API if this trip was previously saved server-side
      const token = localStorage.getItem('token')
      const dbId = existingTrip?.dbTripId || (existingTrip?.source === 'api' ? existingTrip?.id : null)
      const districtIdForApi = Number(destination?.district_id ?? destination?.districtFrontendId ?? destination?.id)
      const hotelPlaceIdForApi = Number(hotel?.place_id)
      if (token && dbId) {
        fetch(`${API_BASE}/trips/${dbId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            district_id:  Number.isFinite(districtIdForApi) ? districtIdForApi : null,
            title:        tripName.trim(),
            start_date:   startDate,
            end_date:     endDate,
            num_people:   prefs?.people ?? 1,
            total_budget: toMoneyNumber(budget?.totalBudget),
            hotel_budget: toMoneyNumber(budget?.hotelBudget),
            budget_currency: budget?.currency || 'LKR',
            hotel_place_id: Number.isFinite(hotelPlaceIdForApi) ? hotelPlaceIdForApi : null,
            hotel_name: hotel?.name || null,
            hotel_category: hotel?.category || null,
            hotel_star_class: hotel?.starRating || hotel?.star_class || null,
            hotel_price_min: toMoneyNumber(hotel?.priceRange?.min || hotel?.price_per_night),
            hotel_price_currency: hotel?.priceRange?.currency || 'LKR',
            selected_places: selectedPlaces,
            selected_hotels: selectedHotels,
            preferences: prefs || {},
            status:       'planned',
            notes:        notes.trim() || null,
          }),
        })
          .then(async (res) => {
            if (!res.ok) {
              const data = await res.json().catch(() => ({}))
              throw new Error(data.message || 'Could not update trip on server')
            }
          })
          .then(() => syncUpdatedTripFromApi(dbId, updated))
          .then((syncedTrips) => finalizeEdit(syncedTrips))
          .catch((err) => {
            setSaving(false)
            alert(`Budget update was not saved to server. ${err.message}`)
          })
        return
      }

      // Local-only trip update
      finalizeEdit()
      return
    }

    // ── CREATE new trip ──
    const localTrip = { id: Date.now(), ...updatedFields, createdAt: new Date().toISOString() }
    const token = localStorage.getItem('token')
    const districtIdRaw = Number(destination?.district_id ?? destination?.districtFrontendId ?? destination?.id)
    const districtId = Number.isFinite(districtIdRaw) ? districtIdRaw : null

    const apiBody = {
      district_id:  districtId,
      title:        tripName.trim(),
      start_date:   startDate,
      end_date:     endDate,
      num_people:   prefs?.people ?? 1,
      total_budget: toMoneyNumber(budget?.totalBudget),
      hotel_budget: toMoneyNumber(budget?.hotelBudget),
      budget_currency: budget?.currency || 'LKR',
      hotel_place_id: Number.isFinite(Number(hotel?.place_id)) ? Number(hotel.place_id) : null,
      hotel_name: hotel?.name || null,
      hotel_category: hotel?.category || null,
      hotel_star_class: hotel?.starRating || hotel?.star_class || null,
      hotel_price_min: toMoneyNumber(hotel?.priceRange?.min || hotel?.price_per_night),
      hotel_price_currency: hotel?.priceRange?.currency || 'LKR',
      selected_places: selectedPlaces,
      selected_hotels: selectedHotels,
      preferences: prefs || {},
      status:       'planned',
      notes:        notes.trim() || null,
    }

    const trySaveApi = () => {
      if (!token || !districtId) return Promise.resolve(null)
      return fetch(`${API_BASE}/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(apiBody),
      })
        .then(r => r.ok ? r.json() : null)
        .then(json => json?.data?.trip_id || json?.data?.id || null)
        .catch(() => null)
    }

    trySaveApi().then(dbTripId => {
      if (dbTripId) localTrip.dbTripId = dbTripId
      const existing = JSON.parse(localStorage.getItem('myTrips') || '[]')
      existing.push(localTrip)
      localStorage.setItem('myTrips', JSON.stringify(existing))
      const budgetValue = toMoneyNumber(localTrip.totalBudget)
      if (budgetValue > 0) {
        const stored = (() => { try { return JSON.parse(localStorage.getItem('tripBudgets') || '{}') } catch { return {} } })()
        const localId = String(localTrip.id)
        stored[localId] = budgetValue
        if (localTrip.dbTripId) stored[String(localTrip.dbTripId)] = budgetValue
        localStorage.setItem('tripBudgets', JSON.stringify(stored))
      }
      const splitStored = (() => { try { return JSON.parse(localStorage.getItem('tripBudgetSplits') || '{}') } catch { return {} } })()
      const normalizedSplit = normalizeSplitForDetails(localTrip.dailySplit)
      splitStored[String(localTrip.id)] = normalizedSplit
      if (localTrip.dbTripId) splitStored[String(localTrip.dbTripId)] = normalizedSplit
      localStorage.setItem('tripBudgetSplits', JSON.stringify(splitStored))
      setSaving(false)
      setSubmitted(true)
      setTimeout(() => navigate('/dashboard'), 2800)
    })
  }

  // ════════════════════════════════════════════════════════════
  // SUCCESS STATE
  // ════════════════════════════════════════════════════════════
  if (submitted) {
    return (
      <div className="td-page" data-theme={theme}>
        <div className="td-success-overlay">
          <div className="td-success-card">
            {(destination?.image || destination?.images?.[0]) && (
              <div className="td-success-banner">
                <img src={destination.image || destination.images[0]} alt={destination.name} />
                <div className="td-success-banner-fade" />
              </div>
            )}
            <div className="td-success-body">
              <div className="td-success-icon">{isEditing ? '✏️' : '✈️'}</div>
              <h2>{isEditing ? 'Trip Updated!' : 'Trip Saved!'}</h2>
              <p>
                <strong>{tripName}</strong> has been {isEditing ? 'updated successfully' : 'added to your trips'}.
              </p>
              <div className="td-success-chips">
                {destination && <span className="td-success-chip">📍 {destination.name}</span>}
                {tripDaysCount > 0 && <span className="td-success-chip">🗓️ {tripDaysCount} day{tripDaysCount !== 1 ? 's' : ''}</span>}
                {selectedPlaces.length > 0 && <span className="td-success-chip">🗺️ {selectedPlaces.length} place{selectedPlaces.length !== 1 ? 's' : ''}</span>}
                {selectedHotels.length > 0 && <span className="td-success-chip">🏨 {selectedHotels.length} hotel{selectedHotels.length !== 1 ? 's' : ''}</span>}
                {budTotal > 0 && <span className="td-success-chip">💰 {budSym}{budTotal.toLocaleString()}</span>}
              </div>
              <p className="td-redirect-label">Redirecting to your dashboard…</p>
              <div className="td-redirect-bar">
                <div className="td-redirect-fill" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════
  // MAIN LAYOUT
  // ════════════════════════════════════════════════════════════
  const TD_TYPE_ICONS = { beach: '🏖️', temple: '🛕', waterfall: '💧', viewpoint: '🏔️', museum: '🏛️', park: '🌿', market: '🛒', hotel: '🏨', restaurant: '🍽️', wildlife: '🦁', cave: '🕳️', fort: '🏰', lake: '🏞️', default: '📍' }
  const tdHotelPins = selectedHotels
    .filter(h => h.lat && h.lng && !isNaN(Number(h.lat)) && !isNaN(Number(h.lng)))
    .map(h => ({ key: `hotel-${h._id}`, lat: Number(h.lat), lng: Number(h.lng), label: h.name, subtitle: h.category || '', icon: createTdPin('🏨', '#f59e0b', 36) }))
  const tdPlacePins = selectedPlaces
    .filter(p => p.lat != null && p.lng != null && !isNaN(Number(p.lat)) && !isNaN(Number(p.lng)))
    .map(p => ({ key: `place-${p.id ?? p._id}`, lat: Number(p.lat), lng: Number(p.lng), label: p.name, subtitle: p.type || '', icon: createTdPin(TD_TYPE_ICONS[p.type?.toLowerCase()] || TD_TYPE_ICONS.default, '#6366f1', 30) }))
  const tdAllPins = [...tdHotelPins, ...tdPlacePins]

  return (
    <div className="td-page" data-theme={theme}>

      {/* ── Saving overlay ── */}
      {saving && (
        <div className="td-saving-overlay">
          <div className="td-saving-card">
            <div className="td-saving-plane">✈️</div>
            <h2>{isEditing ? 'Updating your trip…' : 'Saving your trip…'}</h2>
            <p>Hold tight while we {isEditing ? 'update' : 'save'} <strong>{tripName || 'your trip'}</strong></p>
            <div className="td-saving-dots">
              <span /><span /><span />
            </div>
          </div>
        </div>
      )}

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

      {/* ── Hero ── */}
      <section className="td-hero">
        <div className="td-hero-inner">
          <div className="td-steps">
            <div className="td-step done" onClick={() => navigate('/plan-trip')} title="Choose District">
              <span className="td-step-num">1</span>
              <span className="td-step-label">District</span>
            </div>
            <div className="td-step-line done" />
            <div className="td-step done" onClick={() => navigate('/district-explore')} title="Pick Places">
              <span className="td-step-num">2</span>
              <span className="td-step-label">Places</span>
            </div>
            <div className="td-step-line done" />
            <div className="td-step done" onClick={() => navigate('/trip-preferences')} title="Set Preferences">
              <span className="td-step-num">3</span>
              <span className="td-step-label">Preferences</span>
            </div>
            <div className="td-step-line done" />
            <div className="td-step done" onClick={() => navigate('/hotel-picker')} title="Choose Hotel">
              <span className="td-step-num">4</span>
              <span className="td-step-label">Hotel</span>
            </div>
            <div className="td-step-line done" />
            <div className="td-step done" onClick={() => navigate('/trip-budget')} title="Set Budget">
              <span className="td-step-num">5</span>
              <span className="td-step-label">Budget</span>
            </div>
            <div className="td-step-line done" />
            <div className="td-step active">
              <span className="td-step-num">6</span>
              <span className="td-step-label">Details</span>
            </div>
          </div>

          {destination && (
            <p className="td-eyebrow">📍 {destination.province} Province · {destination.name}</p>
          )}
          <h1>Finalize your <em>trip</em></h1>
          <p className="td-hero-sub">One last step — fill in the details to save your itinerary.</p>
        </div>
      </section>

      {/* ── Body ── */}
      <div className="td-body">

        <div className="td-layout">

          {/* ── LEFT COLUMN: change cards + budget ── */}
          <div className="td-col-left">

            {/* Context Cards */}
            <div className="td-context-strip">
              {destination && (
                <div className="td-ctx-card">
                  {(destination.image || destination.images?.[0]) ? (
                    <img
                      src={destination.image || destination.images[0]}
                      alt={destination.name}
                      className="td-ctx-img"
                      onError={e => { e.target.style.display = 'none' }}
                    />
                  ) : (
                    <div className="td-ctx-img td-ctx-placeholder">📍</div>
                  )}
                  <div className="td-ctx-info">
                    <span className="td-ctx-label">Destination</span>
                    <span className="td-ctx-name">{destination.name}</span>
                    {destination.province && <span className="td-ctx-sub">{destination.province} Province</span>}
                  </div>
                  <button className="td-ctx-change" onClick={() => navigate('/plan-trip')}>Change</button>
                </div>
              )}

              {prefs && (
                <div className="td-ctx-card">
                  <span className="td-ctx-icon">📅</span>
                  <div className="td-ctx-info">
                    <span className="td-ctx-label">Preferences</span>
                    <span className="td-ctx-name">{prefs.days} {prefs.days === 1 ? 'night' : 'nights'}</span>
                    <span className="td-ctx-sub">{prefs.people} {prefs.people === 1 ? 'person' : 'people'} · {prefs.tripType}</span>
                  </div>
                  <button className="td-ctx-change" onClick={() => navigate('/trip-preferences')}>Change</button>
                </div>
              )}

              <div className="td-ctx-card">
                <span className="td-ctx-icon">🏨</span>
                <div className="td-ctx-info">
                  <span className="td-ctx-label">Hotel</span>
                  {hotel ? (
                    <>
                      <span className="td-ctx-name">{hotel.name}</span>
                      {hotel.starRating > 0 && <span className="td-ctx-sub">{'★'.repeat(hotel.starRating)} {hotel.category}</span>}
                    </>
                  ) : (
                    <span className="td-ctx-name td-ctx-empty">Not selected</span>
                  )}
                </div>
                <button className="td-ctx-change" onClick={() => navigate('/hotel-picker')}>Change</button>
              </div>

              <div className="td-ctx-card">
                <span className="td-ctx-icon">💰</span>
                <div className="td-ctx-info">
                  <span className="td-ctx-label">Budget</span>
                  {budget?.totalBudget > 0 ? (
                    <>
                      <span className="td-ctx-name">{budSym}{budTotal.toLocaleString()}</span>
                      <span className="td-ctx-sub">{budget.currency}</span>
                    </>
                  ) : (
                    <span className="td-ctx-name td-ctx-empty">Not set</span>
                  )}
                </div>
                <button className="td-ctx-change" onClick={() => navigate('/trip-budget')}>Change</button>
              </div>
            </div>

            {/* Budget Breakdown */}
            {budget?.totalBudget > 0 && (
              <section className="td-section">
                <div className="td-section-header">
                  <span className="td-section-icon">💰</span>
                  <div>
                    <h2>Budget breakdown</h2>
                    <p>How your {budSym}{budTotal.toLocaleString()} {budget.currency} budget is split using your latest budget settings</p>
                  </div>
                </div>

                <div className="td-bud-bar">
                  {pctHotel  > 0 && <div className="td-bud-seg hotel"  style={{width:`${pctHotel}%`}} />}
                  {pctFood   > 0 && <div className="td-bud-seg food"   style={{width:`${pctFood}%`}} />}
                  {pctTravel > 0 && <div className="td-bud-seg travel" style={{width:`${pctTravel}%`}} />}
                  {pctMisc   > 0 && <div className="td-bud-seg misc"   style={{width:`${pctMisc}%`}} />}
                </div>

                <div className="td-bud-rows">
                  <div className="td-bud-row">
                    <div className="td-bud-row-left"><span className="td-bud-dot hotel" /><span>🏨 Hotel</span></div>
                    <div className="td-bud-row-right">
                      <span className="td-bud-amount">{budSym}{budHotel.toLocaleString()}</span>
                      <span className="td-bud-pct">{pctHotel}%</span>
                    </div>
                  </div>

                  <div className="td-bud-divider">Remaining — {budSym}{budRemaining.toLocaleString()}</div>

                  <div className="td-bud-row">
                    <div className="td-bud-row-left"><span className="td-bud-dot food" /><span>🍽️ Food</span></div>
                    <div className="td-bud-row-right">
                      <span className="td-bud-amount">{budSym}{budFood.toLocaleString()}</span>
                      <span className="td-bud-pct">{pctFood}%</span>
                    </div>
                  </div>
                  <div className="td-bud-per-day">
                    {budSym}{foodPerDay.toLocaleString()} / day
                    <span className="td-bud-days-tag">× {budDays} {budDays === 1 ? 'day' : 'days'}</span>
                  </div>

                  <div className="td-bud-row">
                    <div className="td-bud-row-left"><span className="td-bud-dot travel" /><span>🚗 Transport</span></div>
                    <div className="td-bud-row-right">
                      <span className="td-bud-amount">{budSym}{budTravel.toLocaleString()}</span>
                      <span className="td-bud-pct">{pctTravel}%</span>
                    </div>
                  </div>
                  <div className="td-bud-per-day">
                    {budSym}{travelPerDay.toLocaleString()} / day
                    <span className="td-bud-days-tag">× {budDays} {budDays === 1 ? 'day' : 'days'}</span>
                  </div>

                  <div className="td-bud-row">
                    <div className="td-bud-row-left"><span className="td-bud-dot misc" /><span>✨ Activities &amp; Misc</span></div>
                    <div className="td-bud-row-right">
                      <span className="td-bud-amount">{budSym}{budMisc.toLocaleString()}</span>
                      <span className="td-bud-pct">{pctMisc}%</span>
                    </div>
                  </div>
                </div>

                <button className="td-adjust-btn" onClick={() => navigate('/trip-budget')}>Adjust Budget →</button>
              </section>
            )}

          </div>{/* end td-col-left */}

          {/* ── RIGHT COLUMN: trip details form + notes ── */}
          <div className="td-col-right">

            {/* Trip Details */}
            <section className="td-section">
              <div className="td-section-header">
                <span className="td-section-icon">✏️</span>
                <div>
                  <h2>Trip details</h2>
                  <p>Give your trip a name and choose your travel dates</p>
                </div>
              </div>

              <div className="td-field">
                <label className="td-label">Trip Name</label>
                <div className="td-input-wrap">
                  <svg className="td-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                  </svg>
                  <input
                    type="text"
                    className={`td-input ${errors.tripName ? 'td-input-error' : ''}`}
                    value={tripName}
                    onChange={e => setTripName(e.target.value)}
                    placeholder="Give your trip a name…"
                    maxLength={80}
                  />
                </div>
                {errors.tripName && <span className="td-error-msg">{errors.tripName}</span>}
              </div>

              <div className="td-dates-row">
                <div className="td-field">
                  <label className="td-label">Departure Date</label>
                  <div className="td-input-wrap">
                    <svg className="td-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <input
                      type="date"
                      className="td-input td-input-readonly"
                      value={startDate}
                      readOnly
                    />
                  </div>
                  <span className="td-field-hint">🔒 Set in preferences — <button type="button" className="td-inline-link" onClick={() => navigate('/trip-preferences')}>change</button></span>
                </div>

                <div className="td-field">
                  <label className="td-label">Return Date</label>
                  <div className="td-input-wrap">
                    <svg className="td-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <input
                      type="date"
                      className={`td-input ${errors.endDate ? 'td-input-error' : ''}`}
                      value={endDate}
                      min={startDate || tomorrow}
                      onChange={e => setEndDate(e.target.value)}
                    />
                  </div>
                  {errors.endDate && <span className="td-error-msg">{errors.endDate}</span>}
                </div>
              </div>

              {tripDaysCount > 0 && (
                <div className="td-nights-badge">🗓️ {tripDaysCount} {tripDaysCount === 1 ? 'day' : 'days'}</div>
              )}
            </section>

            {/* Notes */}
            <section className="td-section">
              <div className="td-section-header">
                <span className="td-section-icon">📝</span>
                <div>
                  <h2>Notes <span className="td-optional">optional</span></h2>
                  <p>Dietary requirements, accessibility needs, must-see spots…</p>
                </div>
              </div>
              <textarea
                className="td-textarea"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any special notes for your trip…"
                rows={4}
                maxLength={500}
              />
              <div className="td-char-count">{notes.length}/500</div>
            </section>

            {/* ── Itinerary Map ── */}
            {tdAllPins.length > 0 && (
              <section className="td-overview-map-section" ref={mapCardRef}>
                <div className="td-overview-map-header">
                  <span className="td-section-icon">🗺️</span>
                  <div>
                    <h2>Your itinerary on the map</h2>
                    <p>
                      {tdHotelPins.length > 0 && `${tdHotelPins.length} hotel${tdHotelPins.length !== 1 ? 's' : ''}`}
                      {tdHotelPins.length > 0 && tdPlacePins.length > 0 && ' · '}
                      {tdPlacePins.length > 0 && `${tdPlacePins.length} place${tdPlacePins.length !== 1 ? 's' : ''}`}
                      {' '}selected
                    </p>
                  </div>
                  <div className="td-overview-map-legend">
                    {tdHotelPins.length > 0 && (
                      <span className="td-omap-leg-item">
                        <span className="td-omap-leg-dot" style={{ background: '#f59e0b' }} />
                        Hotels
                      </span>
                    )}
                    {tdPlacePins.length > 0 && (
                      <span className="td-omap-leg-item">
                        <span className="td-omap-leg-dot" style={{ background: '#6366f1' }} />
                        Places
                      </span>
                    )}
                  </div>
                </div>
                <div className="td-overview-map-wrap">
                  <MapContainer
                    key={`td-overview-${tdAllPins.length}`}
                    center={SL_CENTER}
                    zoom={8}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                    zoomControl={true}
                    dragging={true}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    <TdMapFitBounds points={tdAllPins} resetSignal={mapResetSignal} />
                    <TdResetOnMapClick points={tdAllPins} />
                    {tdAllPins.map(pin => (
                      <Marker key={pin.key} position={[pin.lat, pin.lng]} icon={pin.icon}>
                        <Popup>
                          <div className="td-omap-popup">
                            <strong className="td-omap-popup-name">{pin.label}</strong>
                            {pin.subtitle && <span className="td-omap-popup-sub">{pin.subtitle}</span>}
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </section>
            )}

          </div>{/* end td-col-right */}

        </div>{/* end td-layout */}

        {/* ── CTA Bar ── */}
        <div className="td-cta-bar">
          <button className="td-back-btn" onClick={() => navigate('/trip-budget')}>← Back</button>

          <div className="td-summary">
            {destination && <span className="td-summary-chip">📍 {destination.name}</span>}
            {tripDaysCount > 0 && <span className="td-summary-chip">🗓️ {tripDaysCount} {tripDaysCount === 1 ? 'day' : 'days'}</span>}
            {budget?.totalBudget > 0 && <span className="td-summary-chip">💰 {budSym}{budTotal.toLocaleString()}</span>}
          </div>

          <button className="td-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? (
              <><span className="td-spinner" /> {isEditing ? 'Updating…' : 'Saving…'}</>
            ) : (
              <>
                {isEditing ? 'Update Trip' : 'Save Trip'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
