import { useState, useEffect, useRef } from 'react'
import { clearUserData } from '../../utils/clearUserData'
import { API_BASE } from '../../config/api'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ReviewSection from './ReviewSection'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './HotelPicker.css'

const SL_CENTER = [7.8731, 80.7718]

function createHpPin(emoji, bg, size = 32) {
  return L.divIcon({
    html: `<div style="background:${bg};width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2.5px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:${Math.round(size*0.44)}px;line-height:1;">${emoji}</span></div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -(size + 4)],
  })
}

function HpMapFitBounds({ pins, allPins, focusPin }) {
  const map = useMap()
  useEffect(() => {
    const run = () => {
      map.invalidateSize()
      if (focusPin) {
        map.setView([focusPin.lat, focusPin.lng], 14, { animate: true })
        return
      }
      // fit to all hotel pins so map always shows full district view
      const valid = allPins.filter(p => p.lat && p.lng)
      if (!valid.length) return
      if (valid.length === 1) {
        map.setView([valid[0].lat, valid[0].lng], 12, { animate: true })
      } else {
        map.fitBounds(L.latLngBounds(valid.map(p => [p.lat, p.lng])), { padding: [50, 50], maxZoom: 13, animate: true })
      }
    }
    const t = setTimeout(run, 120)
    return () => clearTimeout(t)
  }, [pins, allPins, focusPin, map])
  return null
}
// Fit-bounds for the small modal map (hotel + places)
function NightsFitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    const run = () => {
      map.invalidateSize()
      const valid = points.filter(p => p.lat && p.lng)
      if (!valid.length) return
      if (valid.length === 1) {
        map.setView([valid[0].lat, valid[0].lng], 13, { animate: false })
      } else {
        map.fitBounds(L.latLngBounds(valid.map(p => [p.lat, p.lng])), { padding: [36, 36], maxZoom: 14, animate: false })
      }
    }
    const t = setTimeout(run, 180)
    return () => clearTimeout(t)
  }, [points, map])
  return null
}

function HpMapCapture({ mapRef }) {
  const map = useMap()
  useEffect(() => { mapRef.current = map }, [map, mapRef])
  return null
}
function HpResetOnMapClick({ pins }) {
  const map = useMap()
  useMapEvents({
    click() {
      const valid = pins.filter(p => p.lat && p.lng)
      if (!valid.length) return
      if (valid.length === 1) {
        map.setView([valid[0].lat, valid[0].lng], 12, { animate: true })
      } else {
        map.fitBounds(L.latLngBounds(valid.map(p => [p.lat, p.lng])), { padding: [50, 50], maxZoom: 13, animate: true })
      }
    }
  })
  return null
}

function tomorrowStr() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function addDaysLocal(dateStr, days) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + Number(days))
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function diffDaysLocal(startStr, endStr) {
  if (!startStr || !endStr) return 0
  const s = new Date(startStr + 'T00:00:00')
  const e = new Date(endStr + 'T00:00:00')
  return Math.max(0, Math.round((e - s) / 86400000))
}
function fmtDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${d} ${months[Number(m) - 1]} ${y}`
}

function mapHotelTypeToPreference(type, starRating = 0) {
  const normalized = String(type || '').toLowerCase().trim()

  if (normalized.includes('boutique')) return 'boutique'
  if (normalized.includes('villa')) return 'villa'

  if (
    normalized.includes('guesthouse') ||
    normalized.includes('guest house') ||
    normalized.includes('hostel') ||
    normalized.includes('motel')
  ) {
    return 'budget'
  }

  if (normalized.includes('resort')) return 'luxury'

  if (normalized.includes('apartment')) return 'midrange'

  if (normalized.includes('hotel')) {
    if (Number(starRating) >= 5) return 'luxury'
    if (Number(starRating) <= 2) return 'budget'
    return 'midrange'
  }

  return 'midrange'
}

/* Map raw DB hotel → shape expected by HotelCard */
const mapHotel = (h) => {
  const rawCategory = h.hotel_type || h.category || 'hotel'
  const starRating = h.star_class || h.starRating || 0
  const amenityList = parseAmenityList(h.amenities || h.amenities_list || h.amenity_names)

  return {
    _id:         String(h.hotel_id || h.place_id),
    name:        h.place?.name || h.hotel_name || h.name || '',
    category:    rawCategory,
    preferenceType: mapHotelTypeToPreference(rawCategory, starRating),
    starRating,
    priceRange:  { min: parseFloat(h.price_per_night) || 0, max: null, currency: 'LKR' },
    address:     { city: h.place?.district?.name || h.district_name || h.place?.address_text || '', country: 'Sri Lanka' },
    description: h.place?.description || h.place_description || h.description || '',
    amenities:   amenityList,
    images:      [
      ...(h.image_url ? [{ url: h.image_url }] : []),
      ...(h.place?.images || []).map(img => ({ url: img.image_url || img.url || '' })),
    ],
    rating:      h.rating       || 0,
    contact:     h.contact      || {},
    hotel_id:    h.hotel_id,
    place_id:    h.place_id,
    lat:         parseFloat(h.place?.lat) || parseFloat(h.hotel_proxy_lat) || parseFloat(h.lat) || parseFloat(h.nearbyPlace?.lat) || null,
    lng:         parseFloat(h.place?.lng) || parseFloat(h.hotel_proxy_lng) || parseFloat(h.lng) || parseFloat(h.nearbyPlace?.lng) || null,
  }
}

function mergeUniqueHotels(primary = [], secondary = []) {
  const seen = new Set()
  const merged = []
  ;[...primary, ...secondary].forEach((h) => {
    const key = String(h.hotel_id || h.place_id || h._id || '')
    if (!key || seen.has(key)) return
    seen.add(key)
    merged.push(h)
  })
  return merged
}

/* Canonical amenity map — lowercase_underscore keys matching DB / seed data */
const AMENITY_MAP = {
  wifi:             { emoji: '📶', label: 'WiFi' },
  pool:             { emoji: '🏊', label: 'Pool' },
  spa:              { emoji: '💆', label: 'Spa' },
  restaurant:       { emoji: '🍽️', label: 'Restaurant' },
  gym:              { emoji: '💪', label: 'Gym' },
  parking:          { emoji: '🅿️', label: 'Parking' },
  beach_access:     { emoji: '🏖️', label: 'Beach Access' },
  bar:              { emoji: '🍹', label: 'Bar' },
  kitchen:          { emoji: '🍳', label: 'Kitchen' },
  garden:           { emoji: '🌿', label: 'Garden' },
  airport_shuttle:  { emoji: '🚌', label: 'Airport Shuttle' },
  airport_transfer: { emoji: '✈️',  label: 'Airport Transfer' },
  laundry:          { emoji: '👕', label: 'Laundry' },
  room_service:     { emoji: '🛎️', label: 'Room Service' },
  pet_friendly:     { emoji: '🐾', label: 'Pet Friendly' },
  breakfast:        { emoji: '🥐', label: 'Breakfast' },
  rooftop:          { emoji: '🌇', label: 'Rooftop' },
  fireplace:        { emoji: '🔥', label: 'Fireplace' },
  butler:           { emoji: '🤵', label: 'Butler' },
  bicycle_rental:   { emoji: '🚲', label: 'Bicycle Rental' },
  cycling:          { emoji: '🚴', label: 'Cycling' },
  hiking:           { emoji: '🥾', label: 'Hiking' },
  water_sports:     { emoji: '🏄', label: 'Water Sports' },
  surfing:          { emoji: '🏄', label: 'Surfing' },
  snorkelling:      { emoji: '🤿', label: 'Snorkelling' },
  safari:           { emoji: '🐘', label: 'Safari' },
  bird_watching:    { emoji: '🦜', label: 'Bird Watching' },
  tea_tours:        { emoji: '🍵', label: 'Tea Tours' },
  cooking_class:    { emoji: '👨‍🍳', label: 'Cooking Class' },
  kids_club:        { emoji: '👶', label: 'Kids Club' },
  business_center:  { emoji: '💼', label: 'Business Center' },
  lake_view:        { emoji: '🏞️', label: 'Lake View' },
  river_view:       { emoji: '🌊', label: 'River View' },
  air_conditioning: { emoji: '❄️', label: 'Air Conditioning' },
  boat_tours:       { emoji: '⛵', label: 'Boat Tours' },
  concierge:        { emoji: '🛎️', label: 'Concierge' },
  guided_walks:     { emoji: '🚶', label: 'Guided Walks' },
  kayaking:         { emoji: '🛶', label: 'Kayaking' },
  view_terrace:     { emoji: '🏔️', label: 'View Terrace' },
  library:          { emoji: '📚', label: 'Library' },
  bowling:          { emoji: '🎳', label: 'Bowling' },
  rafting:          { emoji: '🚣', label: 'Rafting' },
}
const normalizeAmenity = (a) => a.toLowerCase().replace(/[\s-]+/g, '_')

function parseAmenityList(value) {
  if (Array.isArray(value)) return value.map(normalizeAmenity)
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map(v => normalizeAmenity(v.trim()))
      .filter(Boolean)
  }
  return []
}

function normalizeWeatherToken(value) {
  return String(value || '').trim().toLowerCase()
}

function weatherCategory(value) {
  const token = normalizeWeatherToken(value)
  if (!token || token === 'unknown') return 'unknown'

  if (
    token.includes('rain') || token.includes('drizzle') || token.includes('shower') ||
    token.includes('storm') || token.includes('thunder')
  ) return 'rainy'

  if (
    token.includes('snow') || token.includes('ice') || token.includes('cold') ||
    token.includes('freez')
  ) return 'cold'

  if (
    token.includes('fog') || token.includes('mist') || token.includes('haze') ||
    token.includes('cloud') || token.includes('overcast') || token === 'mixed' || token === 'mild'
  ) return 'mild'

  if (token === 'good' || token === 'sunny' || token === 'clear') return 'sunny'
  return 'mild'
}

function weatherPresentation(value) {
  const category = weatherCategory(value)
  if (category === 'sunny') return { category, emoji: '☀️', label: 'Sunny' }
  if (category === 'rainy') return { category, emoji: '🌧️', label: 'Rainy' }
  if (category === 'cold') return { category, emoji: '❄️', label: 'Cold' }
  if (category === 'mild') return { category, emoji: '🌤️', label: 'Mild' }
  return { category, emoji: '🌀', label: 'Unknown' }
}

function normalizePreferredWeather(value) {
  const token = normalizeWeatherToken(value)
  if (!token || token === 'any' || token.includes('no preference') || token.includes('no pref')) return 'any'
  return weatherCategory(token)
}

function matchesPreferredWeather(actualWeather, preferredWeather) {
  const preferred = normalizePreferredWeather(preferredWeather)
  if (preferred === 'any' || preferred === 'unknown') return false
  return weatherCategory(actualWeather) === preferred
}

/* ─── Place type icon map ─── */
const TYPE_ICONS = {
  Temple: '🛕', Park: '🌲', Museum: '🏛️', Market: '🏪',
  Heritage: '🏯', Beach: '🏖️', Nature: '🌿', Lake: '🏞️',
  Garden: '🌺', Viewpoint: '🔭', Safari: '🐘', Culture: '🎭',
  Wildlife: '🦁', Shopping: '🛍️', Waterfall: '💧',
}

/* ─── Currency display ─── */
const DISPLAY_CURRENCIES = [
  { code: 'LKR', symbol: 'Rs', label: 'LKR',  rate: 1      },  // prices stored in LKR
  { code: 'USD', symbol: '$',  label: 'USD',  rate: 0.0033  },  // ~300 LKR per USD
  { code: 'EUR', symbol: '€',  label: 'EUR',  rate: 0.0031  },  // ~326 LKR per EUR
]

function convertPrice(amount, toCurrency) {
  if (amount === null || amount === undefined) return null
  // All stored prices are in LKR
  const to = DISPLAY_CURRENCIES.find(c => c.code === toCurrency)?.rate ?? 1
  return Math.round(amount * to)
}

function currencySymbol(code) {
  return DISPLAY_CURRENCIES.find(c => c.code === code)?.symbol ?? code
}

/* ─── Star display ─── */
function Stars({ count }) {
  return (
    <div className="hp-stars">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} viewBox="0 0 24 24" className={`hp-star${i <= count ? ' filled' : ''}`}>
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
      <span className="hp-star-label">{count}-Star</span>
    </div>
  )
}

/* ─── Hotel Card ─── */
function HotelCard({ hotel, onSelect, onDeselect, isSelected, selectedNights, selectedCheckIn, selectedCheckOut, displayCurrency = 'USD', nightsFull = false, isRecommended = false }) {
  const [showReviews, setShowReviews] = useState(false)
  const img = hotel.images?.[0]?.url || hotel.images?.[0] ||
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80'
  const city = hotel.address?.city || hotel.location?.city || ''
  const rawMin = hotel.priceRange?.min ?? hotel.pricePerNight ?? null
  const rawMax = hotel.priceRange?.max ?? null
  const sym = currencySymbol(displayCurrency)
  const priceMin = rawMin !== null ? convertPrice(rawMin, displayCurrency) : '—'
  const priceMax = rawMax !== null ? convertPrice(rawMax, displayCurrency) : null
  const dbId = hotel.place_id ?? hotel.place?.place_id ?? null

  return (
    <div className={`hp-card-wrap${showReviews ? ' hp-card-wrap--open' : ''}${isSelected ? ' hp-card-wrap--selected' : ''}`}>
      <div
        className="hp-card"
        onClick={() => !isSelected && !nightsFull && onSelect(hotel)}
        style={{ cursor: isSelected ? 'default' : nightsFull ? 'not-allowed' : 'pointer' }}
      >
        {/* ── Image with overlaid price ── */}
        <div className="hp-card-img-wrap">
          <img
            src={img}
            alt={hotel.name}
            className="hp-card-img"
            onError={e => { e.target.src = 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80' }}
          />
          <span className={`hp-cat-badge hp-cat-${hotel.category}`}>{hotel.category}</span>
          {isSelected && (
            <div className="hp-selected-overlay">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="20,6 9,17 4,12"/></svg>
              Selected · {selectedNights} night{selectedNights !== 1 ? 's' : ''}
            </div>
          )}
          <div className="hp-price-overlay">
            <span className="hp-pov-from">from</span>
            <span className="hp-pov-val">{sym}{typeof priceMin === 'number' ? priceMin.toLocaleString() : priceMin}{priceMax ? `–${priceMax.toLocaleString()}` : ''}</span>
            <span className="hp-pov-night">/night</span>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="hp-card-body">
          {isRecommended && (
            <div className="hp-reco-badge-row">
              <span className="hp-reco-badge">✨ AI Recommended</span>
              {hotel.recommendation_badges?.length > 0 && hotel.recommendation_badges.map(b => (
                <span key={b} className="hp-reco-tag">{b}</span>
              ))}
            </div>
          )}
          <div className="hp-card-head">
            <div className="hp-card-title-group">
              <h3 className="hp-card-name">{hotel.name}</h3>
              {city && (
                <p className="hp-card-city">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  {city}
                </p>
              )}
            </div>
            <Stars count={hotel.starRating} />
          </div>

          <p className="hp-card-desc">{hotel.description?.slice(0, 150)}{hotel.description?.length > 150 ? '…' : ''}</p>

          {hotel.amenities?.length > 0 && (
            <div className="hp-amenities">
              {hotel.amenities.slice(0, 6).map(a => (
                <span key={a} className="hp-amenity-chip">{AMENITY_MAP[a]?.emoji || '✨'} {AMENITY_MAP[a]?.label || a}</span>
              ))}
            </div>
          )}

          {(hotel.contact?.phone || hotel.contact?.email || hotel.contact?.website) && (
            <div className="hp-contact-info">
              {hotel.contact.phone && (
                <span className="hp-contact-item">📞 {hotel.contact.phone}</span>
              )}
              {hotel.contact.email && (
                <a className="hp-contact-item" href={`mailto:${hotel.contact.email}`} onClick={e => e.stopPropagation()}>✉️ {hotel.contact.email}</a>
              )}
              {hotel.contact.website && (
                <a className="hp-contact-item" href={hotel.contact.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>🌐 Website</a>
              )}
            </div>
          )}

          {/* ── Actions ── */}
          <div className="hp-card-actions">
            <button
              className={`hp-reviews-toggle${showReviews ? ' active' : ''}`}
              onClick={e => { e.stopPropagation(); setShowReviews(s => !s) }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              {showReviews ? '✕ Hide Reviews' : '⭐ Reviews'}
            </button>
            {isSelected ? (
              <div className="hp-selected-actions">
                <button
                  className="hp-nights-edit-btn"
                  onClick={e => { e.stopPropagation(); onSelect(hotel) }}
                >
                  {selectedCheckIn && selectedCheckOut
                    ? (() => {
                        const [,m1,d1] = selectedCheckIn.split('-')
                        const [,m2,d2] = selectedCheckOut.split('-')
                        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                        return `📅 ${d1} ${months[Number(m1)-1]} → ${d2} ${months[Number(m2)-1]}`
                      })()
                    : `✏️ ${selectedNights} night${selectedNights !== 1 ? 's' : ''}`
                  }
                </button>
                <button
                  className="hp-deselect-btn"
                  onClick={e => { e.stopPropagation(); onDeselect(hotel._id) }}
                >
                  ✕ Remove
                </button>
              </div>
            ) : nightsFull ? (
              <button className="hp-select-btn hp-select-full" disabled>
                🌙 Nights full — remove a hotel
              </button>
            ) : (
              <button className="hp-select-btn" onClick={e => { e.stopPropagation(); onSelect(hotel) }}>
                Select this Hotel
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {showReviews && (
        <div className="hp-reviews-panel" onClick={e => e.stopPropagation()} style={{ marginTop: 0 }}>
          <ReviewSection
            targetType="hotel"
            targetId={String(hotel.place_id || hotel._id)}
            targetName={hotel.name}
            dbId={dbId}
          />
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ */
export default function HotelPicker({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const location = useLocation()
  const hpLayoutRef = useRef(null)
  const [destination,    setDestination]   = useState(null)
  const [selectedPlaces, setSelectedPlaces] = useState([])
  const [hotels,         setHotels]         = useState([])
  const [recommendedHotels, setRecommendedHotels] = useState([])
  const [aiRecoLoading,  setAiRecoLoading]  = useState(true)
  const [loading,        setLoading]        = useState(true)
  const [menuOpen,       setMenuOpen]       = useState(false)
  const [filterStar,     setFilterStar]     = useState(0)
  const [filterCat,      setFilterCat]      = useState('all')
  const [searchQuery,    setSearchQuery]    = useState('')
  const [priceCurrency,  setPriceCurrency]  = useState(
    () => localStorage.getItem('et_displayCurrency') || 'LKR'
  )
  const [selectedHotels, setSelectedHotels] = useState([])   // [{ ...hotel, nights: N }]
  const [nightsModal,    setNightsModal]    = useState(null) // hotel._id being edited
  const [editNights,     setEditNights]     = useState(1)
  const [editCheckIn,    setEditCheckIn]    = useState('')
  const [editCheckOut,   setEditCheckOut]   = useState('')
  const [tripDays,       setTripDays]       = useState(null)
  const [tripStartDate,  setTripStartDate]  = useState('')
  const [pendingNew,     setPendingNew]     = useState(false) // true when modal is for a brand-new (unconfirmed) selection
  const [focusedHotelId, setFocusedHotelId] = useState(null)
  const [userPreferredWeather] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || '{}')
      return u?.preferences?.preferred_weather || u?.preferred_weather || 'Any'
    } catch {
      return 'Any'
    }
  })
  const mapPanelRef       = useRef(null)
  const hpMapInstanceRef   = useRef(null)
  const hpPinsRef          = useRef([])

  useEffect(() => {
    let rafId = null

    const syncRightPanelScroll = () => {
      const layoutEl = hpLayoutRef.current
      const rightEl = mapPanelRef.current
      if (!layoutEl || !rightEl) return

      const rightMax = rightEl.scrollHeight - rightEl.clientHeight
      if (rightMax <= 0) return

      const rect = layoutEl.getBoundingClientRect()
      const viewportH = window.innerHeight || document.documentElement.clientHeight || 1
      const travel = Math.max(layoutEl.offsetHeight - viewportH, 1)
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
  }, [hotels.length, recommendedHotels.length, selectedHotels.length, aiRecoLoading, loading])

  const CATEGORIES = [
    { value: 'all', label: 'All Types' },
    { value: 'budget', label: '🏚️ Budget' },
    { value: 'midrange', label: '🏨 Mid-range' },
    { value: 'luxury', label: '🌴 Luxury' },
    { value: 'boutique', label: '🏡 Boutique' },
    { value: 'villa', label: '🏛️ Villa' },
  ]

  const resolveDistrictId = (d) => {
    const candidates = [d?.district_id, d?.districtId, d?.id, d?.destinationId]
    for (const c of candidates) {
      const n = Number(c)
      if (Number.isFinite(n) && n > 0) return n
    }
    return null
  }

  // Load district from localStorage
  useEffect(() => {
    const raw = localStorage.getItem('selectedDistrict') || localStorage.getItem('selectedDestination')
    if (!raw) { navigate('/plan-trip'); return }
    const dest = JSON.parse(raw)
    const resolvedDistrictId = resolveDistrictId(dest)
    setDestination({ ...dest, district_id: resolvedDistrictId ?? dest?.district_id ?? null })

    const rawPlaces = localStorage.getItem('selectedPlaces')
    if (rawPlaces) setSelectedPlaces(JSON.parse(rawPlaces))

    // Compute centroid of selected places that have coordinates
    let nearLat = null, nearLng = null
    if (rawPlaces) {
      try {
        const places = JSON.parse(rawPlaces)
        const withCoords = places.filter(p => p.lat && p.lng)
        if (withCoords.length > 0) {
          nearLat = withCoords.reduce((s, p) => s + Number(p.lat), 0) / withCoords.length
          nearLng = withCoords.reduce((s, p) => s + Number(p.lng), 0) / withCoords.length
        }
      } catch { /* ignore */ }
    }

    // Restore previously selected hotels (when navigating back from TripBudget)
    const savedHotels = localStorage.getItem('selectedHotels')
    if (savedHotels) {
      try { setSelectedHotels(JSON.parse(savedHotels)) } catch { /* ignore */ }
    }

    // Pre-apply hotel type filter from TripPreferences
    const rawPrefs = localStorage.getItem('tripPreferences')
    if (rawPrefs) {
      const prefs = JSON.parse(rawPrefs)
      const typeMap = {
        any: 'all',
        budget: 'budget',
        midrange: 'midrange',
        luxury: 'luxury',
        boutique: 'boutique',
        villa: 'villa',
      }
      if (prefs.hotelType && typeMap[prefs.hotelType]) {
        setFilterCat(typeMap[prefs.hotelType])
      }
      if (prefs.days) setTripDays(prefs.days)
      if (prefs.startDate) setTripStartDate(prefs.startDate)
    }

    // Fetch hotels near selected places, or fall back to whole district
    const fetchHotels = async () => {
      try {
        if (resolvedDistrictId) {
          const districtUrl = `${API_BASE}/hotels/district/${resolvedDistrictId}`
          let nearRows = []
          let districtRows = []

          if (nearLat && nearLng) {
            const nearUrl = `${API_BASE}/hotels/near?lat=${nearLat.toFixed(6)}&lng=${nearLng.toFixed(6)}&district_id=${resolvedDistrictId}`
            const nearRes = await fetch(nearUrl)
            const nearData = await nearRes.json()
            if (nearRes.ok && nearData.success && Array.isArray(nearData.data)) {
              nearRows = nearData.data
            }
          }

          const districtRes = await fetch(districtUrl)
          const districtData = await districtRes.json()
          if (districtRes.ok && districtData.success && Array.isArray(districtData.data)) {
            districtRows = districtData.data
          }

          const mergedRows = mergeUniqueHotels(nearRows, districtRows)
          const allMapped = mergedRows.map(mapHotel)
          setHotels(allMapped)
        } else {
          setHotels([])
        }
      } catch {
        setHotels([])
      } finally {
        setLoading(false)
      }
    }
    fetchHotels()
  }, [navigate, location.key])

  useEffect(() => {
    const fetchRecommendations = async () => {
      const districtId = resolveDistrictId(destination)
      if (!districtId) {
        setRecommendedHotels([])
        setAiRecoLoading(false)
        return
      }

      try {
        setAiRecoLoading(true)
        const token = localStorage.getItem('token')
        const placeIds = selectedPlaces.map(p => p.id || p.place_id).filter(Boolean).join(',')

        const recoParams = new URLSearchParams({ district_id: districtId })
        if (placeIds) recoParams.set('selected_place_ids', placeIds)
        if (filterCat && filterCat !== 'all') recoParams.set('hotel_type', filterCat)
        if (tripDays) recoParams.set('nights', String(tripDays))

        let recoRes = null
        if (token) {
          const aiParams = new URLSearchParams({ district_id: districtId, top_n: '10' })
          if (filterCat && filterCat !== 'all') aiParams.set('hotel_type', filterCat)
          recoRes = await fetch(`${API_BASE}/hotels/ai-recommend?${aiParams.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        }

        if (!recoRes || !recoRes.ok) {
          recoRes = await fetch(`${API_BASE}/hotels/recommended?${recoParams}`)
        }

        const recoData = await recoRes.json()
        const recoRows = Array.isArray(recoData.recommendations)
          ? recoData.recommendations
          : (Array.isArray(recoData.data) ? recoData.data : [])

        if (recoRes.ok && recoData.success && recoRows.length) {
          const mappedReco = recoRows.map(h => ({
            ...mapHotel(h),
            recommendation_score: h.weather_adjusted_score || h.final_score || h.recommendation_score,
            recommendation_badges: h.recommendation_badges || [],
            recommendation_reason: h.recommendation_reason || h.match_reason || '',
            within_budget: h.within_budget,
            matches_type: h.matches_type,
            distance_km: h.distance_km,
            weather_label: h.weather_label || '',
            temperature: h.temperature,
          }))

          const filteredReco = filterCat && filterCat !== 'all'
            ? mappedReco.filter(h => h.preferenceType === filterCat)
            : mappedReco

          setRecommendedHotels(filteredReco.slice(0, 10))
        } else {
          setRecommendedHotels([])
        }
      } catch {
        setRecommendedHotels([])
      } finally {
        setAiRecoLoading(false)
      }
    }

    fetchRecommendations()
  }, [destination, selectedPlaces, filterCat, tripDays])

  // Nights already committed to hotels OTHER than the one being edited
  const usedByOthers = (editingId) =>
    selectedHotels.filter(h => h._id !== editingId).reduce((s, h) => s + h.nights, 0)

  // Nights cap = hotel nights chosen in TripPreferences (prefs.days = total hotel nights to book)
  const tripNightsCap = tripDays ? Math.max(1, Number(tripDays)) : null

  // Max nights allowed for the hotel currently in the modal
  // Total across all hotels cannot exceed tripNightsCap, but always allow at least 1
  const maxNightsFor = (editingId) =>
    tripNightsCap ? Math.max(1, tripNightsCap - usedByOthers(editingId)) : 30

  const handleSelect = (hotel) => {
    const existing = selectedHotels.find(h => h._id === hotel._id)
    if (existing) {
      // Re-open dates editor for already-selected hotel
      setEditNights(existing.nights)
      const ci = existing.checkIn || tomorrowStr()
      setEditCheckIn(ci)
      setEditCheckOut(existing.checkOut || addDaysLocal(ci, existing.nights))
      setPendingNew(false)
    } else {
      // Block adding a new hotel if the nights budget is already fully used
      const totalNightsUsed = selectedHotels.reduce((s, h) => s + h.nights, 0)
      if (tripNightsCap && totalNightsUsed >= tripNightsCap) return
      // New hotel: start from previous hotel's checkout (sequential booking) or trip start
      const lastHotel = selectedHotels.length > 0 ? selectedHotels[selectedHotels.length - 1] : null
      const defaultCheckIn = (lastHotel?.checkOut) || tripStartDate || tomorrowStr()
      const defaultNights = 1
      setSelectedHotels(prev => [...prev, { ...hotel, nights: defaultNights, checkIn: defaultCheckIn, checkOut: addDaysLocal(defaultCheckIn, defaultNights) }])
      setEditNights(defaultNights)
      setEditCheckIn(defaultCheckIn)
      setEditCheckOut(addDaysLocal(defaultCheckIn, defaultNights))
      setPendingNew(true)
    }
    // zoom map to this hotel and scroll panel into view
    if (hotel.lat && hotel.lng) {
      setFocusedHotelId(hotel._id)
      setTimeout(() => mapPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
    }
    setNightsModal(hotel._id)
  }

  const handleDeselect = (hotelId) => {
    setSelectedHotels(prev => prev.filter(h => h._id !== hotelId))
    if (nightsModal === hotelId) setNightsModal(null)
    // zoom back out to full view
    setFocusedHotelId(null)
  }

  const handleConfirmNights = () => {
    setSelectedHotels(prev =>
      prev.map(h => h._id === nightsModal ? { ...h, nights: editNights, checkIn: editCheckIn, checkOut: editCheckOut } : h)
    )
    setPendingNew(false)
    setNightsModal(null)
  }

  const handleConfirmAll = () => {
    localStorage.setItem('selectedHotels', JSON.stringify(selectedHotels))
    // For backward compatibility with trip-budget
    if (selectedHotels.length >= 1) {
      const primary = selectedHotels[0]
      localStorage.setItem('selectedHotel', JSON.stringify({ ...primary, hotelNights: primary.nights }))
    }
    navigate('/trip-budget')
  }

  const handleSkip = () => {
    localStorage.removeItem('selectedHotel')
    localStorage.removeItem('selectedHotels')
    navigate('/trip-budget')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    clearUserData()
    navigate('/')
  }

  // Filter hotels
  const searchNeedle = searchQuery.trim().toLowerCase()

  const filtered = hotels.filter(h => {
    if (filterStar > 0 && h.starRating !== filterStar) return false
    if (filterCat !== 'all' && h.preferenceType !== filterCat) return false

    if (searchNeedle) {
      const haystack = [
        h.name,
        h.category,
        h.preferenceType,
        h.description,
        h.address?.city,
        Array.isArray(h.amenities) ? h.amenities.join(' ') : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      if (!haystack.includes(searchNeedle)) return false
    }

    return true
  })

  // Map pins — use ALL hotels regardless of filter so map always shows full district
  const selectedHotelIds = new Set(selectedHotels.map(h => h._id))
  const mapPins = hotels
    .filter(h => h.lat && h.lng)
    .map(h => ({
      ...h,
      isSelected: selectedHotelIds.has(h._id),
      // dim hotels that are filtered out
      isFiltered: filtered.some(f => f._id === h._id),
      icon: selectedHotelIds.has(h._id)
        ? createHpPin('🏨', '#f59e0b', 38)
        : filtered.some(f => f._id === h._id)
          ? createHpPin('🏨', '#0E7C5F', 30)
          : createHpPin('🏨', '#94a3b8', 24),   // grey = filtered out
    }))

  // Keep pins ref in sync for outside-click handler
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { hpPinsRef.current = mapPins }, [mapPins])

  // Outside-click → zoom out to show all pins
  useEffect(() => {
    const handler = (e) => {
      if (!mapPanelRef.current || !hpMapInstanceRef.current) return
      if (mapPanelRef.current.contains(e.target)) return
      const pins = hpPinsRef.current
      if (!pins.length) return
      const valid = pins.filter(p => p.lat && p.lng)
      if (!valid.length) return
      if (valid.length === 1) {
        hpMapInstanceRef.current.setView([valid[0].lat, valid[0].lng], 12, { animate: true })
      } else {
        hpMapInstanceRef.current.fitBounds(L.latLngBounds(valid.map(p => [p.lat, p.lng])), { padding: [50, 50], maxZoom: 13, animate: true })
      }
      setFocusedHotelId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Place pins — user's selected itinerary stops shown alongside hotels
  const placePins = selectedPlaces
    .filter(p => p.lat && p.lng)
    .map(p => ({
      ...p,
      icon: createHpPin(TYPE_ICONS[p.type] || '📍', '#6366f1', 30),  // indigo for places
    }))

  return (
    <div className="hp-page" onClick={() => setFocusedHotelId(null)}>
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
      <section className="hp-hero">
        <div className="hp-hero-inner">
          <div className="hp-breadcrumb-hero">
            <div className="hp-step done" onClick={() => navigate('/plan-trip')} title="Choose District">
              <span className="hp-step-num">1</span>
              <span className="hp-step-label">District</span>
            </div>
            <div className="hp-step-line done" />
            <div className="hp-step done" onClick={() => navigate('/district-explore')} title="Pick Places">
              <span className="hp-step-num">2</span>
              <span className="hp-step-label">Places</span>
            </div>
            <div className="hp-step-line done" />
            <div className="hp-step done" onClick={() => navigate('/trip-preferences')} title="Set Preferences">
              <span className="hp-step-num">3</span>
              <span className="hp-step-label">Preferences</span>
            </div>
            <div className="hp-step-line done" />
            <div className="hp-step active">
              <span className="hp-step-num">4</span>
              <span className="hp-step-label">Hotel</span>
            </div>
            <div className="hp-step-line" />
            <div className="hp-step">
              <span className="hp-step-num">5</span>
              <span className="hp-step-label">Budget</span>
            </div>
            <div className="hp-step-line" />
            <div className="hp-step">
              <span className="hp-step-num">6</span>
              <span className="hp-step-label">Details</span>
            </div>
          </div>
          <p className="hp-eyebrow">🏨 Step 4 — Choose Your Hotel</p>
          <h1>
            Hotels nearest to <em>{destination?.name}</em>
          </h1>
          <p className="hp-hero-sub">
            Hotels chosen for their proximity to your selected places. Pick the perfect stay and view prices in your preferred currency.
          </p>
          {destination && (
            <div className="hp-dest-pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {destination.name}{destination.province ? ` · ${destination.province} Province` : destination.city ? ` · ${destination.city}` : ''}
            </div>
          )}
        </div>
      </section>

      {/* ── Selected Places Section ── */}
      {selectedPlaces.length > 0 && (
        <div className="hp-places-section">
          <div className="hp-places-sec-inner">
            <div className="hp-places-sec-header">
              <div>
                <h2 className="hp-places-sec-title">
                  📍 Your Itinerary Stops
                  <span className="hp-places-count">{selectedPlaces.length}</span>
                </h2>
                <p className="hp-places-sec-sub">Hotels shown below are selected for their proximity to these locations</p>
              </div>
            </div>
            <div className="hp-places-scroll">
              {selectedPlaces.map((place, i) => (
                <div key={place.id || i} className="hp-place-card">
                  <div className="hp-place-card-top">
                    <span className="hp-place-num">{i + 1}</span>
                    <span className="hp-place-type">{TYPE_ICONS[place.type] || '📌'} {place.type}</span>
                  </div>
                  <h3 className="hp-place-name">{place.name}</h3>
                  {place.duration && (
                    <div className="hp-place-duration">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                      {place.duration}
                    </div>
                  )}
                  {place.description && (
                    <p className="hp-place-desc">{place.description.slice(0, 95)}{place.description.length > 95 ? '…' : ''}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="hp-content">
        <div className="hp-content-grid" ref={hpLayoutRef} onClick={e => e.stopPropagation()}>
        {/* ══ Left column: filters + hotel grid ══ */}
        <div className="hp-content-main">
        {/* ── Main Filter Bar ── */}
        <div className="hp-filters">
          <div className="hp-filter-group">
            <span className="hp-filter-label">Type</span>
            <div className="hp-filter-divider" />
            <div className="hp-pills">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  className={`hp-pill${filterCat === c.value ? ' active' : ''}`}
                  onClick={() => setFilterCat(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="hp-filter-sep" />
          <div className="hp-filter-group">
            <span className="hp-filter-label">Stars</span>
            <div className="hp-filter-divider" />
            <div className="hp-pills">
              {[0, 3, 4, 5].map(s => (
                <button
                  key={s}
                  className={`hp-pill${filterStar === s ? ' active' : ''}`}
                  onClick={() => setFilterStar(s)}
                >
                  {s === 0 ? 'Any' : `${s}★`}
                </button>
              ))}
            </div>
          </div>
          <div className="hp-filter-sep" />
          <div className="hp-filter-group hp-filter-group-search">
            <span className="hp-filter-label">Search</span>
            <div className="hp-filter-divider" />
            <div className="hp-search-wrap" role="search">
              <svg className="hp-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="16.65" y1="16.65" x2="21" y2="21" />
              </svg>
              <input
                type="text"
                className="hp-search-input"
                placeholder="Search hotels, city, amenities"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search hotels"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="hp-search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear hotel search"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Currency Selector ── */}
        <div className="hp-currency-bar">
          <div className="hp-currency-bar-left">
            <span className="hp-currency-bar-icon">💱</span>
            <div>
              <p className="hp-currency-bar-title">Display prices in</p>
              <p className="hp-currency-bar-sub">Approximate conversion from USD</p>
            </div>
          </div>
          <div className="hp-currency-options">
            {DISPLAY_CURRENCIES.map(c => (
              <button
                key={c.code}
                className={`hp-currency-opt${priceCurrency === c.code ? ' active' : ''}`}
                onClick={() => setPriceCurrency(c.code)}
              >
                <span className="hp-co-sym">{c.symbol}</span>
                <span className="hp-co-code">{c.code}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Status ── */}
        <div className="hp-status">
          {loading
            ? `Finding hotels nearest to your places in ${destination?.name || 'your district'}…`
            : `${filtered.length} hotel${filtered.length !== 1 ? 's' : ''} near ${destination?.name || 'your district'}`
          }
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div className="hp-skeleton-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="hp-skeleton-card">
                <div className="hp-skeleton-img" />
                <div className="hp-skeleton-body">
                  <div className="hp-skel-line w70" />
                  <div className="hp-skel-line w45" />
                  <div className="hp-skel-line w90" />
                  <div className="hp-skel-line w60" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="hp-empty">
            <span>🏨</span>
            {hotels.length === 0 ? (
              <h3>No hotels available for this district yet</h3>
            ) : (
              <>
                <h3>No hotels match that filter</h3>
                <button className="hp-clear-btn" onClick={() => { setFilterCat('all'); setFilterStar(0); setSearchQuery('') }}>
                  Clear filters and search
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* ── All Hotels Section ── */}
            <div className={recommendedHotels.length > 0 ? 'hp-section hp-section--all' : ''}>
              {recommendedHotels.length > 0 && (
                <div className="hp-section-header">
                  <h2 className="hp-section-title">🏨 All hotels in {destination?.name}</h2>
                </div>
              )}
              <div className="hp-grid">
                {(() => {
                  const totalNightsUsed = selectedHotels.reduce((s, h) => s + h.nights, 0)
                  const nightsFull = !!(tripNightsCap && totalNightsUsed >= tripNightsCap)
                  return filtered.map(h => {
                    const sel = selectedHotels.some(s => s._id === h._id)
                    return (
                      <HotelCard
                        key={h._id}
                        hotel={h}
                        onSelect={handleSelect}
                        onDeselect={handleDeselect}
                        isSelected={sel}
                        selectedNights={selectedHotels.find(s => s._id === h._id)?.nights}
                        selectedCheckIn={selectedHotels.find(s => s._id === h._id)?.checkIn}
                        selectedCheckOut={selectedHotels.find(s => s._id === h._id)?.checkOut}
                        displayCurrency={priceCurrency}
                        nightsFull={!sel && nightsFull}
                      />
                    )
                  })
                })()}
              </div>
            </div>
          </>
        )}
        </div>{/* end hp-content-main */}

        {/* ══ Right column: AI + Map (sticky) ══ */}
        <aside className="hp-right-panel" ref={mapPanelRef}>
          {(aiRecoLoading || recommendedHotels.length > 0) && (
            <div className="hp-ai-section hp-ai-panel">
              <div className="hp-ai-section-header">
                <div className="hp-ai-title-group">
                  <span className="hp-ai-icon">🤖</span>
                  <div>
                    <h3 className="hp-ai-title">AI Hotel Picks</h3>
                  </div>
                </div>
                {!aiRecoLoading && recommendedHotels.length > 0 && (
                  <span className="hp-ai-badge">{recommendedHotels.length} picks</span>
                )}
              </div>
              <p className="hp-ai-desc">
                <span className="hp-ai-desc-dot" />
                Top {aiRecoLoading ? '10' : recommendedHotels.length} hotels ranked by proximity, budget, preference type, and quality for <strong>{destination?.name}</strong>.
              </p>

              {aiRecoLoading ? (
                <div className="hp-ai-carousel">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="hp-ai-skel hp-ai-skel--compact">
                      <div className="hp-ai-skel-img" />
                      <div className="hp-ai-skel-body">
                        <div className="hp-ai-skel-line w70" />
                        <div className="hp-ai-skel-line w45" />
                        <div className="hp-ai-skel-line w85" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="hp-ai-carousel">
                  {recommendedHotels.map(hotel => {
                    const isSelected = !!selectedHotels.find(h => h._id === hotel._id)
                    const fallback = 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80'
                    const img = hotel.images?.[0]?.url || hotel.images?.[0] || fallback
                    const scoreRaw = Number(hotel.recommendation_score || 0)
                    const scorePct = Math.round(scoreRaw <= 1 ? scoreRaw * 100 : scoreRaw)
                    const weatherInfo = weatherPresentation(hotel.weather_label)
                    const weatherPrefMatch = matchesPreferredWeather(hotel.weather_label, userPreferredWeather)
                    const totalNightsUsed = selectedHotels.reduce((s, h) => s + h.nights, 0)
                    const nightsFull = !!(tripNightsCap && totalNightsUsed >= tripNightsCap)
                    return (
                      <div key={`side_reco_${hotel._id}`} className={`hp-ai-card${isSelected ? ' hp-ai-card--selected' : ''}`}>
                        <div className="hp-ai-card-img-wrap" onClick={() => !isSelected && !nightsFull && handleSelect(hotel)}>
                          <img
                            src={img}
                            alt={hotel.name}
                            className="hp-ai-card-img"
                            onError={e => { e.target.src = fallback }}
                            loading="lazy"
                          />
                          <span className="hp-ai-type-badge">🏨 {hotel.category || 'hotel'}</span>
                          {isSelected && (
                            <div className="hp-ai-selected-overlay">
                              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="30" height="30"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                          )}
                          <div className="hp-ai-img-score-bar">
                            <div className="hp-ai-img-score-fill" style={{ width: `${Math.max(0, Math.min(scorePct, 100))}%` }} />
                          </div>
                          <div className="hp-ai-score-pill">
                            <span className="hp-ai-score-val">{Math.max(0, Math.min(scorePct, 100))}%</span>
                            <span className="hp-ai-score-lbl"> match</span>
                          </div>
                        </div>

                        <div className="hp-ai-card-body">
                          <h4 className="hp-ai-card-name">{hotel.name}</h4>
                          <span className="hp-ai-price">from {currencySymbol(priceCurrency)}{convertPrice(hotel.priceRange?.min || 0, priceCurrency).toLocaleString()}/night</span>
                          {(hotel.weather_label || hotel.temperature != null) && (
                            <span className="hp-ai-weather">
                              {weatherInfo.emoji} {weatherInfo.label}
                              {hotel.temperature != null ? ` · ${Math.round(Number(hotel.temperature))}°C` : ''}
                            </span>
                          )}
                          {hotel.recommendation_reason && (
                            <p className="hp-ai-reason">🎯 {hotel.recommendation_reason}</p>
                          )}
                          {hotel.recommendation_badges?.length > 0 && (
                            <div className="hp-ai-tags">
                              {hotel.recommendation_badges.slice(0, 3).map(t => (
                                <span key={t} className="hp-ai-tag">{t}</span>
                              ))}
                              {weatherPrefMatch && <span className="hp-ai-tag">🌦️ Matches your weather preference</span>}
                            </div>
                          )}
                          {hotel.recommendation_badges?.length === 0 && weatherPrefMatch && (
                            <div className="hp-ai-tags">
                              <span className="hp-ai-tag">🌦️ Matches your weather preference</span>
                            </div>
                          )}
                        </div>

                        <div className="hp-ai-card-footer">
                          {isSelected ? (
                            <button className="hp-ai-add-btn added" onClick={() => handleDeselect(hotel._id)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
                              Selected
                            </button>
                          ) : (
                            <button
                              className="hp-ai-add-btn"
                              onClick={() => handleSelect(hotel)}
                              disabled={nightsFull}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              {nightsFull ? 'Nights full' : 'Add hotel'}
                            </button>
                          )}
                          {hotel.starRating > 0 && <span className="hp-ai-rating">⭐ {Number(hotel.starRating).toFixed(1)}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="hp-map-panel">
            <div className="hp-map-panel-head">
              <span className="hp-map-panel-title">
                🗺️ Map View
                {mapPins.length > 0 && (
                  <span className="hp-map-panel-count">{mapPins.length} hotel{mapPins.length !== 1 ? 's' : ''}</span>
                )}
                {placePins.length > 0 && (
                  <span className="hp-map-panel-places">{placePins.length} place{placePins.length !== 1 ? 's' : ''}</span>
                )}
              </span>
              <div className="hp-map-legend-row">
                <span className="hp-map-leg-item"><span className="hp-map-leg-dot" style={{background:'#0E7C5F'}}/>Hotel</span>
                <span className="hp-map-leg-item"><span className="hp-map-leg-dot" style={{background:'#f59e0b'}}/>Selected</span>
                <span className="hp-map-leg-item"><span className="hp-map-leg-dot" style={{background:'#94a3b8'}}/>Filtered</span>
                {placePins.length > 0 && (
                  <span className="hp-map-leg-item"><span className="hp-map-leg-dot" style={{background:'#6366f1'}}/>Your Stop</span>
                )}
              </div>
            </div>
            {mapPins.length === 0 && !loading ? (
              <div className="hp-map-empty">
                <span>🏨</span>
                <p>No coordinates available for these hotels yet.</p>
              </div>
            ) : (
              <div className="hp-map-wrap">
                <MapContainer
                  center={SL_CENTER}
                  zoom={9}
                  className="hp-map"
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <HpMapFitBounds
                    pins={mapPins}
                    allPins={mapPins}
                    focusPin={mapPins.find(p => p._id === focusedHotelId) ?? null}
                  />
                  <HpMapCapture mapRef={hpMapInstanceRef} />
                  <HpResetOnMapClick pins={mapPins} />
                  {mapPins.map(pin => (
                    <Marker key={pin._id} position={[pin.lat, pin.lng]} icon={pin.icon}>
                      <Popup>
                        <div className="hp-map-popup">
                          {pin.images?.[0]?.url && (
                            <img
                              src={pin.images[0].url}
                              alt={pin.name}
                              className="hp-map-popup-img"
                              onError={e => { e.target.style.display = 'none' }}
                            />
                          )}
                          <div className="hp-map-popup-body">
                            <span className="hp-map-popup-type">{pin.category} {pin.starRating > 0 ? `· ${'★'.repeat(pin.starRating)}` : ''}</span>
                            <span className="hp-map-popup-name">{pin.name}</span>
                            {pin.address?.city && <span className="hp-map-popup-city">📍 {pin.address.city}</span>}
                            <div className="hp-map-popup-actions">
                              <button
                                className={`hp-map-popup-select${pin.isSelected ? ' selected' : ''}`}
                                onClick={() => pin.isSelected ? handleDeselect(pin._id) : handleSelect(pin)}
                                disabled={!pin.isSelected && !!(tripNightsCap && selectedHotels.reduce((s,h)=>s+h.nights,0) >= tripNightsCap)}
                                title={!pin.isSelected && !!(tripNightsCap && selectedHotels.reduce((s,h)=>s+h.nights,0) >= tripNightsCap) ? 'Trip nights fully allocated — remove a hotel first' : undefined}
                              >
                                {pin.isSelected ? '✕ Remove' : '🏨 Select'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                  {placePins.map(pin => (
                    <Marker key={`place-${pin.id ?? pin._id}`} position={[pin.lat, pin.lng]} icon={pin.icon}>
                      <Popup>
                        <div className="hp-map-popup">
                          <div className="hp-map-popup-body">
                            <span className="hp-map-popup-type">📍 {pin.type}</span>
                            <span className="hp-map-popup-name">{pin.name}</span>
                            {pin.duration && <span className="hp-map-popup-city">⏱ {pin.duration}</span>}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            )}
          </div>
        </aside>
        </div>{/* end hp-content-grid */}

        {/* ── Bottom nav bar ── */}
        <div className="hp-bottom-nav">
          <button className="hp-back-btn" onClick={() => navigate('/trip-preferences')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/>
            </svg>
            Back
          </button>
          <div className="hp-bottom-center">
            {selectedHotels.length > 0 ? (
              <div className="hp-footer-strip">
                {selectedHotels.map(h => {
                  const img = h.images?.[0]?.url || 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=200&q=60'
                  return (
                    <div key={h._id} className="hp-footer-chip">
                      <div className="hp-footer-chip-img-wrap">
                        <img src={img} alt={h.name} className="hp-footer-chip-img" />
                        <button
                          type="button"
                          className="hp-footer-chip-remove"
                          onClick={() => handleDeselect(h._id)}
                          title="Remove"
                        >✕</button>
                      </div>
                      <div className="hp-footer-chip-info">
                        <span className="hp-footer-chip-name">{h.name}</span>
                        <span className="hp-footer-chip-nights">
                          {h.checkIn && h.checkOut
                            ? `📅 ${fmtDate(h.checkIn)} → ${fmtDate(h.checkOut)}`
                            : `🌙 ${h.nights} night${h.nights !== 1 ? 's' : ''}`
                          }
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="hp-bottom-hint">Not sure yet? You can always add a hotel later.</p>
            )}
          </div>
          <button
            type="button"
            className={selectedHotels.length > 0 ? 'hp-confirm-btn' : 'hp-skip-outline'}
            onClick={() => selectedHotels.length > 0 ? handleConfirmAll() : handleSkip()}
          >
            {selectedHotels.length > 0 ? 'Confirm & Continue' : 'Continue without hotel'}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Nights modal ── */}
      {nightsModal && (() => {
        const pendingHotel = selectedHotels.find(h => h._id === nightsModal)
        if (!pendingHotel) return null
        const maxN = maxNightsFor(nightsModal)
        const usedOthers = usedByOthers(nightsModal)
        // Check if current editCheckIn..editCheckOut overlaps any other hotel's dates
        const overlappingHotel = editCheckIn && editCheckOut
          ? selectedHotels.find(h =>
              h._id !== nightsModal &&
              h.checkIn && h.checkOut &&
              editCheckIn < h.checkOut &&
              editCheckOut > h.checkIn
            )
          : null
        return (
          <div className="hp-nights-overlay" onClick={() => {
            // If the hotel was just added and never confirmed, remove it on backdrop dismiss
            if (pendingNew) { handleDeselect(nightsModal) }
            else setNightsModal(null)
          }}>
            <div className="hp-nights-modal" onClick={e => e.stopPropagation()}>

              {/* ══ Left info panel ══ */}
              <div className="hp-nights-info">
                {/* Mini map: hotel + selected places */}
                {(() => {
                  const modalPlacePins = selectedPlaces
                    .filter(p => (p.lat != null && p.lng != null && !isNaN(Number(p.lat)) && !isNaN(Number(p.lng))))
                    .map(p => ({
                      key: `place-${p.id ?? p._id}`,
                      lat: Number(p.lat),
                      lng: Number(p.lng),
                      label: p.name,
                      icon: createHpPin(TYPE_ICONS[p.type] || '📍', '#6366f1', 28),
                    }))
                  const hotelPoint = (pendingHotel.lat && pendingHotel.lng) ? {
                    key: `hotel-${pendingHotel._id}`,
                    lat: Number(pendingHotel.lat),
                    lng: Number(pendingHotel.lng),
                    label: pendingHotel.name,
                    icon: createHpPin('🏨', '#f59e0b', 36),
                  } : null
                  const modalMapPoints = [
                    ...(hotelPoint ? [hotelPoint] : []),
                    ...modalPlacePins,
                  ]
                  const fallback = hotelPoint ? [hotelPoint.lat, hotelPoint.lng] : SL_CENTER
                  return (
                    <>
                      <MapContainer
                        key={`modal-map-${pendingHotel._id}-${modalPlacePins.length}`}
                        center={fallback}
                        zoom={12}
                        className="hp-nights-map"
                        scrollWheelZoom={true}
                        zoomControl={true}
                        attributionControl={false}
                        dragging={true}
                        doubleClickZoom={false}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <NightsFitBounds points={modalMapPoints} />
                        {modalMapPoints.map(pt => (
                          <Marker key={pt.key} position={[pt.lat, pt.lng]} icon={pt.icon}>
                            <Popup>{pt.label}</Popup>
                          </Marker>
                        ))}
                      </MapContainer>
                      {/* map legend overlay */}
                      <div className="hp-nights-map-legend">
                        <span className="hp-nights-map-leg-item">
                          <span className="hp-nights-map-leg-dot" style={{background:'#f59e0b'}}/>Hotel
                        </span>
                        {modalPlacePins.length > 0 && (
                          <span className="hp-nights-map-leg-item">
                            <span className="hp-nights-map-leg-dot" style={{background:'#6366f1'}}/>
                            {modalPlacePins.length} stop{modalPlacePins.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {selectedPlaces.length > 0 && modalPlacePins.length === 0 && (
                          <span className="hp-nights-map-leg-item hp-nights-map-leg-warn">
                            ⚠️ stops have no map coords
                          </span>
                        )}
                      </div>
                    </>
                  )
                })()}

                {/* Hotel details */}
                <div className="hp-nights-info-hotel">
                  <span className="hp-nights-info-cat">
                    {pendingHotel.category || 'Hotel'}
                    {pendingHotel.starRating > 0 && (
                      <span className="hp-nights-info-stars">{'★'.repeat(pendingHotel.starRating)}</span>
                    )}
                  </span>
                  <h3 className="hp-nights-info-name">{pendingHotel.name}</h3>
                  {pendingHotel.address?.city && (
                    <p className="hp-nights-info-addr">📍 {pendingHotel.address.city}{pendingHotel.address?.district ? `, ${pendingHotel.address.district}` : ''}</p>
                  )}
                </div>

                {/* Itinerary stops */}
                {selectedPlaces.length > 0 && (
                  <div className="hp-nights-info-places">
                    <p className="hp-nights-info-places-title">📍 Your Itinerary Stops</p>
                    <div className="hp-nights-info-places-list">
                      {selectedPlaces.map((place, i) => (
                        <div key={place.id || i} className="hp-nights-info-place">
                          <span className="hp-nights-info-place-num">{i + 1}</span>
                          <div className="hp-nights-info-place-body">
                            <span className="hp-nights-info-place-name">{place.name}</span>
                            <span className="hp-nights-info-place-meta">
                              {TYPE_ICONS[place.type] || '📌'} {place.type}
                              {place.duration && ` · ${place.duration}`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ══ Right form panel ══ */}
              <div className="hp-nights-form">
              <h2 className="hp-nights-title">📅 Select Your Stay Dates</h2>
              <p className="hp-nights-sub">
                <strong>{pendingHotel.name}</strong> &mdash; pick your check-in &amp; check-out dates
              </p>

              {/* ── Date Range Picker ── */}
              <div className="hp-date-range">
                <div className="hp-date-field">
                  <label className="hp-date-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Check-in
                  </label>
                  <input
                    type="date"
                    className="hp-date-input"
                    value={editCheckIn}
                    min={tripStartDate || tomorrowStr()}
                    onChange={e => {
                      const newCI = e.target.value
                      if (!newCI) return
                      setEditCheckIn(newCI)
                      setEditCheckOut(addDaysLocal(newCI, editNights))
                    }}
                  />
                </div>
                <div className="hp-date-arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13,6 19,12 13,18"/></svg>
                </div>
                <div className="hp-date-field">
                  <label className="hp-date-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Check-out
                  </label>
                  <input
                    type="date"
                    className="hp-date-input"
                    value={editCheckOut}
                    min={addDaysLocal(editCheckIn, 1)}
                    onChange={e => {
                      const newCO = e.target.value
                      if (!newCO) return
                      const diff = diffDaysLocal(editCheckIn, newCO)
                      if (diff < 1) return
                      const capped = Math.min(diff, maxN)
                      setEditNights(capped)
                      setEditCheckOut(addDaysLocal(editCheckIn, capped))
                    }}
                  />
                </div>
              </div>

              {/* ── Duration display ── */}
              <div className="hp-date-duration">
                <span className="hp-date-dur-badge">
                  🌙 {editNights} night{editNights !== 1 ? 's' : ''}
                  {editCheckIn && editCheckOut ? ` · ${fmtDate(editCheckIn)} → ${fmtDate(editCheckOut)}` : ''}
                </span>
              </div>

              {/* ── Overlap warning ── */}
              {overlappingHotel && (
                <div className="hp-overlap-warning">
                  ⚠️ These dates overlap with <strong>{overlappingHotel.name}</strong>
                  {' '}({fmtDate(overlappingHotel.checkIn)} → {fmtDate(overlappingHotel.checkOut)}).
                  Please choose non-overlapping dates.
                </div>
              )}

              {tripNightsCap && (
                <div className="hp-nights-budget">
                  <div className="hp-nights-budget-bar">
                    <div
                      className="hp-nights-budget-used"
                      style={{ width: `${Math.min(100, (usedOthers / tripNightsCap) * 100)}%` }}
                    />
                    <div
                      className="hp-nights-budget-current"
                      style={{ width: `${Math.min(100, (editNights / tripNightsCap) * 100)}%` }}
                    />
                  </div>
                  <p className="hp-nights-budget-label">
                    {usedOthers + editNights} / {tripNightsCap} nights used
                    {maxN <= 1 && usedOthers + editNights >= tripNightsCap ? ' — trip fully allocated' : ''}
                  </p>
                </div>
              )}

              <div className="hp-nights-control">
                <button
                  className="hp-nights-btn"
                  disabled={editNights <= 1}
                  onClick={() => {
                    const n = Math.max(1, editNights - 1)
                    setEditNights(n)
                    setEditCheckOut(addDaysLocal(editCheckIn, n))
                  }}
                >−</button>
                <div className="hp-nights-display">
                  <span className="hp-nights-num">{editNights}</span>
                  <span className="hp-nights-unit">{editNights === 1 ? 'night' : 'nights'}</span>
                </div>
                <button
                  className="hp-nights-btn"
                  disabled={editNights >= maxN}
                  onClick={() => {
                    const n = Math.min(maxN, editNights + 1)
                    setEditNights(n)
                    setEditCheckOut(addDaysLocal(editCheckIn, n))
                  }}
                >+</button>
              </div>
              {pendingHotel.priceRange?.min && (
                <p className="hp-nights-cost">
                  Estimated cost: <strong>
                    {(() => {
                      const sym = { LKR: 'Rs', USD: '$', EUR: '€' }[priceCurrency] || '$'
                      const rate = { LKR: 1, USD: 0.0033, EUR: 0.0031 }[priceCurrency] || 1
                      const total = Math.round(pendingHotel.priceRange.min * rate * editNights)
                      return `${sym}${total.toLocaleString()} ${priceCurrency}`
                    })()}
                  </strong> ({editNights} &times; {(() => {
                    const sym = { LKR: 'Rs', USD: '$', EUR: '€' }[priceCurrency] || '$'
                    const rate = { LKR: 1, USD: 0.0033, EUR: 0.0031 }[priceCurrency] || 1
                    return `${sym}${Math.round(pendingHotel.priceRange.min * rate).toLocaleString()}`
                  })()}/night)
                </p>
              )}
              <div className="hp-nights-actions">
                <button className="hp-nights-cancel" onClick={() => { handleDeselect(nightsModal) }}>Remove Hotel</button>
                <button className="hp-nights-confirm" onClick={handleConfirmNights} disabled={!!overlappingHotel}>
                  Confirm Selection
                </button>
              </div>
              </div>{/* end hp-nights-form */}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
