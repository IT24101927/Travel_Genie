import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_BASE } from '../../config/api'
import { clearUserData } from '../../utils/clearUserData'
import { validateName, validatePhone, validateNic, validatePassword, validateDateOfBirth, normalizePhone } from '../../utils/validation'
import './Profile.css'

// Format ISO date string → YYYY-MM-DD for <input type="date">
function toDateInput(val) {
  if (!val) return ''
  const d = new Date(val)
  if (isNaN(d)) return val
  return d.toISOString().slice(0, 10)
}

// Local wrapper kept for backward compatibility
function isValidPhone(value) {
  return validatePhone(value).valid
}

function Profile({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)

  const showSaved = (msg = 'Changes saved!', type = 'success') => {
    setSaveMsg({ msg, type })
    setTimeout(() => setSaveMsg(null), 3000)
  }

  // Load user from localStorage (written on signup/login)
  const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}')
  const storedPrefs = storedUser.preferences || {}
  const storedPrivacy = storedUser.privacy || {}
  const [userData, setUserData] = useState({
    fullName: storedUser.name || '',
    email: storedUser.email || '',
    phone: storedUser.phone || '',
    dateOfBirth: toDateInput(storedUser.dateOfBirth),
    nic: storedUser.nic || '',
    gender: storedUser.gender || '',
    travelStyle: storedUser.travelStyle || storedUser.address?.travelStyle || '',
    interests: storedUser.interests || storedUser.address?.interests || [],
    joinDate: storedUser.joinDate || '',
    avatar: storedUser.avatar || ''
  })

  const [preferences, setPreferences] = useState({
    emailNotifications: storedPrefs.emailNotifications ?? true,
    language: storedPrefs.language || 'en',
    currency: storedPrefs.currency || 'LKR',
    preferred_weather: storedPrefs.preferred_weather || storedUser.preferred_weather || '',
  })

  const [privacy, setPrivacy] = useState({
    profilePublic: storedPrivacy.profilePublic ?? true,
    shareTrips: storedPrivacy.shareTrips ?? false,
    locationSharing: storedPrivacy.locationSharing ?? false,
    dataCollection: storedPrivacy.dataCollection ?? true,
  })

  // Refresh from backend on mount so avatar / name are always current
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    // Fetch user profile
    fetch(`${API_BASE}/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        if (!res?.data) return
        const u = res.data
        const existing = JSON.parse(localStorage.getItem('currentUser') || '{}')
        const backendPrefs = u.address?.prefs || u.preferences || {}
        const backendPrivacy = u.address?.privacy || {}
        const merged = {
          ...existing, ...u,
          dateOfBirth: u.date_of_birth || existing.dateOfBirth,
          preferences: { ...existing.preferences, ...backendPrefs },
          privacy: { ...existing.privacy, ...backendPrivacy },
        }
        localStorage.setItem('currentUser', JSON.stringify(merged))
        if (backendPrefs.currency) localStorage.setItem('et_displayCurrency', backendPrefs.currency)
        setUserData({
          fullName: u.name || '',
          email: u.email || '',
          phone: u.phone || '',
          dateOfBirth: toDateInput(u.date_of_birth),
          nic: u.nic || '',
          gender: u.gender || '',
          travelStyle: u.address?.travelStyle || existing.travelStyle || '',
          interests: u.address?.interests || existing.interests || [],
          joinDate: existing.joinDate || '',
          avatar: u.avatar || '',
        })
        if (Object.keys(backendPrefs).length) {
          setPreferences(prev => ({ ...prev, ...backendPrefs }))
        }
        if (Object.keys(backendPrivacy).length) {
          setPrivacy(prev => ({ ...prev, ...backendPrivacy }))
        }
      })
      .catch(() => {})

    // Fetch preferences from dedicated endpoint
    fetch(`${API_BASE}/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        if (!res?.data) return
        const d = res.data
        if (d.travelStyle) setUserData(prev => ({ ...prev, travelStyle: d.travelStyle }))
        if (d.interests?.length) setUserData(prev => ({ ...prev, interests: d.interests }))
        if (d.notifications) setPreferences(prev => ({ ...prev, ...d.notifications }))
        if (d.regional) setPreferences(prev => ({ ...prev, ...d.regional }))
        if (d.privacy) setPrivacy(prev => ({ ...prev, ...d.privacy }))
      })
      .catch(() => {})
  }, [])

  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [avatarTab, setAvatarTab]             = useState('file') // 'file' | 'url'
  const [avatarUrlInput, setAvatarUrlInput]   = useState('')

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordError, setPasswordError] = useState('')
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    clearUserData()
    navigate('/')
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    const nameCheck = validateName(userData.fullName)
    if (!nameCheck.valid) {
      showSaved(`⚠️ ${nameCheck.message}`, 'error')
      return
    }
    const normalizedPhone = normalizePhone(userData.phone)
    if (!isValidPhone(normalizedPhone)) {
      showSaved('⚠️ Phone number must be exactly 10 digits and start with 0.', 'error')
      return
    }
    const nicCheck = validateNic(userData.nic)
    if (!nicCheck.valid) {
      showSaved(`⚠️ ${nicCheck.message}`, 'error')
      return
    }
    if (userData.dateOfBirth) {
      const dobCheck = validateDateOfBirth(userData.dateOfBirth)
      if (!dobCheck.valid) {
        showSaved(`⚠️ ${dobCheck.message}`, 'error')
        return
      }
    }

    const token = localStorage.getItem('token')
    const existing = JSON.parse(localStorage.getItem('currentUser') || '{}')
    const updated = {
      ...existing,
      name: userData.fullName,
      email: existing.email,
      phone: normalizedPhone,
      dateOfBirth: userData.dateOfBirth,
      nic: userData.nic,
      gender: userData.gender,
      travelStyle: userData.travelStyle,
      interests: userData.interests,
    }
    localStorage.setItem('currentUser', JSON.stringify(updated))

    if (token) {
      try {
        const res = await fetch(`${API_BASE}/users/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: userData.fullName,
            phone: normalizedPhone,
            date_of_birth: userData.dateOfBirth || undefined,
            nic: userData.nic,
            gender: userData.gender || undefined,
            address: {
              ...(existing.address || {}),
              travelStyle: userData.travelStyle,
              interests: userData.interests,
            },
          }),
        })
        if (!res.ok) {
          const d = await res.json()
          showSaved(`⚠️ Warning: ${d.message || 'Server error, local changes saved.'}`, 'error')
          setIsEditing(false)
          return
        }
        // Also sync travel style & interests to preferences table
        await fetch(`${API_BASE}/preferences`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            travelStyle: userData.travelStyle,
            interests: userData.interests,
          }),
        }).catch(() => {})
      } catch { /* network error — local save is still done */ }
    }
    setIsEditing(false)
    showSaved('✅ Profile updated!')
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPasswordError('')
    const pwCheck = validatePassword(passwordData.newPassword)
    if (!pwCheck.valid) {
      setPasswordError(pwCheck.message)
      return
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Passwords don't match.")
      return
    }
    const token = localStorage.getItem('token')
    if (!token) {
      setPasswordError('You must be logged in to change your password.')
      return
    }
    try {
      const res = await fetch(`${API_BASE}/users/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPasswordError(data.message || 'Failed to change password.')
        return
      }
    } catch {
      setPasswordError('Network error. Please try again.')
      return
    }
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    showSaved('✅ Password changed successfully!')
  }

  const handlePreferencesUpdate = async (e) => {
    e.preventDefault()
    const existing = JSON.parse(localStorage.getItem('currentUser') || '{}')
    localStorage.setItem('currentUser', JSON.stringify({
      ...existing,
      preferences,
      preferred_weather: preferences.preferred_weather,
    }))
    localStorage.setItem('et_displayCurrency', preferences.currency)
    const token = localStorage.getItem('token')
    if (token) {
      try {
        await fetch(`${API_BASE}/preferences`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            preferred_weather: preferences.preferred_weather,
            notifications: {
              emailNotifications: preferences.emailNotifications,
            },
            regional: {
              language: preferences.language,
              currency: preferences.currency,
            },
          }),
        })
      } catch { /* save locally regardless */ }
    }
    showSaved('✅ Preferences saved!')
  }

  const handlePrivacyUpdate = async (e) => {
    e.preventDefault()
    const existing = JSON.parse(localStorage.getItem('currentUser') || '{}')
    localStorage.setItem('currentUser', JSON.stringify({ ...existing, privacy }))
    const token = localStorage.getItem('token')
    if (token) {
      try {
        await fetch(`${API_BASE}/preferences`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ privacy }),
        })
      } catch { /* save locally regardless */ }
    }
    showSaved('✅ Privacy settings saved!')
  }

  const handleAvatarChange = () => setShowAvatarModal(true)

  const saveAvatar = async (src) => {
    // 1. Update React state immediately
    setUserData(u => ({ ...u, avatar: src }))
    // 2. Persist in localStorage
    const existing = JSON.parse(localStorage.getItem('currentUser') || '{}')
    localStorage.setItem('currentUser', JSON.stringify({ ...existing, avatar: src }))
    // 3. Save to backend DB
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const res = await fetch(`${API_BASE}/users/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ avatar: src }),
        })
        if (!res.ok) {
          showSaved('⚠️ Photo saved locally (sync failed, will retry on next save)', 'error')
          setShowAvatarModal(false)
          return
        }
      } catch {
        showSaved('⚠️ Photo saved locally (offline)', 'error')
        setShowAvatarModal(false)
        return
      }
    }
    setShowAvatarModal(false)
    showSaved(src ? '✅ Profile photo updated!' : '🗑️ Profile photo removed!', src ? 'success' : 'delete')
  }

  const handleFilePick = (e) => {
    const file = e.target.files[0]
    if (!file) return
    // Warn if file is very large (>2MB base64 might be slow)
    const reader = new FileReader()
    reader.onerror = () => showSaved('⚠️ Failed to read image file. Please try another.', 'error')
    reader.onload = (ev) => saveAvatar(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleAvatarUrl = () => {
    const url = avatarUrlInput.trim()
    if (!url) return
    setAvatarUrlInput('')
    saveAvatar(url)
  }

  const handleRemoveAvatar = () => saveAvatar('')

  const handleDeleteAccount = async () => {
    if (isDeletingAccount) return

    const confirmed = window.confirm('Are you sure you want to permanently delete your account? This cannot be undone.')
    if (!confirmed) return

    const confirmationText = window.prompt('Type DELETE to confirm account deletion:')
    if (confirmationText !== 'DELETE') {
      showSaved('Deletion cancelled. Account was not deleted.', 'error')
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      showSaved('⚠️ You are not logged in.', 'error')
      return
    }

    setIsDeletingAccount(true)
    try {
      const res = await fetch(`${API_BASE}/users/profile`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        showSaved(`⚠️ ${data.message || 'Failed to delete account.'}`, 'error')
        return
      }

      localStorage.removeItem('token')
      localStorage.removeItem('currentUser')
      clearUserData()
      alert('Your account has been deleted successfully.')
      navigate('/')
    } catch {
      showSaved('⚠️ Network error. Please try again.', 'error')
    } finally {
      setIsDeletingAccount(false)
    }
  }

  const stats = [
    { label: 'Trips Completed', value: '0' },
    { label: 'Member Since', value: userData.joinDate || storedUser.joinDate || '—' },
    { label: 'Travel Style', value: userData.travelStyle || '—' },
  ]

  return (
    <div className="profile-page">
      {/* Navigation */}
      <nav className="dashboard-nav glass-nav">
        <div className="nav-container">
          <Link to="/dashboard" className="logo">Travel<span>Genie</span></Link>

          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <span className={`hamburger ${menuOpen ? 'open' : ''}`} />
          </button>

          <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li><a href="#profile">Profile</a></li>
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

      {/* Main Content */}
      <div className="profile-container">
        {/* Profile Header */}
        <section className="profile-header glass-card">
          <div className="profile-banner" />
          <div className="profile-header-content">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar-large">
                {userData.avatar
                  ? <img src={userData.avatar} alt="avatar" className="avatar-img" />
                  : <span className="avatar-icon-large">👤</span>
                }
              </div>
              <button className="btn-change-avatar" onClick={handleAvatarChange} title="Change Photo">
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
          <div className={`profile-save-toast ${saveMsg.type}`}>
            {saveMsg.msg}
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
                {isEditing && (
                  <div className="form-avatar-edit">
                    <div className="form-avatar-preview">
                      {userData.avatar
                        ? <img src={userData.avatar} alt="avatar" className="form-avatar-img" />
                        : <span className="form-avatar-placeholder">👤</span>
                      }
                    </div>
                    <div className="form-avatar-actions">
                      <p className="form-avatar-label">Profile Photo</p>
                      <button type="button" className="btn-avatar-change" onClick={handleAvatarChange}>
                        📷 Change Photo
                      </button>
                    </div>
                  </div>
                )}
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
                      disabled
                      readOnly
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      value={userData.phone}
                      onChange={(e) => setUserData({ ...userData, phone: normalizePhone(e.target.value) })}
                      disabled={!isEditing}
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="07XXXXXXXX"
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
                    <label htmlFor="gender">Gender</label>
                    <select
                      id="gender"
                      value={userData.gender}
                      onChange={(e) => setUserData({ ...userData, gender: e.target.value })}
                      disabled={!isEditing}
                    >
                      <option value="">Select gender</option>
                      <option value="male">♂ Male</option>
                      <option value="female">♀ Female</option>
                      <option value="other">⚧ Other</option>
                    </select>
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
                      <option value="Budget">🎒 Budget</option>
                      <option value="Family">👨‍👩‍👧 Family</option>
                      <option value="Backpacker">🗺️ Backpacker</option>
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label>Interests</label>
                    {isEditing ? (
                      <div className="interests-edit-grid">
                        {['Beaches','Mountains','Historical','Cultural','Adventure','Nature','Wildlife','Religious','Relax','Food','Nightlife','Photography','Art','Shopping'].map(interest => (
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
                    <small className="form-hint">
                      Forgotten it?{' '}
                      <button
                        type="button"
                        className="btn-link-inline"
                        onClick={() => navigate('/forgot-password')}
                      >
                        Reset via email
                      </button>
                    </small>
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

                  {passwordError && (
                    <div className="form-error-msg">⚠️ {passwordError}</div>
                  )}
                  <div className="form-actions">
                    <button type="submit" className="btn-primary">
                      🔒 Update Password
                    </button>
                  </div>
                </form>
              </div>

              <div className="security-section">
                <h3>Account Security</h3>
                <div className="security-option">
                  <div>
                    <p className="option-title">Two-Factor Authentication</p>
                    <p className="option-description">Coming soon — extra layer of security for your account</p>
                  </div>
                  <button className="btn-outline" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>Coming soon</button>
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
                      <p className="option-description">Get booking confirmations via SMS (coming soon)</p>
                    </div>
                    <span className="coming-soon-pill">Coming soon</span>
                  </div>

                  <div className="preference-option">
                    <div>
                      <p className="option-title">Push Notifications</p>
                      <p className="option-description">Instant app alerts for important updates (coming soon)</p>
                    </div>
                    <span className="coming-soon-pill">Coming soon</span>
                  </div>

                  <div className="preference-option">
                    <div>
                      <p className="option-title">WhatsApp Notifications</p>
                      <p className="option-description">Receive trip alerts on WhatsApp (coming soon)</p>
                    </div>
                    <span className="coming-soon-pill">Coming soon</span>
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
                        <option value="LKR">LKR (Rs)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
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

              <form onSubmit={handlePrivacyUpdate}>
                <div className="preference-section">
                  <h3>Privacy Settings</h3>

                  <div className="preference-option">
                    <div>
                      <p className="option-title">Public Profile</p>
                      <p className="option-description">Allow other travellers to view your profile</p>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={privacy.profilePublic}
                        onChange={(e) => setPrivacy({ ...privacy, profilePublic: e.target.checked })} />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="preference-option">
                    <div>
                      <p className="option-title">Share Trip History</p>
                      <p className="option-description">Show your past trips on your public profile</p>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={privacy.shareTrips}
                        onChange={(e) => setPrivacy({ ...privacy, shareTrips: e.target.checked })} />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="preference-option">
                    <div>
                      <p className="option-title">Location Sharing</p>
                      <p className="option-description">Allow the app to use your current location</p>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={privacy.locationSharing}
                        onChange={(e) => setPrivacy({ ...privacy, locationSharing: e.target.checked })} />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="preference-option">
                    <div>
                      <p className="option-title">Personalisation Data</p>
                      <p className="option-description">Let us use your activity to improve recommendations</p>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={privacy.dataCollection}
                        onChange={(e) => setPrivacy({ ...privacy, dataCollection: e.target.checked })} />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary">💾 Save Privacy Settings</button>
                </div>
              </form>

              <div className="privacy-section" style={{ marginTop: '24px' }}>
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
                  <button className="btn-danger" onClick={handleDeleteAccount} disabled={isDeletingAccount}>
                    {isDeletingAccount ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Avatar Picker Modal ── */}
      {showAvatarModal && (
        <div className="avatar-modal-overlay" onClick={() => setShowAvatarModal(false)}>
          <div className="avatar-modal" onClick={e => e.stopPropagation()}>
            <div className="avatar-modal-header">
              <h3>Change Profile Photo</h3>
              <button className="avatar-modal-close" onClick={() => setShowAvatarModal(false)}>✕</button>
            </div>

            {/* Preview */}
            <div className="avatar-preview-wrap">
              {userData.avatar
                ? <img src={userData.avatar} alt="preview" className="avatar-preview-img" />
                : <span className="avatar-preview-emoji">👤</span>
              }
            </div>

            {/* Tabs */}
            <div className="avatar-tabs">
              <button
                className={`avatar-tab-btn ${avatarTab === 'file' ? 'active' : ''}`}
                onClick={() => setAvatarTab('file')}
              >📁 From Device</button>
              <button
                className={`avatar-tab-btn ${avatarTab === 'url' ? 'active' : ''}`}
                onClick={() => setAvatarTab('url')}
              >🔗 From URL</button>
            </div>

            {avatarTab === 'file' ? (
              <div className="avatar-tab-panel">
                <p className="avatar-hint">Choose a JPG, PNG or WEBP image from your computer.</p>
                <label className="avatar-file-label">
                  Choose Photo
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFilePick}
                  />
                </label>
              </div>
            ) : (
              <div className="avatar-tab-panel">
                <p className="avatar-hint">Paste a public image URL.</p>
                <input
                  type="url"
                  className="avatar-url-input"
                  placeholder="https://example.com/photo.jpg"
                  value={avatarUrlInput}
                  onChange={e => setAvatarUrlInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAvatarUrl()}
                />
                <button className="avatar-url-apply" onClick={handleAvatarUrl}>Apply URL</button>
              </div>
            )}

            {userData.avatar && (
              <button className="avatar-remove-btn" onClick={handleRemoveAvatar}>Remove Photo</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile
