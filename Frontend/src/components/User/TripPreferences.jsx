import { useState, useEffect } from 'react'
import { clearUserData } from '../../utils/clearUserData'
import { Link, useNavigate } from 'react-router-dom'
import { API_BASE } from '../../config/api'
import './TripPreferences.css'

const HOTEL_TYPES = [
  { value: 'any',       icon: '🏨', label: 'Any',        desc: 'Show all options' },
  { value: 'budget',    icon: '🛖', label: 'Budget',     desc: 'Guesthouses & hostels' },
  { value: 'midrange',  icon: '🏩', label: 'Mid-range',  desc: '3–4 star hotels' },
  { value: 'luxury',    icon: '🌟', label: 'Luxury',     desc: '5 star & resorts' },
  { value: 'boutique',  icon: '🏡', label: 'Boutique',   desc: 'Small unique stays' },
  { value: 'villa',     icon: '🏛️', label: 'Villa',      desc: 'Private villa rental' },
]

const TRIP_TYPES = [
  { value: 'solo',   icon: '🧍', label: 'Solo',   desc: 'Just me' },
  { value: 'couple', icon: '👫', label: 'Couple', desc: '2 people' },
  { value: 'family', icon: '👨‍👩‍👧‍👦', label: 'Family', desc: 'With kids' },
  { value: 'group',  icon: '👥', label: 'Group',  desc: 'Friends / squad' },
]

function tomorrowStr() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDaysLocal(dateStr, n) {
  if (!dateStr) return ''
  const [y, m, dd] = dateStr.split('-').map(Number)
  const d = new Date(y, m - 1, dd)
  d.setDate(d.getDate() + n)
  const yr = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const dy = String(d.getDate()).padStart(2, '0')
  return `${yr}-${mo}-${dy}`
}



export default function TripPreferences({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [district] = useState(() => {
    try { return JSON.parse(localStorage.getItem('selectedDistrict') || 'null') }
    catch { return null }
  })

  // Preference state
  const [days,      setDays]      = useState(3)
  const [startDate, setStartDate] = useState(tomorrowStr)
  const [tripType,  setTripType]  = useState('couple')
  const [people,    setPeople]    = useState(2)
  const [hotelType, setHotelType] = useState('any')

  useEffect(() => {
    const raw = localStorage.getItem('selectedDistrict')
    if (!raw) { navigate('/plan-trip'); return }

    // Restore previously saved prefs from localStorage first
    const saved = localStorage.getItem('tripPreferences')
    if (saved) {
      try {
        const p = JSON.parse(saved)
        const savedDays = Math.max(1, Number(p.days) || 3)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDays(savedDays)
        if (p.startDate) setStartDate(p.startDate)
        setTripType(p.tripType ?? 'couple')
        setPeople(Math.max(1, Number(p.people) || 2))
        setHotelType(p.hotelType ?? 'any')
      } catch {
        // Ignore malformed cached preferences and keep defaults.
      }
    }

    // Then try to load from backend (overrides localStorage if available)
    const token = localStorage.getItem('token')
    if (token) {
      fetch(`${API_BASE}/preferences/trip-defaults`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(res => {
          if (!res?.data) return
          const d = res.data
          // Only apply backend defaults if no local trip prefs saved yet
          if (!saved) {
            setDays(d.days ?? 3)
            setTripType(d.tripType ?? 'couple')
            setPeople(d.people ?? 2)
            setHotelType(d.hotelType ?? 'any')
          }
        })
        .catch(() => {})
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    clearUserData()
    navigate('/')
  }

  // Sync people count with trip type quick-set
  const handleTripType = (val) => {
    setTripType(val)
    if (val === 'solo')   setPeople(1)
    if (val === 'couple') setPeople(2)
    if (val === 'family' && people < 3) setPeople(3)
    if (val === 'group'  && people < 3) setPeople(3)
  }

  const handleContinue = () => {
    const prefs = { days, startDate, tripType, people, hotelType }
    localStorage.setItem('tripPreferences', JSON.stringify(prefs))
    // Also persist to backend as trip defaults
    const token = localStorage.getItem('token')
    if (token) {
      fetch(`${API_BASE}/preferences/trip-defaults`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(prefs),
      }).catch(() => {})
    }
    navigate('/hotel-picker')
  }

  if (!district) return null

  const autoFixed = tripType === 'solo' || tripType === 'couple'

  return (
    <div className="tp-page">

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

      {/* ── Hero / Step indicator ── */}
      <section className="tp-hero">
        <div className="tp-hero-inner">
          {/* Breadcrumb steps */}
          <div className="tp-steps">
            <div className="tp-step done" onClick={() => navigate('/plan-trip')} title="Choose District">
              <span className="tp-step-num">1</span>
              <span className="tp-step-label">District</span>
            </div>
            <div className="tp-step-line done" />
            <div className="tp-step done" onClick={() => navigate('/district-explore')} title="Pick Places">
              <span className="tp-step-num">2</span>
              <span className="tp-step-label">Places</span>
            </div>
            <div className="tp-step-line done" />
            <div className="tp-step active">
              <span className="tp-step-num">3</span>
              <span className="tp-step-label">Preferences</span>
            </div>
            <div className="tp-step-line" />
            <div className="tp-step">
              <span className="tp-step-num">4</span>
              <span className="tp-step-label">Hotel</span>
            </div>
            <div className="tp-step-line" />
            <div className="tp-step">
              <span className="tp-step-num">5</span>
              <span className="tp-step-label">Budget</span>
            </div>
            <div className="tp-step-line" />
            <div className="tp-step">
              <span className="tp-step-num">6</span>
              <span className="tp-step-label">Details</span>
            </div>
          </div>

          <p className="tp-eyebrow">📍 {district.province} Province · {district.name}</p>
          <h1>Plan your <em>stay</em></h1>
          <p className="tp-hero-sub">Tell us a little about your trip so we can tailor the perfect experience.</p>
        </div>
      </section>

      {/* ── Form body ── */}
      <div className="tp-body">

        <div className="tp-layout">

          {/* ── LEFT COLUMN: card selection grids ── */}
          <div className="tp-col-left">

            {/* ── Section 2: Trip type ── */}
            <section className="tp-section tp-triptype-section">
              <div className="tp-section-header">
                <span className="tp-section-icon">👤</span>
                <div>
                  <h2>Who's travelling?</h2>
                  <p>Select the type that best describes your group</p>
                </div>
              </div>

              <div className="tp-trip-types">
                {TRIP_TYPES.map(t => (
                  <button
                    key={t.value}
                    className={`tp-type-card ${tripType === t.value ? 'selected' : ''}`}
                    onClick={() => handleTripType(t.value)}
                  >
                    <span className="tp-type-icon">{t.icon}</span>
                    <strong>{t.label}</strong>
                    <span className="tp-type-desc">{t.desc}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* ── Section 4: Hotel type ── */}
            <section className="tp-section tp-hoteltype-section">
              <div className="tp-section-header">
                <span className="tp-section-icon">🏨</span>
                <div>
                  <h2>Hotel preference</h2>
                  <p>We'll filter hotels in {district.name} based on your choice</p>
                </div>
              </div>

              <div className="tp-hotel-types">
                {HOTEL_TYPES.map(h => (
                  <button
                    key={h.value}
                    className={`tp-hotel-card ${hotelType === h.value ? 'selected' : ''}`}
                    onClick={() => setHotelType(h.value)}
                  >
                    <span className="tp-hotel-icon">{h.icon}</span>
                    <strong>{h.label}</strong>
                    <span className="tp-hotel-desc">{h.desc}</span>
                  </button>
                ))}
              </div>
            </section>

          </div>{/* end tp-col-left */}

          {/* ── RIGHT COLUMN: compact steppers ── */}
          <div className="tp-col-right">

            {/* ── Section 1: Days ── */}
            <section className="tp-section tp-days-section">
              <div className="tp-section-header">
                <span className="tp-section-icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </span>
                <div>
                  <h2>How many nights?</h2>
                  <p>Choose your total hotel nights in {district.name}</p>
                </div>
              </div>

              {/* ── Trip start date ── */}
              <div className="tp-start-date-wrap">
                <label className="tp-start-date-label" htmlFor="tp-start-date">Trip start date</label>
                <input
                  id="tp-start-date"
                  type="date"
                  className="tp-start-date-input"
                  value={startDate}
                  min={tomorrowStr()}
                  onChange={e => { if (e.target.value) setStartDate(e.target.value) }}
                />
                {startDate && (
                  <p className="tp-start-date-hint">
                    Book <strong>{days} hotel night{days !== 1 ? 's' : ''}</strong> · hotel dates selected in next step
                  </p>
                )}
              </div>

              <div className="tp-days-control">
                <button
                  className="tp-days-btn"
                  onClick={() => setDays(d => Math.max(1, d - 1))}
                  disabled={days <= 1}
                >−</button>
                <div className="tp-days-display">
                  <span className="tp-days-num">{days}</span>
                  <span className="tp-days-unit">{days === 1 ? 'night' : 'nights'}</span>
                </div>
                <button
                  className="tp-days-btn"
                  onClick={() => setDays(d => Math.min(21, d + 1))}
                  disabled={days >= 21}
                >+</button>
              </div>

              {/* Quick-pick chips */}
              <div className="tp-quick-days">
                {[1, 2, 3, 5, 7, 10, 14].map(n => (
                  <button
                    key={n}
                    className={`tp-quick-chip ${days === n ? 'active' : ''}`}
                    onClick={() => setDays(n)}
                  >
                    {n}n
                  </button>
                ))}
              </div>
            </section>

            {/* ── Section 3: People count (dynamic) ── */}
            <section className="tp-section tp-people-section">
              <div className="tp-section-header">
                <span className="tp-section-icon">👥</span>
                <div>
                  <h2>How many people?</h2>
                  <p>
                    {autoFixed
                      ? 'Count auto-set based on your trip type'
                      : `Set the exact number of travellers in your ${tripType}`}
                  </p>
                </div>
              </div>

              <div className="tp-people-control">
                <button
                  className="tp-days-btn"
                  onClick={() => setPeople(p => Math.max(tripType === 'solo' ? 1 : 2, p - 1))}
                  disabled={
                    (tripType === 'solo'   && people <= 1) ||
                    (tripType === 'couple' && people <= 2) ||
                    ((tripType === 'family' || tripType === 'group') && people <= 2)
                  }
                >−</button>
                <div className="tp-days-display">
                  <span className="tp-days-num">{people}</span>
                  <span className="tp-days-unit">{people === 1 ? 'person' : 'people'}</span>
                </div>
                <button
                  className="tp-days-btn"
                  onClick={() => setPeople(p => Math.min(20, p + 1))}
                  disabled={
                    (tripType === 'solo' && people >= 1) ||
                    (tripType === 'couple' && people >= 2)
                  }
                >+</button>
              </div>

              {/* People breakdown hint */}
              {tripType === 'family' && people >= 3 && (
                <p className="tp-people-hint">
                  🧒 Family of {people} — we'll suggest family-friendly hotels &amp; activities
                </p>
              )}
              {tripType === 'group' && people >= 3 && (
                <p className="tp-people-hint">
                  🎉 Group of {people} — we'll look for rooms &amp; rates that suit larger parties
                </p>
              )}
            </section>

          </div>{/* end tp-col-right */}

        </div>{/* end tp-layout */}

        {/* ── Summary + CTA ── */}
        <div className="tp-cta-bar">
          <button className="tp-back-btn" onClick={() => navigate('/district-explore')}>
            ← Back
          </button>

          <div className="tp-summary">
            <span className="tp-summary-chip">🗓️ {days} night{days !== 1 ? 's' : ''}{startDate ? ` from ${startDate}` : ''}</span>
            <span className="tp-summary-chip">
              {TRIP_TYPES.find(t => t.value === tripType)?.icon} {people} {people === 1 ? 'person' : 'people'}
            </span>
            <span className="tp-summary-chip">
              {HOTEL_TYPES.find(h => h.value === hotelType)?.icon} {HOTEL_TYPES.find(h => h.value === hotelType)?.label}
            </span>
          </div>

          <button className="tp-continue-btn" onClick={handleContinue}>
            Continue
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12,5 19,12 12,19"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
