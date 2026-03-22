import { useState, useEffect } from 'react'
import { clearUserData } from '../../utils/clearUserData'
import { Link, useNavigate } from 'react-router-dom'
import { API_BASE } from '../../config/api'
import ReviewSection from './ReviewSection'
import './DistrictExplore.css'


/* Place type → emoji icon */
const TYPE_EMOJIS = {
  Temple: '🛕', Beach: '🏖️', Nature: '🌿', Heritage: '🏛️',
  Museum: '🏛️', Safari: '🐘', Wildlife: '🦁', Garden: '🌸',
  Lake: '🏞️', Market: '🛍️', Viewpoint: '🏔️', Culture: '🎭',
  Adventure: '🧗', Park: '🌳', Shopping: '🛍️', 'Theme Park': '🎢',
}

/* Place type → colour mapping */
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

/* Place type → representative fallback photo */
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

function typePill(type) {
  const c = TYPE_COLOURS[type] || { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' }
  return { background: c.bg, color: c.text, border: `1px solid ${c.border}` }
}





/* ─── Place Card ─── */
function PlaceCard({ place, districtId, district, selected, onToggle, isSaved, onSave }) {
  const [showReviews, setShowReviews] = useState(false)
  const [imgError,    setImgError]    = useState(false)
  const reviewId   = `${districtId}_${place.id}`
  const fallbackImg = TYPE_IMAGES[place.type] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&auto=format'
  const displayImg  = imgError ? fallbackImg : (place.image || fallbackImg)
  const c = TYPE_COLOURS[place.type] || { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' }

  return (
    <div id={`place-card-${districtId}_${place.id}`} className={`de-place-card ${selected ? 'selected' : ''} ${showReviews ? 'de-place-card--open' : ''}`}>

      {/* ── Card main (LEFT) ── */}
      <div className="de-place-card-main">

        {/* ── Image ── */}
        <div className="de-place-img-wrap" onClick={() => onToggle(place)}>
          <img
            src={displayImg}
            alt={place.name}
            onError={() => setImgError(true)}
            loading="lazy"
          />
          <span className="de-place-type-badge" style={{ background: c.bg, color: c.text }}>
            {place.type}
          </span>
          <span className="de-place-dur-badge">⏱ {place.duration}</span>
          {selected && (
            <div className="de-place-selected-overlay">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"
                strokeLinecap="round" strokeLinejoin="round" width="36" height="36">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="de-place-body">
          <h4 className="de-place-name">{place.name}</h4>
          <p className="de-place-desc">{place.description}</p>
        </div>

        {/* ── Footer ── */}
        <div className="de-place-footer">
          <button
            className={`de-place-add-btn ${selected ? 'added' : ''}`}
            onClick={() => onToggle(place)}
          >
            {selected ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                In your trip
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add to trip
              </>
            )}
          </button>
          <button
            className={`de-save-btn ${isSaved ? 'saved' : ''}`}
            onClick={e => { e.stopPropagation(); onSave(place) }}
            title={isSaved ? 'Remove from saved' : 'Save to dashboard'}
          >
            {isSaved ? '❤️' : '🤍'}
          </button>
          <button
            className={`de-reviews-toggle ${showReviews ? 'active' : ''}`}
            onClick={e => { e.stopPropagation(); setShowReviews(s => !s) }}
          >
            {showReviews ? '✕ Hide' : '⭐ Reviews'}
          </button>
        </div>

      </div>{/* end de-place-card-main */}

      {/* ── Reviews panel (RIGHT when open) ── */}
      {showReviews && (
        <div className="de-reviews-panel" onClick={e => e.stopPropagation()}>
          <ReviewSection
            targetType="place"
            targetId={reviewId}
            targetName={place.name}
            districtName={district?.name || ''}
            dbId={place.place_id ?? place.dbId ?? null}
          />
        </div>
      )}
    </div>
  )
}

/* ─── Main Component ─── */
function DistrictExplore({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const [menuOpen,       setMenuOpen]       = useState(false)
  const [district,       setDistrict]       = useState(null)
  const [selectedPlaces, setSelectedPlaces] = useState([])
  const [filterType,     setFilterType]     = useState('All')
  const [savedIds, setSavedIds] = useState(() => {
    try {
      const raw = localStorage.getItem('savedDestinations')
      return new Set((raw ? JSON.parse(raw) : []).map(d => d.id))
    } catch { return new Set() }
  })
  const [places, setPlaces]             = useState([])
  const [placesLoading, setPlacesLoading] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const raw = localStorage.getItem('selectedDistrict')
    if (!raw) { navigate('/plan-trip'); return }
    const d = JSON.parse(raw)
    setDistrict(d)
    // Fetch places from API
    setPlacesLoading(true)
    fetch(`${API_BASE}/destinations?district_id=${d.district_id}&limit=50`)
      .then(r => r.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          setPlaces(json.data.map(p => ({
            id:          String(p.place_id),
            place_id:    p.place_id,
            name:        p.name,
            type:        p.type || '',
            duration:    p.duration || '',
            description: p.description || '',
            image:       p.images?.[0]?.image_url || '',
          })))
        }
      })
      .catch(() => {})
      .finally(() => setPlacesLoading(false))
    // Restore previously selected places (e.g. when editing a trip)
    const savedPlaces = localStorage.getItem('selectedPlaces')
    if (savedPlaces) {
      try { setSelectedPlaces(JSON.parse(savedPlaces)) } catch { /* ignore */ }
    }
    // Scroll to a specific saved place if requested
    const scrollTarget = localStorage.getItem('scrollToPlace')
    if (scrollTarget) {
      localStorage.removeItem('scrollToPlace')
      setTimeout(() => {
        const el = document.getElementById(`place-card-${d.id}_${scrollTarget}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('de-place-highlight')
          setTimeout(() => el.classList.remove('de-place-highlight'), 2200)
        }
      }, 350)
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    clearUserData()
    navigate('/')
  }

  if (!district) return null

  const types  = ['All', ...Array.from(new Set(places.map(p => p.type)))]

  const visiblePlaces = filterType === 'All'
    ? places
    : places.filter(p => p.type === filterType)

  const togglePlace = (place) => {
    setSelectedPlaces(prev =>
      prev.find(p => p.id === place.id)
        ? prev.filter(p => p.id !== place.id)
        : [...prev, place]
    )
  }

  const toggleSave = (place) => {
    const savedKey = `de_${district.id}_${place.id}`
    const raw = localStorage.getItem('savedDestinations')
    let list = raw ? JSON.parse(raw) : []
    const isSaved = savedIds.has(savedKey)
    if (isSaved) {
      list = list.filter(d => d.id !== savedKey)
      setSavedIds(prev => { const s = new Set(prev); s.delete(savedKey); return s })
      setToast({ msg: `Removed "${place.name}" from saved`, type: 'remove' })
    } else {
      const fallback = TYPE_IMAGES[place.type] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&auto=format'
      list = [...list, {
        id: savedKey,
        name: place.name,
        category: place.type,
        province: district.province,
        districtName: district.name,
        districtId: district.id,
        placeId: place.id,
        districtData: district,
        image: place.image || fallback,
        icon: TYPE_EMOJIS[place.type] || '📍',
        description: place.description,
        details: `Duration: ${place.duration}`,
        tours: null,
        savedAt: new Date().toISOString(),
      }]
      setSavedIds(prev => new Set([...prev, savedKey]))
      setToast({ msg: `Saved "${place.name}" to dashboard!`, type: 'save' })
    }
    localStorage.setItem('savedDestinations', JSON.stringify(list))
    setTimeout(() => setToast(null), 2500)
  }

  const handleContinue = () => {
    // Store both the district and the selected places
    localStorage.setItem('selectedDistrict', JSON.stringify(district))
    localStorage.setItem('selectedPlaces', JSON.stringify(selectedPlaces))
    navigate('/trip-preferences')
  }

  return (
    <div className="de-page">
      {/* ── Toast ── */}
      {toast && (
        <div className={`de-save-toast ${toast.type}`}>
          {toast.type === 'save' ? '❤️' : '🩶'} {toast.msg}
        </div>
      )}
      {/* ── Nav ── */}
      <nav className="dashboard-nav glass-nav">
        <div className="nav-container">
          <button className="logo" onClick={() => navigate('/dashboard')} style={{background:'none',border:'none',cursor:'pointer',padding:0}}>Travel<span>Genie</span></button>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <span className={`hamburger ${menuOpen ? 'open' : ''}`} />
          </button>
          <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li><Link to="/plan-trip" className="active-link">Plan a Trip</Link></li>
            <li><Link to="/profile">Profile</Link></li>
          </ul>
          <div className="nav-actions">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'light' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              )}
            </button>
            <button className="btn-logout" onClick={handleLogout}>Log Out</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="de-hero">
        <div className="de-hero-inner">

          {/* Step progress */}
          <div className="de-breadcrumb">
            <div className="de-step done" onClick={() => navigate('/plan-trip')} title="Choose District">
              <span className="de-step-num">1</span>
              <span className="de-step-label">District</span>
            </div>
            <div className="de-dot-line done" />
            <div className="de-step active">
              <span className="de-step-num">2</span>
              <span className="de-step-label">Places</span>
            </div>
            <div className="de-dot-line" />
            <div className="de-step">
              <span className="de-step-num">3</span>
              <span className="de-step-label">Preferences</span>
            </div>
            <div className="de-dot-line" />
            <div className="de-step">
              <span className="de-step-num">4</span>
              <span className="de-step-label">Hotel</span>
            </div>
            <div className="de-dot-line" />
            <div className="de-step">
              <span className="de-step-num">5</span>
              <span className="de-step-label">Budget</span>
            </div>
            <div className="de-dot-line" />
            <div className="de-step">
              <span className="de-step-num">6</span>
              <span className="de-step-label">Details</span>
            </div>
          </div>

          <p className="de-eyebrow">🗺️ Step 2 — Pick Your Places</p>
          <h1>Explore <em>{district.name}</em></h1>
          <p className="de-hero-sub">{district.description}</p>

          <div className="de-dest-pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {district.province} Province
            {district.bestFor?.length > 0 && <>
              <span className="de-pill-divider">·</span>
              {district.bestFor.slice(0, 3).join(' · ')}
            </>}
          </div>

        </div>
      </section>

      {/* ── Body ── */}
      <div className="de-body">

        {/* ── Places ── */}
        <main className="de-main">

          {/* Section header */}
          <div className="de-section-header">
            <div className="de-section-title">
              <h2>
                Places to Visit
                <span className="de-count-badge">{visiblePlaces.length}</span>
              </h2>
              <p className="de-section-sub">Tap a card to add it to your itinerary</p>
            </div>

            {/* Type filter */}
            <div className="de-type-filter">
              {types.map(t => (
                <button
                  key={t}
                  className={`de-type-pill ${filterType === t ? 'active' : ''}`}
                  onClick={() => setFilterType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="de-places-grid">
            {placesLoading ? (
              <p className="de-section-sub" style={{ gridColumn: '1/-1', padding: '2rem 0' }}>Loading places…</p>
            ) : visiblePlaces.length === 0 ? (
              <p className="de-section-sub" style={{ gridColumn: '1/-1', padding: '2rem 0' }}>No places found for this district yet.</p>
            ) : visiblePlaces.map(place => (
              <PlaceCard
                key={place.id}
                place={place}
                districtId={district.id}
                district={district}
                selected={!!selectedPlaces.find(p => p.id === place.id)}
                onToggle={togglePlace}
                isSaved={savedIds.has(`de_${district.id}_${place.id}`)}
                onSave={toggleSave}
              />
            ))}
          </div>

          {/* ── Selection summary + CTA ── */}
          <div className="de-cta-bar">
            <button className="de-back-btn" onClick={() => navigate('/plan-trip')}>
              ← Back
            </button>

            <div className="de-cta-summary">
              {selectedPlaces.length === 0 ? (
                <span className="de-cta-hint">No places selected yet — tap a card to add</span>
              ) : (
                <div className="de-footer-strip">
                  {selectedPlaces.map(p => {
                    const fallback = TYPE_IMAGES[p.type] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=60'
                    const img = p.image || fallback
                    return (
                      <div key={p.id} className="de-footer-chip">
                        <div className="de-footer-chip-img-wrap">
                          <img src={img} alt={p.name} className="de-footer-chip-img" />
                          <button
                            type="button"
                            className="de-footer-chip-remove"
                            onClick={() => togglePlace(p)}
                            title="Remove"
                          >✕</button>
                        </div>
                        <div className="de-footer-chip-meta">
                          <span className="de-footer-chip-name">{p.name}</span>
                          {p.duration && <span className="de-footer-chip-dur">⏱ {p.duration}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <button
              className="de-continue-btn"
              onClick={handleContinue}
            >
              Continue
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12,5 19,12 12,19"/>
              </svg>
            </button>
          </div>
        </main>

      </div>
    </div>
  )
}

export default DistrictExplore
