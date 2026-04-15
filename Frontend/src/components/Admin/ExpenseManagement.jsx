import { useState, useEffect, useCallback, useMemo } from 'react'
import './ExpenseManagement.css'
import { API_BASE } from '../../config/api'
import { validatePositiveNumber, validateTripDate } from '../../utils/validation'

const API = API_BASE
const authH = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

const mapExpense = (e) => ({
  id: e.expense_id || e.id,
  userId: e.user_id || e.user?.id,
  userName: e.user?.name || 'Unknown User',
  category: (e.category?.category_name || 'Other').toLowerCase(),
  category_id: e.category_id,
  description: e.note || '',
  amount: parseFloat(e.amount) || 0,
  currency: e.currency || 'LKR',
  paymentMethod: e.payment_method || 'cash',
  expenseType: e.expense_type || 'ACTUAL',
  date: e.expense_date,
  tripId: e.trip_id || e.tripPlan?.trip_id,
  tripTitle: e.tripPlan?.title || `Trip #${e.trip_id || e.tripPlan?.trip_id || ''}`,
  notes: e.note || '',
})

const CURRENCY_TO_LKR = { LKR: 1, USD: 1 / 0.0033, EUR: 1 / 0.0031 }
const toLKR = (amount, currency) => {
  const rate = CURRENCY_TO_LKR[(currency || 'LKR').toUpperCase()] || 1
  return (Number(amount) || 0) * rate
}
const fmtLkr = (amount) => `LKR ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const buildExpenseAlertMessage = (expense) => (
  `Admin alert: Please review your expense ${expense.currency} ${expense.amount.toFixed(2)} (${expense.category || 'other'}) on ${new Date(expense.date).toLocaleDateString()}.`
)

const DEFAULT_HISTORICAL_PRICES = {
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
}

const ITEM_TYPE_LABELS = {
  hotel: 'Hotel',
  ticket: 'Activities',
  transport: 'Transport',
}

const mapPriceRecordsToHistory = (rows = []) => {
  const grouped = {}

  rows.forEach((row) => {
    const placeName = row?.place?.name || `Place #${row?.place_id || 'Unknown'}`
    const itemType = ITEM_TYPE_LABELS[(row?.item_type || '').toLowerCase()] || (row?.item_type || 'Price')
    const key = `${placeName} (${itemType})`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push({
      date: row?.recorded_at,
      price: Number(row?.price) || 0,
    })
  })

  Object.keys(grouped).forEach((key) => {
    grouped[key].sort((a, b) => new Date(a.date) - new Date(b.date))
  })

  return grouped
}

function ExpenseManagement() {
  const [expenses, setExpenses] = useState([])
  const [adminTrips, setAdminTrips] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toastMsg, setToastMsg] = useState(null)
  const [saving, setSaving] = useState(false)
  const [alertingUserId, setAlertingUserId] = useState(null)
  const [sentBudgetAlerts, setSentBudgetAlerts] = useState({})
  const [autoBudgetAlerts, setAutoBudgetAlerts] = useState({})
  const [alertingExpenseId, setAlertingExpenseId] = useState(null)
  const [sentExpenseAlerts, setSentExpenseAlerts] = useState({})
  const [expenseNotificationMap, setExpenseNotificationMap] = useState({})
  const [sentAlertHistory, setSentAlertHistory] = useState([])
  const [loadingSentAlertHistory, setLoadingSentAlertHistory] = useState(false)

  const [historicalPrices, setHistoricalPrices] = useState(DEFAULT_HISTORICAL_PRICES)
  const [trendSource, setTrendSource] = useState('fallback')
  const [trendLoading, setTrendLoading] = useState(false)
  const [trendError, setTrendError] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('edit')
  const [selectedExpense, setSelectedExpense] = useState(null)
  const [expenseCategories, setExpenseCategories] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterUser, setFilterUser] = useState('all')
  const [filterTrip, setFilterTrip] = useState('all')
  const [sortBy, setSortBy] = useState('date')

  const [formData, setFormData] = useState({
    category_id: '',
    note: '',
    amount: 0,
    currency: 'LKR',
    payment_method: 'cash',
    expense_type: 'ACTUAL',
    expense_date: '',
    trip_id: '',
  })

  const categories = ['accommodation', 'transportation', 'food', 'activities', 'shopping', 'entertainment', 'emergency', 'other']
  const paymentMethods = ['cash', 'credit-card', 'debit-card', 'online-payment', 'bank-transfer', 'other']
  const users = [...new Set(expenses.map(e => e.userName))]
  const tripPlans = [...new Set(expenses.map((e) => e.tripId).filter(Boolean))]

  const showToast = (msg, type = 'success') => {
    setToastMsg({ msg, type })
    setTimeout(() => setToastMsg(null), 3000)
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

  const loadExpenseAlertStatus = useCallback(async (expenseList) => {
    const normalizedExpenses = (expenseList || []).map((e) => ({
      id: Number(e.id),
      userId: Number(e.userId),
      tripId: Number(e.tripId),
    }))

    const ids = normalizedExpenses
      .map((e) => e.id)
      .filter((id) => Number.isInteger(id) && id > 0)

    const tripIds = [...new Set(normalizedExpenses.map((e) => e.tripId).filter((id) => Number.isInteger(id) && id > 0))]
    const userIds = [...new Set(normalizedExpenses.map((e) => e.userId).filter((id) => Number.isInteger(id) && id > 0))]

    if (!ids.length && !tripIds.length && !userIds.length) {
      setSentExpenseAlerts({})
      setExpenseNotificationMap({})
      return {}
    }

    try {
      const query = new URLSearchParams()
      if (ids.length) query.set('expense_ids', ids.join(','))
      if (tripIds.length) query.set('trip_ids', tripIds.join(','))
      if (userIds.length) query.set('user_ids', userIds.join(','))

      const res = await fetch(`${API}/notifications/admin/expense-alert-status?${query.toString()}`, {
        headers: authH(),
      })
      const data = await res.json()
      if (!res.ok || !data?.success || !Array.isArray(data.data)) return {}

      const sentMap = {}
      const notifMap = {}
      const fallbackByUserTrip = new Map()
      data.data.forEach((row) => {
        const expenseId = Number(row.expense_id)
        const userId = Number(row.user_id)
        const tripId = Number(row.trip_id)

        if (expenseId) {
          sentMap[expenseId] = true
          notifMap[expenseId] = {
            notificationId: row.notification_id,
            message: row.message || '',
            userId: userId || null,
            tripId: tripId || null,
            expenseId,
            type: row.type || 'PRICE_CHANGE',
          }
          return
        }

        if (userId && tripId) {
          const key = `${userId}:${tripId}`
          if (!fallbackByUserTrip.has(key)) {
            fallbackByUserTrip.set(key, row)
          }
        }
      })

      normalizedExpenses.forEach((e) => {
        if (!e.id || notifMap[e.id]) return
        if (!e.userId || !e.tripId) return

        const fallback = fallbackByUserTrip.get(`${e.userId}:${e.tripId}`)
        if (!fallback) return

        sentMap[e.id] = true
        notifMap[e.id] = {
          notificationId: fallback.notification_id,
          message: fallback.message || '',
          userId: e.userId,
          tripId: e.tripId,
          expenseId: e.id,
          type: fallback.type || 'PRICE_CHANGE',
        }
      })

      setSentExpenseAlerts(sentMap)
      setExpenseNotificationMap(notifMap)
      return notifMap
    } catch {
      // Keep UI usable even if status hydration fails.
      return {}
    }
  }, [])

  useEffect(() => { loadExpenses() }, [loadExpenses])

  useEffect(() => {
    loadExpenseAlertStatus(expenses)
  }, [expenses, loadExpenseAlertStatus])

  useEffect(() => {
    fetch(`${API}/trips/all?limit=500`, { headers: authH() })
      .then(r => r.json())
      .then(d => {
        if (d.success) setAdminTrips(d.data || [])
      })
      .catch(() => {})
  }, [])

  // Load expense categories from API
  useEffect(() => {
    fetch(`${API}/expenses/categories`, { headers: authH() })
      .then(r => r.json())
      .then(d => { if (d.success) setExpenseCategories(d.data || []) })
      .catch(() => {})
  }, [])

  // Open Edit Modal
  const handleEdit = (expense) => {
    setModalMode('edit')
    setSelectedExpense(expense)
    setFormData({
      category_id: expense.category_id || '',
      note: expense.description || '',
      amount: expense.amount,
      currency: expense.currency || 'LKR',
      payment_method: expense.paymentMethod || 'cash',
      expense_type: expense.expenseType || 'ACTUAL',
      expense_date: expense.date ? expense.date.split('T')[0] : '',
      trip_id: expense.tripId || '',
    })
    setShowModal(true)
  }

  // Open Trends Modal
  const handleTrends = () => {
    setModalMode('trends')
    setShowModal(true)
  }

  const loadPriceTrends = useCallback(async () => {
    setTrendLoading(true)
    setTrendError('')

    try {
      const res = await fetch(`${API}/price-records?limit=500`, { headers: authH() })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Failed to load price trends')

      const mapped = mapPriceRecordsToHistory(data?.data || [])
      if (Object.keys(mapped).length > 0) {
        setHistoricalPrices(mapped)
        setTrendSource('api')
      } else {
        setHistoricalPrices(DEFAULT_HISTORICAL_PRICES)
        setTrendSource('fallback')
      }
    } catch (err) {
      setTrendError(err.message || 'Unable to load live price trends')
      setHistoricalPrices(DEFAULT_HISTORICAL_PRICES)
      setTrendSource('fallback')
    } finally {
      setTrendLoading(false)
    }
  }, [])

  useEffect(() => {
    if (showModal && modalMode === 'trends') {
      loadPriceTrends()
    }
  }, [showModal, modalMode, loadPriceTrends])

  // Open Alerts Modal
  const buildSentHistoryFromMap = useCallback((notifMap) => {
    return Object.entries(notifMap || {})
      .map(([expenseId, meta]) => {
        const matchedExpense = expenses.find((e) => Number(e.id) === Number(expenseId))
        return {
          notification_id: meta?.notificationId || null,
          expense_id: Number(expenseId),
          user_id: meta?.userId || matchedExpense?.userId || null,
          trip_id: meta?.tripId || matchedExpense?.tripId || null,
          message: meta?.message || '',
          is_read: false,
          created_at: null,
          _fallback: true,
        }
      })
      .filter((row) => row.notification_id || row.message)
  }, [expenses])

  const loadSentAlertHistory = useCallback(async () => {
    setLoadingSentAlertHistory(true)
    try {
      const res = await fetch(`${API}/notifications/admin/expense-alert-history?limit=200`, { headers: authH() })
      const raw = await res.text()
      let data = null
      try {
        data = raw ? JSON.parse(raw) : null
      } catch {
        data = null
      }

      if (res.ok && data?.success && Array.isArray(data.data)) {
        setSentAlertHistory(data.data)
        return
      }

      // Fallback path: endpoint not available on running backend version yet.
      const mapFromStatus = await loadExpenseAlertStatus(expenses)
      const fallbackRows = buildSentHistoryFromMap(mapFromStatus)
      setSentAlertHistory(fallbackRows)
      if (fallbackRows.length > 0) {
        showToast('ℹ️ Showing current sent alerts from expense status (history endpoint unavailable).')
      }
    } catch (err) {
      const mapFromStatus = await loadExpenseAlertStatus(expenses)
      const fallbackRows = buildSentHistoryFromMap(mapFromStatus)
      setSentAlertHistory(fallbackRows)
      if (fallbackRows.length === 0) {
        showToast(`⚠️ ${err.message}`, 'error')
      }
    } finally {
      setLoadingSentAlertHistory(false)
    }
  }, [loadExpenseAlertStatus, expenses, buildSentHistoryFromMap])

  const resolveAlertContext = useCallback((alertRow) => {
    const expenseId = Number(alertRow?.expense_id)
    const userId = Number(alertRow?.user_id)
    const tripId = Number(alertRow?.trip_id)

    const directExpense = Number.isInteger(expenseId) && expenseId > 0
      ? expenses.find((e) => Number(e.id) === expenseId)
      : null

    const fallbackExpense = (!directExpense && userId && tripId)
      ? expenses.find((e) => Number(e.userId) === userId && Number(e.tripId) === tripId)
      : null

    const matchedTrip = (!directExpense && !fallbackExpense && tripId)
      ? adminTrips.find((t) => Number(t?.trip_id) === tripId)
      : null

    const matched = directExpense || fallbackExpense
    return {
      userName: matched?.userName || matchedTrip?.user?.name || (userId ? `User #${userId}` : 'Unknown User'),
      tripTitle: matched?.tripTitle || matchedTrip?.title || (tripId ? `Trip #${tripId}` : 'Trip not linked'),
      category: matched?.category || 'n/a',
      expenseId: matched?.id || expenseId || null,
    }
  }, [expenses, adminTrips])

  // Open Alerts Modal
  const handleAlerts = () => {
    setModalMode('alerts')
    setShowModal(true)
    loadSentAlertHistory()
  }

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    // --- Validations ---
    const amountCheck = validatePositiveNumber(formData.amount, 'Amount')
    if (!amountCheck.valid) { showToast(`⚠️ ${amountCheck.message}`, 'error'); return }
    if (!formData.expense_date) { showToast('⚠️ Expense date is required.', 'error'); return }
    const expDateCheck = validateTripDate(formData.expense_date, 1)
    if (!expDateCheck.valid) { showToast(`⚠️ ${expDateCheck.message}`, 'error'); return }
    // --- End Validations ---
    setSaving(true)
    try {
      const body = {
        category_id: formData.category_id ? parseInt(formData.category_id) : undefined,
        note: formData.note,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        payment_method: formData.payment_method,
        expense_type: formData.expense_type,
        expense_date: formData.expense_date,
        trip_id: formData.trip_id ? parseInt(formData.trip_id) : undefined,
      }
      const res = await fetch(`${API}/expenses/${selectedExpense.id}`, { method: 'PUT', headers: authH(), body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to save expense')
      showToast('✅ Expense updated!')
      setShowModal(false)
      loadExpenses()
    } catch (err) {
      showToast('⚠️ ' + err.message, 'error')
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
      showToast('🗑️ Expense deleted!', 'delete')
    } catch (err) {
      showToast('⚠️ ' + err.message, 'error')
    }
  }

  // Calculate Budget Statistics
  const calculateStats = () => {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0)
    const actual = expenses.filter(e => e.expenseType === 'ACTUAL').reduce((sum, e) => sum + e.amount, 0)
    const estimated = expenses.filter(e => e.expenseType === 'ESTIMATED').reduce((sum, e) => sum + e.amount, 0)
    return { total, paid: actual, pending: estimated, count: expenses.length }
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
      const matchesStatus = filterStatus === 'all' || expense.expenseType === filterStatus
      const matchesUser = filterUser === 'all' || expense.userName === filterUser
      const matchesTrip = filterTrip === 'all' || String(expense.tripId) === filterTrip
      return matchesSearch && matchesCategory && matchesStatus && matchesUser && matchesTrip
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

  const budgetUsageByTrip = useMemo(() => {
    const byTrip = new Map()

    adminTrips.forEach((t) => {
      const tripId = Number(t?.trip_id)
      const userId = Number(t?.user_id || t?.user?.id)
      if (!tripId || !userId) return
      byTrip.set(tripId, {
        tripId,
        tripTitle: t?.title || `Trip #${tripId}`,
        userId,
        userName: t?.user?.name || `User #${userId}`,
        budgetLkr: toLKR(t?.total_budget || 0, t?.budget_currency || 'LKR'),
        usedLkr: 0,
      })
    })

    expenses.forEach((e) => {
      const tripId = Number(e.tripId)
      if (!tripId) return
      if ((e.expenseType || 'ACTUAL') !== 'ACTUAL') return
      const current = byTrip.get(tripId)
      if (!current) return
      current.usedLkr += toLKR(e.amount, e.currency)
    })

    return Array.from(byTrip.values())
      .map((row) => {
        const usagePct = row.budgetLkr > 0 ? (row.usedLkr / row.budgetLkr) * 100 : 0
        return {
          ...row,
          usagePct,
          usagePctClamped: Math.min(Math.max(usagePct, 0), 100),
          isExceeded: row.budgetLkr > 0 && usagePct >= 100,
          hasBudget: row.budgetLkr > 0,
        }
      })
      .sort((a, b) => b.usagePct - a.usagePct)
  }, [adminTrips, expenses])

  useEffect(() => {
    const ids = budgetUsageByTrip
      .filter((u) => u.isExceeded)
      .map((u) => Number(u.userId))
      .filter(Boolean)

    if (!ids.length) {
      setAutoBudgetAlerts({})
      return
    }

    fetch(`${API}/notifications/admin/budget-auto-status?user_ids=${ids.join(',')}`, { headers: authH() })
      .then((r) => r.json())
      .then((d) => {
        if (!d?.success || !Array.isArray(d.data)) return
        const map = {}
        d.data.forEach((id) => { map[Number(id)] = true })
        setAutoBudgetAlerts(map)
      })
      .catch(() => {})
  }, [budgetUsageByTrip])

  const sendBudgetExceededAlert = async (tripUsage) => {
    if (!tripUsage?.userId || !tripUsage?.tripId || !tripUsage.isExceeded) return
    const key = `${tripUsage.userId}:${tripUsage.tripId}`
    const defaultMessage = `Budget alert: You have used ${Math.round(tripUsage.usagePct)}% of your planned trip budget for ${tripUsage.tripTitle || `Trip #${tripUsage.tripId}`}. Please review your expenses.`
    const editedMessage = window.prompt(
      `Edit alert message for ${tripUsage.userName} (${tripUsage.tripTitle || `Trip #${tripUsage.tripId}`}):`,
      defaultMessage
    )
    if (editedMessage === null) return
    const message = editedMessage.trim()
    if (!message) {
      showToast('⚠️ Alert message cannot be empty', 'error')
      return
    }

    setAlertingUserId(key)
    try {
      const payload = {
        user_id: tripUsage.userId,
        trip_id: tripUsage.tripId,
        type: 'BUDGET_100',
        message,
      }
      const res = await fetch(`${API}/notifications`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to send alert')
      setSentBudgetAlerts((prev) => ({ ...prev, [key]: true }))
      loadSentAlertHistory()
      showToast(`🔔 Budget alert sent to ${tripUsage.userName} (${tripUsage.tripTitle || `Trip #${tripUsage.tripId}`})`)
    } catch (err) {
      showToast(`⚠️ ${err.message}`, 'error')
    } finally {
      setAlertingUserId(null)
    }
  }

  useEffect(() => {
    if (expenses.length) {
      loadSentAlertHistory()
    }
  }, [expenses, loadSentAlertHistory])

  const sendExpenseAlert = async (expense) => {
    if (!expense?.userId) return
    const defaultMessage = buildExpenseAlertMessage(expense)
    const editedMessage = window.prompt(
      `Edit alert message for ${expense.userName}:`,
      defaultMessage
    )
    if (editedMessage === null) return
    const message = editedMessage.trim()
    if (!message) {
      showToast('⚠️ Alert message cannot be empty', 'error')
      return
    }

    setAlertingExpenseId(expense.id)
    try {
      const payload = {
        user_id: expense.userId,
        trip_id: expense.tripId || null,
        expense_id: expense.id,
        type: 'PRICE_CHANGE',
        message,
      }
      const res = await fetch(`${API}/notifications`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to send alert')
      setSentExpenseAlerts((prev) => ({ ...prev, [expense.id]: true }))
      const notificationId = data?.data?.notification_id
      if (notificationId) {
        setExpenseNotificationMap((prev) => ({
          ...prev,
          [expense.id]: {
            notificationId,
            message,
            userId: expense.userId,
            tripId: expense.tripId || null,
            expenseId: expense.id,
            type: 'PRICE_CHANGE',
          },
        }))
      }
      loadExpenseAlertStatus(expenses)
      showToast(`🔔 Alert sent to ${expense.userName}`)
    } catch (err) {
      showToast(`⚠️ ${err.message}`, 'error')
    } finally {
      setAlertingExpenseId(null)
    }
  }

  const viewSentNotification = async (expense) => {
    const meta = expenseNotificationMap[expense.id]
    if (!meta?.notificationId) {
      showToast('⚠️ Notification details unavailable. Send again to track it.', 'error')
      return
    }
    try {
      const res = await fetch(`${API}/notifications/${meta.notificationId}`, { headers: authH() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to load notification')
      const n = data.data
      window.alert(`Notification #${n.notification_id}\nType: ${n.type}\nMessage: ${n.message}\nCreated: ${new Date(n.created_at).toLocaleString()}\nRead: ${n.is_read ? 'Yes' : 'No'}`)
    } catch (err) {
      showToast(`⚠️ ${err.message}`, 'error')
    }
  }

  const editSentNotification = async (expense) => {
    const meta = expenseNotificationMap[expense.id]
    if (!meta?.notificationId) {
      showToast('⚠️ No tracked notification to edit.', 'error')
      return
    }
    const editedMessage = window.prompt('Edit notification message:', meta.message || '')
    if (editedMessage === null) return
    const message = editedMessage.trim()
    if (!message) {
      showToast('⚠️ Message cannot be empty', 'error')
      return
    }
    try {
      const res = await fetch(`${API}/notifications/${meta.notificationId}`, {
        method: 'PUT',
        headers: authH(),
        body: JSON.stringify({ message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to update notification')
      setExpenseNotificationMap((prev) => ({
        ...prev,
        [expense.id]: { ...prev[expense.id], message },
      }))
      showToast('✅ Notification updated')
    } catch (err) {
      showToast(`⚠️ ${err.message}`, 'error')
    }
  }

  const deleteSentNotification = async (expense) => {
    const meta = expenseNotificationMap[expense.id]
    if (!meta?.notificationId) {
      showToast('⚠️ No tracked notification to delete.', 'error')
      return
    }
    if (!window.confirm('Delete sent notification for this expense?')) return
    try {
      const res = await fetch(`${API}/notifications/${meta.notificationId}`, {
        method: 'DELETE',
        headers: authH(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to delete notification')
      setExpenseNotificationMap((prev) => {
        const next = { ...prev }
        delete next[expense.id]
        return next
      })
      setSentExpenseAlerts((prev) => ({ ...prev, [expense.id]: false }))
      showToast('🗑️ Notification deleted', 'delete')
    } catch (err) {
      showToast(`⚠️ ${err.message}`, 'error')
    }
  }

  const editHistoryAlert = async (alert) => {
    const notificationId = alert?.notification_id
    if (!notificationId) {
      showToast('⚠️ This fallback row cannot be edited directly.', 'error')
      return
    }

    const editedMessage = window.prompt('Edit sent alert message:', alert.message || '')
    if (editedMessage === null) return
    const message = editedMessage.trim()
    if (!message) {
      showToast('⚠️ Message cannot be empty', 'error')
      return
    }

    try {
      const res = await fetch(`${API}/notifications/${notificationId}`, {
        method: 'PUT',
        headers: authH(),
        body: JSON.stringify({ message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to update sent alert')

      setSentAlertHistory((prev) => prev.map((row) => (
        row.notification_id === notificationId ? { ...row, message } : row
      )))

      setExpenseNotificationMap((prev) => {
        const next = { ...prev }
        Object.keys(next).forEach((expenseId) => {
          if (next[expenseId]?.notificationId === notificationId) {
            next[expenseId] = { ...next[expenseId], message }
          }
        })
        return next
      })

      showToast('✅ Sent alert updated')
    } catch (err) {
      showToast(`⚠️ ${err.message}`, 'error')
    }
  }

  const deleteHistoryAlert = async (alert) => {
    const notificationId = alert?.notification_id
    if (!notificationId) {
      showToast('⚠️ This fallback row cannot be deleted directly.', 'error')
      return
    }
    if (!window.confirm('Delete this sent alert from history?')) return

    try {
      const res = await fetch(`${API}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: authH(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to delete sent alert')

      setSentAlertHistory((prev) => prev.filter((row) => row.notification_id !== notificationId))

      setExpenseNotificationMap((prev) => {
        const next = { ...prev }
        const removedExpenseIds = []
        Object.keys(next).forEach((expenseId) => {
          if (next[expenseId]?.notificationId === notificationId) {
            removedExpenseIds.push(Number(expenseId))
            delete next[expenseId]
          }
        })

        const directExpenseId = Number(alert?.expense_id)
        if (Number.isInteger(directExpenseId) && directExpenseId > 0 && !removedExpenseIds.includes(directExpenseId)) {
          removedExpenseIds.push(directExpenseId)
        }

        if (removedExpenseIds.length) {
          setSentExpenseAlerts((current) => {
            const updated = { ...current }
            removedExpenseIds.forEach((id) => { updated[id] = false })
            return updated
          })
        }
        return next
      })

      showToast('🗑️ Sent alert deleted', 'delete')
    } catch (err) {
      showToast(`⚠️ ${err.message}`, 'error')
    }
  }

  return (
    <div className="expense-management">
      {toastMsg && (
        <div className={`admin-toast ${toastMsg.type}`}>
          {toastMsg.msg}
        </div>
      )}
      {error && (
        <div className="admin-error-banner">
          Error: {error} - <button onClick={loadExpenses}>Retry</button>
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
            🔔 Sent Alerts ({sentAlertHistory.length})
          </button>
          <button className="btn-trends" onClick={handleTrends}>
            📈 View Trends
          </button>

        </div>
      </div>

      {/* Budget Overview Stats */}
      <div className="budget-overview">
        <h2 className="overview-title">💰 Budget Overview</h2>
        <div className="budget-cards">
          <div className="budget-card">
            <span className="budget-label">Total Expenses</span>
            <span className="budget-value">{loading ? '…' : stats.count}</span>
          </div>
          <div className="budget-card">
            <span className="budget-label">Total Amount</span>
            <span className="budget-value spent">{loading ? '…' : `${stats.total.toFixed(2)}`}</span>
          </div>
          <div className="budget-card">
            <span className="budget-label">Actual Expenses</span>
            <span className="budget-value under">{loading ? '…' : `${stats.paid.toFixed(2)}`}</span>
          </div>
          <div className="budget-card">
            <span className="budget-label">Estimated Expenses</span>
            <span className={`budget-value ${stats.pending > 0 ? 'over' : 'under'}`}>
              {loading ? '…' : `${stats.pending.toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* Budget Progress Bar */}
        <div className="budget-progress-container">
          <div className="progress-labels">
            <span>Actual vs Total</span>
            <span>{stats.total > 0 ? ((stats.paid / stats.total) * 100).toFixed(1) : 0}% actual</span>
          </div>
          <div className="budget-progress-bar">
            <div
              className="budget-progress-fill"
              style={{ width: `${stats.total > 0 ? Math.min((stats.paid / stats.total) * 100, 100) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Trip Plan Budget Usage */}
      <div className="user-budget-usage">
        <h2 className="section-title">🎯 Trip Plan Budget Usage</h2>
        <p className="ubu-subtitle">Each trip plan budget vs actual spend (normalized to LKR)</p>
        <div className="ubu-grid">
          {budgetUsageByTrip.length > 0 ? budgetUsageByTrip.map((u) => {
            const budgetAlertKey = `${u.userId}:${u.tripId}`
            return (
            <div key={`${u.userId}:${u.tripId}`} className={`ubu-card ${u.isExceeded ? 'exceeded' : ''}`}>
              <div className="ubu-circle-wrap">
                <div
                  className={`ubu-circle ${u.isExceeded ? 'exceeded' : (u.usagePct >= 80 ? 'warning' : 'safe')}`}
                  style={{ '--pct': `${u.usagePctClamped}%` }}
                >
                  <span>{Math.round(u.usagePct)}%</span>
                </div>
              </div>
              <div className="ubu-info">
                <h3>{u.userName}</h3>
                <p>Trip: {u.tripTitle}</p>
                <p>Budget: LKR {Math.round(u.budgetLkr).toLocaleString()}</p>
                <p>Used: LKR {Math.round(u.usedLkr).toLocaleString()}</p>
              </div>
              <div className="ubu-actions">
                {u.isExceeded ? (
                  <>
                    <button
                      className="ubu-alert-btn"
                      onClick={() => sendBudgetExceededAlert(u)}
                      disabled={alertingUserId === budgetAlertKey || sentBudgetAlerts[budgetAlertKey]}
                    >
                      {sentBudgetAlerts[budgetAlertKey]
                        ? 'Alert Sent'
                        : (alertingUserId === budgetAlertKey ? 'Sending…' : 'Alert User')}
                    </button>
                    {autoBudgetAlerts[u.userId] && (
                      <span className="ubu-auto-tag">Auto sent</span>
                    )}
                  </>
                ) : (
                  <span className="ubu-ok-tag">Within budget</span>
                )}
              </div>
            </div>
          )}) : (
            <div className="empty-state">
              <span className="empty-icon">📊</span>
              <h3>No trip budget data yet</h3>
              <p>Create trip plans and expenses to see usage circles.</p>
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="category-breakdown">
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
      <div className="em-filters">
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
          <label>📊 Type</label>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="ACTUAL">Actual</option>
            <option value="ESTIMATED">Estimated</option>
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
          <label>🗺️ Trip Plan</label>
          <select
            value={filterTrip}
            onChange={(e) => setFilterTrip(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Trip Plans</option>
            {tripPlans.map((tripId) => (
              <option key={tripId} value={String(tripId)}>{`Trip #${tripId}`}</option>
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
      <div className="expenses-table-container">
        {loading ? (
          <div style={{textAlign:'center',padding:'40px',color:'var(--text-secondary)'}}><p>⏳ Loading expenses...</p></div>
        ) : filteredExpenses.length > 0 ? (
          <table className="expenses-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Category</th>
                <th>Note</th>
                <th>Trip</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Type</th>
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
                    <span className="amount-badge actual">{expense.currency} {expense.amount.toFixed(2)}</span>
                  </td>
                  <td>{expense.paymentMethod}</td>
                  <td>
                    <span className={`status-badge status-${(expense.expenseType || 'actual').toLowerCase()}`}>
                      {expense.expenseType || '—'}
                    </span>
                  </td>
                  <td className="td-actions">
                    <div className="action-buttons">
                      {!sentExpenseAlerts[expense.id] && (
                        <button
                          className="btn-table-alert"
                          onClick={() => sendExpenseAlert(expense)}
                          title="Send Alert"
                          disabled={alertingExpenseId === expense.id}
                        >
                          {alertingExpenseId === expense.id ? '⏳' : '🔔'}
                        </button>
                      )}
                      {sentExpenseAlerts[expense.id] && (
                        <>
                          <span title="Alert sent" style={{ fontSize: '1rem' }}>✅</span>
                          <button className="btn-table-edit" onClick={() => viewSentNotification(expense)} title="Check Sent Notification">👁️</button>
                          <button className="btn-table-edit" onClick={() => editSentNotification(expense)} title="Edit Sent Notification">📝</button>
                          <button className="btn-table-delete" onClick={() => deleteSentNotification(expense)} title="Delete Sent Notification">❌</button>
                        </>
                      )}
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

      {/* Edit Modal */}
      {showModal && modalMode === 'edit' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Edit Expense</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="expense-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select value={formData.category_id} onChange={(e) => setFormData({...formData, category_id: e.target.value})}>
                    <option value="">— Select category —</option>
                    {expenseCategories.length > 0
                      ? expenseCategories.map(cat => <option key={cat.category_id} value={cat.category_id}>{cat.category_name}</option>)
                      : categories.map(cat => <option key={cat} value={cat}>{cat}</option>)
                    }
                  </select>
                </div>
                <div className="form-group">
                  <label>Payment Method *</label>
                  <select value={formData.payment_method} onChange={(e) => setFormData({...formData, payment_method: e.target.value})} required>
                    {paymentMethods.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Note / Description</label>
                <input type="text" value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} placeholder="e.g., Hotel stay, Transport, etc." />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Amount *</label>
                  <input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required min="0" step="0.01" />
                </div>
                <div className="form-group">
                  <label>Currency</label>
                  <input type="text" value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})} placeholder="LKR" maxLength={3} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Trip ID *</label>
                  <input type="number" value={formData.trip_id} onChange={(e) => setFormData({...formData, trip_id: e.target.value})} required placeholder="e.g., 1" />
                </div>
                <div className="form-group">
                  <label>Date *</label>
                  <input type="date" value={formData.expense_date} onChange={(e) => setFormData({...formData, expense_date: e.target.value})} required />
                </div>
              </div>

              <div className="form-group">
                <label>Expense Type</label>
                <select value={formData.expense_type} onChange={(e) => setFormData({...formData, expense_type: e.target.value})}>
                  <option value="ACTUAL">Actual</option>
                  <option value="ESTIMATED">Estimated</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trends Modal */}
      {showModal && modalMode === 'trends' && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📈 Travel Cost Trend Analysis</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="trends-container">
              <p className="trends-info">
                {trendSource === 'api'
                  ? 'Live historical prices from the backend price records table.'
                  : 'Showing fallback sample trend data. Add price records to see live trends.'}
              </p>

              {trendError && <p className="alerts-info">{trendError}</p>}
              {trendLoading && <p className="alerts-info">Loading live price trends...</p>}
              
              {Object.entries(historicalPrices).map(([item, prices]) => {
                if (!Array.isArray(prices) || prices.length === 0) return null
                const priceChange = prices[prices.length - 1].price - prices[0].price
                const changePercent = (priceChange / prices[0].price) * 100
                
                return (
                  <div key={item} className="trend-card">
                    <div className="trend-header">
                      <h3>{item}</h3>
                      <div className="trend-change">
                        <span className={`change-amount ${priceChange >= 0 ? 'increase' : 'decrease'}`}>
                          {priceChange >= 0 ? '↑' : '↓'} {fmtLkr(Math.abs(priceChange))}
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
                              <span className="bar-value">{fmtLkr(point.price)}</span>
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
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔔 Sent Expense Alert History</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="alerts-container">
              <p className="alerts-info">
                This is your real sent-alert history from the database, including auto budget alerts (read-only).
              </p>

              {loadingSentAlertHistory ? (
                <div style={{textAlign:'center',padding:'26px',color:'var(--text-muted)'}}>⏳ Loading sent alerts history…</div>
              ) : (
                <div className="alerts-list">
                  {sentAlertHistory.map((alert) => {
                    const ctx = resolveAlertContext(alert)
                    const isAutoBudgetAlert = alert.type === 'BUDGET_80' || alert.type === 'BUDGET_100'
                    const canManageHistoryAlert = !!alert.notification_id && !isAutoBudgetAlert
                    return (
                      <div key={alert.notification_id} className="alert-card severity-medium">
                        <div className="alert-icon">🔔</div>
                        <div className="alert-content">
                          <div className="alert-header">
                            <h3>{ctx.userName}</h3>
                            <span className="alert-category">{ctx.tripTitle}</span>
                          </div>
                          <div className="alert-details">
                            <div className="price-comparison" style={{display:'block'}}>
                              <span className="new-price" style={{fontWeight:600}}>{alert.message}</span>
                            </div>
                          </div>
                          <div className="alert-meta">
                            <span>📅 {alert.created_at ? new Date(alert.created_at).toLocaleString() : 'Current session/state'}</span>
                            <span className="severity-badge medium">{alert.is_read ? 'Read' : 'Unread'}</span>
                            <span className="severity-badge low">{(alert.type || 'INFO').replace(/_/g, ' ')}</span>
                            <span className={`severity-badge ${ctx.expenseId ? 'low' : 'legacy'}`}>
                              {ctx.expenseId ? `Expense #${ctx.expenseId}` : 'Legacy alert'}
                            </span>
                            {alert._fallback && <span className="severity-badge legacy">Fallback view</span>}
                            {isAutoBudgetAlert && <span className="severity-badge legacy">Auto sent</span>}
                          </div>
                          {canManageHistoryAlert && (
                            <div className="alert-actions">
                              <button
                                className="btn-history-edit"
                                onClick={() => editHistoryAlert(alert)}
                                title="Edit this sent alert"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                className="btn-history-delete"
                                onClick={() => deleteHistoryAlert(alert)}
                                title="Delete this sent alert"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {!loadingSentAlertHistory && sentAlertHistory.length === 0 && (
                <div className="no-alerts">
                  <span className="empty-icon">✅</span>
                  <h3>No sent alerts yet</h3>
                  <p>Send an alert from any expense row and it will appear here.</p>
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
