import { useState, useEffect, useCallback } from 'react'
import './ReviewManagement.css'
import { API_BASE } from '../../config/api'

const API = API_BASE
const authH = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

const mapReview = (r) => ({
  id: r.review_id || r.id,
  userId: r.user_id || r.userId,
  userName: r.user?.name || [r.user?.firstName, r.user?.lastName].filter(Boolean).join(' ') || 'Unknown User',
  userEmail: r.user?.email || '',
  userAvatar: r.user?.avatar || '👤',
  itemType: r.place?.hotels?.length > 0 ? 'hotel' : 'destination',
  hotelType: r.place?.hotels?.[0]?.hotel_type || '',
  itemId: r.place_id,
  itemName: r.place?.name || `Place #${r.place_id}`,
  rating: r.rating,
  title: r.title || '',
  comment: r.comment || '',
  visitDate: r.visit_date || r.visitDate || null,
  travelType: r.travel_type || r.travelType || '',
  likes: r.helpful || 0,
  dislikes: 0,
  status: r.status || 'approved',
  isFlagged: !!r.is_flagged,
  date: r.createdAt || r.created_at || new Date().toISOString(),
  createdAt: r.createdAt || r.created_at || null,
  updatedAt: r.updatedAt || r.updated_at || null,
  placeDistrict: r.place?.district?.name || '',
  placeProvince: r.place?.district?.province || '',
  placeLat: r.place?.lat,
  placeLng: r.place?.lng,
  responseBy: typeof r.response === 'object' && r.response !== null ? r.response.respondedBy : null,
  responseAt: typeof r.response === 'object' && r.response !== null ? r.response.respondedAt : null,
  adminResponse: (typeof r.response === 'object' && r.response !== null)
    ? (r.response.comment || '')
    : (r.response || ''),
})

const fmtDateTime = (v) => {
  if (!v) return 'Not available'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return 'Not available'
  return d.toLocaleString()
}

