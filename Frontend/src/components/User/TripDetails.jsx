import { useState, useEffect } from 'react'
import { clearUserData } from '../../utils/clearUserData'
import { API_BASE } from '../../config/api'
import { useNavigate, Link } from 'react-router-dom'
import './TripDetails.css'
import '../../App.css'

// ── helpers ──────────────────────────────────────────────
function calcNights(start, end) {
  if (!start || !end) return 0
  const diff = new Date(end) - new Date(start)
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)))
}
function addDays(dateStr, days) {
  if (!dateStr || !days) return ''
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// ════════════════════════════════════════════════════════════
export default function TripDetails({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const [destination, setDestination] = useState(null)
  const [hotel, setHotel] = useState(null)
  const [budget, setBudget] = useState(null)
  const [prefs, setPrefs] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // form state
  const today = new Date().toISOString().split('T')[0]
  const [tripName, setTripName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
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
    const budgetRaw = localStorage.getItem('tripBudget')
    if (budgetRaw) setBudget(JSON.parse(budgetRaw))
    const prefsRaw = localStorage.getItem('tripPreferences')
    if (prefsRaw) setPrefs(JSON.parse(prefsRaw))
    if (userRaw) { JSON.parse(userRaw) }

    // ── If editing an existing trip, pre-fill name / dates / notes ──
    const editingId = localStorage.getItem('editingTripId')
    if (editingId) {
      setIsEditing(true)
      const trips = JSON.parse(localStorage.getItem('myTrips') || '[]')
      const existing = trips.find(t => String(t.id || t._id) === String(editingId))
      if (existing) {
        setTripName(existing.tripName || '')
        setStartDate(existing.startDate ? existing.startDate.slice(0, 10) : '')
        setEndDate(existing.endDate   ? existing.endDate.slice(0, 10)   : '')
        setNotes(existing.notes || '')
      }
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    clearUserData()
    navigate('/')
  }

  const nights = calcNights(startDate, endDate)

  // ── Budget calculations ──
  const CURRENCY_SYM = { LKR: 'Rs', USD: '$', EUR: '€', GBP: '£' }
  const budSym       = CURRENCY_SYM[budget?.currency] || ''
  const budTotal     = budget?.totalBudget  || 0
  const budHotel     = budget?.hotelBudget  || 0
  const budRemaining = budTotal - budHotel
  const budDays      = nights > 0 ? nights : (prefs?.days || 1)
  const budFood      = Math.round(budRemaining * 0.55)
  const budTravel    = Math.round(budRemaining * 0.30)
  const budMisc      = budRemaining - budFood - budTravel
  const pctHotel     = budTotal > 0 ? Math.round((budHotel   / budTotal) * 100) : 0
  const pctFood      = budTotal > 0 ? Math.round((budFood     / budTotal) * 100) : 0
  const pctTravel    = budTotal > 0 ? Math.round((budTravel   / budTotal) * 100) : 0
  const pctMisc      = 100 - pctHotel - pctFood - pctTravel
  const foodPerDay   = budDays > 0 ? Math.round(budFood   / budDays) : 0
  const travelPerDay = budDays > 0 ? Math.round(budTravel / budDays) : 0

  // ── Validate ──
  function validate() {
    const e = {}
    if (!tripName.trim()) e.tripName = 'Trip name is required.'
    if (!startDate) e.startDate = 'Please choose a start date.'
    if (!endDate) e.endDate = 'Please choose a return date.'
    if (startDate && endDate && endDate <= startDate) e.endDate = 'Return date must be after start date.'
    return e
  }

  // ── Save / Update ──
  function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSaving(true)

    const editingId = localStorage.getItem('editingTripId')

    const updatedFields = {
      destinationId: destination?.id || destination?._id,
      districtFrontendId: destination?.id || null,
      destinationName: destination?.name,
      destinationCity: destination?.city,
      destinationCountry: destination?.country,
      destinationImage: destination?.images?.[0] || destination?.image,
      category: destination?.category,
      hotelId: hotel?._id || null,
      hotelName: hotel?.name || null,
      hotelCategory: hotel?.category || null,
      hotelStars: hotel?.starRating || hotel?.star_class || null,
      hotelPriceMin: hotel?.priceRange?.min || hotel?.price_per_night || null,
      hotelPriceCurrency: hotel?.priceRange?.currency || 'LKR',
      totalBudget: budget?.totalBudget ?? null,
      hotelBudget: budget?.hotelBudget ?? null,
      budgetCurrency: budget?.currency ?? null,
      tripName: tripName.trim(),
      startDate,
      endDate,
      nights,
      notes: notes.trim(),
      status: 'planned',
      estimatedCost: destination?.costRange || '',
      districtName: destination?.name,
      provinceName: destination?.province,
      selectedPlaces: (() => {
        try { return JSON.parse(localStorage.getItem('selectedPlaces') || '[]') } catch { return [] }
      })(),
    }

    if (editingId) {
      // ── UPDATE existing trip ──
      const existing = JSON.parse(localStorage.getItem('myTrips') || '[]')
      const updated = existing.map(t =>
        String(t.id || t._id) === String(editingId)
          ? { ...t, ...updatedFields, id: t.id || t._id, createdAt: t.createdAt, dbTripId: t.dbTripId }
          : t
      )
      localStorage.setItem('myTrips', JSON.stringify(updated))
      localStorage.removeItem('editingTripId')
      setSaving(false)
      setSubmitted(true)
      setTimeout(() => navigate('/dashboard'), 2800)
      return
    }

    // ── CREATE new trip ──
    const localTrip = { id: Date.now(), ...updatedFields, createdAt: new Date().toISOString() }
    const token = localStorage.getItem('token')
    const districtId = destination?.district_id || null

    const apiBody = {
      district_id:  districtId,
      title:        tripName.trim(),
      start_date:   startDate,
      end_date:     endDate,
      total_budget: budget?.totalBudget ?? 0,
      status:       'planned',
      notes:        notes.trim() || null,
    }

    const trySaveApi = () => {
      if (!token || !districtId) return Promise.resolve(null)
      return fetch(`${API_BASE}/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(apiBody),
      })
        .then(r => r.ok ? r.json() : null)
        .then(json => json?.data?.trip_id || json?.data?.id || null)
        .catch(() => null)
    }

    trySaveApi().then(dbTripId => {
      if (dbTripId) localTrip.dbTripId = dbTripId
      const existing = JSON.parse(localStorage.getItem('myTrips') || '[]')
      existing.push(localTrip)
      localStorage.setItem('myTrips', JSON.stringify(existing))
      setSaving(false)
      setSubmitted(true)
      setTimeout(() => navigate('/dashboard'), 2800)
    })
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
            <h2>{isEditing ? 'Trip Updated!' : 'Trip Saved!'}</h2>
            <p>
              <strong>{tripName}</strong> has been {isEditing ? 'updated' : 'added to your trips'}.
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
  // MAIN LAYOUT
  // ════════════════════════════════════════════════════════════
  return (
    <div className="td-page" data-theme={theme}>

      {/* ── Nav ── */}
      <nav className="dashboard-nav glass-nav">
        <div className="nav-container">
          <button className="logo" onClick={() => navigate('/dashboard')} style={{background:'none',border:'none',cursor:'pointer',padding:0}}>Travel<span>Genie</span></button>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <span className={`hamburger ${menuOpen ? 'open' : ''}`} />
          </button>
          <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li><Link to="/plan-trip">Plan a Trip</Link></li>
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
      <section className="td-hero">
        <div className="td-hero-inner">
          <div className="td-steps">
            <div className="td-step done" onClick={() => navigate('/plan-trip')} title="Choose District">
              <span className="td-step-num">1</span>
              <span className="td-step-label">District</span>
            </div>
            <div className="td-step-line done" />
            <div className="td-step done" onClick={() => navigate('/district-explore')} title="Pick Places">
              <span className="td-step-num">2</span>
              <span className="td-step-label">Places</span>
            </div>
            <div className="td-step-line done" />
            <div className="td-step done" onClick={() => navigate('/trip-preferences')} title="Set Preferences">
              <span className="td-step-num">3</span>
              <span className="td-step-label">Preferences</span>
            </div>
            <div className="td-step-line done" />
            <div className="td-step done" onClick={() => navigate('/hotel-picker')} title="Choose Hotel">
              <span className="td-step-num">4</span>
              <span className="td-step-label">Hotel</span>
            </div>
            <div className="td-step-line done" />
            <div className="td-step done" onClick={() => navigate('/trip-budget')} title="Set Budget">
              <span className="td-step-num">5</span>
              <span className="td-step-label">Budget</span>
            </div>
            <div className="td-step-line done" />
            <div className="td-step active">
              <span className="td-step-num">6</span>
              <span className="td-step-label">Details</span>
            </div>
          </div>

          {destination && (
            <p className="td-eyebrow">📍 {destination.province} Province · {destination.name}</p>
          )}
          <h1>Finalize your <em>trip</em></h1>
          <p className="td-hero-sub">One last step — fill in the details to save your itinerary.</p>
        </div>
      </section>

      {/* ── Body ── */}
      <div className="td-body">

        <div className="td-layout">

          {/* ── LEFT COLUMN: change cards + budget ── */}
          <div className="td-col-left">

            {/* Context Cards */}
            <div className="td-context-strip">
              {destination && (
                <div className="td-ctx-card">
                  {(destination.image || destination.images?.[0]) ? (
                    <img
                      src={destination.image || destination.images[0]}
                      alt={destination.name}
                      className="td-ctx-img"
                      onError={e => { e.target.style.display = 'none' }}
                    />
                  ) : (
                    <div className="td-ctx-img td-ctx-placeholder">📍</div>
                  )}
                  <div className="td-ctx-info">
                    <span className="td-ctx-label">Destination</span>
                    <span className="td-ctx-name">{destination.name}</span>
                    {destination.province && <span className="td-ctx-sub">{destination.province} Province</span>}
                  </div>
                  <button className="td-ctx-change" onClick={() => navigate('/plan-trip')}>Change</button>
                </div>
              )}

              {prefs && (
                <div className="td-ctx-card">
                  <span className="td-ctx-icon">📅</span>
                  <div className="td-ctx-info">
                    <span className="td-ctx-label">Preferences</span>
                    <span className="td-ctx-name">{prefs.days} {prefs.days === 1 ? 'day' : 'days'}</span>
                    <span className="td-ctx-sub">{prefs.people} {prefs.people === 1 ? 'person' : 'people'} · {prefs.tripType}</span>
                  </div>
                  <button className="td-ctx-change" onClick={() => navigate('/trip-preferences')}>Change</button>
                </div>
              )}

              <div className="td-ctx-card">
                <span className="td-ctx-icon">🏨</span>
                <div className="td-ctx-info">
                  <span className="td-ctx-label">Hotel</span>
                  {hotel ? (
                    <>
                      <span className="td-ctx-name">{hotel.name}</span>
                      {hotel.starRating > 0 && <span className="td-ctx-sub">{'★'.repeat(hotel.starRating)} {hotel.category}</span>}
                    </>
                  ) : (
                    <span className="td-ctx-name td-ctx-empty">Not selected</span>
                  )}
                </div>
                <button className="td-ctx-change" onClick={() => navigate('/hotel-picker')}>Change</button>
              </div>

              <div className="td-ctx-card">
                <span className="td-ctx-icon">💰</span>
                <div className="td-ctx-info">
                  <span className="td-ctx-label">Budget</span>
                  {budget?.totalBudget > 0 ? (
                    <>
                      <span className="td-ctx-name">{budSym}{budTotal.toLocaleString()}</span>
                      <span className="td-ctx-sub">{budget.currency}</span>
                    </>
                  ) : (
                    <span className="td-ctx-name td-ctx-empty">Not set</span>
                  )}
                </div>
                <button className="td-ctx-change" onClick={() => navigate('/trip-budget')}>Change</button>
              </div>
            </div>

            {/* Budget Breakdown */}
            {budget?.totalBudget > 0 && (
              <section className="td-section">
                <div className="td-section-header">
                  <span className="td-section-icon">💰</span>
                  <div>
                    <h2>Budget breakdown</h2>
                    <p>How your {budSym}{budTotal.toLocaleString()} {budget.currency} budget is split</p>
                  </div>
                </div>

                <div className="td-bud-bar">
                  {pctHotel  > 0 && <div className="td-bud-seg hotel"  style={{width:`${pctHotel}%`}} />}
                  {pctFood   > 0 && <div className="td-bud-seg food"   style={{width:`${pctFood}%`}} />}
                  {pctTravel > 0 && <div className="td-bud-seg travel" style={{width:`${pctTravel}%`}} />}
                  {pctMisc   > 0 && <div className="td-bud-seg misc"   style={{width:`${pctMisc}%`}} />}
                </div>

                <div className="td-bud-rows">
                  <div className="td-bud-row">
                    <div className="td-bud-row-left"><span className="td-bud-dot hotel" /><span>🏨 Hotel</span></div>
                    <div className="td-bud-row-right">
                      <span className="td-bud-amount">{budSym}{budHotel.toLocaleString()}</span>
                      <span className="td-bud-pct">{pctHotel}%</span>
                    </div>
                  </div>

                  <div className="td-bud-divider">Remaining — {budSym}{budRemaining.toLocaleString()}</div>

                  <div className="td-bud-row">
                    <div className="td-bud-row-left"><span className="td-bud-dot food" /><span>🍽️ Food</span></div>
                    <div className="td-bud-row-right">
                      <span className="td-bud-amount">{budSym}{budFood.toLocaleString()}</span>
                      <span className="td-bud-pct">{pctFood}%</span>
                    </div>
                  </div>
                  <div className="td-bud-per-day">
                    {budSym}{foodPerDay.toLocaleString()} / day
                    <span className="td-bud-days-tag">× {budDays} {budDays === 1 ? 'day' : 'days'}</span>
                  </div>

                  <div className="td-bud-row">
                    <div className="td-bud-row-left"><span className="td-bud-dot travel" /><span>🚗 Transport</span></div>
                    <div className="td-bud-row-right">
                      <span className="td-bud-amount">{budSym}{budTravel.toLocaleString()}</span>
                      <span className="td-bud-pct">{pctTravel}%</span>
                    </div>
                  </div>
                  <div className="td-bud-per-day">
                    {budSym}{travelPerDay.toLocaleString()} / day
                    <span className="td-bud-days-tag">× {budDays} {budDays === 1 ? 'day' : 'days'}</span>
                  </div>

                  <div className="td-bud-row">
                    <div className="td-bud-row-left"><span className="td-bud-dot misc" /><span>✨ Activities &amp; Misc</span></div>
                    <div className="td-bud-row-right">
                      <span className="td-bud-amount">{budSym}{budMisc.toLocaleString()}</span>
                      <span className="td-bud-pct">{pctMisc}%</span>
                    </div>
                  </div>
                </div>

                <button className="td-adjust-btn" onClick={() => navigate('/trip-budget')}>Adjust Budget →</button>
              </section>
            )}

          </div>{/* end td-col-left */}

          {/* ── RIGHT COLUMN: trip details form + notes ── */}
          <div className="td-col-right">

            {/* Trip Details */}
            <section className="td-section">
              <div className="td-section-header">
                <span className="td-section-icon">✏️</span>
                <div>
                  <h2>Trip details</h2>
                  <p>Give your trip a name and choose your travel dates</p>
                </div>
              </div>

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

              <div className="td-dates-row">
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
                      onChange={e => {
                        const val = e.target.value
                        setStartDate(val)
                        if (budget?.tripDays && val) {
                          setEndDate(addDays(val, budget.tripDays))
                        } else if (endDate && val >= endDate) {
                          setEndDate('')
                        }
                      }}
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
                      min={startDate ? addDays(startDate, 1) : today}
                      max={budget?.tripDays && startDate ? addDays(startDate, budget.tripDays) : undefined}
                      onChange={e => setEndDate(e.target.value)}
                    />
                  </div>
                  {errors.endDate && <span className="td-error-msg">{errors.endDate}</span>}
                </div>
              </div>

              {nights > 0 && (
                <div className="td-nights-badge">🗓️ {nights} {nights === 1 ? 'day' : 'days'}</div>
              )}
            </section>

            {/* Notes */}
            <section className="td-section">
              <div className="td-section-header">
                <span className="td-section-icon">📝</span>
                <div>
                  <h2>Notes <span className="td-optional">optional</span></h2>
                  <p>Dietary requirements, accessibility needs, must-see spots…</p>
                </div>
              </div>
              <textarea
                className="td-textarea"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any special notes for your trip…"
                rows={4}
                maxLength={500}
              />
              <div className="td-char-count">{notes.length}/500</div>
            </section>

          </div>{/* end td-col-right */}

        </div>{/* end td-layout */}

        {/* ── CTA Bar ── */}
        <div className="td-cta-bar">
          <button className="td-back-btn" onClick={() => navigate('/trip-budget')}>← Back</button>

          <div className="td-summary">
            {destination && <span className="td-summary-chip">📍 {destination.name}</span>}
            {nights > 0 && <span className="td-summary-chip">🗓️ {nights} {nights === 1 ? 'day' : 'days'}</span>}
            {budget?.totalBudget > 0 && <span className="td-summary-chip">💰 {budSym}{budTotal.toLocaleString()}</span>}
          </div>

          <button className="td-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? (
              <><span className="td-spinner" /> {isEditing ? 'Saving…' : 'Saving…'}</>
            ) : (
              <>
                {isEditing ? 'Update Trip' : 'Save Trip'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
