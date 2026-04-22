import { useState, useEffect, useCallback } from 'react'
import './ReviewSection.css'
import { API_BASE } from '../../config/api'

const API = API_BASE

/* ── helpers ───────────────────────────────────────────────── */
function getUser() {
  try { return JSON.parse(localStorage.getItem('currentUser')) } catch { return null }
}
function getToken() {
  return localStorage.getItem('token') || ''
}

function apiErrorMessage(data, fallback) {
  if (!data || typeof data !== 'object') return fallback
  if (typeof data.message === 'string' && data.message.trim()) return data.message
  if (typeof data.error === 'string' && data.error.trim()) return data.error
  if (Array.isArray(data.error) && data.error.length) return data.error.join(', ')
  if (Array.isArray(data.message) && data.message.length) return data.message.join(', ')
  return fallback
}

async function didReviewPersistForPlace(token, dbId, expectedComment) {
  if (!token || !dbId) return false
  try {
    const mineRes = await fetch(`${API}/reviews/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const mineJson = await mineRes.json().catch(() => null)
    if (!mineRes.ok || !mineJson?.success || !Array.isArray(mineJson.data)) return false

    const normalizedExpected = String(expectedComment || '').trim()
    return mineJson.data.some((r) => (
      String(r.place_id) === String(dbId) &&
      String(r.comment || '').trim() === normalizedExpected
    ))
  } catch {
    return false
  }
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
function ReviewCard({ review, currentUserId, onDelete, onEdit, onHelpful, onFlag }) {
  const name  = review.user?.name || review.authorName || 'Anonymous'
  const _rawDate = review.createdAt || review.date
  const date  = _rawDate
    ? new Date(_rawDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''
  const visitDate = review.visit_date
    ? new Date(review.visit_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''
  const alreadyVoted = Array.isArray(review.helpfulBy) && review.helpfulBy.includes(currentUserId)
  const travelIcons  = { solo:'🧳', couple:'👑', family:'👨‍👩‍👧', friends:'👫', business:'💼' }
  const _cuid = currentUserId != null ? String(currentUserId) : null
  // Local reviews (local_* id) only exist in this browser — always owned by the current user
  const isLocalReview = String(review.id || '').startsWith('local_')
  const isFlagged = !!(review.is_flagged || review.isFlagged)
  const isReported = isFlagged || review.status === 'pending'
  const isOwn = isLocalReview || (_cuid && (
    String(review.userId)    === _cuid ||
    String(review.authorId)  === _cuid ||
    String(review.user_id)   === _cuid ||
    String(review.user?.id)  === _cuid
  ))

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

      {visitDate && <p className="rs-visit-date">📅 Visited: {visitDate}</p>}
      {review.title && <p className="rs-title">"{review.title}"</p>}
      <p className="rs-comment">{review.comment}</p>

      {isReported && isOwn && (
        <div className="rs-response" style={{ borderColor: '#f59e0b', background: 'rgba(245, 158, 11, 0.08)' }}>
          <span className="rs-response-label">🚩 This review was reported</span>
          <p>Your review is under admin moderation and currently hidden from public listings.</p>
        </div>
      )}

      {(review.pros?.length > 0 || review.cons?.length > 0) && (
        <div className="rs-pros-cons">
          {review.pros?.length > 0 && (
            <div className="rs-pros">
              <span>✅ Loved It:</span>
              {review.pros.map((p, i) => <span key={i} className="rs-tag">{p}</span>)}
            </div>
          )}
          {review.cons?.length > 0 && (
            <div className="rs-cons">
              <span>⚠️ Watch Out:</span>
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
          {!isOwn && !isLocalReview && (
            <button
              className={`rs-helpful-btn${isFlagged ? ' voted' : ''}`}
              onClick={() => onFlag(review)}
              disabled={!currentUserId || isReported}
              title={isReported ? 'Already reported' : 'Report this review'}
            >
              🚩 {isReported ? 'Reported' : 'Report'}
            </button>
          )}
        </div>
        {isOwn && (
          <div className="rs-owner-actions">
            <button className="rs-edit-btn" onClick={() => onEdit(review)}>✏️ Edit</button>
            <button className="rs-delete-btn" onClick={() => onDelete(review)}>Delete</button>
          </div>
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

function ReviewForm({ targetName, onSubmit, onCancel }) {
  const [rating,       setRating]       = useState(0)
  const [title,        setTitle]        = useState('')
  const [comment,      setComment]      = useState('')
  const [travelType,   setTravelType]   = useState('')
  const [visitDate,    setVisitDate]    = useState('')
  const [recommend,    setRecommend]    = useState(true)
  const [prosInput,    setProsInput]    = useState('')
  const [consInput,    setConsInput]    = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0) { setError('Please select a star rating.'); return }
    if (!comment.trim()) { setError('Please write your review comment.'); return }
    if (comment.trim().length < 10) { setError('Review comment must be at least 10 characters.'); return }
    if (comment.trim().length > 2000) { setError('Review comment must be under 2000 characters.'); return }
    if (title.trim().length > 100) { setError('Title must be 100 characters or fewer.'); return }
    if (visitDate && new Date(visitDate) > new Date()) { setError('Visit date cannot be in the future.'); return }
    setError('')
    setSubmitting(true)
    const pros = prosInput.split(',').map(s => s.trim()).filter(Boolean)
    const cons = consInput.split(',').map(s => s.trim()).filter(Boolean)
    try {
      const result = await onSubmit({ rating, title: title.trim(), comment: comment.trim(), travelType, visit_date: visitDate || null, wouldRecommend: recommend, pros, cons })
      if (result && result.ok === false && result.message) {
        setError(result.message)
      }
    } finally {
      setSubmitting(false)
    }
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
        <label>Title</label>
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
          <label>What We Loved</label>
          <input
            className="rs-input"
            value={prosInput}
            onChange={e => setProsInput(e.target.value)}
            placeholder="Amazing views, Friendly staff"
          />
        </div>
        <div className="rs-form-group half">
          <label>Watch Out For</label>
          <input
            className="rs-input"
            value={consInput}
            onChange={e => setConsInput(e.target.value)}
            placeholder="Gets crowded, Limited parking"
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

      <div className="rs-form-row">
        <div className="rs-form-group half">
          <label>Date of visit</label>
          <input
            type="date"
            className="rs-input"
            value={visitDate}
            onChange={e => setVisitDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
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
     targetType  : 'hotel' | 'place' | 'destination'
     targetId    : string  (used as localStorage key)
     targetName  : string  (display name)
     districtName: string  (district display name)
     dbId        : number|null  (place_id from DB; null = local only)
   ══════════════════════════════════════════════════════════════ */
export default function ReviewSection({ targetType, targetId, targetName, districtName = '', dbId }) {
  const [reviews,      setReviews]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [showAll,      setShowAll]      = useState(false)
  const [sortBy,       setSortBy]       = useState('newest')
  const [filterStar,   setFilterStar]   = useState(0)
  const [useBackend,   setUseBackend]   = useState(!!dbId)
  const [editingReview, setEditingReview] = useState(null)
  const [editForm,     setEditForm]     = useState({ rating: 0, title: '', comment: '', travelType: '', wouldRecommend: true, pros: '', cons: '', visitDate: '' })
  const [submitError,  setSubmitError]  = useState('')

  const user      = getUser()
  const userId    = user?.id || null

  const toReviewId = (r) => String(r?.review_id || r?.id || '')

  /* ── load reviews ── */
  const fetchReviews = useCallback(async () => {
    setLoading(true)
    let loaded = []
    let backendOk = false

    if (dbId) {
      try {
        // New EER schema: all reviews fetched by place_id regardless of type
        const res  = await fetch(`${API}/reviews/place/${dbId}`)
        const data = await res.json()
        if (res.ok && data.success) {
          loaded    = data.data || []
          backendOk = true

          // Include current user's own review (can be pending/rejected and not returned by public place endpoint).
          const token = getToken()
          if (token) {
            try {
              const mineRes = await fetch(`${API}/reviews/my`, {
                headers: { Authorization: `Bearer ${token}` },
              })
              const mineJson = await mineRes.json().catch(() => null)
              if (mineRes.ok && mineJson?.success && Array.isArray(mineJson.data)) {
                const mineForPlace = mineJson.data.filter((r) => String(r.place_id) === String(dbId))
                const existingIds = new Set(loaded.map((r) => toReviewId(r)).filter(Boolean))
                const mergedMine = mineForPlace.filter((r) => {
                  const id = toReviewId(r)
                  return !id || !existingIds.has(id)
                })
                loaded = [...mergedMine, ...loaded]
              }
            } catch {
              // Non-blocking enhancement only.
            }
          }
        }
      } catch { /* fallthrough */ }
    }
    setUseBackend(backendOk)

    if (!backendOk) {
      loaded = loadLocalReviews(targetType, targetId)
      // Backfill placeName / districtName / targetType on legacy reviews saved before we added the fields
      const needsPatch = loaded.some(r => !r.placeName || !r.districtName || !r.targetType)
      if (needsPatch) {
        const patched = loaded.map(r => ({
          ...r,
          placeName:    r.placeName    || targetName    || '',
          districtName: r.districtName || districtName  || '',
          targetType:   r.targetType   || targetType    || 'place',
        }))
        saveLocalReviews(targetType, targetId, patched)
        loaded = patched
      }
    }

    // Keep a targetId → placeName+districtName+targetType map so Dashboard can look up names
    if (targetName) {
      try {
        const map = JSON.parse(localStorage.getItem('placeNamesMap') || '{}')
        map[`${targetType}_${targetId}`] = { name: targetName, district: districtName, targetType }
        localStorage.setItem('placeNamesMap', JSON.stringify(map))
      } catch { /* ignore */ }
    }

    setReviews(loaded)
    setLoading(false)
  }, [dbId, targetType, targetId, targetName, districtName])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  const finalizeSubmitSuccess = () => {
    setShowForm(false)
    fetchReviews()
    window.dispatchEvent(new CustomEvent('reviewsUpdated'))
  }

  /* ── submit ── */
  const handleSubmit = async (formData) => {
    setSubmitError('')
    const token = getToken()

    if (useBackend && token) {
      try {
        // New EER schema: submit review using place_id only
        const body = {
          place_id: dbId,
          rating: formData.rating,
          title: formData.title,
          comment: formData.comment,
          travel_type: formData.travelType || undefined,
          visit_date: formData.visit_date || undefined,
        }

        const res  = await fetch(`${API}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (res.ok && data.success) {
          finalizeSubmitSuccess()
          return { ok: true }
        }
        if (apiErrorMessage(data, '').toLowerCase().includes('already reviewed')) {
          const message = 'You have already submitted a review for this item.'
          setSubmitError(message)
          return { ok: false, message }
        }

        const message = apiErrorMessage(data, 'Failed to save review to database.')

        // Defensive fallback for legacy backend hook failures where the row is inserted
        // but response returns an error (e.g., stale destinations table reference).
        const persistedDespiteError = await didReviewPersistForPlace(token, dbId, formData.comment)
        if (persistedDespiteError) {
          finalizeSubmitSuccess()
          return { ok: true }
        }

        setSubmitError(message)
        return { ok: false, message }
      } catch {
        const message = 'Could not reach the server. Please try again.'
        setSubmitError(message)
        return { ok: false, message }
      }
    }

    if (dbId) {
      const message = 'You must be logged in with a valid session to save reviews.'
      setSubmitError(message)
      return { ok: false, message }
    }

    // local storage fallback
    const existing = loadLocalReviews(targetType, targetId)
    if (existing.find(r => r.authorId === userId)) {
      const message = 'You have already reviewed this item.'
      alert(message)
      setShowForm(false)
      return { ok: false, message }
    }
    const newReview = {
      id: `local_${Date.now()}`,
      authorId: userId,
      authorName: user?.name || 'Anonymous',
      placeName: targetName,
      districtName,
      targetType,
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
    window.dispatchEvent(new CustomEvent('reviewsUpdated'))
    return { ok: true }
  }

  /* ── delete ── */
  const handleDelete = async (review) => {
    if (!window.confirm('Delete this review?')) return

    const rid = review.review_id || review.id

    if (rid && !String(rid).startsWith('local_')) {
      const token = getToken()
      try {
        const res = await fetch(`${API}/reviews/${rid}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to delete review')
        fetchReviews()
        window.dispatchEvent(new CustomEvent('reviewsUpdated'))
        return
      } catch { /* fallthrough */ }
    }

    const existing = loadLocalReviews(targetType, targetId)
    const updated  = existing.filter(r => toReviewId(r) !== String(rid))
    saveLocalReviews(targetType, targetId, updated)
    setReviews(updated)
    window.dispatchEvent(new CustomEvent('reviewsUpdated'))
  }

  /* ── open inline edit ── */
  const handleOpenEdit = (review) => {
    setEditForm({
      rating:         review.rating        || 0,
      title:          review.title         || '',
      comment:        review.comment       || '',
      travelType:     review.travel_type   || review.travelType || '',
      wouldRecommend: review.wouldRecommend !== false,
      pros:           Array.isArray(review.pros) ? review.pros.join(', ') : (review.pros || ''),
      cons:           Array.isArray(review.cons) ? review.cons.join(', ') : (review.cons || ''),
      visitDate:      (review.visit_date || '').slice(0, 10),
    })
    setEditingReview(review)
    setShowForm(false)
  }

  /* ── save edit ── */
  const handleSaveEdit = async () => {
    if (!editingReview) return

    if (!editForm.rating || editForm.rating === 0) {
      alert('Please select a star rating.')
      return
    }
    if (!editForm.comment.trim()) {
      alert('Please write your review comment.')
      return
    }
    if (editForm.comment.trim().length < 10) {
      alert('Review comment must be at least 10 characters.')
      return
    }
    if (editForm.comment.trim().length > 2000) {
      alert('Review comment must be under 2000 characters.')
      return
    }
    if (editForm.title.trim().length > 100) {
      alert('Title must be 100 characters or fewer.')
      return
    }
    if (editForm.visitDate && new Date(editForm.visitDate) > new Date()) {
      alert('Visit date cannot be in the future.')
      return
    }

    const rid   = editingReview.review_id || editingReview.id
    const token = getToken()

    const pros = editForm.pros.split(',').map(s => s.trim()).filter(Boolean)
    const cons = editForm.cons.split(',').map(s => s.trim()).filter(Boolean)
    const payload = {
      rating:         editForm.rating,
      title:          editForm.title,
      comment:        editForm.comment,
      travel_type:    editForm.travelType,
      wouldRecommend: editForm.wouldRecommend,
      pros,
      cons,
      visit_date:     editForm.visitDate || null,
    }

    if (!String(rid).startsWith('local_') && token) {
      try {
        const res  = await fetch(`${API}/reviews/${rid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (res.ok && data.success) {
          setReviews(prev => prev.map(r =>
            (r.review_id || r.id) === rid ? { ...r, ...data.data, ...payload } : r
          ))
          setEditingReview(null)
          window.dispatchEvent(new CustomEvent('reviewsUpdated'))
          return
        }

        alert(data.message || 'Failed to update review in database.')
        return
      } catch {
        alert('Could not reach the server. Review update failed.')
        return
      }
    }

    // local fallback
    const existing = loadLocalReviews(targetType, targetId)
    const updated  = existing.map(r => r.id === rid ? { ...r, ...payload } : r)
    saveLocalReviews(targetType, targetId, updated)
    setReviews(prev => prev.map(r => (r.id || r.review_id) === rid ? { ...r, ...payload } : r))
    setEditingReview(null)
    window.dispatchEvent(new CustomEvent('reviewsUpdated'))
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
      await fetch(`${API}/reviews/${review.review_id || review.id}/helpful`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ helpful: isHelpful }),
      })
      fetchReviews()
    } catch { /* silent */ }
  }

  /* ── flag/report ── */
  const handleFlag = async (review) => {
    if (!userId) return
    const rid = review.review_id || review.id
    if (!rid || String(rid).startsWith('local_')) return

    const token = getToken()
    try {
      const res = await fetch(`${API}/reviews/${rid}/flag`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Failed to report review')
      setReviews(prev => prev.map(r => {
        const id = r.review_id || r.id
        return String(id) === String(rid) ? { ...r, status: 'pending' } : r
      }))
    } catch {
      // keep silent to avoid blocking primary review flow
    }
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
      {/* ── Place context header ── */}
      {(targetName || districtName) && (
        <div className="rs-place-header">
          <span className="rs-place-header-name">{targetName}</span>
          {districtName && <span className="rs-place-header-district">📍 {districtName}</span>}
        </div>
      )}

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
            <button className="rs-write-btn" onClick={() => { setSubmitError(''); setShowForm(s => !s) }}>
              {showForm ? '✕ Cancel' : '✏️ Write a review'}
            </button>
          ) : (
            <p className="rs-login-prompt">
              <a href="/login">Log in</a> to write a review
            </p>
          )}
        </div>
      </div>

      {/* ── Inline edit form ── */}
      {editingReview && (
        <div className="rs-eform">
          {/* Header */}
          <div className="rs-eform-hdr">
            <div className="rs-eform-hdr-left">
              <span className="rs-eform-icon">✏️</span>
              <div>
                <span className="rs-eform-title">Edit Review</span>
                {(targetName || districtName) && (
                  <span className="rs-eform-place">
                    📍 {targetName}{districtName && ` · ${districtName}`}
                  </span>
                )}
              </div>
            </div>
            <button className="rs-eform-close" onClick={() => setEditingReview(null)}>✕</button>
          </div>

          {/* Rating */}
          <div className="rs-eform-section">
            <span className="rs-eform-section-lbl">Overall Rating</span>
            <div className="rs-eform-stars-row">
              <Stars value={editForm.rating} onChange={v => setEditForm(f => ({ ...f, rating: v }))} size={30} />
              {editForm.rating > 0 && (
                <span className="rs-eform-rating-word">
                  {['','Poor','Fair','Good','Very Good','Excellent'][editForm.rating]}
                </span>
              )}
            </div>
          </div>

          {/* Title + Comment */}
          <div className="rs-eform-section">
            <span className="rs-eform-section-lbl">Your Review</span>
            <input
              className="rs-eform-input"
              value={editForm.title}
              onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Title — short summary of your visit"
              maxLength={100}
            />
            <textarea
              className="rs-eform-input rs-eform-textarea"
              rows={3}
              value={editForm.comment}
              onChange={e => setEditForm(f => ({ ...f, comment: e.target.value }))}
              placeholder="Share what you loved, what could be better, tips for others…"
            />
            <span className="rs-char-count" style={{ color: editForm.comment.length > 1900 ? '#e53e3e' : undefined }}>
              {editForm.comment.length} / 2000 characters
            </span>
          </div>

          {/* Pros + Cons */}
          <div className="rs-eform-section">
            <span className="rs-eform-section-lbl">Highlights</span>
            <div className="rs-eform-two-col">
              <div className="rs-eform-col">
                <label className="rs-eform-sublbl">✅ Loved It <em>(comma-separated)</em></label>
                <input
                  className="rs-eform-input"
                  value={editForm.pros}
                  onChange={e => setEditForm(f => ({ ...f, pros: e.target.value }))}
                  placeholder="Amazing views, Friendly staff"
                />
              </div>
              <div className="rs-eform-col">
                <label className="rs-eform-sublbl">⚠️ Watch Out <em>(comma-separated)</em></label>
                <input
                  className="rs-eform-input"
                  value={editForm.cons}
                  onChange={e => setEditForm(f => ({ ...f, cons: e.target.value }))}
                  placeholder="Gets crowded, Limited parking"
                />
              </div>
            </div>
          </div>

          {/* Travel type + Recommend + Date */}
          <div className="rs-eform-section">
            <span className="rs-eform-section-lbl">Trip Details</span>
            <div className="rs-eform-two-col">
              <div className="rs-eform-col">
                <label className="rs-eform-sublbl">Type of travel</label>
                <div className="rs-eform-pills">
                  {[['solo','🧳'],['couple','👑'],['family','👨‍👩‍👧'],['friends','👫'],['business','💼']].map(([t, icon]) => (
                    <button
                      key={t}
                      type="button"
                      className={`rs-eform-pill${editForm.travelType === t ? ' active' : ''}`}
                      onClick={() => setEditForm(f => ({ ...f, travelType: f.travelType === t ? '' : t }))}
                    >{icon} {t}</button>
                  ))}
                </div>
              </div>
              <div className="rs-eform-col">
                <label className="rs-eform-sublbl">Would you recommend?</label>
                <div className="rs-eform-rec-row">
                  <button
                    type="button"
                    className={`rs-eform-rec yes${editForm.wouldRecommend ? ' active' : ''}`}
                    onClick={() => setEditForm(f => ({ ...f, wouldRecommend: true }))}
                  >👍 Yes</button>
                  <button
                    type="button"
                    className={`rs-eform-rec no${!editForm.wouldRecommend ? ' active' : ''}`}
                    onClick={() => setEditForm(f => ({ ...f, wouldRecommend: false }))}
                  >👎 No</button>
                </div>
                <div style={{marginTop:'10px'}}>
                  <label className="rs-eform-sublbl">Date of visit</label>
                  <input
                    type="date"
                    className="rs-eform-input"
                    value={editForm.visitDate}
                    onChange={e => setEditForm(f => ({ ...f, visitDate: e.target.value }))}
                    max={new Date().toISOString().split('T')[0]}
                    style={{maxWidth:'175px'}}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rs-eform-actions">
            <button className="rs-eform-cancel" onClick={() => setEditingReview(null)}>Cancel</button>
            <button className="rs-eform-save" onClick={handleSaveEdit} disabled={editForm.rating === 0}>Save Changes</button>
          </div>
        </div>
      )}

      {/* ── Write form ── */}
      {showForm && (
        <>
          {submitError && <p className="rs-error">{submitError}</p>}
          <ReviewForm
            targetName={targetName}
            onSubmit={handleSubmit}
            onCancel={() => { setSubmitError(''); setShowForm(false) }}
          />
        </>
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
                key={r.id || r.review_id || i}
                review={r}
                currentUserId={userId}
                onDelete={handleDelete}
                onEdit={handleOpenEdit}
                onHelpful={handleHelpful}
                onFlag={handleFlag}
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
