import { useState, useEffect } from 'react'
import { clearUserData } from '../../utils/clearUserData'
import { API_BASE } from '../../config/api'
import { Link, useNavigate } from 'react-router-dom'
import './TripBudget.css'

function mapHotel(h) {
  return {
    _id:        String(h.hotel_id || h.place_id),
    name:       h.place?.name        || h.name       || '',
    category:   h.hotel_type         || h.category   || 'hotel',
    starRating: h.star_class         || h.starRating  || 0,
    priceRange: { min: parseFloat(h.price_per_night) || 0, max: parseFloat(h.price_per_night) || 0, currency: 'LKR' },
    address:    { city: h.place?.district?.name || '' },
    description:h.place?.description || h.description || '',
    amenities:  Array.isArray(h.amenities) ? h.amenities : [],
    images:     [
      ...(h.image_url ? [{ url: h.image_url }] : []),
      ...(h.place?.images || []).map(img => ({ url: img.image_url || img.url || '' })),
    ],
    rating:     h.rating || 0,
  }
}

// Hotel prices are stored in LKR. LKR_RATES = units of target currency per 1 LKR
const LKR_RATES = { LKR: 1, USD: 0.0033, EUR: 0.0031 }
function convertFromLKR(lkr, code) {
  return Math.round((lkr || 0) * (LKR_RATES[code] || 1))
}

function convertCurrencyAmount(amount, fromCode, toCode) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0) return 0
  const fromRate = LKR_RATES[fromCode] || 1
  const toRate = LKR_RATES[toCode] || 1
  const inLkr = value / fromRate
  return Math.max(0, Math.round(inLkr * toRate))
}

function diffDaysLocal(startStr, endStr) {
  if (!startStr || !endStr) return 0
  const s = new Date(startStr + 'T00:00:00')
  const e = new Date(endStr + 'T00:00:00')
  return Math.max(0, Math.round((e - s) / 86400000))
}

function getHotelNightlyRange(hotel) {
  const min = Number(hotel?.priceRange?.min ?? hotel?.price_per_night ?? 0) || 0
  const rawMax = Number(hotel?.priceRange?.max ?? hotel?.price_per_night ?? min)
  const max = rawMax > 0 ? rawMax : min
  return { min, max: Math.max(min, max) }
}

const CURRENCIES = [
  { code: 'LKR', symbol: 'Rs', label: 'Sri Lankan Rupee', flag: '🇱🇰' },
  { code: 'USD', symbol: '$',  label: 'US Dollar',        flag: '🇺🇸' },
  { code: 'EUR', symbol: '€',  label: 'Euro',             flag: '🇪🇺' },
]

const QUICK_TOTALS_LKR   = [25000, 50000, 100000, 150000, 200000, 300000]
const QUICK_TOTALS_USD   = [100, 250, 500, 1000, 2000, 5000]
const QUICK_TOTALS_EUR   = [100, 250, 500, 1000, 2000, 5000]

function getQuickTotals(code) {
  if (code === 'LKR') return QUICK_TOTALS_LKR
  if (code === 'USD') return QUICK_TOTALS_USD
  if (code === 'EUR') return QUICK_TOTALS_EUR
  return QUICK_TOTALS_USD
}

