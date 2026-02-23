import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import './DestinationManagement.css'
import placeholderImg from '../../assets/placeholder.svg'

const API = 'http://localhost:5000/api'
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
    name: '', category: 'historical', location: '', description: '',
    attractions: '', tags: '', price: 0, imageUrl: '', status: 'active'
  })

  // Backend enum values
  const categories = ['beach', 'mountain', 'city', 'historical', 'adventure', 'cultural', 'nature', 'religious', 'other']

  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000) }

  // Helper: map API destination to display-friendly shape
  const mapDest = (d) => ({
    ...d,
    imageUrl: (d.images || [])[0] || '',
    location: [d.city, d.country].filter(Boolean).join(', '),
    price: d.averageCost?.min || 0,
    visitors: d.reviewCount || 0,
    status: d.isActive ? 'active' : 'inactive',
    attractions: Array.isArray(d.attractions) ? d.attractions : [],
    tags: Array.isArray(d.tags) ? d.tags : [],
    similarityScore: d.similarityScore || 0,
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

  // Open Add Modal
  const handleAdd = () => {
    setModalMode('add')
    setFormData({ name: '', category: 'historical', location: '', description: '', attractions: '', tags: '', price: 0, imageUrl: '', status: 'active' })
    setShowModal(true)
  }

  // Open Edit Modal
  const handleEdit = (destination) => {
    setModalMode('edit')
    setSelectedDestination(destination)
    setFormData({
      name: destination.name,
      category: destination.category,
      location: destination.location,
      description: destination.description,
      attractions: Array.isArray(destination.attractions) ? destination.attractions.join(', ') : '',
      tags: Array.isArray(destination.tags) ? destination.tags.join(', ') : '',
      price: destination.price,
      imageUrl: destination.imageUrl || '',
      status: destination.status
    })
    setShowModal(true)
  }

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const parts = formData.location.split(',')
      const city = parts[0]?.trim() || 'Unknown'
      const country = parts.slice(1).join(',').trim() || 'Sri Lanka'
      const body = {
        name: formData.name,
        category: formData.category,
        city, country,
        description: formData.description,
        attractions: formData.attractions.split(',').map(a => a.trim()).filter(Boolean),
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        averageCost: { min: parseFloat(formData.price) || 0, max: parseFloat(formData.price) * 1.5, currency: 'USD' },
        images: formData.imageUrl ? [formData.imageUrl] : [],
        isActive: formData.status === 'active'
      }
      let res, data
      if (modalMode === 'add') {
        res = await fetch(`${API}/destinations`, { method: 'POST', headers: authH(), body: JSON.stringify(body) })
        data = await res.json()
        if (data.success) { showToast('✅ Destination added'); await loadDestinations() }
        else setError(data.message || 'Failed to add destination')
      } else {
        res = await fetch(`${API}/destinations/${selectedDestination.id}`, { method: 'PUT', headers: authH(), body: JSON.stringify(body) })
        data = await res.json()
        if (data.success) { showToast('✅ Destination updated'); await loadDestinations() }
        else setError(data.message || 'Failed to update destination')
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
      if (data.success) { showToast('✅ Destination deleted'); setDestinations(d => d.filter(x => x.id !== id)) }
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
        <div className="dm-stat-card glass-card">
          <span className="stat-icon">📍</span>
          <div>
            <p className="stat-value">{loading ? '…' : destinations.length}</p>
            <p className="stat-label">Total Destinations</p>
          </div>
        </div>
        <div className="dm-stat-card glass-card">
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
        <div className="dm-stat-card glass-card">
          <span className="stat-icon">👥</span>
          <div>
            <p className="stat-value">
              {loading ? '…' : ((destinations.reduce((acc, d) => acc + (d.visitors || 0), 0)) / 1000).toFixed(1) + 'K'}
            </p>
            <p className="stat-label">Total Reviews</p>
          </div>
        </div>
        <div className="dm-stat-card glass-card">
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
      <div className="dm-filters glass-card">
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
      <div className="destinations-table-container glass-card">
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
          <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
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
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Location *</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  required
                  placeholder="e.g., Sigiriya, Matale District"
                />
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

              <div className="form-group">
                <label>Attractions (comma separated)</label>
                <input
                  type="text"
                  value={formData.attractions}
                  onChange={(e) => setFormData({...formData, attractions: e.target.value})}
                  placeholder="e.g., Lion Rock, Frescoes, Water Gardens"
                />
              </div>

              <div className="form-group">
                <label>Tags (comma separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  placeholder="e.g., UNESCO, History, Adventure"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Price ($) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
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

              <div className="form-group">
                <label>Image URL</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                  placeholder="https://example.com/image.jpg"
                />
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