function ReviewManagement() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toastMsg, setToastMsg] = useState(null)
  const [saving, setSaving] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('view') // 'view', 'respond'
  const [selectedReview, setSelectedReview] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterRating, setFilterRating] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('date')

  const [responseText, setResponseText] = useState('')

  const showToast = (msg, type = 'success') => {
    setToastMsg({ msg, type })
    setTimeout(() => setToastMsg(null), 3000)
  }

  const loadReviews = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/reviews/admin/all?limit=200`, { headers: authH() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to load reviews')
      setReviews((data.data || []).map(mapReview))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadReviews() }, [loadReviews])

  // Open View Modal
  const handleView = (review) => {
    setModalMode('view')
    setSelectedReview(review)
    setShowModal(true)
  }

  // Open Response Modal
  const handleRespond = (review) => {
    setModalMode('respond')
    setSelectedReview(review)
    setResponseText(review.adminResponse || '')
    setShowModal(true)
  }

  // Handle Response Submit
  const handleResponseSubmit = async (e) => {
    e.preventDefault()
    if (!responseText.trim()) { showToast('⚠️ Response cannot be empty.', 'error'); return }
    if (responseText.trim().length > 1000) { showToast('⚠️ Response must be under 1000 characters.', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch(`${API}/reviews/${selectedReview.id}/response`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ comment: responseText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to submit response')
      setReviews(reviews.map(r =>
        r.id === selectedReview.id ? { ...r, adminResponse: responseText } : r
      ))
      showToast('✅ Response submitted successfully!')
      setShowModal(false)
    } catch (err) {
      showToast('⚠️ ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Handle Delete
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return
    try {
      const res = await fetch(`${API}/reviews/${id}`, { method: 'DELETE', headers: authH() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to delete review')
      setReviews(reviews.filter(r => r.id !== id))
      showToast('🗑️ Review deleted successfully!', 'delete')
    } catch (err) {
      showToast('⚠️ ' + err.message, 'error')
    }
  }

  // Flag review (sets is_flagged=true — separate from status)
  const handleFlag = async (id) => {
    try {
      const res = await fetch(`${API}/reviews/${id}/flag`, {
        method: 'POST',
        headers: authH(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to flag review')
      setReviews(reviews.map(r => r.id === id ? { ...r, isFlagged: true } : r))
      showToast('✅ Review flagged!')
    } catch (err) {
      showToast('⚠️ ' + err.message, 'error')
    }
  }

  const handleUnflag = async (id) => {
    try {
      let res = await fetch(`${API}/reviews/${id}/unflag`, {
        method: 'POST',
        headers: authH(),
      })
      // Backward-compatible fallback if a runtime only accepts PUT.
      if (!res.ok && res.status === 404) {
        res = await fetch(`${API}/reviews/${id}/unflag`, {
          method: 'PUT',
          headers: authH(),
        })
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to unflag review')
      setReviews(reviews.map(r => r.id === id ? { ...r, isFlagged: false } : r))
      showToast('✅ Review unflagged!')
    } catch (err) {
      showToast('⚠️ ' + err.message, 'error')
    }
  }

  const handleApprove = async (id) => {
    try {
      const res = await fetch(`${API}/reviews/${id}/status`, {
        method: 'PUT',
        headers: authH(),
        body: JSON.stringify({ status: 'approved' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to approve review')
      setReviews(reviews.map(r => r.id === id ? { ...r, status: 'approved', isFlagged: false } : r))
      showToast('✅ Review approved!')
    } catch (err) {
      showToast('⚠️ ' + err.message, 'error')
    }
  }

  const handleAdminFlag = async (id) => {
    try {
      const res = await fetch(`${API}/reviews/${id}/flag`, {
        method: 'POST',
        headers: authH(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to flag review')
      setReviews(reviews.map(r => r.id === id ? { ...r, status: 'rejected', isFlagged: true } : r))
      showToast('🚩 Review flagged as violation')
    } catch (err) {
      showToast('⚠️ ' + err.message, 'error')
    }
  }

  // Calculate Statistics
  const calculateStats = () => {
    const totalReviews = reviews.length
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews || 0
    const flaggedReviews = reviews.filter(r => r.isFlagged).length
    const approvedReviews = reviews.filter(r => r.status === 'approved').length
    const totalLikes = reviews.reduce((sum, r) => sum + r.likes, 0)
    const totalDislikes = reviews.reduce((sum, r) => sum + r.dislikes, 0)
    
    const ratingDistribution = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length
    }

    return { 
      totalReviews, 
      averageRating, 
      flaggedReviews,
      approvedReviews,
      totalLikes,
      totalDislikes,
      ratingDistribution
    }
  }

  // Filter and Sort Reviews
  const filteredReviews = reviews
    .filter(review => {
      const matchesSearch = (review.itemName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (review.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (review.comment || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = filterType === 'all' || review.itemType === filterType
      const matchesRating = filterRating === 'all' || review.rating === parseInt(filterRating)
      const matchesStatus = filterStatus === 'all'
        ? true
        : (filterStatus === 'flagged'
            ? review.isFlagged
            : (filterStatus === 'reported' ? review.status === 'pending' : review.status === filterStatus))
      return matchesSearch && matchesType && matchesRating && matchesStatus
    })
    .sort((a, b) => {
      switch(sortBy) {
        case 'date':
          return new Date(b.date) - new Date(a.date)
        case 'rating':
          return b.rating - a.rating
        case 'likes':
          return b.likes - a.likes
        default:
          return 0
      }
    })

  const destinationReviews = filteredReviews.filter(r => r.itemType === 'destination')
  const hotelReviews = filteredReviews.filter(r => r.itemType === 'hotel')

  const stats = calculateStats()

  // Render Star Rating
  const renderStars = (rating, interactive = false, onRate = null) => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map(star => (
          <span 
            key={star}
            className={`star ${star <= rating ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
            onClick={() => interactive && onRate && onRate(star)}
          >
            ★
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="review-management">
      {toastMsg && (
        <div className={`admin-toast ${toastMsg.type}`}>
          {toastMsg.msg}
        </div>
      )}
      {error && (
        <div style={{background:'#f44336',color:'#fff',padding:'10px 16px',borderRadius:6,marginBottom:12}}>
          Error: {error} — <button onClick={loadReviews} style={{background:'none',border:'none',color:'#fff',textDecoration:'underline',cursor:'pointer'}}>Retry</button>
        </div>
      )}

      {/* Header */}
      <div className="rm-header">
        <div>
          <h1 className="rm-title">Review & Feedback Management</h1>
          <p className="rm-subtitle">Monitor user feedback, ratings, and manage reviews</p>
        </div>
        <button className="btn-add-review" onClick={loadReviews} disabled={loading}>
          {loading ? '⏳ Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Statistics Dashboard */}
      <div className="review-stats">
        <h2 className="stats-title">📊 Review Analytics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">📝</span>
            <div className="stat-content">
              <span className="stat-value">{stats.totalReviews}</span>
              <span className="stat-label">Total Reviews</span>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon">⭐</span>
            <div className="stat-content">
              <span className="stat-value">{stats.averageRating.toFixed(1)}</span>
              <span className="stat-label">Average Rating</span>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon">🚩</span>
            <div className="stat-content">
              <span className="stat-value">{stats.flaggedReviews}</span>
              <span className="stat-label">Flagged Reviews</span>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon">✅</span>
            <div className="stat-content">
              <span className="stat-value">{stats.approvedReviews}</span>
              <span className="stat-label">Approved</span>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon">👍</span>
            <div className="stat-content">
              <span className="stat-value">{stats.totalLikes}</span>
              <span className="stat-label">Total Likes</span>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon">👎</span>
            <div className="stat-content">
              <span className="stat-value">{stats.totalDislikes}</span>
              <span className="stat-label">Total Dislikes</span>
            </div>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="rating-distribution">
          <h3>Rating Distribution</h3>
          <div className="distribution-bars">
            {[5, 4, 3, 2, 1].map(rating => {
              const count = stats.ratingDistribution[rating]
              const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0
              return (
                <div key={rating} className="distribution-row">
                  <span className="rating-label">{rating} ★</span>
                  <div className="distribution-bar">
                    <div 
                      className="distribution-fill"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="rating-count">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rm-filters">
        <div className="filter-group">
          <label>🔍 Search</label>
          <input
            type="text"
            placeholder="Search reviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>🏷️ Type</label>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="destination">Destinations</option>
            <option value="hotel">Hotels</option>
          </select>
        </div>

        <div className="filter-group">
          <label>⭐ Rating</label>
          <select 
            value={filterRating} 
            onChange={(e) => setFilterRating(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
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
            <option value="approved">Approved</option>
            <option value="reported">Reported</option>
            <option value="flagged">Flagged</option>
          </select>
        </div>

        <div className="filter-group">
          <label>🔢 Sort By</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="date">Date</option>
            <option value="rating">Rating</option>
            <option value="likes">Likes</option>
          </select>
        </div>
      </div>

      {/* Reviews Grid */}
      <div className="reviews-container">
        {loading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
            <p>Loading reviews…</p>
          </div>
        ) : filteredReviews.length > 0 ? (
          <>
            {filterType === 'all' && (
              <div className="rm-split-summary">
                <span className="rm-split-pill">📍 Destination Reviews: {destinationReviews.length}</span>
                <span className="rm-split-pill">🏨 Hotel Reviews: {hotelReviews.length}</span>
              </div>
            )}

            {filterType !== 'hotel' && destinationReviews.length > 0 && (
              <>
                <h3 className="rm-section-heading">📍 Destination Reviews</h3>
                <div className="reviews-grid">
                  {destinationReviews.map((review) => (
                    <div key={review.id} className={`review-card status-${review.status}`}>
                      <div className="review-header">
                        <div className="review-user">
                          <span className="user-avatar">{review.userAvatar}</span>
                          <div className="user-info">
                            <h3>{review.userName}</h3>
                            <span className="review-date">📅 {new Date(review.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <span className={`status-badge status-${review.status}`}>{review.status === 'pending' ? 'reported' : review.status}</span>
                      </div>

                      <div className="item-info">
                        <span className="item-type-badge destination">📍 destination</span>
                        <h4 className="item-name">{review.itemName}</h4>
                      </div>
                      <div className="review-meta">
                        <span className="engagement-btn">District: {review.placeDistrict || 'N/A'}</span>
                        <span className="engagement-btn">Province: {review.placeProvince || 'N/A'}</span>
                      </div>

                      <div className="review-rating">
                        {renderStars(review.rating)}
                        <span className="rating-text">{review.rating}.0</span>
                      </div>

                      {!!review.title && <h5 className="review-title">{review.title}</h5>}
                      <p className="review-comment">{review.comment}</p>

                      <div className="review-actions">
                        <button className="btn-respond" onClick={() => handleRespond(review)}>💬 Respond</button>
                        <button className="btn-view" onClick={() => handleView(review)}>👁️ View</button>
                        {review.status === 'pending' ? (
                          <>
                            <button className="btn-respond" onClick={() => handleApprove(review.id)} title="Approve reported review">✅ Approve</button>
                            <button className="btn-flag" onClick={() => handleAdminFlag(review.id)} title="Flag as policy violation">🚩 Flag</button>
                          </>
                        ) : (
                          <button
                            className="btn-flag"
                            onClick={() => (review.isFlagged ? handleUnflag(review.id) : handleFlag(review.id))}
                            title={review.isFlagged ? 'Unflag review' : 'Flag review'}
                          >
                            {review.isFlagged ? '✅ Unflag' : '🚩 Flag'}
                          </button>
                        )}
                        <button className="btn-delete" onClick={() => handleDelete(review.id)}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {filterType !== 'destination' && hotelReviews.length > 0 && (
              <>
                <h3 className="rm-section-heading">🏨 Hotel Reviews</h3>
                <div className="reviews-grid">
                  {hotelReviews.map((review) => (
                    <div key={review.id} className={`review-card status-${review.status}`}>
                      <div className="review-header">
                        <div className="review-user">
                          <span className="user-avatar">{review.userAvatar}</span>
                          <div className="user-info">
                            <h3>{review.userName}</h3>
                            <span className="review-date">📅 {new Date(review.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <span className={`status-badge status-${review.status}`}>{review.status === 'pending' ? 'reported' : review.status}</span>
                      </div>

                      <div className="item-info">
                        <span className="item-type-badge hotel">🏨 hotel</span>
                        <h4 className="item-name">{review.itemName}</h4>
                      </div>
                      <div className="review-meta">
                        <span className="engagement-btn">Hotel Type: {review.hotelType || 'N/A'}</span>
                        <span className="engagement-btn">District: {review.placeDistrict || 'N/A'}</span>
                      </div>

                      <div className="review-rating">
                        {renderStars(review.rating)}
                        <span className="rating-text">{review.rating}.0</span>
                      </div>

                      {!!review.title && <h5 className="review-title">{review.title}</h5>}
                      <p className="review-comment">{review.comment}</p>

                      <div className="review-actions">
                        <button className="btn-respond" onClick={() => handleRespond(review)}>💬 Respond</button>
                        <button className="btn-view" onClick={() => handleView(review)}>👁️ View</button>
                        {review.status === 'pending' ? (
                          <>
                            <button className="btn-respond" onClick={() => handleApprove(review.id)} title="Approve reported review">✅ Approve</button>
                            <button className="btn-flag" onClick={() => handleAdminFlag(review.id)} title="Flag as policy violation">🚩 Flag</button>
                          </>
                        ) : (
                          <button
                            className="btn-flag"
                            onClick={() => (review.isFlagged ? handleUnflag(review.id) : handleFlag(review.id))}
                            title={review.isFlagged ? 'Unflag review' : 'Flag review'}
                          >
                            {review.isFlagged ? '✅ Unflag' : '🚩 Flag'}
                          </button>
                        )}
                        <button className="btn-delete" onClick={() => handleDelete(review.id)}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">📝</span>
            <h3>No reviews found</h3>
            <p>Try adjusting your filters or add a new review</p>
          </div>
        )}
      </div>

      {/* View Modal */}
      {showModal && modalMode === 'view' && selectedReview && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content rm-view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>👁️ Review Details • #{selectedReview.id}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="review-details">
              <div className="rm-view-hero">
                <div>
                  <p className="rm-view-kicker">Review Content</p>
                  <h3>{selectedReview.title || 'Untitled Review'}</h3>
                  <p className="detail-comment">{selectedReview.comment || 'No comment provided.'}</p>
                </div>
                <div className="rm-view-hero-right">
                  <div className="detail-rating">
                    {renderStars(selectedReview.rating)}
                    <span>{selectedReview.rating}.0</span>
                  </div>
                  <span className={`status-badge status-${selectedReview.status}`}>{selectedReview.status === 'pending' ? 'reported' : selectedReview.status}</span>
                  {selectedReview.isFlagged && <span className="status-badge status-flagged">flagged</span>}
                </div>
              </div>

              <div className="rm-view-grid">
                <div className="rm-view-card">
                  <label>User</label>
                  <p>{selectedReview.userAvatar} {selectedReview.userName}</p>
                  <span>{selectedReview.userEmail || 'No email available'}</span>
                  <span>User ID: {selectedReview.userId || 'N/A'}</span>
                </div>

                <div className="rm-view-card">
                  <label>Place</label>
                  <p>{selectedReview.itemName}</p>
                  <span className={`item-type-badge ${selectedReview.itemType}`}>
                    {selectedReview.itemType === 'hotel' ? '🏨' : '📍'} {selectedReview.itemType}
                  </span>
                  <span>Place ID: {selectedReview.itemId || 'N/A'}</span>
                </div>

                <div className="rm-view-card">
                  <label>Location</label>
                  <p>{selectedReview.placeDistrict || 'District unavailable'}</p>
                  <span>{selectedReview.placeProvince || 'Province unavailable'}</span>
                  <span>Lat/Lng: {selectedReview.placeLat ?? 'N/A'}, {selectedReview.placeLng ?? 'N/A'}</span>
                </div>

                <div className="rm-view-card">
                  <label>Timeline</label>
                  <span>Created: {fmtDateTime(selectedReview.createdAt || selectedReview.date)}</span>
                  <span>Updated: {fmtDateTime(selectedReview.updatedAt)}</span>
                  <span>Visited: {selectedReview.visitDate ? new Date(selectedReview.visitDate).toLocaleDateString() : 'Not provided'}</span>
                </div>

                <div className="rm-view-card">
                  <label>Trip Details</label>
                  <span>Travel Type: {selectedReview.travelType || 'Not specified'}</span>
                  <div className="detail-engagement">
                    <span>👍 {selectedReview.likes} Likes</span>
                    <span>👎 {selectedReview.dislikes} Dislikes</span>
                  </div>
                </div>

                <div className="rm-view-card">
                  <label>Admin Response</label>
                  <p className="detail-response">{selectedReview.adminResponse || 'No admin response yet.'}</p>
                  <span>Responded By: {selectedReview.responseBy || 'N/A'}</span>
                  <span>Responded At: {fmtDateTime(selectedReview.responseAt)}</span>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Respond Modal */}
      {showModal && modalMode === 'respond' && selectedReview && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💬 Respond to Review</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleResponseSubmit} className="response-form">
              <div className="detail-group">
                <label>Review by:</label>
                <p>{selectedReview.userName} · {selectedReview.itemName}</p>
              </div>
              <div className="detail-group">
                <label>Review:</label>
                <p className="detail-comment">{selectedReview.comment}</p>
              </div>
              {!!selectedReview.title && (
                <div className="detail-group">
                  <label>Title:</label>
                  <p>{selectedReview.title}</p>
                </div>
              )}
              <div className="detail-group">
                <label>Response</label>
                <textarea
                  className="filter-input"
                  rows={4}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Write your admin response..."
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save" disabled={saving}>
                  {saving ? 'Saving…' : 'Send Response'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  )
}

export default ReviewManagement
