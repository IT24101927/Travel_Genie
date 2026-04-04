import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './PlanTripLanding.css'

const STEPS = [
  {
    icon: '📍',
    step: '01',
    title: 'Pick Your District',
    desc:  "Choose from all 25 districts across Sri Lanka's 9 provinces. Each offers unique landscapes, culture, and experiences.",
  },
  {
    icon: '🗺️',
    step: '02',
    title: 'Explore Places',
    desc:  'Browse 4,270+ destinations — beaches, temples, wildlife parks, viewpoints, and more — filtered by your interests.',
  },
  {
    icon: '🏨',
    step: '03',
    title: 'Select a Hotel',
    desc:  'Find the perfect stay near your chosen places. Filter by star rating, type, and price range.',
  },
  {
    icon: '💰',
    step: '04',
    title: 'Set Your Budget',
    desc:  'Plan your budget across accommodation, transport, food, and activities — and track spending in real time.',
  },
  {
    icon: '📅',
    step: '05',
    title: 'Build Your Itinerary',
    desc:  'Create a day-by-day schedule, add activities, set notes, and share your trip with travel companions.',
  },
  {
    icon: '✅',
    step: '06',
    title: 'Go & Track',
    desc:  'Follow your plan, log real expenses, and update your trip status from draft all the way to completed.',
  },
]

const HIGHLIGHTS = [
  { icon: '🌴', label: '4,270+ Destinations' },
  { icon: '🏨', label: 'Curated Hotels' },
  { icon: '💳', label: 'Expense Tracker' },
  { icon: '👥', label: 'Trip Planning' },
  { icon: '🗺️', label: 'Interactive Maps' },
  { icon: '⭐', label: 'Reviews & Ratings' },
]

export default function PlanTripLanding({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const [scrolled,  setScrolled]  = useState(false)
  const [menuOpen,  setMenuOpen]  = useState(false)

  const token       = localStorage.getItem('token')
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}')
  const isLoggedIn  = !!token
  const dashPath    = currentUser.role === 'admin' ? '/admin' : '/dashboard'

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const handleStartPlanning = () => {
    if (isLoggedIn) {
      navigate('/plan-trip')
    } else {
      navigate('/login?redirect=/plan-trip')
    }
  }

  return (
    <div className="ptl-page">

      {/* ── Navbar ── */}
      <nav className={`tours-nav glass-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <Link to="/" className="logo">Travel<span>Genie</span></Link>

          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <span className={`hamburger ${menuOpen ? 'open' : ''}`} />
          </button>

          <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/tours">Tours</Link></li>
            <li><Link to="/hotels">Hotels</Link></li>
            <li><Link to="/plan-trip-landing" className="nav-active">Plan a Trip</Link></li>
            <li className="nav-auth-mobile">
              {isLoggedIn ? (
                <Link to={dashPath} className="btn-nav-login" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              ) : (
                <>
                  <Link to="/login" className="btn-nav-login" onClick={() => setMenuOpen(false)}>Log In</Link>
                  <Link to="/signup" className="btn-nav-cta" onClick={() => setMenuOpen(false)}>Sign Up</Link>
                </>
              )}
            </li>
          </ul>

          {toggleTheme && (
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'light' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              )}
            </button>
          )}

          <div className="auth-buttons">
            {isLoggedIn ? (
              <Link to={dashPath} className="btn-nav-login">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="btn-nav-login">Log In</Link>
                <Link to="/signup" className="btn-nav-cta">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="ptl-hero">
        <div className="ptl-hero-overlay" />
        <div className="ptl-hero-content">
          <p className="ptl-hero-tag">🇱🇰 Plan Your Sri Lanka Adventure</p>
          <h1>Your Perfect Trip<br /><span className="ptl-gradient">Starts Here</span></h1>
          <p className="ptl-hero-sub">
            From choosing a district to tracking expenses on the go — TravelGenie walks you through every step of planning an unforgettable trip across Sri Lanka.
          </p>

          {/* Highlight pills */}
          <div className="ptl-highlights">
            {HIGHLIGHTS.map(h => (
              <span key={h.label} className="ptl-highlight-pill">
                {h.icon} {h.label}
              </span>
            ))}
          </div>

          <div className="ptl-hero-ctas">
            <button className="btn-primary ptl-cta-main" onClick={handleStartPlanning}>
              {isLoggedIn ? '🗺️ Start Planning' : '🗺️ Plan a Trip — It\'s Free'}
            </button>
            <Link to="/tours" className="btn-outline-light ptl-cta-sec">Browse Destinations</Link>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="ptl-how">
        <div className="ptl-section-inner">
          <p className="ptl-section-label">How It Works</p>
          <h2 className="ptl-section-title">Six steps to your dream trip</h2>
          <p className="ptl-section-sub">
            Our guided planning flow takes you from idea to itinerary in minutes.
          </p>

          <div className="ptl-steps-grid">
            {STEPS.map(s => (
              <div key={s.step} className="ptl-step-card">
                <div className="ptl-step-num">{s.step}</div>
                <div className="ptl-step-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What's included ── */}
      <section className="ptl-features">
        <div className="ptl-section-inner">
          <p className="ptl-section-label">Everything You Need</p>
          <h2 className="ptl-section-title">Built for serious travellers</h2>

          <div className="ptl-features-grid">
            <div className="ptl-feature-card ptl-feature-wide">
              <div className="ptl-feature-icon">🗺️</div>
              <h3>Interactive District Map</h3>
              <p>Visualise your trip with an interactive map of all 25 districts. See popular places, distances, and connections at a glance before you commit.</p>
            </div>
            <div className="ptl-feature-card">
              <div className="ptl-feature-icon">📅</div>
              <h3>Day-by-Day Itinerary</h3>
              <p>Plan each day with custom activities, timings, and notes. Reorder and edit anytime.</p>
            </div>
            <div className="ptl-feature-card">
              <div className="ptl-feature-icon">💰</div>
              <h3>Budget Planner</h3>
              <p>Set a total budget, split it by category, and track actual spending as you go.</p>
            </div>
            <div className="ptl-feature-card">
              <div className="ptl-feature-icon">👥</div>
              <h3>Trip Sharing</h3>
              <p>Invite travel companions to view or collaborate on your trip plan in real time.</p>
            </div>
            <div className="ptl-feature-card">
              <div className="ptl-feature-icon">🏨</div>
              <h3>Hotel Integration</h3>
              <p>Hotels are shown alongside destinations so you can plan stays without switching apps.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Auth Gate / CTA Section ── */}
      {!isLoggedIn && (
        <section className="ptl-auth-gate">
          <div className="ptl-auth-gate-inner">
            <div className="ptl-auth-badge">🔐 Free Account Required</div>
            <h2>Ready to start planning?</h2>
            <p>
              Create a free TravelGenie account to unlock trip planning, itinerary building, hotel picks, and expense tracking — all in one place.
            </p>

            <div className="ptl-auth-actions">
              <Link to="/signup" className="btn-primary ptl-auth-btn">
                Create a Free Account
              </Link>
              <Link to="/login?redirect=/plan-trip" className="ptl-auth-link">
                Already have an account? <strong>Log In</strong>
              </Link>
            </div>

            <div className="ptl-auth-perks">
              <span>✓ No credit card needed</span>
              <span>✓ Save unlimited trips</span>
              <span>✓ Access on any device</span>
            </div>
          </div>
        </section>
      )}

      {isLoggedIn && (
        <section className="ptl-auth-gate ptl-auth-gate--loggedin">
          <div className="ptl-auth-gate-inner">
            <div className="ptl-auth-badge">👋 Welcome back!</div>
            <h2>You're all set to plan.</h2>
            <p>Jump straight into picking your district and building your perfect Sri Lanka itinerary.</p>
            <button className="btn-primary ptl-auth-btn" onClick={handleStartPlanning}>
              🗺️ Start Planning Now
            </button>
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="ptl-footer">
        <p>© 2026 TravelGenie · <Link to="/">Home</Link> · <Link to="/tours">Tours</Link> · <Link to="/hotels">Hotels</Link></p>
      </footer>
    </div>
  )
}
