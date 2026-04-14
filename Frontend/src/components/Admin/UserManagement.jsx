import { useState, useEffect, useCallback } from 'react'
import './UserManagement.css'
import { API_BASE } from '../../config/api'
import { validateName, validatePhone, validateNic, validateEmail, validatePassword, validateDateOfBirth, normalizePhone } from '../../utils/validation'

const API = API_BASE
const authH = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formErrors, setFormErrors] = useState({})
  const [toastMsg, setToastMsg] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('add')
  const [selectedUser, setSelectedUser] = useState(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterTravelStyle, setFilterTravelStyle] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '',
    role: 'user', isActive: true, gender: '',
    dateOfBirth: '', nic: '', currency: 'LKR',
    interests: [], travelStyle: 'Culture', preferredWeather: 'Any'
  })

  const interestOptions = [
    'Beaches', 'Mountains', 'Historical', 'Cultural', 'Adventure',
    'Nature', 'Wildlife', 'Religious', 'Relax', 'Food',
    'Nightlife', 'Photography', 'Art', 'Shopping'
  ]

  const travelStyleOptions = ['Adventure', 'Relax', 'Culture', 'Luxury', 'Budget', 'Family', 'Backpacker']

  const STYLE_INTERESTS = {
    Adventure:   ['Mountains', 'Nature', 'Wildlife', 'Adventure'],
    Relax:       ['Beaches', 'Relax', 'Nature', 'Photography'],
    Culture:     ['Historical', 'Cultural', 'Religious', 'Art'],
    Luxury:      ['Beaches', 'Food', 'Shopping', 'Photography'],
    Budget:      ['Historical', 'Nature', 'Adventure', 'Food'],
    Family:      ['Beaches', 'Nature', 'Wildlife', 'Food'],
    Backpacker:  ['Mountains', 'Nature', 'Historical', 'Adventure'],
  }

  const [matchedDests, setMatchedDests] = useState([])
  const [matchedCats, setMatchedCats] = useState([])
  const [matchLoading, setMatchLoading] = useState(false)

  const showToast = (msg, type = 'success') => { setToastMsg({ msg, type }); setTimeout(() => setToastMsg(null), 3000) }

  const loadUsers = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/users?limit=200`, { headers: authH() })
      const data = await res.json()
      if (data.success) setUsers(data.data)
      else setError(data.message || 'Failed to load users')
    } catch { setError('Cannot connect to server.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  // Open Add Modal
  const handleAdd = () => {
    setModalMode('add')
    setSelectedUser(null)
    setFormData({ name: '', email: '', password: '', phone: '', role: 'user', isActive: true, gender: '', dateOfBirth: '', nic: '', currency: 'LKR', interests: STYLE_INTERESTS['Culture'], travelStyle: 'Culture', preferredWeather: 'Any' })
    setFormErrors({})
    setShowModal(true)
  }

  // Open Edit Modal
  const handleEdit = (user) => {
    setModalMode('edit')
    setSelectedUser(user)
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      phone: user.phone || '',
      role: user.role,
      isActive: user.isActive,
      gender: user.gender || '',
      dateOfBirth: user.date_of_birth || '',
      nic: user.nic || '',
      currency: user.address?.prefs?.currency || 'LKR',
      interests: user.interests || [],
      travelStyle: user.travelStyle || 'Culture',
      preferredWeather: user.address?.prefs?.preferred_weather || user.preferred_weather || 'Any'
    })
    setFormErrors({})
    setShowModal(true)
  }

  // Open View Modal
  const handleView = (user) => {
    setModalMode('view')
    setSelectedUser(user)
    setShowModal(true)
    // Fetch matched destinations for this user
    setMatchedDests([])
    setMatchedCats([])
    setMatchLoading(true)
    fetch(`${API}/destinations/recommended/${user.id}?limit=10`, { headers: authH() })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json?.success) {
          setMatchedDests(json.data || [])
          setMatchedCats(json.matchedCategories || [])
        }
      })
      .catch(() => {})
      .finally(() => setMatchLoading(false))
  }

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    // --- Validations ---
    const errs = {}
    const nameCheck = validateName(formData.name)
    if (!nameCheck.valid) errs.name = nameCheck.message
    const emailCheck = validateEmail(formData.email)
    if (!emailCheck.valid) errs.email = emailCheck.message
    if (modalMode === 'add' || formData.password) {
      const pwCheck = validatePassword(formData.password)
      if (!pwCheck.valid) errs.password = pwCheck.message
    }
    if (formData.phone) {
      const phoneCheck = validatePhone(formData.phone)
      if (!phoneCheck.valid) errs.phone = phoneCheck.message
    }
    if (formData.nic) {
      const nicCheck = validateNic(formData.nic)
      if (!nicCheck.valid) errs.nic = nicCheck.message
    }
    if (formData.dateOfBirth) {
      const dobCheck = validateDateOfBirth(formData.dateOfBirth)
      if (!dobCheck.valid) errs.dateOfBirth = dobCheck.message
    }
    if (Object.keys(errs).length > 0) { setFormErrors(errs); setSaving(false); return }
    setFormErrors({})
    // --- End Validations ---
    try {
      if (modalMode === 'add') {
        const body = {
          name: formData.name, email: formData.email, password: formData.password,
          phone: formData.phone || undefined, role: formData.role,
          isActive: formData.isActive, gender: formData.gender || undefined,
          date_of_birth: formData.dateOfBirth || undefined,
          nic: formData.nic || undefined,
          currency: formData.currency,
          travelStyle: formData.travelStyle, interests: formData.interests,
          preferred_weather: formData.preferredWeather,
        }
        const res = await fetch(`${API}/users`, { method: 'POST', headers: authH(), body: JSON.stringify(body) })
        const data = await res.json()
        if (data.success) { showToast('✅ User created successfully'); setShowModal(false); await loadUsers() }
        else setError(data.message || 'Failed to create user')
      } else {
        const body = {
          name: formData.name, email: formData.email, phone: formData.phone,
          role: formData.role, isActive: formData.isActive, gender: formData.gender || undefined,
          date_of_birth: formData.dateOfBirth || undefined,
          nic: formData.nic || undefined,
          address: {
            ...(selectedUser.address || {}),
            travelStyle: formData.travelStyle,
            interests: formData.interests,
            prefs: { ...(selectedUser.address?.prefs || {}), currency: formData.currency, preferred_weather: formData.preferredWeather },
          },
        }
        if (formData.password) body.password = formData.password
        const res = await fetch(`${API}/users/${selectedUser.id}`, { method: 'PUT', headers: authH(), body: JSON.stringify(body) })
        const data = await res.json()
        if (data.success) { showToast('✅ User updated successfully'); setShowModal(false); await loadUsers() }
        else setError(data.message || 'Failed to update user')
      }
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  // Handle Delete
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return
    try {
      const res = await fetch(`${API}/users/${id}`, { method: 'DELETE', headers: authH() })
      const data = await res.json()
      if (data.success) { showToast('🗑️ User deleted', 'delete'); setUsers(u => u.filter(x => x.id !== id)) }
      else setError(data.message || 'Failed to delete user')
    } catch { setError('Network error') }
  }

  // Handle Status Change
  const handleStatusChange = async (id, isActive) => {
    try {
      const res = await fetch(`${API}/users/${id}`, { method: 'PUT', headers: authH(), body: JSON.stringify({ isActive }) })
      const data = await res.json()
      if (data.success) setUsers(u => u.map(x => x.id === id ? { ...x, isActive } : x))
      else setError(data.message)
    } catch { setError('Network error') }
  }

  // Handle Travel Style Change (auto-fills interests)
  const handleTravelStyleChange = (newStyle) => {
    setFormData(prev => {
      const prevDefaults = STYLE_INTERESTS[prev.travelStyle] || []
      const withoutOld = prev.interests.filter(i => !prevDefaults.includes(i))
      const merged = [...new Set([...withoutOld, ...(STYLE_INTERESTS[newStyle] || [])])]
      return { ...prev, travelStyle: newStyle, interests: merged }
    })
  }

  // Handle Interest Toggle
  const toggleInterest = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }))
  }

  // Filter and Sort Users
  const filteredUsers = users
    .filter(user => {
      const q = searchQuery.toLowerCase()
      const matchesSearch = (user.name || '').toLowerCase().includes(q) || (user.email || '').toLowerCase().includes(q)
      const matchesRole = filterRole === 'all' || user.role === filterRole
      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'active' && user.isActive) ||
        (filterStatus === 'inactive' && !user.isActive)
      const matchesTravelStyle = filterTravelStyle === 'all' || user.travelStyle === filterTravelStyle
      return matchesSearch && matchesRole && matchesStatus && matchesTravelStyle
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '')
      if (sortBy === 'lastLogin') return new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0)
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    })

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.isActive).length,
    adminUsers: users.filter(u => u.role === 'admin').length,
    newUsersThisMonth: users.filter(u => {
      const d = new Date(u.createdAt); const n = new Date()
      return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
    }).length
  }

  return (
    <div className="user-management">
      {toastMsg && <div className={`admin-toast ${toastMsg.type}`}>{toastMsg.msg}</div>}
      {error && <div className="admin-error-banner">{error} <button onClick={() => setError('')}>✕</button></div>}

      {/* Header */}
      <div className="um-header">
        <div>
          <h1 className="um-title">User Account Management</h1>
          <p className="um-subtitle">Manage user accounts, preferences, and authentication</p>
        </div>
        <button className="btn-add-user" onClick={handleAdd}>+ Add User</button>
      </div>

      {/* Stats */}
      <div className="um-stats">
        <div className="um-stat-card">
          <div className="um-stat-icon" style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}>👤</div>
          <div><p className="um-stat-value">{loading ? '…' : stats.totalUsers}</p><p className="um-stat-label">Total Users</p></div>
        </div>
        <div className="um-stat-card">
          <div className="um-stat-icon" style={{ background: 'linear-gradient(135deg,#10b981,#34d399)' }}>✅</div>
          <div><p className="um-stat-value">{loading ? '…' : stats.activeUsers}</p><p className="um-stat-label">Active</p></div>
        </div>
        <div className="um-stat-card">
          <div className="um-stat-icon" style={{ background: 'linear-gradient(135deg,#f59e0b,#fbbf24)' }}>🔑</div>
          <div><p className="um-stat-value">{loading ? '…' : stats.adminUsers}</p><p className="um-stat-label">Admins</p></div>
        </div>
        <div className="um-stat-card">
          <div className="um-stat-icon" style={{ background: 'linear-gradient(135deg,#ec4899,#f472b6)' }}>🆕</div>
          <div><p className="um-stat-value">{loading ? '…' : stats.newUsersThisMonth}</p><p className="um-stat-label">New This Month</p></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="um-toolbar">
        <div className="um-search-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search name or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="um-search-input"
          />
          {searchQuery && <button className="um-search-clear" onClick={() => setSearchQuery('')}>✕</button>}
        </div>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="um-select">
          <option value="all">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="um-select">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={filterTravelStyle} onChange={(e) => setFilterTravelStyle(e.target.value)} className="um-select">
          <option value="all">All Styles</option>
          {travelStyleOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="um-select">
          <option value="createdAt">Newest</option>
          <option value="lastLogin">Last Login</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="users-table-container">
        {loading ? (
          <div className="admin-loading"><div className="admin-spinner" /><p>Loading users…</p></div>
        ) : filteredUsers.length > 0 ? (
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Travel Style</th>
                <th>Joined</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="user-cell">
                      <span className="user-avatar">
                        {(user.name || 'U').charAt(0).toUpperCase()}
                      </span>
                      <div className="user-info">
                        <span className="user-name">{user.name}</span>
                        <span className="username">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge ${user.role}`}>
                      {user.role === 'admin' ? '🔑' : '👤'} {user.role}
                    </span>
                  </td>
                  <td>
                    <select
                      value={user.isActive ? 'active' : 'inactive'}
                      onChange={(e) => handleStatusChange(user.id, e.target.value === 'active')}
                      className={`status-select status-${user.isActive ? 'active' : 'inactive'}`}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </td>
                  <td>
                    {user.travelStyle ? (
                      <span className={`travel-style-badge ${user.travelStyle.toLowerCase()}`}>
                        {user.travelStyle === 'Adventure' ? '🏔️' :
                         user.travelStyle === 'Relax' ? '🏖️' :
                         user.travelStyle === 'Culture' ? '🏛️' :
                         user.travelStyle === 'Budget' ? '🎒' :
                         user.travelStyle === 'Family' ? '👨‍👩‍👧' :
                         user.travelStyle === 'Backpacker' ? '🗺️' : '💎'}
                        {user.travelStyle}
                      </span>
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="td-actions">
                    <div className="action-buttons">
                      <button className="btn-table-view" onClick={() => handleView(user)} title="View">👁️</button>
                      <button className="btn-table-edit" onClick={() => handleEdit(user)} title="Edit">✏️</button>
                      <button className="btn-table-delete" onClick={() => handleDelete(user.id)} title="Delete">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">👥</span>
            <h3>No users found</h3>
            <p>Try adjusting your filters or add a new user</p>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (modalMode === 'edit' || modalMode === 'add') && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalMode === 'add' ? '➕ Add User' : '✏️ Edit User'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="user-form">
              <div className="form-section">
                <h3>👤 Basic Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => { setFormData({...formData, name: e.target.value}); setFormErrors(prev => ({...prev, name: ''})) }}
                      required
                      placeholder="e.g., John Doe"
                    />
                    {formErrors.name && <p style={{ color: '#e53e3e', fontSize: '0.78rem', marginTop: '4px' }}>⚠ {formErrors.name}</p>}
                  </div>

                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => { setFormData({...formData, email: e.target.value}); setFormErrors(prev => ({...prev, email: ''})) }}
                      required
                      placeholder="e.g., john@example.com"
                    />
                    {formErrors.email && <p style={{ color: '#e53e3e', fontSize: '0.78rem', marginTop: '4px' }}>⚠ {formErrors.email}</p>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>{modalMode === 'add' ? 'Password *' : 'New Password (leave blank to keep)'}</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => { setFormData({...formData, password: e.target.value}); setFormErrors(prev => ({...prev, password: ''})) }}
                      required={modalMode === 'add'}
                      placeholder="Min 8 characters"
                    />
                    {formErrors.password && <p style={{ color: '#e53e3e', fontSize: '0.78rem', marginTop: '4px' }}>⚠ {formErrors.password}</p>}
                  </div>

                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => { setFormData({...formData, phone: normalizePhone(e.target.value)}); setFormErrors(prev => ({...prev, phone: ''})) }}
                      placeholder="e.g., 07XXXXXXXX"
                      inputMode="numeric"
                      maxLength={10}
                    />
                    {formErrors.phone && <p style={{ color: '#e53e3e', fontSize: '0.78rem', marginTop: '4px' }}>⚠ {formErrors.phone}</p>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={formData.isActive ? 'active' : 'inactive'}
                      onChange={(e) => setFormData({...formData, isActive: e.target.value === 'active'})}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    >
                      <option value="">Select gender</option>
                      <option value="male">♂ Male</option>
                      <option value="female">♀ Female</option>
                      <option value="other">⚧ Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => {
                        const v = e.target.value
                        setFormData({...formData, dateOfBirth: v})
                        if (v) {
                          const r = validateDateOfBirth(v)
                          setFormErrors(prev => ({...prev, dateOfBirth: r.valid ? '' : r.message}))
                        } else {
                          setFormErrors(prev => ({...prev, dateOfBirth: ''}))
                        }
                      }}
                    />
                    {formErrors.dateOfBirth && <p style={{ color: '#e53e3e', fontSize: '0.78rem', marginTop: '4px' }}>⚠ {formErrors.dateOfBirth}</p>}
                  </div>

                  <div className="form-group">
                    <label>NIC / Passport</label>
                    <input
                      type="text"
                      value={formData.nic}
                      onChange={(e) => { setFormData({...formData, nic: e.target.value}); setFormErrors(prev => ({...prev, nic: ''})) }}
                      placeholder="e.g. 991234567V"
                    />
                    {formErrors.nic && <p style={{ color: '#e53e3e', fontSize: '0.78rem', marginTop: '4px' }}>⚠ {formErrors.nic}</p>}
                  </div>

                  <div className="form-group">
                    <label>Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({...formData, currency: e.target.value})}
                    >
                      <option value="LKR">LKR (Rs)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>✈️ Travel Preferences</h3>
                
                <div className="form-group">
                  <label>Preferred Travel Style *</label>
                  <div className="travel-style-options">
                    {travelStyleOptions.map(style => (
                      <label key={style} className="radio-option">
                        <input
                          type="radio"
                          name="travelStyle"
                          value={style}
                          checked={formData.travelStyle === style}
                          onChange={() => handleTravelStyleChange(style)}
                        />
                        <span className="radio-label">
                          {style === 'Adventure' ? '🏔️' : 
                           style === 'Relax' ? '🏖️' : 
                           style === 'Culture' ? '🏛️' : 
                           style === 'Budget' ? '🎒' :
                           style === 'Family' ? '👨‍👩‍👧' :
                           style === 'Backpacker' ? '🗺️' : '💎'} 
                          {style}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Interests (Select all that apply)</label>
                  <div className="interests-grid">
                    {interestOptions.map(interest => (
                      <label key={interest} className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={formData.interests.includes(interest)}
                          onChange={() => toggleInterest(interest)}
                        />
                        <span className="checkbox-label">{interest}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Preferred Weather</label>
                  <select
                    value={formData.preferredWeather}
                    onChange={(e) => setFormData({...formData, preferredWeather: e.target.value})}
                  >
                    <option value="Sunny">☀️ Sunny</option>
                    <option value="Mild">🌤️ Mild</option>
                    <option value="Rainy">🌧️ Rainy</option>
                    <option value="Cold">❄️ Cold</option>
                    <option value="Any">🌀 Any / No Preference</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={saving}>
                  {saving ? 'Saving…' : modalMode === 'add' ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showModal && modalMode === 'view' && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>👁️ User Details</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="user-details">
              <div className="details-header">
                <div className="details-avatar">
                  {(selectedUser.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="details-info">
                  <h3>{selectedUser.name}</h3>
                  <p>{selectedUser.email}</p>
                </div>
                <span className={`status-badge status-${selectedUser.isActive ? 'active' : 'inactive'}`}>
                  {selectedUser.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="details-grid">
                <div className="detail-group">
                  <label>Email:</label>
                  <p>{selectedUser.email}</p>
                </div>

                <div className="detail-group">
                  <label>Phone:</label>
                  <p>{selectedUser.phone || '—'}</p>
                </div>

                <div className="detail-group">
                  <label>Role:</label>
                  <span className={`role-badge ${selectedUser.role}`}>
                    {selectedUser.role === 'admin' ? '🔑' : '👤'} {selectedUser.role}
                  </span>
                </div>

                <div className="detail-group">
                  <label>Gender:</label>
                  <p style={{ textTransform: 'capitalize' }}>{selectedUser.gender || '—'}</p>
                </div>

                <div className="detail-group">
                  <label>Date of Birth:</label>
                  <p>{selectedUser.date_of_birth ? new Date(selectedUser.date_of_birth).toLocaleDateString() : '—'}</p>
                </div>

                <div className="detail-group">
                  <label>Registered:</label>
                  <p>{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : '—'}</p>
                </div>

                <div className="detail-group">
                  <label>Last Login:</label>
                  <p>{selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleDateString() : '—'}</p>
                </div>

                <div className="detail-group">
                  <label>Travel Style:</label>
                  <p>{selectedUser.travelStyle || '—'}</p>
                </div>

                <div className="detail-group">
                  <label>Preferred Weather:</label>
                  <p>{selectedUser.address?.prefs?.preferred_weather || selectedUser.preferred_weather || '—'}</p>
                </div>

                <div className="detail-group">
                  <label>NIC / Passport:</label>
                  <p>{selectedUser.nic || '—'}</p>
                </div>
              </div>

              <div className="detail-section">
                <label>Interests:</label>
                <div className="interests-display">
                  {(selectedUser.interests || []).map((interest, idx) => (
                    <span key={idx} className="interest-tag">{interest}</span>
                  ))}
                  {(!selectedUser.interests || selectedUser.interests.length === 0) && <span>—</span>}
                </div>
              </div>

              <div className="detail-section" style={{ marginTop: '16px' }}>
                <label>🎯 Matched Destinations ({matchedDests.length}):</label>
                {matchedCats.length > 0 && (
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '4px 0 8px' }}>
                    Categories: {matchedCats.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}
                  </p>
                )}
                {matchLoading ? (
                  <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>Loading...</p>
                ) : matchedDests.length === 0 ? (
                  <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>No matching destinations (user has no preference-based matches)</p>
                ) : (
                  <div className="interests-display" style={{ flexWrap: 'wrap', gap: '6px' }}>
                    {matchedDests.map(d => {
                      const emojiMap = {
                        Temple: '🛕', Beach: '🏖️', Nature: '🌿', Heritage: '🏛️',
                        Museum: '🏛️', Safari: '🐘', Wildlife: '🦁', Garden: '🌸',
                        Lake: '🏞️', Market: '🛍️', Viewpoint: '🏔️', Culture: '🎭',
                        Adventure: '🧗', Park: '🌳', Shopping: '🛍️', 'Theme Park': '🎢',
                      }
                      return (
                        <span key={d.place_id} className="interest-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {emojiMap[d.type] || '📍'}
                          {d.name}
                          {d.rating > 0 && <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>⭐{d.rating.toFixed(1)}</span>}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                Close
              </button>
              <button type="button" className="btn-submit" onClick={() => {
                setShowModal(false)
                setTimeout(() => handleEdit(selectedUser), 100)
              }}>
                Edit User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
