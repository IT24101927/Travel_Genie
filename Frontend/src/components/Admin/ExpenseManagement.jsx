import { useState, useEffect, useCallback, useMemo } from 'react'
import './ExpenseManagement.css'
import { API_BASE } from '../../config/api'
import { validatePositiveNumber } from '../../utils/validation'

const API = API_BASE
const authH = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

/* ── Currency system ─────────────────────────────────────── */
const DISPLAY_CURRENCIES = [
  { code: 'LKR', symbol: 'Rs', label: 'LKR', flag: '🇱🇰' },
  { code: 'USD', symbol: '$',  label: 'USD', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€',  label: 'EUR', flag: '🇪🇺' },
]
// Units of each currency per 1 USD
const CURRENCY_RATES = { LKR: 300, USD: 1, EUR: 0.92 }

function convertAmt(amount, fromCode, toCode) {
  const from = CURRENCY_RATES[(fromCode || 'LKR').toUpperCase()] ?? 300
  const to   = CURRENCY_RATES[(toCode  || 'LKR').toUpperCase()] ?? 300
  return (Number(amount) || 0) / from * to
}
function symFor(code) {
  return DISPLAY_CURRENCIES.find(c => c.code === code)?.symbol ?? code
}
function fmtC(amount, code) {
  return `${symFor(code)} ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/* ── backend category_name (lowercased) → frontend ID ── */
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

/* ── Expense mapper (no user PII stored) ─────────────────── */
const mapExpense = (e) => {
  const catRaw = (e.category?.category_name || 'other').toLowerCase()
  return {
    id:          e.expense_id || e.id,
    userId:      e.user_id    || e.user?.id,
    category:    BACKEND_TO_FRONTEND_CAT[catRaw] || 'other',
    amount:      parseFloat(e.amount) || 0,
    currency:    (e.currency || 'LKR').toUpperCase(),
    expenseType: e.expense_type || 'ACTUAL',
    date:        e.expense_date,
    tripId:      e.trip_id || e.tripPlan?.trip_id,
  }
}

/* ── Trend data (USD monthly averages — matches user side) ── */
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
const TREND_CATEGORIES = [
  { id: 'accommodation',  label: 'Accommodation', icon: '🏨', color: '#0E7C5F' },
  { id: 'transportation', label: 'Transportation', icon: '🚗', color: '#3b82f6' },
  { id: 'food',           label: 'Food & Drink',   icon: '🍽️', color: '#f59e0b' },
  { id: 'activities',     label: 'Activities',     icon: '🎯', color: '#8b5cf6' },
  { id: 'shopping',       label: 'Shopping',       icon: '🛍️', color: '#ec4899' },
  { id: 'entertainment',  label: 'Entertainment',  icon: '🎭', color: '#06b6d4' },
  { id: 'emergency',      label: 'Emergency',      icon: '🚨', color: '#ef4444' },
  { id: 'other',          label: 'Other',          icon: '📦', color: '#6b7280' },
]
const PR_TO_CAT = { hotel: 'accommodation', transport: 'transportation', ticket: 'activities' }
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const EXPENSE_CATEGORIES = TREND_CATEGORIES.map(c => c.id)

function mergeApiPriceTrends(base, rows = []) {
  const next = { ...base }
  const buckets = {}
  rows.forEach(row => {
    const cat = PR_TO_CAT[(row?.item_type || '').toLowerCase()]
    if (!cat) return
    const dt = new Date(row?.recorded_at)
    if (Number.isNaN(dt.getTime())) return
    const month = dt.getMonth()
    const price = Number(row?.price)
    if (!Number.isFinite(price)) return
    if (!buckets[cat]) buckets[cat] = {}
    if (!buckets[cat][month]) buckets[cat][month] = []
    buckets[cat][month].push(price)
  })
  Object.entries(buckets).forEach(([cat, monthMap]) => {
    const arr = [...(next[cat] || new Array(12).fill(0))]
    Object.entries(monthMap).forEach(([m, vals]) => {
      if (!vals.length) return
      arr[Number(m)] = +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2)
    })
    next[cat] = arr
  })
  return next
}

/* ── Sparkline SVG (same as user side) ───────────────────── */
function AdminSparkline({ data, color = '#0E7C5F' }) {
  if (!data || data.length < 2) return null
  const W = 130, H = 40, P = 4
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = P + (i / (data.length - 1)) * (W - P * 2)
    const y = H - P - ((v - min) / range) * (H - P * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const last2 = data.slice(-2)
  const dir   = last2[1] > last2[0] ? '↑' : last2[1] < last2[0] ? '↓' : '→'
  const dcol  = last2[1] > last2[0] ? '#ef4444' : '#0E7C5F'
  return (
    <div className="adm-sparkline">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        <defs>
          <linearGradient id={`sg${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`${P},${H} ${pts.join(' ')} ${W - P},${H}`}
          fill={`url(#sg${color.replace('#','')})`}
        />
        <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => i === data.length - 1 && (
          <circle key={i} cx={p.split(',')[0]} cy={p.split(',')[1]} r="3.5" fill={color} />
        ))}
      </svg>
      <span className="adm-spark-dir" style={{ color: dcol }}>{dir}</span>
    </div>
  )
}

/* ── Searchable Place Picker ─────────────────────────────── */
function PlaceSearch({ value, onSelect }) {
  const [query,   setQuery]   = useState('')
  const [open,    setOpen]    = useState(false)
  const [places,  setPlaces]  = useState([])
  const [loading, setLoading] = useState(false)
  const [loaded,  setLoaded]  = useState(false)

  const loadPlaces = useCallback(async () => {
    if (loaded) return
    setLoading(true)
    try {
      const res  = await fetch(`${API}/places?limit=500`)
      const data = await res.json()
      if (data.success) setPlaces(data.data || [])
      setLoaded(true)
    } catch { /* silent */ } finally { setLoading(false) }
  }, [loaded])

  const selected = places.find(p => String(p.place_id) === String(value))
  const display  = open ? query : (selected ? `${selected.name} (ID #${selected.place_id})` : query)
  const filtered = (open && query)
    ? places.filter(p => p.name?.toLowerCase().includes(query.toLowerCase()))
    : places

  return (
    <div className="pls-wrap">
      <div className="pls-input-row">
        <input
          className="filter-input pls-input"
          placeholder="Search place name…"
          value={display}
          onFocus={() => { setOpen(true); setQuery(''); loadPlaces() }}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          autoComplete="off"
        />
        {value && selected && (
          <span className="pls-id-tag">ID #{value}</span>
        )}
        {value && (
          <button type="button" className="pls-clear" onClick={() => { onSelect(''); setQuery('') }}>✕</button>
        )}
      </div>
      {open && (
        <div className="pls-dropdown">
          {loading && <div className="pls-msg">⏳ Loading places…</div>}
          {!loading && filtered.length === 0 && <div className="pls-msg">No places found.</div>}
          {!loading && filtered.slice(0, 25).map(p => (
            <div
              key={p.place_id}
              className={`pls-item${String(value) === String(p.place_id) ? ' active' : ''}`}
              onMouseDown={() => { onSelect(p.place_id); setQuery(''); setOpen(false) }}
            >
              <span className="pls-name">{p.name}</span>
              <span className="pls-meta">
                {p.district?.name ? `${p.district.name} · ` : ''}{p.type || ''} · ID #{p.place_id}
              </span>
            </div>
          ))}
          {!loading && filtered.length > 25 && (
            <div className="pls-msg pls-more">+{filtered.length - 25} more — type to narrow down</div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Main Component ──────────────────────────────────────── */
function ExpenseManagement() {
  const [expenses,    setExpenses]    = useState([])
  const [adminTrips,  setAdminTrips]  = useState([])
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [toastMsg,    setToastMsg]    = useState(null)

  // currency
  const [displayCurrency, setDisplayCurrency] = useState('LKR')

  // budget alerts
  const [alertingUserId,   setAlertingUserId]   = useState(null)
  const [sentBudgetAlerts, setSentBudgetAlerts] = useState({})
  const [autoBudgetAlerts, setAutoBudgetAlerts] = useState({})
  const [sentAlertHistory, setSentAlertHistory] = useState([])
  const [loadingAlerts,    setLoadingAlerts]    = useState(false)

  // trip budget health ui
  const [tripSearch,    setTripSearch]    = useState('')
  const [showAllTrips,  setShowAllTrips]  = useState(false)

  // price records
  const [priceRecords,  setPriceRecords]  = useState([])
  const [prLoading,     setPrLoading]     = useState(false)
  const [showPrForm,    setShowPrForm]    = useState(false)
  const [prSaving,      setPrSaving]      = useState(false)
  const [deletingPrId,  setDeletingPrId]  = useState(null)
  const [prForm, setPrForm] = useState({ place_id: '', item_type: 'hotel', price: '', currency: displayCurrency })

  // price records search and filter
  const [prSearch, setPrSearch] = useState('')
  const [prItemTypeFilter, setPrItemTypeFilter] = useState('all')

  const filteredPriceRecords = useMemo(() => {
    return priceRecords.filter(r => {
      const matchSearch = !prSearch || 
                          (r.place?.name || '').toLowerCase().includes(prSearch.toLowerCase()) || 
                          String(r.place_id).includes(prSearch.toLowerCase());
      const matchType = prItemTypeFilter === 'all' || r.item_type === prItemTypeFilter;

      return matchSearch && matchType;
    });
  }, [priceRecords, prSearch, prItemTypeFilter])

  // trends
  const [trendData,    setTrendData]    = useState(PRICE_TRENDS_SEED)
  const [trendSource,  setTrendSource]  = useState('seed')
  const [trendLoading, setTrendLoading] = useState(false)
  const [trendError,   setTrendError]   = useState('')

  // modals
  const [showModal,  setShowModal]  = useState(false)
  const [modalMode,  setModalMode]  = useState('trends')

  const showToast = (msg, type = 'success') => {
    setToastMsg({ msg, type })
    setTimeout(() => setToastMsg(null), 3000)
  }

  // convert expense (any stored currency) → display currency directly
  const expD = useCallback((amount, cur) => convertAmt(amount, cur, displayCurrency), [displayCurrency])

  /* ── load ── */
  const loadExpenses = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res  = await fetch(`${API}/expenses/admin/all?limit=100000`, { headers: authH() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to load expense analytics')
      setExpenses((data.data || []).map(mapExpense))
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadExpenses() }, [loadExpenses])

  useEffect(() => {
    fetch(`${API}/trips/all?limit=100000`, { headers: authH() })
      .then(r => r.json()).then(d => { if (d.success) setAdminTrips(d.data || []) })
      .catch(() => {})
  }, [])

  /* ── price records ── */
  const loadPriceRecords = useCallback(async () => {
    setPrLoading(true)
    try {
      const res  = await fetch(`${API}/price-records?limit=200`, { headers: authH() })
      const data = await res.json()
      if (res.ok && data.success) setPriceRecords(data.data || [])
    } catch { /* silent */ } finally { setPrLoading(false) }
  }, [])

  useEffect(() => { loadPriceRecords() }, [loadPriceRecords])

  const handleAddPriceRecord = async (e) => {
    e.preventDefault()
    const placeIdNum = parseInt(prForm.place_id, 10)
    if (!placeIdNum || placeIdNum <= 0) { showToast('⚠️ Please select a place from the search.', 'error'); return }
    const check = validatePositiveNumber(prForm.price, 'Price')
    if (!check.valid) { showToast(`⚠️ ${check.message}`, 'error'); return }
    // store price as USD regardless of input currency
    const priceUSD = convertAmt(parseFloat(prForm.price), prForm.currency, 'USD')
    setPrSaving(true)
    try {
      const res  = await fetch(`${API}/price-records`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ place_id: placeIdNum, item_type: prForm.item_type, price: +priceUSD.toFixed(4) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to add price record')
      showToast('✅ Price record added — user trend charts will update.')
      setPrForm({ place_id: '', item_type: 'hotel', price: '', currency: displayCurrency })
      setShowPrForm(false)
      loadPriceRecords()
    } catch (err) { showToast(`⚠️ ${err.message}`, 'error') }
    finally { setPrSaving(false) }
  }

  const handleDeletePriceRecord = async (id) => {
    if (!window.confirm('Delete this price record?')) return
    setDeletingPrId(id)
    try {
      const res  = await fetch(`${API}/price-records/${id}`, { method: 'DELETE', headers: authH() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to delete')
      setPriceRecords(prev => prev.filter(r => (r.price_id || r.record_id || r.id) !== id))
      showToast('🗑️ Price record deleted.', 'delete')
    } catch (err) { showToast(`⚠️ ${err.message}`, 'error') }
    finally { setDeletingPrId(null) }
  }

  /* ── trends ── */
  const loadTrends = useCallback(async () => {
    setTrendLoading(true); setTrendError('')
    try {
      const res  = await fetch(`${API}/price-records?limit=500`, { headers: authH() })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Failed')
      const merged = mergeApiPriceTrends(PRICE_TRENDS_SEED, data?.data || [])
      setTrendData(merged)
      setTrendSource(Object.keys(data?.data || []).length > 0 ? 'api' : 'seed')
    } catch (err) {
      setTrendError(err.message)
      setTrendData(PRICE_TRENDS_SEED)
      setTrendSource('seed')
    } finally { setTrendLoading(false) }
  }, [])

  useEffect(() => {
    if (showModal && modalMode === 'trends') loadTrends()
  }, [showModal, modalMode, loadTrends])

  /* ── sent alerts ── */
  const loadSentAlerts = useCallback(async () => {
    setLoadingAlerts(true)
    try {
      const res  = await fetch(`${API}/notifications/admin/expense-alert-history?limit=200`, { headers: authH() })
      const raw  = await res.text()
      const data = raw ? JSON.parse(raw) : null
      setSentAlertHistory(res.ok && data?.success && Array.isArray(data.data) ? data.data : [])
    } catch { setSentAlertHistory([]) }
    finally { setLoadingAlerts(false) }
  }, [])

  useEffect(() => { if (expenses.length) loadSentAlerts() }, [expenses, loadSentAlerts])

  /* ── aggregate stats (currency-aware) ── */
  const stats = useMemo(() => {
    const total     = expenses.reduce((s, e) => s + expD(e.amount, e.currency), 0)
    const actual    = expenses.filter(e => e.expenseType === 'ACTUAL')   .reduce((s, e) => s + expD(e.amount, e.currency), 0)
    const estimated = expenses.filter(e => e.expenseType === 'ESTIMATED').reduce((s, e) => s + expD(e.amount, e.currency), 0)
    return { count: expenses.length, total, actual, estimated }
  }, [expenses, expD])

  /* ── category breakdown (currency-aware) ── */
  const categoryBreakdown = useMemo(() => {
    const out = {}
    EXPENSE_CATEGORIES.forEach(cat => {
      const rows = expenses.filter(e => e.category === cat)
      out[cat] = {
        total: rows.reduce((s, e) => s + expD(e.amount, e.currency), 0),
        count: rows.length,
      }
    })
    return out
  }, [expenses, expD])

  /* ── trip budget usage (internal: LKR, display: converted) ── */
  const budgetUsageByTrip = useMemo(() => {
    const map = new Map()
    adminTrips.forEach(t => {
      const tripId = Number(t?.trip_id)
      const userId = Number(t?.user_id || t?.user?.id)
      if (!tripId || !userId) return
      const budgetLkr = convertAmt(t?.total_budget || 0, t?.budget_currency || 'LKR', 'LKR')
      map.set(tripId, { tripId, tripTitle: t?.title || `Trip #${tripId}`, userId, budgetLkr, usedLkr: 0 })
    })
    expenses.forEach(e => {
      const tripId = Number(e.tripId)
      if (!tripId || (e.expenseType || 'ACTUAL') !== 'ACTUAL') return
      const cur = map.get(tripId)
      if (cur) cur.usedLkr += convertAmt(e.amount, e.currency, 'LKR')
    })
    return Array.from(map.values()).map(r => {
      const pct = r.budgetLkr > 0 ? (r.usedLkr / r.budgetLkr) * 100 : 0
      return { ...r, usagePct: pct, pctClamped: Math.min(Math.max(pct, 0), 100), isExceeded: r.budgetLkr > 0 && pct >= 100 }
    }).sort((a, b) => b.usagePct - a.usagePct)
  }, [adminTrips, expenses])

  useEffect(() => {
    const ids = budgetUsageByTrip.filter(u => u.isExceeded).map(u => u.userId).filter(Boolean)
    if (!ids.length) { setAutoBudgetAlerts({}); return }
    fetch(`${API}/notifications/admin/budget-auto-status?user_ids=${ids.join(',')}`, { headers: authH() })
      .then(r => r.json()).then(d => {
        if (!d?.success || !Array.isArray(d.data)) return
        const m = {}; d.data.forEach(id => { m[Number(id)] = true })
        setAutoBudgetAlerts(m)
      }).catch(() => {})
  }, [budgetUsageByTrip])

  const sendBudgetAlert = async (u) => {
    if (!u?.userId || !u?.tripId || !u.isExceeded) return
    const key = `${u.userId}:${u.tripId}`
    const def = `Budget alert: You have used ${Math.round(u.usagePct)}% of your planned trip budget for "${u.tripTitle || `Trip #${u.tripId}`}". Please review your expenses.`
    const msg = window.prompt(`Edit alert for trip "${u.tripTitle || `Trip #${u.tripId}`}":`, def)
    if (msg === null) return
    if (!msg.trim()) { showToast('⚠️ Alert message cannot be empty', 'error'); return }
    setAlertingUserId(key)
    try {
      const res  = await fetch(`${API}/notifications`, {
        method: 'POST', headers: authH(),
        body: JSON.stringify({ user_id: u.userId, trip_id: u.tripId, type: 'BUDGET_100', message: msg.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to send alert')
      setSentBudgetAlerts(prev => ({ ...prev, [key]: true }))
      loadSentAlerts()
      showToast(`🔔 Budget alert sent for "${u.tripTitle || `Trip #${u.tripId}`}"`)
    } catch (err) { showToast(`⚠️ ${err.message}`, 'error') }
    finally { setAlertingUserId(null) }
  }

  const editAlert  = async (a) => {
    if (!a?.notification_id) return
    const msg = window.prompt('Edit alert message:', a.message || '')
    if (!msg?.trim()) return
    try {
      const res  = await fetch(`${API}/notifications/${a.notification_id}`, { method: 'PUT', headers: authH(), body: JSON.stringify({ message: msg.trim() }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setSentAlertHistory(prev => prev.map(r => r.notification_id === a.notification_id ? { ...r, message: msg.trim() } : r))
      showToast('✅ Alert updated')
    } catch (err) { showToast(`⚠️ ${err.message}`, 'error') }
  }

  const deleteAlert = async (a) => {
    if (!a?.notification_id || !window.confirm('Delete this alert?')) return
    try {
      const res  = await fetch(`${API}/notifications/${a.notification_id}`, { method: 'DELETE', headers: authH() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setSentAlertHistory(prev => prev.filter(r => r.notification_id !== a.notification_id))
      showToast('🗑️ Alert deleted', 'delete')
    } catch (err) { showToast(`⚠️ ${err.message}`, 'error') }
  }

  /* ── filtered / paged trip budget ── */
  const [tripStatusFilter, setTripStatusFilter] = useState('all')

  const filteredTrips = useMemo(() => {
    return budgetUsageByTrip.filter(u => {
      const matchSearch = !tripSearch || u.tripTitle.toLowerCase().includes(tripSearch.toLowerCase())
      let matchStatus = true
      if (tripStatusFilter === 'exceeded') matchStatus = u.isExceeded
      else if (tripStatusFilter === 'warning') matchStatus = !u.isExceeded && u.usagePct >= 80
      else if (tripStatusFilter === 'safe') matchStatus = u.usagePct < 80
      return matchSearch && matchStatus
    })
  }, [budgetUsageByTrip, tripSearch, tripStatusFilter])

  const TRIPS_PAGE = 12
  const visibleTrips = showAllTrips ? filteredTrips : filteredTrips.slice(0, TRIPS_PAGE)

  const currentMonth = new Date().getMonth()
  const sym = symFor(displayCurrency)

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <div className="expense-management">
      {toastMsg && <div className={`admin-toast ${toastMsg.type}`}>{toastMsg.msg}</div>}
      {error && (
        <div className="admin-error-banner">
          Error: {error} — <button onClick={loadExpenses}>Retry</button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="em-header">
        <div>
          <h1 className="em-title">Platform Analytics & Price Management</h1>
          <p className="em-subtitle">Aggregate spending insights, travel price records, and budget health</p>
        </div>
        <div className="header-actions">
          <div className="currency-toggle">
            {DISPLAY_CURRENCIES.map(c => (
              <button
                key={c.code}
                className={`curr-btn${displayCurrency === c.code ? ' active' : ''}`}
                onClick={() => setDisplayCurrency(c.code)}
              >
                {c.flag} {c.code}
              </button>
            ))}
          </div>
          <button className="btn-alerts" onClick={() => { setModalMode('alerts'); setShowModal(true); loadSentAlerts() }}>
            🔔 Sent Alerts ({sentAlertHistory.length})
          </button>
          <button className="btn-trends" onClick={() => { setModalMode('trends'); setShowModal(true) }}>
            📈 View Trends
          </button>
        </div>
      </div>

      {/* ── Platform Stats ── */}
      <div className="budget-overview">
        <h2 className="overview-title">📊 Platform Spending Overview</h2>
        <div className="budget-cards">
          <div className="budget-card">
            <span className="budget-label">Total Expense Records</span>
            <span className="budget-value">{loading ? '…' : stats.count}</span>
          </div>
          <div className="budget-card">
            <span className="budget-label">Platform Total ({sym})</span>
            <span className="budget-value spent">{loading ? '…' : fmtC(stats.total, displayCurrency)}</span>
          </div>
          <div className="budget-card">
            <span className="budget-label">Completed / Paid ({sym})</span>
            <span className="budget-value under">
              {loading ? '…' : fmtC(stats.actual, displayCurrency)}
              {!loading && stats.actual === 0 && stats.count > 0 && (
                <span className="stat-note">All in planned stage</span>
              )}
            </span>
          </div>
          <div className="budget-card">
            <span className="budget-label">Planned / Estimated ({sym})</span>
            <span className={`budget-value ${stats.estimated > 0 ? 'over' : 'under'}`}>
              {loading ? '…' : fmtC(stats.estimated, displayCurrency)}
            </span>
          </div>
        </div>

        <div className="budget-progress-container">
          <div className="progress-labels">
            <span>Paid vs Total</span>
            <span>{stats.total > 0 ? ((stats.actual / stats.total) * 100).toFixed(1) : 0}% paid</span>
          </div>
          <div className="budget-progress-bar">
            <div
              className="budget-progress-fill"
              style={{ width: `${stats.total > 0 ? Math.min((stats.actual / stats.total) * 100, 100) : 0}%` }}
            />
          </div>
        </div>
        {stats.actual === 0 && stats.count > 0 && !loading && (
          <p className="stats-hint">
            ℹ️ 0 paid expenses means all {stats.count} records are in "Estimated/Planned" stage.
            Users mark expenses as Actual once they pay them on their trip.
          </p>
        )}
      </div>

      {/* ── Category Breakdown ── */}
      <div className="category-breakdown">
        <h2 className="section-title">📊 Category Breakdown <span className="section-currency-label">({sym})</span></h2>
        <div className="category-grid">
          {TREND_CATEGORIES.map(({ id, label, icon }) => {
            const cat = categoryBreakdown[id]
            if (!cat || cat.count === 0) return null
            return (
              <div key={id} className="category-card">
                <h3>{icon} {label}</h3>
                <div className="category-amounts">
                  <div className="amount-row">
                    <span className="amount-label">Total:</span>
                    <span className="amount-value">{fmtC(cat.total, displayCurrency)}</span>
                  </div>
                </div>
                <span className="category-count">{cat.count} expense{cat.count !== 1 ? 's' : ''}</span>
              </div>
            )
          })}
          {Object.values(categoryBreakdown).every(v => v.count === 0) && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No expense data yet.</p>
          )}
        </div>
      </div>

      {/* ── Trip Budget Health ── */}
      <div className="user-budget-usage">
        <div className="ubu-header-row">
          <div>
            <h2 className="section-title">🎯 Trip Budget Health</h2>
            <p className="ubu-subtitle">
              Budget vs actual spend per trip — amounts in {sym}. User identities not shown.
            </p>
          </div>
          <div className="ubu-search-wrap" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <div className="filter-pill-group" style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
              {[
                { id: 'all', label: 'All Status' },
                { id: 'exceeded', label: 'Exceeded' },
                { id: 'warning', label: 'Warning (80%+)' },
                { id: 'safe', label: 'Safe' },
              ].map(opt => (
                <button
                  key={opt.id}
                  className={`filter-pill-btn ${tripStatusFilter === opt.id ? 'active' : ''}`}
                  onClick={() => { setTripStatusFilter(opt.id); setShowAllTrips(false); }}
                  style={{
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: tripStatusFilter === opt.id ? '600' : '500',
                    cursor: 'pointer',
                    background: tripStatusFilter === opt.id ? '#ffffff' : 'transparent',
                    color: tripStatusFilter === opt.id ? '#0E7C5F' : '#64748b',
                    boxShadow: tripStatusFilter === opt.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                className="filter-input ubu-search"
                placeholder="🔍 Search trip..."
                value={tripSearch}
                onChange={e => { setTripSearch(e.target.value); setShowAllTrips(false) }}
              />
              {tripSearch && (
                <button className="ubu-clear-btn" onClick={() => setTripSearch('')}>✕</button>
              )}
            </div>
          </div>
        </div>

        {filteredTrips.length > 0 ? (
          <>
            <p className="ubu-count-label">
              Showing {visibleTrips.length} of {filteredTrips.length} trip{filteredTrips.length !== 1 ? 's' : ''}
              {tripSearch ? ` matching "${tripSearch}"` : ''}
            </p>
            <div className="ubu-grid">
              {visibleTrips.map(u => {
                const key = `${u.userId}:${u.tripId}`
                const budgetDisplay = convertAmt(u.budgetLkr, 'LKR', displayCurrency)
                const usedDisplay   = convertAmt(u.usedLkr,   'LKR', displayCurrency)
                return (
                  <div key={key} className={`ubu-card ${u.isExceeded ? 'exceeded' : ''}`}>
                    <div className="ubu-circle-wrap">
                      <div
                        className={`ubu-circle ${u.isExceeded ? 'exceeded' : u.usagePct >= 80 ? 'warning' : 'safe'}`}
                        style={{ '--pct': `${u.pctClamped}%` }}
                      >
                        <span>{Math.round(u.usagePct)}%</span>
                      </div>
                    </div>
                    <div className="ubu-info">
                      <h3>{u.tripTitle}</h3>
                      <p>Budget: {fmtC(budgetDisplay, displayCurrency)}</p>
                      <p>Used: {fmtC(usedDisplay, displayCurrency)}</p>
                      {u.isExceeded && <span className="ubu-exceeded-tag">Budget exceeded</span>}
                    </div>
                    <div className="ubu-actions">
                      {u.isExceeded ? (
                        <>
                          <button
                            className="ubu-alert-btn"
                            onClick={() => sendBudgetAlert(u)}
                            disabled={alertingUserId === key || sentBudgetAlerts[key]}
                          >
                            {sentBudgetAlerts[key] ? 'Alert Sent' : alertingUserId === key ? 'Sending…' : 'Alert User'}
                          </button>
                          {autoBudgetAlerts[u.userId] && <span className="ubu-auto-tag">Auto sent</span>}
                        </>
                      ) : (
                        <span className="ubu-ok-tag">Within budget</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {filteredTrips.length > TRIPS_PAGE && (
              <div className="ubu-see-more">
                <button className="ubu-see-more-btn" onClick={() => setShowAllTrips(s => !s)}>
                  {showAllTrips
                    ? `▲ Show less`
                    : `▼ Show all ${filteredTrips.length} trips`}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">{tripSearch ? '🔍' : '📊'}</span>
            <h3>{tripSearch ? `No trips matching "${tripSearch}"` : 'No trip budget data yet'}</h3>
            <p>{tripSearch ? 'Try a different search term.' : 'Create trip plans with budgets to see usage here.'}</p>
          </div>
        )}
      </div>

      {/* ── Price Records Management ── */}
      <div className="price-records-section">
        <div className="pr-section-header">
          <div>
            <h2 className="section-title">💹 Price Records</h2>
            <p className="ubu-subtitle">
              Manage market prices per place. These feed directly into user-side monthly trend charts.
            </p>
          </div>
          <button className="btn-trends" onClick={() => {
            if (!showPrForm) {
              setPrForm(f => ({ ...f, currency: displayCurrency }))
            }
            setShowPrForm(s => !s)
          }}>
            {showPrForm ? '✕ Cancel' : '+ Add Price Record'}
          </button>
        </div>

        {/* ── How it works — instruction flow ── */}
        <div className="pr-how-it-works">
          <p className="pr-how-title">How price records work</p>
          <div className="pr-flow">
            <div className="pr-step">
              <div className="pr-step-num">1</div>
              <div className="pr-step-icon">🏨🚗🎯</div>
              <div className="pr-step-text">
                <strong>You add a record</strong>
                <span>Pick a place, set the item type (Hotel, Transport, or Ticket/Activity) and enter the current market price.</span>
              </div>
            </div>
            <div className="pr-flow-arrow">→</div>
            <div className="pr-step">
              <div className="pr-step-num">2</div>
              <div className="pr-step-icon">💾</div>
              <div className="pr-step-text">
                <strong>Stored in DB</strong>
                <span>Saved to the <code>price_records</code> table with today's date. Historical records build a timeline.</span>
              </div>
            </div>
            <div className="pr-flow-arrow">→</div>
            <div className="pr-step">
              <div className="pr-step-num">3</div>
              <div className="pr-step-icon">📊</div>
              <div className="pr-step-text">
                <strong>User opens Trends</strong>
                <span>In Expense Tracker → Trends tab, the app fetches <code>/api/price-records</code> and merges your data with base estimates.</span>
              </div>
            </div>
            <div className="pr-flow-arrow">→</div>
            <div className="pr-step">
              <div className="pr-step-num">4</div>
              <div className="pr-step-icon">📈</div>
              <div className="pr-step-text">
                <strong>Chart updates</strong>
                <span>The matching category's monthly average is replaced with your real price, giving users accurate data to plan budgets.</span>
              </div>
            </div>
          </div>
          <div className="pr-type-map">
            <span className="pr-type-pill hotel">🏨 Hotel → Accommodation trend</span>
            <span className="pr-type-pill transport">🚗 Transport → Transportation trend</span>
            <span className="pr-type-pill ticket">🎯 Ticket → Activities trend</span>
          </div>
        </div>

        {showPrForm && (
          <form className="pr-add-form" onSubmit={handleAddPriceRecord}>
            <p className="pr-add-title">Add New Price Record</p>
            <div className="pr-form-row">
              <div className="form-group pr-place-group">
                <label>Place <span className="req">*</span></label>
                <PlaceSearch
                  value={prForm.place_id}
                  onSelect={(id) => setPrForm(f => ({ ...f, place_id: id }))}
                />
              </div>
              <div className="form-group">
                <label>Item Type <span className="req">*</span></label>
                <select className="filter-select" value={prForm.item_type} onChange={e => setPrForm(f => ({ ...f, item_type: e.target.value }))}>
                  <option value="hotel">🏨 Hotel / Accommodation</option>
                  <option value="transport">🚗 Transport</option>
                  <option value="ticket">🎯 Activities / Ticket</option>
                </select>
              </div>
              <div className="form-group">
                <label>Price <span className="req">*</span></label>
                <input
                  type="number"
                  className="filter-input"
                  value={prForm.price}
                  onChange={e => setPrForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="e.g. 45"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="form-group">
                <label>Currency</label>
                <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '8px', height: '42px', alignItems: 'center', width: 'fit-content' }}>
                  {DISPLAY_CURRENCIES.map(c => (
                    <button
                      type="button"
                      key={c.code}
                      onClick={() => setPrForm(f => ({ ...f, currency: c.code }))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '0 12px',
                        height: '100%',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        background: prForm.currency === c.code ? '#0E7C5F' : 'transparent',
                        color: prForm.currency === c.code ? '#ffffff' : '#64748b',
                        boxShadow: prForm.currency === c.code ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span style={{ fontSize: '1.1em' }}>{c.flag}</span>
                      <span>{c.code}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                <label>&nbsp;</label>
                <button type="submit" className="btn-submit" disabled={prSaving}>
                  {prSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
            <p className="pr-form-hint">
              Any currency you enter is auto-converted to USD before saving (matches the seed trend data scale).
              {prForm.price && prForm.currency !== 'USD' && (
                <> Preview: will store <strong>$ {convertAmt(parseFloat(prForm.price) || 0, prForm.currency, 'USD').toFixed(2)}</strong> USD.</>
              )}
            </p>
          </form>
        )}

        {prLoading ? (
          <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)' }}>⏳ Loading price records…</div>
        ) : (
          <>
            <div className="filters-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-start', marginTop: '20px', marginBottom: '15px' }}>
              <div style={{ position: 'relative' }}>
                <span className="search-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>🔍</span>
                <input
                  type="text"
                  className="filter-input search-input"
                  style={{ paddingLeft: '36px' }}
                  placeholder="Search place name or ID..."
                  value={prSearch}
                  onChange={(e) => setPrSearch(e.target.value)}
                />
                {prSearch && (
                  <button className="clear-search ubu-clear-btn" onClick={() => setPrSearch('')}>✕</button>
                )}
              </div>
              
              <div className="filter-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="filter-pill-group" style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                  {[
                    { id: 'all', label: 'All Types' },
                    { id: 'hotel', label: '🏨 Hotel' },
                    { id: 'transport', label: '🚗 Transport' },
                    { id: 'ticket', label: '🎯 Ticket' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      className={`filter-pill-btn ${prItemTypeFilter === opt.id ? 'active' : ''}`}
                      onClick={() => setPrItemTypeFilter(opt.id)}
                      style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: prItemTypeFilter === opt.id ? '600' : '500',
                        cursor: 'pointer',
                        background: prItemTypeFilter === opt.id ? '#ffffff' : 'transparent',
                        color: prItemTypeFilter === opt.id ? '#0E7C5F' : '#64748b',
                        boxShadow: prItemTypeFilter === opt.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredPriceRecords.length > 0 ? (
              <div className="pr-table-wrap">
                <table className="expenses-table">
                  <thead>
                    <tr>
                      <th>Place</th>
                      <th>Item Type</th>
                      <th>Price (USD stored)</th>
                      <th>≈ {sym}</th>
                      <th>Recorded</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPriceRecords.map(r => {
                      const rid = r.price_id || r.record_id || r.id
                      const priceUSD = Number(r.price || 0)
                      const priceDisp = convertAmt(priceUSD, 'USD', displayCurrency)
                      return (
                        <tr key={rid}>
                          <td><strong>{r.place?.name || `Place #${r.place_id}`}</strong></td>
                          <td><span className="category-badge">{r.item_type}</span></td>
                          <td><span className="amount-badge actual">$ {priceUSD.toFixed(2)}</span></td>
                          <td><span className="amount-badge">{fmtC(priceDisp, displayCurrency)}</span></td>
                          <td>{r.recorded_at ? new Date(r.recorded_at).toLocaleDateString() : '—'}</td>
                          <td className="td-actions">
                            <button
                              className="btn-table-delete"
                              onClick={() => handleDeletePriceRecord(rid)}
                              disabled={deletingPrId === rid}
                              title="Delete"
                            >
                              {deletingPrId === rid ? '⏳' : '🗑️'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">💹</span>
                <h3>No price records found</h3>
                <p>Try adjusting your search criteria or add new records above.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ════ TRENDS MODAL (user-style category sparklines) ════ */}
      {showModal && modalMode === 'trends' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>📈 Travel Cost Trends</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {trendSource === 'api' ? 'Live data from price records' : 'Seed estimates — add price records for live data'} •
                  Showing in {sym} • Current month: {MONTHS[currentMonth]}
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {trendError && <p className="alerts-info" style={{ color: 'var(--warning)' }}>⚠️ {trendError}</p>}
            {trendLoading && <p className="alerts-info">⏳ Loading live trends…</p>}

            <div className="adm-trend-grid">
              {TREND_CATEGORIES.map(({ id, label, icon, color }) => {
                const raw = trendData[id] || []
                if (!raw.length) return null
                const inDisplay = raw.map(v => convertAmt(v, 'USD', displayCurrency))
                const cur   = inDisplay[currentMonth] || 0
                const prev  = inDisplay[currentMonth > 0 ? currentMonth - 1 : 11] || 0
                const diff  = cur - prev
                const diffPct = prev > 0 ? ((diff / prev) * 100).toFixed(1) : null
                const min   = Math.min(...inDisplay), max = Math.max(...inDisplay)
                return (
                  <div key={id} className="adm-trend-card">
                    <div className="adm-trend-card-header">
                      <span className="adm-trend-icon" style={{ background: color + '22', color }}>{icon}</span>
                      <div>
                        <span className="adm-trend-label">{label}</span>
                        <span className="adm-trend-current">{fmtC(cur, displayCurrency)}</span>
                        {diffPct !== null && (
                          <span className={`adm-trend-change ${diff >= 0 ? 'up' : 'down'}`}>
                            {diff >= 0 ? '↑' : '↓'} {Math.abs(diff).toFixed(2)} ({diff >= 0 ? '+' : ''}{diffPct}%) vs last month
                          </span>
                        )}
                      </div>
                    </div>
                    <AdminSparkline data={inDisplay} color={color} />
                    <div className="adm-trend-months">
                      {MONTHS.map((m, i) => (
                        <span
                          key={m}
                          className={`adm-month-label${i === currentMonth ? ' current' : ''}`}
                          title={`${m}: ${fmtC(inDisplay[i] || 0, displayCurrency)}`}
                        >{m[0]}</span>
                      ))}
                    </div>
                    <div className="adm-trend-range">
                      <span>Min: {fmtC(min, displayCurrency)}</span>
                      <span>Max: {fmtC(max, displayCurrency)}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ ALERTS MODAL ════ */}
      {showModal && modalMode === 'alerts' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔔 Sent Budget Alert History</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <p className="alerts-info">Budget and price-change alerts sent to users via the platform.</p>

            {loadingAlerts ? (
              <div style={{ textAlign: 'center', padding: '26px', color: 'var(--text-muted)' }}>⏳ Loading…</div>
            ) : sentAlertHistory.length > 0 ? (
              <div className="alerts-list">
                {sentAlertHistory.map(a => {
                  const isAuto    = a.type === 'BUDGET_80' || a.type === 'BUDGET_100'
                  const canManage = !!a.notification_id && !isAuto
                  return (
                    <div key={a.notification_id} className="alert-card severity-medium">
                      <div className="alert-icon">🔔</div>
                      <div className="alert-content">
                        <div className="alert-header">
                          <h3>{a.trip_id ? `Trip #${a.trip_id}` : 'Platform Alert'}</h3>
                          <span className="alert-category">{(a.type || 'INFO').replace(/_/g, ' ')}</span>
                        </div>
                        <div className="alert-details">
                          <span className="new-price" style={{ fontWeight: 600 }}>{a.message}</span>
                        </div>
                        <div className="alert-meta">
                          <span>📅 {a.created_at ? new Date(a.created_at).toLocaleString() : 'This session'}</span>
                          <span className="severity-badge medium">{a.is_read ? 'Read' : 'Unread'}</span>
                          {isAuto && <span className="severity-badge legacy">Auto sent</span>}
                        </div>
                        {canManage && (
                          <div className="alert-actions">
                            <button className="btn-history-edit"   onClick={() => editAlert(a)}>✏️ Edit</button>
                            <button className="btn-history-delete" onClick={() => deleteAlert(a)}>🗑️ Delete</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="no-alerts">
                <span className="empty-icon">✅</span>
                <h3>No sent alerts yet</h3>
                <p>Send a budget alert from an exceeded trip and it will appear here.</p>
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExpenseManagement
