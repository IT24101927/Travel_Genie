import { useState, useEffect, useCallback } from 'react'
import { clearUserData } from '../../utils/clearUserData'
import { API_BASE } from '../../config/api'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import './AdminDashboard.css'
import DestinationManagement from './DestinationManagement'
import DistrictManagement from './DistrictManagement'
import TripItineraryManagement from './TripItineraryManagement'
import HotelManagement from './HotelManagement'
import ExpenseManagement from './ExpenseManagement'
import ReviewManagement from './ReviewManagement'
import UserManagement from './UserManagement'

const getUserDisplayName = (user) => {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
  return fullName || user?.name || 'Admin'
}

const toAbsoluteAssetUrl = (value) => {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  const normalizedBase = API_BASE.replace(/\/api\/?$/, '')
  const normalizedPath = value.startsWith('/') ? value : `/${value}`
  return `${normalizedBase}${normalizedPath}`
}

const getReviewId = (review) => review?.review_id || review?.id

function AdminDashboard({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const VALID_SECTIONS = ['overview','users','districts','destinations','hotels','tours','expenses','reviews']
  const sectionParam = searchParams.get('section')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeSection, setActiveSection] = useState(
    VALID_SECTIONS.includes(sectionParam) ? sectionParam : 'overview'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [recentUsers, setRecentUsers] = useState([])
  const [recentReviews, setRecentReviews] = useState([])

  // Auth guard
  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}')
    if (!token) { navigate('/login', { replace: true }); return }
    if (user.role !== 'admin') { navigate('/dashboard', { replace: true }) }
  }, [navigate])

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const API = API_BASE
  const authH = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  }), [])

  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}')

  const [dashboardStats, setDashboardStats] = useState([
    { title: 'Total Users', value: '…', icon: '👥', color: '#6366f1', bg: 'linear-gradient(135deg, #6366f1, #818cf8)' },
    { title: 'Total Trips', value: '…', icon: '🗺️', color: '#10b981', bg: 'linear-gradient(135deg, #10b981, #34d399)' },
    { title: 'Destinations', value: '…', icon: '📍', color: '#f59e0b', bg: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
    { title: 'Total Reviews', value: '…', icon: '⭐', color: '#ec4899', bg: 'linear-gradient(135deg, #ec4899, #f472b6)' },
  ])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, tripsRes, destsRes, reviewsRes] = await Promise.all([
          fetch(`${API}/users?limit=1`, { headers: authH() }),
          fetch(`${API}/trips/all?limit=1`, { headers: authH() }),
          fetch(`${API}/destinations?limit=1`, { headers: authH() }),
          fetch(`${API}/reviews/admin/all?limit=1`, { headers: authH() }),
        ])
        const [users, trips, dests, reviews] = await Promise.all([
          usersRes.json(), tripsRes.json(), destsRes.json(), reviewsRes.json()
        ])
        setDashboardStats([
          { title: 'Total Users', value: (users.total ?? users.count ?? '—').toLocaleString(), icon: '👥', color: '#6366f1', bg: 'linear-gradient(135deg, #6366f1, #818cf8)' },
          { title: 'Total Trips', value: (trips.total ?? trips.count ?? '—').toLocaleString(), icon: '🗺️', color: '#10b981', bg: 'linear-gradient(135deg, #10b981, #34d399)' },
          { title: 'Destinations', value: (dests.total ?? dests.count ?? '—').toLocaleString(), icon: '📍', color: '#f59e0b', bg: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
          { title: 'Total Reviews', value: (reviews.total ?? reviews.count ?? '—').toLocaleString(), icon: '⭐', color: '#ec4899', bg: 'linear-gradient(135deg, #ec4899, #f472b6)' },
        ])
      } catch {
        // Stats remain at '…' if fetch fails
      }
    }
    fetchStats()
  }, [API, authH])

  // Fetch real recent users
  useEffect(() => {
    const fetchRecentUsers = async () => {
      try {
        const res = await fetch(`${API}/users?limit=5`, { headers: authH() })
        const data = await res.json()
        if (data.data) setRecentUsers(data.data.slice(0, 5))
      } catch { /* ignore */ }
    }
    fetchRecentUsers()
  }, [API, authH])

  // Fetch real recent reviews
  useEffect(() => {
    const fetchRecentReviews = async () => {
      try {
        const res = await fetch(`${API}/reviews/admin/all?limit=5`, { headers: authH() })
        const data = await res.json()
        if (data.data) setRecentReviews(data.data.slice(0, 5))
      } catch { /* ignore */ }
    }
    fetchRecentReviews()
  }, [API, authH])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    clearUserData()
    navigate('/')
  }

  const menuItems = [
    { id: 'overview', icon: '📊', label: 'Dashboard' },
    { id: 'users', icon: '👥', label: 'Users' },
    { id: 'districts', icon: '🗺️', label: 'Districts' },
    { id: 'destinations', icon: '📍', label: 'Destinations' },
    { id: 'hotels', icon: '🏨', label: 'Hotels' },
    { id: 'tours', icon: '📅', label: 'Itineraries' },
    { id: 'expenses', icon: '💰', label: 'Expenses' },
    { id: 'reviews', icon: '⭐', label: 'Reviews' },
  ]

  const quickActions = [
    { id: 'users', icon: '👥', label: 'Manage Users', desc: 'View & manage all users', accent: '#6366f1' },
    { id: 'destinations', icon: '📍', label: 'Destinations', desc: 'Add & edit destinations', accent: '#10b981' },
    { id: 'districts', icon: '🗺️', label: 'Districts', desc: 'Manage districts & provinces', accent: '#0ea5e9' },
    { id: 'tours', icon: '📅', label: 'Itineraries', desc: 'Manage full itinerary details', accent: '#f59e0b' },
    { id: 'hotels', icon: '🏨', label: 'Hotels', desc: 'Manage hotel listings', accent: '#8b5cf6' },
    { id: 'expenses', icon: '💰', label: 'Expenses', desc: 'Track & manage expenses', accent: '#ef4444' },
    { id: 'reviews', icon: '⭐', label: 'Reviews', desc: 'Monitor user feedback', accent: '#ec4899' },
  ]

  const greeting = () => {
    const h = currentTime.getHours()
    if (h < 12) return 'Good Morning'
    if (h < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const filteredMenu = searchQuery
    ? menuItems.filter(m => m.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : menuItems

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* ── Sidebar ── */}
      <aside className={`ad-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="ad-sidebar-top">
          <button className="ad-brand" onClick={handleLogout} title="Sign out & go home" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', width: '100%' }}>
            <span className="ad-brand-icon">✈</span>
            {!sidebarCollapsed && (
              <span className="ad-brand-info">
                <span className="ad-brand-text">Travel<strong>Genie</strong></span>
                <span className="ad-brand-badge">Admin Panel</span>
              </span>
            )}
          </button>
          <button
            className="ad-collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            // title removed to strictly control visibility via CSS/UI
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {sidebarCollapsed
                ? <><line x1="3" y1="12" x2="21" y2="12"/><polyline points="15 6 21 12 15 18"/></>
                : <><line x1="21" y1="12" x2="3" y2="12"/><polyline points="9 18 3 12 9 6"/></>
              }
            </svg>
          </button>
        </div>

        {!sidebarCollapsed && (
          <div className="ad-sidebar-search" style={{ display: 'none' }}>
            {/* Search removed as requested */}
          </div>
        )}

        <nav className="ad-nav">
          <span className="ad-nav-group-label">{!sidebarCollapsed && 'MAIN MENU'}</span>
          {filteredMenu.map(item => (
            <button
              key={item.id}
              className={`ad-nav-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => { setActiveSection(item.id); setSearchQuery(''); setSearchParams({ section: item.id }) }}
              title={item.label}
            >
              <span className="ad-nav-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="ad-nav-label">{item.label}</span>}
              {!sidebarCollapsed && activeSection === item.id && <span className="ad-nav-active-dot" />}
            </button>
          ))}
        </nav>

        <div className="ad-sidebar-bottom">
          <button className="ad-nav-item ad-logout-btn" onClick={handleLogout} title="Logout">
            <span className="ad-nav-icon">🚪</span>
            {!sidebarCollapsed && <span className="ad-nav-label">Logout</span>}
          </button>
          {!sidebarCollapsed && (
            <div className="ad-sidebar-user">
              <div className="ad-sidebar-avatar-wrap">
                <div className="ad-sidebar-avatar">
                  {(getUserDisplayName(currentUser)[0] || 'A').toUpperCase()}
                </div>
                <span className="ad-sidebar-online-dot" />
              </div>
              <div className="ad-sidebar-user-info">
                <span className="ad-sidebar-user-name">{getUserDisplayName(currentUser)}</span>
                <span className="ad-sidebar-user-role">Administrator</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="ad-main">
        {/* Top bar */}
        <header className="ad-topbar">
          <div className="ad-topbar-left">
            <h1 className="ad-page-title">
              {menuItems.find(m => m.id === activeSection)?.icon}{' '}
              {activeSection === 'overview' ? 'Dashboard' : menuItems.find(m => m.id === activeSection)?.label}
            </h1>
          </div>
          <div className="ad-topbar-right">
            <div className="ad-topbar-time">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} &bull; {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <button className="ad-topbar-icon-btn" onClick={toggleTheme} title="Toggle theme">
              {theme === 'light' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              )}
            </button>
            <div className="ad-topbar-profile">
              <div className="ad-topbar-avatar">
                {(getUserDisplayName(currentUser)[0] || 'A').toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="ad-content">
          {activeSection === 'overview' && (
            <div className="ad-overview">
              {/* Welcome Banner */}
              <section className="ad-welcome-banner">
                <div className="ad-welcome-text">
                  <h2>{greeting()}, {getUserDisplayName(currentUser)} 👋</h2>
                  <p>Here's what's happening with TravelGenie today.</p>
                </div>
                <div className="ad-welcome-decoration">
                  <div className="ad-welcome-orb orb-1" />
                  <div className="ad-welcome-orb orb-2" />
                  <div className="ad-welcome-orb orb-3" />
                </div>
              </section>

              {/* Stats */}
              <section className="ad-stats-row">
                {dashboardStats.map((stat, i) => (
                  <div key={i} className="ad-stat-card">
                    <div className="ad-stat-icon-wrap" style={{ background: stat.bg }}>
                      <span>{stat.icon}</span>
                    </div>
                    <div className="ad-stat-info">
                      <span className="ad-stat-label">{stat.title}</span>
                      <span className="ad-stat-value">{stat.value}</span>
                    </div>
                  </div>
                ))}
              </section>

              {/* Quick Actions */}
              <section className="ad-section">
                <div className="ad-section-header">
                  <h3>Quick Actions</h3>
                  <span className="ad-section-subtitle">Jump to any module</span>
                </div>
                <div className="ad-quick-grid">
                  {quickActions.map(a => (
                    <button
                      key={a.id}
                      className="ad-quick-card"
                      onClick={() => { setActiveSection(a.id); setSearchParams({ section: a.id }) }}
                    >
                      <span className="ad-quick-icon" style={{ background: `${a.accent}18`, color: a.accent }}>{a.icon}</span>
                      <span className="ad-quick-label">{a.label}</span>
                      <span className="ad-quick-desc">{a.desc}</span>
                      <span className="ad-quick-arrow" style={{ color: a.accent }}>→</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Two-column: Recent Users + Recent Reviews */}
              <div className="ad-two-col">
                <section className="ad-section ad-card">
                  <div className="ad-section-header">
                    <h3>👥 Recent Users</h3>
                    <button className="ad-link-btn" onClick={() => { setActiveSection('users'); setSearchParams({ section: 'users' }) }}>View all →</button>
                  </div>
                  <div className="ad-user-list">
                    {recentUsers.length === 0 && <p className="ad-empty">No users found</p>}
                    {recentUsers.map(u => (
                      <div key={u.id} className="ad-user-row">
                        <div className="ad-user-avatar-sm">
                          {u.avatar ? (
                            <img src={toAbsoluteAssetUrl(u.avatar)} alt="" />
                          ) : (
                            <span>{(getUserDisplayName(u)[0] || '?').toUpperCase()}</span>
                          )}
                        </div>
                        <div className="ad-user-meta">
                          <span className="ad-user-name">{getUserDisplayName(u)}</span>
                          <span className="ad-user-email">{u.email}</span>
                        </div>
                        <span className={`ad-badge ${u.role === 'admin' ? 'admin' : 'user'}`}>
                          {u.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="ad-section ad-card">
                  <div className="ad-section-header">
                    <h3>⭐ Recent Reviews</h3>
                    <button className="ad-link-btn" onClick={() => { setActiveSection('reviews'); setSearchParams({ section: 'reviews' }) }}>View all →</button>
                  </div>
                  <div className="ad-review-list">
                    {recentReviews.length === 0 && <p className="ad-empty">No reviews yet</p>}
                    {recentReviews.map(r => (
                      <div key={getReviewId(r)} className="ad-review-row">
                        <div className="ad-review-stars">
                          {'★'.repeat(r.rating || 0)}{'☆'.repeat(5 - (r.rating || 0))}
                        </div>
                        {r.title && <p className="ad-review-title"><strong>{r.title}</strong></p>}
                        <p className="ad-review-comment">{r.comment ? `${r.comment.slice(0, 80)}${r.comment.length > 80 ? '…' : ''}` : 'No review comment'}</p>
                        <span className="ad-review-author">
                          {r.user?.name || 'Anonymous'} &bull; {r.place?.name || ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* System Info */}
              <section className="ad-section ad-card ad-system-info">
                <div className="ad-section-header">
                  <h3>🖥 System Info</h3>
                </div>
                <div className="ad-system-grid">
                  <div className="ad-system-item">
                    <span className="ad-system-dot green" />
                    <span>API Server</span>
                    <span className="ad-system-val">Running</span>
                  </div>
                  <div className="ad-system-item">
                    <span className="ad-system-dot green" />
                    <span>Database</span>
                    <span className="ad-system-val">Connected</span>
                  </div>
                  <div className="ad-system-item">
                    <span className="ad-system-dot blue" />
                    <span>Version</span>
                    <span className="ad-system-val">1.0.0</span>
                  </div>
                  <div className="ad-system-item">
                    <span className="ad-system-dot blue" />
                    <span>Environment</span>
                    <span className="ad-system-val">Development</span>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeSection === 'destinations' && <DestinationManagement theme={theme} toggleTheme={toggleTheme} />}
          {activeSection === 'districts' && <DistrictManagement theme={theme} toggleTheme={toggleTheme} />}
          {activeSection === 'tours' && <TripItineraryManagement theme={theme} toggleTheme={toggleTheme} />}
          {activeSection === 'hotels' && <HotelManagement theme={theme} toggleTheme={toggleTheme} />}
          {activeSection === 'expenses' && <ExpenseManagement theme={theme} toggleTheme={toggleTheme} />}
          {activeSection === 'reviews' && <ReviewManagement theme={theme} toggleTheme={toggleTheme} />}
          {activeSection === 'users' && <UserManagement theme={theme} toggleTheme={toggleTheme} />}
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard
