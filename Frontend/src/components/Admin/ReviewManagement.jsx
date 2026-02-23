import { useState, useEffect, useCallback } from 'react'
import './ReviewManagement.css'

const API = 'http://localhost:5000/api'
const authH = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

const mapReview = (r) => ({
  id: r.id,
  userId: r.userId,
  userName: r.user?.name || 'Unknown User',
  userAvatar: r.user?.avatar || '👤',
  itemType: r.reviewType,
  itemId: r.destinationId || r.hotelId || r.tripId,
  itemName: r.destination?.name || r.hotel?.name || (r.tripId ? `Trip #${r.tripId}` : 'Unknown'),
  rating: r.rating,
  title: r.title || '',
  comment: r.comment,
  likes: r.helpful || 0,
  dislikes: r.notHelpful || 0,
  status: r.status,
  date: r.createdAt,
  adminResponse: r.response?.comment || '',
})

function ReviewManagement({ theme, toggleTheme }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toastMsg, setToastMsg] = useState('')
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

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
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
      showToast('Response submitted successfully!')
      setShowModal(false)
    } catch (err) {
      showToast('Error: ' + err.message)
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
      showToast('Review deleted successfully!')
    } catch (err) {
      showToast('Error: ' + err.message)
    }
  }

  // Handle Status Change
  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`${API}/reviews/${id}/status`, {
        method: 'PUT',
        headers: authH(),
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to update status')
      setReviews(reviews.map(r => r.id === id ? { ...r, status: newStatus } : r))
      showToast(`Review ${newStatus} successfully!`)
    } catch (err) {
      showToast('Error: ' + err.message)
    }
  }

  // Calculate Statistics
  const calculateStats = () => {
    const totalReviews = reviews.length
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews || 0
    const pendingReviews = reviews.filter(r => r.status === 'pending').length
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
      pendingReviews, 
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
      const matchesStatus = filterStatus === 'all' || review.status === filterStatus
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
        <div className="toast-notification" style={{position:'fixed',top:20,right:20,background:'#4caf50',color:'#fff',padding:'12px 20px',borderRadius:8,zIndex:9999,boxShadow:'0 4px 12px rgba(0,0,0,0.2)'}}>
          {toastMsg}
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
      <div className="review-stats glass-card">
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
            <span className="stat-icon">⏳</span>
            <div className="stat-content">
              <span className="stat-value">{stats.pendingReviews}</span>
              <span className="stat-label">Pending Review</span>
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
      <div className="rm-filters glass-card">
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
            <option value="trip">Trips</option>
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
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
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
          <div className="glass-card" style={{textAlign:'center',padding:'40px',color:'var(--text-secondary)'}}>
            <p>⏳ Loading reviews...</p>
          </div>
        ) : filteredReviews.length > 0 ? (
          <div className="reviews-grid">
            {filteredReviews.map(review => (
              <div key={review.id} className={`review-card glass-card status-${review.status}`}>
                {/* Review Header */}
                <div className="review-header">
                  <div className="review-user">
                    <span className="user-avatar">{review.userAvatar}</span>
                    <div className="user-info">
                      <h3>{review.userName}</h3>
                      <span className="review-date">📅 {new Date(review.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className={`status-badge status-${review.status}`}>
                    {review.status}
                  </span>
                </div>

                {/* Item Info */}
                <div className="item-info">
                  <span className={`item-type-badge ${review.itemType}`}>
                    {review.itemType === 'hotel' ? '🏨' : review.itemType === 'destination' ? '📍' : '🗺️'} 
                    {review.itemType}
                  </span>
                  <h4 className="item-name">{review.itemName}</h4>
                </div>

                {/* Rating */}
                <div className="review-rating">
                  {renderStars(review.rating)}
                  <span className="rating-text">{review.rating}.0</span>
                </div>

                {/* Comment */}
                <p className="review-comment">{review.comment}</p>

                {/* Admin Response */}
                {review.adminResponse && (
                  <div className="admin-response">
                    <div className="response-header">
                      <span className="response-icon">💬</span>
                      <span className="response-label">Admin Response:</span>
                    </div>
                    <p>{review.adminResponse}</p>
                  </div>
                )}

                {/* Like/Dislike Stats */}
                <div className="review-engagement">
                  <div className="engagement-stats">
                    <span className="engagement-btn like">👍 {review.likes}</span>
                    <span className="engagement-btn dislike">👎 {review.dislikes}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="review-actions">
                  {review.status === 'pending' && (
                    <>
                      <button 
                        className="btn-approve"
                        onClick={() => handleStatusChange(review.id, 'approved')}
                      >
                        ✅ Approve
                      </button>
                      <button 
                        className="btn-reject"
                        onClick={() => handleStatusChange(review.id, 'rejected')}
                      >
                        ❌ Reject
                      </button>
                    </>
                  )}
                  <button 
                    className="btn-respond"
                    onClick={() => handleRespond(review)}
                  >
                    💬 {review.adminResponse ? 'Edit Response' : 'Respond'}
                  </button>
                  <button 
                    className="btn-view"
                    onClick={() => handleView(review)}
                  >
                    👁️ View
                  </button>
                  <button 
                    className="btn-delete"
                    onClick={() => handleDelete(review.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state glass-card">
            <span className="empty-icon">📝</span>
            <h3>No reviews found</h3>
            <p>Try adjusting your filters or add a new review</p>
          </div>
        )}
      </div>

      {/* View Modal */}
      {showModal && modalMode === 'view' && selectedReview && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>👁️ Review Details</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="review-details">
              <div className="detail-group">
                <label>User:</label>
                <p>{selectedReview.userAvatar} {selectedReview.userName}</p>
              </div>

              <div className="detail-group">
                <label>Item Type:</label>
                <p className={`item-type-badge ${selectedReview.itemType}`}>
                  {selectedReview.itemType === 'hotel' ? '🏨' : selectedReview.itemType === 'destination' ? '📍' : '🗺️'} 
                  {selectedReview.itemType}
                </p>
              </div>

              <div className="detail-group">
                <label>Item Name:</label>
                <p>{selectedReview.itemName}</p>
              </div>

              <div className="detail-group">
                <label>Rating:</label>
                <div className="detail-rating">
                  {renderStars(selectedReview.rating)}
                  <span>{selectedReview.rating}.0</span>
                </div>
              </div>

              <div className="detail-group">
                <label>Date:</label>
                <p>{new Date(selectedReview.date).toLocaleDateString()}</p>
              </div>

              <div className="detail-group">
                <label>Status:</label>
                <span className={`status-badge status-${selectedReview.status}`}>
                  {selectedReview.status}
                </span>
              </div>

              <div className="detail-group">
                <label>Comment:</label>
                <p className="detail-comment">{selectedReview.comment}</p>
              </div>

              <div className="detail-group">
                <label>Engagement:</label>
                <div className="detail-engagement">
                  <span>👍 {selectedReview.likes} Likes</span>
                  <span>👎 {selectedReview.dislikes} Dislikes</span>
                </div>
              </div>

              {selectedReview.adminResponse && (
                <div className="detail-group">
                  <label>Admin Response:</label>
                  <p className="detail-response">{selectedReview.adminResponse}</p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Respond Modal */}
      {showModal && modalMode === 'respond' && selectedReview && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💬 Respond to Review</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="respond-context">
              <div className="context-header">
                <span className="context-user">{selectedReview.userAvatar} {selectedReview.userName}</span>
                <span className="context-rating">{renderStars(selectedReview.rating)} {selectedReview.rating}.0</span>
              </div>
              <p className="context-comment">"{selectedReview.comment}"</p>
            </div>

            <form onSubmit={handleResponseSubmit} className="response-form">
              <div className="form-group">
                <label>Your Response *</label>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  required
                  rows="4"
                  placeholder="Write your response to this review..."
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={saving}>
                  {saving ? 'Submitting...' : 'Submit Response'}
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
