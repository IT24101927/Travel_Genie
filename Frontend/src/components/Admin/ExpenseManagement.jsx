import { useState, useEffect, useCallback } from 'react'
import './ExpenseManagement.css'

const API = 'http://localhost:5000/api'
const authH = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

const mapExpense = (e) => ({
  id: e.id,
  userId: e.userId,
  userName: e.user?.name || 'Unknown User',
  category: e.category,
  description: e.description,
  amount: parseFloat(e.amount) || 0,
  currency: e.currency || 'USD',
  paymentMethod: e.paymentMethod || '',
  status: e.status,
  date: e.date,
  tripId: e.tripId,
  tripTitle: e.trip?.title || `Trip #${e.tripId}`,
  notes: e.notes || '',
})

function ExpenseManagement({ theme, toggleTheme }) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toastMsg, setToastMsg] = useState('')
  const [saving, setSaving] = useState(false)

  // Historical price data for trend analysis (static informational UI)
  const [historicalPrices] = useState({
    'Hotel Shangri-La': [
      { date: '2025-12-01', price: 195 },
      { date: '2026-01-01', price: 200 },
      { date: '2026-02-01', price: 220 },
      { date: '2026-02-15', price: 220 }
    ],
    'Sigiriya Entrance': [
      { date: '2025-12-01', price: 30 },
      { date: '2026-01-01', price: 30 },
      { date: '2026-02-01', price: 35 },
      { date: '2026-02-15', price: 35 }
    ],
    'Car Rental Daily': [
      { date: '2025-12-01', price: 40 },
      { date: '2026-01-01', price: 42 },
      { date: '2026-02-01', price: 45 },
      { date: '2026-02-15', price: 45 }
    ],
    'Whale Watching': [
      { date: '2025-12-01', price: 60 },
      { date: '2026-01-01', price: 62 },
      { date: '2026-02-01', price: 65 },
      { date: '2026-02-15', price: 65 }
    ]
  })

  // Price change alerts (static informational UI)
  const [priceAlerts] = useState([
    { id: 1, item: 'Hotel Shangri-La', category: 'Accommodation', oldPrice: 200, newPrice: 220, change: 10, type: 'increase', date: '2026-02-01', severity: 'medium' },
    { id: 2, item: 'Sigiriya Entrance', category: 'Activities', oldPrice: 30, newPrice: 35, change: 16.67, type: 'increase', date: '2026-02-01', severity: 'high' },
    { id: 3, item: 'Car Rental Daily', category: 'Transport', oldPrice: 42, newPrice: 45, change: 7.14, type: 'increase', date: '2026-02-01', severity: 'low' }
  ])

  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('add')
  const [selectedExpense, setSelectedExpense] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterUser, setFilterUser] = useState('all')
  const [sortBy, setSortBy] = useState('date')

  const [formData, setFormData] = useState({
    category: 'accommodation',
    description: '',
    amount: 0,
    currency: 'USD',
    paymentMethod: 'cash',
    status: 'pending',
    date: '',
    tripId: '',
    notes: ''
  })

  const categories = ['accommodation', 'transportation', 'food', 'activities', 'shopping', 'entertainment', 'emergency', 'other']
  const paymentMethods = ['cash', 'credit-card', 'debit-card', 'online-payment', 'bank-transfer', 'other']
  const users = [...new Set(expenses.map(e => e.userName))]

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  const loadExpenses = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/expenses/admin/all?limit=200`, { headers: authH() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to load expenses')
      setExpenses((data.data || []).map(mapExpense))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadExpenses() }, [loadExpenses])

  // Open Add Modal
  const handleAdd = () => {
    setModalMode('add')
    setFormData({ category: 'accommodation', description: '', amount: 0, currency: 'USD', paymentMethod: 'cash', status: 'pending', date: new Date().toISOString().split('T')[0], tripId: '', notes: '' })
    setShowModal(true)
  }

  // Open Edit Modal
  const handleEdit = (expense) => {
    setModalMode('edit')
    setSelectedExpense(expense)
    setFormData({
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency || 'USD',
      paymentMethod: expense.paymentMethod || 'cash',
      status: expense.status,
      date: expense.date ? expense.date.split('T')[0] : '',
      tripId: expense.tripId || '',
      notes: expense.notes || ''
    })
    setShowModal(true)
  }

  // Open Trends Modal
  const handleTrends = () => {
    setModalMode('trends')
    setShowModal(true)
  }

  // Open Alerts Modal
  const handleAlerts = () => {
    setModalMode('alerts')
    setShowModal(true)
  }

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        ...formData,
        amount: parseFloat(formData.amount),
        tripId: formData.tripId ? parseInt(formData.tripId) : undefined,
      }
      const url = modalMode === 'add' ? `${API}/expenses` : `${API}/expenses/${selectedExpense.id}`
      const method = modalMode === 'add' ? 'POST' : 'PUT'
      const res = await fetch(url, { method, headers: authH(), body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to save expense')
      showToast(modalMode === 'add' ? 'Expense added!' : 'Expense updated!')
      setShowModal(false)
      loadExpenses()
    } catch (err) {
      showToast('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Handle Delete
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return
    try {
      const res = await fetch(`${API}/expenses/${id}`, { method: 'DELETE', headers: authH() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to delete expense')
      setExpenses(expenses.filter(e => e.id !== id))
      showToast('Expense deleted!')
    } catch (err) {
      showToast('Error: ' + err.message)
    }
  }

  // Calculate Budget Statistics
  const calculateStats = () => {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0)
    const paid = expenses.filter(e => e.status === 'paid' || e.status === 'settled').reduce((sum, e) => sum + e.amount, 0)
    const pending = expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0)
    return { total, paid, pending, count: expenses.length }
  }

  // Calculate Category Breakdown
  const getCategoryBreakdown = () => {
    const breakdown = {}
    categories.forEach(cat => {
      const catExpenses = expenses.filter(e => e.category === cat)
      breakdown[cat] = {
        total: catExpenses.reduce((sum, e) => sum + e.amount, 0),
        count: catExpenses.length
      }
    })
    return breakdown
  }

  // Filter and Sort Expenses
  const filteredExpenses = expenses
    .filter(expense => {
      const matchesSearch = (expense.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (expense.userName || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = filterCategory === 'all' || expense.category === filterCategory
      const matchesStatus = filterStatus === 'all' || expense.status === filterStatus
      const matchesUser = filterUser === 'all' || expense.userName === filterUser
      return matchesSearch && matchesCategory && matchesStatus && matchesUser
    })
    .sort((a, b) => {
      switch(sortBy) {
        case 'date': return new Date(b.date) - new Date(a.date)
        case 'amount': return b.amount - a.amount
        default: return 0
      }
    })

  const stats = calculateStats()
  const categoryBreakdown = getCategoryBreakdown()

  return (
    <div className="expense-management">
      {toastMsg && (
        <div className="toast-notification" style={{position:'fixed',top:20,right:20,background:'#4caf50',color:'#fff',padding:'12px 20px',borderRadius:8,zIndex:9999,boxShadow:'0 4px 12px rgba(0,0,0,0.2)'}}>
          {toastMsg}
        </div>
      )}
      {error && (
        <div style={{background:'#f44336',color:'#fff',padding:'10px 16px',borderRadius:6,marginBottom:12}}>
          Error: {error} — <button onClick={loadExpenses} style={{background:'none',border:'none',color:'#fff',textDecoration:'underline',cursor:'pointer'}}>Retry</button>
        </div>
      )}

      {/* Header */}
      <div className="em-header">
        <div>
          <h1 className="em-title">Expense Management</h1>
          <p className="em-subtitle">Track budgets, monitor spending, and analyze price trends</p>
        </div>
        <div className="header-actions">
          <button className="btn-alerts" onClick={handleAlerts}>
            🔔 Price Alerts ({priceAlerts.length})
          </button>
          <button className="btn-trends" onClick={handleTrends}>
            📈 View Trends
          </button>
          <button className="btn-add-expense" onClick={handleAdd}>
            ➕ Add Expense
          </button>
        </div>
      </div>

      {/* Budget Overview Stats */}
      <div className="budget-overview glass-card">
        <h2 className="overview-title">💰 Budget Overview</h2>
        <div className="budget-cards">
          <div className="budget-card">
            <span className="budget-label">Total Expenses</span>
            <span className="budget-value">{loading ? '…' : stats.count}</span>
          </div>
          <div className="budget-card">
            <span className="budget-label">Total Amount</span>
            <span className="budget-value spent">{loading ? '…' : `$${stats.total.toFixed(2)}`}</span>
          </div>
          <div className="budget-card">
            <span className="budget-label">Paid / Settled</span>
            <span className="budget-value under">{loading ? '…' : `$${stats.paid.toFixed(2)}`}</span>
          </div>
          <div className="budget-card">
            <span className="budget-label">Pending</span>
            <span className={`budget-value ${stats.pending > 0 ? 'over' : 'under'}`}>
              {loading ? '…' : `$${stats.pending.toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* Budget Progress Bar */}
        <div className="budget-progress-container">
          <div className="progress-labels">
            <span>Payment Progress</span>
            <span>{stats.total > 0 ? ((stats.paid / stats.total) * 100).toFixed(1) : 0}% paid</span>
          </div>
          <div className="budget-progress-bar">
            <div
              className="budget-progress-fill"
              style={{ width: `${stats.total > 0 ? Math.min((stats.paid / stats.total) * 100, 100) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="category-breakdown glass-card">
        <h2 className="section-title">📊 Expense Breakdown by Category</h2>
        <div className="category-grid">
          {Object.entries(categoryBreakdown).filter(([,data]) => data.count > 0).map(([category, data]) => (
            <div key={category} className="category-card">
              <h3>{category}</h3>
              <div className="category-amounts">
                <div className="amount-row">
                  <span className="amount-label">Total:</span>
                  <span className="amount-value">${data.total.toFixed(2)}</span>
                </div>
              </div>
              <span className="category-count">{data.count} expense{data.count !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="em-filters glass-card">
        <div className="filter-group">
          <label>🔍 Search</label>
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>🏷️ Category</label>
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
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
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="settled">Settled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="filter-group">
          <label>👤 User</label>
          <select 
            value={filterUser} 
            onChange={(e) => setFilterUser(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Users</option>
            {users.map(user => (
              <option key={user} value={user}>{user}</option>
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
            <option value="date">Date</option>
            <option value="amount">Amount</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="expenses-table-container glass-card">
        {loading ? (
          <div style={{textAlign:'center',padding:'40px',color:'var(--text-secondary)'}}><p>⏳ Loading expenses...</p></div>
        ) : filteredExpenses.length > 0 ? (
          <table className="expenses-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Category</th>
                <th>Description</th>
                <th>Trip</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map(expense => (
                <tr key={expense.id}>
                  <td>{new Date(expense.date).toLocaleDateString()}</td>
                  <td>
                    <div className="user-cell">
                      <span className="user-icon">👤</span>
                      {expense.userName}
                    </div>
                  </td>
                  <td>
                    <span className="category-badge">{expense.category}</span>
                  </td>
                  <td className="td-description">{expense.description}</td>
                  <td>🗺️ {expense.tripTitle}</td>
                  <td>
                    <span className="amount-badge actual">${expense.amount.toFixed(2)} {expense.currency}</span>
                  </td>
                  <td>{expense.paymentMethod}</td>
                  <td>
                    <span className={`status-badge status-${expense.status}`}>
                      {expense.status}
                    </span>
                  </td>
                  <td className="td-actions">
                    <div className="action-buttons">
                      <button className="btn-table-edit" onClick={() => handleEdit(expense)} title="Edit">✏️</button>
                      <button className="btn-table-delete" onClick={() => handleDelete(expense.id)} title="Delete">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">💰</span>
            <h3>No expenses found</h3>
            <p>Try adjusting your filters or add a new expense</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (modalMode === 'add' || modalMode === 'edit') && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalMode === 'add' ? '➕ Add New Expense' : '✏️ Edit Expense'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="expense-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} required>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Payment Method *</label>
                  <select value={formData.paymentMethod} onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})} required>
                    {paymentMethods.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required placeholder="e.g., Hotel stay, Transport, etc." />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Amount *</label>
                  <input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required min="0" step="0.01" />
                </div>
                <div className="form-group">
                  <label>Currency</label>
                  <input type="text" value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})} placeholder="USD" maxLength={3} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Trip ID *</label>
                  <input type="number" value={formData.tripId} onChange={(e) => setFormData({...formData, tripId: e.target.value})} required placeholder="e.g., 1" />
                </div>
                <div className="form-group">
                  <label>Date *</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required />
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="settled">Settled</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows="2" placeholder="Optional notes..." />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={saving}>
                  {saving ? 'Saving...' : (modalMode === 'add' ? 'Add Expense' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trends Modal */}
      {showModal && modalMode === 'trends' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-large glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📈 Travel Cost Trend Analysis</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="trends-container">
              <p className="trends-info">Historical price tracking for popular travel services</p>
              
              {Object.entries(historicalPrices).map(([item, prices]) => {
                const priceChange = prices[prices.length - 1].price - prices[0].price
                const changePercent = (priceChange / prices[0].price) * 100
                
                return (
                  <div key={item} className="trend-card glass-card">
                    <div className="trend-header">
                      <h3>{item}</h3>
                      <div className="trend-change">
                        <span className={`change-amount ${priceChange >= 0 ? 'increase' : 'decrease'}`}>
                          {priceChange >= 0 ? '↑' : '↓'} ${Math.abs(priceChange).toFixed(2)}
                        </span>
                        <span className={`change-percent ${priceChange >= 0 ? 'increase' : 'decrease'}`}>
                          ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    
                    <div className="trend-chart">
                      {prices.map((point, index) => {
                        const maxPrice = Math.max(...prices.map(p => p.price))
                        const minPrice = Math.min(...prices.map(p => p.price))
                        const range = maxPrice - minPrice
                        const height = range > 0 ? ((point.price - minPrice) / range) * 100 : 50
                        
                        return (
                          <div key={index} className="chart-point">
                            <div 
                              className="chart-bar"
                              style={{ height: `${height}%` }}
                            >
                              <span className="bar-value">${point.price}</span>
                            </div>
                            <span className="chart-label">
                              {new Date(point.date).toLocaleDateString('en', { month: 'short' })}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Modal */}
      {showModal && modalMode === 'alerts' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-large glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔔 Price Change Alerts</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="alerts-container">
              <p className="alerts-info">
                Recent price changes detected across travel services. Monitor significant changes to adjust budgets.
              </p>
              
              <div className="alerts-list">
                {priceAlerts.map(alert => (
                  <div key={alert.id} className={`alert-card glass-card severity-${alert.severity}`}>
                    <div className="alert-icon">
                      {alert.severity === 'high' ? '🔴' : alert.severity === 'medium' ? '🟡' : '🟢'}
                    </div>
                    <div className="alert-content">
                      <div className="alert-header">
                        <h3>{alert.item}</h3>
                        <span className="alert-category">{alert.category}</span>
                      </div>
                      <div className="alert-details">
                        <div className="price-comparison">
                          <span className="old-price">${alert.oldPrice}</span>
                          <span className="arrow">→</span>
                          <span className="new-price">${alert.newPrice}</span>
                        </div>
                        <div className={`alert-change ${alert.type}`}>
                          {alert.type === 'increase' ? '↑' : '↓'} {alert.change.toFixed(1)}% {alert.type}
                        </div>
                      </div>
                      <div className="alert-meta">
                        <span>📅 {new Date(alert.date).toLocaleDateString()}</span>
                        <span className={`severity-badge ${alert.severity}`}>
                          {alert.severity} priority
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {priceAlerts.length === 0 && (
                <div className="no-alerts">
                  <span className="empty-icon">✅</span>
                  <h3>No price alerts</h3>
                  <p>All prices are stable. We'll notify you when changes occur.</p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExpenseManagement
