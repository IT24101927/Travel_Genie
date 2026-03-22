import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE } from '../../config/api'
import './DestinationManagement.css'
import placeholderImg from '../../assets/placeholder.svg'

const API = API_BASE
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

function DestinationManagement({ theme, toggleTheme }) {
  const [destinations, setDestinations] = useState([])
  const [districts, setDistricts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toastMsg, setToastMsg] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('add')
  const [selectedDestination, setSelectedDestination] = useState(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterDistrict, setFilterDistrict] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [collapsedDistricts, setCollapsedDistricts] = useState({})

  const [formData, setFormData] = useState({
    name: '', type: 'Temple', district_id: '', description: '',
    duration: '1–2 hrs', status: 'active',
  })

  // Image upload state
  const [imageFiles, setImageFiles] = useState([])
  const [existingImages, setExistingImages] = useState([])

  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000) }

  // Helper: map API Place row to display-friendly shape
  const mapDest = (d) => ({
    ...d,
    name:        d.name        || '',
    description: d.description || '',
    location:    d.district?.name || '',
    district_id: d.district_id,
    imageUrl:    (d.images || [])[0]?.image_url || '',
    type:        d.type || '',
    duration:    d.duration || '',
    visitors:    d.review_count || 0,
    rating:      parseFloat(d.rating) || 0,
    status:      d.isActive !== false ? 'active' : 'inactive',
    tags:        (d.tags || []).map(t => t.tag_name),
    place_id:    d.place_id,
  })

  const loadDestinations = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/destinations?limit=500&includeInactive=true`, { headers: authH() })
      const data = await res.json()
      if (data.success) setDestinations(data.data.map(mapDest))
      else setError(data.message || 'Failed to load destinations')
    } catch { setError('Cannot connect to server.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    loadDestinations()
    fetch(`${API}/districts`, { headers: authH() })
      .then(r => r.json())
      .then(json => { if (json.success) setDistricts(json.data) })
      .catch(() => {})
  }, [loadDestinations])

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

  const removeNewImage = (index) => {
    setImageFiles(prev => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  // Open Add Modal
  const handleAdd = () => {
    setModalMode('add')
    setSelectedDestination(null)
    setFormData({
      name: '', type: 'Temple', district_id: '',
      description: '', duration: '1–2 hrs',
      status: 'active', imageUrl: '',
    })
    setImageFiles([])
    setExistingImages([])
    setShowModal(true)
  }

  // Open Edit Modal
  const handleEdit = (destination) => {
    setModalMode('edit')
    setSelectedDestination(destination)
    setFormData({
      name: destination.name,
      type: destination.type || 'Temple',
      district_id: destination.district_id || '',
      description: destination.description || '',
      duration: destination.duration || '1–2 hrs',
      status: destination.status,
      imageUrl: '',
    })
    setImageFiles([])
    setExistingImages(destination.images || [])
    setShowModal(true)
  }

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const body = {
        name: formData.name,
        description: formData.description,
        district_id: parseInt(formData.district_id) || null,
        type: formData.type,
        duration: formData.duration,
        isActive: formData.status === 'active',
      }

      if (modalMode === 'add') {
        const res = await fetch(`${API}/destinations`, { method: 'POST', headers: authH(), body: JSON.stringify(body) })
        const data = await res.json()
        if (data.success) {
          const newPlaceId = data.data.place_id
          await uploadImages(newPlaceId, formData.imageUrl)
          showToast('✅ Destination created')
          await loadDestinations()
        } else { setError(data.error || data.message || 'Failed to create destination'); setSaving(false); return }
      } else {
        const destId = selectedDestination.place_id
        const res = await fetch(`${API}/destinations/${destId}`, { method: 'PUT', headers: authH(), body: JSON.stringify(body) })
        const data = await res.json()
        if (data.success) {
          await uploadImages(destId, formData.imageUrl)
          showToast('✅ Destination updated')
          await loadDestinations()
        } else { setError(data.error || data.message || 'Failed to update destination'); setSaving(false); return }
      }
      setShowModal(false)
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  // Handle Delete
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this destination? This cannot be undone.')) return
    try {
      const res = await fetch(`${API}/destinations/${id}`, { method: 'DELETE', headers: authH() })
      const data = await res.json()
      if (data.success) { showToast('✅ Destination deleted'); await loadDestinations() }
      else setError(data.error || data.message || 'Failed to delete destination')
    } catch { setError('Network error') }
  }

  // Filter and Sort
  const filteredDestinations = destinations
    .filter(dest => {
      const matchesSearch = dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           dest.location.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = filterType === 'all' || dest.type === filterType
      const matchesDistrict = filterDistrict === 'all' || String(dest.district_id) === filterDistrict
      const matchesStatus = filterStatus === 'all' || dest.status === filterStatus
      return matchesSearch && matchesType && matchesDistrict && matchesStatus
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating
      if (sortBy === 'visitors') return b.visitors - a.visitors
      return a.name.localeCompare(b.name)
    })

  // Group by district for district-wise view
  const groupedByDistrict = filteredDestinations.reduce((acc, dest) => {
    const key = dest.location || 'Unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(dest)
    return acc
  }, {})
  const districtNames = Object.keys(groupedByDistrict).sort()

  const toggleDistrict = (name) => {
    setCollapsedDistricts(prev => ({ ...prev, [name]: !prev[name] }))
  }

  return (
    <div className="destination-management">
      {toastMsg && <div className="admin-toast">{toastMsg}</div>}
      {error && <div className="admin-error-banner">{error} <button onClick={() => setError('')}>✕</button></div>}

      {/* Header */}
      <div className="dm-header">
        <div>
          <h1 className="dm-title">Destination Management</h1>
          <p className="dm-subtitle">Manage destinations with AI-powered recommendations</p>
        </div>
        <button className="btn-add-destination" onClick={handleAdd}>➕ Add Destination</button>
      </div>

      {/* Stats Cards */}
      <div className="dm-stats">
        <div className="dm-stat-card">
          <span className="stat-icon">📍</span>
          <div>
            <p className="stat-value">{loading ? '…' : destinations.length}</p>
            <p className="stat-label">Total Destinations</p>
          </div>
        </div>
        <div className="dm-stat-card">
          <span className="stat-icon">⭐</span>
          <div>
            <p className="stat-value">
              {loading ? '…' : destinations.length > 0
                ? (destinations.reduce((acc, d) => acc + (d.rating || 0), 0) / destinations.length).toFixed(1)
                : '0.0'}
            </p>
            <p className="stat-label">Avg Rating</p>
          </div>
        </div>
        <div className="dm-stat-card">
          <span className="stat-icon">👥</span>
          <div>
            <p className="stat-value">
              {loading ? '…' : ((destinations.reduce((acc, d) => acc + (d.visitors || 0), 0)) / 1000).toFixed(1) + 'K'}
            </p>
            <p className="stat-label">Total Reviews</p>
          </div>
        </div>
        <div className="dm-stat-card">
          <span className="stat-icon">✅</span>
          <div>
            <p className="stat-value">
              {loading ? '…' : destinations.filter(d => d.status === 'active').length}
            </p>
            <p className="stat-label">Active</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="dm-filters">
        <div className="filter-group">
          <label>🔍 Search</label>
          <input
            type="text"
            placeholder="Search destinations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>📍 District</label>
          <select
            value={filterDistrict}
            onChange={(e) => setFilterDistrict(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Districts</option>
            {districts.map(d => (
              <option key={d.district_id} value={d.district_id}>
                {d.name} ({d.province})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>🏷️ Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            {PLACE_TYPES.map(t => (
              <option key={t} value={t}>{TYPE_EMOJIS[t]} {t}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>📊 Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="filter-group">
          <label>🔢 Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="name">Name</option>
            <option value="rating">Rating</option>
            <option value="visitors">Reviews</option>
          </select>
        </div>
      </div>

      {/* Destinations Grouped by District */}
      <div className="dm-card-grid-container">
        {loading ? (
          <div className="admin-loading"><div className="admin-spinner" /><p>Loading destinations…</p></div>
        ) : districtNames.length > 0 ? (
          districtNames.map(districtName => {
            const places = groupedByDistrict[districtName]
            const isCollapsed = collapsedDistricts[districtName]
            return (
              <div key={districtName} className="dm-district-section">
                <button
                  type="button"
                  className="dm-district-header"
                  onClick={() => toggleDistrict(districtName)}
                >
                  <div className="dm-district-title">
                    <span className={`dm-chevron ${isCollapsed ? '' : 'open'}`}>▶</span>
                    <span className="dm-district-name">📍 {districtName}</span>
                    <span className="dm-district-count">{places.length} destination{places.length !== 1 ? 's' : ''}</span>
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="dm-card-grid">
                    {places.map(dest => {
                      const img = dest.imageUrl || TYPE_IMAGES[dest.type] || placeholderImg
                      return (
                        <div key={dest.place_id} className={`dm-place-card ${dest.status === 'inactive' ? 'dm-card-inactive' : ''}`}>
                          <div className="dm-card-img-wrap">
                            <img
                              src={img}
                              alt={dest.name}
                              className="dm-card-img"
                              onError={e => { e.target.src = placeholderImg }}
                            />
                            <span className="dm-type-badge" style={typePillStyle(dest.type)}>
                              {TYPE_EMOJIS[dest.type] || '📍'} {dest.type}
                            </span>
                            {dest.duration && (
                              <span className="dm-duration-badge">🕐 {dest.duration}</span>
                            )}
                            <span className={`dm-status-dot ${dest.status}`} title={dest.status} />
                          </div>

                          <div className="dm-card-body">
                            <h3 className="dm-card-name">{dest.name}</h3>
                            <p className="dm-card-desc">
                              {dest.description.length > 100
                                ? dest.description.slice(0, 100) + '…'
                                : dest.description}
                            </p>
                          </div>

                          <div className="dm-card-footer">
                            <div className="dm-card-meta">
                              <span className="dm-card-rating">⭐ {dest.rating.toFixed(1)}</span>
                              <span className="dm-card-reviews">{dest.visitors} reviews</span>
                            </div>
                            <div className="dm-card-actions">
                              <button className="dm-btn-edit" onClick={() => handleEdit(dest)} title="Edit">✏️</button>
                              <button className="dm-btn-delete" onClick={() => handleDelete(dest.place_id)} title="Delete">🗑️</button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="empty-state">
            <span className="empty-icon">🔍</span>
            <h3>No destinations found</h3>
            <p>Try adjusting your filters or add a new destination</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalMode === 'add' ? '➕ Add Destination' : '✏️ Edit Destination'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="destination-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Destination Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    placeholder="e.g., Gangaramaya Temple"
                  />
                </div>

                <div className="form-group">
                  <label>Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    required
                  >
                    {PLACE_TYPES.map(t => (
                      <option key={t} value={t}>{TYPE_EMOJIS[t]} {t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>District *</label>
                  <select
                    value={formData.district_id}
                    onChange={(e) => setFormData({...formData, district_id: e.target.value})}
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
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    placeholder="e.g., 1–2 hrs"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                  rows="3"
                  placeholder="Describe the destination..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Images */}
              <div className="form-section">
                <h3 className="section-title">🖼️ Images</h3>

                {existingImages.length > 0 && (
                  <div className="image-preview-grid">
                    {existingImages.map(img => (
                      <div key={img.image_id} className="img-thumb-wrap">
                        <img src={img.image_url} alt="" className="img-thumb" />
                        <button
                          type="button"
                          className="img-remove-btn"
                          onClick={() => handleDeleteImage(img.image_id)}
                          title="Remove image"
                        >✕</button>
                      </div>
                    ))}
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
                          onClick={() => removeNewImage(idx)}
                          title="Remove"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="file-upload-label">
                  📁 Choose images (JPEG / PNG / WebP)
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const files = Array.from(e.target.files).map(f => ({
                        file: f,
                        preview: URL.createObjectURL(f),
                      }))
                      setImageFiles(prev => [...prev, ...files])
                      e.target.value = ''
                    }}
                  />
                </label>

                <div className="form-group" style={{ marginTop: '10px' }}>
                  <label>🔗 Or paste an Image URL (optional)</label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={saving}>
                  {saving ? 'Saving…' : modalMode === 'add' ? 'Create Destination' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DestinationManagement
