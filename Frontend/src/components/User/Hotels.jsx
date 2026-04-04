import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_BASE, API_BASE_URL } from '../../config/api'
import placeholderImg from '../../assets/placeholder.svg'
import './Tours.css'

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

const STAR_ICONS = { 1: '⭐', 2: '⭐⭐', 3: '⭐⭐⭐', 4: '⭐⭐⭐⭐', 5: '⭐⭐⭐⭐⭐' }

const TYPE_ICONS = {
  Hotel: '🏨', Resort: '🌴', Villa: '🏡', Boutique: '🛎️',
  Hostel: '🎒', Guesthouse: '🏠', Bungalow: '🌿', Lodge: '🏕️',
}

const TYPE_IMAGES = {
  Hotel:      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&auto=format',
  Resort:     'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&auto=format',
  Villa:      'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&auto=format',
  Boutique:   'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&auto=format',
  Hostel:     'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&auto=format',
  Guesthouse: 'https://images.unsplash.com/photo-1506059612708-99d6c258160e?w=600&auto=format',
  Bungalow:   'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=600&auto=format',
  Lodge:      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format',
}

const HOTEL_TYPES = ['All', 'Hotel', 'Resort', 'Villa', 'Boutique', 'Hostel', 'Guesthouse', 'Bungalow', 'Lodge']

const PAGE_SIZE     = 12
const DISTRICT_PREVIEW = 9

function SkeletonCard() {
  return <div className="tour-card skeleton-card" style={{ minHeight: 320 }} />
}

export default function Hotels({ theme, toggleTheme }) {
  const navigate = useNavigate()

  const [q,            setQ]            = useState('')
  const [hotelType,    setHotelType]    = useState('All')
  const [starClass,    setStarClass]    = useState('All')
  const [hotels,       setHotels]       = useState([])
  const [total,        setTotal]        = useState(0)
  const [page,         setPage]         = useState(1)
  const [loading,      setLoading]      = useState(true)
  const [scrolled,     setScrolled]     = useState(false)
  const [menuOpen,     setMenuOpen]     = useState(false)
  const [allHotels,    setAllHotels]    = useState([])
  const [loadingAll,   setLoadingAll]   = useState(true)
  const [districtCollapsed, setDistrictCollapsed] = useState({})

  const token       = localStorage.getItem('token')
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}')
  const isLoggedIn  = !!token
  const dashPath    = currentUser.role === 'admin' ? '/admin' : '/dashboard'

  const groupedMode = !q.trim() && hotelType === 'All' && starClass === 'All'

  /* navbar scroll */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  /* fetch all hotels for grouped mode */
  useEffect(() => {
    if (!groupedMode) return
    setLoadingAll(true)
    fetch(`${API_BASE}/hotels?limit=all`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.data)) setAllHotels(data.data)
      })
      .catch(() => {})
      .finally(() => setLoadingAll(false))
  }, [groupedMode])

  /* fetch hotels (filtered/paginated) */
  useEffect(() => {
    if (groupedMode) return
    setLoading(true)
    const params = new URLSearchParams()
    params.set('limit', PAGE_SIZE)
    params.set('page', page)
    if (q.trim())            params.set('search',     q.trim())
    if (hotelType !== 'All') params.set('hotel_type', hotelType)
    if (starClass !== 'All') params.set('star_class', starClass)

    fetch(`${API_BASE}/hotels?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.data)) {
          setHotels(data.data)
          setTotal(data.total || data.data.length)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [q, hotelType, starClass, page, groupedMode])

  /* group hotels by district */
  const districtGroups = (() => {
    const map = new Map()
    allHotels.forEach(h => {
      const name = h.place?.district?.name || 'Other'
      if (!map.has(name)) map.set(name, [])
      map.get(name).push(h)
    })
    return Array.from(map.entries())
      .map(([district, all]) => {
        const withImg    = all.filter(h => h.image_url || h.place?.image_url).sort((a, b) => (b.rating || 0) - (a.rating || 0))
        const withoutImg = all.filter(h => !h.image_url && !h.place?.image_url).sort((a, b) => (b.rating || 0) - (a.rating || 0))
        const sorted     = [...withImg, ...withoutImg]
        return { district, places: sorted.slice(0, DISTRICT_PREVIEW), districtTotal: all.length }
      })
      .filter(({ places }) => places.length > 0)
      .sort((a, b) => a.district.localeCompare(b.district))
  })()

  const toggleDistrictCollapse = (district) =>
    setDistrictCollapsed(prev => ({ ...prev, [district]: !prev[district] }))

  const handleSearch = () => setPage(1)

  const handleTypeChange = (t) => { setHotelType(t); setPage(1) }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const getImage = (h) => {
    const raw = h.image_url || h.place?.image_url || ''
    return raw ? toAbsUrl(raw) : (TYPE_IMAGES[h.hotel_type] || placeholderImg)
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
            <li><Link to="/tours">Tours</Link></li>
            <li><Link to="/hotels" className="nav-active">Hotels</Link></li>
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

      {/* ── Page hero ── */}
      <div className="tours-hero">
        <div className="tours-hero-overlay" />
        <div className="tours-hero-content">
          <p className="tours-hero-tag">🏨 Where to Stay</p>
          <h1>Featured <span className="gradient-text">Hotels</span></h1>
          <p>Browse {total > 0 ? `${total}+` : 'hundreds of'} hotels, resorts & villas across Sri Lanka</p>

          <div className="tours-search glass-card">
            <div className="tours-search-field">
              <label>Hotel Name</label>
              <input
                type="text"
                placeholder="Search hotels…"
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="tours-search-field">
              <label>Type</label>
              <select value={hotelType} onChange={e => { setHotelType(e.target.value); setPage(1) }}>
                {HOTEL_TYPES.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
              </select>
            </div>
            <div className="tours-search-field">
              <label>Stars</label>
              <select value={starClass} onChange={e => { setStarClass(e.target.value); setPage(1) }}>
                <option value="All">Any Stars</option>
                {[5, 4, 3, 2, 1].map(s => <option key={s} value={s}>{STAR_ICONS[s]} {s}-Star</option>)}
              </select>
            </div>
            <button className="btn-primary search-btn" onClick={handleSearch}>Search</button>
          </div>
        </div>
      </div>

      {/* ── Type pills ── */}
      <div className="tours-categories tours-container">
        {HOTEL_TYPES.map(t => (
          <button
            key={t}
            className={`cat-pill ${hotelType === t ? 'active' : ''}`}
            onClick={() => handleTypeChange(t)}
          >
            {t !== 'All' && (TYPE_ICONS[t] || '🏨')} {t}
          </button>
        ))}
      </div>

      {/* ── Results bar ── */}
      <div className="tours-results-bar tours-container">
        {groupedMode ? (
          !loadingAll && (
            <span className="tours-count">
              {allHotels.length} hotels across {districtGroups.length} districts
            </span>
          )
        ) : (
          !loading && (
            <span className="tours-count">
              Showing {hotels.length} of {total} hotels
              {hotelType !== 'All' ? ` · ${hotelType}` : ''}
              {starClass !== 'All' ? ` · ${starClass}-Star` : ''}
              {q ? ` · "${q}"` : ''}
            </span>
          )
        )}
        {(q || hotelType !== 'All' || starClass !== 'All') && (
          <button className="tours-clear" onClick={() => { setQ(''); setHotelType('All'); setStarClass('All'); setPage(1) }}>
            ✕ Clear filters
          </button>
        )}
      </div>

      {/* ── Grouped district view ── */}
      {groupedMode ? (
        <div className="tours-districts tours-container">
          {loadingAll
            ? [...Array(6)].map((_, i) => <div key={i} className="district-section skeleton-card" style={{ height: 60, borderRadius: 14, marginBottom: '1rem' }} />)
            : districtGroups.map(({ district, places, districtTotal }) => {
              const isCollapsed = districtCollapsed[district]
              return (
                <div className="district-section glass-card" key={district}>
                  <div className="district-header" onClick={() => toggleDistrictCollapse(district)} style={{ cursor: 'pointer' }}>
                    <div className="district-header-left">
                      <span className={`district-arrow ${isCollapsed ? 'collapsed' : ''}`}>▼</span>
                      <span className="district-pin">📍</span>
                      <h2 className="district-name">{district}</h2>
                    </div>
                    <span className="district-count">{districtTotal} hotels</span>
                  </div>

                  {!isCollapsed && (
                    <>
                      <div className="district-grid">
                        {places.map(h => (
                          <div className="tour-card glass-card" key={h.hotel_id}>
                            <div className="tour-card-img">
                              <img
                                src={getImage(h)}
                                alt={h.name}
                                loading="lazy"
                                onError={e => { e.target.onerror = null; e.target.src = placeholderImg }}
                              />
                              {h.hotel_type && (
                                <span className="tour-type-badge">
                                  {TYPE_ICONS[h.hotel_type] || '🏨'} {h.hotel_type}
                                </span>
                              )}
                              {h.price_per_night && (
                                <span className="tour-duration-badge">LKR {Number(h.price_per_night).toLocaleString()}/night</span>
                              )}
                            </div>
                            <div className="tour-card-body">
                              <h3 className="tour-card-name">{h.name}</h3>
                              {h.star_class && (
                                <p className="tour-card-desc">{STAR_ICONS[h.star_class] || ''} {h.star_class}-Star</p>
                              )}
                              <div className="tour-card-footer">
                                <span className="tour-card-stars" title={`${h.rating || 0} / 5`}>
                                  {starBar(h.rating)}
                                </span>
                                <span className="tour-card-reviews">{h.review_count || 0} reviews</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="district-show-more">
                        <Link to="/login" className="btn-view-more">View More →</Link>
                      </div>
                    </>
                  )}
                </div>
              )
            })
          }
        </div>
      ) : (
        <>
          {/* ── Flat filtered grid ── */}
          <div className="tours-grid tours-container">
            {loading
              ? [...Array(PAGE_SIZE)].map((_, i) => <SkeletonCard key={i} />)
              : hotels.length === 0
                ? (
                  <div className="tours-empty">
                    <span>🔍</span>
                    <p>No hotels found{q ? ` for "${q}"` : ''}.</p>
                    <button className="btn-primary" onClick={() => { setQ(''); setHotelType('All'); setStarClass('All'); setPage(1) }}>Show All</button>
                  </div>
                )
                : hotels.map(h => (
                  <div className="tour-card glass-card" key={h.hotel_id}>
                    <div className="tour-card-img">
                      <img
                        src={getImage(h)}
                        alt={h.name}
                        loading="lazy"
                        onError={e => { e.target.onerror = null; e.target.src = placeholderImg }}
                      />
                      {h.hotel_type && (
                        <span className="tour-type-badge">
                          {TYPE_ICONS[h.hotel_type] || '🏨'} {h.hotel_type}
                        </span>
                      )}
                      {h.price_per_night && (
                        <span className="tour-price-badge">LKR {Number(h.price_per_night).toLocaleString()}/night</span>
                      )}
                    </div>
                    <div className="tour-card-body">
                      <h3 className="tour-card-name">{h.name}</h3>
                      {h.place?.district && (
                        <p className="tour-card-location">
                          📍 {h.place.district.name}{h.place.district.province ? `, ${h.place.district.province}` : ''}
                        </p>
                      )}
                      {h.star_class && (
                        <p className="tour-card-location">{STAR_ICONS[h.star_class] || ''} {h.star_class}-Star</p>
                      )}
                      {h.description && (
                        <p className="tour-card-desc">
                          {h.description.length > 110 ? h.description.slice(0, 110) + '…' : h.description}
                        </p>
                      )}
                      <div className="tour-card-footer">
                        <span className="tour-card-stars" title={`${h.rating || 0} / 5`}>
                          {starBar(h.rating)}
                        </span>
                        <button className="btn-small-outline" onClick={() => navigate('/login')}>
                          View Details →
                        </button>
                      </div>
                    </div>
                  </div>
                ))
            }
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && !loading && (
            <div className="tours-pagination tours-container">
              <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                ← Prev
              </button>
              {[...Array(Math.min(7, totalPages))].map((_, i) => {
                let p
                if (totalPages <= 7)             p = i + 1
                else if (page <= 4)              p = i + 1
                else if (page >= totalPages - 3) p = totalPages - 6 + i
                else                             p = page - 3 + i
                return (
                  <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>
                    {p}
                  </button>
                )
              })}
              <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next →
              </button>
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
