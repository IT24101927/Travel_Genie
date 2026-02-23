import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './ExpenseTracker.css'

const API = 'http://localhost:5000/api'

/* ─────────────────────── constants ─────────────────────── */
const CATEGORIES = [
  { id: 'accommodation',  label: 'Accommodation',  icon: '🏨', color: '#0E7C5F' },
  { id: 'transportation', label: 'Transport',       icon: '🚗', color: '#3b82f6' },
  { id: 'food',           label: 'Food & Drink',    icon: '🍽️', color: '#f59e0b' },
  { id: 'activities',     label: 'Activities',      icon: '🎯', color: '#8b5cf6' },
  { id: 'shopping',       label: 'Shopping',        icon: '🛍️', color: '#ec4899' },
  { id: 'entertainment',  label: 'Entertainment',   icon: '🎭', color: '#06b6d4' },
  { id: 'emergency',      label: 'Emergency',       icon: '🚨', color: '#ef4444' },
  { id: 'other',          label: 'Other',           icon: '📦', color: '#6b7280' },
]
const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

const PAYMENT_METHODS = [
  { id: 'cash',           label: 'Cash' },
  { id: 'credit-card',    label: 'Credit Card' },
  { id: 'debit-card',     label: 'Debit Card' },
  { id: 'online-payment', label: 'Online Payment' },
  { id: 'bank-transfer',  label: 'Bank Transfer' },
  { id: 'other',          label: 'Other' },
]

/* trend thresholds */
const ALERT_THRESHOLD = 0.9   // 90% of budget → orange warning
const DANGER_THRESHOLD = 1.0  // 100% → red alert

/* price-trend seed data for Sri Lanka travel costs (USD) */
const PRICE_TRENDS_SEED = {
  accommodation:  [62, 68, 71, 74, 70, 73, 78, 80, 75, 72, 69, 74],
  transportation: [28, 30, 32, 31, 29, 33, 36, 38, 35, 31, 28, 30],
  food:           [18, 19, 20, 21, 21, 22, 24, 25, 23, 21, 19, 20],
  activities:     [22, 24, 26, 28, 27, 30, 33, 35, 32, 28, 24, 26],
  shopping:       [15, 16, 18, 20, 19, 22, 25, 27, 24, 20, 16, 18],
  entertainment:  [12, 13, 14, 15, 15, 16, 18, 19, 17, 15, 13, 14],
  emergency:      [50, 52, 55, 58, 56, 60, 65, 67, 63, 58, 52, 55],
  other:          [10, 11, 12, 13, 12, 13, 15, 16, 14, 12, 11, 12],
}
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

/* ─────────────────────── helpers ─────────────────────── */
function getUser() {
  try { return JSON.parse(localStorage.getItem('currentUser')) } catch { return null }
}
function getToken() { return localStorage.getItem('token') || '' }

function fmt(val) {
  return `$${Number(val || 0).toFixed(2)}`
}
function pct(spent, budget) {
  if (!budget) return null
  return Math.min(Math.round((spent / budget) * 100), 999)
}
function dateFmt(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/* ── ls helpers for local (non-API) expenses ── */
function lsKey(tripId) { return `expenses_trip_${tripId}` }
function loadLocal(tripId) {
  try { return JSON.parse(localStorage.getItem(lsKey(tripId))) || [] } catch { return [] }
}
function saveLocal(tripId, data) {
  localStorage.setItem(lsKey(tripId), JSON.stringify(data))
}

/* ── trend helpers ── */
function loadTrends() {
  try {
    const stored = JSON.parse(localStorage.getItem('expenseTrends') || '{}')
    // merge defaults where missing
    return Object.fromEntries(
      CATEGORIES.map(c => [c.id, stored[c.id] || PRICE_TRENDS_SEED[c.id] || []])
    )
  } catch { return PRICE_TRENDS_SEED }
}
function saveTrends(trends) {
  localStorage.setItem('expenseTrends', JSON.stringify(trends))
}
/* push a new actual data point into the trend for the current month */
function pushTrend(category, amount) {
  const trends = loadTrends()
  const month  = new Date().getMonth()
  if (!trends[category]) trends[category] = [...(PRICE_TRENDS_SEED[category] || [])]
  trends[category][month] = parseFloat(
    ((trends[category][month] || 0) * 0.7 + amount * 0.3).toFixed(2)
  )
  saveTrends(trends)
}

/* ─────────────────────── Logo ─────────────────────────── */
function TGLogo() {
  return (
    <svg viewBox="0 0 32 32" fill="none" style={{ width: 28, height: 28 }}>
      <circle cx="16" cy="16" r="16" fill="#0E7C5F" />
      <path d="M8 22 L16 8 L24 22 Z" fill="white" fillOpacity=".9" />
      <circle cx="16" cy="19" r="3" fill="#F5C842" />
    </svg>
  )
}

/* ─────────────────────── Mini Sparkline ─────────────────── */
function Sparkline({ data, color = '#0E7C5F', width = 140, height = 40 }) {
  if (!data || data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pad = 4

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2)
    const y = height - pad - ((v - min) / range) * (height - pad * 2)
    return `${x},${y}`
  })

  const last2 = data.slice(-2)
  const trend = last2[1] > last2[0] ? '↑' : last2[1] < last2[0] ? '↓' : '→'
  const trendColor = last2[1] > last2[0] ? '#ef4444' : '#0E7C5F'

  return (
    <div className="et-sparkline">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
        <defs>
          <linearGradient id={`sg-${color?.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`${pad},${height} ${pts.join(' ')} ${width - pad},${height}`}
          fill={`url(#sg-${color?.replace('#','')})`}
        />
        <polyline
          points={pts.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p, i) => i === data.length - 1 && (
          <circle key={i} cx={p.split(',')[0]} cy={p.split(',')[1]} r="3.5" fill={color} />
        ))}
      </svg>
      <span className="et-spark-trend" style={{ color: trendColor }}>{trend}</span>
    </div>
  )
}

/* ─────────────────────── Radial donut ──────────────────── */
function DonutChart({ segments, size = 140 }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (!total) return <div className="et-donut-empty">No data</div>

  const r = 48, cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  let offset = 0

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="et-donut">
      {segments.map((seg, i) => {
        const frac = seg.value / total
        const dash = frac * circ
        const gap  = circ - dash
        const el = (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="22"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            style={{ transform: `rotate(-90deg)`, transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dasharray .5s ease' }}
          />
        )
        offset += dash
        return el
      })}
      <circle cx={cx} cy={cy} r={37} fill="var(--et-card,#fff)" />
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--et-text,#1a2b2a)">
        {fmt(total).replace('.00', '')}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="var(--et-muted,#6b7280)">
        TOTAL
      </text>
    </svg>
  )
}

/* ─────────────────────── Expense Form ─────────────────── */
const BLANK_FORM = {
  description: '', category: 'food', amount: '', currency: 'USD',
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: 'cash', notes: '', tags: '',
}

function ExpenseForm({ initial, tripId, onSave, onCancel }) {
  const [form, setForm] = useState(initial || BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.description.trim()) { setError('Description is required'); return }
    if (!form.amount || isNaN(form.amount) || +form.amount <= 0) { setError('Enter a valid amount'); return }
    if (!tripId) { setError('No trip selected'); return }
    setError(''); setSaving(true)

    const tags = typeof form.tags === 'string'
      ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
      : form.tags

    const payload = { ...form, amount: parseFloat(form.amount), tripId, tags }
    await onSave(payload)
    setSaving(false)
  }

  return (
    <form className="et-form" onSubmit={submit}>
      <div className="et-form-grid">
        <div className="et-fg et-fg-full">
          <label>Description *</label>
          <input className="et-input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. Lunch at a beachside café" />
        </div>

        <div className="et-fg">
          <label>Category *</label>
          <div className="et-cat-pills">
            {CATEGORIES.map(c => (
              <button key={c.id} type="button"
                className={`et-cat-pill${form.category === c.id ? ' active' : ''}`}
                style={form.category === c.id ? { background: c.color, borderColor: c.color } : {}}
                onClick={() => set('category', c.id)}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="et-fg">
          <label>Amount *</label>
          <div className="et-amount-wrap">
            <select className="et-select et-currency-sel" value={form.currency} onChange={e => set('currency', e.target.value)}>
              <option value="USD">USD $</option>
              <option value="LKR">LKR ₨</option>
              <option value="EUR">EUR €</option>
              <option value="GBP">GBP £</option>
            </select>
            <input className="et-input" type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" />
          </div>
        </div>

        <div className="et-fg">
          <label>Date</label>
          <input className="et-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </div>

        <div className="et-fg">
          <label>Payment Method</label>
          <select className="et-select" value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}>
            {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>

        <div className="et-fg">
          <label>Tags (comma-separated)</label>
          <input className="et-input" value={typeof form.tags === 'string' ? form.tags : (form.tags || []).join(', ')} onChange={e => set('tags', e.target.value)} placeholder="dinner, beach, must-try" />
        </div>

        <div className="et-fg et-fg-full">
          <label>Notes</label>
          <textarea className="et-textarea" rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes…" />
        </div>
      </div>

      {error && <p className="et-error">{error}</p>}

      <div className="et-form-actions">
        <button type="button" className="et-btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="et-btn-primary" disabled={saving}>
          {saving ? 'Saving…' : (initial ? 'Save Changes' : 'Add Expense')}
        </button>
      </div>
    </form>
  )
}

/* ─────────────────────── Alert Banner ──────────────────── */
function AlertBanner({ alerts }) {
  const [dismissed, setDismissed] = useState([])
  const visible = alerts.filter((_, i) => !dismissed.includes(i))
  if (!visible.length) return null
  return (
    <div className="et-alerts">
      {visible.map((a, i) => (
        <div key={i} className={`et-alert et-alert-${a.level}`}>
          <span className="et-alert-icon">{a.level === 'danger' ? '🚨' : '⚠️'}</span>
          <span className="et-alert-msg">{a.message}</span>
          <button className="et-alert-close" onClick={() => setDismissed(d => [...d, i])}>✕</button>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Main ExpenseTracker Page
   ══════════════════════════════════════════════════════════ */
export default function ExpenseTracker({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const user   = getUser()
  const token  = getToken()

  /* ── nav ── */
  const [menuOpen, setMenuOpen] = useState(false)

  /* ── trips ── */
  const [trips,       setTrips]       = useState([])
  const [activeTripId, setActiveTripId] = useState('all')

  /* ── expenses ── */
  const [expenses,    setExpenses]    = useState([])
  const [loading,     setLoading]     = useState(false)
  const [useBackend,  setUseBackend]  = useState(false)

  /* ── form/modal ── */
  const [showForm,    setShowForm]    = useState(false)
  const [editTarget,  setEditTarget]  = useState(null)

  /* ── ui ── */
  const [activeTab,   setActiveTab]   = useState('overview')  // overview | list | trends
  const [filterCat,   setFilterCat]   = useState('all')
  const [sortBy,      setSortBy]      = useState('date-desc')
  const [searchQ,     setSearchQ]     = useState('')

  /* ── trends ── */
  const [trends,      setTrends]      = useState(loadTrends())

  /* ── budget map: tripId → number ── */
  const [budgets,     setBudgets]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('tripBudgets') || '{}') } catch { return {} }
  })
  const [budgetEdit,  setBudgetEdit]  = useState(false)
  const [budgetInput, setBudgetInput] = useState('')

  /* ── redirect ── */
  useEffect(() => {
    if (!user) { navigate('/login'); return }
    const raw = localStorage.getItem('myTrips')
    if (raw) {
      const t = JSON.parse(raw)
      setTrips(t)
      if (t.length > 0 && activeTripId === 'all') {/* keep all selected */}
    }
  }, []) // eslint-disable-line

  /* ── fetch expenses ── */
  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    let loaded = []
    let apiOk  = false

    // try backend for each real trip
    if (token && activeTripId !== 'all') {
      try {
        const res  = await fetch(`${API}/expenses/trip/${activeTripId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (res.ok && data.success) {
          loaded = data.data || []
          apiOk  = true
        }
      } catch { /* try all-expenses */ }

      if (!apiOk) {
        try {
          const res  = await fetch(`${API}/expenses?limit=200`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          const data = await res.json()
          if (res.ok && data.success) {
            loaded = (data.data || []).filter(e => String(e.tripId) === String(activeTripId))
            apiOk  = true
          }
        } catch { /* fallthrough */ }
      }
    } else if (token && activeTripId === 'all') {
      try {
        const res  = await fetch(`${API}/expenses?limit=200`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (res.ok && data.success) { loaded = data.data || []; apiOk = true }
      } catch { /* fallthrough */ }
    }

    setUseBackend(apiOk)

    if (!apiOk) {
      if (activeTripId === 'all') {
        const allTrips = trips.length > 0 ? trips : JSON.parse(localStorage.getItem('myTrips') || '[]')
        loaded = allTrips.flatMap(t => loadLocal(t.id || t._id))
        // also load a standalone key
        const standalone = loadLocal('standalone')
        loaded = [...standalone, ...loaded]
      } else {
        loaded = loadLocal(activeTripId)
      }
    }

    setExpenses(loaded)
    setLoading(false)
  }, [activeTripId, token, trips]) // eslint-disable-line

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  /* ── save expense ── */
  const handleSave = async (payload) => {
    const tripId = activeTripId === 'all' ? 'standalone' : activeTripId

    if (useBackend || (token && activeTripId !== 'all' && activeTripId !== 'standalone')) {
      try {
        const url    = editTarget ? `${API}/expenses/${editTarget.id}` : `${API}/expenses`
        const method = editTarget ? 'PUT' : 'POST'
        const body   = { ...payload, tripId: activeTripId !== 'all' ? activeTripId : undefined }

        const res  = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (res.ok && data.success) {
          pushTrend(payload.category, payload.amount)
          setTrends(loadTrends())
          setShowForm(false); setEditTarget(null)
          fetchExpenses()
          return
        }
      } catch { /* fallthrough to local */ }
    }

    /* local save */
    const existing = loadLocal(tripId)
    let updated
    if (editTarget) {
      updated = existing.map(e => e.id === editTarget.id ? { ...e, ...payload } : e)
    } else {
      const newE = { ...payload, id: `local_${Date.now()}`, createdAt: new Date().toISOString() }
      updated = [newE, ...existing]
    }
    saveLocal(tripId, updated)
    pushTrend(payload.category, payload.amount)
    setTrends(loadTrends())
    setExpenses(prev => editTarget
      ? prev.map(e => e.id === editTarget.id ? { ...e, ...payload } : e)
      : [{ ...payload, id: `local_${Date.now()}`, createdAt: new Date().toISOString() }, ...prev]
    )
    setShowForm(false); setEditTarget(null)
  }

  /* ── delete ── */
  const handleDelete = async (exp) => {
    if (!window.confirm('Delete this expense?')) return

    if (!String(exp.id).startsWith('local_') && token) {
      try {
        const res = await fetch(`${API}/expenses/${exp.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) { fetchExpenses(); return }
      } catch { /* fallthrough */ }
    }

    const tripId = activeTripId === 'all' ? 'standalone' : activeTripId
    const existing = loadLocal(tripId)
    const updated  = existing.filter(e => e.id !== exp.id)
    saveLocal(tripId, updated)
    setExpenses(prev => prev.filter(e => e.id !== exp.id))
  }

  /* ── budget persistence ── */
  const saveBudget = (tripId, val) => {
    const next = { ...budgets, [tripId]: parseFloat(val) || 0 }
    setBudgets(next)
    localStorage.setItem('tripBudgets', JSON.stringify(next))
  }

  /* ── derived stats ── */
  const budget     = budgets[activeTripId] || 0
  const totalSpent = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const budgetPct  = pct(totalSpent, budget)
  const remaining  = budget ? budget - totalSpent : null

  const byCategory = useMemo(() => {
    const acc = {}
    expenses.forEach(e => {
      acc[e.category] = (acc[e.category] || 0) + (e.amount || 0)
    })
    return CATEGORIES
      .map(c => ({ ...c, value: acc[c.id] || 0, pct: totalSpent ? Math.round((acc[c.id] || 0) / totalSpent * 100) : 0 }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [expenses, totalSpent])

  /* ── alerts ── */
  const alerts = useMemo(() => {
    const a = []
    if (budget && budgetPct >= DANGER_THRESHOLD * 100) {
      a.push({ level: 'danger', message: `🚨 Budget exceeded! Spent ${fmt(totalSpent)} of ${fmt(budget)} (${budgetPct}%)` })
    } else if (budget && budgetPct >= ALERT_THRESHOLD * 100) {
      a.push({ level: 'warn', message: `⚠️ Approaching budget limit — ${budgetPct}% spent (${fmt(totalSpent)} / ${fmt(budget)})` })
    }
    // trend alerts
    const month = new Date().getMonth()
    CATEGORIES.forEach(c => {
      const hist = trends[c.id]
      if (!hist || hist.length < 3) return
      const prev = (hist[month - 1] + hist[Math.max(0, month - 2)]) / 2
      const curr = hist[month]
      if (curr > prev * 1.2) {
        a.push({ level: 'warn', message: `📈 ${c.label} costs are up ~${Math.round((curr / prev - 1) * 100)}% vs last month in Sri Lanka` })
      }
    })
    return a
  }, [budget, budgetPct, totalSpent, trends])

  /* ── filtered list ── */
  const filteredExpenses = useMemo(() => {
    let list = [...expenses]
    if (filterCat !== 'all') list = list.filter(e => e.category === filterCat)
    if (searchQ) {
      const q = searchQ.toLowerCase()
      list = list.filter(e =>
        e.description?.toLowerCase().includes(q) ||
        e.notes?.toLowerCase().includes(q) ||
        (e.tags || []).some(t => t.toLowerCase().includes(q))
      )
    }
    switch (sortBy) {
      case 'date-desc': list.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)); break
      case 'date-asc':  list.sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt)); break
      case 'amount-desc': list.sort((a, b) => b.amount - a.amount); break
      case 'amount-asc':  list.sort((a, b) => a.amount - b.amount); break
      default: break
    }
    return list
  }, [expenses, filterCat, searchQ, sortBy])

  /* ── trip label ── */
  const activeTrip = trips.find(t => String(t.id || t._id) === String(activeTripId))
  const tripLabel  = activeTrip ? activeTrip.tripName || activeTrip.destinationName : 'All Trips'

  /* ── edit helper ── */
  const openEdit = (exp) => {
    setEditTarget(exp)
    setShowForm(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    navigate('/login')
  }

  return (
    <div className="et-page" data-theme={theme}>

      {/* ════ NAV ════ */}
      <nav className="dashboard-nav glass-nav">
        <div className="nav-container">
          <Link to="/" className="logo"><TGLogo /><span>TravelGenie</span></Link>
          <button className="menu-toggle" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
            <span className={`hamburger ${menuOpen ? 'open' : ''}`} />
          </button>
          <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
            <li><Link to="/dashboard">Dashboard</Link></li>
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

      {/* ════ HERO ════ */}
      <header className="et-hero">
        <div className="et-hero-deco" />
        <div className="et-hero-inner">
          <div className="et-hero-text">
            <p className="et-eyebrow">💰 Expense Tracker</p>
            <h1 className="et-hero-title">Budget &amp; Spending</h1>
            <p className="et-hero-sub">Track expenses, monitor trends, stay on budget.</p>
          </div>

          {/* trip selector */}
          <div className="et-trip-selector">
            <label className="et-trip-label">Viewing:</label>
            <select
              className="et-trip-select"
              value={activeTripId}
              onChange={e => setActiveTripId(e.target.value)}
            >
              <option value="all">All Trips</option>
              {trips.map(t => (
                <option key={t.id || t._id} value={t.id || t._id}>
                  {t.tripName || t.destinationName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* ════ ALERTS ════ */}
      <div className="et-alerts-wrap">
        <AlertBanner alerts={alerts} />
      </div>

      {/* ════ CONTENT ════ */}
      <div className="et-body">

        {/* ── Budget bar ── */}
        <div className="et-budget-card">
          <div className="et-budget-info">
            <div className="et-budget-spent">
              <span className="et-big-num">{fmt(totalSpent)}</span>
              <span className="et-big-lbl">spent</span>
            </div>
            {budget > 0 && (
              <>
                <div className="et-budget-of">of</div>
                <div className="et-budget-total">
                  {budgetEdit ? (
                    <span className="et-budget-edit-wrap">
                      <input
                        className="et-input et-budget-input"
                        type="number"
                        value={budgetInput}
                        onChange={e => setBudgetInput(e.target.value)}
                        autoFocus
                      />
                      <button className="et-btn-primary et-btn-sm" onClick={() => {
                        saveBudget(activeTripId, budgetInput)
                        setBudgetEdit(false)
                      }}>Save</button>
                      <button className="et-btn-ghost et-btn-sm" onClick={() => setBudgetEdit(false)}>✕</button>
                    </span>
                  ) : (
                    <span
                      className="et-budget-val"
                      onClick={() => { setBudgetInput(String(budget)); setBudgetEdit(true) }}
                      title="Click to edit budget"
                    >
                      {fmt(budget)} <span className="et-edit-hint">✏️</span>
                    </span>
                  )}
                  <span className="et-big-lbl">budget</span>
                </div>
              </>
            )}
            {!budget && (
              <button className="et-set-budget-btn" onClick={() => { setBudgetInput(''); setBudgetEdit(true) }}>
                + Set Budget
              </button>
            )}
            {budget > 0 && remaining !== null && (
              <div className={`et-remaining${remaining < 0 ? ' over' : ''}`}>
                <span>{remaining >= 0 ? `${fmt(remaining)} remaining` : `${fmt(Math.abs(remaining))} over budget`}</span>
              </div>
            )}
          </div>

          {budget > 0 && (
            <div className="et-budget-bar-wrap">
              <div className="et-budget-bar">
                <div
                  className={`et-budget-fill${budgetPct >= 100 ? ' over' : budgetPct >= 90 ? ' warn' : ''}`}
                  style={{ width: `${Math.min(budgetPct || 0, 100)}%` }}
                />
              </div>
              <span className="et-budget-pct">{budgetPct ?? 0}%</span>
            </div>
          )}

          {budgetEdit && !budget && (
            <div className="et-set-budget-form">
              <input
                className="et-input"
                type="number"
                placeholder="Enter total budget (USD)"
                value={budgetInput}
                onChange={e => setBudgetInput(e.target.value)}
                autoFocus
              />
              <button className="et-btn-primary" onClick={() => {
                saveBudget(activeTripId === 'all' ? 'all' : activeTripId, budgetInput)
                setBudgetEdit(false)
              }}>Set Budget</button>
              <button className="et-btn-ghost" onClick={() => setBudgetEdit(false)}>Cancel</button>
            </div>
          )}

          <button
            className="et-add-btn"
            onClick={() => { setEditTarget(null); setShowForm(s => !s) }}
          >
            {showForm ? '✕ Cancel' : '+ Add Expense'}
          </button>
        </div>

        {/* ── Add/Edit form ── */}
        {showForm && (
          <div className="et-form-wrap">
            <ExpenseForm
              initial={editTarget ? {
                ...editTarget,
                date: editTarget.date ? new Date(editTarget.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                tags: Array.isArray(editTarget.tags) ? editTarget.tags.join(', ') : editTarget.tags || '',
              } : BLANK_FORM}
              tripId={activeTripId !== 'all' ? activeTripId : 'standalone'}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditTarget(null) }}
            />
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="et-tabs">
          {[
            { id: 'overview', label: '📊 Overview' },
            { id: 'list',     label: '📋 All Expenses' },
            { id: 'trends',   label: '📈 Price Trends' },
          ].map(t => (
            <button
              key={t.id}
              className={`et-tab${activeTab === t.id ? ' active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════ OVERVIEW TAB ══════ */}
        {activeTab === 'overview' && (
          <div className="et-overview">
            {/* summary stats */}
            <div className="et-stat-row">
              {[
                { label: 'Total Spent',    val: fmt(totalSpent),                        icon: '💸', color: '#0E7C5F' },
                { label: 'No. Expenses',   val: expenses.length,                         icon: '🧾', color: '#3b82f6' },
                { label: 'Avg per Expense',val: fmt(expenses.length ? totalSpent / expenses.length : 0), icon: '📐', color: '#f59e0b' },
                { label: 'Top Category',   val: byCategory[0] ? `${byCategory[0].icon} ${byCategory[0].label}` : '—', icon: '', color: '#8b5cf6' },
              ].map((s, i) => (
                <div key={i} className="et-stat-card">
                  <div className="et-stat-ico" style={{ background: `${s.color}1A` }}>{s.icon}</div>
                  <div>
                    <div className="et-stat-val">{s.val}</div>
                    <div className="et-stat-lbl">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* donut + breakdown */}
            <div className="et-overview-grid">
              <div className="et-card">
                <h3 className="et-card-title">Spending Breakdown</h3>
                <div className="et-donut-row">
                  <DonutChart
                    segments={byCategory.map(c => ({ color: c.color, value: c.value }))}
                    size={150}
                  />
                  <div className="et-legend">
                    {byCategory.map(c => (
                      <div key={c.id} className="et-legend-row">
                        <span className="et-legend-dot" style={{ background: c.color }} />
                        <span className="et-legend-ico">{c.icon}</span>
                        <span className="et-legend-lbl">{c.label}</span>
                        <span className="et-legend-val">{fmt(c.value)}</span>
                        <span className="et-legend-pct">{c.pct}%</span>
                      </div>
                    ))}
                    {byCategory.length === 0 && (
                      <p className="et-empty-small">No expenses yet</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="et-card">
                <h3 className="et-card-title">Category Bars</h3>
                <div className="et-bars">
                  {byCategory.map(c => (
                    <div key={c.id} className="et-bar-row">
                      <span className="et-bar-label">{c.icon} {c.label}</span>
                      <div className="et-bar-track">
                        <div className="et-bar-fill" style={{ width: `${c.pct}%`, background: c.color }} />
                      </div>
                      <span className="et-bar-amt">{fmt(c.value)}</span>
                    </div>
                  ))}
                  {byCategory.length === 0 && <p className="et-empty-small">No expenses yet</p>}
                </div>
              </div>

              {/* recent */}
              <div className="et-card et-card-wide">
                <h3 className="et-card-title">Recent Transactions</h3>
                {expenses.slice(0, 5).length === 0 ? (
                  <p className="et-empty-small">No expenses recorded yet.</p>
                ) : (
                  <table className="et-mini-table">
                    <thead>
                      <tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr>
                    </thead>
                    <tbody>
                      {expenses.slice(0, 5).map((e, i) => {
                        const cat = CAT_MAP[e.category] || CAT_MAP.other
                        return (
                          <tr key={e.id || i}>
                            <td>{dateFmt(e.date || e.createdAt)}</td>
                            <td className="et-td-desc">{e.description}</td>
                            <td><span className="et-cat-badge" style={{ background: `${cat.color}20`, color: cat.color }}>{cat.icon} {cat.label}</span></td>
                            <td className="et-td-amt">{fmt(e.amount)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════ LIST TAB ══════ */}
        {activeTab === 'list' && (
          <div className="et-list-tab">
            {/* controls */}
            <div className="et-list-controls">
              <input
                className="et-input et-search"
                placeholder="🔍 Search expenses…"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
              />
              <select className="et-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                <option value="all">All Categories</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
              <select className="et-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="amount-desc">Highest amount</option>
                <option value="amount-asc">Lowest amount</option>
              </select>
              <span className="et-count-chip">{filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}</span>
            </div>

            {loading ? (
              <div className="et-loading"><div className="et-dot" /><div className="et-dot" /><div className="et-dot" /></div>
            ) : filteredExpenses.length === 0 ? (
              <div className="et-empty">
                <span>🧾</span>
                <p>No expenses found. Add your first expense above.</p>
              </div>
            ) : (
              <div className="et-expense-list">
                {filteredExpenses.map((e, i) => {
                  const cat = CAT_MAP[e.category] || CAT_MAP.other
                  const tags = Array.isArray(e.tags) ? e.tags : []
                  return (
                    <div key={e.id || i} className="et-expense-card">
                      <div className="et-expense-left">
                        <div className="et-cat-icon" style={{ background: `${cat.color}20`, color: cat.color }}>{cat.icon}</div>
                        <div className="et-expense-info">
                          <span className="et-expense-desc">{e.description}</span>
                          <div className="et-expense-meta">
                            <span className="et-expense-date">{dateFmt(e.date || e.createdAt)}</span>
                            <span className="et-meta-dot">·</span>
                            <span className="et-expense-pm">{e.paymentMethod?.replace('-', ' ')}</span>
                            {tags.length > 0 && tags.map(t => (
                              <span key={t} className="et-expense-tag">{t}</span>
                            ))}
                          </div>
                          {e.notes && <p className="et-expense-notes">{e.notes}</p>}
                        </div>
                      </div>
                      <div className="et-expense-right">
                        <span className="et-expense-amt">{fmt(e.amount)}</span>
                        <span className="et-expense-currency">{e.currency || 'USD'}</span>
                        <div className="et-expense-actions">
                          <button className="et-action-btn edit" onClick={() => openEdit(e)} title="Edit">✏️</button>
                          <button className="et-action-btn del" onClick={() => handleDelete(e)} title="Delete">🗑️</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════ TRENDS TAB ══════ */}
        {activeTab === 'trends' && (
          <div className="et-trends-tab">
            <div className="et-trends-hdr">
              <h3 className="et-section-title">Travel Cost Trends — Sri Lanka</h3>
              <p className="et-trends-sub">Average daily cost per category (USD). Updated with your real spending data.</p>
            </div>

            <div className="et-trends-grid">
              {CATEGORIES.map(cat => {
                const data   = trends[cat.id] || []
                const curr   = data[new Date().getMonth()] || 0
                const prev   = data[Math.max(0, new Date().getMonth() - 1)] || curr
                const change = prev ? ((curr - prev) / prev * 100).toFixed(1) : 0

                return (
                  <div key={cat.id} className="et-trend-card">
                    <div className="et-trend-top">
                      <span className="et-trend-icon" style={{ background: `${cat.color}18`, color: cat.color }}>{cat.icon}</span>
                      <div className="et-trend-meta">
                        <span className="et-trend-name">{cat.label}</span>
                        <span className="et-trend-curr">{fmt(curr)}<span className="et-trend-unit">/day avg</span></span>
                      </div>
                      <span className={`et-change-badge${Number(change) > 0 ? ' up' : Number(change) < 0 ? ' down' : ''}`}>
                        {Number(change) > 0 ? '▲' : Number(change) < 0 ? '▼' : '→'} {Math.abs(Number(change))}%
                      </span>
                    </div>

                    <Sparkline data={data} color={cat.color} width={220} height={50} />

                    <div className="et-trend-months">
                      {data.map((v, i) => (
                        <div key={i} className={`et-month-dot${i === new Date().getMonth() ? ' now' : ''}`} title={`${MONTHS[i]}: $${v}`}>
                          <div className="et-month-bar" style={{ height: `${Math.round((v / Math.max(...data, 1)) * 32)}px`, background: cat.color }} />
                          <span className="et-month-lbl">{MONTHS[i].slice(0, 1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* price change alerts section */}
            <div className="et-price-alert-section">
              <h3 className="et-section-title">📊 Price Change Analysis</h3>
              <div className="et-price-analysis">
                {CATEGORIES.map(cat => {
                  const data = trends[cat.id] || []
                  if (data.length < 2) return null
                  const month = new Date().getMonth()
                  const curr  = data[month] || 0
                  const prev  = data[Math.max(0, month - 1)] || curr
                  const avg   = data.reduce((s, v) => s + v, 0) / data.length
                  const change = prev ? (curr - prev) / prev * 100 : 0
                  const vsAvg  = avg ? (curr - avg) / avg * 100 : 0

                  return (
                    <div key={cat.id} className="et-pa-row">
                      <span className="et-pa-icon">{cat.icon}</span>
                      <span className="et-pa-cat">{cat.label}</span>
                      <span className="et-pa-curr">{fmt(curr)}</span>
                      <span className={`et-pa-mom${change > 5 ? ' up' : change < -5 ? ' down' : ' flat'}`}>
                        {change > 0 ? '+' : ''}{change.toFixed(1)}% MoM
                      </span>
                      <span className={`et-pa-avg${vsAvg > 10 ? ' up' : vsAvg < -10 ? ' down' : ' flat'}`}>
                        {vsAvg > 0 ? '+' : ''}{vsAvg.toFixed(1)}% vs avg
                      </span>
                      <div className="et-pa-bar-wrap">
                        <div className="et-pa-bar" style={{ width: `${Math.min(100, Math.round((curr / Math.max(...data)) * 100))}%`, background: cat.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
