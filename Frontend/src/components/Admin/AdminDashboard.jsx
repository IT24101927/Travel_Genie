import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './AdminDashboard.css'
import DestinationManagement from './DestinationManagement'
import TripItineraryManagement from './TripItineraryManagement'
import HotelManagement from './HotelManagement'
import ExpenseManagement from './ExpenseManagement'
import ReviewManagement from './ReviewManagement'
import UserManagement from './UserManagement'

function AdminDashboard({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')

  // Auth guard — only allow logged-in admin users
  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}')
    if (!token || user.role !== 'admin') {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  const API = 'http://localhost:5000/api'
  const authH = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  })

  const [dashboardStats, setDashboardStats] = useState([
    { title: 'Total Users', value: '…', change: '', trend: 'up', icon: '👥', color: 'var(--primary)' },
    { title: 'Total Trips', value: '…', change: '', trend: 'up', icon: '🗺️', color: 'var(--success)' },
    { title: 'Destinations', value: '…', change: '', trend: 'up', icon: '📍', color: 'var(--warning)' },
    { title: 'Total Reviews', value: '…', change: '', trend: 'up', icon: '⭐', color: '#FFC107' },
  ])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, tripsRes, destsRes, reviewsRes] = await Promise.all([
          fetch(`${API}/users?limit=1`, { headers: authH() }),
          fetch(`${API}/trips/admin/all?limit=1`, { headers: authH() }),
          fetch(`${API}/destinations?limit=1`, { headers: authH() }),
          fetch(`${API}/reviews/admin/all?limit=1`, { headers: authH() }),
        ])
        const [users, trips, dests, reviews] = await Promise.all([
          usersRes.json(), tripsRes.json(), destsRes.json(), reviewsRes.json()
        ])
        setDashboardStats([
          { title: 'Total Users', value: (users.total ?? users.count ?? '—').toLocaleString(), change: '', trend: 'up', icon: '👥', color: 'var(--primary)' },
          { title: 'Total Trips', value: (trips.total ?? trips.count ?? '—').toLocaleString(), change: '', trend: 'up', icon: '🗺️', color: 'var(--success)' },
          { title: 'Destinations', value: (dests.total ?? dests.count ?? '—').toLocaleString(), change: '', trend: 'up', icon: '📍', color: 'var(--warning)' },
          { title: 'Total Reviews', value: (reviews.total ?? reviews.count ?? '—').toLocaleString(), change: '', trend: 'up', icon: '⭐', color: '#FFC107' },
        ])
      } catch {
        // Stats remain at '…' if fetch fails
      }
    }
    fetchStats()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    navigate('/login')
  }

  const quickActions = [
    { id: 'users', icon: '👥', label: 'Manage Users', description: 'Add, edit, or remove users', color: 'var(--primary)' },
    { id: 'destinations', icon: '📍', label: 'Add Destination', description: 'Create new destination', color: 'var(--success)' },
    { id: 'tours', icon: '🗺️', label: 'Create Itinerary', description: 'Plan new trip itinerary', color: 'var(--warning)' },
    { id: 'reviews', icon: '⭐', label: 'Review Feedback', description: 'Check recent reviews', color: '#FFC107' }
  ]

  const recentActivity = [
    { id: 1, type: 'user', action: 'New user registered', user: 'Alice Cooper', time: '5 mins ago', icon: '👥' },
    { id: 2, type: 'booking', action: 'New booking created', user: 'John Doe', time: '12 mins ago', icon: '📅' },
    { id: 3, type: 'review', action: 'New review submitted', user: 'Sarah Wilson', time: '25 mins ago', icon: '⭐' },
    { id: 4, type: 'destination', action: 'Destination updated', user: 'Admin', time: '1 hour ago', icon: '📍' },
    { id: 5, type: 'expense', action: 'Expense report generated', user: 'Admin', time: '2 hours ago', icon: '💰' }
  ]

  const topTours = [
    { name: 'Ancient Heritage Tour', bookings: 145, revenue: '$50,750', rating: 4.8 },
    { name: 'Southern Coast Escape', bookings: 132, revenue: '$36,960', rating: 4.7 },
    { name: 'Hill Country Express', bookings: 98, revenue: '$21,560', rating: 4.9 },
    { name: 'Wildlife Safari', bookings: 87, revenue: '$34,800', rating: 4.6 }
  ]

  const menuItems = [
    { id: 'overview', icon: '📊', label: 'Dashboard' },
    { id: 'users', icon: '👥', label: 'Users' },
    { id: 'destinations', icon: '📍', label: 'Destinations' },
    { id: 'tours', icon: '🗺️', label: 'Itineraries' },
    { id: 'hotels', icon: '🏨', label: 'Hotels' },
    { id: 'expenses', icon: '💰', label: 'Expenses' },
    { id: 'reviews', icon: '⭐', label: 'Reviews' }
  ]

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="admin-logo">
            {!sidebarCollapsed && (
              <>
                <span className="logo-text">Travel<span>Genie</span></span>
                <span className="admin-badge">Admin</span>
              </>
            )}
            {sidebarCollapsed && <span className="logo-icon">TG</span>}
          </Link>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand' : 'Collapse'}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => setActiveSection(item.id)}
              title={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item" onClick={handleLogout} title="Logout">
            <span className="nav-icon">🚪</span>
            {!sidebarCollapsed && <span className="nav-label">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {/* Top Bar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <h1 className="page-title">
              {activeSection === 'overview' ? 'Dashboard' : (menuItems.find(item => item.id === activeSection)?.label || 'Dashboard')}
            </h1>
            <p className="page-subtitle">Welcome back, Admin</p>
          </div>
          <div className="topbar-right">
            <button className="topbar-btn" title="Notifications">
              🔔
              <span className="notification-badge">5</span>
            </button>
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <div className="admin-profile">
              <span className="profile-avatar">👤</span>
              <div className="profile-info">
                <span className="profile-name">Admin User</span>
                <span className="profile-role">Administrator</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="admin-content">
          {activeSection === 'overview' && (
            <>
              {/* Stats Grid */}
              <section className="stats-section">
                <div className="stats-grid-admin">
                  {dashboardStats.map((stat, index) => (
                    <div key={index} className="stat-card-admin glass-card">
                      <div className="stat-header">
                        <span className="stat-icon-admin" style={{ background: `${stat.color}15`, color: stat.color }}>
                          {stat.icon}
                        </span>
                        <span className={`stat-trend ${stat.trend}`}>
                          {stat.trend === 'up' ? '↑' : '↓'} {stat.change}
                        </span>
                      </div>
                      <h3 className="stat-title">{stat.title}</h3>
                      <p className="stat-value-admin">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Quick Actions */}
              <section className="quick-actions-section">
                <h2 className="section-title">Quick Actions</h2>
                <div className="quick-actions-grid">
                  {quickActions.map((action) => (
                    <div 
                      key={action.id} 
                      className="quick-action-card glass-card"
                      onClick={() => setActiveSection(action.id)}
                    >
                      <span className="action-icon" style={{ background: `${action.color}15`, color: action.color }}>
                        {action.icon}
                      </span>
                      <h3 className="action-label">{action.label}</h3>
                      <p className="action-description">{action.description}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Recent Activity */}
              <section className="recent-activity-section">
                <div className="activity-header">
                  <h2 className="section-title">Recent Activity</h2>
                  <p className="section-subtitle">Latest system updates and actions</p>
                </div>
                <div className="activity-list glass-card">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="activity-item">
                      <span className="activity-icon">{activity.icon}</span>
                      <div className="activity-details">
                        <p className="activity-action">{activity.action}</p>
                        <p className="activity-meta">by <strong>{activity.user}</strong> • {activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Top Performing */}
              <section className="top-performing-section">
                <h2 className="section-title">Top Performing Tours</h2>
                <div className="top-tours-grid">
                  {topTours.map((tour, index) => (
                    <div key={index} className="tour-card glass-card">
                      <div className="tour-rank-badge">#{index + 1}</div>
                      <h3 className="tour-card-name">{tour.name}</h3>
                      <div className="tour-card-stats">
                        <div className="stat-item">
                          <span className="stat-label">Bookings</span>
                          <span className="stat-number">{tour.bookings}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Revenue</span>
                          <span className="stat-number">{tour.revenue}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Rating</span>
                          <span className="stat-number">⭐ {tour.rating}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {activeSection === 'destinations' && (
            <DestinationManagement theme={theme} toggleTheme={toggleTheme} />
          )}

          {activeSection === 'tours' && (
            <TripItineraryManagement theme={theme} toggleTheme={toggleTheme} />
          )}

          {activeSection === 'hotels' && (
            <HotelManagement theme={theme} toggleTheme={toggleTheme} />
          )}

          {activeSection === 'expenses' && (
            <ExpenseManagement theme={theme} toggleTheme={toggleTheme} />
          )}

          {activeSection === 'reviews' && (
            <ReviewManagement theme={theme} toggleTheme={toggleTheme} />
          )}

          {activeSection === 'users' && (
            <UserManagement theme={theme} toggleTheme={toggleTheme} />
          )}
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard
