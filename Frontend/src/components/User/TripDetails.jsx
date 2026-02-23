import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import './TripDetails.css'
import '../../App.css'

// ── helpers ──────────────────────────────────────────────
function formatDateDisplay(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  })
}

function calcNights(start, end) {
  if (!start || !end) return 0
  const diff = new Date(end) - new Date(start)
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)))
}

const TRAVEL_STYLES = [
  { value: 'Adventure', icon: '🏔️' },
  { value: 'Relax', icon: '🏖️' },
  { value: 'Culture', icon: '🎭' },
  { value: 'Luxury', icon: '💎' },
  { value: 'Budget', icon: '🎒' },
  { value: 'Family', icon: '👨‍👩‍👧' },
]

// ── StarRating display ────────────────────────────────────
function StarRating({ value = 0 }) {
  return (
    <div className="td-stars">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} viewBox="0 0 24 24" className={`td-star${i <= Math.round(value) ? ' filled' : ''}`}>
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
      <span className="td-rating-num">{value ? value.toFixed(1) : 'N/A'}</span>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export default function TripDetails({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const toastRef = useRef(null)

  const [destination, setDestination] = useState(null)
  const [hotel, setHotel] = useState(null)
  const [user, setUser] = useState({})
  const [submitted, setSubmitted] = useState(false)

  // form state
  const today = new Date().toISOString().split('T')[0]
  const [tripName, setTripName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [travelers, setTravelers] = useState(1)
  const [travelStyle, setTravelStyle] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // ── Load district/destination + user from localStorage ──
  useEffect(() => {
    const destRaw = localStorage.getItem('selectedDistrict') || localStorage.getItem('selectedDestination')
    const userRaw = localStorage.getItem('currentUser')
    if (destRaw) {
      const dest = JSON.parse(destRaw)
      setDestination(dest)
      setTripName(`My trip to ${dest.name}`)
    } else {
      navigate('/plan-trip')
    }
    const hotelRaw = localStorage.getItem('selectedHotel')
    if (hotelRaw) setHotel(JSON.parse(hotelRaw))
    if (userRaw) {
      const u = JSON.parse(userRaw)
      setUser(u)
      if (u.travelStyle) setTravelStyle(u.travelStyle)
    }
  }, [navigate])

  const nights = calcNights(startDate, endDate)

  // ── Validate ──
  function validate() {
    const e = {}
    if (!tripName.trim()) e.tripName = 'Trip name is required.'
    if (!startDate) e.startDate = 'Please choose a start date.'
    if (!endDate) e.endDate = 'Please choose a return date.'
    if (startDate && endDate && endDate <= startDate) e.endDate = 'Return date must be after start date.'
    if (travelers < 1) e.travelers = 'At least 1 traveler required.'
    return e
  }

  // ── Submit ──
  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSaving(true)

    const trip = {
      id: Date.now(),
      destinationId: destination?._id,
      destinationName: destination?.name,
      destinationCity: destination?.city,
      destinationCountry: destination?.country,
      destinationImage: destination?.images?.[0],
      category: destination?.category,
      hotelId: hotel?._id || null,
      hotelName: hotel?.name || null,
      hotelCategory: hotel?.category || null,
      hotelStars: hotel?.starRating || null,
      hotelPriceMin: hotel?.priceRange?.min || null,
      hotelPriceCurrency: hotel?.priceRange?.currency || 'USD',
      tripName: tripName.trim(),
      startDate,
      endDate,
      nights,
      travelers,
      travelStyle,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
      status: 'upcoming',
      estimatedCost: destination?.costRange || '',
    }

    setTimeout(() => {
      // save to myTrips[]
      const existing = JSON.parse(localStorage.getItem('myTrips') || '[]')
      existing.push(trip)
      localStorage.setItem('myTrips', JSON.stringify(existing))
      setSaving(false)
      setSubmitted(true)
      setTimeout(() => navigate('/dashboard'), 2800)
    }, 1200)
  }

  // ════════════════════════════════════════════════════════════
  // SUCCESS STATE
  // ════════════════════════════════════════════════════════════
  if (submitted) {
    return (
      <div className="td-page" data-theme={theme}>
        <div className="td-success-overlay">
          <div className="td-success-card">
            <div className="td-success-icon">✈️</div>
            <h2>Trip Saved!</h2>
            <p>
              <strong>{tripName}</strong> has been added to your trips.
              Redirecting to your dashboard…
            </p>
            <div className="td-redirect-bar">
              <div className="td-redirect-fill" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════
  // MAIN FORM
  // ════════════════════════════════════════════════════════════
  return (
    <div className="td-page" data-theme={theme}>
      {/* ── Nav (minimal) ── */}
      <nav className="dashboard-nav glass-nav">
        <div className="nav-container">
          <div className="logo">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:28,height:28}}>
              <circle cx="16" cy="16" r="16" fill="#0E7C5F"/>
              <path d="M8 22 L16 8 L24 22 Z" fill="white" fillOpacity=".9"/>
              <circle cx="16" cy="19" r="3" fill="#F5C842"/>
            </svg>
            <span>TravelGenie</span>
          </div>
          <div className="nav-actions" style={{display:'flex',alignItems:'center',gap:12}}>
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <Link to="/plan-trip" className="td-back-link">← Back to Destinations</Link>
          </div>
        </div>
      </nav>

      <div className="td-content">
        {/* ── Breadcrumb ── */}
        <div className="td-breadcrumb">
          <Link to="/dashboard">Dashboard</Link>
          <span>/</span>
          <Link to="/plan-trip">Destinations</Link>
          <span>/</span>
          <Link to="/hotel-picker">Hotels</Link>
          <span>/</span>
          <span>Trip Details</span>
        </div>

        <div className="td-layout">
          {/* ════ LEFT: Destination Preview ════ */}
          {destination && (
            <aside className="td-dest-preview">
              <div className="td-preview-card">
                <div className="td-preview-img">
                  <img
                    src={destination.image || destination.images?.[0] || `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&q=80`}
                    alt={destination.name}
                    onError={e => {
                      e.target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&q=80'
                    }}
                  />
                  <span className={`td-cat-badge cat-${destination.category?.toLowerCase() || 'other'}`}>
                    {destination.province ? `${destination.province} Province` : destination.category}
                  </span>
                </div>
                <div className="td-preview-body">
                  <h3 className="td-preview-name">{destination.name}</h3>
                  <p className="td-preview-location">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    {destination.province
                      ? `${destination.province} Province, Sri Lanka`
                      : `${destination.city || ''}${destination.country ? `, ${destination.country}` : ''}`
                    }
                  </p>
                  <StarRating value={destination.rating || destination.averageRating} />
                  <p className="td-preview-desc">{destination.description?.slice(0, 160)}{destination.description?.length > 160 ? '…' : ''}</p>

                  {destination.costRange && (
                    <div className="td-preview-cost">
                      <span className="td-cost-label">Estimated Cost</span>
                      <span className="td-cost-value">{destination.costRange}</span>
                    </div>
                  )}

                  {(destination.highlights || destination.activities || destination.bestFor)?.length > 0 && (
                    <div className="td-preview-activities">
                      {(destination.highlights || destination.activities || destination.bestFor).slice(0, 5).map((a, i) => (
                        <span key={i} className="td-activity-chip">{a}</span>
                      ))}
                    </div>
                  )}

                  <button className="td-change-dest" onClick={() => navigate('/plan-trip')}>
                    Change District
                  </button>
                </div>
              </div>

              {/* Selected Hotel Card */}
              {hotel ? (
                <div className="td-hotel-card">
                  <div className="td-hotel-header">
                    <span className="td-hotel-icon">🏨</span>
                    <div>
                      <p className="td-hotel-label">Your Hotel</p>
                      <h4 className="td-hotel-name">{hotel.name}</h4>
                    </div>
                  </div>
                  {hotel.images?.[0]?.url && (
                    <img
                      src={hotel.images[0].url}
                      alt={hotel.name}
                      className="td-hotel-img"
                      onError={e => { e.target.style.display = 'none' }}
                    />
                  )}
                  <div className="td-hotel-meta">
                    <div className="td-hotel-stars">
                      {[1,2,3,4,5].map(i => (
                        <svg key={i} viewBox="0 0 24 24" className={`td-star${i <= (hotel.starRating||0) ? ' filled' : ''}`}>
                          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                        </svg>
                      ))}
                    </div>
                    {hotel.priceRange?.min && (
                      <span className="td-hotel-price">
                        from ${hotel.priceRange.min}/night
                      </span>
                    )}
                  </div>
                  {hotel.amenities?.length > 0 && (
                    <div className="td-hotel-amenities">
                      {hotel.amenities.slice(0,4).map(a => (
                        <span key={a} className="td-hotel-chip">{a}</span>
                      ))}
                    </div>
                  )}
                  <button className="td-change-dest" style={{marginTop:12}} onClick={() => navigate('/hotel-picker')}>
                    Change Hotel
                  </button>
                </div>
              ) : (
                <div className="td-hotel-card td-hotel-skip">
                  <span className="td-hotel-icon">🏨</span>
                  <p>No hotel selected yet —{' '}
                    <button className="td-hotel-link" onClick={() => navigate('/hotel-picker')}>
                      Choose one
                    </button>
                  </p>
                </div>
              )}

              {/* Summary card (shown when dates chosen) */}
              {nights > 0 && (
                <div className="td-summary-card">
                  <h4 className="td-summary-title">Trip Summary</h4>
                  <div className="td-summary-rows">
                    <div className="td-summary-row">
                      <span>📅 Departure</span><strong>{formatDateDisplay(startDate)}</strong>
                    </div>
                    <div className="td-summary-row">
                      <span>📅 Return</span><strong>{formatDateDisplay(endDate)}</strong>
                    </div>
                    <div className="td-summary-row">
                      <span>🌙 Nights</span><strong>{nights}</strong>
                    </div>
                    <div className="td-summary-row">
                      <span>👤 Travelers</span><strong>{travelers}</strong>
                    </div>
                    {travelStyle && (
                      <div className="td-summary-row">
                        <span>🧭 Style</span><strong>{travelStyle}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </aside>
          )}

          {/* ════ RIGHT: Form ════ */}
          <main className="td-form-area">
            <div className="td-form-header">
              <div className="td-form-eyebrow">Step 3 of 3</div>
              <h1 className="td-form-title">Plan Your Trip</h1>
              <p className="td-form-sub">Fill in the details to save your trip itinerary.</p>
            </div>

            <form className="td-form" onSubmit={handleSubmit} noValidate>

              {/* Trip Name */}
              <div className="td-field">
                <label className="td-label">Trip Name</label>
                <div className="td-input-wrap">
                  <svg className="td-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                  </svg>
                  <input
                    type="text"
                    className={`td-input ${errors.tripName ? 'td-input-error' : ''}`}
                    value={tripName}
                    onChange={e => setTripName(e.target.value)}
                    placeholder="Give your trip a name…"
                    maxLength={80}
                  />
                </div>
                {errors.tripName && <span className="td-error-msg">{errors.tripName}</span>}
              </div>

              {/* Date row */}
              <div className="td-row-2">
                <div className="td-field">
                  <label className="td-label">Departure Date</label>
                  <div className="td-input-wrap">
                    <svg className="td-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <input
                      type="date"
                      className={`td-input ${errors.startDate ? 'td-input-error' : ''}`}
                      value={startDate}
                      min={today}
                      onChange={e => { setStartDate(e.target.value); if (endDate && e.target.value >= endDate) setEndDate('') }}
                    />
                  </div>
                  {errors.startDate && <span className="td-error-msg">{errors.startDate}</span>}
                </div>

                <div className="td-field">
                  <label className="td-label">Return Date</label>
                  <div className="td-input-wrap">
                    <svg className="td-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <input
                      type="date"
                      className={`td-input ${errors.endDate ? 'td-input-error' : ''}`}
                      value={endDate}
                      min={startDate || today}
                      onChange={e => setEndDate(e.target.value)}
                    />
                  </div>
                  {errors.endDate && <span className="td-error-msg">{errors.endDate}</span>}
                </div>
              </div>

              {/* Nights display */}
              {nights > 0 && (
                <div className="td-nights-badge">
                  🌙 {nights} {nights === 1 ? 'night' : 'nights'}
                </div>
              )}

              {/* Travelers stepper */}
              <div className="td-field">
                <label className="td-label">Number of Travelers</label>
                <div className="td-stepper-wrap">
                  <button type="button" className="td-stepper-btn" onClick={() => setTravelers(t => Math.max(1, t - 1))}>−</button>
                  <div className="td-stepper-value">
                    <span className="td-stepper-num">{travelers}</span>
                    <span className="td-stepper-label">{travelers === 1 ? 'Traveler' : 'Travelers'}</span>
                  </div>
                  <button type="button" className="td-stepper-btn" onClick={() => setTravelers(t => Math.min(30, t + 1))}>+</button>
                </div>
                {errors.travelers && <span className="td-error-msg">{errors.travelers}</span>}
              </div>

              {/* Travel Style */}
              <div className="td-field">
                <label className="td-label">Travel Style</label>
                <div className="td-style-grid">
                  {TRAVEL_STYLES.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      className={`td-style-chip ${travelStyle === s.value ? 'active' : ''}`}
                      onClick={() => setTravelStyle(travelStyle === s.value ? '' : s.value)}
                    >
                      <span>{s.icon}</span>
                      <span>{s.value}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="td-field">
                <label className="td-label">Special Notes <span className="td-optional">(optional)</span></label>
                <textarea
                  className="td-textarea"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Dietary requirements, accessibility needs, must-see spots…"
                  rows={4}
                  maxLength={500}
                />
                <div className="td-char-count">{notes.length}/500</div>
              </div>

              {/* Submit */}
              <button type="submit" className="td-submit-btn" disabled={saving}>
                {saving ? (
                  <>
                    <span className="td-spinner" />
                    Saving your trip…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M22 2L11 13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    Save Trip
                  </>
                )}
              </button>
            </form>
          </main>
        </div>
      </div>
    </div>
  )
}
