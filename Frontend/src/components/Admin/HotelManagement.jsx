import { useState, useEffect, useCallback } from 'react'
import './HotelManagement.css'
import placeholderImg from '../../assets/placeholder.svg'

const API = 'http://localhost:5000/api'
const authH = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

// Map raw API hotel → display-friendly shape
const mapHotel = (h) => ({
  ...h,
  imageUrl: (h.images || [])[0] || '',
  location: h.address?.city || '',
  address: h.address?.street || '',
  pricePerNight: h.priceRange?.min || 0,
  reviews: h.reviewCount || 0,
  totalRooms: (h.rooms || []).reduce((s, r) => s + (r.totalRooms || r.count || 1), 0),
  availableRooms: (h.rooms || []).reduce((s, r) => s + (r.available || 0), 0),
  roomTypes: (h.rooms || []).map(r => r.type || r.name).filter(Boolean),
  status: h.isActive ? 'active' : 'inactive',
})

function HotelManagement({ theme, toggleTheme }) {
  const [hotels, setHotels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toastMsg, setToastMsg] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('add')
  const [selectedHotel, setSelectedHotel] = useState(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterLocation, setFilterLocation] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('rating')

  // Recommendation filters
  const [recFilters, setRecFilters] = useState({
    budget: 300, minRating: 4.0, location: 'all', amenities: [], proximityTo: 'beach'
  })

  const [formData, setFormData] = useState({
    name: '', category: 'hotel', starRating: 3, location: '', address: '',
    destinationId: '', pricePerNight: 0, amenities: '', roomTypes: '',
    totalRooms: 0, imageUrl: '', description: '', features: '', status: 'active',
    cancellationPolicy: 'Free cancellation up to 24 hours before check-in.'
  })

  const categories = ['hotel', 'resort', 'hostel', 'guesthouse', 'apartment', 'villa', 'motel', 'boutique']
  const starOptions = [1, 2, 3, 4, 5]
  const locations = ['Colombo', 'Galle', 'Kandy', 'Ella', 'Mirissa', 'Dambulla', 'Sigiriya', 'Nuwara Eliya']
  const allAmenities = ['WiFi', 'Pool', 'Spa', 'Restaurant', 'Gym', 'Parking', 'Beach Access', 'Bar', 'Kitchen', 'Garden']

  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000) }

  const loadHotels = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/hotels?limit=200`, { headers: authH() })
      const data = await res.json()
      if (data.success) setHotels(data.data.map(mapHotel))
      else setError(data.message || 'Failed to load hotels')
    } catch { setError('Cannot connect to server.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadHotels() }, [loadHotels])

  // Open Add Modal
  const handleAdd = () => {
    setModalMode('add')
    setFormData({
      name: '', category: 'hotel', starRating: 3, location: '', address: '',
      destinationId: '', pricePerNight: 0, amenities: '', roomTypes: '',
      totalRooms: 0, imageUrl: '', description: '', features: '', status: 'active',
      cancellationPolicy: 'Free cancellation up to 24 hours before check-in.'
    })
    setShowModal(true)
  }

  // Open Edit Modal
  const handleEdit = (hotel) => {
    setModalMode('edit')
    setSelectedHotel(hotel)
    setFormData({
      name: hotel.name,
      category: hotel.category,
      starRating: hotel.starRating || 3,
      location: hotel.location,
      address: hotel.address,
      destinationId: hotel.destinationId || '',
      pricePerNight: hotel.pricePerNight,
      amenities: Array.isArray(hotel.amenities) ? hotel.amenities.join(', ') : '',
      roomTypes: Array.isArray(hotel.roomTypes) ? hotel.roomTypes.join(', ') : '',
      totalRooms: hotel.totalRooms,
      imageUrl: hotel.imageUrl || '',
      description: hotel.description || '',
      features: '',
      status: hotel.status,
      cancellationPolicy: hotel.cancellationPolicy || 'Free cancellation up to 24 hours before check-in.'
    })
    setShowModal(true)
  }

  // Open Recommendation Modal
  const handleRecommend = () => {
    setModalMode('recommend')
    setShowModal(true)
  }

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const amenitiesArr = formData.amenities.split(',').map(a => a.trim()).filter(Boolean)
      const roomTypesArr = formData.roomTypes.split(',').map(r => r.trim()).filter(Boolean)
      const body = {
        name: formData.name,
        description: formData.description,
        destinationId: parseInt(formData.destinationId) || null,
        address: { street: formData.address, city: formData.location, country: 'Sri Lanka' },
        starRating: parseInt(formData.starRating),
        category: formData.category,
        amenities: amenitiesArr,
        images: formData.imageUrl ? [formData.imageUrl] : [],
        rooms: roomTypesArr.map(type => ({ type, totalRooms: Math.round(parseInt(formData.totalRooms) / (roomTypesArr.length || 1)), available: 0 })),
        priceRange: { min: parseFloat(formData.pricePerNight) || 0, max: parseFloat(formData.pricePerNight) * 1.5, currency: 'USD' },
        isActive: formData.status === 'active',
        cancellationPolicy: formData.cancellationPolicy || 'Standard policy applies.',
      }
      let res, data
      if (modalMode === 'add') {
        res = await fetch(`${API}/hotels`, { method: 'POST', headers: authH(), body: JSON.stringify(body) })
        data = await res.json()
        if (data.success) { showToast('✅ Hotel added'); await loadHotels() }
        else setError(data.message || 'Failed to add hotel')
      } else {
        res = await fetch(`${API}/hotels/${selectedHotel.id}`, { method: 'PUT', headers: authH(), body: JSON.stringify(body) })
        data = await res.json()
        if (data.success) { showToast('✅ Hotel updated'); await loadHotels() }
        else setError(data.message || 'Failed to update hotel')
      }
      setShowModal(false)
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  // Handle Delete
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this hotel? This cannot be undone.')) return
    try {
      const res = await fetch(`${API}/hotels/${id}`, { method: 'DELETE', headers: authH() })
      const data = await res.json()
      if (data.success) { showToast('✅ Hotel deleted'); setHotels(h => h.filter(x => x.id !== id)) }
      else setError(data.message || 'Failed to delete hotel')
    } catch { setError('Network error') }
  }

  // Get Recommendations (filter from real data)
  const getRecommendations = () => {
    return hotels
      .filter(hotel => {
        const withinBudget = hotel.pricePerNight <= recFilters.budget
        const meetsRating = hotel.rating >= recFilters.minRating
        const matchesLocation = recFilters.location === 'all' || hotel.location === recFilters.location
        const hasAmenities = recFilters.amenities.length === 0 ||
          recFilters.amenities.every(amenity => (hotel.amenities || []).includes(amenity))
        return withinBudget && meetsRating && matchesLocation && hasAmenities && hotel.status === 'active'
      })
      .map(hotel => ({
        ...hotel,
        rankingScore: ((hotel.rating / 5) * 40) + Math.max(0, (1 - (hotel.pricePerNight / recFilters.budget)) * 60)
      }))
      .sort((a, b) => b.rankingScore - a.rankingScore)
  }

  // Filter and Sort Hotels
  const filteredHotels = hotels
    .filter(hotel => {
      const matchesSearch = hotel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           hotel.location.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = filterCategory === 'all' || hotel.category === filterCategory
      const matchesLocation = filterLocation === 'all' || hotel.location === filterLocation
      const matchesStatus = filterStatus === 'all' || hotel.status === filterStatus
      return matchesSearch && matchesCategory && matchesLocation && matchesStatus
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'price-low') return a.pricePerNight - b.pricePerNight
      if (sortBy === 'price-high') return b.pricePerNight - a.pricePerNight
      if (sortBy === 'reviews') return b.reviews - a.reviews
      return b.rating - a.rating
    })

  return (
    <div className="hotel-management">
      {toastMsg && <div className="admin-toast">{toastMsg}</div>}
      {error && <div className="admin-error-banner">{error} <button onClick={() => setError('')}>✕</button></div>}

      {/* Header */}
      <div className="hm-header">
        <div>
          <h1 className="hm-title">Hotel & Accommodation Management</h1>
          <p className="hm-subtitle">Manage hotels with smart recommendations and ranking</p>
        </div>
        <div className="header-actions">
          <button className="btn-recommend" onClick={handleRecommend}>
            🎯 Get Recommendations
          </button>
          <button className="btn-add-hotel" onClick={handleAdd}>
            ➕ Add Hotel
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="hm-stats">
        <div className="hm-stat-card glass-card">
          <span className="stat-icon">🏨</span>
          <div>
            <p className="stat-value">{loading ? '…' : hotels.length}</p>
            <p className="stat-label">Total Hotels</p>
          </div>
        </div>
        <div className="hm-stat-card glass-card">
          <span className="stat-icon">⭐</span>
          <div>
            <p className="stat-value">
              {loading ? '…' : hotels.length > 0
                ? (hotels.reduce((acc, h) => acc + (h.rating || 0), 0) / hotels.length).toFixed(1)
                : '0.0'}
            </p>
            <p className="stat-label">Avg Rating</p>
          </div>
        </div>
        <div className="hm-stat-card glass-card">
          <span className="stat-icon">🛏️</span>
          <div>
            <p className="stat-value">
              {loading ? '…' : hotels.reduce((acc, h) => acc + (h.totalRooms || 0), 0)}
            </p>
            <p className="stat-label">Total Rooms</p>
          </div>
        </div>
        <div className="hm-stat-card glass-card">
          <span className="stat-icon">💰</span>
          <div>
            <p className="stat-value">
              {loading ? '…' : hotels.length > 0
                ? '$' + Math.round(hotels.reduce((acc, h) => acc + (h.pricePerNight || 0), 0) / hotels.length)
                : '$0'}
            </p>
            <p className="stat-label">Avg Price/Night</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="hm-filters glass-card">
        <div className="filter-group">
          <label>🔍 Search</label>
          <input
            type="text"
            placeholder="Search hotels..."
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
          <label>📍 Location</label>
          <select 
            value={filterLocation} 
            onChange={(e) => setFilterLocation(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Locations</option>
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
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
            <option value="rating">Rating</option>
            <option value="name">Name</option>
            <option value="price-low">Price (Low to High)</option>
            <option value="price-high">Price (High to Low)</option>
            <option value="reviews">Reviews</option>
          </select>
        </div>
      </div>

      {/* Hotels Table */}
      <div className="hotels-table-container glass-card">
        {loading ? (
          <div className="admin-loading"><div className="admin-spinner" /><p>Loading hotels…</p></div>
        ) : filteredHotels.length > 0 ? (
          <table className="hotels-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Hotel Name</th>
                <th>Category</th>
                <th>Location</th>
                <th>Price/Night</th>
                <th>Rating</th>
                <th>Reviews</th>
                <th>Rooms</th>
                <th>Amenities</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHotels.map(hotel => (
                <tr key={hotel.id}>
                  <td className="td-image">
                    <img src={hotel.imageUrl || placeholderImg} alt={hotel.name} className="table-img" onError={(e) => { e.target.src = placeholderImg }} />
                  </td>
                  <td className="td-hotel-name">
                    <div className="hotel-name-cell">
                      <strong>{hotel.name}</strong>
                      <span className="hotel-address">{hotel.address}</span>
                    </div>
                  </td>
                  <td>
                    <span className="category-badge">{hotel.category}{hotel.starRating ? ` (${hotel.starRating}★)` : ''}</span>
                  </td>
                  <td>📍 {hotel.location}</td>
                  <td>
                    <span className="price-badge">${hotel.pricePerNight}</span>
                  </td>
                  <td className="td-rating">
                    <span className="rating-badge">⭐ {hotel.rating || 0}</span>
                  </td>
                  <td className="td-center">{(hotel.reviews || 0).toLocaleString()}</td>
                  <td className="td-center">
                    <span>{hotel.totalRooms || 0}</span>
                  </td>
                  <td className="td-amenities">
                    <div className="amenities-list">
                      {(hotel.amenities || []).slice(0, 3).map((amenity, idx) => (
                        <span key={idx} className="amenity-tag">{amenity}</span>
                      ))}
                      {(hotel.amenities || []).length > 3 && (
                        <span className="amenity-more">+{hotel.amenities.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge status-${hotel.status}`}>
                      {hotel.status}
                    </span>
                  </td>
                  <td className="td-actions">
                    <div className="action-buttons">
                      <button
                        className="btn-table-edit"
                        onClick={() => handleEdit(hotel)}
                        title="Edit"
                      >✏️</button>
                      <button
                        className="btn-table-delete"
                        onClick={() => handleDelete(hotel.id)}
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
            <span className="empty-icon">🏨</span>
            <h3>No hotels found</h3>
            <p>Try adjusting your filters or add a new hotel</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (modalMode === 'add' || modalMode === 'edit') && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-large glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalMode === 'add' ? '➕ Add New Hotel' : '✏️ Edit Hotel'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="hotel-form">
              <div className="form-section">
                <h3 className="section-title">📋 Basic Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Hotel Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                      placeholder="e.g., Cinnamon Grand Colombo"
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
                        <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Star Rating *</label>
                    <select
                      value={formData.starRating}
                      onChange={(e) => setFormData({...formData, starRating: e.target.value})}
                      required
                    >
                      {starOptions.map(s => (
                        <option key={s} value={s}>{'⭐'.repeat(s)} ({s} Star)</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Destination ID (optional)</label>
                    <input
                      type="number"
                      value={formData.destinationId}
                      onChange={(e) => setFormData({...formData, destinationId: e.target.value})}
                      placeholder="Enter destination ID if applicable"
                      min="1"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>City / Location *</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      required
                      placeholder="e.g., Colombo"
                    />
                  </div>

                  <div className="form-group">
                    <label>Price per Night ($) *</label>
                    <input
                      type="number"
                      value={formData.pricePerNight}
                      onChange={(e) => setFormData({...formData, pricePerNight: e.target.value})}
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Street Address *</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    required
                    placeholder="e.g., 77 Galle Road, Colombo 03"
                  />
                </div>

                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    required
                    rows="3"
                    placeholder="Describe the hotel..."
                  />
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title">🛏️ Rooms & Amenities</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Total Rooms</label>
                    <input
                      type="number"
                      value={formData.totalRooms}
                      onChange={(e) => setFormData({...formData, totalRooms: e.target.value})}
                      min="0"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Room Types (comma separated)</label>
                  <input
                    type="text"
                    value={formData.roomTypes}
                    onChange={(e) => setFormData({...formData, roomTypes: e.target.value})}
                    placeholder="e.g., Deluxe, Suite, Presidential"
                  />
                </div>

                <div className="form-group">
                  <label>Amenities (comma separated)</label>
                  <input
                    type="text"
                    value={formData.amenities}
                    onChange={(e) => setFormData({...formData, amenities: e.target.value})}
                    placeholder="e.g., WiFi, Pool, Spa, Restaurant"
                  />
                </div>

                <div className="form-group">
                  <label>Cancellation Policy</label>
                  <input
                    type="text"
                    value={formData.cancellationPolicy}
                    onChange={(e) => setFormData({...formData, cancellationPolicy: e.target.value})}
                    placeholder="e.g., Free cancellation up to 24 hours before check-in."
                  />
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title">🖼️ Media & Status</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Image URL</label>
                    <input
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                      placeholder="https://example.com/image.jpg"
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
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={saving}>
                  {saving ? 'Saving…' : (modalMode === 'add' ? 'Add Hotel' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recommendation Modal */}
      {showModal && modalMode === 'recommend' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-xlarge glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎯 Smart Hotel Recommendations</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="recommend-container">
              {/* Recommendation Filters */}
              <div className="recommend-filters">
                <h3>🔧 Preferences & Filters</h3>
                
                <div className="filter-section">
                  <label>💰 Maximum Budget (per night)</label>
                  <div className="budget-slider">
                    <input
                      type="range"
                      min="50"
                      max="500"
                      value={recFilters.budget}
                      onChange={(e) => setRecFilters({...recFilters, budget: parseInt(e.target.value)})}
                      className="slider"
                    />
                    <span className="budget-value">${recFilters.budget}</span>
                  </div>
                </div>

                <div className="filter-section">
                  <label>⭐ Minimum Rating</label>
                  <div className="rating-slider">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.1"
                      value={recFilters.minRating}
                      onChange={(e) => setRecFilters({...recFilters, minRating: parseFloat(e.target.value)})}
                      className="slider"
                    />
                    <span className="rating-value">{recFilters.minRating} ⭐</span>
                  </div>
                </div>

                <div className="filter-section">
                  <label>📍 Preferred Location</label>
                  <select
                    value={recFilters.location}
                    onChange={(e) => setRecFilters({...recFilters, location: e.target.value})}
                    className="filter-select"
                  >
                    <option value="all">All Locations</option>
                    {locations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-section">
                  <label>📏 Proximity Priority</label>
                  <select
                    value={recFilters.proximityTo}
                    onChange={(e) => setRecFilters({...recFilters, proximityTo: e.target.value})}
                    className="filter-select"
                  >
                    <option value="beach">Beach</option>
                    <option value="airport">Airport</option>
                    <option value="city">City Center</option>
                  </select>
                </div>

                <div className="filter-section">
                  <label>🎯 Required Amenities</label>
                  <div className="amenities-checkboxes">
                    {allAmenities.map(amenity => (
                      <label key={amenity} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={recFilters.amenities.includes(amenity)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRecFilters({...recFilters, amenities: [...recFilters.amenities, amenity]})
                            } else {
                              setRecFilters({...recFilters, amenities: recFilters.amenities.filter(a => a !== amenity)})
                            }
                          }}
                        />
                        {amenity}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recommended Hotels */}
              <div className="recommended-hotels">
                <h3>🏆 Top Recommendations (Ranked by Score)</h3>
                <p className="ranking-info">
                  Ranking based on: ⭐ Rating (40%) + 💰 Price (30%) + 📏 Proximity (30%)
                </p>
                
                <div className="recommendations-list">
                  {getRecommendations().length > 0 ? (
                    getRecommendations().map((hotel, index) => (
                      <div key={hotel.id} className="recommend-card glass-card">
                        <div className="recommend-rank">#{index + 1}</div>
                        <img src={hotel.imageUrl} alt={hotel.name} className="recommend-img" />
                        <div className="recommend-content">
                          <div className="recommend-header">
                            <h4>{hotel.name}</h4>
                            <span className="recommend-score">{hotel.rankingScore.toFixed(1)}/100</span>
                          </div>
                          <p className="recommend-location">📍 {hotel.location} • {hotel.category}</p>
                          <p className="recommend-description">{hotel.description}</p>
                          
                          <div className="recommend-details">
                            <div className="detail-item">
                              <span className="detail-label">Price:</span>
                              <span className="detail-value">${hotel.pricePerNight}/night</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Rating:</span>
                              <span className="detail-value">⭐ {hotel.rating} ({hotel.reviews} reviews)</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Total Rooms:</span>
                              <span className="detail-value">{hotel.totalRooms || '—'}</span>
                            </div>
                          </div>

                          <div className="recommend-amenities">
                            {(hotel.amenities || []).map((amenity, idx) => (
                              <span key={idx} className="rec-amenity-tag">{amenity}</span>
                            ))}
                          </div>

                          <div className="recommend-breakdown">
                            <span>Rating Score: {((hotel.rating / 5) * 40).toFixed(1)}</span>
                            <span>Price Score: {(Math.max(0, (1 - (hotel.pricePerNight / recFilters.budget)) * 60)).toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-recommendations">
                      <span className="empty-icon">🔍</span>
                      <h4>No hotels match your criteria</h4>
                      <p>Try adjusting your filters to see recommendations</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HotelManagement
