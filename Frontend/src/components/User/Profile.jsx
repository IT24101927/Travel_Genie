import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Profile.css'

function Profile({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const showSaved = (msg = 'Changes saved!') => {
    setSaveMsg(msg)
    setTimeout(() => setSaveMsg(''), 3000)
  }

  // Load user from localStorage (written on signup/login)
  const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}')
  const [userData, setUserData] = useState({
    fullName: storedUser.name || '',
    email: storedUser.email || '',
    phone: storedUser.phone || '',
    dateOfBirth: storedUser.dateOfBirth || '',
    nic: storedUser.nic || '',
    travelStyle: storedUser.travelStyle || '',
    interests: storedUser.interests || [],
    joinDate: storedUser.joinDate || '',
    avatar: '👤'
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    promotionalEmails: true,
    newsletterSubscription: true,
    language: 'en',
    currency: 'USD'
  })

  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    navigate('/')
  }

  const handleProfileUpdate = (e) => {
    e.preventDefault()
    // Persist changes back to localStorage so Dashboard stays in sync
    const existing = JSON.parse(localStorage.getItem('currentUser') || '{}')
    const updated = {
      ...existing,
      name: userData.fullName,
      email: userData.email,
      phone: userData.phone,
      dateOfBirth: userData.dateOfBirth,
      nic: userData.nic,
      travelStyle: userData.travelStyle,
      interests: userData.interests,
    }
    localStorage.setItem('currentUser', JSON.stringify(updated))
    setIsEditing(false)
    showSaved('Profile updated!')
  }

  const handlePasswordChange = (e) => {
    e.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("Passwords don't match!")
      return
    }
    console.log('Password changed')
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    showSaved('Password changed successfully!')
  }

  const handlePreferencesUpdate = (e) => {
    e.preventDefault()
    const existing = JSON.parse(localStorage.getItem('currentUser') || '{}')
    localStorage.setItem('currentUser', JSON.stringify({ ...existing, preferences }))
    showSaved('Preferences saved!')
  }

  const handleAvatarChange = () => {
    // In a real app, this would open a file picker
    console.log('Avatar change requested')
  }

  const stats = [
    { label: 'Trips Completed', value: '0' },
    { label: 'Member Since', value: storedUser.joinDate || '—' },
    { label: 'Travel Style', value: storedUser.travelStyle || '—' },
    { label: 'Reward Points', value: '0' }
  ]

  return (
    <div className="profile-page">
      {/* Navigation */}
      <nav className="dashboard-nav glass-nav">
        <div className="nav-container">
          <Link to="/" className="logo">Travel<span>Genie</span></Link>

          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <span className={`hamburger ${menuOpen ? 'open' : ''}`} />
          </button>

          <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li><a href="#profile">Profile</a></li>
            <li><Link to="/">Explore</Link></li>
          </ul>

          <div className="nav-actions">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button className="btn-logout" onClick={handleLogout}>Log Out</button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="profile-container">
        {/* Profile Header */}
        <section className="profile-header glass-card">
          <div className="profile-banner" />
          <div className="profile-header-content">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar-large">
                <span className="avatar-icon-large">{userData.avatar}</span>
              </div>
              <button className="btn-change-avatar" onClick={handleAvatarChange} title="Change Avatar">
                📷
              </button>
            </div>
            <div className="profile-header-info">
              <h1 className="profile-name">{userData.fullName}</h1>
              <p className="profile-email">{userData.email}</p>
            </div>
            <div className="profile-stats">
              {stats.map((stat, index) => (
                <div key={index} className="profile-stat">
                  <span className="stat-value">{stat.value}</span>
                  <span className="stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tabs Navigation */}
        <div className="profile-tabs">
          <button
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span className="tab-icon">👤</span>
            Personal Info
          </button>
          <button
            className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <span className="tab-icon">🔒</span>
            Security
          </button>
          <button
            className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            <span className="tab-icon">⚙️</span>
            Preferences
          </button>
          <button
            className={`tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            <span className="tab-icon">🛡️</span>
            Privacy
          </button>
        </div>

        {/* Save toast */}
        {saveMsg && (
          <div className="profile-save-toast">
            ✅ {saveMsg}
          </div>
        )}

        {/* Tab Content */}
        <div className="profile-content">
          {/* Personal Info Tab */}
          {activeTab === 'profile' && (
            <div className="tab-content glass-card">
              <div className="content-header">
                <h2>Personal Information</h2>
                <button
                  className="btn-edit"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? '❌ Cancel' : '✏️ Edit'}
                </button>
              </div>

              <form onSubmit={handleProfileUpdate}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="fullName">Full Name</label>
                    <input
                      type="text"
                      id="fullName"
                      value={userData.fullName}
                      onChange={(e) => setUserData({ ...userData, fullName: e.target.value })}
                      disabled={!isEditing}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      value={userData.email}
                      onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                      disabled={!isEditing}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      value={userData.phone}
                      onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="dateOfBirth">Date of Birth</label>
                    <input
                      type="date"
                      id="dateOfBirth"
                      value={userData.dateOfBirth}
                      onChange={(e) => setUserData({ ...userData, dateOfBirth: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="nic">NIC / Passport Number</label>
                    <input
                      type="text"
                      id="nic"
                      value={userData.nic}
                      onChange={(e) => setUserData({ ...userData, nic: e.target.value })}
                      disabled={!isEditing}
                      placeholder="e.g. 991234567V or P12345678"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="travelStyle">Travel Style</label>
                    <select
                      id="travelStyle"
                      value={userData.travelStyle}
                      onChange={(e) => setUserData({ ...userData, travelStyle: e.target.value })}
                      disabled={!isEditing}
                    >
                      <option value="">Select a style</option>
                      <option value="Adventure">🏔️ Adventure</option>
                      <option value="Relax">🏖️ Relax</option>
                      <option value="Culture">🏛️ Culture</option>
                      <option value="Luxury">💎 Luxury</option>
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label>Interests</label>
                    {isEditing ? (
                      <div className="interests-edit-grid">
                        {['Beaches','Mountains','Food','History','Nightlife','Culture','Adventure','Nature','Wildlife','Photography','Art','Shopping','Spa','Wellness','Sports'].map(interest => (
                          <label key={interest} className="interest-checkbox">
                            <input
                              type="checkbox"
                              checked={userData.interests.includes(interest)}
                              onChange={() => {
                                const updated = userData.interests.includes(interest)
                                  ? userData.interests.filter(i => i !== interest)
                                  : [...userData.interests, interest]
                                setUserData({ ...userData, interests: updated })
                              }}
                            />
                            <span>{interest}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="interests-display">
                        {userData.interests && userData.interests.length > 0
                          ? userData.interests.map(i => (
                              <span key={i} className="interest-badge">{i}</span>
                            ))
                          : <span className="no-data">No interests selected</span>
                        }
                      </div>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="form-actions">
                    <button type="submit" className="btn-primary">
                      💾 Save Changes
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="tab-content glass-card">
              <div className="content-header">
                <h2>Security Settings</h2>
              </div>

              <div className="security-section">
                <h3>Change Password</h3>
                <form onSubmit={handlePasswordChange}>
                  <div className="form-group">
                    <label htmlFor="currentPassword">Current Password</label>
                    <input
                      type="password"
                      id="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="newPassword">New Password</label>
                    <input
                      type="password"
                      id="newPassword"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="Enter new password"
                      required
                    />
                    <small className="form-hint">Must be at least 8 characters</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm New Password</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                      required
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-primary">
                      🔒 Update Password
                    </button>
                  </div>
                </form>
              </div>

              <div className="security-section">
                <h3>Two-Factor Authentication</h3>
                <div className="security-option">
                  <div>
                    <p className="option-title">Enable 2FA</p>
                    <p className="option-description">Add an extra layer of security to your account</p>
                  </div>
                  <button className="btn-outline">Enable</button>
                </div>
              </div>

              <div className="security-section">
                <h3>Active Sessions</h3>
                <div className="session-item">
                  <div className="session-info">
                    <span className="session-device">💻 Windows PC - Chrome</span>
                    <span className="session-location">Colombo, Sri Lanka</span>
                    <span className="session-time">Active now</span>
                  </div>
                  <span className="session-badge current">Current</span>
                </div>
                <div className="session-item">
                  <div className="session-info">
                    <span className="session-device">📱 iPhone - Safari</span>
                    <span className="session-location">Colombo, Sri Lanka</span>
                    <span className="session-time">2 hours ago</span>
                  </div>
                  <button className="btn-text-danger">Revoke</button>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="tab-content glass-card">
              <div className="content-header">
                <h2>Preferences</h2>
              </div>

              <form onSubmit={handlePreferencesUpdate}>
                <div className="preference-section">
                  <h3>Notifications</h3>
                  <div className="preference-option">
                    <div>
                      <p className="option-title">Email Notifications</p>
                      <p className="option-description">Receive updates about your bookings via email</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={preferences.emailNotifications}
                        onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="preference-option">
                    <div>
                      <p className="option-title">SMS Notifications</p>
                      <p className="option-description">Get booking confirmations via SMS</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={preferences.smsNotifications}
                        onChange={(e) => setPreferences({ ...preferences, smsNotifications: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="preference-option">
                    <div>
                      <p className="option-title">Promotional Emails</p>
                      <p className="option-description">Receive special offers and deals</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={preferences.promotionalEmails}
                        onChange={(e) => setPreferences({ ...preferences, promotionalEmails: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="preference-option">
                    <div>
                      <p className="option-title">Newsletter Subscription</p>
                      <p className="option-description">Stay updated with travel tips and news</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={preferences.newsletterSubscription}
                        onChange={(e) => setPreferences({ ...preferences, newsletterSubscription: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="preference-section">
                  <h3>Regional Settings</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="language">Language</label>
                      <select
                        id="language"
                        value={preferences.language}
                        onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                      >
                        <option value="en">English</option>
                        <option value="si">Sinhala</option>
                        <option value="ta">Tamil</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="currency">Currency</label>
                      <select
                        id="currency"
                        value={preferences.currency}
                        onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="LKR">LKR (Rs)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary">
                    💾 Save Preferences
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="tab-content glass-card">
              <div className="content-header">
                <h2>Privacy & Data</h2>
              </div>

              <div className="privacy-section">
                <h3>Data Management</h3>
                <div className="privacy-option">
                  <div>
                    <p className="option-title">📥 Download Your Data</p>
                    <p className="option-description">Get a copy of all your account data</p>
                  </div>
                  <button className="btn-outline">Download</button>
                </div>

                <div className="privacy-option">
                  <div>
                    <p className="option-title">🗑️ Delete Account</p>
                    <p className="option-description">Permanently delete your account and all data</p>
                  </div>
                  <button className="btn-danger">Delete</button>
                </div>
              </div>

              <div className="privacy-section">
                <h3>Privacy Settings</h3>
                <div className="privacy-info">
                  <p>We take your privacy seriously. Review our <a href="#" className="link-accent">Privacy Policy</a> to learn how we protect and use your data.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile
