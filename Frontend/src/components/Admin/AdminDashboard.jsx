import { useState, useEffect, useCallback } from 'react'
import { clearUserData } from '../../utils/clearUserData'
import { API_BASE } from '../../config/api'
import { Link, useNavigate } from 'react-router-dom'
import './AdminDashboard.css'
import DestinationManagement from './DestinationManagement'
import DistrictManagement from './DistrictManagement'
import TripItineraryManagement from './TripItineraryManagement'
import HotelManagement from './HotelManagement'
import ExpenseManagement from './ExpenseManagement'
import ReviewManagement from './ReviewManagement'
import UserManagement from './UserManagement'
import AiMonitorPanel from './AiMonitorPanel'

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')
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

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('currentUser') || '{}') } catch { return {} } })()

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
        if (Array.isArray(data.data)) setRecentUsers(data.data.slice(0, 5))
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
        if (Array.isArray(data.data)) setRecentReviews(data.data.slice(0, 5))
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
    { id: 'ai-monitor', icon: '🤖', label: 'AI Monitor' },
    { id: 'users', icon: '👥', label: 'Users' },
    { id: 'districts', icon: '🗺️', label: 'Districts' },
    { id: 'destinations', icon: '📍', label: 'Destinations' },
    { id: 'hotels', icon: '🏨', label: 'Hotels' },
    { id: 'tours', icon: '📅', label: 'Itineraries' },
    { id: 'expenses', icon: '💰', label: 'Expenses' },
    { id: 'reviews', icon: '⭐', label: 'Reviews' },
  ]

  const quickActions = [
    { id: 'ai-monitor', icon: '🤖', label: 'AI Monitor', desc: 'Track AI availability & usage', accent: '#14b8a6' },
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
      {/* ── Mobile sidebar overlay ── */}
      {mobileSidebarOpen && (
        <div className="adm-sidebar-overlay" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`adm-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="adm-sidebar-top">
          <button className="adm-brand" onClick={handleLogout} title="Sign out & go home" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', width: '100%' }}>
            <span className="adm-brand-icon">✈</span>
            {(!sidebarCollapsed || mobileSidebarOpen) && (
              <span className="adm-brand-info">
                <span className="adm-brand-text">Travel<strong>Genie</strong></span>
                <span className="adm-brand-badge">Admin Panel</span>
              </span>
            )}
          </button>
          <button
            className="adm-collapse-btn"
            onClick={() => mobileSidebarOpen ? setMobileSidebarOpen(false) : setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={mobileSidebarOpen ? 'Close sidebar' : (sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {/* On mobile: always show ← to close. On desktop: show direction based on collapsed state */}
              {(!mobileSidebarOpen && sidebarCollapsed)
                ? <><line x1="3" y1="12" x2="21" y2="12"/><polyline points="15 6 21 12 15 18"/></>
                : <><line x1="21" y1="12" x2="3" y2="12"/><polyline points="9 18 3 12 9 6"/></>
              }
            </svg>
          </button>
        </div>

        {(!sidebarCollapsed || mobileSidebarOpen) && (
          <div className="adm-sidebar-search" style={{ display: 'none' }}>
            {/* Search removed as requested */}
          </div>
        )}

        <nav className="adm-nav">
          <span className="adm-nav-group-label">{(!sidebarCollapsed || mobileSidebarOpen) && 'MAIN MENU'}</span>
          {filteredMenu.map(item => (
            <button
              key={item.id}
              className={`adm-nav-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => { setActiveSection(item.id); setSearchQuery(''); setMobileSidebarOpen(false) }}
              title={item.label}
            >
              <span className="adm-nav-icon">{item.icon}</span>
              {(!sidebarCollapsed || mobileSidebarOpen) && <span className="adm-nav-label">{item.label}</span>}
              {(!sidebarCollapsed || mobileSidebarOpen) && activeSection === item.id && <span className="adm-nav-active-dot" />}
            </button>
          ))}
        </nav>

        <div className="adm-sidebar-bottom">
          <button className="adm-nav-item adm-logout-btn" onClick={handleLogout} title="Logout">
            <span className="adm-nav-icon">🚪</span>
            {(!sidebarCollapsed || mobileSidebarOpen) && <span className="adm-nav-label">Logout</span>}
          </button>
          {(!sidebarCollapsed || mobileSidebarOpen) && (
            <div className="adm-sidebar-user">
              <div className="adm-sidebar-avatar-wrap">
                <div className="adm-sidebar-avatar">
                  {(getUserDisplayName(currentUser)[0] || 'A').toUpperCase()}
                </div>
                <span className="adm-sidebar-online-dot" />
              </div>
              <div className="adm-sidebar-user-info">
                <span className="adm-sidebar-user-name">{getUserDisplayName(currentUser)}</span>
                <span className="adm-sidebar-user-role">Administrator</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="adm-main">
        {/* Top bar */}
        <header className="adm-topbar">
          <div className="adm-topbar-left">
            <button
              className="adm-mobile-menu-btn"
              onClick={() => setMobileSidebarOpen(o => !o)}
              aria-label="Toggle sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {mobileSidebarOpen
                  ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                  : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
                }
              </svg>
            </button>
            <h1 className="adm-page-title">
              {menuItems.find(m => m.id === activeSection)?.icon}{' '}
              {activeSection === 'overview' ? 'Dashboard' : menuItems.find(m => m.id === activeSection)?.label}
            </h1>
          </div>
          <div className="adm-topbar-right">
            <div className="adm-topbar-time">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} &bull; {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <button className="adm-topbar-icon-btn" onClick={toggleTheme} title="Toggle theme">
              {theme === 'light' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              )}
            </button>
            <button className="adm-topbar-icon-btn adm-topbar-logout-mobile" onClick={handleLogout} title="Logout">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
            <div className="adm-topbar-profile">
              <div className="adm-topbar-avatar">
                {(getUserDisplayName(currentUser)[0] || 'A').toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="adm-content">
          {activeSection === 'overview' && (
            <div className="adm-overview">
              {/* Welcome Banner */}
              <section className="adm-welcome-banner">
                <div className="adm-welcome-text">
                  <h2>{greeting()}, {getUserDisplayName(currentUser)} 👋</h2>
                  <p>Here's what's happening with TravelGenie today.</p>
                </div>
                <div className="adm-welcome-decoration">
                  <div className="adm-welcome-orb orb-1" />
                  <div className="adm-welcome-orb orb-2" />
                  <div className="adm-welcome-orb orb-3" />
                </div>
              </section>

              {/* Stats */}
              <section className="adm-stats-row">
                {dashboardStats.map((stat, i) => (
                  <div key={i} className="adm-stat-card">
                    <div className="adm-stat-icon-wrap" style={{ background: stat.bg }}>
                      <span>{stat.icon}</span>
                    </div>
                    <div className="adm-stat-info">
                      <span className="adm-stat-label">{stat.title}</span>
                      <span className="adm-stat-value">{stat.value}</span>
                    </div>
                  </div>
                ))}
              </section>

              {/* Quick Actions */}
              <section className="adm-section">
                <div className="adm-section-header">
                  <h3>Quick Actions</h3>
                  <span className="adm-section-subtitle">Jump to any module</span>
                </div>
                <div className="adm-quick-grid">
                  {quickActions.map(a => (
                    <button
                      key={a.id}
                      className="adm-quick-card"
                      onClick={() => { setActiveSection(a.id) }}
                    >
                      <span className="adm-quick-icon" style={{ background: `${a.accent}18`, color: a.accent }}>{a.icon}</span>
                      <span className="adm-quick-label">{a.label}</span>
                      <span className="adm-quick-desc">{a.desc}</span>
                      <span className="adm-quick-arrow" style={{ color: a.accent }}>→</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Two-column: Recent Users + Recent Reviews */}
              <div className="adm-two-col">
                <section className="adm-section adm-card">
                  <div className="adm-section-header">
                    <h3>👥 Recent Users</h3>
                    <button className="adm-link-btn" onClick={() => { setActiveSection('users') }}>View all →</button>
                  </div>
                  <div className="adm-user-list">
                    {recentUsers.length === 0 && <p className="adm-empty">No users found</p>}
                    {recentUsers.map(u => (
                      <div key={u.id} className="adm-user-row">
                        <div className="adm-user-avatar-sm">
                          {u.avatar ? (
                            <img src={toAbsoluteAssetUrl(u.avatar)} alt="" />
                          ) : (
                            <span>{(getUserDisplayName(u)[0] || '?').toUpperCase()}</span>
                          )}
                        </div>
                        <div className="adm-user-meta">
                          <span className="adm-user-name">{getUserDisplayName(u)}</span>
                          <span className="adm-user-email">{u.email}</span>
                        </div>
                        <span className={`adm-badge ${u.role === 'admin' ? 'admin' : 'user'}`}>
                          {u.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="adm-section adm-card">
                  <div className="adm-section-header">
                    <h3>⭐ Recent Reviews</h3>
                    <button className="adm-link-btn" onClick={() => { setActiveSection('reviews') }}>View all →</button>
                  </div>
                  <div className="adm-review-list">
                    {recentReviews.length === 0 && <p className="adm-empty">No reviews yet</p>}
                    {recentReviews.map(r => (
                      <div key={getReviewId(r)} className="adm-review-row">
                        <div className="adm-review-stars">
                          {'★'.repeat(Math.min(5, Math.max(0, Math.floor(r.rating || 0))))}{'☆'.repeat(Math.min(5, Math.max(0, 5 - Math.floor(r.rating || 0))))}
                        </div>
                        {r.title && <p className="adm-review-title"><strong>{r.title}</strong></p>}
                        <p className="adm-review-comment">{r.comment ? `${r.comment.slice(0, 80)}${r.comment.length > 80 ? '…' : ''}` : 'No review comment'}</p>
                        <span className="adm-review-author">
                          {r.user?.name || 'Anonymous'} &bull; {r.place?.name || ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* System Info */}
              <section className="adm-section adm-card adm-system-info">
                <div className="adm-section-header">
                  <h3>🖥 System Info</h3>
                </div>
                <div className="adm-system-grid">
                  <div className="adm-system-item">
                    <span className="adm-system-dot green" />
                    <span>API Server</span>
                    <span className="adm-system-val">Running</span>
                  </div>
                  <div className="adm-system-item">
                    <span className="adm-system-dot green" />
                    <span>Database</span>
                    <span className="adm-system-val">Connected</span>
                  </div>
                  <div className="adm-system-item">
                    <span className="adm-system-dot blue" />
                    <span>Version</span>
                    <span className="adm-system-val">1.0.0</span>
                  </div>
                  <div className="adm-system-item">
                    <span className="adm-system-dot blue" />
                    <span>Environment</span>
                    <span className="adm-system-val">Development</span>
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
          {activeSection === 'ai-monitor' && <AiMonitorPanel />}
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard
