import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Dashboard.css'

const EXPENSE_CATS = [
  { id: 'accommodation', icon: '🏨', color: '#0E7C5F' },
  { id: 'transportation',icon: '🚗', color: '#3b82f6' },
  { id: 'food',          icon: '🍽️', color: '#f59e0b' },
  { id: 'activities',   icon: '🎯', color: '#8b5cf6' },
  { id: 'shopping',     icon: '🛍️', color: '#ec4899' },
  { id: 'entertainment',icon: '🎭', color: '#06b6d4' },
  { id: 'emergency',    icon: '🚨', color: '#ef4444' },
  { id: 'other',        icon: '📦', color: '#6b7280' },
]
const CAT_MAP_DB = Object.fromEntries(EXPENSE_CATS.map(c => [c.id, c]))

/* ── helpers ─────────────────────────────── */
function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')
}
function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function calcNights(start, end) {
  if (!start || !end) return 0
  return Math.max(0, Math.round((new Date(end) - new Date(start)) / 86400000))
}
function TGLogo() {
  return (
    <svg viewBox="0 0 32 32" fill="none" style={{ width: 28, height: 28 }}>
      <circle cx="16" cy="16" r="16" fill="#0E7C5F" />
      <path d="M8 22 L16 8 L24 22 Z" fill="white" fillOpacity=".9" />
      <circle cx="16" cy="19" r="3" fill="#F5C842" />
    </svg>
  )
}

export default function Dashboard({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [myTrips, setMyTrips] = useState([])
  const [allExpenses, setAllExpenses] = useState([])

  const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}')
  const user = {
    name:        storedUser.name        || 'Traveller',
    email:       storedUser.email       || '',
    phone:       storedUser.phone       || '',
    joinDate:    storedUser.joinDate    || 'January 2026',
    travelStyle: storedUser.travelStyle || '',
    interests:   storedUser.interests   || [],
  }

  useEffect(() => {
    const raw = localStorage.getItem('myTrips')
    const trips = raw ? JSON.parse(raw) : []
    setMyTrips(trips)

    // load local expenses across all trips
    const expenses = [
      ...(JSON.parse(localStorage.getItem('expenses_trip_standalone') || '[]')),
      ...trips.flatMap(t => {
        try { return JSON.parse(localStorage.getItem(`expenses_trip_${t.id || t._id}`) || '[]') }
        catch { return [] }
      })
    ]
    setAllExpenses(expenses)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    navigate('/login')
  }

  const totalSpent = allExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  const budgets    = (() => { try { return JSON.parse(localStorage.getItem('tripBudgets') || '{}') } catch { return {} } })()
  const totalBudget = Object.values(budgets).reduce((s, v) => s + (v || 0), 0)
  const budgetUsedPct = totalBudget ? Math.min(Math.round(totalSpent / totalBudget * 100), 100) : null

  const spendingByCategory = useMemo(() => {
    const acc = {}
    allExpenses.forEach(e => { acc[e.category] = (acc[e.category] || 0) + (e.amount || 0) })
    return EXPENSE_CATS.map(c => ({ ...c, value: acc[c.id] || 0 }))
      .filter(c => c.value > 0).sort((a, b) => b.value - a.value).slice(0, 3)
  }, [allExpenses])

  const stats = [
    { label: 'Trips Planned',   value: myTrips.length || 0,                   icon: '✈️', color: '#0E7C5F' },
    { label: 'Total Spent',     value: `$${totalSpent.toFixed(0)}`,            icon: '💸', color: '#3b82f6' },
    { label: 'Expenses Logged', value: allExpenses.length,                     icon: '🧾', color: '#F5C842' },
    { label: 'Budget Used',     value: budgetUsedPct !== null ? `${budgetUsedPct}%` : '—', icon: '📊', color: '#8b5cf6' },
  ]

  const saved = [
    { name: 'Galle Fort',    category: 'Historical', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/SL_Galle_Fort_asv2020-01_img24.jpg/960px-SL_Galle_Fort_asv2020-01_img24.jpg' },
    { name: 'Mirissa Beach', category: 'Beach',      img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Mirissa_Beach_Sri_Lanka.jpg/960px-Mirissa_Beach_Sri_Lanka.jpg' },
    { name: 'Yala Safari',   category: 'Nature',     img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Yala_National_Park_%28Sri_Lanka_2012%29.jpg/960px-Yala_National_Park_%28Sri_Lanka_2012%29.jpg' },
  ]

  const displayTrips = myTrips.length > 0 ? myTrips : [
    { id: 1, tripName: 'Ancient Heritage Tour',  destinationName: 'Sigiriya & Kandy',     destinationCity: 'Central Province', startDate: '2026-03-15', endDate: '2026-03-20', travelers: 2, travelStyle: 'Culture',    status: 'upcoming', estimatedCost: '$120–$180 / person', destinationImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Sigiriya.jpg/960px-Sigiriya.jpg' },
    { id: 2, tripName: 'Hill Country Express',   destinationName: 'Ella & Nuwara Eliya',  destinationCity: 'Badulla',          startDate: '2026-04-08', endDate: '2026-04-11', travelers: 3, travelStyle: 'Adventure', status: 'upcoming', estimatedCost: '$90–$130 / person',  destinationImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/SL_Demodara_near_Ella_asv2020-01_img02.jpg/960px-SL_Demodara_near_Ella_asv2020-01_img02.jpg' },
  ]

  return (
    <div className="db-page" data-theme={theme}>

      {/* ══ NAV ══ */}
      <nav className="dashboard-nav glass-nav">
        <div className="nav-container">
          <Link to="/" className="logo"><TGLogo /><span>TravelGenie</span></Link>

          <button className="menu-toggle" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
            <span className={`hamburger ${menuOpen ? 'open' : ''}`} />
          </button>

          <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
            <li><Link to="/plan-trip">Plan a Trip</Link></li>
            <li><Link to="/profile">Profile</Link></li>
          </ul>

          <div className="nav-actions">
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button className="btn-logout" onClick={handleLogout}>Log Out</button>
          </div>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <header className="db-hero">
        <div className="db-hero-deco" aria-hidden="true" />
        <div className="db-hero-inner">
          <div className="db-avatar">{initials(user.name) || '👤'}</div>
          <div className="db-hero-text">
            <p className="db-eyebrow">Welcome back 👋</p>
            <h1 className="db-hero-name">{user.name}</h1>
            <div className="db-hero-meta">
              {user.email && <span>{user.email}</span>}
              {user.travelStyle && <><span className="db-dot">·</span><span className="db-style-pill">{user.travelStyle} Traveller</span></>}
              <span className="db-dot">·</span>
              <span>Since {user.joinDate}</span>
            </div>
            {user.interests.length > 0 && (
              <div className="db-interests">
                {user.interests.slice(0, 6).map(i => <span key={i} className="db-interest-chip">{i}</span>)}
                {user.interests.length > 6 && <span className="db-interest-chip">+{user.interests.length - 6}</span>}
              </div>
            )}
          </div>
          <Link to="/plan-trip" className="db-hero-cta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:18,height:18}}>
              <path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            Plan a Trip
          </Link>
        </div>
      </header>

      {/* ══ BODY ══ */}
      <div className="db-body">

        {/* Stats */}
        <div className="db-stats-row">
          {stats.map((s, i) => (
            <div key={i} className="db-stat-card">
              <div className="db-stat-ico" style={{ background: `${s.color}1A` }}>{s.icon}</div>
              <div>
                <div className="db-stat-val">{s.value}</div>
                <div className="db-stat-lbl">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="db-grid">

          {/* LEFT */}
          <div className="db-left">

            {/* Upcoming Trips */}
            <section className="db-section">
              <div className="db-sec-hdr">
                <h2 className="db-sec-title">
                  <span>✈️</span> Upcoming Trips
                  <span className="db-badge">{displayTrips.length}</span>
                </h2>
                <Link to="/plan-trip" className="db-sec-link">+ New Trip</Link>
              </div>

              <div className="db-trips">
                {displayTrips.map((trip, i) => {
                  const n = calcNights(trip.startDate, trip.endDate)
                  return (
                    <div key={trip.id || i} className="db-trip-card">
                      <div className="db-trip-img">
                        <img
                          src={trip.destinationImage || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80'}
                          alt={trip.destinationName}
                          onError={e => { e.target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80' }}
                        />
                        <span className="db-status-badge">🗓 Upcoming</span>
                      </div>
                      <div className="db-trip-body">
                        <h3 className="db-trip-name">{trip.tripName}</h3>
                        <p className="db-trip-dest">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:13,height:13}}>
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                          </svg>
                          {trip.destinationName}{trip.destinationCity ? ` · ${trip.destinationCity}` : ''}
                        </p>
                        <div className="db-trip-chips">
                          {trip.startDate && <span className="db-chip">📅 {formatDate(trip.startDate)}</span>}
                          {n > 0       && <span className="db-chip">🌙 {n} nights</span>}
                          {trip.travelers && <span className="db-chip">👤 {trip.travelers}</span>}
                          {trip.travelStyle && <span className="db-chip db-chip-green">{trip.travelStyle}</span>}
                        </div>
                        {trip.estimatedCost && <p className="db-trip-cost">{trip.estimatedCost}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Saved Destinations */}
            <section className="db-section">
              <div className="db-sec-hdr">
                <h2 className="db-sec-title"><span>❤️</span> Saved Destinations</h2>
                <button className="db-sec-link">View All</button>
              </div>
              <div className="db-saved-grid">
                {saved.map((d, i) => (
                  <div key={i} className="db-saved-card">
                    <div className="db-saved-img">
                      <img src={d.img} alt={d.name} onError={e => { e.target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80' }} />
                      <button className="db-heart">❤️</button>
                    </div>
                    <div className="db-saved-body">
                      <span className="db-saved-cat">{d.category}</span>
                      <h4 className="db-saved-name">{d.name}</h4>
                      <Link to="/plan-trip" className="db-saved-cta">Explore →</Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* RIGHT sidebar */}
          <aside className="db-right">

            {/* Profile card */}
            <div className="db-profile-card">
              <div className="db-profile-av">{initials(user.name) || '👤'}</div>
              <h3 className="db-profile-name">{user.name}</h3>
              {user.travelStyle && <span className="db-profile-pill">{user.travelStyle}</span>}
              <div className="db-profile-rows">
                {user.email && (
                  <div className="db-prow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:15,height:15,flexShrink:0}}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <span>{user.email}</span>
                  </div>
                )}
                {user.phone && (
                  <div className="db-prow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:15,height:15,flexShrink:0}}>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.1 6.1l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    <span>{user.phone}</span>
                  </div>
                )}
                <div className="db-prow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:15,height:15,flexShrink:0}}>
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>Since {user.joinDate}</span>
                </div>
              </div>
              <Link to="/profile" className="db-edit-btn">Edit Profile</Link>
            </div>

            {/* Quick Actions */}
            <div className="db-quick-card">
              <h3 className="db-quick-title">Quick Actions</h3>
              <div className="db-quick-list">
                {[
                  { icon: '🗺️', bg: '#0E7C5F1A', name: 'Browse Destinations', sub: 'Find your next trip',       as: 'link', to: '/plan-trip' },
                  { icon: '💰', bg: '#3b82f61A', name: 'Track Expenses',      sub: 'Budget & spending tracker', as: 'link', to: '/expenses' },
                  { icon: '⚙️', bg: '#8b5cf61A', name: 'Account Settings',    sub: 'Manage your profile',      as: 'link', to: '/profile' },
                  { icon: '⭐', bg: '#F5C8421A', name: 'Write a Review',       sub: 'Share your experience',    as: 'div' },
                ].map((item, i) => {
                  const inner = (
                    <>
                      <span className="db-qi-ico" style={{ background: item.bg }}>{item.icon}</span>
                      <div className="db-qi-text">
                        <p className="db-qi-name">{item.name}</p>
                        <p className="db-qi-sub">{item.sub}</p>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:16,height:16,flexShrink:0,color:'#CBD5E1'}}>
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </>
                  )
                  return item.as === 'link'
                    ? <Link key={i} to={item.to} className="db-qi">{inner}</Link>
                    : <div key={i} className="db-qi">{inner}</div>
                })}
              </div>
            </div>

            {/* Spending Summary Widget */}
            <div className="db-expense-widget">
              <div className="db-ew-header">
                <h3 className="db-ew-title">💸 Spending Summary</h3>
                <Link to="/expenses" className="db-ew-link">View All →</Link>
              </div>

              {allExpenses.length === 0 ? (
                <div className="db-ew-empty">
                  <p>No expenses recorded yet.</p>
                  <Link to="/expenses" className="db-ew-cta">+ Add your first expense</Link>
                </div>
              ) : (
                <>
                  <div className="db-ew-total">
                    <span className="db-ew-amt">${totalSpent.toFixed(2)}</span>
                    <span className="db-ew-lbl">total spent</span>
                  </div>

                  {totalBudget > 0 && (
                    <div className="db-ew-budget-bar">
                      <div className="db-ew-bar-track">
                        <div
                          className={`db-ew-bar-fill${budgetUsedPct >= 100 ? ' over' : budgetUsedPct >= 90 ? ' warn' : ''}`}
                          style={{ width: `${budgetUsedPct}%` }}
                        />
                      </div>
                      <span className="db-ew-bar-pct">{budgetUsedPct}% of ${totalBudget.toFixed(0)} budget</span>
                    </div>
                  )}

                  <div className="db-ew-cats">
                    {spendingByCategory.map(c => (
                      <div key={c.id} className="db-ew-cat-row">
                        <span className="db-ew-cat-icon">{c.icon}</span>
                        <div className="db-ew-cat-bar">
                          <div
                            className="db-ew-cat-fill"
                            style={{
                              width: `${Math.round(c.value / totalSpent * 100)}%`,
                              background: c.color
                            }}
                          />
                        </div>
                        <span className="db-ew-cat-amt">${c.value.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>

                  <Link to="/expenses" className="db-ew-manage-btn">Manage Expenses</Link>
                </>
              )}
            </div>

            {/* Nudge */}
            <div className="db-nudge">
              <span className="db-nudge-icon">🌴</span>
              <h4>Plan Your Next Journey</h4>
              <p>50+ hand-picked Sri Lankan destinations await.</p>
              <Link to="/plan-trip" className="db-nudge-btn">Explore Now</Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
