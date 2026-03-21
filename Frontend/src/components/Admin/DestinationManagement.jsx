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

function DestinationManagement({ theme, toggleTheme }) {
  const [destinations, setDestinations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toastMsg, setToastMsg] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('add')
  const [selectedDestination, setSelectedDestination] = useState(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('name')

  const [formData, setFormData] = useState({
    name: '', destination_category: 'HISTORICAL', district_id: '', description: '',
    address_text: '', entry_fee: 0, opening_hours: '', best_time_to_visit: '',
    lat: '', lng: '', status: 'active'
  })

  // Image upload state
  const [imageFiles, setImageFiles] = useState([])       // {file, preview}
  const [existingImages, setExistingImages] = useState([]) // from DB

  // Backend enum values (must match lowercase DB ENUM)
  const categories = ['beach', 'mountain', 'city', 'historical', 'adventure', 'cultural', 'nature', 'religious', 'wildlife', 'other']

  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000) }

  // Helper: map API destination (new EER schema) to display-friendly shape
  const mapDest = (d) => ({
    ...d,
    // destination has a 'place' association
    name:        d.place?.name        || d.name,
    description: d.place?.description || d.description,
    location:    d.place?.district?.name || d.place?.address_text || '',
    district_id: d.place?.district_id,
    address_text: d.place?.address_text || '',
    lat:         d.place?.lat,
    lng:         d.place?.lng,
    imageUrl:    (d.place?.images || [])[0]?.image_url || '',
    category:    d.destination_category,
    price:       parseFloat(d.entry_fee) || 0,
    visitors:    d.review_count || 0,
    rating:      parseFloat(d.rating) || 0,
    status:      d.place?.isActive !== false ? 'active' : 'inactive',
    tags:        (d.place?.tags || []).map(t => t.tag_name),
    place_id:    d.place_id,
  })

  const loadDestinations = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/destinations?limit=200`, { headers: authH() })
      const data = await res.json()
      if (data.success) setDestinations(data.data.map(mapDest))
      else setError(data.message || 'Failed to load destinations')
    } catch { setError('Cannot connect to server.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadDestinations() }, [loadDestinations])

  // Upload new image files + optional URL to the backend after place is saved
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

  // Delete an existing DB image
  const handleDeleteImage = async (imageId) => {
    try {
      const res = await fetch(`${API}/places/images/${imageId}`, { method: 'DELETE', headers: authH() })
      const data = await res.json()
      if (data.success) setExistingImages(imgs => imgs.filter(i => i.image_id !== imageId))
      else setError(data.message || 'Failed to delete image')
    } catch { setError('Network error') }
  }

  // Remove a pending (not-yet-uploaded) image preview
  const removeNewImage = (index) => {
    setImageFiles(prev => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  // Open Add Modal
  const handleAdd = () => {
    setModalMode('add')
    setFormData({ name: '', destination_category: 'HISTORICAL', district_id: '', description: '', address_text: '', entry_fee: 0, opening_hours: '', best_time_to_visit: '', lat: '', lng: '', status: 'active', imageUrl: '' })
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
      destination_category: destination.category?.toLowerCase() || 'historical',
      district_id: destination.district_id || '',
      description: destination.description || '',
      address_text: destination.address_text || '',
      entry_fee: destination.price || 0,
      opening_hours: destination.opening_hours || '',
      best_time_to_visit: destination.best_time_to_visit || '',
      lat: destination.lat || '',
      lng: destination.lng || '',
      status: destination.status,
      imageUrl: '',
    })
    setImageFiles([])
    setExistingImages(destination.place?.images || [])
    setShowModal(true)
  }

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      // New EER schema: place supertype fields + destination subtype fields
      const body = {
        name: formData.name,
        description: formData.description,
        district_id: parseInt(formData.district_id) || null,
        address_text: formData.address_text,
        lat: parseFloat(formData.lat) || null,
        lng: parseFloat(formData.lng) || null,
        destination_category: formData.destination_category,
        entry_fee: parseFloat(formData.entry_fee) || 0,
        opening_hours: formData.opening_hours,
        best_time_to_visit: formData.best_time_to_visit,
        isActive: formData.status === 'active',
      }
      let res, data
      if (modalMode === 'add') {
        res = await fetch(`${API}/destinations`, { method: 'POST', headers: authH(), body: JSON.stringify(body) })
        data = await res.json()
        if (data.success) {
          const placeId = data.data?.place_id
          if (placeId) await uploadImages(placeId, formData.imageUrl)
          showToast('✅ Destination added')
          await loadDestinations()
        } else setError(data.message || 'Failed to add destination')
      } else {
        const destId = selectedDestination.place_id || selectedDestination.id
        res = await fetch(`${API}/destinations/${destId}`, { method: 'PUT', headers: authH(), body: JSON.stringify(body) })
        data = await res.json()
        if (data.success) {
          await uploadImages(destId, formData.imageUrl)
          showToast('✅ Destination updated')
          await loadDestinations()
        } else setError(data.message || 'Failed to update destination')
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
      if (data.success) { showToast('✅ Destination deleted'); setDestinations(d => d.filter(x => x.place_id !== id && x.id !== id)) }
      else setError(data.message || 'Failed to delete destination')
    } catch { setError('Network error') }
  }

  // Filter and Sort Destinations
  const filteredDestinations = destinations
    .filter(dest => {
      const matchesSearch = dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           dest.location.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = filterCategory === 'all' || dest.category === filterCategory
      const matchesStatus = filterStatus === 'all' || dest.status === filterStatus
      return matchesSearch && matchesCategory && matchesStatus
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating
      if (sortBy === 'visitors') return b.visitors - a.visitors
      return a.name.localeCompare(b.name)
    })

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
        <button className="btn-add-destination" onClick={handleAdd}>
          ➕ Add Destination
        </button>
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
          <label>🏷️ Category</label>
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
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
            <option value="visitors">Visitors</option>
            <option value="similarity">Similarity Score</option>
          </select>
        </div>
      </div>

      {/* Destinations Table */}
      <div className="destinations-table-container">
        {loading ? (
          <div className="admin-loading"><div className="admin-spinner" /><p>Loading destinations…</p></div>
        ) : filteredDestinations.length > 0 ? (
          <table className="destinations-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Destination</th>
                <th>Category</th>
                <th>Location</th>
                <th>Rating</th>
                <th>Reviews</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDestinations.map(destination => (
                <tr key={destination.id}>
                  <td className="td-image">
                    <img
                      src={destination.imageUrl || placeholderImg}
                      alt={destination.name}
                      className="table-img"
                      onError={e => { e.target.src = placeholderImg }}
                    />
                  </td>
                  <td className="td-destination">
                    <div className="dest-name-cell">
                      <strong>{destination.name}</strong>
                      <div className="dest-tags-inline">
                        {(destination.tags || []).slice(0, 2).map((tag, idx) => (
                          <span key={idx} className="tag-inline">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="dest-category-badge">{destination.category}</span>
                  </td>
                  <td className="td-location">
                    <span className="location-text">📍 {destination.location}</span>
                  </td>
                  <td className="td-rating">
                    <span className="rating-badge">⭐ {destination.rating || 0}</span>
                  </td>
                  <td className="td-visitors">
                    {destination.visitors}
                  </td>
                  <td className="td-price">
                    <span className="price-badge">${destination.price}</span>
                  </td>
                  <td>
                    <span className={`status-badge status-${destination.status}`}>
                      {destination.status}
                    </span>
                  </td>
                  <td className="td-actions">
                    <div className="action-buttons">
                      <button
                        className="btn-table-edit"
                        onClick={() => handleEdit(destination)}
                        title="Edit"
                      >✏️</button>
                      <button
                        className="btn-table-delete"
                        onClick={() => handleDelete(destination.id)}
                        title="Delete"
                      >🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              <h2>{modalMode === 'add' ? '➕ Add New Destination' : '✏️ Edit Destination'}</h2>
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
                    placeholder="e.g., Sigiriya Rock Fortress"
                  />
                </div>

                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={formData.destination_category}
                    onChange={(e) => setFormData({...formData, destination_category: e.target.value})}
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>District ID *</label>
                  <input
                    type="number"
                    value={formData.district_id}
                    onChange={(e) => setFormData({...formData, district_id: e.target.value})}
                    required
                    placeholder="e.g., 1"
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>Address Text</label>
                  <input
                    type="text"
                    value={formData.address_text}
                    onChange={(e) => setFormData({...formData, address_text: e.target.value})}
                    placeholder="e.g., Sigiriya, Matale District"
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
                  <label>Opening Hours</label>
                  <input
                    type="text"
                    value={formData.opening_hours}
                    onChange={(e) => setFormData({...formData, opening_hours: e.target.value})}
                    placeholder="e.g., 7:00 AM – 6:00 PM"
                  />
                </div>
                <div className="form-group">
                  <label>Best Time to Visit</label>
                  <input
                    type="text"
                    value={formData.best_time_to_visit}
                    onChange={(e) => setFormData({...formData, best_time_to_visit: e.target.value})}
                    placeholder="e.g., November – April"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Entry Fee ($) *</label>
                  <input
                    type="number"
                    value={formData.entry_fee}
                    onChange={(e) => setFormData({...formData, entry_fee: e.target.value})}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>

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

              <div className="form-row">
                <div className="form-group">
                  <label>Latitude</label>
                  <input type="number" step="0.000001" value={formData.lat} onChange={(e) => setFormData({...formData, lat: e.target.value})} placeholder="e.g., 7.9547" />
                </div>
                <div className="form-group">
                  <label>Longitude</label>
                  <input type="number" step="0.000001" value={formData.lng} onChange={(e) => setFormData({...formData, lng: e.target.value})} placeholder="e.g., 80.7600" />
                </div>
              </div>

              {/* ── Images ─────────────────────────────────────────── */}
              <div className="form-section">
                <h3 className="section-title">🖼️ Images</h3>

                {/* Existing images (edit mode) */}
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

                {/* New image previews */}
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
                  {saving ? 'Saving…' : (modalMode === 'add' ? 'Add Destination' : 'Save Changes')}
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
