import { useState } from 'react'
import { clearUserData } from '../utils/clearUserData'
import { API_BASE } from '../config/api'
import { Link, useNavigate } from 'react-router-dom'
import { validateEmail } from '../utils/validation'
import './Login.css'

/* ── SVG Icon helpers ── */
const IconMail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <polyline points="2,4 12,13 22,4"/>
  </svg>
)
const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)
const IconEye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)
const IconEyeOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)
const IconArrowRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12,5 19,12 12,19"/>
  </svg>
)
const IconCompass = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88 16.24,7.76"/>
  </svg>
)
const IconStar = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
)

function Login({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const emailCheck = validateEmail(email)
    if (!emailCheck.valid) { setError(emailCheck.message); return }
    if (!password) { setError('Password is required.'); return }
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Invalid email or password.')
      }
      // Persist auth token
      localStorage.setItem('token', data.data.token)
      // Persist user profile for dashboard
      const u = data.data.user
      // Clear previous user's data if it's a different account
      const existing = JSON.parse(localStorage.getItem('currentUser') || '{}')
      if (existing.id && existing.id !== u.id) {
        clearUserData()
      }
      const prefs = u.preferences || u.address?.prefs || {}
      localStorage.setItem('currentUser', JSON.stringify({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        dateOfBirth: u.date_of_birth || '',
        nic: u.nic || '',
        gender: u.gender || '',
        age: u.age || '',
        avatar: u.avatar || '',
        interests: (u.interests && u.interests.length) ? u.interests : [],
        travelStyle: u.travelStyle || '',
        role: u.role,
        preferences: prefs,
        privacy: u.address?.privacy || {},
        joinDate: (existing.id === u.id && existing.joinDate)
          ? existing.joinDate
          : new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
      }))
      // Sync currency for all pages
      if (prefs.currency) localStorage.setItem('et_displayCurrency', prefs.currency)
      // Redirect admin users to the admin panel, regular users to the dashboard
      navigate(u.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lg-page">
      {/* ── Left Panel ── */}
      <div className="lg-left">
        <div className="lg-pattern" aria-hidden="true" />

        <Link to="/" className="lg-logo">
          <div className="lg-logo-icon"><IconCompass /></div>
          <span className="lg-logo-text">Travel<span>Genie</span></span>
        </Link>

        <div className="lg-hero">
          <div className="lg-eyebrow">
            <span className="lg-eyebrow-dot" />
            Your Journey Awaits
          </div>

          <h1>
            Welcome<br />
            Back, <em>Explorer</em>
          </h1>
          <p>
            Sign in to continue your Sri Lanka trip planning workflow with saved itineraries,
            destination picks, hotel choices, and budget tracking.
          </p>

          <div className="lg-stats">
            <div className="lg-stat">
              <span className="lg-stat-num">25</span>
              <span className="lg-stat-label">Districts</span>
            </div>
            <div className="lg-stat">
              <span className="lg-stat-num">6</span>
              <span className="lg-stat-label">Planning Steps</span>
            </div>
            <div className="lg-stat">
              <span className="lg-stat-num">3</span>
              <span className="lg-stat-label">AI Services</span>
            </div>
          </div>
        </div>

        <div className="lg-testimonial">
          <div className="lg-testimonial-quote">"</div>
          <blockquote>
            TravelGenie made my planning smooth from district selection to budget tracking. Everything stayed in one place.
          </blockquote>
          <div className="lg-testimonial-author">
            <div className="lg-avatar">A</div>
            <div className="lg-author-info">
              <strong>Amara Perera</strong>
              <span>Colombo, Sri Lanka</span>
            </div>
            <div className="lg-stars">
              {[1,2,3,4,5].map(n => <IconStar key={n} />)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="lg-right">
        <Link to="/" className="lg-back-home" aria-label="Back to Home">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/></svg>
          Home
        </Link>
        <button className="lg-theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'light' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          )}
        </button>

        <div className="lg-form-container">
          <div className="lg-form-header">
            <h2>Sign In</h2>
            <p>
              Don't have an account?{' '}
              <Link to="/signup">Create one free</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="lg-field">
              <label htmlFor="email">Email Address</label>
              <div className="lg-input-wrap">
                <span className="lg-input-icon"><IconMail /></span>
                <input
                  type="email"
                  id="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="lg-field">
              <label htmlFor="password">Password</label>
              <div className="lg-input-wrap">
                <span className="lg-input-icon"><IconLock /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="lg-eye-btn"
                  onClick={() => setShowPassword(p => !p)}
                  aria-label="Toggle password"
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>

            <div className="lg-options">
              <label className="lg-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="lg-forgot">Forgot password?</Link>
            </div>

            {error && (
              <div className="lg-error-msg" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="lg-btn-primary" disabled={loading}>
              {loading ? 'Signing In…' : <><span>Sign In</span> <IconArrowRight /></>}
            </button>
          </form>

          <div className="lg-divider">
            <div className="lg-divider-line" />
            <span>or continue with</span>
            <div className="lg-divider-line" />
          </div>

          <div className="lg-social">
            <button type="button" className="lg-social-btn">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button type="button" className="lg-social-btn">
              <svg viewBox="0 0 24 24" fill="#1877F2" width="18" height="18">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>
            <button type="button" className="lg-social-btn">
              <svg viewBox="0 0 814 1000" fill="currentColor" width="16" height="18">
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-167.5-127.5c-66-96.7-120.5-251.7-120.5-399.5 0-237.9 155.9-364.2 309.3-364.2 79.2 0 145.5 52.4 195.5 52.4 48 0 123.9-55.4 214.7-55.4zm-105.4-187.6c39.5-47.5 66.7-112.7 66.7-177.9 0-9-.6-18.1-2.1-25.5-63.5 2.4-139.4 42.5-185.2 95.8-36 40.5-68.4 106.8-68.4 172.8 0 9.7 1.5 19.4 2.1 22.4 3.5.6 9.1 1.3 14.7 1.3 57 0 127.5-38.6 172.2-88.9z"/>
              </svg>
              Apple
            </button>
          </div>

          <div className="lg-form-footer">
            New to TravelGenie? <Link to="/signup">Create a free account</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
