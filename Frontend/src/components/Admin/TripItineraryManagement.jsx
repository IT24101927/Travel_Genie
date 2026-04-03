import { useState, useEffect, useMemo, useCallback } from 'react'
import './TripItineraryManagement.css'
import { API_BASE } from '../../config/api'
import { validateTitle, validatePositiveNumber, validateTripDate, validateDateRange } from '../../utils/validation'

const API = API_BASE
const authH = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

const STATUS_OPTIONS = ['draft', 'planned', 'ongoing', 'completed', 'cancelled']
const TRIP_TYPES = ['solo', 'couple', 'family', 'group']
const HOTEL_TYPES = ['any', 'budget', 'midrange', 'luxury', 'boutique', 'villa']
const DISPLAY_CURRENCIES = [
  { code: 'LKR', symbol: 'Rs', rate: 1, flag: '🇱🇰' },
  { code: 'USD', symbol: '$', rate: 0.0033, flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', rate: 0.0031, flag: '🇪🇺' },
]
const QUICK_TOTALS_LKR = [25000, 50000, 100000, 150000, 200000, 300000]
const QUICK_TOTALS_USD = [100, 250, 500, 1000, 2000, 5000]
const QUICK_TOTALS_EUR = [100, 250, 500, 1000, 2000, 5000]

const toAbsoluteAssetUrl = (value) => {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  const normalizedBase = API.replace(/\/api\/?$/, '')
  const normalizedPath = value.startsWith('/') ? value : `/${value}`
  return `${normalizedBase}${normalizedPath}`
}

const safeArray = (v) => (Array.isArray(v) ? v : [])
const safeObject = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

const formatDate = (value) => {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString()
}

const toIsoDate = (value) => {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

const getNumDays = (start, end) => {
  if (!start || !end) return 1
  const s = new Date(start)
  const e = new Date(end)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 1
  const diff = Math.round((e - s) / 86400000)
  return Math.max(1, diff)
}

const addDays = (start, days) => {
  if (!start) return ''
  const s = new Date(start)
  if (Number.isNaN(s.getTime())) return ''
  const safeDays = Math.max(1, Number(days) || 1)
  s.setDate(s.getDate() + safeDays)
  return toIsoDate(s)
}

const mapTrip = (t) => {
  const ownerMatches = t.user && Number(t.user.id) === Number(t.user_id)
  const districtName = t.district?.name || `District #${t.district_id}`
  const provinceName = t.district?.province || ''
  const prefs = safeObject(t.preferences)
  const selectedPlaces = safeArray(t.selected_places)
  const selectedHotels = safeArray(t.selected_hotels)
  const currency = t.budget_currency || 'LKR'
  const totalBudget = Number(t.total_budget || 0)
  const hotelBudget = Number(t.hotel_budget || 0)

  return {
    id: t.trip_id || t.id,
    raw: t,
    tripName: t.title || 'Untitled Trip',
    districtLabel: provinceName ? `${districtName}, ${provinceName}` : districtName,
    district_id: t.district_id,
    ownerId: t.user_id,
    ownerName: ownerMatches ? (t.user?.name || `User #${t.user_id}`) : `User #${t.user_id}`,
    ownerEmail: ownerMatches ? (t.user?.email || '') : '',
    ownerAvatar: ownerMatches ? toAbsoluteAssetUrl(t.user?.avatar) : '',
    startDate: t.start_date,
    endDate: t.end_date,
    duration: Number(t.num_days) > 0
      ? Number(t.num_days)
      : (t.start_date && t.end_date ? Math.round(Math.abs(new Date(t.end_date) - new Date(t.start_date)) / 86400000) : 0),
    participants: Number(t.num_people || 1),
    status: t.status || 'draft',
    notes: t.notes || '',
    totalBudget,
    hotelBudget,
    currency,
    selectedPlaces,
    selectedHotels,
    preferences: prefs,
    updatedAt: t.updatedAt,
    createdAt: t.createdAt,
    tripType: prefs.tripType || '-',
    peoplePref: Number(prefs.people || t.num_people || 1),
    hotelTypePref: prefs.hotelType || 'any',
  }
}

const itemName = (item) => item?.name || item?.place_name || item?.title || 'Unnamed'
const currencyRate = (code) => DISPLAY_CURRENCIES.find((c) => c.code === code)?.rate ?? 1
const currencySymbol = (code) => DISPLAY_CURRENCIES.find((c) => c.code === code)?.symbol ?? code
const convertFromLKR = (amount, toCode) => Math.round((Number(amount || 0)) * (currencyRate(toCode) || 1))
const convertAmount = (amount, fromCode, toCode) => {
  const n = Number(amount || 0)
  const from = currencyRate(fromCode || 'LKR')
  const to = currencyRate(toCode || 'LKR')
  return Math.round((n / from) * to * 100) / 100
}
const formatMoney = (amount, code) => `${currencySymbol(code)} ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const PLACE_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=300&q=80&auto=format'
const HOTEL_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300&q=80&auto=format'
const hotelPriceInfo = (hotel) => {
  const min = Number(
    hotel?.priceRange?.min
    ?? hotel?.price_per_night
    ?? hotel?.hotel_price_min
    ?? 0
  )
  const currency = hotel?.priceRange?.currency || hotel?.hotel_price_currency || 'LKR'
  return { min, currency }
}
const getQuickTotals = (code) => {
  if (code === 'LKR') return QUICK_TOTALS_LKR
  if (code === 'USD') return QUICK_TOTALS_USD
  if (code === 'EUR') return QUICK_TOTALS_EUR
  return QUICK_TOTALS_LKR
}
const placeKeyOf = (place) => String(place?.place_id || place?.id || place?.dbId || '')
const hotelKeyOf = (hotel) => String(hotel?.hotel_id || hotel?.place_id || hotel?._id || hotel?.id || '')
const placeImageOf = (place) => (
  toAbsoluteAssetUrl(place?.image || place?.image_url || place?.images?.[0]?.image_url || '') || PLACE_FALLBACK_IMAGE
)
const hotelImageOf = (hotel) => (
  toAbsoluteAssetUrl(hotel?.image_url || hotel?.place?.image_url || hotel?.images?.[0]?.image_url || hotel?.images?.[0]?.url || '') || HOTEL_FALLBACK_IMAGE
)
const mapPlaceForSelection = (place) => ({
  id: String(place?.place_id || place?.id || ''),
  place_id: place?.place_id || Number(place?.id) || null,
  name: place?.name || place?.title || 'Unnamed',
  type: place?.type || '',
  duration: place?.duration || '',
  description: place?.description || '',
  image: place?.image_url || place?.images?.[0]?.image_url || place?.image || '',
})
const mapHotelForSelection = (hotel) => ({
  hotel_id: hotel?.hotel_id || null,
  place_id: hotel?.place_id || hotel?.place?.place_id || null,
  _id: String(hotel?.hotel_id || hotel?.place_id || hotel?.place?.place_id || ''),
  name: hotel?.place?.name || hotel?.name || 'Unnamed',
  category: hotel?.hotel_type || hotel?.category || 'hotel',
  starRating: Number(hotel?.star_class || hotel?.starRating || 0),
  price_per_night: Number(hotel?.price_per_night || 0),
  hotel_price_min: Number(hotel?.price_per_night || hotel?.hotel_price_min || 0),
  hotel_price_currency: hotel?.hotel_price_currency || 'LKR',
  nights: Math.max(1, Number(hotel?.nights || hotel?.hotelNights || 1)),
  priceRange: {
    min: Number(hotel?.price_per_night || hotel?.hotel_price_min || 0),
    max: null,
    currency: hotel?.hotel_price_currency || 'LKR',
  },
})

function TripItineraryManagement() {
  const [trips, setTrips] = useState([])
  const [districts, setDistricts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('updatedAt')
  const [displayCurrency, setDisplayCurrency] = useState(() => localStorage.getItem('adminTripDisplayCurrency') || 'LKR')

  const [viewTrip, setViewTrip] = useState(null)
  const [editTrip, setEditTrip] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editSelectedPlaces, setEditSelectedPlaces] = useState([])
  const [editSelectedHotels, setEditSelectedHotels] = useState([])
  const [placeOptions, setPlaceOptions] = useState([])
  const [hotelOptions, setHotelOptions] = useState([])
  const [editLoadingOptions, setEditLoadingOptions] = useState(false)
  const [editOptionsError, setEditOptionsError] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    district_id: '',
    start_date: '',
    end_date: '',
    num_days: 1,
    num_people: 1,
    total_budget: 0,
    hotel_budget: 0,
    budget_currency: 'LKR',
    status: 'draft',
    trip_type: 'solo',
    hotel_type: 'any',
    notes: '',
  })

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [tripsRes, districtsRes] = await Promise.all([
        fetch(`${API}/trips/all?limit=500`, { headers: authH() }),
        fetch(`${API}/districts`, { headers: authH() }),
      ])

      const tripsData = await tripsRes.json()
      const districtsData = await districtsRes.json()

      if (!tripsRes.ok) throw new Error(tripsData.message || 'Failed to load trips')
      if (!districtsRes.ok) throw new Error(districtsData.message || 'Failed to load districts')

      setTrips(safeArray(tripsData.data).map(mapTrip))
      setDistricts(safeArray(districtsData.data || districtsData))
    } catch (err) {
      setError(err.message || 'Failed to load admin trip data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])
  useEffect(() => {
    localStorage.setItem('adminTripDisplayCurrency', displayCurrency)
  }, [displayCurrency])

  const filteredTrips = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const result = trips
      .filter((trip) => {
        const matchesSearch = !q
          || trip.tripName.toLowerCase().includes(q)
          || trip.districtLabel.toLowerCase().includes(q)
          || trip.ownerName.toLowerCase().includes(q)
          || trip.ownerEmail.toLowerCase().includes(q)
        const matchesStatus = filterStatus === 'all' || trip.status === filterStatus
        return matchesSearch && matchesStatus
      })

    result.sort((a, b) => {
      if (sortBy === 'tripName') return a.tripName.localeCompare(b.tripName)
      if (sortBy === 'budget') return b.totalBudget - a.totalBudget
      if (sortBy === 'participants') return b.participants - a.participants
      if (sortBy === 'startDate') return new Date(a.startDate) - new Date(b.startDate)
      return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
    })

    return result
  }, [trips, searchQuery, filterStatus, sortBy])

  const stats = useMemo(() => {
    const activeTrips = trips.filter((t) => t.status === 'planned' || t.status === 'ongoing').length
    const totalBudgetLkr = trips
      .filter((t) => t.currency === 'LKR')
      .reduce((sum, t) => sum + t.totalBudget, 0)
    const totalSelectedPlaces = trips.reduce((sum, t) => sum + t.selectedPlaces.length, 0)
    const totalSelectedHotels = trips.reduce((sum, t) => sum + t.selectedHotels.length, 0)
    return { activeTrips, totalBudgetLkr, totalSelectedPlaces, totalSelectedHotels }
  }, [trips])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this trip? This cannot be undone.')) return
    try {
      const res = await fetch(`${API}/trips/${id}`, { method: 'DELETE', headers: authH() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Failed to delete trip')
      setTrips((prev) => prev.filter((t) => t.id !== id))
      showToast('Trip deleted', 'delete')
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error')
    }
  }

  const openEdit = (trip) => {
    const start = trip.startDate ? String(trip.startDate).slice(0, 10) : ''
    const end = trip.endDate ? String(trip.endDate).slice(0, 10) : ''
    const days = trip.duration || getNumDays(start, end)
    setEditTrip(trip)
    setEditSelectedPlaces(safeArray(trip.selectedPlaces || []))
    setEditSelectedHotels(safeArray(trip.selectedHotels || []))
    setFormData({
      title: trip.tripName,
      district_id: String(trip.district_id || ''),
      start_date: start,
      end_date: end,
      num_days: days,
      num_people: trip.participants,
      total_budget: trip.totalBudget,
      hotel_budget: trip.hotelBudget,
      budget_currency: trip.currency || 'LKR',
      status: trip.status,
      trip_type: trip.tripType && trip.tripType !== '-' ? trip.tripType : 'solo',
      hotel_type: trip.hotelTypePref || 'any',
      notes: trip.notes || '',
    })
    if (trip.district_id) {
      loadEditOptions(trip.district_id)
    } else {
      setPlaceOptions([])
      setHotelOptions([])
    }
  }

  const loadEditOptions = async (districtId, resetSelections = false) => {
    if (!districtId) {
      setPlaceOptions([])
      setHotelOptions([])
      if (resetSelections) {
        setEditSelectedPlaces([])
        setEditSelectedHotels([])
      }
      return
    }

    setEditLoadingOptions(true)
    setEditOptionsError('')
    try {
      const [placesRes, hotelsRes] = await Promise.all([
        fetch(`${API}/destinations/district/${districtId}`, { headers: authH() }),
        fetch(`${API}/hotels/district/${districtId}`, { headers: authH() }),
      ])

      const placesData = await placesRes.json().catch(() => ({}))
      const hotelsData = await hotelsRes.json().catch(() => ({}))

      if (!placesRes.ok) throw new Error(placesData.message || 'Failed to load places for district')
      if (!hotelsRes.ok) throw new Error(hotelsData.message || 'Failed to load hotels for district')

      const loadedPlaces = safeArray(placesData.data)
      const loadedHotels = safeArray(hotelsData.data)

      setPlaceOptions(loadedPlaces)
      setHotelOptions(loadedHotels)

      if (resetSelections) {
        setEditSelectedPlaces([])
        setEditSelectedHotels([])
      }
    } catch (err) {
      setEditOptionsError(err.message || 'Failed to load place/hotel options')
      setPlaceOptions([])
      setHotelOptions([])
      if (resetSelections) {
        setEditSelectedPlaces([])
        setEditSelectedHotels([])
      }
    } finally {
      setEditLoadingOptions(false)
    }
  }

  const handleDistrictChange = (districtId) => {
    setFormData((f) => ({ ...f, district_id: districtId }))
    loadEditOptions(districtId, true)
  }

  const toggleEditPlace = (place) => {
    const mapped = mapPlaceForSelection(place)
    const key = placeKeyOf(mapped)
    if (!key) return
    setEditSelectedPlaces((prev) => {
      const exists = prev.some((p) => placeKeyOf(p) === key)
      return exists ? prev.filter((p) => placeKeyOf(p) !== key) : [...prev, mapped]
    })
  }

  const toggleEditHotel = (hotel) => {
    const mapped = mapHotelForSelection(hotel)
    const key = hotelKeyOf(mapped)
    if (!key) return
    setEditSelectedHotels((prev) => {
      const exists = prev.some((h) => hotelKeyOf(h) === key)
      return exists ? prev.filter((h) => hotelKeyOf(h) !== key) : [...prev, mapped]
    })
  }

  const changeSelectedHotelNights = (hotel, delta) => {
    const key = hotelKeyOf(hotel)
    if (!key) return
    setEditSelectedHotels((prev) => prev.map((h) => {
      if (hotelKeyOf(h) !== key) return h
      const nextNights = Math.max(1, Number(h.nights || 1) + delta)
      return { ...h, nights: nextNights }
    }))
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editTrip) return

    // --- Validations ---
    const titleCheck = validateTitle(formData.title, 'Trip title')
    if (!titleCheck.valid) { showToast(titleCheck.message, 'error'); return }
    if (!formData.district_id) { showToast('Please select a district.', 'error'); return }
    if (!formData.start_date) { showToast('Start date is required.', 'error'); return }
    const startDateCheck = validateTripDate(formData.start_date, 5)
    if (!startDateCheck.valid) { showToast(startDateCheck.message, 'error'); return }
    if (formData.end_date) {
      const rangeCheck = validateDateRange(formData.start_date, formData.end_date)
      if (!rangeCheck.valid) { showToast(rangeCheck.message, 'error'); return }
    }
    const budgetCheck = validatePositiveNumber(formData.total_budget, 'Total budget')
    if (!budgetCheck.valid) { showToast(budgetCheck.message, 'error'); return }
    // --- End Validations ---

    const parsedPreferences = safeObject(editTrip.preferences || {})
    const parsedPlaces = safeArray(editSelectedPlaces)
    const parsedHotels = safeArray(editSelectedHotels)

    setSaving(true)
    try {
      const safeDays = Math.max(1, Number(formData.num_days) || 1)
      const computedEndDate = formData.start_date ? addDays(formData.start_date, safeDays) : formData.end_date
      const payload = {
        title: formData.title,
        district_id: Number(formData.district_id),
        start_date: formData.start_date,
        end_date: computedEndDate,
        num_days: safeDays,
        num_people: Number(formData.num_people) || 1,
        total_budget: Number(formData.total_budget) || 0,
        hotel_budget: Number(formData.hotel_budget) || 0,
        budget_currency: formData.budget_currency || 'LKR',
        status: formData.status || 'draft',
        notes: formData.notes || null,
        preferences: {
          ...parsedPreferences,
          days: safeDays,
          people: Number(formData.num_people) || 1,
          tripType: formData.trip_type || 'solo',
          hotelType: formData.hotel_type || 'any',
        },
        selected_places: parsedPlaces,
        selected_hotels: parsedHotels,
      }

      const res = await fetch(`${API}/trips/${editTrip.id}`, {
        method: 'PUT',
        headers: authH(),
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Failed to update trip')

      showToast('Trip updated successfully')
      setEditTrip(null)
      await loadAll()
    } catch (err) {
      showToast(err.message || 'Update failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleStartDateChange = (value) => {
    setFormData((f) => ({
      ...f,
      start_date: value,
      end_date: value ? addDays(value, f.num_days) : f.end_date,
    }))
  }

  const handleDaysChange = (value) => {
    setFormData((f) => {
      const safeDays = Math.max(1, Number(value) || 1)
      return {
        ...f,
        num_days: safeDays,
        end_date: f.start_date ? addDays(f.start_date, safeDays) : f.end_date,
      }
    })
  }

  const handleEndDateChange = (value) => {
    setFormData((f) => ({
      ...f,
      end_date: value,
      num_days: getNumDays(f.start_date, value),
    }))
  }

  const selectedHotelsBudgetLkr = useMemo(() => (
    editSelectedHotels.reduce((sum, hotel) => {
      const price = hotelPriceInfo(hotel)
      const nights = Math.max(1, Number(hotel?.nights || 1))
      return sum + convertAmount(price.min * nights, price.currency || 'LKR', 'LKR')
    }, 0)
  ), [editSelectedHotels])

  const applySelectedHotelBudget = () => {
    setFormData((f) => ({
      ...f,
      hotel_budget: convertFromLKR(selectedHotelsBudgetLkr, f.budget_currency || 'LKR'),
    }))
  }

  const quickTotalOptions = useMemo(
    () => getQuickTotals(formData.budget_currency || 'LKR'),
    [formData.budget_currency]
  )

  return (
    <div className="trip-management">
      {toast && <div className={`admin-toast ${toast.type}`}>{toast.msg}</div>}

      {error && (
        <div className="admin-error-banner">
          {error}
          <button onClick={loadAll}>Retry</button>
        </div>
      )}

      <div className="tm-header">
        <div>
          <h1 className="tm-title">Trip Itinerary Management</h1>
          <p className="tm-subtitle">Admin control for full trip details, selected places/hotels, and traveler preferences</p>
        </div>
        <div className="tm-currency-pills" role="group" aria-label="Display currency">
          {DISPLAY_CURRENCIES.map((c) => (
            <button
              key={c.code}
              type="button"
              className={`tm-currency-pill${displayCurrency === c.code ? ' active' : ''}`}
              onClick={() => setDisplayCurrency(c.code)}
            >
              <span>{c.flag}</span>
              <span>{c.code}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="tm-stats">
        <div className="tm-stat-card">
          <span className="stat-icon">🧳</span>
          <div>
            <p className="stat-value">{loading ? '…' : trips.length}</p>
            <p className="stat-label">Total Trips</p>
          </div>
        </div>
        <div className="tm-stat-card">
          <span className="stat-icon">🚀</span>
          <div>
            <p className="stat-value">{loading ? '…' : stats.activeTrips}</p>
            <p className="stat-label">Active Trips</p>
          </div>
        </div>
        <div className="tm-stat-card">
          <span className="stat-icon">📍</span>
          <div>
            <p className="stat-value">{loading ? '…' : stats.totalSelectedPlaces}</p>
            <p className="stat-label">Selected Places</p>
          </div>
        </div>
        <div className="tm-stat-card">
          <span className="stat-icon">🏨</span>
          <div>
            <p className="stat-value">{loading ? '…' : stats.totalSelectedHotels}</p>
            <p className="stat-label">Selected Hotels</p>
          </div>
        </div>
      </div>

      <div className="tm-filters">
        <div className="filter-group">
          <label>Search</label>
          <input
            type="text"
            className="filter-input"
            placeholder="Trip name, district, owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Status</label>
          <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label>Sort</label>
          <select className="filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="updatedAt">Recently Updated</option>
            <option value="startDate">Start Date</option>
            <option value="tripName">Trip Name</option>
            <option value="budget">Budget</option>
            <option value="participants">Travelers</option>
          </select>
        </div>
      </div>

      <div className="trips-table-container">
        {loading ? (
          <div className="admin-loading"><div className="admin-spinner" /><p>Loading trips...</p></div>
        ) : filteredTrips.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🧳</span>
            <h3>No trips found</h3>
            <p>Try a different search or filter.</p>
          </div>
        ) : (
          <table className="trips-table">
            <thead>
              <tr>
                <th>Trip</th>
                <th>Owner</th>
                <th>District</th>
                <th>Dates</th>
                <th>Budget</th>
                <th>Selections</th>
                <th>Preferences</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.map((trip) => (
                <tr key={trip.id}>
                  <td className="td-trip-name">
                    <strong>{trip.tripName}</strong>
                    <span className="trip-meta">{trip.duration || '-'} days · {trip.participants} travelers</span>
                  </td>
                  <td>
                    <div className="trip-user-cell">
                      {trip.ownerAvatar ? (
                        <img src={trip.ownerAvatar} alt={trip.ownerName} className="trip-user-avatar" />
                      ) : (
                        <div className="trip-user-avatar trip-user-avatar-fallback">{trip.ownerName.charAt(0).toUpperCase()}</div>
                      )}
                      <div>
                        <div className="trip-user-name">{trip.ownerName}</div>
                        <div className="trip-user-sub">{trip.ownerEmail || `ID: ${trip.ownerId}`}</div>
                      </div>
                    </div>
                  </td>
                  <td>{trip.districtLabel}</td>
                  <td>
                    <div>{formatDate(trip.startDate)}</div>
                    <div className="trip-user-sub">to {formatDate(trip.endDate)}</div>
                  </td>
                  <td>
                    <span className="budget-badge">{formatMoney(convertAmount(trip.totalBudget, trip.currency, displayCurrency), displayCurrency)}</span>
                    <div className="trip-user-sub">Hotel: {formatMoney(convertAmount(trip.hotelBudget, trip.currency, displayCurrency), displayCurrency)}</div>
                  </td>
                  <td>
                    <div className="summary-tags">
                      <span className="summary-tag">Places {trip.selectedPlaces.length}</span>
                      <span className="summary-tag">Hotels {trip.selectedHotels.length}</span>
                    </div>
                  </td>
                  <td>
                    <div className="trip-user-sub">Type: {trip.tripType}</div>
                    <div className="trip-user-sub">Hotel: {trip.hotelTypePref}</div>
                  </td>
                  <td>
                    <span className={`status-badge-trip status-${trip.status}`}>{trip.status}</span>
                  </td>
                  <td className="td-actions">
                    <div className="action-buttons">
                      <button className="btn-schedule" title="View Details" onClick={() => setViewTrip(trip)}>👁️</button>
                      <button className="btn-table-edit" title="Edit" onClick={() => openEdit(trip)}>✏️</button>
                      <button className="btn-table-delete" title="Delete" onClick={() => handleDelete(trip.id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {viewTrip && (
        <div className="modal-overlay" onClick={() => setViewTrip(null)}>
          <div className="modal-content modal-xlarge" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Trip Details · {viewTrip.tripName}</h2>
              <button className="modal-close" onClick={() => setViewTrip(null)}>✕</button>
            </div>

            <div className="trip-form">
              <div className="form-section">
                <h3 className="section-title">Overview</h3>
                <div className="tm-detail-grid">
                  <div className="tm-detail-card">
                    <span className="tm-detail-label">Owner</span>
                    <strong className="tm-detail-value">{viewTrip.ownerName}</strong>
                    <span className="tm-detail-sub">{viewTrip.ownerEmail || `ID: ${viewTrip.ownerId}`}</span>
                  </div>
                  <div className="tm-detail-card">
                    <span className="tm-detail-label">District</span>
                    <strong className="tm-detail-value">{viewTrip.districtLabel}</strong>
                  </div>
                  <div className="tm-detail-card">
                    <span className="tm-detail-label">Dates</span>
                    <strong className="tm-detail-value">{formatDate(viewTrip.startDate)} to {formatDate(viewTrip.endDate)}</strong>
                    <span className="tm-detail-sub">{viewTrip.duration} days · {viewTrip.participants} travelers</span>
                  </div>
                  <div className="tm-detail-card">
                    <span className="tm-detail-label">Status</span>
                    <span className={`status-badge-trip status-${viewTrip.status}`}>{viewTrip.status}</span>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title">Budgets</h3>
                <div className="tm-detail-grid">
                  <div className="tm-detail-card">
                    <span className="tm-detail-label">Total Budget</span>
                    <strong className="tm-detail-value">{formatMoney(convertAmount(viewTrip.totalBudget, viewTrip.currency, displayCurrency), displayCurrency)}</strong>
                    <span className="tm-detail-sub">Base: {formatMoney(viewTrip.totalBudget, viewTrip.currency)}</span>
                  </div>
                  <div className="tm-detail-card">
                    <span className="tm-detail-label">Hotel Budget</span>
                    <strong className="tm-detail-value">{formatMoney(convertAmount(viewTrip.hotelBudget, viewTrip.currency, displayCurrency), displayCurrency)}</strong>
                    <span className="tm-detail-sub">Base: {formatMoney(viewTrip.hotelBudget, viewTrip.currency)}</span>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title">Preferences</h3>
                <div className="summary-tags">
                  <span className="summary-tag">Type: {viewTrip.tripType || 'solo'}</span>
                  <span className="summary-tag">People: {viewTrip.peoplePref || viewTrip.participants}</span>
                  <span className="summary-tag">Hotel: {viewTrip.hotelTypePref || 'any'}</span>
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title">Selected Places</h3>
                {viewTrip.selectedPlaces.length ? (
                  <div className="summary-tags">
                    {viewTrip.selectedPlaces.map((p, i) => (
                      <span className="summary-tag" key={`${itemName(p)}-${i}`}>{itemName(p)}</span>
                    ))}
                  </div>
                ) : (
                  <p className="trip-user-sub">No places selected.</p>
                )}
              </div>

              <div className="form-section">
                <h3 className="section-title">Selected Hotels</h3>
                {viewTrip.selectedHotels.length ? (
                  <div className="summary-tags">
                    {viewTrip.selectedHotels.map((h, i) => {
                      const price = hotelPriceInfo(h)
                      const nights = Math.max(1, Number(h.nights || 1))
                      return (
                        <span className="summary-tag" key={`${itemName(h)}-${i}`}>
                          {itemName(h)}
                          {` · ${nights} night${nights !== 1 ? 's' : ''}`}
                          {price.min > 0 ? ` · ${formatMoney(convertAmount(price.min * nights, price.currency, displayCurrency), displayCurrency)} total` : ''}
                        </span>
                      )
                    })}
                  </div>
                ) : (
                  <p className="trip-user-sub">No hotels selected.</p>
                )}
              </div>

              {viewTrip.notes && (
                <div className="form-section">
                  <h3 className="section-title">Notes</h3>
                  <p className="tm-notes">{viewTrip.notes}</p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setViewTrip(null)}>Close</button>
              <button type="button" className="btn-submit" onClick={() => { setViewTrip(null); openEdit(viewTrip) }}>Edit This Trip</button>
            </div>
          </div>
        </div>
      )}

      {editTrip && (
        <div className="modal-overlay" onClick={() => setEditTrip(null)}>
          <div className="modal-content modal-xlarge" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Trip · {editTrip.tripName}</h2>
              <button className="modal-close" onClick={() => setEditTrip(null)}>✕</button>
            </div>

            <form className="trip-form" onSubmit={handleSaveEdit}>
              <div className="form-section">
                <h3 className="section-title">Core Details</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Title</label>
                    <input value={formData.title} onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>District</label>
                    <select value={formData.district_id} onChange={(e) => handleDistrictChange(e.target.value)} required>
                      <option value="">Select district</option>
                      {districts.map((d) => (
                        <option key={d.district_id} value={d.district_id}>{d.name}{d.province ? ` (${d.province})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input type="date" value={formData.start_date} onChange={(e) => handleStartDateChange(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Duration (Days)</label>
                    <input type="number" min="1" value={formData.num_days} onChange={(e) => handleDaysChange(e.target.value)} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>End Date</label>
                    <input type="date" value={formData.end_date} onChange={(e) => handleEndDateChange(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Travelers</label>
                    <input type="number" min="1" value={formData.num_people} onChange={(e) => setFormData((f) => ({ ...f, num_people: e.target.value }))} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select value={formData.status} onChange={(e) => setFormData((f) => ({ ...f, status: e.target.value }))}>
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Trip Type</label>
                    <select value={formData.trip_type} onChange={(e) => setFormData((f) => ({ ...f, trip_type: e.target.value }))}>
                      {TRIP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Hotel Type</label>
                    <select value={formData.hotel_type} onChange={(e) => setFormData((f) => ({ ...f, hotel_type: e.target.value }))}>
                      {HOTEL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Summary</label>
                    <input
                      disabled
                      value={`${Math.max(1, Number(formData.num_days) || 1)} days · ${Math.max(1, Number(formData.num_people) || 1)} travelers`}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title">Selected Places</h3>
                {editOptionsError && <p className="trip-user-sub">{editOptionsError}</p>}
                {editLoadingOptions ? (
                  <p className="trip-user-sub">Loading places...</p>
                ) : placeOptions.length ? (
                  <div className="tm-select-grid">
                    {placeOptions.map((place) => {
                      const key = placeKeyOf(place)
                      const checked = editSelectedPlaces.some((p) => placeKeyOf(p) === key)
                      const placeImg = placeImageOf(place)
                      return (
                        <div key={key} className={`tm-select-card ${checked ? 'active' : ''}`}>
                          <img src={placeImg} alt={place.name} className="tm-select-thumb" onError={(e) => { e.currentTarget.src = PLACE_FALLBACK_IMAGE }} />
                          <div className="tm-select-body">
                            <strong>{place.name}</strong>
                            <span>{place.type || 'Place'}</span>
                          </div>
                          <button type="button" className={`tm-select-btn ${checked ? 'selected' : ''}`} onClick={() => toggleEditPlace(place)}>
                            {checked ? 'Selected' : 'Select'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="trip-user-sub">No places available for this district.</p>
                )}

                {editSelectedPlaces.length > 0 && (
                  <div className="summary-tags">
                    {editSelectedPlaces.map((place, idx) => (
                      <span key={`${placeKeyOf(place)}-${idx}`} className="summary-tag">{itemName(place)}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-section">
                <div className="tm-section-head">
                  <h3 className="section-title">Selected Hotels</h3>
                  <div className="tm-currency-pills">
                    {DISPLAY_CURRENCIES.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        className={`tm-currency-pill${formData.budget_currency === c.code ? ' active' : ''}`}
                        onClick={() => setFormData((f) => ({ ...f, budget_currency: c.code }))}
                      >
                        {c.code}
                      </button>
                    ))}
                  </div>
                </div>
                {editLoadingOptions ? (
                  <p className="trip-user-sub">Loading hotels...</p>
                ) : hotelOptions.length ? (
                  <div className="tm-select-grid">
                    {hotelOptions.map((hotel) => {
                      const key = hotelKeyOf(hotel)
                      const checked = editSelectedHotels.some((h) => hotelKeyOf(h) === key)
                      const price = Number(hotel.price_per_night || 0)
                      const hotelImg = hotelImageOf(hotel)
                      return (
                        <div key={key} className={`tm-select-card ${checked ? 'active' : ''}`}>
                          <img src={hotelImg} alt={hotel.place?.name || hotel.name} className="tm-select-thumb" onError={(e) => { e.currentTarget.src = HOTEL_FALLBACK_IMAGE }} />
                          <div className="tm-select-body">
                            <strong>{hotel.place?.name || hotel.name}</strong>
                            <span>{price > 0 ? `${formatMoney(convertFromLKR(price, formData.budget_currency || 'LKR'), formData.budget_currency || 'LKR')} / night` : 'Price unavailable'}</span>
                          </div>
                          <button type="button" className={`tm-select-btn ${checked ? 'selected' : ''}`} onClick={() => toggleEditHotel(hotel)}>
                            {checked ? 'Selected' : 'Select'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="trip-user-sub">No hotels available for this district.</p>
                )}

                {editSelectedHotels.length > 0 && (
                  <div className="tm-hotel-nights-list">
                    {editSelectedHotels.map((hotel, idx) => {
                      const perNightLkr = convertAmount(hotelPriceInfo(hotel).min, hotelPriceInfo(hotel).currency, 'LKR')
                      const totalLkr = perNightLkr * Math.max(1, Number(hotel.nights || 1))
                      return (
                        <div key={`${hotelKeyOf(hotel)}-${idx}`} className="tm-hotel-nights-item">
                          <span className="tm-hotel-nights-name">{itemName(hotel)}</span>
                          <span className="tm-hotel-nights-price">{formatMoney(convertFromLKR(totalLkr, formData.budget_currency || 'LKR'), formData.budget_currency || 'LKR')}</span>
                          <div className="tm-hotel-nights-controls">
                            <button type="button" onClick={() => changeSelectedHotelNights(hotel, -1)}>-</button>
                            <span>{Math.max(1, Number(hotel.nights || 1))} night{Math.max(1, Number(hotel.nights || 1)) === 1 ? '' : 's'}</span>
                            <button type="button" onClick={() => changeSelectedHotelNights(hotel, 1)}>+</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="form-section">
                <h3 className="section-title">Budget</h3>

                <div className="form-row">
                  <div className="form-group">
                    <label>Budget Currency</label>
                    <div className="tm-currency-pills">
                      {DISPLAY_CURRENCIES.map((c) => (
                        <button
                          key={`budget-${c.code}`}
                          type="button"
                          className={`tm-currency-pill${formData.budget_currency === c.code ? ' active' : ''}`}
                          onClick={() => setFormData((f) => ({ ...f, budget_currency: c.code }))}
                        >
                          {c.code}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group" />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Hotel Budget</label>
                    <input type="number" min="0" step="0.01" value={formData.hotel_budget} onChange={(e) => setFormData((f) => ({ ...f, hotel_budget: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Total Budget</label>
                    <input type="number" min="0" step="0.01" value={formData.total_budget} onChange={(e) => setFormData((f) => ({ ...f, total_budget: e.target.value }))} />
                    <div className="tm-quick-budget-row">
                      {quickTotalOptions.map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          className={`tm-quick-budget-btn${Number(formData.total_budget) === Number(amount) ? ' active' : ''}`}
                          onClick={() => setFormData((f) => ({ ...f, total_budget: amount }))}
                        >
                          {formatMoney(amount, formData.budget_currency || 'LKR')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Selected Hotels Estimate</label>
                    <input disabled value={formatMoney(convertFromLKR(selectedHotelsBudgetLkr, formData.budget_currency || 'LKR'), formData.budget_currency || 'LKR')} />
                  </div>
                  <div className="form-group">
                    <label>Auto Fill Budget</label>
                    <button type="button" className="tm-select-price-btn" onClick={applySelectedHotelBudget}>
                      Use Selected Hotel Prices
                    </button>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Notes</label>
                    <input value={formData.notes} onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
                  </div>
                  <div className="form-group" />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setEditTrip(null)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default TripItineraryManagement
