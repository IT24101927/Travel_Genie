import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_BASE } from '../../config/api'
import { clearUserData } from '../../utils/clearUserData'
import './PlanTrip.css'

const API = API_BASE

/* ──── Provinces for filtering ──── */
// (static district array removed — data comes from DB)
const PROVINCES = [
  { value: 'all',           label: 'All Provinces', emoji: '🇱🇰' },
  { value: 'Western',       label: 'Western',       emoji: '🏙️' },
  { value: 'Central',       label: 'Central',       emoji: '🌿' },
  { value: 'Southern',      label: 'Southern',      emoji: '🏖️' },
  { value: 'Northern',      label: 'Northern',      emoji: '🏛️' },
  { value: 'Eastern',       label: 'Eastern',       emoji: '🌊' },
  { value: 'North Western', label: 'NW Province',   emoji: '🌾' },
  { value: 'North Central', label: 'NC Province',   emoji: '⛩️' },
  { value: 'Uva',           label: 'Uva',           emoji: '🏔️' },
  { value: 'Sabaragamuwa',  label: 'Sabaragamuwa',  emoji: '💎' },
]

/* Province → CSS class mapping */
const PROVINCE_CLASS = {
  'Western':       'prov-western',
  'Central':       'prov-central',
  'Southern':      'prov-southern',
  'Northern':      'prov-northern',
  'Eastern':       'prov-eastern',
  'North Western': 'prov-northwest',
  'North Central': 'prov-northcentral',
  'Uva':           'prov-uva',
  'Sabaragamuwa':  'prov-sabaragamuwa',
}

/* ── District Card ── */
function DistrictCard({ district, onSelect }) {
  const fallback = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600'

  return (
    <div className="pt-card">
      <div className="pt-card-img">
        <img
          src={district.image || fallback}
          alt={`${district.name} District`}
          onError={(e) => { e.currentTarget.src = fallback }}
        />
        <span className={`pt-category-badge ${PROVINCE_CLASS[district.province] || ''}`}>
          {district.province} Province
        </span>
      </div>

      <div className="pt-card-body">
        <h3 className="pt-card-name">{district.name} District</h3>
        <p className="pt-card-desc">{district.description.slice(0, 115)}…</p>

        <p className="pt-highlights-label">Highlights</p>
        <div className="pt-activities">
          {district.highlights.slice(0, 3).map(h => (
            <span key={h} className="pt-activity-chip">{h}</span>
          ))}
        </div>

        <p className="pt-best-for">
          <span className="pt-best-for-icon">✦</span>
          {district.bestFor.join(' · ')}
        </p>

        <div className="pt-card-footer">
          <button className="pt-select-btn" onClick={() => onSelect(district)}>
            Explore
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

/* ── Main Component ── */
function PlanTrip({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen]   = useState(false)
  const [search,   setSearch]     = useState('')
  const [province, setProvince]   = useState('all')
  const [districts, setDistricts] = useState([])
  const [loading, setLoading]     = useState(true)

  // Load all district data from DB
  useEffect(() => {
    fetch(`${API}/districts`)
      .then(r => r.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          setDistricts(json.data.map(d => ({
            id:          String(d.district_id),
            district_id: d.district_id,
            name:        d.name,
            province:    d.province,
            description: d.description || '',
            highlights:  Array.isArray(d.highlights) ? d.highlights : [],
            bestFor:     Array.isArray(d.best_for)   ? d.best_for   : [],
            image:       d.image_url  || '',
          })))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    clearUserData()
    navigate('/')
  }

  /* Filter districts */
  const filtered = districts.filter(d => {
    const matchProv   = province === 'all' || d.province === province
    const q           = search.toLowerCase()
    const matchSearch = !q ||
      d.name.toLowerCase().includes(q) ||
      d.province.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      d.highlights.some(h => h.toLowerCase().includes(q)) ||
      d.bestFor.some(b => b.toLowerCase().includes(q))
    return matchProv && matchSearch
  })

  const handleSelect = (district) => {
    // district already has district_id + correct image from DB merge
    localStorage.setItem('selectedDistrict', JSON.stringify(district))
    // Clear any stale edit state so this is treated as a new trip, not an update
    localStorage.removeItem('editingTripId')
    localStorage.removeItem('selectedHotel')
    localStorage.removeItem('selectedHotels')
    localStorage.removeItem('selectedPlaces')
    localStorage.removeItem('tripPreferences')
    localStorage.removeItem('tripBudget')
    navigate('/district-explore')
  }

  return (
    <div className="pt-page">
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
      <section className="pt-hero">
        <div className="pt-hero-inner">
          <p className="pt-eyebrow">🇱🇰 Explore Sri Lanka</p>
          <h1>Choose your <em>district</em></h1>
          <p className="pt-hero-sub">
            Sri Lanka has 25 districts across 9 provinces — each with its own character, landscapes and experiences. Pick yours to start building your perfect trip.
          </p>
          <div className="pt-search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pt-search-icon">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              className="pt-search"
              placeholder="Search districts, highlights, activities…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button className="pt-search-clear" onClick={() => setSearch('')} aria-label="Clear">✕</button>
            )}
          </div>
        </div>
      </section>

      <div className="pt-content">
        {/* ── Province Filter Pills ── */}
        <div className="pt-filters">
          <div className="pt-category-pills">
            {PROVINCES.map(p => (
              <button
                key={p.value}
                className={`pt-pill ${province === p.value ? 'active' : ''}`}
                onClick={() => setProvince(p.value)}
              >
                {p.emoji} {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Status bar ── */}
        <div className="pt-status-bar">
          <span className="pt-status-text">
            {filtered.length} district{filtered.length !== 1 ? 's' : ''} found
          </span>
        </div>

        {/* ── District Grid ── */}
        {loading ? (
          <div className="pt-empty">
            <span className="pt-empty-icon">⏳</span>
            <h3>Loading districts…</h3>
          </div>
        ) : filtered.length === 0 ? (
          <div className="pt-empty">
            <span className="pt-empty-icon">🔍</span>
            <h3>No districts found</h3>
            <p>Try a different search term or province</p>
            <button className="pt-clear-btn" onClick={() => { setSearch(''); setProvince('all') }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="pt-grid">
            {filtered.map(district => (
              <DistrictCard key={district.district_id} district={district} onSelect={handleSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default PlanTrip