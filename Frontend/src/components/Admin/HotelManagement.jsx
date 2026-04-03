import { useState, useEffect, useCallback } from 'react'
import './HotelManagement.css'
import { API_BASE } from '../../config/api'
import placeholderImg from '../../assets/placeholder.svg'
import { validateTitle, validatePhone, validateEmail, validatePositiveNumber, normalizePhone, validateUrl } from '../../utils/validation'

const API = API_BASE

const toAbsoluteAssetUrl = (value) => {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  const normalizedBase = API.replace(/\/api\/?$/, '')
  const normalizedPath = value.startsWith('/') ? value : `/${value}`
  return `${normalizedBase}${normalizedPath}`
}

const authH = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

const HOTEL_TYPES = ['hotel', 'resort', 'hostel', 'guesthouse', 'apartment', 'villa', 'motel', 'boutique']

const TYPE_COLORS = {
  hotel:      { bg: '#eef2ff', text: '#6366f1' },
  resort:     { bg: '#fef3c7', text: '#d97706' },
  hostel:     { bg: '#dbeafe', text: '#2563eb' },
  guesthouse: { bg: '#dcfce7', text: '#16a34a' },
  apartment:  { bg: '#fce7f3', text: '#db2777' },
  villa:      { bg: '#f3e8ff', text: '#7c3aed' },
  motel:      { bg: '#fff7ed', text: '#ea580c' },
  boutique:   { bg: '#ecfdf5', text: '#059669' },
}
const TYPE_ICONS = {
  hotel:      '🏨',
  resort:     '🌴',
  hostel:     '🛌',
  guesthouse: '🏡',
  apartment:  '🏢',
  villa:      '🌺',
  motel:      '🚗',
  boutique:   '✨',
}

const CURRENCIES = [
  { code: 'LKR', symbol: 'Rs.', label: '🇱🇰 LKR – Sri Lankan Rupee', rate: 1 },
  { code: 'USD', symbol: '$',   label: '🇺🇸 USD – US Dollar',       rate: 0.0031 },
  { code: 'EUR', symbol: '€',   label: '🇪🇺 EUR – Euro',            rate: 0.0029 },
]