export default function TripBudget({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [district] = useState(() => {
    try { return JSON.parse(localStorage.getItem('selectedDistrict') || 'null') }
    catch { return null }
  })
  const [prefs,       setPrefs]       = useState(null)
  const [selectedHotelsList, setSelectedHotelsList] = useState([])
  const [districtHotels, setDistrictHotels] = useState([])

  // Budget state
  const [currency,     setCurrency]     = useState('LKR')
  const [totalBudget,  setTotalBudget]  = useState('')
  const [hotelBudget,  setHotelBudget]  = useState('')
  const [totalRaw,     setTotalRaw]     = useState('')
  const [hotelRaw,     setHotelRaw]     = useState('')
  const [isTotalFocused, setIsTotalFocused] = useState(false)
  const [isHotelFocused, setIsHotelFocused] = useState(false)
  const [tripDays,     setTripDays]     = useState('')
  const [showMoreHotels, setShowMoreHotels] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('selectedDistrict')
    if (!raw) { navigate('/plan-trip'); return }
    const dist = JSON.parse(raw)

    if (dist.district_id) {
      fetch(`${API_BASE}/hotels/district/${dist.district_id}`)
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          if (json?.success && json.data?.length > 0) {
            setDistrictHotels(json.data.map(mapHotel))
          }
        })
        .catch(() => {})
    }

    const prefsRaw = localStorage.getItem('tripPreferences')
    const prefsData = prefsRaw ? (() => { try { return JSON.parse(prefsRaw) } catch { return null } })() : null
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (prefsData) setPrefs(prefsData)

    // Load selected hotels — prefer the multi array (only if non-empty), fall back to single
    const hotelsRaw = localStorage.getItem('selectedHotels')
    const hotelRaw  = localStorage.getItem('selectedHotel')
    const hotelList = []
    if (hotelsRaw) {
      try {
        const parsed = JSON.parse(hotelsRaw)
        if (Array.isArray(parsed) && parsed.length > 0) hotelList.push(...parsed)
      } catch {
        // Ignore malformed cached selected hotels.
      }
    }
    if (hotelList.length === 0 && hotelRaw) {
      try {
        const h = JSON.parse(hotelRaw)
        hotelList.push({ ...h, nights: h.hotelNights || h.nights || 1 })
      } catch {
        // Ignore malformed cached selected hotel.
      }
    }
    setSelectedHotelsList(hotelList)

    // Total hotel nights — hotels may not have nights set if loaded from HotelPicker
    // treat missing nights as 1 per hotel
    const totalHotelNights = hotelList.reduce((s, h) => s + (Number(h.nights) || 1), 0)

    // Minimum trip days = span from start date to last hotel checkout
    const startDate = prefsData?.startDate || ''
    const lastCO = hotelList.length > 0
      ? hotelList.reduce((max, h) => (h.checkOut && h.checkOut > max ? h.checkOut : max), '')
      : ''
    const autoSpan = (startDate && lastCO) ? diffDaysLocal(startDate, lastCO) : 0
    const minStart = Math.max(autoSpan, prefsData?.days ? Number(prefsData.days) : 1)

    // Restore saved budget
    const savedBudget = localStorage.getItem('tripBudget')
    if (savedBudget) {
      try {
        const b = JSON.parse(savedBudget)
        setCurrency(b.currency ?? 'LKR')
        setTotalBudget(b.totalBudget ?? '')
        setHotelBudget(b.hotelBudget ?? '')
        setTotalRaw(b.totalBudget !== undefined && b.totalBudget !== null ? String(b.totalBudget) : '')
        setHotelRaw(b.hotelBudget !== undefined && b.hotelBudget !== null ? String(b.hotelBudget) : '')
        // Always start at least at minStart
        const savedDays = b.tripDays ? Number(b.tripDays) : 0
        // Restore saved total trip days (may be more than hotel nights)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (savedDays > 0) setTripDays(String(savedDays))
      } catch {
        // Ignore malformed cached trip budget.
      }
    } else {
      // No saved budget — pick currency from profile preferences
      const profileCurr = localStorage.getItem('et_displayCurrency')
      if (profileCurr) setCurrency(profileCurr)
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    clearUserData()
    navigate('/')
  }

  const handleTotalInput = (val) => {
    const num = val.replace(/[^0-9]/g, '')
    setTotalRaw(num)
    setTotalBudget(num)
  }

  const handleHotelInput = (val) => {
    const num = val.replace(/[^0-9]/g, '')
    setHotelRaw(num)
    setHotelBudget(num)
  }

  const formatWithCommas = (digits) => {
    const clean = String(digits || '').replace(/[^0-9]/g, '')
    if (!clean) return ''
    return Number(clean).toLocaleString()
  }

  const normalizeLeadingZeros = (digits) => {
    const clean = String(digits || '').replace(/[^0-9]/g, '')
    if (!clean) return ''
    const normalized = String(Number(clean))
    return normalized === '0' ? '' : normalized
  }

  const handleTotalBlur = () => {
    setIsTotalFocused(false)
    const normalized = normalizeLeadingZeros(totalRaw)
    setTotalRaw(normalized)
    setTotalBudget(normalized)
  }

  const handleHotelBlur = () => {
    setIsHotelFocused(false)
    const normalized = normalizeLeadingZeros(hotelRaw)
    setHotelRaw(normalized)
    setHotelBudget(normalized)
  }

  // ── Hotel grid helpers ──────────────────────────────────────────────────────
  const syncHotelsToStorage = (list) => {
    localStorage.setItem('selectedHotels', JSON.stringify(list))
    if (list.length > 0) {
      const primary = list[0]
      localStorage.setItem('selectedHotel', JSON.stringify({ ...primary, hotelNights: primary.nights }))
    } else {
      localStorage.removeItem('selectedHotel')
    }
  }

  const handlePickHotel = (h) => {
    const totalUsed = selectedHotelsList.reduce((s, sh) => s + (sh.nights || 1), 0)
    if (totalNightsCap && totalUsed >= Number(totalNightsCap)) return
    if (selectedHotelsList.some(sh => sh._id === h._id)) return
    const newList = [...selectedHotelsList, { ...h, nights: 1 }]
    setSelectedHotelsList(newList)
    syncHotelsToStorage(newList)
  }

  const handleRemoveHotel = (id) => {
    const newList = selectedHotelsList.filter(sh => sh._id !== id)
    setSelectedHotelsList(newList)
    syncHotelsToStorage(newList)
  }

  // Nights cap = hotel nights from prefs (prefs.days = total hotel nights to book)
  const totalNightsCap = (prefs?.days && Number(prefs.days) > 0)
    ? Math.max(1, Number(prefs.days))
    : null

  // Total nights already assigned across all selected hotels
  const totalNightsUsed = selectedHotelsList.reduce((s, sh) => s + (sh.nights || 1), 0)

  // Hotel nights from prefs (used for nights cap display)
  const prefsDays = prefs?.days ? Number(prefs.days) : 1

  // Auto-derive total trip days: span from trip start to the LAST hotel checkout date
  const lastCheckOut = selectedHotelsList.length > 0
    ? selectedHotelsList.reduce((max, h) => (h.checkOut && h.checkOut > max ? h.checkOut : max), '')
    : ''
  const autoTripDays = (prefs?.startDate && lastCheckOut)
    ? Math.max(1, diffDaysLocal(prefs.startDate, lastCheckOut))
    : prefsDays

  // Minimum trip days = auto span from hotel dates (or prefs nights if no hotels yet)
  const minDays = autoTripDays

  // Auto-set tripDays to minDays whenever prefs load and tripDays is too low
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTripDays(prev => {
      const cur = Number(prev) || 0
      return cur < minDays ? String(minDays) : prev
    })
  }, [minDays])

  // Nights already assigned to hotels OTHER than `id`
  const nightsUsedByOthers = (id) =>
    selectedHotelsList.filter(sh => sh._id !== id).reduce((s, sh) => s + (sh.nights || 1), 0)

  // Maximum nights for a specific hotel
  const maxNightsFor = (id) =>
    totalNightsCap ? Math.max(1, totalNightsCap - nightsUsedByOthers(id)) : 30

  const handleChangeNights = (id, delta) => {
    const max = maxNightsFor(id)
    const newList = selectedHotelsList.map(sh => {
      if (sh._id !== id) return sh
      return { ...sh, nights: Math.min(max, Math.max(1, (sh.nights || 1) + delta)) }
    })
    setSelectedHotelsList(newList)
    syncHotelsToStorage(newList)
  }
  // ───────────────────────────────────────────────────────────────────────────

  const handleContinue = () => {
    if (!totalBudget || !hotelBudget || !tripDays || Number(tripDays) < minDays) return

    const budget = {
      currency,
      totalBudget: totalBudget ? Number(totalBudget) : null,
      hotelBudget: hotelBudget ? Number(hotelBudget) : null,
      tripDays:    Number(tripDays),
    }
    localStorage.setItem('tripBudget', JSON.stringify(budget))
    navigate('/trip-details')
  }

  if (!district) return null

  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || ''
  const quickTotals = getQuickTotals(currency)

  const setTotalBudgetAmount = (amount) => {
    const normalized = Math.max(0, Math.round(Number(amount) || 0))
    setTotalBudget(normalized)
    setTotalRaw(String(normalized))
  }

  const setHotelBudgetAmount = (amount) => {
    const normalized = Math.max(0, Math.round(Number(amount) || 0))
    setHotelBudget(normalized)
    setHotelRaw(String(normalized))
  }

  const hotelQuickPicks = (() => {
    const totalNum = Number(totalBudget) || 0
    if (totalNum > 0) {
      return [30, 40, 50, 60, 70].map(pct => ({
        key: `pct-${pct}`,
        amount: Math.round((totalNum * pct) / 100),
        label: `${pct}%`,
      }))
    }
    return quickTotals.map(n => ({ key: `amt-${n}`, amount: n, label: 'Quick' }))
  })()

  const hotelPercent =
    totalBudget && hotelBudget && Number(totalBudget) > 0
      ? Math.min(100, Math.round((Number(hotelBudget) / Number(totalBudget)) * 100))
      : null

  const selectedHotelsMinTotalLKR = selectedHotelsList.reduce((sum, h) => {
    const nightly = getHotelNightlyRange(h)
    return sum + (nightly.min * (h?.nights || 1))
  }, 0)
  const selectedHotelsMaxTotalLKR = selectedHotelsList.reduce((sum, h) => {
    const nightly = getHotelNightlyRange(h)
    return sum + (nightly.max * (h?.nights || 1))
  }, 0)
  const selectedHotelsMinTotal = convertFromLKR(selectedHotelsMinTotalLKR, currency)
  const selectedHotelsMaxTotal = convertFromLKR(selectedHotelsMaxTotalLKR, currency)
  const selectedHotelsAvgTotal = Math.round((selectedHotelsMinTotal + selectedHotelsMaxTotal) / 2)
  const selectedVsHotelBudgetDiff = hotelBudget ? (Number(hotelBudget) - selectedHotelsAvgTotal) : null

  const remainingBudget =
    totalBudget && hotelBudget
      ? Number(totalBudget) - Number(hotelBudget)
      : null

  const isBudgetIncomplete = !totalBudget || !hotelBudget
  const isTripDaysInvalid = !tripDays || Number(tripDays) < minDays
  const isHotelOverTotal = !!hotelBudget && !!totalBudget && Number(hotelBudget) > Number(totalBudget)
  const canContinue = !isBudgetIncomplete && !isTripDaysInvalid && !isHotelOverTotal

  return (
    <div className="tb-page">

      {/* ── Nav ── */}
      <nav className="dashboard-nav glass-nav">
        <div className="nav-container">
          <button className="logo" onClick={() => navigate('/dashboard')} style={{background:'none',border:'none',cursor:'pointer',padding:0}}>Travel<span>Genie</span></button>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
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

      {/* ── Hero / Step indicator ── */}
      <section className="tb-hero">
        <div className="tb-hero-inner">
          <div className="tb-steps">
            <div className="tb-step done" onClick={() => navigate('/plan-trip')} title="Choose District">
              <span className="tb-step-num">1</span>
              <span className="tb-step-label">District</span>
            </div>
            <div className="tb-step-line done" />
            <div className="tb-step done" onClick={() => navigate('/district-explore')} title="Pick Places">
              <span className="tb-step-num">2</span>
              <span className="tb-step-label">Places</span>
            </div>
            <div className="tb-step-line done" />
            <div className="tb-step done" onClick={() => navigate('/trip-preferences')} title="Set Preferences">
              <span className="tb-step-num">3</span>
              <span className="tb-step-label">Preferences</span>
            </div>
            <div className="tb-step-line done" />
            <div className="tb-step done" onClick={() => navigate('/hotel-picker')} title="Choose Hotel">
              <span className="tb-step-num">4</span>
              <span className="tb-step-label">Hotel</span>
            </div>
            <div className="tb-step-line done" />
            <div className="tb-step active">
              <span className="tb-step-num">5</span>
              <span className="tb-step-label">Budget</span>
            </div>
            <div className="tb-step-line" />
            <div className="tb-step">
              <span className="tb-step-num">6</span>
              <span className="tb-step-label">Details</span>
            </div>
          </div>

          <p className="tb-eyebrow">💰 {district.province} Province · {district.name}</p>
          <h1>Set your <em>budget</em></h1>
          <p className="tb-hero-sub">Tell us how much you'd like to spend — we'll help you plan accordingly.</p>
        </div>
      </section>

      {/* ── Body ── */}
      <div className="tb-body">
        <div className="tb-layout">

          {/* ══ LEFT COLUMN — Trip Budget + Hotel Budget ══ */}
          <div className="tb-col-left">

            {/* ── Section 2: Total Trip Budget ── */}
            <section className="tb-section">
              <div className="tb-section-header">
                <span className="tb-section-icon">🗺️</span>
                <div>
                  <h2>Total trip budget</h2>
                  <p>Your overall spend limit for the entire trip including food, transport, activities &amp; accommodation</p>
                </div>
              </div>

              <div className="tb-input-wrap">
                <span className="tb-input-prefix">{sym}</span>
                <input
                  className="tb-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 150,000"
                  value={isTotalFocused ? totalRaw : formatWithCommas(totalRaw)}
                  onChange={e => handleTotalInput(e.target.value)}
                  onFocus={() => setIsTotalFocused(true)}
                  onBlur={handleTotalBlur}
                />
                <span className="tb-input-suffix">{currency}</span>
              </div>

              <div className="tb-quick-chips">
                <span className="tb-chips-label">Quick pick:</span>
                {quickTotals.map(n => (
                  <button
                    key={n}
                    className={`tb-quick-chip ${String(totalBudget) === String(n) ? 'active' : ''}`}
                    onClick={() => setTotalBudgetAmount(n)}
                  >
                    {sym}{n.toLocaleString()}
                  </button>
                ))}
              </div>
            </section>

            {/* ── Section 3: Hotel Budget ── */}
            <section className="tb-section tb-hotel-budget-section">
              <div className="tb-section-header">
                <span className="tb-section-icon">🏨</span>
                <div>
                  <h2>Hotel budget</h2>
                  <p>
                    {selectedHotelsList.length > 0
                      ? `Set your accommodation budget based on your ${selectedHotelsList.length > 1 ? `${selectedHotelsList.length} selected hotels` : 'selected hotel'}`
                      : 'How much you plan to spend on accommodation for the stay'}
                  </p>
                </div>
              </div>

              <div className="tb-input-wrap">
                <span className="tb-input-prefix">{sym}</span>
                <input
                  className="tb-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 50,000"
                  value={isHotelFocused ? hotelRaw : formatWithCommas(hotelRaw)}
                  onChange={e => handleHotelInput(e.target.value)}
                  onFocus={() => setIsHotelFocused(true)}
                  onBlur={handleHotelBlur}
                />
                <span className="tb-input-suffix">{currency}</span>
              </div>

              <div className="tb-quick-chips">
                <span className="tb-chips-label">Quick hotel:</span>
                {hotelQuickPicks.map(pick => (
                  <button
                    key={pick.key}
                    className={`tb-quick-chip ${String(hotelBudget) === String(pick.amount) ? 'active' : ''}`}
                    onClick={() => setHotelBudgetAmount(pick.amount)}
                    title={pick.label !== 'Quick' ? `${pick.label} of total budget` : undefined}
                  >
                    {sym}{Number(pick.amount).toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Breakdown bar */}
              {hotelPercent !== null && (
                <div className="tb-breakdown">
                  <div className="tb-breakdown-bar">
                    <div className="tb-breakdown-fill hotel" style={{ width: `${hotelPercent}%` }} />
                    <div className="tb-breakdown-fill other" style={{ width: `${Math.max(0, 100 - hotelPercent)}%` }} />
                  </div>
                  <div className="tb-breakdown-legend">
                    <span className="tb-legend-dot hotel" /> Hotel: {hotelPercent}%
                    <span className="tb-legend-dot other" /> Other: {Math.max(0, 100 - hotelPercent)}%
                    {remainingBudget !== null && (
                      <span className="tb-remaining">
                        {remainingBudget >= 0
                          ? `· ${sym}${remainingBudget.toLocaleString()} remaining for activities &amp; food`
                          : `· ⚠️ Hotel exceeds total budget by ${sym}${Math.abs(remainingBudget).toLocaleString()}`}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {hotelBudget && totalBudget && Number(hotelBudget) > Number(totalBudget) && (
                <p className="tb-warning">⚠️ Hotel budget exceeds your total trip budget. Please adjust.</p>
              )}

              {selectedHotelsList.length > 0 && (
                <div className="tb-selected-total-box">
                  <div className="tb-selected-total-title">Selected Hotels Full Total</div>
                  <div className="tb-selected-total-value">
                    {sym}{selectedHotelsMinTotal.toLocaleString()} - {sym}{selectedHotelsMaxTotal.toLocaleString()}
                    <span className="tb-selected-total-cur"> {currency}</span>
                  </div>
                  <div className="tb-selected-total-meta">
                    {totalNightsUsed} night{totalNightsUsed !== 1 ? 's' : ''} across {selectedHotelsList.length} hotel{selectedHotelsList.length !== 1 ? 's' : ''}
                    {selectedVsHotelBudgetDiff !== null && (
                      <span className={selectedVsHotelBudgetDiff >= 0 ? 'tb-selected-total-ok' : 'tb-selected-total-over'}>
                        {selectedVsHotelBudgetDiff >= 0
                          ? ` · within hotel budget by ${sym}${selectedVsHotelBudgetDiff.toLocaleString()}`
                          : ` · over hotel budget by ${sym}${Math.abs(selectedVsHotelBudgetDiff).toLocaleString()}`}
                      </span>
                    )}
                  </div>
                  <div className="tb-selected-total-actions">
                    <button
                      type="button"
                      className="tb-selected-total-btn tb-selected-total-btn-primary"
                      onClick={() => setHotelBudgetAmount(selectedHotelsMaxTotal)}
                    >
                      Quick select full total
                    </button>
                  </div>
                </div>
              )}

              {/* ── Hotels in this district ── */}
              {(() => {
                if (!districtHotels.length) return null
                const budgetLKR = hotelBudget ? Number(hotelBudget) / (LKR_RATES[currency] || 1) : null
                const selectedIds = new Set(selectedHotelsList.map(sh => sh._id))
                const baseAvailableHotels = districtHotels.filter(h => !selectedIds.has(h._id))
                const sortedByPrice = [...baseAvailableHotels].sort((a, b) => (a.priceRange?.min || 0) - (b.priceRange?.min || 0))
                const affordableHotels = budgetLKR
                  ? sortedByPrice.filter(h => (h.priceRange?.min || 0) <= budgetLKR)
                  : sortedByPrice
                const usingAffordableSet = budgetLKR && affordableHotels.length > 0
                const visiblePool = usingAffordableSet ? affordableHotels : sortedByPrice
                const maxVisibleHotels = showMoreHotels ? 24 : 12
                const availableHotels = visiblePool.slice(0, maxVisibleHotels)
                return (
                  <>
                    {selectedHotelsList.length > 0 && (
                      <div className="tb-hotel-grid-section">
                        <div className="tb-hotel-grid-header">
                          <span className="tb-hotel-grid-title">✅ Currently Selected Hotels</span>
                          <span className="tb-hotel-grid-hint">
                            {selectedHotelsList.length} selected · adjust nights or remove below
                          </span>
                        </div>
                        <div className="tb-hotel-grid">
                          {selectedHotelsList.map(h => {
                            const selectedEntry = selectedHotelsList.find(sh => sh._id === h._id)
                            const nightly = getHotelNightlyRange(h)
                            return (
                              <div key={`selected_${h._id}`} className="tb-hg-card selected" style={{ cursor: 'default' }}>
                                <div className="tb-hg-img-wrap">
                                  <img src={h.images?.[0]?.url} alt={h.name} className="tb-hg-img" />
                                  <span className="tb-hg-selected-badge">
                                    ✓ {selectedEntry?.nights ? `${selectedEntry.nights} night${selectedEntry.nights !== 1 ? 's' : ''}` : 'Selected'}
                                  </span>
                                </div>
                                <div className="tb-hg-info">
                                  <span className="tb-hg-name">{h.name}</span>
                                  <span className="tb-hg-stars">{'★'.repeat(h.starRating)}{'☆'.repeat(Math.max(0, 5 - h.starRating))}</span>
                                  <span className="tb-hg-price">
                                    {sym}{convertFromLKR(nightly.min, currency).toLocaleString()}
                                    –{sym}{convertFromLKR(nightly.max, currency).toLocaleString()}
                                    <span className="tb-hg-price-cur">&nbsp;{currency}/night</span>
                                  </span>
                                  <div className="tb-hg-actions">
                                    <div className="tb-hg-nights-row">
                                      <span className="tb-hg-nights-label">🌙 Nights:</span>
                                      <div className="tb-hg-stepper">
                                        <button type="button" className="tb-hg-step-btn"
                                          onClick={e => { e.stopPropagation(); handleChangeNights(h._id, -1) }}
                                          disabled={(selectedEntry?.nights || 1) <= 1}
                                        >−</button>
                                        <span className="tb-hg-step-val">{selectedEntry?.nights || 1}</span>
                                        <button type="button" className="tb-hg-step-btn"
                                          onClick={e => { e.stopPropagation(); handleChangeNights(h._id, +1) }}
                                          disabled={(selectedEntry?.nights || 1) >= maxNightsFor(h._id)}
                                        >+</button>
                                      </div>
                                      {totalNightsCap && <span className="tb-hg-nights-cap">/ {maxNightsFor(h._id)} max</span>}
                                    </div>
                                    <span className="tb-hg-nights-total">
                                      {sym}{convertFromLKR(nightly.min * (selectedEntry?.nights || 1), currency).toLocaleString()}
                                      –{sym}{convertFromLKR(nightly.max * (selectedEntry?.nights || 1), currency).toLocaleString()} total
                                    </span>
                                    <button type="button" className="tb-hg-remove-btn"
                                      onClick={e => { e.stopPropagation(); handleRemoveHotel(h._id) }}
                                    >✕ Remove</button>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <div className="tb-hotel-grid-section">
                      <div className="tb-hotel-grid-header">
                        <span className="tb-hotel-grid-title">
                          🏨 More Hotels in {district?.name} ({availableHotels.length}/{visiblePool.length})
                        </span>
                        {hotelBudget && (
                          <span className="tb-hotel-grid-hint">
                            {usingAffordableSet
                              ? <>Matching your budget: <strong>{sym}{Number(hotelBudget).toLocaleString()}</strong>/night</>
                              : <>No exact matches, showing nearest options for <strong>{sym}{Number(hotelBudget).toLocaleString()}</strong>/night</>}
                          </span>
                        )}
                      </div>
                      <div className="tb-hotel-grid tb-hotel-grid--twelve">
                        {(() => {
                          const totalNightsUsed = selectedHotelsList.reduce((s, sh) => s + (sh.nights || 1), 0)
                          const nightsFull = totalNightsCap != null && totalNightsUsed >= Number(totalNightsCap)
                          return availableHotels.map(h => {
                            const affordable = budgetLKR ? h.priceRange.min <= budgetLKR : null
                            const isNightsFull = nightsFull
                            return (
                              <div
                                key={h._id}
                                className={`tb-hg-card${budgetLKR && !affordable ? ' unaffordable' : ''}`}
                                onClick={() => !isNightsFull && affordable !== false && handlePickHotel(h)}
                                style={{ cursor: affordable === false || isNightsFull ? 'default' : 'pointer' }}
                              >
                                <div className="tb-hg-img-wrap">
                                  <img src={h.images?.[0]?.url} alt={h.name} className="tb-hg-img" />
                                  {budgetLKR && (
                                    <span className={`tb-hg-afford-badge ${affordable ? 'yes' : 'no'}`}>
                                      {affordable ? 'Within budget' : 'Over budget'}
                                    </span>
                                  )}
                                </div>
                                <div className="tb-hg-info">
                                  <span className="tb-hg-name">{h.name}</span>
                                  <span className="tb-hg-stars">{'★'.repeat(h.starRating)}{'☆'.repeat(Math.max(0, 5 - h.starRating))}</span>
                                  <span className="tb-hg-price">
                                    {sym}{convertFromLKR(h.priceRange.min, currency).toLocaleString()}
                                    –{sym}{convertFromLKR(h.priceRange.max, currency).toLocaleString()}
                                    <span className="tb-hg-price-cur">&nbsp;{currency}/night</span>
                                  </span>
                                  {isNightsFull ? (
                                    <button type="button" className="tb-hg-pick-btn full" disabled>
                                      🌙 Nights full
                                    </button>
                                  ) : affordable !== false ? (
                                    <button
                                      type="button"
                                      className="tb-hg-pick-btn"
                                      onClick={e => { e.stopPropagation(); handlePickHotel(h) }}
                                    >Pick &amp; set nights →</button>
                                  ) : (
                                    <span className="tb-hg-over-label">Over budget</span>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        })()}
                      </div>
                      {visiblePool.length > 12 && (
                        <div className="tb-hotel-grid-actions">
                          <button
                            type="button"
                            className="tb-hotel-grid-more-btn"
                            onClick={() => setShowMoreHotels(v => !v)}
                          >
                            {showMoreHotels ? 'Show less' : 'Show more'}
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
            </section>

          </div>{/* end tb-col-left */}

          {/* ══ RIGHT COLUMN — Currency + Days ══ */}
          <div className="tb-col-right">

            {/* ── Section 1: Currency ── */}
            <section className="tb-section tb-currency-section">
              <div className="tb-currency-header">
                <div className="tb-currency-title-row">
                  <span className="tb-currency-globe">💱</span>
                  <div>
                    <h2>Budget Currency</h2>
                    <p>All amounts will be shown in your chosen currency</p>
                  </div>
                </div>
                <div className="tb-currency-active-badge">
                  {CURRENCIES.find(c => c.code === currency)?.flag}
                  <span className="tb-cab-sym">{CURRENCIES.find(c => c.code === currency)?.symbol}</span>
                  <span className="tb-cab-code">{currency}</span>
                </div>
              </div>
              <div className="tb-currency-strip">
                {CURRENCIES.map(c => (
                  <button
                    key={c.code}
                    className={`tb-cs-btn${currency === c.code ? ' active' : ''}`}
                    onClick={() => {
                      if (c.code === currency) return
                      const nextTotal = totalBudget ? convertCurrencyAmount(totalBudget, currency, c.code) : 0
                      const nextHotel = hotelBudget ? convertCurrencyAmount(hotelBudget, currency, c.code) : 0
                      setCurrency(c.code)
                      setTotalBudget(nextTotal > 0 ? nextTotal : '')
                      setHotelBudget(nextHotel > 0 ? nextHotel : '')
                      setTotalRaw(nextTotal > 0 ? String(nextTotal) : '')
                      setHotelRaw(nextHotel > 0 ? String(nextHotel) : '')
                    }}
                  >
                    <span className="tb-cs-flag">{c.flag}</span>
                    <span className="tb-cs-sym">{c.symbol}</span>
                    <span className="tb-cs-code">{c.code}</span>
                    <span className="tb-cs-name">{c.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* ── Section 4: Total Trip Duration ── */}
            <section className="tb-section tb-days-section">
              <div className="tb-section-header">
                <span className="tb-section-icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </span>
                <div>
                  <h2>Total trip days</h2>
                  <p>Full duration including non-hotel days{district?.name ? ` in ${district.name}` : ''}</p>
                </div>
              </div>

              <div className="tb-days-wrap">
                <div className="tb-days-stepper">
                  <button
                    className="tb-days-btn"
                    onClick={() => setTripDays(d => String(Math.max(minDays, (Number(d) || minDays) - 1)))}
                    disabled={(Number(tripDays) || 0) <= minDays}
                    aria-label="Decrease days"
                  >−</button>
                  <div className="tb-days-display">
                    <span className="tb-days-number">{tripDays || minDays}</span>
                    <span className="tb-days-unit">{Number(tripDays || minDays) === 1 ? 'day' : 'days'}</span>
                  </div>
                  <button
                    className="tb-days-btn"
                    onClick={() => setTripDays(d => String(Math.min(365, Math.max(minDays, (Number(d) || 0) + 1))))}
                    aria-label="Increase days"
                  >+</button>
                </div>

                <div className="tb-quick-chips tb-days-chips">
                  {[1, 2, 3, 5, 7, 10, 14].map(d => (
                    <button
                      key={d}
                      className={`tb-quick-chip ${String(tripDays) === String(d) ? 'active' : ''}`}
                      onClick={() => setTripDays(String(d))}
                      disabled={d < minDays}
                      title={d < minDays ? `Min ${minDays} days (hotel dates span)` : ''}
                    >{d}d</button>
                  ))}
                </div>

                {/* Hotel nights info line */}
                <p className="tb-days-min-note">
                  🏨 Hotel stay: <strong>{totalNightsUsed} night{totalNightsUsed !== 1 ? 's' : ''}</strong> across {selectedHotelsList.length > 0 ? selectedHotelsList.length : 0} hotel{selectedHotelsList.length !== 1 ? 's' : ''}
                  {autoTripDays > 0 && (
                    <> · trip span <strong>{autoTripDays} day{autoTripDays !== 1 ? 's' : ''}</strong>{Number(tripDays) > autoTripDays ? ` (+${Number(tripDays) - autoTripDays} extended)` : ''}</>
                  )}
                </p>

                {tripDays && totalBudget && Number(tripDays) > 0 && (
                  <p className="tb-days-hint">
                    ≈ <strong>{sym}{Math.round(Number(totalBudget) / Number(tripDays)).toLocaleString()}</strong> per day based on your total budget
                  </p>
                )}
              </div>
            </section>

          </div>{/* end tb-col-right */}
        </div>{/* end tb-layout */}

        {/* ── Summary + CTA ── */}
        <div className="tb-cta-bar">
          <button className="tb-back-btn" onClick={() => navigate('/hotel-picker')}>
            ← Back
          </button>

          <div className="tb-summary">
            {totalBudget
              ? <span className="tb-summary-chip">🗺️ {sym}{Number(totalBudget).toLocaleString()} total</span>
              : <span className="tb-summary-chip muted">🗺️ Total not set</span>}
            {hotelBudget
              ? <span className="tb-summary-chip">🏨 {sym}{Number(hotelBudget).toLocaleString()} hotel</span>
              : <span className="tb-summary-chip muted">🏨 Hotel not set</span>}
            {selectedHotelsList.length > 0 && (
              <span className="tb-summary-chip">✅ Selected ~ {sym}{selectedHotelsAvgTotal.toLocaleString()}</span>
            )}
            <span className="tb-summary-chip">🗓️ {tripDays || prefsDays} {Number(tripDays || prefsDays) === 1 ? 'day' : 'days'}{Number(tripDays) > prefsDays ? ` (${prefsDays}n hotel)` : ''}</span>
          </div>

          <button
            className="tb-continue-btn"
            onClick={handleContinue}
            disabled={!canContinue}
          >
            Continue
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12,5 19,12 12,19"/>
            </svg>
          </button>
        </div>
          {(isBudgetIncomplete || isTripDaysInvalid || isHotelOverTotal) && (
          <p className="tb-days-required" style={{ marginTop: '10px', textAlign: 'right' }}>
            {isBudgetIncomplete
              ? '⚠️ Please fill both Total trip budget and Hotel budget to continue.'
              : isTripDaysInvalid
              ? `⚠️ Total trip days must be at least ${minDays} (your hotel nights).`
              : '⚠️ Hotel budget cannot be greater than total trip budget.'}
          </p>
        )}
      </div>
    </div>
  )
}
