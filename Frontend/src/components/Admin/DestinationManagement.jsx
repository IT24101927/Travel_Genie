import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE } from '../../config/api'
import { validateTitle } from '../../utils/validation'
import './DestinationManagement.css'
import placeholderImg from '../../assets/placeholder.svg'

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

// Place types matching DistrictExplore
const PLACE_TYPES = [
  'Temple', 'Beach', 'Nature', 'Heritage', 'Museum', 'Safari',
  'Wildlife', 'Garden', 'Lake', 'Market', 'Viewpoint', 'Culture',
  'Adventure', 'Park', 'Shopping', 'Theme Park',
]

const TYPE_EMOJIS = {
  Temple: '🛕', Beach: '🏖️', Nature: '🌿', Heritage: '🏛️',
  Museum: '🏛️', Safari: '🐘', Wildlife: '🦁', Garden: '🌸',
  Lake: '🏞️', Market: '🛍️', Viewpoint: '🏔️', Culture: '🎭',
  Adventure: '🧗', Park: '🌳', Shopping: '🛍️', 'Theme Park': '🎢',
}

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

function typePillStyle(type) {
  const c = TYPE_COLOURS[type] || { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' }
  return { background: c.bg, color: c.text, border: `1px solid ${c.border}` }
}

function DestinationManagement() {
  const PREVIEW_COUNT = 9
  const [destinations, setDestinations] = useState([])
  const [districts, setDistricts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterDistrict, setFilterDistrict] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('rating')

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('add')   // 'add' | 'edit'
  const [selectedDestination, setSelectedDestination] = useState(null)
  const [formData, setFormData] = useState({
    name: '', type: 'Temple', district_id: '', description: '',
    duration: '1–2 hrs', status: 'active', imageUrl: '',
    lat: '', lng: '', address_text: '',
  })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [collapsedDistricts, setCollapsedDistricts] = useState({})
  const [expandedDistricts, setExpandedDistricts] = useState({})
  const [imageFiles, setImageFiles] = useState([])
  const [existingImages, setExistingImages] = useState([])

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  // Helper: map API Place row to display-friendly shape
  const mapDest = (d) => ({
    ...d,
    name:        d.name        || '',
    description: d.description || '',
    location:    d.district?.name || '',
    district_id: d.district_id,
    imageUrl:    toAbsoluteAssetUrl(d.image_url || (d.images || [])[0]?.image_url || ''),
    type:        d.type || '',
    duration:    d.duration || '',
    visitors:    d.review_count || 0,
    rating:      parseFloat(d.rating) || 0,
    status:      d.isActive !== false ? 'active' : 'inactive',
    tags:        (d.tags || []).map(t => t.tag_name),
    place_id:    d.place_id,
    lat:         d.lat || '',
    lng:         d.lng || '',
    address_text: d.address_text || '',
  })

  const loadDestinations = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const primaryRes = await fetch(`${API}/destinations?limit=all&includeInactive=true`, { headers: authH() })
      const primaryData = await primaryRes.json()
      if (primaryRes.ok && primaryData.success) {
        setDestinations(primaryData.data.map(mapDest))
        return
      }

      // Fallback query to keep admin list usable if includeInactive path fails.
      const fallbackRes = await fetch(`${API}/destinations?limit=all`, { headers: authH() })
      const fallbackData = await fallbackRes.json()
      if (fallbackRes.ok && fallbackData.success) {
        setDestinations(fallbackData.data.map(mapDest))
        return
      }

      setError(primaryData.error || primaryData.message || fallbackData.error || fallbackData.message || 'Failed to load destinations')
    } catch {
      setError('Cannot connect to server.')
    }
    finally { setLoading(false) }
  }, [])

  const loadDistricts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/districts`, { headers: authH() })
      const data = await res.json()
      if (data.success) setDistricts(data.data)
    } catch {
      // Optional list load failure should not block destination view.
    }
  }, [])

  useEffect(() => { loadDestinations(); loadDistricts() }, [loadDestinations, loadDistricts])

  // Stats
  const stats = {
    total:     destinations.length,
    active:    destinations.filter(d => d.status === 'active').length,
    avgRating: destinations.length > 0
      ? (destinations.reduce((s, d) => s + (d.rating || 0), 0) / destinations.length).toFixed(1)
      : '0.0',
    totalReviews: destinations.reduce((s, d) => s + (d.visitors || 0), 0),
  }

  // Upload images
  const uploadImages = async (placeId, urlValue) => {
    const token = localStorage.getItem('token')
    for (const { file } of imageFiles) {
      const fd = new FormData()
      fd.append('images', file)
      await fetch(`${API}/places/${placeId}/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
    }
    if (urlValue && urlValue.trim()) {
      await fetch(`${API}/places/${placeId}/images/url`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ image_url: urlValue.trim() }),
      })
    }
  }

  const handleDeleteImage = async (imageId) => {
    try {
      const res = await fetch(`${API}/places/images/${imageId}`, { method: 'DELETE', headers: authH() })
      const data = await res.json()
      if (data.success) setExistingImages(imgs => imgs.filter(i => i.image_id !== imageId))
      else setError(data.message || 'Failed to delete image')
    } catch { setError('Network error') }
  }

  const openAdd = () => {
    setModalMode('add'); setSelectedDestination(null)
    setFormData({
      name: '', type: 'Temple', district_id: '',
      description: '', duration: '1–2 hrs',
      status: 'active', imageUrl: '',
      lat: '', lng: '', address_text: '',
    })
    setImageFiles([]); setExistingImages([])
    setShowModal(true)
  }

  const openEdit = (destination) => {
    setModalMode('edit'); setSelectedDestination(destination)
    setFormData({
      name:        destination.name,
      type:        destination.type || 'Temple',
      district_id: destination.district_id || '',
      description: destination.description || '',
      duration:    destination.duration || '1–2 hrs',
      status:      destination.status,
      imageUrl:    destination.imageUrl || '',
      lat:         destination.lat || '',
      lng:         destination.lng || '',
      address_text: destination.address_text || '',
    })
    setImageFiles([]); setExistingImages(destination.images || [])
    setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setSelectedDestination(null) }

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    // --- Validations ---
    const nameCheck = validateTitle(formData.name, 'Destination name')
    if (!nameCheck.valid) { setError(nameCheck.message); setSaving(false); return }
    if (!formData.district_id) { setError('Please select a district.'); setSaving(false); return }
    if (!formData.description.trim()) { setError('Description is required.'); setSaving(false); return }
    // --- End Validations ---
    try {
      const body = {
        name:        formData.name,
        description: formData.description,
        district_id: parseInt(formData.district_id) || null,
        type:        formData.type,
        duration:    formData.duration,
        isActive:    formData.status === 'active',
        lat:         parseFloat(formData.lat) || null,
        lng:         parseFloat(formData.lng) || null,
        address_text: formData.address_text || '',
        image_url:   formData.imageUrl?.trim() || null,
      }

      let placeId
      if (modalMode === 'add') {
        const res  = await fetch(`${API}/destinations`, { method: 'POST', headers: authH(), body: JSON.stringify(body) })
        const data = await res.json()
        if (!data.success) { setError(data.error || data.message || 'Failed to create destination'); setSaving(false); return }
        placeId = data.data.place_id
        showToast('✅ Destination created')
      } else {
        const res  = await fetch(`${API}/destinations/${selectedDestination.place_id}`, { method: 'PUT', headers: authH(), body: JSON.stringify(body) })
        const data = await res.json()
        if (!data.success) { setError(data.error || data.message || 'Failed to update destination'); setSaving(false); return }
        placeId = selectedDestination.place_id
        showToast('✅ Destination updated')
      }
      if (placeId) await uploadImages(placeId, formData.imageUrl)
      const savedScroll = window.scrollY
      closeModal()
      await loadDestinations()
      window.requestAnimationFrame(() => window.scrollTo({ top: savedScroll, behavior: 'instant' }))
    } catch { setError('Network error') }
    finally { setSaving(false) }
  }

  // Handle Delete
  const handleDelete = async (dest) => {
    setDeleteConfirm(dest)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    try {
      const res  = await fetch(`${API}/destinations/${deleteConfirm.place_id}`, { method: 'DELETE', headers: authH() })
      const data = await res.json()
      if (data.success) {
        showToast('🗑️ Destination deleted', 'delete')
        const savedScroll = window.scrollY
        await loadDestinations()
        window.requestAnimationFrame(() => window.scrollTo({ top: savedScroll, behavior: 'instant' }))
      } else setError(data.error || data.message || 'Failed to delete destination')
    } catch { setError('Network error') }
    finally { setDeleteConfirm(null) }
  }

  // Filtered + sorted list
  const filtered = destinations
    .filter(dest => {
      if (filterType !== 'all' && dest.type !== filterType) return false
      if (filterDistrict !== 'all' && String(dest.district_id) !== filterDistrict) return false
      if (filterStatus === 'active'   && dest.status !== 'active')   return false
      if (filterStatus === 'inactive' && dest.status !== 'inactive') return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!dest.name.toLowerCase().includes(q) && !dest.location.toLowerCase().includes(q)) return false
      }
      return true
    })
    .sort((a, b) => {
      const effectiveSortBy = filterStatus === 'all' ? 'rating' : sortBy
      if (effectiveSortBy === 'name')     return a.name.localeCompare(b.name)
      if (effectiveSortBy === 'visitors') return b.visitors - a.visitors
      return b.rating - a.rating
    })

  // Group by district for collapsible sections
  const groupedByDistrict = filtered.reduce((acc, dest) => {
    const key = dest.location || 'Unknown District'
    if (!acc[key]) acc[key] = []
    acc[key].push(dest)
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
        const section = document.getElementById(`dm2-district-${encodeURIComponent(name)}`)
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }

  return (
    <div className="dm2">
      {toast && <div className={`admin-toast ${toast.type}`}>{toast.msg}</div>}
      {error && (
        <div className="admin-error-banner">
          {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Header */}
      <div className="dm2-header">
        <div>
          <h1 className="dm2-title">📍 Destination Management</h1>
          <p className="dm2-subtitle">Manage destinations with AI-powered recommendations</p>
        </div>
        <button className="dm2-btn-add" onClick={openAdd}>+ Add Destination</button>
      </div>

      {/* Stats */}
      <div className="dm2-stats">
        <div className="dm2-stat-card">
          <div className="dm2-stat-icon" style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}>📍</div>
          <div><p className="dm2-stat-value">{loading ? '…' : stats.total}</p><p className="dm2-stat-label">Total Destinations</p></div>
        </div>
        <div className="dm2-stat-card">
          <div className="dm2-stat-icon" style={{ background: 'linear-gradient(135deg,#10b981,#34d399)' }}>✅</div>
          <div><p className="dm2-stat-value">{loading ? '…' : stats.active}</p><p className="dm2-stat-label">Active</p></div>
        </div>
        <div className="dm2-stat-card">
          <div className="dm2-stat-icon" style={{ background: 'linear-gradient(135deg,#f59e0b,#fbbf24)' }}>⭐</div>
          <div><p className="dm2-stat-value">{loading ? '…' : stats.avgRating}</p><p className="dm2-stat-label">Avg Rating</p></div>
        </div>
        <div className="dm2-stat-card">
          <div className="dm2-stat-icon" style={{ background: 'linear-gradient(135deg,#ec4899,#f472b6)' }}>👥</div>
          <div><p className="dm2-stat-value">{loading ? '…' : `${(stats.totalReviews / 1000).toFixed(1)}K`}</p><p className="dm2-stat-label">Total Reviews</p></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="dm2-toolbar">
        <div className="dm2-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search name or location…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="dm2-search-input"
          />
          {searchQuery && <button className="dm2-search-clear" onClick={() => setSearchQuery('')}>✕</button>}
        </div>

        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="dm2-select">
          <option value="all">All Types</option>
          {PLACE_TYPES.map(t => (
            <option key={t} value={t}>{TYPE_EMOJIS[t]} {t}</option>
          ))}
        </select>

        <select value={filterDistrict} onChange={(e) => setFilterDistrict(e.target.value)} className="dm2-select">
          <option value="all">All Districts</option>
          {districts.map(d => (
            <option key={d.district_id} value={String(d.district_id)}>{d.name}</option>
          ))}
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="dm2-select">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="dm2-select">
          <option value="rating">Top Rated</option>
          <option value="visitors">Most Reviews</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {/* Card Grid — grouped by district */}
      <div className="dm2-district-container">
        {loading ? (
          <div className="admin-loading"><div className="admin-spinner" /><p>Loading destinations…</p></div>
        ) : districtNames.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📍</span>
            <h3>No destinations found</h3>
            <p>Try adjusting your filters or add a new destination.</p>
          </div>
        ) : (
          districtNames.map(districtName => {
            const places = groupedByDistrict[districtName]
            const isCollapsed = collapsedDistricts[districtName]
            const isExpanded = expandedDistricts[districtName]
            const visiblePlaces = isExpanded ? places : places.slice(0, PREVIEW_COUNT)
            return (
              <div
                key={districtName}
                id={`dm2-district-${encodeURIComponent(districtName)}`}
                className="dm2-district-section"
              >
                <button
                  type="button"
                  className="dm2-district-header"
                  onClick={() => toggleDistrict(districtName)}
                >
                  <div className="dm2-district-title">
                    <span className={`dm2-chevron${isCollapsed ? '' : ' open'}`}>▶</span>
                    <span className="dm2-district-name">📍 {districtName}</span>
                    <span className="dm2-district-count">{places.length} destination{places.length !== 1 ? 's' : ''}</span>
                  </div>
                </button>

                {!isCollapsed && (
                  <>
                  <div className="dm2-card-grid">
                    {visiblePlaces.map(dest => {
                      const img = dest.imageUrl || TYPE_IMAGES[dest.type] || placeholderImg
                      return (
                        <div className="dm2-dest-card" key={dest.place_id}>
                          <div className="dm2-card-image-wrap">
                            <img
                              src={img}
                              alt={dest.name}
                              className="dm2-card-image"
                              onError={e => { e.target.src = placeholderImg }}
                            />
                            <span className="dm2-type-badge" style={typePillStyle(dest.type)}>
                              {TYPE_EMOJIS[dest.type] || '📍'} {dest.type}
                            </span>
                            {dest.duration && (
                              <span className="dm2-duration-badge">🕐 {dest.duration}</span>
                            )}
                            {dest.status === 'inactive' && <span className="dm2-inactive-badge">Inactive</span>}
                          </div>
                          <div className="dm2-card-body">
                            <h3 className="dm2-card-name">{dest.name}</h3>
                            <p className="dm2-card-desc">
                              {dest.description.length > 100
                                ? dest.description.slice(0, 100) + '…'
                                : dest.description}
                            </p>
                          </div>
                          <div className="dm2-card-footer">
                            <div className="dm2-card-meta">
                              <span className="dm2-rating">⭐ {dest.rating.toFixed(1)}</span>
                              <span className="dm2-reviews">{dest.visitors} reviews</span>
                            </div>
                            <div className="dm2-card-actions">
                              <button className="dm2-btn-edit"   onClick={() => openEdit(dest)}    title="Edit">✏️</button>
                              <button className="dm2-btn-delete" onClick={() => handleDelete(dest)} title="Delete">🗑️</button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {places.length > PREVIEW_COUNT && (
                    <div className="dm2-show-more-wrap">
                      <button
                        type="button"
                        className="dm2-show-more-btn"
                        onClick={() => toggleExpandDistrict(districtName)}
                      >
                        {isExpanded
                          ? 'Show less'
                          : `Show all (${places.length - PREVIEW_COUNT} more)`}
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
          <div className="dm2-modal" onClick={e => e.stopPropagation()}>
            <div className="dm2-modal-header">
              <h2>{modalMode === 'add' ? '📍 Add New Destination' : '✏️ Edit Destination'}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="dm2-form">
              <div className="dm2-form-row">
                <div className="form-group">
                  <label>Destination Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., Gangaramaya Temple"
                  />
                </div>

                <div className="form-group">
                  <label>Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    {PLACE_TYPES.map(t => (
                      <option key={t} value={t}>{TYPE_EMOJIS[t]} {t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="dm2-form-row">
                <div className="form-group">
                  <label>District *</label>
                  <select
                    value={formData.district_id}
                    onChange={(e) => setFormData({ ...formData, district_id: e.target.value })}
                    required
                  >
                    <option value="">— Select District —</option>
                    {districts.map(d => (
                      <option key={d.district_id} value={d.district_id}>
                        {d.name} ({d.province})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Duration</label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="e.g., 1–2 hrs"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={3}
                  placeholder="Describe the destination…"
                />
              </div>

              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  value={formData.address_text}
                  onChange={(e) => setFormData({ ...formData, address_text: e.target.value })}
                  placeholder="e.g., Colombo 07, Sri Lanka"
                />
              </div>

              <div className="dm2-form-row">
                <div className="form-group">
                  <label>Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lat}
                    onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                    placeholder="e.g., 6.9271"
                  />
                </div>
                <div className="form-group">
                  <label>Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lng}
                    onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                    placeholder="e.g., 79.8612"
                  />
                </div>
              </div>

              <div className="dm2-form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
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

              <div className="dm2-form-row">
                <div className="form-group">
                  <label>Image URL (optional)</label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
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
                      onChange={(e) => {
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
                    {saving ? 'Saving…' : modalMode === 'add' ? 'Create Destination' : 'Save Changes'}
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
          <div className="dm2-modal" style={{ maxWidth: 420, width: '96vw' }}>
            <div className="dm2-modal-header">
              <h2>🗑️ Delete Destination</h2>
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

export default DestinationManagement
