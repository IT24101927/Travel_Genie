import { useState, useEffect, useCallback } from 'react'
import './UserManagement.css'
import { API_BASE } from '../../config/api'

const API = API_BASE
const authH = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

function UserManagement({ theme, toggleTheme }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toastMsg, setToastMsg] = useState('')

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
    interests: [], travelStyle: 'Culture'
  })

  const interestOptions = [
    'Beaches', 'Mountains', 'Historical', 'Cultural', 'Adventure',
    'Nature', 'Wildlife', 'Religious', 'City', 'Food',
    'Nightlife', 'Photography', 'Art', 'Shopping', 'Sports'
  ]

  const travelStyleOptions = ['Adventure', 'Relax', 'Culture', 'Luxury', 'Budget', 'Family', 'Backpacker']

  const [matchedDests, setMatchedDests] = useState([])
  const [matchedCats, setMatchedCats] = useState([])
  const [matchLoading, setMatchLoading] = useState(false)

  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000) }

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
      interests: user.interests || [],
      travelStyle: user.travelStyle || 'Culture'
    })
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
    try {
      const body = {
        name: formData.name, phone: formData.phone, role: formData.role,
        isActive: formData.isActive, gender: formData.gender || undefined,
        address: {
          ...(selectedUser.address || {}),
          travelStyle: formData.travelStyle,
          interests: formData.interests,
        },
      }
      if (formData.password) body.password = formData.password
      const res = await fetch(`${API}/users/${selectedUser.id}`, { method: 'PUT', headers: authH(), body: JSON.stringify(body) })
      const data = await res.json()
      if (data.success) { showToast('✅ User updated successfully'); await loadUsers() }
      else setError(data.message || 'Failed to update user')
      setShowModal(false)
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  // Handle Delete
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return
    try {
      const res = await fetch(`${API}/users/${id}`, { method: 'DELETE', headers: authH() })
      const data = await res.json()
      if (data.success) { showToast('✅ User deleted'); setUsers(u => u.filter(x => x.id !== id)) }
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
      {toastMsg && <div className="admin-toast">{toastMsg}</div>}
      {error && <div className="admin-error-banner">{error} <button onClick={() => setError('')}>✕</button></div>}

      {/* Header */}
      <div className="um-header">
        <div>
          <h1 className="um-title">User Account Management</h1>
          <p className="um-subtitle">Manage user accounts, preferences, and authentication</p>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <div className="user-stats">
        <h2 className="stats-title">👥 User Analytics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">👤</span>
            <div className="stat-content">
              <span className="stat-value">{loading ? '…' : stats.totalUsers}</span>
              <span className="stat-label">Total Users</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">✅</span>
            <div className="stat-content">
              <span className="stat-value">{loading ? '…' : stats.activeUsers}</span>
              <span className="stat-label">Active Users</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🔑</span>
            <div className="stat-content">
              <span className="stat-value">{loading ? '…' : stats.adminUsers}</span>
              <span className="stat-label">Administrators</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🆕</span>
            <div className="stat-content">
              <span className="stat-value">{loading ? '…' : stats.newUsersThisMonth}</span>
              <span className="stat-label">New This Month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="um-filters">
        <div className="filter-group">
          <label>🔍 Search</label>
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>🔑 Role</label>
          <select 
            value={filterRole} 
            onChange={(e) => setFilterRole(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="filter-group">
          <label>📊 Status</label>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="filter-group">
          <label>✈️ Travel Style</label>
          <select 
            value={filterTravelStyle} 
            onChange={(e) => setFilterTravelStyle(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Styles</option>
            {travelStyleOptions.map(style => (
              <option key={style} value={style}>{style}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>🔢 Sort By</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="createdAt">Registration Date</option>
            <option value="lastLogin">Last Login</option>
            <option value="name">Name</option>
          </select>
        </div>
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
                <th>Email</th>
                <th>Phone</th>
                <th>Gender</th>
                <th>Role</th>
                <th>Status</th>
                <th>Travel Style</th>
                <th>Interests</th>
                <th>Joined</th>
                <th>Actions</th>
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
                  <td>{user.email}</td>
                  <td>{user.phone || '—'}</td>
                  <td>
                    <span style={{ textTransform: 'capitalize' }}>
                      {user.gender ? `${user.gender === 'male' ? '♂' : user.gender === 'female' ? '♀' : '⚧'} ${user.gender}` : '—'}
                    </span>
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
                    ) : <span>—</span>}
                  </td>
                  <td>
                    <div className="interests-preview">
                      {(user.interests || []).slice(0, 2).map((interest, idx) => (
                        <span key={idx} className="interest-badge">{interest}</span>
                      ))}
                      {(user.interests || []).length > 2 && (
                        <span className="interest-more">+{(user.interests || []).length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td>
                  <td className="td-actions">
                    <div className="action-buttons">
                      <button 
                        className="btn-table-view" 
                        onClick={() => handleView(user)}
                        title="View"
                      >👁️</button>
                      <button 
                        className="btn-table-edit" 
                        onClick={() => handleEdit(user)}
                        title="Edit"
                      >✏️</button>
                      <button 
                        className="btn-table-delete" 
                        onClick={() => handleDelete(user.id)}
                        title="Delete"
                      >🗑️</button>
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

      {/* Edit Modal */}
      {showModal && modalMode === 'edit' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Edit User</h2>
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
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                      placeholder="e.g., John Doe"
                    />
                  </div>

                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                      placeholder="e.g., john@example.com"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>New Password (leave blank to keep)</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder="Min 6 characters"
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="e.g., +94 77 123 4567"
                    />
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
                          onChange={(e) => setFormData({...formData, travelStyle: e.target.value})}
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
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
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
                  <label>Age:</label>
                  <p>{selectedUser.age || '—'}</p>
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
                  <label>NIC:</label>
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
