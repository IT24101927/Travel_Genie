import { useState, useEffect, useCallback } from 'react'
import './ReviewSection.css'

const API = 'http://localhost:5000/api'

/* ── helpers ───────────────────────────────────────────────── */
function getUser() {
  try { return JSON.parse(localStorage.getItem('currentUser')) } catch { return null }
}
function getToken() {
  return localStorage.getItem('token') || ''
}

function lsKey(targetType, targetId) {
  return `reviews_${targetType}_${targetId}`
}

function loadLocalReviews(targetType, targetId) {
  try {
    return JSON.parse(localStorage.getItem(lsKey(targetType, targetId))) || []
  } catch { return [] }
}

function saveLocalReviews(targetType, targetId, reviews) {
  localStorage.setItem(lsKey(targetType, targetId), JSON.stringify(reviews))
}

function avgRating(reviews) {
  if (!reviews.length) return 0
  return reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length
}

/* ── Star display ─────────────────────────────────────────── */
function Stars({ value, onChange, size = 20 }) {
  const [hover, setHover] = useState(0)
  const active = hover || value
  return (
    <div className="rs-stars" style={{ '--sz': `${size}px` }}>
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          className={`rs-star-btn${i <= active ? ' on' : ''}`}
          onMouseEnter={() => onChange && setHover(i)}
          onMouseLeave={() => onChange && setHover(0)}
          onClick={() => onChange?.(i)}
          aria-label={`${i} star`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function StaticStars({ value, size = 15 }) {
  return (
    <div className="rs-stars-static" style={{ '--sz': `${size}px` }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={`rs-star-s${i <= Math.round(value) ? ' on' : ''}`}>★</span>
      ))}
    </div>
  )
}

/* ── Single review card ─────────────────────────────────────── */
function ReviewCard({ review, currentUserId, onDelete, onHelpful }) {
  const name  = review.user?.name || review.authorName || 'Anonymous'
  const date  = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : review.date || ''
  const alreadyVoted = Array.isArray(review.helpfulBy) && review.helpfulBy.includes(currentUserId)
  const travelIcons  = { solo:'🧳', couple:'💑', family:'👨‍👩‍👧', friends:'👫', business:'💼' }

  return (
    <div className="rs-card">
      <div className="rs-card-header">
        <div className="rs-avatar">{(name[0] || '?').toUpperCase()}</div>
        <div className="rs-meta">
          <span className="rs-author">{name}</span>
          {review.travelType && (
            <span className="rs-travel-type">
              {travelIcons[review.travelType] || ''} {review.travelType}
            </span>
          )}
          <span className="rs-date">{date}</span>
        </div>
        <div className="rs-card-right">
          <StaticStars value={review.rating} />
          {review.wouldRecommend !== undefined && (
            <span className={`rs-recommend${review.wouldRecommend ? ' yes' : ' no'}`}>
              {review.wouldRecommend ? '👍 Recommends' : '👎 Not recommended'}
            </span>
          )}
        </div>
      </div>

      {review.title && <p className="rs-title">"{review.title}"</p>}
      <p className="rs-comment">{review.comment}</p>

      {(review.pros?.length > 0 || review.cons?.length > 0) && (
        <div className="rs-pros-cons">
          {review.pros?.length > 0 && (
            <div className="rs-pros">
              <span>✅ Pros:</span>
              {review.pros.map((p, i) => <span key={i} className="rs-tag">{p}</span>)}
            </div>
          )}
          {review.cons?.length > 0 && (
            <div className="rs-cons">
              <span>⚠️ Cons:</span>
              {review.cons.map((c, i) => <span key={i} className="rs-tag">{c}</span>)}
            </div>
          )}
        </div>
      )}

      <div className="rs-card-footer">
        <div className="rs-helpful">
          <span className="rs-helpful-label">Helpful?</span>
          <button
            className={`rs-helpful-btn${alreadyVoted ? ' voted' : ''}`}
            onClick={() => onHelpful(review, true)}
            disabled={alreadyVoted || !currentUserId}
          >
            👍 {review.helpful || 0}
          </button>
          <button
            className="rs-helpful-btn"
            onClick={() => onHelpful(review, false)}
            disabled={alreadyVoted || !currentUserId}
          >
            👎 {review.notHelpful || 0}
          </button>
        </div>
        {review.status === 'pending' && (
          <span className="rs-pending-badge">Pending approval</span>
        )}
        {currentUserId && (review.userId === currentUserId || review.authorId === currentUserId) && (
          <button className="rs-delete-btn" onClick={() => onDelete(review)}>Delete</button>
        )}
      </div>

      {review.response && (
        <div className="rs-response">
          <span className="rs-response-label">🏨 Response from TravelGenie team:</span>
          <p>{review.response.comment || review.response}</p>
        </div>
      )}
    </div>
  )
}

/* ── Write review form ─────────────────────────────────────── */
const TRAVEL_TYPES = ['solo','couple','family','friends','business']

function ReviewForm({ targetType, targetName, onSubmit, onCancel }) {
  const [rating,       setRating]       = useState(0)
  const [title,        setTitle]        = useState('')
  const [comment,      setComment]      = useState('')
  const [travelType,   setTravelType]   = useState('')
  const [recommend,    setRecommend]    = useState(true)
  const [prosInput,    setProsInput]    = useState('')
  const [consInput,    setConsInput]    = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0) { setError('Please select a star rating.'); return }
    if (!title.trim()) { setError('Please add a short title.'); return }
    if (comment.trim().length < 10) { setError('Comment must be at least 10 characters.'); return }
    setError('')
    setSubmitting(true)
    const pros = prosInput.split(',').map(s => s.trim()).filter(Boolean)
    const cons = consInput.split(',').map(s => s.trim()).filter(Boolean)
    await onSubmit({ rating, title: title.trim(), comment: comment.trim(), travelType, wouldRecommend: recommend, pros, cons })
    setSubmitting(false)
  }

  return (
    <form className="rs-form" onSubmit={handleSubmit}>
      <h4 className="rs-form-title">Write a review for <em>{targetName}</em></h4>

      <div className="rs-form-group">
        <label>Overall rating *</label>
        <Stars value={rating} onChange={setRating} size={28} />
        <span className="rs-rating-label">
          {['','Poor','Fair','Good','Very Good','Excellent'][rating] || ''}
        </span>
      </div>

      <div className="rs-form-group">
        <label>Title *</label>
        <input
          className="rs-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={`Summarise your experience at ${targetName}`}
          maxLength={100}
        />
      </div>

      <div className="rs-form-group">
        <label>Your review *</label>
        <textarea
          className="rs-textarea"
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Share what you liked, what could be better, and any tips for future visitors…"
          rows={4}
        />
        <span className="rs-char-count">{comment.length} characters</span>
      </div>

      <div className="rs-form-row">
        <div className="rs-form-group half">
          <label>Pros (comma-separated)</label>
          <input
            className="rs-input"
            value={prosInput}
            onChange={e => setProsInput(e.target.value)}
            placeholder="Great views, Friendly staff"
          />
        </div>
        <div className="rs-form-group half">
          <label>Cons (comma-separated)</label>
          <input
            className="rs-input"
            value={consInput}
            onChange={e => setConsInput(e.target.value)}
            placeholder="Crowded, Limited parking"
          />
        </div>
      </div>

      <div className="rs-form-row">
        <div className="rs-form-group half">
          <label>Type of travel</label>
          <div className="rs-travel-pills">
            {TRAVEL_TYPES.map(t => (
              <button
                key={t}
                type="button"
                className={`rs-travel-pill${travelType === t ? ' active' : ''}`}
                onClick={() => setTravelType(travelType === t ? '' : t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="rs-form-group half">
          <label>Would you recommend?</label>
          <div className="rs-rec-toggle">
            <button type="button" className={`rs-rec-btn${recommend ? ' active' : ''}`} onClick={() => setRecommend(true)}>
              👍 Yes
            </button>
            <button type="button" className={`rs-rec-btn${!recommend ? ' active no' : ''}`} onClick={() => setRecommend(false)}>
              👎 No
            </button>
          </div>
        </div>
      </div>

      {error && <p className="rs-error">{error}</p>}

      <div className="rs-form-actions">
        <button type="button" className="rs-cancel-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="rs-submit-btn" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Review'}
        </button>
      </div>
    </form>
  )
}

/* ══════════════════════════════════════════════════════════════
   Main ReviewSection component
   Props:
     targetType  : 'hotel' | 'place'
     targetId    : string  (hotel._id or `${districtId}_${placeId}`)
     targetName  : string  (display name)
     dbId        : number|null  (real DB id for backend calls; null = local only)
   ══════════════════════════════════════════════════════════════ */
export default function ReviewSection({ targetType, targetId, targetName, dbId }) {
  const [reviews,    setReviews]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [showAll,    setShowAll]    = useState(false)
  const [sortBy,     setSortBy]     = useState('newest')  // newest | highest | helpful
  const [filterStar, setFilterStar] = useState(0)
  const [useBackend, setUseBackend] = useState(!!dbId)

  const user      = getUser()
  const userId    = user?.id || null

  /* ── load reviews ── */
  const fetchReviews = useCallback(async () => {
    setLoading(true)
    let loaded = []
    let backendOk = false

    if (dbId) {
      try {
        const endpoint = targetType === 'hotel'
          ? `${API}/reviews/hotel/${dbId}`
          : `${API}/reviews/destination/${dbId}`
        const res  = await fetch(endpoint)
        const data = await res.json()
        if (res.ok && data.success) {
          loaded    = data.data || []
          backendOk = true
        }
      } catch { /* fallthrough */ }
    }
    setUseBackend(backendOk)

    if (!backendOk) {
      loaded = loadLocalReviews(targetType, targetId)
    }

    setReviews(loaded)
    setLoading(false)
  }, [dbId, targetType, targetId])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  /* ── submit ── */
  const handleSubmit = async (formData) => {
    const token = getToken()

    if (useBackend && token) {
      try {
        const body = {
          reviewType: targetType === 'hotel' ? 'hotel' : 'destination',
          rating: formData.rating,
          title: formData.title,
          comment: formData.comment,
          travelType: formData.travelType || undefined,
          wouldRecommend: formData.wouldRecommend,
          pros: formData.pros,
          cons: formData.cons,
        }
        if (targetType === 'hotel') body.hotel = dbId
        else body.destination = dbId

        const res  = await fetch(`${API}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (res.ok && data.success) {
          setShowForm(false)
          fetchReviews()
          return
        }
        if (data.message?.includes('already reviewed')) {
          alert('You have already submitted a review for this item.')
          setShowForm(false)
          return
        }
      } catch { /* fallthrough to local */ }
    }

    // local storage fallback
    const existing = loadLocalReviews(targetType, targetId)
    if (existing.find(r => r.authorId === userId)) {
      alert('You have already reviewed this item.')
      setShowForm(false)
      return
    }
    const newReview = {
      id: `local_${Date.now()}`,
      authorId: userId,
      authorName: user?.name || 'Anonymous',
      ...formData,
      date: new Date().toISOString(),
      helpful: 0,
      notHelpful: 0,
      helpfulBy: [],
      status: 'approved',
    }
    const updated = [newReview, ...existing]
    saveLocalReviews(targetType, targetId, updated)
    setReviews(updated)
    setShowForm(false)
  }

  /* ── delete ── */
  const handleDelete = async (review) => {
    if (!window.confirm('Delete this review?')) return

    if (review.id && !String(review.id).startsWith('local_')) {
      const token = getToken()
      try {
        await fetch(`${API}/reviews/${review.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
        fetchReviews()
        return
      } catch { /* fallthrough */ }
    }

    const existing = loadLocalReviews(targetType, targetId)
    const updated  = existing.filter(r => r.id !== review.id)
    saveLocalReviews(targetType, targetId, updated)
    setReviews(updated)
  }

  /* ── helpful ── */
  const handleHelpful = async (review, isHelpful) => {
    if (!userId) return
    if (String(review.id).startsWith('local_')) {
      const existing = loadLocalReviews(targetType, targetId)
      const updated  = existing.map(r => {
        if (r.id !== review.id) return r
        if ((r.helpfulBy || []).includes(userId)) return r
        return {
          ...r,
          helpful:    r.helpful    + (isHelpful ? 1 : 0),
          notHelpful: r.notHelpful + (isHelpful ? 0 : 1),
          helpfulBy:  [...(r.helpfulBy || []), userId],
        }
      })
      saveLocalReviews(targetType, targetId, updated)
      setReviews(updated)
      return
    }
    const token = getToken()
    try {
      await fetch(`${API}/reviews/${review.id}/helpful`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ helpful: isHelpful }),
      })
      fetchReviews()
    } catch { /* silent */ }
  }

  /* ── sort + filter ── */
  const sorted = [...reviews]
    .filter(r => filterStar === 0 || r.rating === filterStar)
    .sort((a, b) => {
      if (sortBy === 'highest') return b.rating - a.rating
      if (sortBy === 'helpful') return (b.helpful || 0) - (a.helpful || 0)
      return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
    })

  const visible = showAll ? sorted : sorted.slice(0, 3)

  const avg   = avgRating(reviews)
  const total = reviews.length

  const ratingDist = [5, 4, 3, 2, 1].map(s => ({
    star: s,
    count: reviews.filter(r => r.rating === s).length,
    pct: total ? Math.round((reviews.filter(r => r.rating === s).length / total) * 100) : 0,
  }))

  return (
    <div className="rs-root">
      {/* ── Summary bar ── */}
      <div className={`rs-summary${total === 0 ? ' empty' : ''}`}>
        <div className="rs-score-block">
          <span className="rs-big-score">{total ? avg.toFixed(1) : '—'}</span>
          {total > 0 && <StaticStars value={avg} size={18} />}
          <span className="rs-total-label">{total} review{total !== 1 ? 's' : ''}</span>
        </div>

        {total > 0 && (
          <div className="rs-dist">
            {ratingDist.map(({ star, count, pct }) => (
              <div key={star} className="rs-dist-row">
                <span className="rs-dist-label">{star}★</span>
                <div className="rs-dist-bar">
                  <div className="rs-dist-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="rs-dist-count">{count}</span>
              </div>
            ))}
          </div>
        )}

        <div className="rs-summary-actions">
          {user ? (
            <button className="rs-write-btn" onClick={() => setShowForm(s => !s)}>
              {showForm ? '✕ Cancel' : '✏️ Write a review'}
            </button>
          ) : (
            <p className="rs-login-prompt">
              <a href="/login">Log in</a> to write a review
            </p>
          )}
        </div>
      </div>

      {/* ── Write form ── */}
      {showForm && (
        <ReviewForm
          targetType={targetType}
          targetName={targetName}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* ── Controls ── */}
      {total > 0 && (
        <div className="rs-controls">
          <div className="rs-sort-group">
            <span className="rs-ctrl-label">Sort:</span>
            {[['newest','Newest'],['highest','Highest rated'],['helpful','Most helpful']].map(([v, l]) => (
              <button key={v} className={`rs-ctrl-pill${sortBy === v ? ' active' : ''}`} onClick={() => setSortBy(v)}>{l}</button>
            ))}
          </div>
          <div className="rs-filter-group">
            <span className="rs-ctrl-label">Filter:</span>
            {[0,5,4,3,2,1].map(s => (
              <button key={s} className={`rs-ctrl-pill${filterStar === s ? ' active' : ''}`} onClick={() => setFilterStar(s)}>
                {s === 0 ? 'All' : `${s}★`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Reviews list ── */}
      {loading ? (
        <div className="rs-loading">
          <div className="rs-dot"/><div className="rs-dot"/><div className="rs-dot"/>
        </div>
      ) : sorted.length === 0 ? (
        <div className="rs-empty">
          <span>💬</span>
          <p>{filterStar ? `No ${filterStar}-star reviews yet.` : `No reviews yet. Be the first to review ${targetName}!`}</p>
        </div>
      ) : (
        <>
          <div className="rs-list">
            {visible.map((r, i) => (
              <ReviewCard
                key={r.id || i}
                review={r}
                currentUserId={userId}
                onDelete={handleDelete}
                onHelpful={handleHelpful}
              />
            ))}
          </div>

          {sorted.length > 3 && (
            <button className="rs-show-more" onClick={() => setShowAll(s => !s)}>
              {showAll ? '▲ Show fewer reviews' : `▼ Show all ${sorted.length} reviews`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
