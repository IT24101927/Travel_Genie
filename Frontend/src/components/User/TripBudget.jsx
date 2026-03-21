import { useState, useEffect } from 'react'
import { clearUserData } from '../../utils/clearUserData'
import { Link, useNavigate } from 'react-router-dom'
import { HOTELS_BY_DISTRICT } from './HotelPicker'
import './TripBudget.css'

// Hotel prices are stored in USD. USD_RATES = units of currency per 1 USD
const USD_RATES = { LKR: 300, USD: 1, EUR: 0.92 }
function convertFromUSD(usd, code) {
  return Math.round((usd || 0) * (USD_RATES[code] || 1))
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

function formatNum(val, symbol) {
  if (!val && val !== 0) return `${symbol}—`
  return `${symbol}${Number(val).toLocaleString()}`
}

export default function TripBudget({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [district,    setDistrict]    = useState(null)
  const [prefs,       setPrefs]       = useState(null)
  const [selectedHotelsList, setSelectedHotelsList] = useState([])

  // Budget state
  const [currency,     setCurrency]     = useState('LKR')
  const [totalBudget,  setTotalBudget]  = useState('')
  const [hotelBudget,  setHotelBudget]  = useState('')
  const [totalRaw,     setTotalRaw]     = useState('')
  const [hotelRaw,     setHotelRaw]     = useState('')
  const [tripDays,     setTripDays]     = useState('')

  useEffect(() => {
    const raw = localStorage.getItem('selectedDistrict')
    if (!raw) { navigate('/plan-trip'); return }
    setDistrict(JSON.parse(raw))

    const prefsRaw = localStorage.getItem('tripPreferences')
    const prefsData = prefsRaw ? (() => { try { return JSON.parse(prefsRaw) } catch { return null } })() : null
    if (prefsData) setPrefs(prefsData)

    // Load selected hotels — prefer the multi array (only if non-empty), fall back to single
    const hotelsRaw = localStorage.getItem('selectedHotels')
    const hotelRaw  = localStorage.getItem('selectedHotel')
    const hotelList = []
    if (hotelsRaw) {
      try {
        const parsed = JSON.parse(hotelsRaw)
        if (Array.isArray(parsed) && parsed.length > 0) hotelList.push(...parsed)
      } catch {}
    }
    if (hotelList.length === 0 && hotelRaw) {
      try {
        const h = JSON.parse(hotelRaw)
        hotelList.push({ ...h, nights: h.hotelNights || h.nights || 1 })
      } catch {}
    }
    setSelectedHotelsList(hotelList)

    // Total hotel nights — hotels may not have nights set if loaded from HotelPicker
    // treat missing nights as 1 per hotel
    const totalHotelNights = hotelList.reduce((s, h) => s + (Number(h.nights) || 1), 0)

    // Minimum days: use hotel nights if any hotels selected, else prefs days, else 1
    const minStart = totalHotelNights > 0
      ? totalHotelNights
      : (prefsData?.days ? Number(prefsData.days) : 1)

    // Restore saved budget
    const savedBudget = localStorage.getItem('tripBudget')
    if (savedBudget) {
      try {
        const b = JSON.parse(savedBudget)
        setCurrency(b.currency ?? 'LKR')
        setTotalBudget(b.totalBudget ?? '')
        setHotelBudget(b.hotelBudget ?? '')
        setTotalRaw(b.totalBudget ?? '')
        setHotelRaw(b.hotelBudget ?? '')
        // Always start at least at minStart
        const savedDays = b.tripDays ? Number(b.tripDays) : 0
        setTripDays(String(Math.max(minStart, savedDays)))
      } catch {}
    } else {
      // No saved budget — pick currency from profile preferences
      const profileCurr = localStorage.getItem('et_displayCurrency')
      if (profileCurr) setCurrency(profileCurr)
      // No saved budget — start at hotel nights (or prefs days, or 1)
      setTripDays(String(minStart))
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
    if (totalDays && totalUsed >= Number(totalDays)) return
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

  // Total days available (budget-page stepper wins; fall back to preferences days)
  const totalDays = (tripDays && Number(tripDays) > 0)
    ? Number(tripDays)
    : (prefs?.days && Number(prefs.days) > 0) ? Number(prefs.days) : null

  // Total nights already assigned across all selected hotels
  const totalNightsUsed = selectedHotelsList.reduce((s, sh) => s + (sh.nights || 1), 0)

  // Minimum allowed trip days = hotel nights OR prefs days, whichever is higher
  const prefsDays = prefs?.days ? Number(prefs.days) : 1
  const minDays = Math.max(prefsDays, totalNightsUsed)

  // Auto-bump tripDays whenever minDays rises (hotel nights added or prefs loaded)
  useEffect(() => {
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
    totalDays ? Math.max(1, totalDays - nightsUsedByOthers(id)) : 30

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
    const budget = {
      currency,
      totalBudget: totalBudget ? Number(totalBudget) : null,
      hotelBudget: hotelBudget ? Number(hotelBudget) : null,
      tripDays:    tripDays    ? Number(tripDays)    : null,
    }
    localStorage.setItem('tripBudget', JSON.stringify(budget))
    navigate('/trip-details')
  }

  const handleSkip = () => {
    navigate('/trip-details')
  }

  if (!district) return null

  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || ''
  const quickTotals = getQuickTotals(currency)

  const hotelPercent =
    totalBudget && hotelBudget && Number(totalBudget) > 0
      ? Math.min(100, Math.round((Number(hotelBudget) / Number(totalBudget)) * 100))
      : null

  const remainingBudget =
    totalBudget && hotelBudget
      ? Number(totalBudget) - Number(hotelBudget)
      : null

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
                  value={totalRaw ? Number(totalRaw).toLocaleString() : ''}
                  onChange={e => handleTotalInput(e.target.value)}
                />
                <span className="tb-input-suffix">{currency}</span>
              </div>

              <div className="tb-quick-chips">
                <span className="tb-chips-label">Quick pick:</span>
                {quickTotals.map(n => (
                  <button
                    key={n}
                    className={`tb-quick-chip ${String(totalBudget) === String(n) ? 'active' : ''}`}
                    onClick={() => { setTotalBudget(n); setTotalRaw(String(n)) }}
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
                  value={hotelRaw ? Number(hotelRaw).toLocaleString() : ''}
                  onChange={e => handleHotelInput(e.target.value)}
                />
                <span className="tb-input-suffix">{currency}</span>
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

              {/* ── Hotels in this district ── */}
              {(() => {
                const districtHotels = HOTELS_BY_DISTRICT[district?.id] || []
                if (!districtHotels.length) return null
                const budgetUSD = hotelBudget ? Number(hotelBudget) / (USD_RATES[currency] || 1) : null
                return (
                  <div className="tb-hotel-grid-section">
                    <div className="tb-hotel-grid-header">
                      <span className="tb-hotel-grid-title">🏨 Hotels in {district?.name}</span>
                      {hotelBudget && (
                        <span className="tb-hotel-grid-hint">
                          Affordability vs your budget:&nbsp;
                          <strong>{sym}{Number(hotelBudget).toLocaleString()}</strong>/night
                        </span>
                      )}
                    </div>
                    <div className="tb-hotel-grid">
                      {(() => {
                        const totalNightsUsed = selectedHotelsList.reduce((s, sh) => s + (sh.nights || 1), 0)
                        const nightsFull = totalDays != null && totalNightsUsed >= Number(totalDays)
                        return districtHotels.map(h => {
                          const isSelected = selectedHotelsList.some(sh => sh._id === h._id)
                          const selectedEntry = selectedHotelsList.find(sh => sh._id === h._id)
                          const affordable = budgetUSD ? h.priceRange.min <= budgetUSD : null
                          const isNightsFull = !isSelected && nightsFull
                          return (
                            <div
                              key={h._id}
                              className={`tb-hg-card${isSelected ? ' selected' : ''}${budgetUSD && !affordable ? ' unaffordable' : ''}`}
                              onClick={() => !isSelected && !isNightsFull && affordable !== false && handlePickHotel(h)}
                              style={{ cursor: isSelected || affordable === false || isNightsFull ? 'default' : 'pointer' }}
                            >
                              <div className="tb-hg-img-wrap">
                                <img src={h.images?.[0]?.url} alt={h.name} className="tb-hg-img" />
                                {isSelected && (
                                  <span className="tb-hg-selected-badge">
                                    ✓ {selectedEntry?.nights ? `${selectedEntry.nights} night${selectedEntry.nights !== 1 ? 's' : ''}` : 'Selected'}
                                  </span>
                                )}
                                {!isSelected && budgetUSD && (
                                  <span className={`tb-hg-afford-badge ${affordable ? 'yes' : 'no'}`}>
                                    {affordable ? 'Within budget' : 'Over budget'}
                                  </span>
                                )}
                              </div>
                              <div className="tb-hg-info">
                                <span className="tb-hg-name">{h.name}</span>
                                <span className="tb-hg-stars">{'★'.repeat(h.starRating)}{'☆'.repeat(Math.max(0, 5 - h.starRating))}</span>
                                <span className="tb-hg-price">
                                  {sym}{convertFromUSD(h.priceRange.min, currency).toLocaleString()}
                                  –{sym}{convertFromUSD(h.priceRange.max, currency).toLocaleString()}
                                  <span className="tb-hg-price-cur">&nbsp;{currency}/night</span>
                                </span>
                                {isSelected ? (
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
                                      {totalDays && <span className="tb-hg-nights-cap">/ {maxNightsFor(h._id)} max</span>}
                                    </div>
                                    <span className="tb-hg-nights-total">
                                      {sym}{convertFromUSD(h.priceRange.min * (selectedEntry?.nights || 1), currency).toLocaleString()}
                                      –{sym}{convertFromUSD(h.priceRange.max * (selectedEntry?.nights || 1), currency).toLocaleString()} total
                                    </span>
                                    <button type="button" className="tb-hg-remove-btn"
                                      onClick={e => { e.stopPropagation(); handleRemoveHotel(h._id) }}
                                    >✕ Remove</button>
                                  </div>
                                ) : isNightsFull ? (
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
                  </div>
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
                    onClick={() => { setCurrency(c.code); setTotalBudget(''); setHotelBudget('') }}
                  >
                    <span className="tb-cs-flag">{c.flag}</span>
                    <span className="tb-cs-sym">{c.symbol}</span>
                    <span className="tb-cs-code">{c.code}</span>
                    <span className="tb-cs-name">{c.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* ── Section 4: Trip Days ── */}
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
                  <h2>How many days?</h2>
                  <p>Choose your total stay duration{district?.name ? ` in ${district.name}` : ''}</p>
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
                    <span className="tb-days-number">{tripDays || 0}</span>
                    <span className="tb-days-unit">days</span>
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
                      onClick={() => setTripDays(d)}
                      disabled={d < minDays}
                      title={d < minDays ? `You have ${totalNightsUsed} hotel night${totalNightsUsed !== 1 ? 's' : ''} booked` : ''}
                    >{d}d</button>
                  ))}
                </div>

                {tripDays && totalBudget && Number(tripDays) > 0 && (
                  <p className="tb-days-hint">
                    ≈ <strong>{sym}{Math.round(Number(totalBudget) / Number(tripDays)).toLocaleString()}</strong> per day based on your total budget
                  </p>
                )}
                {(!tripDays || Number(tripDays) < 1) && (
                  <p className="tb-days-required">⚠️ Please set at least 1 day to continue.</p>
                )}
                {totalNightsUsed > 0 && (
                  <p className="tb-days-min-note">
                    🏨 Minimum {minDays} day{minDays !== 1 ? 's' : ''} locked — matches your {totalNightsUsed} hotel night{totalNightsUsed !== 1 ? 's' : ''} booked
                  </p>
                )}
                {totalNightsUsed === 0 && prefsDays > 1 && (
                  <p className="tb-days-min-note">
                    📅 Minimum {prefsDays} day{prefsDays !== 1 ? 's' : ''} — set from your trip preferences
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
            {tripDays
              ? <span className="tb-summary-chip">🗓️ {tripDays} {Number(tripDays) === 1 ? 'day' : 'days'}</span>
              : <span className="tb-summary-chip muted">🗓️ Days not set</span>}
            {prefs && prefs.days && <span className="tb-summary-chip">🏨 {prefs.days} hotel days</span>}
          </div>

          <button
            className="tb-continue-btn"
            onClick={handleContinue}
            disabled={!tripDays || Number(tripDays) < minDays || (!!hotelBudget && !!totalBudget && Number(hotelBudget) > Number(totalBudget))}
          >
            Continue
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12,5 19,12 12,19"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
