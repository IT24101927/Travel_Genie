import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { API_BASE } from '../../config/api'
import { Link, useNavigate } from 'react-router-dom'
import { clearUserData } from '../../utils/clearUserData'
import { validateTripDate } from '../../utils/validation'
import './ExpenseTracker.css'

const API = API_BASE

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

/* ── category name translation ── */
/* frontend ID  →  backend ExpenseCategory.category_name */
const FRONTEND_TO_BACKEND_CAT = {
  accommodation:  'Accommodation',
  transportation: 'Transport',
  food:           'Food',
  activities:     'Tickets',
  shopping:       'Shopping',
  entertainment:  'Entertainment',
  emergency:      'Emergency',
  other:          'Other',
}
/* backend category_name (lowercased)  →  frontend ID */
const BACKEND_TO_FRONTEND_CAT = {
  accommodation:  'accommodation',
  food:           'food',
  transport:      'transportation',
  tickets:        'activities',
  shopping:       'shopping',
  entertainment:  'entertainment',
  emergency:      'emergency',
  other:          'other',
}

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

const PRICE_RECORD_TO_CATEGORY = {
  hotel: 'accommodation',
  transport: 'transportation',
  ticket: 'activities',
  activities: 'activities',
}

function mergeApiPriceRecordTrends(baseTrends, rows = []) {
  const next = { ...baseTrends }
  const buckets = {}

  rows.forEach((row) => {
    const category = PRICE_RECORD_TO_CATEGORY[(row?.item_type || '').toLowerCase()]
    if (!category) return
    const date = new Date(row?.recorded_at)
    if (Number.isNaN(date.getTime())) return
    const month = date.getMonth()
    const price = Number(row?.price)
    if (!Number.isFinite(price)) return

    if (!buckets[category]) buckets[category] = {}
    if (!buckets[category][month]) buckets[category][month] = []
    buckets[category][month].push(price)
  })

  Object.entries(buckets).forEach(([category, monthMap]) => {
    const arr = Array.isArray(next[category]) ? [...next[category]] : new Array(12).fill(0)
    Object.entries(monthMap).forEach(([month, values]) => {
      if (!values.length) return
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length
      arr[Number(month)] = Number(avg.toFixed(2))
    })
    next[category] = arr
  })

  return next
}

function mergeExpenseHistoryTrends(baseTrends, expenses = []) {
  const next = { ...baseTrends }
  const buckets = {}

  expenses.forEach((exp) => {
    const category = exp?.category
    if (!category) return

    const rawDate = exp?.date || exp?.createdAt
    const dt = rawDate ? new Date(rawDate) : null
    if (!dt || Number.isNaN(dt.getTime())) return

    const month = dt.getMonth()
    const amountLkr = convertAmt(Number(exp?.amount || 0), exp?.currency || 'LKR', 'LKR')
    if (!Number.isFinite(amountLkr) || amountLkr <= 0) return

    if (!buckets[category]) buckets[category] = {}
    if (!buckets[category][month]) buckets[category][month] = []
    buckets[category][month].push(amountLkr)
  })

  Object.entries(buckets).forEach(([category, monthMap]) => {
    const arr = Array.isArray(next[category]) ? [...next[category]] : new Array(12).fill(0)
    Object.entries(monthMap).forEach(([month, values]) => {
      if (!values.length) return
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length
      arr[Number(month)] = Number(avg.toFixed(2))
    })
    next[category] = arr
  })

  return next
}

/* ─────────────────────── helpers ─────────────────────── */
function getUser() {
  try { return JSON.parse(localStorage.getItem('currentUser')) } catch { return null }
}
function getToken() { return localStorage.getItem('token') || '' }
function tripIdOf(trip) {
  return String(trip?.dbTripId || trip?.trip_id || trip?.id || trip?._id || '')
}
function isLockedTrip(trip) {
  const status = String(trip?.status || '').toLowerCase()
  return status === 'completed' || status === 'cancelled'
}

/* ─── Display currencies (mirrors HotelPicker) ──────────────────── */
const DISPLAY_CURRENCIES = [
  { code: 'LKR', symbol: 'Rs', label: 'Sri Lankan Rupee', flag: '🇱🇰', rate: 300  },
  { code: 'USD', symbol: '$',  label: 'US Dollar',        flag: '🇺🇸', rate: 1    },
  { code: 'EUR', symbol: '€',  label: 'Euro',             flag: '🇪🇺', rate: 0.92 },
]
// Rates are "units of this currency per 1 USD".
// To convert: amount_display = amount * (toRate / fromRate)
function convertAmt(amount, fromCode, toCode) {
  if (!amount) return 0
  const from = DISPLAY_CURRENCIES.find(c => c.code === fromCode)?.rate ?? 1
  const to   = DISPLAY_CURRENCIES.find(c => c.code === toCode)?.rate   ?? 1
  return Math.round((amount / from) * to * 100) / 100
}
function symFor(code) {
  return DISPLAY_CURRENCIES.find(c => c.code === code)?.symbol ?? code
}
function fmt(val, sym = 'Rs') {
  return `${sym} ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function pct(spent, budget) {
  if (!budget) return null
  return Math.min(Math.round((spent / budget) * 100), 999)
}
function dateFmt(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function normalizePlanSplit(split) {
  const keys = ['food', 'transport', 'activities_misc']
  const fallback = { food: 55, transport: 30, activities_misc: 15 }
  const values = keys.map((key) => Math.max(Number(split?.[key]) || 0, 0))
  const total = values.reduce((sum, value) => sum + value, 0)
  if (total <= 0) return fallback

  const scaled = values.map((value) => (value / total) * 100)
  const base = scaled.map((value) => Math.floor(value))
  let remainder = 100 - base.reduce((sum, value) => sum + value, 0)
  const order = scaled
    .map((value, idx) => ({ idx, frac: value - base[idx] }))
    .sort((a, b) => (b.frac - a.frac) || (a.idx - b.idx))

  let i = 0
  while (remainder > 0) {
    base[order[i % order.length].idx] += 1
    remainder -= 1
    i += 1
  }

  return { food: base[0], transport: base[1], activities_misc: base[2] }
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
function DonutChart({ segments, size = 140, fmtFn = fmt }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (!total) return <div className="et-donut-empty">No data</div>

  const r = 48, cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="et-donut">
      {segments.map((seg, i) => {
        const frac = seg.value / total
        const dash = frac * circ
        const gap  = circ - dash
        const offset = segments
          .slice(0, i)
          .reduce((sum, s) => sum + ((s.value / total) * circ), 0)
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
        return el
      })}
      <circle cx={cx} cy={cy} r={37} fill="var(--et-card,#fff)" />
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--et-text,#1a2b2a)">
        {fmtFn(total).replace('.00', '')}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="var(--et-muted,#6b7280)">
        TOTAL
      </text>
    </svg>
  )
}

/* ─────────────────────── Expense Form ─────────────────── */
/* normalize API response fields to match local/display format */
const normalizeApiExpense = (e) => {
  const backendName  = (e.category?.category_name || 'other').toLowerCase()
  const frontendCat  = BACKEND_TO_FRONTEND_CAT[backendName] || backendName
  return {
    id: e.expense_id || e.id,
    description: e.note || e.description || '',
    category: frontendCat,
    amount: parseFloat(e.amount) || 0,
    currency: e.currency || 'LKR',
    date: e.expense_date || e.date,
    paymentMethod: e.payment_method || e.paymentMethod || 'cash',
    notes: e.note || e.notes || '',
    trip_id: e.trip_id,
    tripId: e.trip_id || e.tripId,
    createdAt: e.createdAt,
  }
}

const BLANK_FORM = {
  description: '', category: 'food', amount: '', currency: 'LKR',
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: 'cash', notes: '', tags: '',
}

function ExpenseForm({ initial, tripId, tripOptions = [], onSave, onCancel }) {
  const [form, setForm] = useState(initial || BLANK_FORM)
  const [selectedTripId, setSelectedTripId] = useState(() => initial?.tripId || initial?.trip_id || tripId || '')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.description.trim()) { setError('Description is required'); return }
    if (!form.amount || isNaN(form.amount) || +form.amount <= 0) { setError('Enter a valid amount'); return }
    if (form.date) {
      const dateCheck = validateTripDate(form.date, 1)
      if (!dateCheck.valid) { setError(dateCheck.message); return }
    }
    if (!selectedTripId) { setError('Select a trip plan first'); return }
    setError(''); setSaving(true)

    const tags = typeof form.tags === 'string'
      ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
      : form.tags

    const payload = { ...form, amount: parseFloat(form.amount), tripId: selectedTripId, tags }
    await onSave(payload)
    setSaving(false)
  }

  return (
    <form className="et-form" onSubmit={submit}>
      <div className="et-form-grid">
        <div className="et-fg et-fg-full">
          <label>Trip Plan *</label>
          <select className="et-select" value={selectedTripId} onChange={e => setSelectedTripId(e.target.value)}>
            <option value="">Select trip plan</option>
            {tripOptions.map(t => (
              <option key={tripIdOf(t)} value={tripIdOf(t)}>
                {t.tripName || t.destinationName}
              </option>
            ))}
          </select>
        </div>

        <div className="et-fg et-fg-full">
          <label>Description *</label>
          <input className="et-input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. Lunch at a beachside café" />
        </div>

        <div className="et-fg">
          <label>Category *</label>
          <div className="et-cat-pills">
            {CATEGORIES.filter(c => c.id !== 'accommodation').map(c => (
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
              <option value="LKR">LKR Rs</option>
              <option value="USD">USD $</option>
              <option value="EUR">EUR €</option>
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
  const [menuOpen,      setMenuOpen]      = useState(false)
  const [tripPickerOpen, setTripPickerOpen] = useState(false)
  const pickerRef    = useRef(null)
  const pickerBtnRef = useRef(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })

  /* ── trips ── */
  const [trips,       setTrips]       = useState([])
  const [activeTripId, setActiveTripId] = useState('all')

  /* ── expenses ── */
  const [expenses,    setExpenses]    = useState([])
  const [loading,     setLoading]     = useState(false)
  const [useBackend,  setUseBackend]  = useState(false)
  const [syncNotice,  setSyncNotice]  = useState('')

  /* ── form/modal ── */
  const [showForm,    setShowForm]    = useState(false)
  const [editTarget,  setEditTarget]  = useState(null)

  /* ── ui ── */
  const [activeTab,   setActiveTab]   = useState('overview')  // overview | list | trends
  const [displayCurrency, setDisplayCurrency] = useState(() => localStorage.getItem('et_displayCurrency') || 'LKR')
  const [filterCat,   setFilterCat]   = useState('all')
  const [listTripFilter, setListTripFilter] = useState('all')
  const [sortBy,      setSortBy]      = useState('date-desc')
  const [searchQ,     setSearchQ]     = useState('')

  /* ── category id lookup (fetched once from backend) ── */
  const catIdMapRef = useRef({})

  /* ── trends ── */
  const [trends,      setTrends]      = useState(loadTrends())
  const [trendSource, setTrendSource] = useState('local')

  /* ── budget map: tripId → number ── */
  const [budgets,     setBudgets]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('tripBudgets') || '{}') } catch { return {} }
  })
  const [budgetEdit,  setBudgetEdit]  = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const [budgetSplits, setBudgetSplits] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tripBudgetSplits') || '{}') } catch { return {} }
  })

  /* ── fetch expense categories from backend for category_id lookup ── */
  useEffect(() => {
    fetch(`${API}/expenses/categories`)
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          const m = {}
          data.data.forEach(c => { m[c.category_name] = c.category_id })
          catIdMapRef.current = m
        }
      })
      .catch(() => {})
  }, [])

  /* ── redirect + seed budgets from trip plan ── */
  useEffect(() => {
    if (!user) { navigate('/login'); return }

    const tripIdentity = (trip) => String(trip?.dbTripId || trip?.trip_id || trip?.id || trip?._id || '')

    const applyTrips = (tripList) => {
      const seen = new Set()
      const t = tripList.filter(trip => {
        const id = tripIdentity(trip)
        if (seen.has(id)) return false
        seen.add(id); return true
      })
      setTrips(t)
      localStorage.setItem('myTrips', JSON.stringify(t))
      // Auto-seed tripBudgets from each trip's planned totalBudget
      const stored = JSON.parse(localStorage.getItem('tripBudgets') || '{}')
      const splitStored = JSON.parse(localStorage.getItem('tripBudgetSplits') || '{}')
      let changed = false
      let splitChanged = false
      t.forEach(trip => {
        const tid = tripIdOf(trip)
        const planBudget = Number(trip.totalBudget || trip.total_budget || 0)
        // Keep expense budget cache aligned with latest trip plan budget.
        if (planBudget > 0 && Number(stored[tid] || 0) !== planBudget) {
          stored[tid] = planBudget
          changed = true
        }

        if (trip?.dailySplit) {
          const normalized = normalizePlanSplit(trip.dailySplit)
          const prev = splitStored[tid] || {}
          if (
            Number(prev.food) !== Number(normalized.food) ||
            Number(prev.transport) !== Number(normalized.transport) ||
            Number(prev.activities_misc) !== Number(normalized.activities_misc)
          ) {
            splitStored[tid] = normalized
            splitChanged = true
          }
        }
      })
      if (changed) {
        setBudgets(stored)
        localStorage.setItem('tripBudgets', JSON.stringify(stored))
      }
      if (splitChanged) {
        setBudgetSplits(splitStored)
        localStorage.setItem('tripBudgetSplits', JSON.stringify(splitStored))
      }
    }

    const localTrips = (() => {
      try { return JSON.parse(localStorage.getItem('myTrips') || '[]') } catch { return [] }
    })()

    // Apply local trips immediately so UI is responsive
    if (localTrips.length > 0) applyTrips(localTrips)

    // Then fetch from API and merge (picks up trips saved only on backend)
    if (token) {
      fetch(`${API}/trips/my`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
            const apiTrips = json.data.map(t => ({
              id: t.trip_id, dbTripId: t.trip_id,
              tripName: t.title,
              destinationName: t.district?.name || 'Trip',
              destinationCity: t.district?.province ? `${t.district.province} Province` : '',
              destinationId: t.district?.district_id || null,
              provinceName: t.district?.province || '',
              startDate: t.start_date, endDate: t.end_date,
              travelers: t.num_people, status: t.status,
              totalBudget: Number(t.total_budget || 0),
              hotelBudget: Number(t.hotel_budget || 0),
              notes: t.notes, createdAt: t.createdAt,
            }))
            const apiIds = new Set(apiTrips.map(t => tripIdentity(t)).filter(Boolean))
            const merged = [
              ...apiTrips,
              ...localTrips.filter(t => !apiIds.has(tripIdentity(t))),
            ]
            applyTrips(merged)
          }
        })
        .catch(() => {})
    }
  }, []) // eslint-disable-line

  /* ── close trip picker on outside click ── */
  useEffect(() => {
    const handler = e => {
      if (
        pickerRef.current && !pickerRef.current.contains(e.target) &&
        !e.target.closest('.et-trip-dropdown')
      ) {
        setTripPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
          loaded = (data.data || []).map(normalizeApiExpense)
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
            loaded = (data.data || []).map(normalizeApiExpense).filter(e => String(e.trip_id ?? e.tripId) === String(activeTripId))
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
        if (res.ok && data.success) { loaded = (data.data || []).map(normalizeApiExpense); apiOk = true }
      } catch { /* fallthrough */ }
    }

    setUseBackend(apiOk)

    // Always merge local-storage so nothing is missed —
    // covers: API-down saves, trips that only exist in localStorage, and FK failures.
    const allKnownTrips = trips.length > 0 ? trips : JSON.parse(localStorage.getItem('myTrips') || '[]')

    if (activeTripId === 'all') {
      const localAll = [
        ...loadLocal('standalone'),
        ...allKnownTrips.flatMap(t => loadLocal(tripIdOf(t))),
      ]
      if (!apiOk) {
        loaded = localAll
      } else {
        // Merge: dedupe by id — prefer API copy when both exist
        const apiIds    = new Set(loaded.map(e => String(e.id)))
        const onlyLocal = localAll.filter(e => !apiIds.has(String(e.id)))
        loaded = [...loaded, ...onlyLocal]
      }
    } else {
      // Specific trip: always merge local (API may return 200+empty for non-DB trips)
      const localTrip = loadLocal(activeTripId)
      if (!apiOk) {
        loaded = localTrip
      } else {
        const apiIds    = new Set(loaded.map(e => String(e.id)))
        const onlyLocal = localTrip.filter(e => !apiIds.has(String(e.id)))
        loaded = [...loaded, ...onlyLocal]
      }
    }

    setExpenses(loaded)
    setLoading(false)
  }, [activeTripId, token, trips])

  useEffect(() => {
    queueMicrotask(() => {
      fetchExpenses()
    })
  }, [fetchExpenses])

  const hydrateTrendsFromApi = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${API}/price-records?limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        setTrendSource('local')
        return
      }

      const records = Array.isArray(data.data) ? data.data : []
      if (!records.length) {
        setTrendSource('local')
        return
      }

      setTrends((prev) => mergeApiPriceRecordTrends(prev, records))
      setTrendSource('api')
    } catch {
      setTrendSource('local')
    }
  }, [token])

  useEffect(() => {
    queueMicrotask(() => {
      hydrateTrendsFromApi()
    })
  }, [hydrateTrendsFromApi])

  useEffect(() => {
    const baseline = loadTrends()
    const merged = mergeExpenseHistoryTrends(baseline, expenses)
    queueMicrotask(() => {
      setTrends(merged)
      hydrateTrendsFromApi()
    })
  }, [expenses, hydrateTrendsFromApi])

  useEffect(() => {
    if (activeTripId === 'all') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setListTripFilter('all')
    } else {
      setListTripFilter(String(activeTripId))
    }
  }, [activeTripId])

  /* ── save expense ── */
  const handleSave = async (payload) => {
    const targetTripId = String(payload.tripId || (activeTripId === 'all' ? 'standalone' : activeTripId))
    const targetTrip = trips.find(t => tripIdOf(t) === targetTripId)
    if (targetTrip && isLockedTrip(targetTrip)) {
      setSyncNotice('This trip is locked (completed/cancelled). New expenses cannot be added.')
      return
    }
    let backendErrorMsg = ''

    if (useBackend || (token && targetTripId !== 'all' && targetTripId !== 'standalone')) {
      try {
        const url    = editTarget ? `${API}/expenses/${editTarget.id}` : `${API}/expenses`
        const method = editTarget ? 'PUT' : 'POST'
        // Resolve backend category_id from the fetched categories map
        const backendCatName = FRONTEND_TO_BACKEND_CAT[payload.category] || 'Other'
        const categoryId     = catIdMapRef.current[backendCatName] || null
        // Map local field names → backend snake_case field names
        const body = {
          note: payload.description,
          amount: parseFloat(payload.amount),
          currency: payload.currency || 'LKR',
          expense_date: payload.date,
          payment_method: payload.paymentMethod || 'cash',
          expense_type: 'ACTUAL',
          trip_id: targetTripId !== 'standalone' ? targetTripId : undefined,
          category_id: categoryId,
        }

        const res  = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (res.ok && data.success) {
          setSyncNotice('')
          pushTrend(payload.category, payload.amount)
          setTrends(loadTrends())
          hydrateTrendsFromApi()
          // Mirror to localStorage so All-Trips local fallback can find it
          const savedExp   = normalizeApiExpense(data.data)
          const lTripId    = targetTripId
          const lsExisting = loadLocal(lTripId)
          if (editTarget) {
            saveLocal(lTripId, lsExisting.map(e => String(e.id) === String(savedExp.id) ? savedExp : e))
          } else {
            saveLocal(lTripId, [savedExp, ...lsExisting])
          }
          setShowForm(false); setEditTarget(null)
          fetchExpenses()
          return
        }
        backendErrorMsg = data?.message || 'Server sync failed'
      } catch (err) {
        backendErrorMsg = err?.message || 'Network error during sync'
      }
    }

    /* local save */
    const existing = loadLocal(targetTripId)
    let updated
    const newE = editTarget ? null : { ...payload, id: `local_${Date.now()}`, createdAt: new Date().toISOString() }
    if (editTarget) {
      updated = existing.map(e => e.id === editTarget.id ? { ...e, ...payload } : e)
    } else {
      updated = [newE, ...existing]
    }
    saveLocal(targetTripId, updated)

    const isLocalTrip = String(targetTripId).startsWith('local_')
    if (token && (isLocalTrip || backendErrorMsg)) {
      setSyncNotice(
        isLocalTrip
          ? 'Saved locally only. Automatic over-budget notifications/emails work only for server-synced trips.'
          : `Saved locally because backend sync failed (${backendErrorMsg}). Automatic over-budget notifications/emails did not trigger for this save.`
      )
    }

    pushTrend(payload.category, payload.amount)
    setTrends(loadTrends())
    hydrateTrendsFromApi()
    setExpenses(prev => editTarget
      ? prev.map(e => e.id === editTarget.id ? { ...e, ...payload } : e)
      : [newE, ...prev]
    )
    setShowForm(false); setEditTarget(null)
  }

  /* ── delete ── */
  const handleDelete = async (exp) => {
    const expTripId = String(exp.tripId || exp.trip_id || '')
    const expTrip = trips.find(t => tripIdOf(t) === expTripId)
    if (expTrip && isLockedTrip(expTrip)) {
      setSyncNotice('This trip is locked (completed/cancelled). Expenses are read-only.')
      return
    }
    if (!window.confirm('Delete this expense?')) return

    // Helper: remove an expense id from whichever localStorage bucket it lives in
    const removeFromLocal = (expId) => {
      // Check the specific trip's bucket first
      const ownerTripId = String(exp.tripId || exp.trip_id || '')
      const bucketsToCheck = new Set([
        activeTripId !== 'all' ? String(activeTripId) : null,
        ownerTripId || null,
        'standalone',
        ...trips.map(t => tripIdOf(t)),
      ])
      bucketsToCheck.forEach(tid => {
        if (!tid) return
        const existing = loadLocal(tid)
        const filtered = existing.filter(e => String(e.id) !== String(expId))
        if (filtered.length !== existing.length) saveLocal(tid, filtered)
      })
    }

    if (!String(exp.id).startsWith('local_') && token) {
      try {
        const res = await fetch(`${API}/expenses/${exp.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          removeFromLocal(exp.id)
          fetchExpenses()
          return
        }
      } catch { /* fallthrough to local delete */ }
    }

    // Local-only delete
    removeFromLocal(exp.id)
    setExpenses(prev => prev.filter(e => String(e.id) !== String(exp.id)))
  }

  /* ── budget persistence ── */
  const saveBudget = (tripId, val) => {
    const next = { ...budgets, [tripId]: parseFloat(val) || 0 }
    setBudgets(next)
    localStorage.setItem('tripBudgets', JSON.stringify(next))
  }

  /* ── derived stats ── */
  const isAllTrips = activeTripId === 'all'

  // For "All Trips": sum every trip's budget and hotel cost
  const budget = isAllTrips
    ? trips.reduce((s, t) => s + (budgets[tripIdOf(t)] || 0), 0)
    : (budgets[activeTripId] || 0)

  const hotelBudget = isAllTrips
    ? trips.reduce((s, t) => s + (t.hotelBudget || 0), 0)
    : (trips.find(t => tripIdOf(t) === String(activeTripId))?.hotelBudget || 0)

  /* ── display-currency helpers (defined early so all derived vars can use them) ── */
  const currSym = symFor(displayCurrency)
  const fmt = useCallback((val) => (
    `${currSym} ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  ), [currSym])
  const fmtB = fmt
  const fmtE = (e) => fmt(convertAmt(e.amount || 0, e.currency || 'LKR', displayCurrency))
  // Budget figures stored as LKR → converted to displayCurrency
  const budgetDisplay          = convertAmt(budget, 'LKR', displayCurrency)
  const hotelBudgetDisplay     = convertAmt(hotelBudget, 'LKR', displayCurrency)
  const effectiveBudgetDisplay = budgetDisplay ? Math.max(budgetDisplay - hotelBudgetDisplay, 0) : 0
  const totalSpent             = expenses.reduce((s, e) => s + convertAmt(e.amount || 0, e.currency || 'LKR', displayCurrency), 0)
  const remainingDisplay       = budgetDisplay ? effectiveBudgetDisplay - totalSpent : null
  const budgetPct              = pct(totalSpent, effectiveBudgetDisplay || budgetDisplay)
  const remaining              = remainingDisplay

  const byCategory = useMemo(() => {
    const acc = {}
    expenses.forEach(e => {
      const cv = convertAmt(e.amount || 0, e.currency || 'LKR', displayCurrency)
      acc[e.category] = (acc[e.category] || 0) + cv
    })
    return CATEGORIES
      .map(c => ({ ...c, value: acc[c.id] || 0, pct: totalSpent ? Math.round((acc[c.id] || 0) / totalSpent * 100) : 0 }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [expenses, totalSpent, displayCurrency])

  /* ── alerts ── */
  const alerts = useMemo(() => {
    const a = []
    if (budget && budgetPct >= DANGER_THRESHOLD * 100) {
      a.push({ level: 'danger', message: `🚨 Budget exceeded! Spent ${fmt(totalSpent)} of ${fmt(budgetDisplay)} (${budgetPct}%)` })
    } else if (budget && budgetPct >= ALERT_THRESHOLD * 100) {
      a.push({ level: 'warn', message: `⚠️ Approaching budget limit — ${budgetPct}% spent (${fmt(totalSpent)} / ${fmt(budgetDisplay)})` })
    }
    return a
  }, [budget, budgetDisplay, budgetPct, totalSpent, fmt])

  /* ── filtered list ── */
  const filteredExpenses = useMemo(() => {
    let list = [...expenses]
    if (listTripFilter !== 'all') {
      list = list.filter(e => String(e.tripId || e.trip_id) === String(listTripFilter))
    }
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
  }, [expenses, listTripFilter, filterCat, searchQ, sortBy])

  /* ── trip label + currency ── */
  const activeTrip = trips.find(t => tripIdOf(t) === String(activeTripId))
  const activeTripLocked = !isAllTrips && !!activeTrip && isLockedTrip(activeTrip)

  /* Planned budget breakdown from the trip's planning data */
  const planBudget = isAllTrips
    ? trips.reduce((s, t) => s + (t.totalBudget || 0), 0)
    : (activeTrip?.totalBudget || 0)
  const planHotel = isAllTrips
    ? trips.reduce((s, t) => s + (t.hotelBudget || 0), 0)
    : (activeTrip?.hotelBudget || 0)
  const planBudgetDisplay   = convertAmt(planBudget, 'LKR', displayCurrency)
  const planHotelDisplay    = convertAmt(planHotel,  'LKR', displayCurrency)
  const planRemain          = Math.max(planBudgetDisplay - planHotelDisplay, 0)

  const planBySplit = useMemo(() => {
    const computeForTrip = (trip) => {
      const tid = tripIdOf(trip)
      const split = normalizePlanSplit(budgetSplits[tid] || trip?.dailySplit)
      const tripBudgetDisplay = convertAmt(Number(trip?.totalBudget || trip?.total_budget || 0), 'LKR', displayCurrency)
      const tripHotelDisplay = convertAmt(Number(trip?.hotelBudget || trip?.hotel_budget || 0), 'LKR', displayCurrency)
      const remain = Math.max(tripBudgetDisplay - tripHotelDisplay, 0)
      const food = Math.round(remain * (split.food / 100))
      const transport = Math.round(remain * (split.transport / 100))
      const misc = remain - food - transport
      return { food, transport, misc }
    }

    if (isAllTrips) {
      return trips.reduce((acc, trip) => {
        const seg = computeForTrip(trip)
        acc.food += seg.food
        acc.transport += seg.transport
        acc.misc += seg.misc
        return acc
      }, { food: 0, transport: 0, misc: 0 })
    }

    if (!activeTrip) return { food: 0, transport: 0, misc: 0 }
    return computeForTrip(activeTrip)
  }, [activeTrip, budgetSplits, displayCurrency, isAllTrips, trips])

  const planFood = planBySplit.food
  const planTransport = planBySplit.transport
  const planMisc = planBySplit.misc

  /* Actual spend per plan category */
  const spentFood      = expenses.filter(e => e.category === 'food').reduce((s, e) => s + convertAmt(e.amount || 0, e.currency || 'LKR', displayCurrency), 0)
  const spentTransport = expenses.filter(e => e.category === 'transportation').reduce((s, e) => s + convertAmt(e.amount || 0, e.currency || 'LKR', displayCurrency), 0)
  const spentMisc      = expenses.filter(e => !['food', 'transportation', 'accommodation'].includes(e.category)).reduce((s, e) => s + convertAmt(e.amount || 0, e.currency || 'LKR', displayCurrency), 0)

  /* ── edit helper ── */
  const openEdit = (exp) => {
    const expTripId = String(exp.tripId || exp.trip_id || '')
    const expTrip = trips.find(t => tripIdOf(t) === expTripId)
    if (expTrip && isLockedTrip(expTrip)) {
      setSyncNotice('This trip is locked (completed/cancelled). Expenses are read-only.')
      return
    }
    setEditTarget(exp)
    setShowForm(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    clearUserData()
    navigate('/')
  }

  return (
    <div className="et-page" data-theme={theme}>

      {syncNotice && (
        <div className="et-sync-notice" role="status" aria-live="polite">
          ⚠️ {syncNotice}
        </div>
      )}

      {/* ════ NAV ════ */}
      <nav className="dashboard-nav glass-nav">
        <div className="nav-container">
          <Link to="/dashboard" className="logo"><TGLogo /><span>TravelGenie</span></Link>
          <button className="menu-toggle" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
            <span className={`hamburger ${menuOpen ? 'open' : ''}`} />
          </button>
          <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li><Link to="/plan-trip">Plan a Trip</Link></li>
            <li><Link to="/profile">Profile</Link></li>
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

      {/* ════ HERO ════ */}
      <header className="et-hero">
        <div className="et-hero-deco" />
        <div className="et-hero-blob et-hero-blob-1" />
        <div className="et-hero-blob et-hero-blob-2" />
        <div className="et-hero-inner">

          {/* left — title + quick stats */}
          <div className="et-hero-left">
            <p className="et-eyebrow">💰 Expense Tracker</p>
            <h1 className="et-hero-title">Budget &amp; Spending</h1>
            <p className="et-hero-sub">Track, manage and stay ahead of every expense.</p>
            <div className="et-hero-stats">
              <div className="et-hero-stat">
                <span className="et-hero-stat-val">{fmt(totalSpent)}</span>
                <span className="et-hero-stat-lbl">Total Spent</span>
              </div>
              {budget > 0 && (
                <>
                  <div className="et-hero-stat-divider" />
                  <div className="et-hero-stat">
                    <span className="et-hero-stat-val">{fmtB(effectiveBudgetDisplay)}</span>
                    <span className="et-hero-stat-lbl">Available Budget</span>
                  </div>
                  <div className="et-hero-stat-divider" />
                  <div className={`et-hero-stat${remaining < 0 ? ' danger' : ''}`}>
                    <span className="et-hero-stat-val">
                      {remaining >= 0 ? fmtB(remaining) : `${fmtB(Math.abs(remaining))} over`}
                    </span>
                    <span className="et-hero-stat-lbl">{remaining >= 0 ? 'Remaining' : 'Over Budget'}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* right — trip picker */}
          <div className="et-trip-picker" ref={pickerRef}>
            <div className="et-trip-picker-label">Viewing trip</div>
            <div
              className={`et-trip-picker-select-wrap${tripPickerOpen ? ' open' : ''}`}
              ref={pickerBtnRef}
              onClick={() => {
                if (!tripPickerOpen && pickerBtnRef.current) {
                  const r = pickerBtnRef.current.getBoundingClientRect()
                  setDropdownPos({ top: r.bottom + 8, left: r.left, width: r.width })
                }
                setTripPickerOpen(o => !o)
              }}
            >
              <span className="et-trip-picker-ico">✈️</span>
              <span className="et-trip-select-val">
                {activeTripId === 'all'
                  ? 'All Trips'
                  : (() => {
                      const t = trips.find(t => tripIdOf(t) === String(activeTripId))
                      if (!t) return 'All Trips'
                      const name = t.tripName || t.destinationName
                      const d = t.startDate ? new Date(t.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null
                      return d ? `${name} · ${d}` : name
                    })()}
              </span>
              <span className={`et-trip-picker-chevron${tripPickerOpen ? ' up' : ''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
              {tripPickerOpen && createPortal(
                <div
                  className="et-trip-dropdown"
                  style={{ position: 'fixed', top: `${dropdownPos.top}px`, left: `${dropdownPos.left}px`, width: `${dropdownPos.width}px`, zIndex: 9999 }}
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    className={`et-trip-option${activeTripId === 'all' ? ' active' : ''}`}
                    onClick={() => { setActiveTripId('all'); setShowForm(false); setTripPickerOpen(false) }}
                  >
                    {activeTripId === 'all' && <span className="et-trip-option-tick">✓</span>}
                    <span className="et-trip-option-body">
                      <span className="et-trip-option-name">All Trips</span>
                    </span>
                  </button>
                  {trips.map(t => {
                    const tid  = tripIdOf(t)
                    const locked = isLockedTrip(t)
                    const name = t.tripName || t.destinationName
                    const d1   = t.startDate ? new Date(t.startDate).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : null
                    const d2   = t.endDate   ? new Date(t.endDate).toLocaleDateString('en-GB', { day:'numeric', month:'short' }) : null
                    const dateStr = d1 && d2 ? `${d1} – ${d2}` : d1 || null
                    return (
                      <button
                        key={tid}
                        className={`et-trip-option${String(activeTripId) === tid ? ' active' : ''}${locked ? ' locked' : ''}`}
                        onClick={() => { setActiveTripId(tid); setTripPickerOpen(false) }}
                      >
                        {String(activeTripId) === tid && <span className="et-trip-option-tick">✓</span>}
                        <span className="et-trip-option-body">
                          <span className="et-trip-option-name">{name}</span>
                          <span className="et-trip-option-date">{dateStr || 'No date'}{locked ? ' · Locked' : ''}</span>
                        </span>
                        {locked && <span className="et-trip-option-lock">🔒</span>}
                      </button>
                    )
                  })}
                </div>, document.body
              )}
            </div>
            <div className="et-trip-picker-count">
              {trips.length} trip{trips.length !== 1 ? 's' : ''} planned
            </div>
          </div>
        </div>

        {/* wave bottom */}
        <div className="et-hero-wave">
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,40 C360,80 1080,0 1440,40 L1440,60 L0,60 Z" fill="var(--bg-primary,#f8fafb)"/>
          </svg>
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
                  ) : isAllTrips ? (
                    <span className="et-budget-val">{fmtB(budgetDisplay)}</span>
                  ) : (
                    <span
                      className="et-budget-val"
                      onClick={() => { setBudgetInput(String(budget)); setBudgetEdit(true) }}
                      title="Click to edit budget"
                    >
                      {fmtB(budgetDisplay)} <span className="et-edit-hint">✏️</span>
                    </span>
                  )}
                  <span className="et-big-lbl">budget ({displayCurrency})</span>
                </div>
              </>
            )}
            {!budget && !isAllTrips && (
              <button className="et-set-budget-btn" onClick={() => { setBudgetInput(''); setBudgetEdit(true) }}>
                + Set Budget ({displayCurrency})
              </button>
            )}
            {budget > 0 && remaining !== null && (
              <div className={`et-remaining${remaining < 0 ? ' over' : ''}`}>
                <span>{remaining >= 0 ? `${fmtB(remaining)} remaining` : `${fmtB(Math.abs(remaining))} over budget`}</span>
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

          {budgetEdit && !budget && !isAllTrips && (
            <div className="et-set-budget-form">
              <input
                className="et-input"
                type="number"
                placeholder={`Enter total budget (${displayCurrency})`}
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

          {!isAllTrips && !activeTripLocked && (
            <button
              className="et-add-btn"
              onClick={() => { setEditTarget(null); setShowForm(s => !s) }}
            >
              {showForm ? '✕ Cancel' : '+ Add Expense'}
            </button>
          )}
        </div>

        {/* ── Add/Edit form ── */}
        {showForm && !isAllTrips && (
          <div className="et-form-wrap">
            <ExpenseForm
              initial={editTarget ? {
                ...editTarget,
                date: editTarget.date ? new Date(editTarget.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                tags: Array.isArray(editTarget.tags) ? editTarget.tags.join(', ') : editTarget.tags || '',
              } : BLANK_FORM}
              tripId={activeTripId !== 'all' ? String(activeTripId) : ''}
              tripOptions={trips}
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
          {/* currency pill switcher — mirrors HotelPicker */}
          <div className="et-currency-pills">
            {DISPLAY_CURRENCIES.map(c => (
              <button
                key={c.code}
                className={`et-currency-pill${displayCurrency === c.code ? ' active' : ''}`}
                onClick={() => {
                  setDisplayCurrency(c.code)
                  localStorage.setItem('et_displayCurrency', c.code)
                }}
                title={c.label}
              >
                <span className="et-cp-flag">{c.flag}</span>
                <span className="et-cp-sym">{c.symbol}</span>
                <span className="et-cp-code">{c.code}</span>
              </button>
            ))}
          </div>
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

            {/* Planned budget breakdown from trip */}
            {planBudget > 0 && (
              <div className="et-plan-budget-card">
                <div className="et-plan-budget-hdr">
                  <div className="et-plan-budget-title">
                    <span>🗓 Planned Budget</span>
                    <span className="et-plan-budget-trip">
                      {isAllTrips ? 'All Trips' : (activeTrip?.tripName || activeTrip?.destinationName)}
                    </span>
                  </div>
                  <div className="et-plan-budget-chips">
                    {planHotel > 0 && (
                      <span className="et-plan-chip">🏨 Hotel <strong>{fmtB(planHotel)}</strong></span>
                    )}
                    <span className="et-plan-chip et-plan-chip-main">💰 Available <strong>{fmtB(planRemain)}</strong></span>
                  </div>
                </div>
                <div className="et-plan-rows">
                  {[
                    { icon: '🍽️', label: 'Food',      planned: planFood,      spent: spentFood,      color: '#f59e0b' },
                    { icon: '🚗', label: 'Transport', planned: planTransport, spent: spentTransport, color: '#3b82f6' },
                    { icon: '✨', label: 'Misc',       planned: planMisc,      spent: spentMisc,      color: '#8b5cf6' },
                  ].filter(r => r.planned > 0).map(r => {
                    const usedPct = r.planned ? Math.min(Math.round(r.spent / r.planned * 100), 100) : 0
                    const leftAmt = r.planned - r.spent
                    const over    = leftAmt < 0
                    return (
                      <div key={r.label} className="et-plan-row">
                        <span className="et-plan-row-ico">{r.icon}</span>
                        <span className="et-plan-row-lbl">{r.label}</span>
                        <div className="et-plan-row-bar">
                          <div className="et-plan-row-fill" style={{ width: `${usedPct}%`, background: over ? '#ef4444' : r.color }} />
                        </div>
                        <span className="et-plan-row-spent">
                          {fmtB(r.spent)}<span className="et-plan-row-of"> / {fmtB(r.planned)}</span>
                        </span>
                        <span className={`et-plan-row-left${over ? ' over' : ''}`}>
                          {over ? `${fmtB(Math.abs(leftAmt))} over` : `${fmtB(leftAmt)} left`}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="et-plan-vs">
                  <span>Total spent: <strong>{fmtB(totalSpent)}</strong></span>
                  {planRemain > 0 && (
                    <span className={totalSpent > planRemain ? 'et-plan-over' : 'et-plan-ok'}>
                      {totalSpent > planRemain
                        ? `⚠️ ${fmtB(totalSpent - planRemain)} over plan`
                        : `✓ ${fmtB(planRemain - totalSpent)} remaining`}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* donut + breakdown */}
            <div className="et-overview-grid">
              <div className="et-card">
                <h3 className="et-card-title">Spending Breakdown</h3>
                <div className="et-donut-row">
                  <DonutChart
                    segments={byCategory.map(c => ({ color: c.color, value: c.value }))}
                    size={150}
                    fmtFn={fmt}
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
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Category</th>
                        {isAllTrips && <th>Trip</th>}
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.slice(0, 5).map((e, i) => {
                        const cat = CAT_MAP[e.category] || CAT_MAP.other
                        const expTrip = isAllTrips
                          ? trips.find(t => tripIdOf(t) === String(e.tripId || e.trip_id))
                          : null
                        return (
                          <tr key={e.id || i}>
                            <td>{dateFmt(e.date || e.createdAt)}</td>
                            <td className="et-td-desc">{e.description}</td>
                            <td><span className="et-cat-badge" style={{ background: `${cat.color}20`, color: cat.color }}>{cat.icon} {cat.label}</span></td>
                            {isAllTrips && (
                              <td style={{ fontSize: '12px', color: 'var(--et-muted,#6b7280)', whiteSpace: 'nowrap' }}>
                                {expTrip ? `✈️ ${expTrip.tripName || expTrip.destinationName}` : '—'}
                              </td>
                            )}
                            <td className="et-td-amt">{fmtE(e)}</td>
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
              {isAllTrips && (
                <select className="et-select" value={listTripFilter} onChange={e => setListTripFilter(e.target.value)}>
                  <option value="all">All Created Plans</option>
                  {trips.map(t => (
                    <option key={tripIdOf(t)} value={tripIdOf(t)}>
                      {t.tripName || t.destinationName}
                    </option>
                  ))}
                </select>
              )}
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
                  const expTrip = isAllTrips
                    ? trips.find(t => tripIdOf(t) === String(e.tripId || e.trip_id))
                    : null
                  const expLocked = isAllTrips ? isLockedTrip(expTrip) : activeTripLocked
                  const expTripName = expTrip?.tripName || expTrip?.destinationName
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
                            {expTripName && (
                              <>
                                <span className="et-meta-dot">·</span>
                                <span className="et-expense-trip-chip">✈️ {expTripName}</span>
                              </>
                            )}
                            {tags.length > 0 && tags.map(t => (
                              <span key={t} className="et-expense-tag">{t}</span>
                            ))}
                          </div>
                          {e.notes && <p className="et-expense-notes">{e.notes}</p>}
                        </div>
                      </div>
                      <div className="et-expense-right">
                        <span className="et-expense-amt">{fmtE(e)}</span>
                        <span className="et-expense-currency">{e.currency || 'USD'}</span>
                        <div className="et-expense-actions">
                          <button
                            className="et-action-btn edit"
                            onClick={() => openEdit(e)}
                            title={expLocked ? 'Locked (completed/cancelled trip)' : 'Edit'}
                            disabled={expLocked}
                          >✏️</button>
                          <button
                            className="et-action-btn del"
                            onClick={() => handleDelete(e)}
                            title={expLocked ? 'Locked (completed/cancelled trip)' : 'Delete'}
                            disabled={expLocked}
                          >🗑️</button>
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
              <p className="et-trends-sub">
                {trendSource === 'api'
                  ? 'Live trends are powered by backend price records and blended with your spending history.'
                  : 'Average daily cost per category with your spending history (live price records unavailable).'}
              </p>
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
                        <span className="et-trend-curr">{fmt(convertAmt(curr, "LKR", displayCurrency))}<span className="et-trend-unit">/day avg</span></span>
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
                      <span className="et-pa-curr">{fmt(convertAmt(curr, "LKR", displayCurrency))}</span>
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
