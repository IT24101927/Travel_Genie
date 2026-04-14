import { useState, useEffect, useRef } from 'react'
import { clearUserData } from '../../utils/clearUserData'
import { Link, useNavigate } from 'react-router-dom'
import { API_BASE } from '../../config/api'
import ReviewSection from './ReviewSection'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './DistrictExplore.css'

const SRI_LANKA_CENTER = [7.8731, 80.7718]

function createDePin(emoji, bg, size = 32) {
  return L.divIcon({
    html: `<div style="background:${bg};width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2.5px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:${Math.round(size*0.44)}px;line-height:1;">${emoji}</span></div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -(size + 4)],
  })
}

function MapFitBounds({ pins, focusPin }) {
  const map = useMap()
  useEffect(() => {
    if (focusPin) {
      map.setView([focusPin.lat, focusPin.lng], 14, { animate: true })
      return
    }
    // no focus — fit all visible pins
    if (!pins.length) return
    const valid = pins.filter(p => p.lat && p.lng)
    if (!valid.length) return
    if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lng], 12, { animate: true })
    } else {
      map.fitBounds(L.latLngBounds(valid.map(p => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 13, animate: true })
    }
  }, [pins, focusPin, map])
  return null
}
function DeMapCapture({ mapRef }) {
  const map = useMap()
  useEffect(() => { mapRef.current = map }, [map, mapRef])
  return null
}
function DeResetOnMapClick({ pins }) {
  const map = useMap()
  useMapEvents({
    click() {
      const valid = pins.filter(p => p.lat && p.lng)
      if (!valid.length) return
      if (valid.length === 1) {
        map.setView([valid[0].lat, valid[0].lng], 12, { animate: true })
      } else {
        map.fitBounds(L.latLngBounds(valid.map(p => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 13, animate: true })
      }
    }
  })
  return null
}
const TYPE_EMOJIS = {
  Temple: '🛕', Beach: '🏖️', Nature: '🌿', Heritage: '🏛️',
  Museum: '🏛️', Safari: '🐘', Wildlife: '🦁', Garden: '🌸',
  Lake: '🏞️', Market: '🛍️', Viewpoint: '🏔️', Culture: '🎭',
  Adventure: '🧗', Park: '🌳', Shopping: '🛍️', 'Theme Park': '🎢',
}

/* Place type → colour mapping */
const TYPE_COLOURS = {
  Temple:    { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  Beach:     { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
  Nature:    { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' },
  Heritage:  { bg: '#EDE9FE', text: '#5B21B6', border: '#DDD6FE' },
  Museum:    { bg: '#FCE7F3', text: '#9D174D', border: '#FBCFE8' },
  Safari:    { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  Wildlife:  { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  Garden:    { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
  Lake:      { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  Market:    { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3' },
  Viewpoint: { bg: '#F5F3FF', text: '#6D28D9', border: '#E9D5FF' },
  Culture:   { bg: '#FFF7ED', text: '#B45309', border: '#FDE68A' },
  Adventure: { bg: '#FFF1F2', text: '#B91C1C', border: '#FECACA' },
  Park:      { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' },
  Shopping:  { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  'Theme Park': { bg: '#FDF2F8', text: '#DB2777', border: '#FBCFE8' },
}

/* Place type → representative fallback photo */
const TYPE_IMAGES = {
  Temple:    'https://images.unsplash.com/photo-1548013146-72479768bada?w=600&auto=format',
  Beach:     'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format',
  Nature:    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&auto=format',
  Heritage:  'https://images.unsplash.com/photo-1553913861-c0fddf2619ee?w=600&auto=format',
  Museum:    'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600&auto=format',
  Safari:    'https://images.unsplash.com/photo-1549366021-9f761d450615?w=600&auto=format',
  Wildlife:  'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=600&auto=format',
  Garden:    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&auto=format',
  Lake:      'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&auto=format',
  Market:    'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=600&auto=format',
  Viewpoint: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&auto=format',
  Culture:   'https://images.unsplash.com/photo-1582192730841-2a682d7375f9?w=600&auto=format',
  Adventure: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&auto=format',
  Park:      'https://images.unsplash.com/photo-1586348943529-beaae6c28db9?w=600&auto=format',
  Shopping:  'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&auto=format',
  'Theme Park': 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=600&auto=format',
}

const INTEREST_TO_TYPE = {
  beaches: 'Beach',
  mountains: 'Nature',
  historical: 'Heritage',
  history: 'Heritage',
  cultural: 'Culture',
  culture: 'Culture',
  adventure: 'Adventure',
  nature: 'Nature',
  wildlife: 'Wildlife',
  religious: 'Temple',
  relax: 'Beach',
  food: 'Market',
  nightlife: 'Culture',
  photography: 'Viewpoint',
  art: 'Museum',
  shopping: 'Shopping',
  spa: 'Nature',
  wellness: 'Nature',
}

function normalizeToken(value) {
  return String(value || '').trim().toLowerCase()
}

function weatherCategory(value) {
  const token = normalizeToken(value)
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
  const token = normalizeToken(value)
  if (!token || token === 'any' || token.includes('no preference') || token.includes('no pref')) return 'any'
  return weatherCategory(token)
}

function matchesPreferredWeather(actualWeather, preferredWeather) {
  const preferred = normalizePreferredWeather(preferredWeather)
  if (preferred === 'any' || preferred === 'unknown') return false
  return weatherCategory(actualWeather) === preferred
}


/* ─── Place Card ─── */
function PlaceCard({ place, districtId, district, selected, onToggle, isSaved, onSave }) {
  const [showReviews, setShowReviews] = useState(false)
  const [imgError,    setImgError]    = useState(false)
  const reviewId   = `${districtId}_${place.id}`
  const fallbackImg = TYPE_IMAGES[place.type] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&auto=format'
  const displayImg  = imgError ? fallbackImg : (place.image || fallbackImg)
  const c = TYPE_COLOURS[place.type] || { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' }

  return (
    <div id={`place-card-${districtId}_${place.id}`} className={`de-place-card ${selected ? 'selected' : ''} ${showReviews ? 'de-place-card--open' : ''}`}>

      {/* ── Card main (LEFT) ── */}
      <div className="de-place-card-main">

        {/* ── Image ── */}
        <div className="de-place-img-wrap" onClick={() => onToggle(place)}>
          <img
            src={displayImg}
            alt={place.name}
            onError={() => setImgError(true)}
            loading="lazy"
          />
          <span className="de-place-type-badge" style={{ background: c.bg, color: c.text }}>
            {place.type}
          </span>
          <span className="de-place-dur-badge">⏱ {place.duration}</span>
          {place.matchScore > 0 && (
            <span className="de-place-match-badge" title={place.matchReason || 'Matches your interests'}>
              🎯 Match
            </span>
          )}
          {selected && (
            <div className="de-place-selected-overlay">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"
                strokeLinecap="round" strokeLinejoin="round" width="36" height="36">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="de-place-body">
          <h4 className="de-place-name">{place.name}</h4>
          {place.matchScore > 0 && place.matchReason && (
            <p className="de-place-match-reason">{place.matchReason}</p>
          )}
          <p className="de-place-desc">{place.description}</p>
        </div>

        {/* ── Footer ── */}
        <div className="de-place-footer">
          <button
            className={`de-place-add-btn ${selected ? 'added' : ''}`}
            onClick={() => onToggle(place)}
          >
            {selected ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                In your trip
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add to trip
              </>
            )}
          </button>
          <button
            className={`de-save-btn ${isSaved ? 'saved' : ''}`}
            onClick={e => { e.stopPropagation(); onSave(place) }}
            title={isSaved ? 'Remove from saved' : 'Save to dashboard'}
          >
            {isSaved ? '❤️' : '🤍'}
          </button>
          <button
            className={`de-reviews-toggle ${showReviews ? 'active' : ''}`}
            onClick={e => { e.stopPropagation(); setShowReviews(s => !s) }}
          >
            {showReviews ? '✕ Hide' : '⭐ Reviews'}
          </button>
        </div>

      </div>{/* end de-place-card-main */}

      {/* ── Reviews panel (RIGHT when open) ── */}
      {showReviews && (
        <div className="de-reviews-panel" onClick={e => e.stopPropagation()}>
          <ReviewSection
            targetType="place"
            targetId={reviewId}
            targetName={place.name}
            districtName={district?.name || ''}
            dbId={place.place_id ?? place.dbId ?? null}
          />
        </div>
      )}
    </div>
  )
}

/* ─── Main Component ─── */
function DistrictExplore({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const deLayoutRef = useRef(null)
  const [menuOpen,       setMenuOpen]       = useState(false)
  const [district] = useState(() => {
    try { return JSON.parse(localStorage.getItem('selectedDistrict') || 'null') }
    catch { return null }
  })
  const [selectedPlaces, setSelectedPlaces] = useState([])
  const [focusedPlaceId,  setFocusedPlaceId]  = useState(null)
  const dePanelRef = useRef(null)
  const deMapRef   = useRef(null)
  const dePinsRef  = useRef([])
  const [filterType,     setFilterType]     = useState('All')
  const [searchQuery,    setSearchQuery]    = useState('')
  const [showMatchesOnly, setShowMatchesOnly] = useState(false)
  const [savedIds, setSavedIds] = useState(() => {
    try {
      const raw = localStorage.getItem('savedDestinations')
      return new Set((raw ? JSON.parse(raw) : []).map(d => d.id))
    } catch { return new Set() }
  })
  const [places, setPlaces]             = useState([])
  const [placesLoading, setPlacesLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [showMap, setShowMap] = useState(true)
  const [aiRecommendations, setAiRecommendations] = useState([])
  const [aiLoading, setAiLoading] = useState(true)
  const [aiError, setAiError] = useState(null)
  const [userInterests] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || '{}')
      return Array.isArray(u.interests) ? u.interests : []
    } catch {
      return []
    }
  })
  const [userPreferredWeather] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || '{}')
      return u?.preferences?.preferred_weather || u?.preferred_weather || 'Any'
    } catch {
      return 'Any'
    }
  })

  useEffect(() => {
    let rafId = null

    const syncRightPanelScroll = () => {
      const layoutEl = deLayoutRef.current
      const rightEl = dePanelRef.current
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
  }, [places.length, aiRecommendations.length, selectedPlaces.length, aiLoading, placesLoading])

  useEffect(() => {
    const raw = localStorage.getItem('selectedDistrict')
    if (!raw) { navigate('/plan-trip'); return }
    const d = JSON.parse(raw)
    // Fetch places from API
    fetch(`${API_BASE}/destinations/district/${d.district_id}`)
      .then(r => r.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          setPlaces(json.data.map(p => ({
            id:          String(p.place_id),
            place_id:    p.place_id,
            name:        p.name,
            type:        p.type || '',
            duration:    p.duration || '',
            description: p.description || '',
            image:       p.image_url || p.images?.[0]?.image_url || '',
            tags:        Array.isArray(p.tags) ? p.tags.map(t => t.tag_name).filter(Boolean) : [],
            rating:      Number(p.rating || 0),
            lat:         p.lat  ? parseFloat(p.lat)  : null,
            lng:         p.lng  ? parseFloat(p.lng)  : null,
          })))
        }
      })
      .catch(() => {})
      .finally(() => setPlacesLoading(false))

    // Fetch AI recommendations
    const token = localStorage.getItem('token')
    if (token && d.district_id) {
      setAiLoading(true)
      fetch(`${API_BASE}/places/ai-recommend?district_id=${d.district_id}&top_n=10`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(json => {
          if (json.success && Array.isArray(json.recommendations) && json.recommendations.length > 0) {
            setAiRecommendations(json.recommendations.map(p => {
              // Convert numeric duration_hours back to a readable string
              const durationHrs = Number(p.duration_hours || 0)
              const durationStr = durationHrs >= 8 ? 'Full day'
                : durationHrs >= 4 ? 'Half day'
                : durationHrs > 0  ? `${durationHrs} hrs`
                : ''
              return {
                id:          String(p.place_id),
                place_id:    p.place_id,
                name:        p.place_name || '',
                type:        p.type || '',
                duration:    durationStr,
                description: p.place_description || '',
                image:       p.image_url || '',
                tags:        p.tag_names ? p.tag_names.split(',').map(t => t.trim()).filter(Boolean) : [],
                rating:      Number(p.rating || 0),
                lat:         p.lat  ? parseFloat(p.lat)  : null,
                lng:         p.lng  ? parseFloat(p.lng)  : null,
                aiScore:     p.weather_adjusted_score || p.final_score || 0,
                aiReason:    p.match_reason || '',
                aiWeather:   p.weather_label || '',
                temperature: p.temperature || null,
              }
            }))
          } else {
            setAiError('no-data')
          }
        })
        .catch(() => setAiError('unavailable'))
        .finally(() => setAiLoading(false))
    } else {
      setAiLoading(false)
    }
    // Restore previously selected places (e.g. when editing a trip)
    const savedPlaces = localStorage.getItem('selectedPlaces')
    if (savedPlaces) {
      try {
        queueMicrotask(() => setSelectedPlaces(JSON.parse(savedPlaces)))
      } catch { /* ignore */ }
    }
    // Scroll to a specific saved place if requested
    const scrollTarget = localStorage.getItem('scrollToPlace')
    if (scrollTarget) {
      localStorage.removeItem('scrollToPlace')
      setTimeout(() => {
        const el = document.getElementById(`place-card-${d.id}_${scrollTarget}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('de-place-highlight')
          setTimeout(() => el.classList.remove('de-place-highlight'), 2200)
        }
      }, 350)
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    clearUserData()
    navigate('/')
  }

  if (!district) return null

  const types  = ['All', ...Array.from(new Set(places.map(p => p.type)))]
  const normalizedInterests = userInterests.map(normalizeToken).filter(Boolean)
  const interestKeySet = new Set(normalizedInterests)
  const preferredTypeSet = new Set(
    normalizedInterests
      .map((name) => INTEREST_TO_TYPE[name])
      .filter(Boolean)
  )
  const hasInterestSignals = interestKeySet.size > 0

  const searchNeedle = searchQuery.trim().toLowerCase()

  const visiblePlaces = places
    .map((p) => {
      const matchedTagNames = (p.tags || []).filter((name) => interestKeySet.has(normalizeToken(name)))
      const typeMatched = preferredTypeSet.has(p.type)
      const matchScore = (matchedTagNames.length * 2) + (typeMatched ? 1 : 0)

      let matchReason = ''
      if (matchedTagNames.length > 0) {
        matchReason = `Matches tags: ${matchedTagNames.slice(0, 2).join(', ')}`
      } else if (typeMatched) {
        matchReason = `Matches your interest type: ${p.type}`
      }

      return { ...p, matchedTagNames, typeMatched, matchScore, matchReason }
    })
    .filter((p) => {
      if (filterType !== 'All' && p.type !== filterType) return false
      if (showMatchesOnly && hasInterestSignals && p.matchScore <= 0) return false
      if (!searchNeedle) return true

      const haystack = [p.name, p.type, p.description, ...(p.tags || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(searchNeedle)
    })
    .sort((a, b) =>
      (b.matchScore - a.matchScore) ||
      ((b.rating || 0) - (a.rating || 0)) ||
      a.name.localeCompare(b.name)
    )

  const matchedVisibleCount = visiblePlaces.filter((p) => p.matchScore > 0).length

  const togglePlace = (place) => {
    const isSelected = selectedPlaces.find(p => p.id === place.id)
    // Enrich with coordinates from regular places list if the AI place has none
    const enriched = (!place.lat || !place.lng)
      ? { ...place, ...(places.find(p => p.id === place.id) ? { lat: places.find(p => p.id === place.id).lat, lng: places.find(p => p.id === place.id).lng } : {}) }
      : place
    setSelectedPlaces(prev =>
      isSelected ? prev.filter(p => p.id !== place.id) : [...prev, enriched]
    )
    // zoom map to place on select; zoom out to full view on deselect
    if (!isSelected && enriched.lat && enriched.lng) {
      setFocusedPlaceId(enriched.id)
    } else {
      setFocusedPlaceId(null)
    }
  }

  const toggleSave = (place) => {
    const savedKey = `de_${district.id}_${place.id}`
    const raw = localStorage.getItem('savedDestinations')
    let list = raw ? JSON.parse(raw) : []
    const isSaved = savedIds.has(savedKey)
    if (isSaved) {
      list = list.filter(d => d.id !== savedKey)
      setSavedIds(prev => { const s = new Set(prev); s.delete(savedKey); return s })
      setToast({ msg: `Removed "${place.name}" from saved`, type: 'remove' })
    } else {
      const fallback = TYPE_IMAGES[place.type] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&auto=format'
      list = [...list, {
        id: savedKey,
        name: place.name,
        category: place.type,
        province: district.province,
        districtName: district.name,
        districtId: district.id,
        placeId: place.id,
        districtData: district,
        image: place.image || fallback,
        icon: TYPE_EMOJIS[place.type] || '📍',
        description: place.description,
        details: `Duration: ${place.duration}`,
        tours: null,
        savedAt: new Date().toISOString(),
      }]
      setSavedIds(prev => new Set([...prev, savedKey]))
      setToast({ msg: `Saved "${place.name}" to dashboard!`, type: 'save' })
    }
    localStorage.setItem('savedDestinations', JSON.stringify(list))
    setTimeout(() => setToast(null), 2500)
  }

  const handleContinue = () => {
    // Store both the district and the selected places
    localStorage.setItem('selectedDistrict', JSON.stringify(district))
    localStorage.setItem('selectedPlaces', JSON.stringify(selectedPlaces))
    navigate('/trip-preferences')
  }

  /* ── Map pins ── */
  const selectedIds = new Set(selectedPlaces.map(p => p.id))
  // Enrich AI places with coordinates from the regular places list
  const allPlaceById = Object.fromEntries(places.map(p => [p.id, p]))
  const visibleIds = new Set(visiblePlaces.map(p => p.id))
  const aiForMap = aiRecommendations
    .filter(ai => !visibleIds.has(ai.id))
    .map(ai => {
      const base = allPlaceById[ai.id] || {}
      return { ...ai, lat: base.lat ?? ai.lat, lng: base.lng ?? ai.lng }
    })
  const mapPins = [...visiblePlaces, ...aiForMap]
    .filter(p => p.lat && p.lng)
    .map(p => ({
      ...p,
      isSelected: selectedIds.has(p.id),
      icon: selectedIds.has(p.id)
        ? createDePin(TYPE_EMOJIS[p.type] || '📍', '#f59e0b', 38)
        : createDePin(TYPE_EMOJIS[p.type] || '📍', '#0E7C5F', 30),
    }))

  // Keep pin ref in sync so outside-click handler sees current pins
  useEffect(() => { dePinsRef.current = mapPins }, [mapPins])

  // Click outside map panel → fit all pins (same as Dashboard)
  useEffect(() => {
    const handler = (e) => {
      if (!dePanelRef.current || !deMapRef.current) return
      if (dePanelRef.current.contains(e.target)) return
      const pins = dePinsRef.current
      if (!pins.length) return
      const valid = pins.filter(p => p.lat && p.lng)
      if (!valid.length) return
      if (valid.length === 1) {
        deMapRef.current.setView([valid[0].lat, valid[0].lng], 12, { animate: true })
      } else {
        deMapRef.current.fitBounds(L.latLngBounds(valid.map(p => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 13, animate: true })
      }
      setFocusedPlaceId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const scrollToCard = (place) => {
    const el = document.getElementById(`place-card-${district.id}_${place.id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('de-place-highlight')
      setTimeout(() => el.classList.remove('de-place-highlight'), 1800)
    }
  }

  return (
    <div className="de-page" onClick={() => setFocusedPlaceId(null)}>
      {/* ── Toast ── */}
      {toast && (
        <div className={`de-save-toast ${toast.type}`}>
          {toast.type === 'save' ? '❤️' : '🩶'} {toast.msg}
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
            <li><Link to="/plan-trip" className="active-link">Plan a Trip</Link></li>
            <li><Link to="/profile">Profile</Link></li>
            <li className="nav-logout-mobile">
              <button className="btn-logout" onClick={() => { handleLogout(); setMenuOpen(false) }}>Log Out</button>
            </li>
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
      <section className="de-hero">
        <div className="de-hero-inner">

          {/* Step progress */}
          <div className="de-breadcrumb">
            <div className="de-step done" onClick={() => navigate('/plan-trip')} title="Choose District">
              <span className="de-step-num">1</span>
              <span className="de-step-label">District</span>
            </div>
            <div className="de-dot-line done" />
            <div className="de-step active">
              <span className="de-step-num">2</span>
              <span className="de-step-label">Places</span>
            </div>
            <div className="de-dot-line" />
            <div className="de-step">
              <span className="de-step-num">3</span>
              <span className="de-step-label">Preferences</span>
            </div>
            <div className="de-dot-line" />
            <div className="de-step">
              <span className="de-step-num">4</span>
              <span className="de-step-label">Hotel</span>
            </div>
            <div className="de-dot-line" />
            <div className="de-step">
              <span className="de-step-num">5</span>
              <span className="de-step-label">Budget</span>
            </div>
            <div className="de-dot-line" />
            <div className="de-step">
              <span className="de-step-num">6</span>
              <span className="de-step-label">Details</span>
            </div>
          </div>

          <p className="de-eyebrow">🗺️ Step 2 — Pick Your Places</p>
          <h1>Explore <em>{district.name}</em></h1>
          <p className="de-hero-sub">{district.description}</p>

          <div className="de-dest-pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {district.province} Province
            {district.bestFor?.length > 0 && <>
              <span className="de-pill-divider">·</span>
              {district.bestFor.slice(0, 3).join(' · ')}
            </>}
          </div>

        </div>
      </section>

      {/* ── Body ── */}
      <div className="de-body">
        <div className="de-body-grid" ref={deLayoutRef}>

        {/* ── Places ── */}
        <main className="de-main" onClick={e => e.stopPropagation()}>

          {/* Section header */}
          <div className="de-section-header">
            <div className="de-section-title">
              <h2>
                Places to Visit
                <span className="de-count-badge">{visiblePlaces.length}</span>
              </h2>
              <p className="de-section-sub">
                Tap a card to add it to your itinerary
                {hasInterestSignals && (
                  <span className="de-match-summary"> · {matchedVisibleCount} matched to your interests</span>
                )}
              </p>
            </div>

            <div className="de-filters-panel">
              <div className="de-search-wrap" role="search">
                <svg className="de-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="16.65" y1="16.65" x2="21" y2="21" />
                </svg>
                <input
                  type="text"
                  className="de-search-input"
                  placeholder="Search places by name, type, or keyword"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search places"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="de-search-clear"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear place search"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Type filter */}
              <div className="de-type-filter">
                {types.map(t => (
                  <button
                    key={t}
                    className={`de-type-pill ${filterType === t ? 'active' : ''}`}
                    onClick={() => setFilterType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {hasInterestSignals && (
                <div className="de-match-filter-row">
                  <button
                    type="button"
                    className={`de-match-toggle ${showMatchesOnly ? 'active' : ''}`}
                    onClick={() => setShowMatchesOnly(v => !v)}
                  >
                    {showMatchesOnly ? 'Showing matches only' : 'Show matches only'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="de-places-grid">
            {/* ── Regular Places ── */}
            {placesLoading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="de-skel-card">
                  <div className="de-skel-img" />
                  <div className="de-skel-body">
                    <div className="de-skel-line w80" />
                    <div className="de-skel-line w50" />
                    <div className="de-skel-line w90" />
                    <div className="de-skel-line w65" />
                  </div>
                </div>
              ))
            ) : visiblePlaces.length === 0 ? (
              <p className="de-section-sub" style={{ gridColumn: '1/-1', padding: '2rem 0' }}>
                {showMatchesOnly && hasInterestSignals
                  ? 'No places matched your interests in this filter. Try turning off match-only.'
                  : (searchNeedle ? 'No places match your search in this district.' : 'No places found for this district yet.')}
              </p>
            ) : visiblePlaces.map(place => (
              <PlaceCard
                key={place.id}
                place={place}
                districtId={district.id}
                district={district}
                selected={!!selectedPlaces.find(p => p.id === place.id)}
                onToggle={togglePlace}
                isSaved={savedIds.has(`de_${district.id}_${place.id}`)}
                onSave={toggleSave}
              />
            ))}
          </div>

          {/* ── Selection summary + CTA ── */}
          <div className="de-cta-bar">
            <button className="de-back-btn" onClick={() => navigate('/plan-trip')}>
              ← Back
            </button>

            <div className="de-cta-summary">
              {selectedPlaces.length === 0 ? (
                <span className="de-cta-hint">No places selected yet — tap a card to add</span>
              ) : (
                <div className="de-footer-strip">
                  {selectedPlaces.map(p => {
                    const fallback = TYPE_IMAGES[p.type] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=60'
                    const img = p.image || fallback
                    return (
                      <div key={p.id} className="de-footer-chip">
                        <div className="de-footer-chip-img-wrap">
                          <img src={img} alt={p.name} className="de-footer-chip-img" />
                          <button
                            type="button"
                            className="de-footer-chip-remove"
                            onClick={() => togglePlace(p)}
                            title="Remove"
                          >✕</button>
                        </div>
                        <div className="de-footer-chip-meta">
                          <span className="de-footer-chip-name">{p.name}</span>
                          {p.duration && <span className="de-footer-chip-dur">⏱ {p.duration}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <button
              className="de-continue-btn"
              onClick={handleContinue}
            >
              Continue
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12,5 19,12 12,19"/>
              </svg>
            </button>
          </div>
        </main>

        {/* ── Right Panel (AI + Map) ── */}
        <aside className="de-right-panel" ref={dePanelRef} onClick={e => e.stopPropagation()}>

          {/* AI Recommendations carousel */}
          {(aiLoading || aiRecommendations.length > 0) && (
            <div className="de-ai-section de-ai-panel">
              <div className="de-ai-section-header">
                <div className="de-ai-title-group">
                  <span className="de-ai-icon">🤖</span>
                  <div>
                    <h3 className="de-ai-title">AI Picks for You</h3>
                  </div>
                </div>
                {!aiLoading && aiRecommendations.length > 0 && (
                  <span className="de-ai-badge">{aiRecommendations.length} picks</span>
                )}
              </div>
              <p className="de-ai-desc">
                <span className="de-ai-desc-dot" />
                Top {aiLoading ? '10' : aiRecommendations.length} places ranked by our system — scored on your travel interests, preferred types, and live weather compatibility for <strong>{district.name}</strong>.
              </p>

              {aiLoading ? (
                <div className="de-ai-carousel">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="de-ai-skel de-ai-skel--compact">
                      <div className="de-ai-skel-img" />
                      <div className="de-ai-skel-body">
                        <div className="de-ai-skel-line w70" />
                        <div className="de-ai-skel-line w45" />
                        <div className="de-ai-skel-line w85" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="de-ai-carousel">
                  {aiRecommendations.map(place => {
                    const isSelected = !!selectedPlaces.find(p => p.id === place.id)
                    const c = TYPE_COLOURS[place.type] || { bg: '#F3F4F6', text: '#374151' }
                    const fallback = TYPE_IMAGES[place.type] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&auto=format'
                    const scorePct = Math.round((place.aiScore || 0) * 100)
                    const weatherInfo = weatherPresentation(place.aiWeather)
                    const weatherPrefMatch = matchesPreferredWeather(place.aiWeather, userPreferredWeather)
                    const displayName = place.name
                      ? place.name.replace(/\b\w/g, c => c.toUpperCase())
                      : 'Unknown Place'
                    return (
                      <div
                        key={place.id}
                        className={`de-ai-card${isSelected ? ' de-ai-card--selected' : ''}`}
                      >
                        {/* Image */}
                        <div className="de-ai-card-img-wrap" onClick={() => togglePlace(place)}>
                          <img
                            src={place.image || fallback}
                            alt={displayName}
                            className="de-ai-card-img"
                            onError={e => { e.target.src = fallback }}
                            loading="lazy"
                          />
                          <span className="de-ai-type-badge" style={{ background: c.bg, color: c.text }}>
                            {TYPE_EMOJIS[place.type] || '📍'} {place.type || 'Place'}
                          </span>
                          {place.duration && (
                            <span className="de-ai-dur-badge">⏱ {place.duration}</span>
                          )}
                          {isSelected && (
                            <div className="de-ai-selected-overlay">
                              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="36" height="36"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                          )}
                          {/* Score bar on image bottom */}
                          <div className="de-ai-img-score-bar">
                            <div className="de-ai-img-score-fill" style={{ width: `${scorePct}%` }} />
                          </div>
                          <div className="de-ai-score-pill">
                            <span className="de-ai-score-val">{scorePct}%</span>
                            <span className="de-ai-score-lbl"> match</span>
                          </div>
                        </div>

                        {/* Body */}
                        <div className="de-ai-card-body">
                          <h4 className="de-ai-card-name">{displayName}</h4>
                          {place.aiReason && (
                            <p className="de-ai-reason">🎯 {place.aiReason}</p>
                          )}
                          {(place.aiWeather || place.temperature) && (
                            <span className="de-ai-weather">
                              {weatherInfo.emoji} {weatherInfo.label}
                              {place.temperature ? ` · ${Math.round(place.temperature)}°C` : ''}
                            </span>
                          )}
                          {place.tags.length > 0 && (
                            <div className="de-ai-tags">
                              {place.tags.slice(0, 3).map(t => (
                                <span key={t} className="de-ai-tag">{t}</span>
                              ))}
                              {weatherPrefMatch && <span className="de-ai-tag">🌦️ Matches your weather preference</span>}
                            </div>
                          )}
                          {place.tags.length === 0 && weatherPrefMatch && (
                            <div className="de-ai-tags">
                              <span className="de-ai-tag">🌦️ Matches your weather preference</span>
                            </div>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="de-ai-card-footer">
                          <button
                            className={`de-ai-add-btn${isSelected ? ' added' : ''}`}
                            onClick={() => togglePlace(place)}
                          >
                            {isSelected ? (
                              <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg> In your trip</>
                            ) : (
                              <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add to trip</>
                            )}
                          </button>
                          {place.rating > 0 && (
                            <span className="de-ai-rating">⭐ {place.rating.toFixed(1)}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Map panel */}
          <div className="de-map-panel">
            <div className="de-map-panel-head">
              <span className="de-map-panel-title">
                🗺️ Map
                {mapPins.length > 0 && (
                  <span className="de-map-panel-count">{mapPins.length} places</span>
                )}
              </span>
              {selectedPlaces.length > 0 && (
                <span className="de-map-panel-sel">
                  <span className="de-map-dot-yellow" /> {selectedPlaces.length} selected
                </span>
              )}
            </div>
            {mapPins.length === 0 && !placesLoading ? (
              <div className="de-map-empty">
                <span>📍</span>
                <p>No coordinates available for these places yet.</p>
              </div>
            ) : (
              <div className="de-map-wrap">
                <MapContainer
                  center={SRI_LANKA_CENTER}
                  zoom={9}
                  className="de-map"
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapFitBounds pins={mapPins} focusPin={mapPins.find(p => p.id === focusedPlaceId) ?? null} />
                  <DeMapCapture mapRef={deMapRef} />
                  <DeResetOnMapClick pins={mapPins} />
                  {mapPins.map(pin => (
                    <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={pin.icon}>
                      <Popup>
                        <div className="de-map-popup">
                          {(pin.image || TYPE_IMAGES[pin.type]) && (
                            <img
                              src={pin.image || TYPE_IMAGES[pin.type]}
                              alt={pin.name}
                              className="de-map-popup-img"
                              onError={e => { e.target.style.display = 'none' }}
                            />
                          )}
                          <div className="de-map-popup-body">
                            <span className="de-map-popup-type">{TYPE_EMOJIS[pin.type] || '📍'} {pin.type || 'Place'}</span>
                            <strong className="de-map-popup-name">{pin.name}</strong>
                            {pin.duration && <span className="de-map-popup-dur">⏱ {pin.duration}</span>}
                            <div className="de-map-popup-actions">
                              <button
                                className={`de-map-popup-add ${pin.isSelected ? 'added' : ''}`}
                                onClick={() => { togglePlace(pin); }}
                              >
                                {pin.isSelected ? '✓ In trip' : '+ Add to trip'}
                              </button>
                              <button
                                className="de-map-popup-scroll"
                                onClick={() => scrollToCard(pin)}
                              >
                                View card
                              </button>
                            </div>
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

        </div>{/* end de-body-grid */}
      </div>
    </div>
  )
}

export default DistrictExplore