const convertPrice = (lkrAmount, currencyCode) => {
  const c = CURRENCIES.find(x => x.code === currencyCode)
  if (!c || c.rate === 1) return Math.round(lkrAmount)
  return (lkrAmount * c.rate).toFixed(2)
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
const AMENITY_OPTIONS = Object.keys(AMENITY_MAP)
const normalizeAmenity = (a) => a.toLowerCase().replace(/[\s-]+/g, '_')

const inferDestinationName = (hotel) => {
  const rawAddress = (hotel?.address_text || hotel?.place?.address_text || '').trim()
  if (rawAddress.includes(',')) {
    const parts = rawAddress.split(',').map(p => p.trim()).filter(Boolean)
    const candidate = parts[parts.length - 1]
    if (candidate && !/^\d+$/.test(candidate)) return candidate
  }

  const baseName = (hotel?.place?.name || hotel?.name || '').trim()
  if (!baseName) return ''

  const stripped = baseName
    .replace(/\b(resort|hotel|hostel|guesthouse|apartment|villa|motel|boutique)\b/ig, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  return stripped && stripped.toLowerCase() !== baseName.toLowerCase() ? stripped : ''
}

const EMPTY_FORM = {
  name: '', hotel_type: 'hotel', star_class: 3, address_text: '',
  district_id: '', nearby_place_id: '', price_per_night: '', amenities: [],
  description: '', lat: '', lng: '',
  contact_phone: '', contact_email: '', contact_website: '',
  imageUrl: '',
}

const mapHotel = (h) => {
  const inferredDestination = inferDestinationName(h)
  const nearbyName = h.nearbyPlace?.name || inferredDestination || h.place?.name || ''

  return {
    ...h,
    name:          h.name          || h.place?.name        || '',
    place_name:    h.place?.name || '',
    description:   h.description   || h.place?.description || '',
    district_id:   h.place?.district_id || null,
    district_name: h.place?.district?.name     || '',
    nearby_place_id: h.nearby_place_id || h.nearbyPlace?.place_id || '',
    nearby_place_name: nearbyName,
    province:      h.place?.district?.province || '',
    address_text:  h.address_text  || h.place?.address_text || '',
    contact_phone:   h.contact?.phone   || '',
    contact_email:   h.contact?.email   || '',
    contact_website: h.contact?.website || '',
    lat:           h.place?.lat  || '',
    lng:           h.place?.lng  || '',
    imageUrl:      toAbsoluteAssetUrl(h.image_url || h.place?.image_url || h.place?.images?.[0]?.image_url || ''),
    images:        h.place?.images || [],
    hotel_type:    h.hotel_type || 'hotel',
    star_class:    h.star_class || 0,
    price_per_night: parseFloat(h.price_per_night) || 0,
    amenities:     Array.isArray(h.amenities) ? h.amenities.map(normalizeAmenity) : [],
    rating:        parseFloat(h.rating) || 0,
    review_count:  h.review_count || 0,
    isActive:      h.place?.isActive !== false,
  }
}

function HotelManagement() {
  const PREVIEW_COUNT = 9
  const [hotels, setHotels]       = useState([])
  const [districts, setDistricts] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [toast, setToast]         = useState(null)

  // Filters
  const [search, setSearch]                 = useState('')
  const [filterType, setFilterType]         = useState('all')
  const [filterDistrict, setFilterDistrict] = useState('all')
  const [filterStatus, setFilterStatus]     = useState('all')
  const [sortBy, setSortBy]                 = useState('rating')
  const [currency, setCurrency]             = useState('LKR')

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('add')   // 'add' | 'edit'
  const [selected, setSelected]   = useState(null)
  const [formData, setFormData]   = useState(EMPTY_FORM)
  const [noContactDetails, setNoContactDetails] = useState(false)
  const [saving, setSaving]           = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [collapsedDistricts, setCollapsedDistricts] = useState({})
  const [expandedDistricts, setExpandedDistricts] = useState({})
  const [imageFiles, setImageFiles]         = useState([])
  const [existingImages, setExistingImages] = useState([])
  const [districtPlaces, setDistrictPlaces] = useState([])  // places for selected district
  const [loadingPlaces, setLoadingPlaces]   = useState(false)

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const loadHotels = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res  = await fetch(`${API}/hotels?limit=all&includeInactive=true`, { headers: authH() })
      const data = await res.json()
      if (data.success) setHotels(data.data.map(mapHotel))
      else setError(data.message || 'Failed to load hotels')
    } catch { setError('Cannot connect to server.') }
    finally { setLoading(false) }
  }, [])

  const loadDistricts = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/districts`, { headers: authH() })
      const data = await res.json()
      if (data.success) setDistricts(data.data)
    } catch {
      // Optional list load failure should not block hotel view.
    }
  }, [])

  useEffect(() => { loadHotels(); loadDistricts() }, [loadHotels, loadDistricts])

  // Stats
  const stats = {
    total:    hotels.length,
    active:   hotels.filter(h => h.isActive).length,
    avgPriceLKR: hotels.length
      ? Math.round(hotels.reduce((s, h) => s + h.price_per_night, 0) / hotels.length)
      : 0,
    avgRating: hotels.length
      ? (hotels.reduce((s, h) => s + (h.rating || 0), 0) / hotels.length).toFixed(1)
      : '0.0',
    totalReviews: hotels.reduce((s, h) => s + (h.review_count || 0), 0),
  }

  const openAdd = () => {
    setModalMode('add'); setSelected(null)
    setFormData(EMPTY_FORM); setImageFiles([]); setExistingImages([])
    setNoContactDetails(false)
    setShowModal(true)
  }

  const openEdit = (hotel) => {
    setModalMode('edit'); setSelected(hotel)
    setFormData({
      name:                hotel.name,
      hotel_type:          hotel.hotel_type,
      star_class:          hotel.star_class,
      address_text:        hotel.address_text,
      district_id:         hotel.district_id || '',
      nearby_place_id:     hotel.nearby_place_id || '',
      price_per_night:     hotel.price_per_night,
      amenities:           Array.isArray(hotel.amenities) ? [...hotel.amenities] : [],
      description:         hotel.description,
      lat:                 hotel.lat || '',
      lng:                 hotel.lng || '',
      contact_phone:       hotel.contact_phone   || '',
      contact_email:       hotel.contact_email   || '',
      contact_website:     hotel.contact_website || '',
      imageUrl:            '',
    })
    loadDistrictPlaces(hotel.district_id || '')
    setImageFiles([]); setExistingImages(hotel.images || [])
    setNoContactDetails(!hotel.contact_phone && !hotel.contact_email && !hotel.contact_website)
    setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setSelected(null); setDistrictPlaces([]); setNoContactDetails(false) }

  const loadDistrictPlaces = async (districtId) => {
    if (!districtId) { setDistrictPlaces([]); return }
    setLoadingPlaces(true)
    try {
      const res  = await fetch(`${API}/destinations?district_id=${districtId}&limit=all&includeInactive=true`, { headers: authH() })
      const data = await res.json()
      if (data.success) {
        const sortedPlaces = [...(data.data || [])].sort((a, b) =>
          (a?.name || '').localeCompare(b?.name || '', undefined, { sensitivity: 'base' })
        )
        setDistrictPlaces(sortedPlaces)
      }
      else setDistrictPlaces([])
    } catch { setDistrictPlaces([]) }
    finally { setLoadingPlaces(false) }
  }

  const handleDistrictChange = (districtId) => {
    setFormData(prev => ({ ...prev, district_id: districtId, nearby_place_id: '', lat: '', lng: '' }))
    loadDistrictPlaces(districtId)
  }

  const handleNearbyPlaceChange = (placeId) => {
    const place = districtPlaces.find(p => String(p.place_id) === placeId)
    setFormData(prev => ({
      ...prev,
      nearby_place_id: placeId,
      lat: place?.lat ? String(place.lat) : prev.lat,
      lng: place?.lng ? String(place.lng) : prev.lng,
    }))
  }

  const uploadImages = async (placeId, urlValue) => {
    const token = localStorage.getItem('token')
    for (const { file } of imageFiles) {
      const fd = new FormData()
      fd.append('images', file)
      await fetch(`${API}/places/${placeId}/images`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      })
    }
    if (urlValue?.trim()) {
      await fetch(`${API}/places/${placeId}/images/url`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ image_url: urlValue.trim() }),
      })
    }
  }

  const handleDeleteImage = async (imageId) => {
    const res  = await fetch(`${API}/places/images/${imageId}`, { method: 'DELETE', headers: authH() })
    const data = await res.json()
    if (data.success) setExistingImages(imgs => imgs.filter(i => i.image_id !== imageId))
    else setError(data.message || 'Failed to delete image')
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    // --- Validations ---
    const nameCheck = validateTitle(formData.name, 'Hotel name')
    if (!nameCheck.valid) { setError(nameCheck.message); setSaving(false); return }
    if (modalMode === 'add' && !formData.district_id) {
      setError('Please select a district for the hotel'); setSaving(false); return
    }
    const priceCheck = validatePositiveNumber(formData.price_per_night, 'Price per night')
    if (!priceCheck.valid) { setError(priceCheck.message); setSaving(false); return }
    if (formData.contact_phone) {
      const phoneCheck = validatePhone(formData.contact_phone)
      if (!phoneCheck.valid) { setError(phoneCheck.message); setSaving(false); return }
    }
    if (formData.contact_email) {
      const emailCheck = validateEmail(formData.contact_email)
      if (!emailCheck.valid) { setError(emailCheck.message); setSaving(false); return }
    }
    if (formData.contact_website) {
      const webCheck = validateUrl(formData.contact_website)
      if (!webCheck.valid) { setError(webCheck.message); setSaving(false); return }
    }
    if (!noContactDetails && !formData.contact_phone && !formData.contact_email && !formData.contact_website) {
      setError('Please provide at least one contact detail — Phone, Email, or Website.'); setSaving(false); return
    }
    const starVal = parseInt(formData.star_class)
    if (isNaN(starVal) || starVal < 1 || starVal > 5) { setError('Star rating must be between 1 and 5.'); setSaving(false); return }
    // --- End Validations ---
    try {
      const body = {
        ...(modalMode === 'add'
          ? {
              district_id:  parseInt(formData.district_id),
              name:         formData.name,
              description:  formData.description,
              address_text: formData.address_text,
              lat:          parseFloat(formData.lat)  || null,
              lng:          parseFloat(formData.lng)  || null,
              nearby_place_id: formData.nearby_place_id ? parseInt(formData.nearby_place_id, 10) : null,
            }
          : {
              name:         formData.name,
              description:  formData.description,
              district_id:  parseInt(formData.district_id) || null,
              address_text: formData.address_text,
              lat:          parseFloat(formData.lat)  || null,
              lng:          parseFloat(formData.lng)  || null,
              nearby_place_id: formData.nearby_place_id ? parseInt(formData.nearby_place_id, 10) : null,
            }
        ),
        hotel_type:          formData.hotel_type,
        image_url:           formData.imageUrl?.trim() || null,
        star_class:          parseInt(formData.star_class),
        price_per_night:     parseFloat(formData.price_per_night) || 0,
        amenities:           formData.amenities,
        contact: {
          phone:   formData.contact_phone   || '',
          email:   formData.contact_email   || '',
          website: formData.contact_website || '',
        },
      }
      let placeId
      if (modalMode === 'add') {
        const res  = await fetch(`${API}/hotels`, { method: 'POST', headers: authH(), body: JSON.stringify(body) })
        const data = await res.json()
        if (!data.success) { setError(data.message || 'Failed to create hotel'); setSaving(false); return }
        placeId = data.data.place_id
        showToast('✅ Hotel created')
      } else {
        const res  = await fetch(`${API}/hotels/${selected.hotel_id}`, { method: 'PUT', headers: authH(), body: JSON.stringify(body) })
        const data = await res.json()
        if (!data.success) { setError(data.message || 'Failed to update hotel'); setSaving(false); return }
        placeId = selected.place_id
        showToast('✅ Hotel updated')
      }
      if (placeId) await uploadImages(placeId, formData.imageUrl)
      const savedScroll = window.scrollY
      closeModal()
      await loadHotels()
      window.requestAnimationFrame(() => window.scrollTo({ top: savedScroll, behavior: 'instant' }))
    } catch { setError('Network error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (hotel) => {
    setDeleteConfirm(hotel)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    try {
      const res  = await fetch(`${API}/hotels/${deleteConfirm.hotel_id}`, { method: 'DELETE', headers: authH() })
      const data = await res.json()
      if (data.success) {
        showToast('🗑️ Hotel deleted', 'delete')
        const savedScroll = window.scrollY
        await loadHotels()
        window.requestAnimationFrame(() => window.scrollTo({ top: savedScroll, behavior: 'instant' }))
      } else setError(data.message || 'Failed to delete hotel')
    } catch { setError('Network error') }
    finally { setDeleteConfirm(null) }
  }

  const toggleAmenity = (a) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter(x => x !== a)
        : [...prev.amenities, a],
    }))
  }

  // Filtered + sorted list
  const filtered = hotels
    .filter(h => {
      if (filterType !== 'all' && h.hotel_type !== filterType) return false
      if (filterDistrict !== 'all' && String(h.district_id) !== filterDistrict) return false
      if (filterStatus === 'active'   && !h.isActive)    return false
      if (filterStatus === 'inactive' &&  h.isActive)    return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !h.name.toLowerCase().includes(q) &&
          !h.district_name.toLowerCase().includes(q) &&
          !h.nearby_place_name.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
    .sort((a, b) => {
      const effectiveSortBy = filterStatus === 'all' ? 'rating' : sortBy
      if (effectiveSortBy === 'name')       return a.name.localeCompare(b.name)
      if (effectiveSortBy === 'price-low')  return a.price_per_night - b.price_per_night
      if (effectiveSortBy === 'price-high') return b.price_per_night - a.price_per_night
      return b.rating - a.rating
    })

  // Group by district for collapsible sections
  const groupedByDistrict = filtered.reduce((acc, hotel) => {
    const key = hotel.district_name || 'Unknown District'
    if (!acc[key]) acc[key] = []
    acc[key].push(hotel)
    return acc
  }, {})
  const districtNames = Object.keys(groupedByDistrict).sort()
  const toggleDistrict = (name) =>
    setCollapsedDistricts(prev => ({ ...prev, [name]: !prev[name] }))
  const toggleExpandDistrict = (name) => {
    const wasExpanded = !!expandedDistricts[name]
    setExpandedDistricts(prev => ({ ...prev, [name]: !prev[name] }))

    // When collapsing back to preview mode, keep the user anchored to this section.
    if (wasExpanded) {
      window.requestAnimationFrame(() => {
        const section = document.getElementById(`hm2-district-${encodeURIComponent(name)}`)
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }

  return (
    <div className="hm2">
      {toast && <div className={`admin-toast ${toast.type}`}>{toast.msg}</div>}
      {error && (
        <div className="admin-error-banner">
          {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Header */}
      <div className="hm2-header">
        <div>
          <h1 className="hm2-title">🏨 Hotel Management</h1>
          <p className="hm2-subtitle">Manage accommodation listings across Sri Lanka</p>
        </div>
        <button className="hm2-btn-add" onClick={openAdd}>+ Add Hotel</button>
      </div>

      {/* Stats */}
      <div className="hm2-stats">
        <div className="hm2-stat-card">
          <div className="hm2-stat-icon" style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}>🏨</div>
          <div><p className="hm2-stat-value">{loading ? '…' : stats.total}</p><p className="hm2-stat-label">Total Hotels</p></div>
        </div>
        <div className="hm2-stat-card">
          <div className="hm2-stat-icon" style={{ background: 'linear-gradient(135deg,#10b981,#34d399)' }}>✅</div>
          <div><p className="hm2-stat-value">{loading ? '…' : stats.active}</p><p className="hm2-stat-label">Active</p></div>
        </div>
        <div className="hm2-stat-card">
          <div className="hm2-stat-icon" style={{ background: 'linear-gradient(135deg,#f59e0b,#fbbf24)' }}>⭐</div>
          <div><p className="hm2-stat-value">{loading ? '…' : stats.avgRating}</p><p className="hm2-stat-label">Avg Rating ({Math.round(stats.totalReviews)} reviews)</p></div>
        </div>
        <div className="hm2-stat-card">
          <div className="hm2-stat-icon" style={{ background: 'linear-gradient(135deg,#ec4899,#f472b6)' }}>💰</div>
          <div><p className="hm2-stat-value">{loading ? '…' : `${CURRENCIES.find(c => c.code === currency)?.symbol}${Number(convertPrice(stats.avgPriceLKR, currency)).toLocaleString()}`}</p><p className="hm2-stat-label">Avg / Night</p></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="hm2-toolbar">
        <div className="hm2-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search name or district…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="hm2-search-input"
          />
          {search && <button className="hm2-search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>

        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="hm2-select">
          <option value="all">All Types</option>
          {HOTEL_TYPES.map(t => (
            <option key={t} value={t}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>

        <select value={filterDistrict} onChange={(e) => setFilterDistrict(e.target.value)} className="hm2-select">
          <option value="all">All Districts</option>
          {districts.map(d => (
            <option key={d.district_id} value={String(d.district_id)}>{d.name}</option>
          ))}
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="hm2-select">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="hm2-select">
          <option value="rating">Top Rated</option>
          <option value="price-low">Price ↑</option>
          <option value="price-high">Price ↓</option>
          <option value="name">Name A–Z</option>
        </select>

        <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="hm2-select">
          {CURRENCIES.map(c => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Card Grid — grouped by district */}
      <div className="hm2-district-container">
        {loading ? (
          <div className="admin-loading"><div className="admin-spinner" /><p>Loading hotels…</p></div>
        ) : districtNames.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🏨</span>
            <h3>No hotels found</h3>
            <p>Try adjusting your filters or add a new hotel.</p>
          </div>
        ) : (
          districtNames.map(districtName => {
            const hotelsInDistrict = groupedByDistrict[districtName]
            const isCollapsed = collapsedDistricts[districtName]
            const isExpanded = expandedDistricts[districtName]
            const visibleHotels = isExpanded ? hotelsInDistrict : hotelsInDistrict.slice(0, PREVIEW_COUNT)
            return (
              <div
                key={districtName}
                id={`hm2-district-${encodeURIComponent(districtName)}`}
                className="hm2-district-section"
              >
                <button
                  type="button"
                  className="hm2-district-header"
                  onClick={() => toggleDistrict(districtName)}
                >
                  <div className="hm2-district-title">
                    <span className={`hm2-chevron${isCollapsed ? '' : ' open'}`}>▶</span>
                    <span className="hm2-district-name">📍 {districtName}</span>
                    <span className="hm2-district-count">{hotelsInDistrict.length} hotel{hotelsInDistrict.length !== 1 ? 's' : ''}</span>
                  </div>
                </button>

                {!isCollapsed && (
                  <>
                  <div className="hm2-card-grid">
                    {visibleHotels.map(hotel => {
                      const tc = TYPE_COLORS[hotel.hotel_type] || { bg: '#f3f4f6', text: '#374151' }
                      const ti = TYPE_ICONS[hotel.hotel_type]  || '🏨'
                      return (
                        <div className="hm2-hotel-card" key={hotel.hotel_id}>
                          <div className="hm2-card-image-wrap">
                            <img
                              src={hotel.imageUrl || placeholderImg}
                              alt={hotel.name}
                              className="hm2-card-image"
                              onError={e => { e.target.onerror = null; e.target.src = placeholderImg }}
                            />
                            {!hotel.isActive && <span className="hm2-inactive-badge">Inactive</span>}
                            {hotel.nearby_place_name && (
                              <span className="hm2-location-badge">📍 {hotel.nearby_place_name}</span>
                            )}
                          </div>
                          <div className="hm2-card-body">
                            <div className="hm2-card-top">
                              <span className="hm2-type-pill" style={{ background: tc.bg, color: tc.text }}>
                                {ti} {hotel.hotel_type}
                              </span>
                              <span className="hm2-stars">{'⭐'.repeat(hotel.star_class || 0)}</span>
                            </div>
                            <h3 className="hm2-card-name">{hotel.name}</h3>
                            {hotel.address_text && (
                              <p className="hm2-card-address">{hotel.address_text}</p>
                            )}
                            {hotel.description && (
                              <p className="hm2-card-desc">{hotel.description}</p>
                            )}
                            {(hotel.contact_phone || hotel.contact_email || hotel.contact_website) && (
                              <div className="hm2-card-contact">
                                {hotel.contact_phone && <span>📞 {hotel.contact_phone}</span>}
                                {hotel.contact_email && <span>✉️ {hotel.contact_email}</span>}
                                {hotel.contact_website && <span>🌐 {hotel.contact_website}</span>}
                              </div>
                            )}
                            {hotel.amenities.length > 0 && (
                              <div className="hm2-amenities">
                                {hotel.amenities.slice(0, 3).map((a, i) => (
                                  <span key={i} className="hm2-amenity-tag">{AMENITY_MAP[a]?.emoji || '✨'} {AMENITY_MAP[a]?.label || a}</span>
                                ))}
                                {hotel.amenities.length > 3 && (
                                  <span className="hm2-amenity-more">+{hotel.amenities.length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="hm2-card-footer">
                            <div className="hm2-card-meta">
                              <span className="hm2-price">{CURRENCIES.find(c => c.code === currency)?.symbol}{Number(convertPrice(hotel.price_per_night, currency)).toLocaleString()}<small>/night</small></span>
                              <span className="hm2-rating">⭐ {(hotel.rating || 0).toFixed(1)}</span>
                              {hotel.review_count > 0 && <span className="hm2-reviews">{hotel.review_count} reviews</span>}
                            </div>
                            <div className="hm2-card-actions">
                              <button className="hm2-btn-edit"   onClick={() => openEdit(hotel)}    title="Edit">✏️</button>
                              <button className="hm2-btn-delete" onClick={() => handleDelete(hotel)} title="Delete">🗑️</button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {hotelsInDistrict.length > PREVIEW_COUNT && (
                    <div className="hm2-show-more-wrap">
                      <button
                        type="button"
                        className="hm2-show-more-btn"
                        onClick={() => toggleExpandDistrict(districtName)}
                      >
                        {isExpanded
                          ? 'Show less'
                          : `Show all (${hotelsInDistrict.length - PREVIEW_COUNT} more)`}
                      </button>
                    </div>
                  )}
                  </>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="hm2-modal" onClick={e => e.stopPropagation()}>
            <div className="hm2-modal-header">
              <h2>{modalMode === 'add' ? '🏨 Add New Hotel' : '✏️ Edit Hotel'}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="hm2-form">
              {modalMode === 'add' ? (
                <>
                  {/* ADD — District + Hotel Type */}
                  <div className="hm2-form-row">
                    <div className="form-group">
                      <label>District *</label>
                      <select
                        value={formData.district_id}
                        onChange={e => handleDistrictChange(e.target.value)}
                        required
                      >
                        <option value="">— Select District —</option>
                        {districts.map(d => (
                          <option key={d.district_id} value={d.district_id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Hotel Type *</label>
                      <select
                        value={formData.hotel_type}
                        onChange={e => setFormData({ ...formData, hotel_type: e.target.value })}
                        required
                      >
                        {HOTEL_TYPES.map(t => (
                          <option key={t} value={t}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* ADD — Nearby Place (loads after district selected) */}
                  {formData.district_id && (
                    <div className="form-group">
                      <label>📍 Belongs to Destination <span className="label-hint">(optional, auto-fills coordinates)</span></label>
                      <select
                        value={formData.nearby_place_id}
                        onChange={e => handleNearbyPlaceChange(e.target.value)}
                      >
                        <option value="">— Select a destination place (optional) —</option>
                        {loadingPlaces
                          ? <option disabled>Loading places…</option>
                          : districtPlaces.map(p => (
                            <option key={p.place_id} value={p.place_id}>
                              {p.name}{p.type ? ` (${p.type})` : ''}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  )}

                  {/* ADD — Hotel details (shown once district is chosen) */}
                  {formData.district_id && (
                    <>
                      <div className="form-group">
                        <label>Hotel Name *</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g., Cinnamon Grand Colombo"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Address</label>
                        <input
                          type="text"
                          value={formData.address_text}
                          onChange={e => setFormData({ ...formData, address_text: e.target.value })}
                          placeholder="e.g., 77 Galle Road, Colombo 03"
                        />
                      </div>
                      <div className="form-group">
                        <label>Description</label>
                        <textarea
                          value={formData.description}
                          onChange={e => setFormData({ ...formData, description: e.target.value })}
                          rows={3}
                          placeholder="Describe the hotel…"
                        />
                      </div>
                      <div className="hm2-form-row">
                        <div className="form-group">
                          <label>Latitude</label>
                          <input
                            type="number"
                            step="any"
                            value={formData.lat}
                            onChange={e => setFormData({ ...formData, lat: e.target.value })}
                            placeholder="e.g., 6.9271"
                          />
                        </div>
                        <div className="form-group">
                          <label>Longitude</label>
                          <input
                            type="number"
                            step="any"
                            value={formData.lng}
                            onChange={e => setFormData({ ...formData, lng: e.target.value })}
                            placeholder="e.g., 79.8612"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* EDIT — Hotel Name + Hotel Type */}
                  <div className="hm2-form-row">
                    <div className="form-group">
                      <label>Hotel Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Cinnamon Grand Colombo"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Hotel Type *</label>
                      <select
                        value={formData.hotel_type}
                        onChange={e => setFormData({ ...formData, hotel_type: e.target.value })}
                        required
                      >
                        {HOTEL_TYPES.map(t => (
                          <option key={t} value={t}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* EDIT — District (read-only label) + Star Class */}
                  <div className="hm2-form-row">
                    <div className="form-group">
                      <label>District</label>
                      <input
                        type="text"
                        value={districts.find(d => String(d.district_id) === String(formData.district_id))?.name || '—'}
                        readOnly
                        className="input-readonly"
                      />
                    </div>
                    <div className="form-group">
                      <label>📍 Belongs to Destination <span className="label-hint">(shown on hotel card)</span></label>
                      <select
                        value={formData.nearby_place_id}
                        onChange={e => handleNearbyPlaceChange(e.target.value)}
                      >
                        <option value="">— Select a destination place (optional) —</option>
                        {loadingPlaces
                          ? <option disabled>Loading places…</option>
                          : districtPlaces.map(p => (
                            <option key={p.place_id} value={p.place_id}>
                              {p.name}{p.type ? ` (${p.type})` : ''}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  </div>

                  <div className="hm2-form-row">
                    <div className="form-group">
                      <label>Star Class</label>
                      <select
                        value={formData.star_class}
                        onChange={e => setFormData({ ...formData, star_class: e.target.value })}
                      >
                        {[1, 2, 3, 4, 5].map(s => (
                          <option key={s} value={s}>{'⭐'.repeat(s)} ({s}-star)</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* EDIT — Address */}
                  <div className="form-group">
                    <label>Address</label>
                    <input
                      type="text"
                      value={formData.address_text}
                      onChange={e => setFormData({ ...formData, address_text: e.target.value })}
                      placeholder="e.g., 77 Galle Road, Colombo 03"
                    />
                  </div>

                  {/* EDIT — Description */}
                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      placeholder="Describe the hotel…"
                    />
                  </div>

                  {/* EDIT — Coordinates */}
                  <div className="hm2-form-row">
                    <div className="form-group">
                      <label>Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.lat}
                        onChange={e => setFormData({ ...formData, lat: e.target.value })}
                        placeholder="e.g., 6.9271"
                      />
                    </div>
                    <div className="form-group">
                      <label>Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.lng}
                        onChange={e => setFormData({ ...formData, lng: e.target.value })}
                        placeholder="e.g., 79.8612"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="hm2-form-row">
                <div className="form-group">
                  <label>Price per Night (LKR) *</label>
                  <input
                    type="number"
                    value={formData.price_per_night}
                    onChange={e => setFormData({ ...formData, price_per_night: e.target.value })}
                    placeholder="e.g., 15000"
                    min="0" step="0.01"
                    required
                  />
                </div>
                {modalMode === 'add' && (
                  <div className="form-group">
                    <label>Star Class</label>
                    <select
                      value={formData.star_class}
                      onChange={e => setFormData({ ...formData, star_class: e.target.value })}
                    >
                      {[1, 2, 3, 4, 5].map(s => (
                        <option key={s} value={s}>{'⭐'.repeat(s)} ({s}-star)</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Amenities</label>
                <div className="hm2-amenity-grid">
                  {AMENITY_OPTIONS.map(a => (
                    <label
                      key={a}
                      className={`hm2-amenity-check${formData.amenities.includes(a) ? ' checked' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.amenities.includes(a)}
                        onChange={() => toggleAmenity(a)}
                      />
                      {AMENITY_MAP[a]?.emoji && <span>{AMENITY_MAP[a].emoji}</span>} {AMENITY_MAP[a]?.label || a}
                    </label>
                  ))}
                </div>
              </div>

              {/* Contact Information */}
              <div className="form-group">
                <label style={{display:'flex',alignItems:'center',gap:8}}>
                  <span>📞 Contact Details</span>
                  <label className="no-contact-toggle" style={{marginLeft:'auto',fontWeight:400,fontSize:'0.88rem',color:'var(--text-secondary)',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                    <input
                      type="checkbox"
                      checked={noContactDetails}
                      onChange={e => {
                        setNoContactDetails(e.target.checked)
                        if (e.target.checked) setFormData(f => ({ ...f, contact_phone: '', contact_email: '', contact_website: '' }))
                      }}
                      style={{width:15,height:15,cursor:'pointer'}}
                    />
                    No contact details available
                  </label>
                </label>
              </div>
              <div className="hm2-form-row" style={noContactDetails ? {opacity:0.4,pointerEvents:'none'} : {}}>
                <div className="form-group">
                  <label>📞 Phone</label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={e => setFormData({ ...formData, contact_phone: normalizePhone(e.target.value) })}
                    placeholder="e.g., 07XXXXXXXX"
                    inputMode="numeric"
                    maxLength={10}
                    disabled={noContactDetails}
                  />
                </div>
                <div className="form-group">
                  <label>✉️ Email</label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="e.g., reservations@hotel.com"
                    disabled={noContactDetails}
                  />
                </div>
              </div>
              <div className="form-group" style={noContactDetails ? {opacity:0.4,pointerEvents:'none'} : {}}>
                <label>🌐 Website</label>
                <input
                  type="url"
                  value={formData.contact_website}
                  onChange={e => setFormData({ ...formData, contact_website: e.target.value })}
                  placeholder="e.g., https://www.hotel.com"
                  disabled={noContactDetails}
                />
              </div>

              {existingImages.length > 0 && (
                <div className="form-group">
                  <label>Current Images</label>
                  <div className="image-preview-grid">
                    {existingImages.map(img => (
                      <div key={img.image_id} className="img-thumb-wrap">
                        <img src={toAbsoluteAssetUrl(img.image_url)} alt="" className="img-thumb" />
                        <button
                          type="button"
                          className="img-remove-btn"
                          onClick={() => handleDeleteImage(img.image_id)}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {imageFiles.length > 0 && (
                <div className="image-preview-grid">
                  {imageFiles.map((item, idx) => (
                    <div key={idx} className="img-thumb-wrap">
                      <img src={item.preview} alt="" className="img-thumb" />
                      <button
                        type="button"
                        className="img-remove-btn"
                        onClick={() => setImageFiles(f => f.filter((_, i) => i !== idx))}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="hm2-form-row">
                <div className="form-group">
                  <label>Image URL (optional)</label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://…"
                  />
                  {formData.imageUrl?.trim() && (
                    <img
                      key={formData.imageUrl.trim()}
                      src={formData.imageUrl.trim()}
                      alt="URL preview"
                      className="img-thumb"
                      style={{ marginTop: 8, maxHeight: 120, borderRadius: 6, objectFit: 'cover' }}
                      onError={e => { e.target.style.display = 'none' }}
                      onLoad={e => { e.target.style.display = 'block' }}
                    />
                  )}
                </div>
                <div className="form-group">
                  <label>Upload Images</label>
                  <label className="file-upload-label">
                    Choose Files
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      style={{ display: 'none' }}
                      onChange={e => {
                        const files = Array.from(e.target.files).map(f => ({
                          file: f, preview: URL.createObjectURL(f),
                        }))
                        setImageFiles(prev => [...prev, ...files])
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                {error && (
                  <div className="admin-error-banner" style={{ width: '100%', margin: '0 0 10px 0' }}>
                    {error}
                    <button type="button" onClick={() => setError('')}>✕</button>
                  </div>
                )}
                <div className="modal-actions-btns">
                  <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn-submit" disabled={saving}>
                    {saving ? 'Saving…' : modalMode === 'add' ? 'Create Hotel' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirm Dialog ────────────────────────────────────────── */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="hm2-modal" style={{ maxWidth: 420, width: '96vw' }}>
            <div className="hm2-modal-header">
              <h2>🗑️ Delete Hotel</h2>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div style={{ textAlign: 'center', padding: '16px 24px 24px' }}>
              <div style={{ fontSize: '2.8rem' }}>⚠️</div>
              <p style={{ margin: '8px 0 4px', color: 'var(--text-primary)', fontSize: '0.95rem' }}>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?</p>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>This action cannot be undone.</p>
            </div>
            <div className="modal-actions" style={{ padding: '0 24px 20px' }}>
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn-submit" style={{ background: '#ef4444' }} onClick={handleDeleteConfirm}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HotelManagement
