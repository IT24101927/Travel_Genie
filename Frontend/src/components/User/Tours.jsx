import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { API_BASE, API_BASE_URL } from '../../config/api'
import placeholderImg from '../../assets/placeholder.svg'
import './Tours.css'

/* ── helpers ── */
function toAbsUrl(value) {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  const base = API_BASE_URL.replace(/\/+$/, '')
  const path = value.startsWith('/') ? value : `/${value}`
  return `${base}${path}`
}

function starBar(n) {
  const s = Math.min(5, Math.max(0, Math.round(Number(n) || 0)))
  return '★'.repeat(s) + '☆'.repeat(5 - s)
}

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

const CATEGORY_ICONS = {
  Heritage: '🏰', Beach: '🏖️', Wildlife: '🐆', Nature: '🌿',
  Scenic: '🌄', Pilgrimage: '🛕', Adventure: '⛰️', Culture: '🏛️',
  Temple: '🛕', Museum: '🏛️', Viewpoint: '🌅', Garden: '🌺',
  Park: '🌳', Market: '🛍️', Safari: '🦁', Lake: '💧',
}

const PAGE_SIZE = 12

function SkeletonCard() {
  return (
    <div className="tour-card skeleton-card" style={{ minHeight: 320 }} />
  )
}

const DISTRICT_PREVIEW = 9

export default function Tours({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  /* ── search state (pre-filled from URL) ── */
  const [q,       setQ]       = useState(searchParams.get('q')      || '')
  const [date,    setDate]    = useState(searchParams.get('date')    || '')
  const [category, setCategory] = useState(searchParams.get('cat')  || 'All')

  /* ── paginated (filter) data ── */
  const [destinations, setDestinations] = useState([])
  const [categories,   setCategories]   = useState(['All'])
  const [total,        setTotal]        = useState(0)
  const [page,         setPage]         = useState(1)
  const [loading,      setLoading]      = useState(true)
  const [scrolled,     setScrolled]     = useState(false)

  /* ── district grouped data ── */
  const [allDestinations,    setAllDestinations]    = useState([])
  const [loadingAll,         setLoadingAll]         = useState(false)
  const [districtCollapsed,  setDistrictCollapsed]  = useState({})

  /* grouped mode = browsing without any search/filter active */
  const groupedMode = !q.trim() && category === 'All'

  const token       = localStorage.getItem('token')
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}')
  const isLoggedIn  = !!token
  const dashPath    = currentUser.role === 'admin' ? '/admin' : '/dashboard'
  const [menuOpen,  setMenuOpen] = useState(false)

  /* navbar scroll */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  /* ── fetch all destinations for grouped mode ── */
  useEffect(() => {
    if (!groupedMode) return
    setLoadingAll(true)
    fetch(`${API_BASE}/destinations?limit=all`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.data)) setAllDestinations(data.data)
      })
      .catch(() => {})
      .finally(() => setLoadingAll(false))
  }, [groupedMode])

  /* ── fetch destinations (filtered/paginated) ── */
  useEffect(() => {
    if (groupedMode) return
    setLoading(true)
    const params = new URLSearchParams()
    params.set('limit', PAGE_SIZE)
    params.set('page', page)
    if (q.trim())              params.set('search',   q.trim())
    if (category !== 'All')    params.set('type',     category)

    fetch(`${API_BASE}/destinations?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.data)) {
          setDestinations(data.data)
          setTotal(data.total || data.data.length)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [q, category, page, groupedMode])

  /* ── group destinations by district ── */
  const districtGroups = (() => {
    const map = new Map()
    allDestinations.forEach(d => {
      const name = d.district?.name || 'Other'
      if (!map.has(name)) map.set(name, [])
      map.get(name).push(d)
    })
    return Array.from(map.entries())
      .map(([district, all]) => {
        // put image-bearing places first, then sort by rating within each group
        const withImg    = all.filter(d => d.image_url).sort((a, b) => (b.rating || 0) - (a.rating || 0))
        const withoutImg = all.filter(d => !d.image_url).sort((a, b) => (b.rating || 0) - (a.rating || 0))
        const sorted     = [...withImg, ...withoutImg]
        return {
          district,
          places:        sorted.slice(0, DISTRICT_PREVIEW),
          districtTotal: all.length,
        }
      })
      .filter(({ places }) => places.length > 0)
      .sort((a, b) => a.district.localeCompare(b.district))
  })()

  const toggleDistrictCollapse = (district) =>
    setDistrictCollapsed(prev => ({ ...prev, [district]: !prev[district] }))

  /* ── fetch categories once ── */
  useEffect(() => {
    fetch(`${API_BASE}/destinations/types`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.data)) {
          setCategories(['All', ...data.data])
        }
      })
      .catch(() => {})
  }, [])

  const handleSearch = () => {
    setPage(1)
    const p = new URLSearchParams()
    if (q.trim())           p.set('q', q.trim())
    if (date)               p.set('date', date)
    if (category !== 'All') p.set('cat', category)
    setSearchParams(p)
  }

  const handleCatChange = (cat) => {
    setCategory(cat)
    setPage(1)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const getImage = (d) => {
    const raw = d.image_url || ''
    return raw ? toAbsUrl(raw) : (TYPE_IMAGES[d.type] || placeholderImg)
  }

  return (
    <div className="tours-page">

      {/* ── Navbar ── */}
      <nav className={`tours-nav glass-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <Link to="/" className="logo">Travel<span>Genie</span></Link>

          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <span className={`hamburger ${menuOpen ? 'open' : ''}`} />
          </button>

          <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/tours" className="nav-active">Tours</Link></li>
            <li><Link to="/hotels">Hotels</Link></li>
            <li><Link to="/plan-trip-landing">Plan a Trip</Link></li>
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
              <>
                <Link to={dashPath} className="btn-nav-login">Dashboard</Link>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-nav-login">Log In</Link>
                <Link to="/signup" className="btn-nav-cta">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Page header ── */}
      <div className="tours-hero">
        <div className="tours-hero-overlay" />
        <div className="tours-hero-content">
          <p className="tours-hero-tag">🌴 Explore Sri Lanka</p>
          <h1>All <span className="gradient-text">Destinations</span></h1>
          <p>Discover {total > 0 ? `${total}+` : 'hundreds of'} breathtaking destinations across the island</p>

          {/* Search bar */}
          <div className="tours-search glass-card">
            <div className="tours-search-field">
              <label>Destination</label>
              <input
                type="text"
                placeholder="Search places…"
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="tours-search-field">
              <label>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <button className="btn-primary search-btn" onClick={handleSearch}>Search</button>
          </div>
        </div>
      </div>

      {/* ── Category pills ── */}
      <div className="tours-categories tours-container">
        {categories.map(cat => (
          <button
            key={cat}
            className={`cat-pill ${category === cat ? 'active' : ''}`}
            onClick={() => handleCatChange(cat)}
          >
            {cat !== 'All' && (CATEGORY_ICONS[cat] || '📍')} {cat}
          </button>
        ))}
      </div>

      {/* ── Results bar ── */}
      <div className="tours-results-bar tours-container">
        {groupedMode ? (
          <span className="tours-count">
            {loadingAll ? 'Loading…' : `${allDestinations.length} destinations across ${districtGroups.length} districts`}
          </span>
        ) : (
          !loading && (
            <span className="tours-count">
              Showing {destinations.length} of {total} destinations
              {category !== 'All' ? ` · ${category}` : ''}
              {q ? ` · "${q}"` : ''}
            </span>
          )
        )}
        {(q || category !== 'All') && (
          <button className="tours-clear" onClick={() => { setQ(''); setCategory('All'); setPage(1); setSearchParams({}) }}>
            ✕ Clear filters
          </button>
        )}
      </div>

      {/* ── District grouped view ── */}
      {groupedMode ? (
        <div className="tours-container">
          {loadingAll ? (
            <div className="tours-grid">
              {[...Array(12)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : districtGroups.length === 0 ? (
            <div className="tours-empty"><span>�</span><p>No destinations available.</p></div>
          ) : (
            districtGroups.map(({ district, places, districtTotal }) => {
              const isCollapsed = districtCollapsed[district]
              return (
                <div key={district} className="district-section">
                  <div className="district-header" onClick={() => toggleDistrictCollapse(district)}>
                    <div className="district-header-left">
                      <span className={`district-arrow ${isCollapsed ? 'collapsed' : ''}`}>▼</span>
                      <span className="district-pin">📍</span>
                      <h2 className="district-name">{district}</h2>
                    </div>
                    <span className="district-count">{districtTotal} destinations</span>
                  </div>

                  {!isCollapsed && (
                    <>
                      <div className="district-grid">
                        {places.map(d => (
                          <div className="tour-card glass-card" key={d.place_id}>
                            <div className="tour-card-img">
                              <img
                                src={getImage(d)}
                                alt={d.name}
                                loading="lazy"
                                onError={e => { e.target.onerror = null; e.target.src = placeholderImg }}
                              />
                              {d.type && (
                                <span className="tour-type-badge">
                                  {CATEGORY_ICONS[d.type] || '📍'} {d.type}
                                </span>
                              )}
                              {d.duration && (
                                <span className="tour-duration-badge">⏱ {d.duration}</span>
                              )}
                            </div>
                            <div className="tour-card-body">
                              <h3 className="tour-card-name">{d.name}</h3>
                              {d.description && (
                                <p className="tour-card-desc">
                                  {d.description.length > 110 ? d.description.slice(0, 110) + '…' : d.description}
                                </p>
                              )}
                              <div className="tour-card-footer">
                                <span className="tour-card-stars" title={`${d.rating || 0} / 5`}>
                                  {starBar(d.rating)}
                                </span>
                                <span className="tour-card-reviews">{d.review_count || 0} reviews</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="district-show-more">
                        <Link to="/login" className="btn-view-more">
                          View More →
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>
      ) : (
        <>
          {/* ── Flat filtered grid ── */}
          <div className="tours-grid tours-container">
            {loading
              ? [...Array(PAGE_SIZE)].map((_, i) => <SkeletonCard key={i} />)
              : destinations.length === 0
                ? (
                  <div className="tours-empty">
                    <span>🔍</span>
                    <p>No destinations found{q ? ` for "${q}"` : ''}.</p>
                    <button className="btn-primary" onClick={() => { setQ(''); setCategory('All'); setPage(1) }}>Show All</button>
                  </div>
                )
                : destinations.map(d => (
                  <div className="tour-card glass-card" key={d.place_id}>
                    <div className="tour-card-img">
                      <img
                        src={getImage(d)}
                        alt={d.name}
                        loading="lazy"
                        onError={e => { e.target.onerror = null; e.target.src = placeholderImg }}
                      />
                      {d.type && (
                        <span className="tour-type-badge">
                          {CATEGORY_ICONS[d.type] || '📍'} {d.type}
                        </span>
                      )}
                    </div>
                    <div className="tour-card-body">
                      <h3 className="tour-card-name">{d.name}</h3>
                      {d.district && (
                        <p className="tour-card-location">
                          📌 {d.district.name}{d.district.province ? `, ${d.district.province}` : ''}
                        </p>
                      )}
                      {d.description && (
                        <p className="tour-card-desc">
                          {d.description.length > 120 ? d.description.slice(0, 120) + '…' : d.description}
                        </p>
                      )}
                      <div className="tour-card-footer">
                        <span className="tour-card-stars" title={`${d.rating || 0} / 5`}>
                          {starBar(d.rating)}
                        </span>
                        {d.review_count > 0 && (
                          <span className="tour-card-reviews">{d.review_count} reviews</span>
                        )}
                        {d.duration && (
                          <span className="tour-card-duration">⏱ {d.duration}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
            }
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && !loading && (
            <div className="tours-pagination tours-container">
              <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              {[...Array(Math.min(7, totalPages))].map((_, i) => {
                let p
                if (totalPages <= 7) p = i + 1
                else if (page <= 4) p = i + 1
                else if (page >= totalPages - 3) p = totalPages - 6 + i
                else p = page - 3 + i
                return (
                  <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                )
              })}
              <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* ── Footer strip ── */}
      <div className="tours-footer">
        <p>© 2026 TravelGenie · <Link to="/">Back to Home</Link></p>
      </div>
    </div>
  )
}
