import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_BASE } from '../config/api'
import './Signup.css'
import './ForgotPassword.css'
import { clearUserData } from '../utils/clearUserData'

/* ── SVG Icon helpers ── */
const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)
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
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12"/>
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

/* ── Password strength util ── */
function getStrength(pw) {
  if (!pw) return { level: 0, label: '', cls: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { level: 1, label: 'Weak',   cls: 'weak' }
  if (score === 2) return { level: 2, label: 'Fair',   cls: 'fair' }
  if (score === 3) return { level: 3, label: 'Good',   cls: 'good' }
  return              { level: 4, label: 'Strong', cls: 'strong' }
}

const INTEREST_OPTIONS = [
  'Beaches', 'Mountains', 'Food', 'History', 'Nightlife',
  'Culture', 'Adventure', 'Nature', 'Wildlife', 'Photography',
  'Art', 'Shopping', 'Spa', 'Wellness', 'Sports'
]

const TRAVEL_STYLES = [
  { value: 'Adventure',  emoji: '🏔️' },
  { value: 'Relax',      emoji: '🏖️' },
  { value: 'Culture',    emoji: '🏛️' },
  { value: 'Luxury',     emoji: '💎' },
  { value: 'Budget',     emoji: '🎒' },
  { value: 'Family',     emoji: '👨‍👩‍👧' },
  { value: 'Backpacker', emoji: '🗺️' },
]

function Signup({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState('forward')

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    nic: '',
    gender: '',
    password: '',
    confirmPassword: '',
    interests: [],
    travelStyle: 'Culture',
    currency: 'LKR',
  })
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarBase64, setAvatarBase64] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // OTP verification (step 2)
  const [digits, setDigits]     = useState(['', '', '', '', '', ''])
  const [otpError, setOtpError] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const inputRefs = useRef([])

  const strength = getStrength(formData.password)

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setAvatarPreview(ev.target.result)
      setAvatarBase64(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const toggleInterest = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }))
  }

  /* ── Step 1 → send verification code ── */
  const goNext = async () => {
    if (!formData.fullName || !formData.email || !formData.password) {
      setError('Please fill in name, email and password before continuing.')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match!")
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/users/send-verification-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to send verification code')
      setDigits(['', '', '', '', '', ''])
      setOtpError('')
      setDirection('forward')
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /* ── OTP digit handlers ── */
  const handleDigitChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return
    const next = [...digits]
    next[index] = value
    setDigits(next)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
  }
  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0)
      inputRefs.current[index - 1]?.focus()
  }
  const handleDigitPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setDigits(pasted.split(''))
      inputRefs.current[5]?.focus()
      e.preventDefault()
    }
  }

  /* ── Step 2 → verify OTP, then go to step 3 ── */
  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    const code = digits.join('')
    if (code.length !== 6) { setOtpError('Please enter the full 6-digit code'); return }
    setOtpError('')
    setOtpLoading(true)
    try {
      const res = await fetch(`${API_BASE}/users/verify-email-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Verification failed')
      setDirection('forward')
      setStep(3)
    } catch (err) {
      setOtpError(err.message)
    } finally {
      setOtpLoading(false)
    }
  }

  const goBack = () => {
    setDirection('back')
    setStep(prev => prev - 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!agreeTerms) {
      setError('Please agree to the Terms & Conditions')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth || undefined,
          nic: formData.nic,
          gender: formData.gender || undefined,
          interests: formData.interests,
          travelStyle: formData.travelStyle,
          currency: formData.currency,
          avatar: avatarBase64 || undefined
        })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Registration failed. Please try again.')
      }
      // Persist auth token
      localStorage.setItem('token', data.data.token)
      // Clear any previous user's data before saving new user
      clearUserData()
      // Sync selected currency for all pages
      localStorage.setItem('et_displayCurrency', formData.currency)
      // Persist user profile for dashboard
      const u = data.data.user
      localStorage.setItem('currentUser', JSON.stringify({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || formData.phone,
        dateOfBirth: u.dateOfBirth || formData.dateOfBirth,
        nic: u.nic || formData.nic,
        gender: u.gender || formData.gender,
        interests: (u.interests && u.interests.length) ? u.interests : formData.interests,
        travelStyle: u.travelStyle || formData.travelStyle,
        role: u.role,
        joinDate: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        preferences: {
          ...(u.preferences || {}),
          currency: formData.currency,
          emailNotifications: true,
          smsNotifications: false,
          promotionalEmails: true,
          newsletterSubscription: true,
          language: 'en',
        },
        privacy: u.address?.privacy || {},
      }))
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sg-page">
      {/* ── Left Panel ── */}
      <div className="sg-left">
        <div className="sg-pattern" aria-hidden="true" />

        <Link to="/" className="sg-logo">
          <div className="sg-logo-icon"><IconCompass /></div>
          <span className="sg-logo-text">Travel<span>Genie</span></span>
        </Link>

        <div className="sg-hero">
          <div className="sg-eyebrow">
            <span className="sg-eyebrow-dot" />
            Sri Lanka&apos;s #1 Travel Platform
          </div>
          <h1>Your Next<br />Adventure<br /><em>Starts Here</em></h1>
          <p>Discover curated itineraries, seamless bookings, and experiences crafted just for you — all in one place.</p>

          <div className="sg-stats">
            <div className="sg-stat">
              <span className="sg-stat-num">10<span>K+</span></span>
              <span className="sg-stat-label">Travelers</span>
            </div>
            <div className="sg-stat">
              <span className="sg-stat-num">200<span>+</span></span>
              <span className="sg-stat-label">Destinations</span>
            </div>
            <div className="sg-stat">
              <span className="sg-stat-num">4.9<span>★</span></span>
              <span className="sg-stat-label">Avg Rating</span>
            </div>
          </div>
        </div>

        <div className="sg-testimonial">
          <div className="sg-testimonial-quote">&ldquo;</div>
          <blockquote>TravelGenie turned my dream Sri Lanka trip into a flawless reality — every detail, perfectly handled.</blockquote>
          <div className="sg-testimonial-author">
            <div className="sg-avatar">S</div>
            <div className="sg-author-info">
              <strong>Sarah Mitchell</strong>
              <span>Solo traveler · Colombo</span>
            </div>
            <div className="sg-stars">
              {[...Array(5)].map((_, i) => <IconStar key={i} />)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="sg-right">
        <button className="sg-theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'light' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          )}
        </button>

        <div className="sg-form-container">
          {/* Progress */}
          <div className="sg-progress">
            <div className={`sg-step-dot ${step === 1 ? 'active' : 'done'}`} />
            <div className={`sg-step-dot ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`} />
            <div className={`sg-step-dot ${step === 3 ? 'active' : step > 3 ? 'done' : ''}`} />
            <span className="sg-progress-label">Step {step} of 3</span>
          </div>

          {/* Header */}
          <div className="sg-form-header">
            <h2>
              {step === 1 ? 'Create your account'
                : step === 2 ? 'Verify your email'
                : 'Your travel preferences'}
            </h2>
            <p>
              {step === 1
                ? <><span>Already have an account? </span><Link to="/login">Sign in</Link></>
                : step === 2
                ? <>We sent a 6-digit code to <strong>{formData.email}</strong>.<br /><span style={{ fontSize: '13px', color: 'var(--text-muted, #6b7280)' }}>Check spam, or look in the server terminal if email isn&apos;t configured.</span></>
                : 'Help us personalise your travel experience.'}
            </p>
          </div>

          {/* ── Step 1 ── */}
          {step === 1 && (
            <div className={`sg-step-panel ${direction === 'back' ? 'prev' : ''}`}>

              {/* Avatar picker */}
              <div className="sg-avatar-picker">
                <label htmlFor="avatarInput" className="sg-avatar-circle" title="Upload profile photo">
                  {avatarPreview
                    ? <img src={avatarPreview} alt="avatar preview" />
                    : (
                      <span className="sg-avatar-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                      </span>
                    )
                  }
                  <span className="sg-avatar-edit-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"/>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                    </svg>
                  </span>
                </label>
                <input id="avatarInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                <div className="sg-avatar-hint">
                  <span>Profile Photo</span>
                  <small>Optional — JPG, PNG or GIF</small>
                </div>
              </div>

              <div className="sg-field">
                <label htmlFor="fullName">Full Name</label>
                <div className="sg-input-wrap">
                  <span className="sg-input-icon"><IconUser /></span>
                  <input type="text" id="fullName" name="fullName" placeholder="Jane Smith"
                    value={formData.fullName} onChange={handleChange} required autoFocus />
                </div>
              </div>

              <div className="sg-field">
                <label htmlFor="email">Email address</label>
                <div className="sg-input-wrap">
                  <span className="sg-input-icon"><IconMail /></span>
                  <input type="email" id="email" name="email" placeholder="jane@example.com"
                    value={formData.email} onChange={handleChange} required />
                </div>
              </div>

              <div className="sg-row">
                <div className="sg-field">
                  <label htmlFor="phone">Phone Number</label>
                  <div className="sg-input-wrap">
                    <span className="sg-input-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l1.27-.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </span>
                    <input type="tel" id="phone" name="phone" placeholder="+94 77 123 4567"
                      value={formData.phone} onChange={handleChange} />
                  </div>
                </div>

                <div className="sg-field">
                  <label htmlFor="dateOfBirth">Date of Birth</label>
                  <div className="sg-input-wrap">
                    <span className="sg-input-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </span>
                    <input type="date" id="dateOfBirth" name="dateOfBirth"
                      value={formData.dateOfBirth} onChange={handleChange} />
                  </div>
                </div>
              </div>

              <div className="sg-field">
                <label htmlFor="nic">NIC / Passport Number</label>
                <div className="sg-input-wrap">
                  <span className="sg-input-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                  </span>
                  <input type="text" id="nic" name="nic" placeholder="e.g. 991234567V or P12345678"
                    value={formData.nic} onChange={handleChange} />
                </div>
              </div>

              <div className="sg-field">
                <label>Gender</label>
                <div className="sg-gender-options" style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  {[{ value: 'male', label: '♂ Male' }, { value: 'female', label: '♀ Female' }, { value: 'other', label: '⚧ Other' }].map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.95rem' }}>
                      <input
                        type="radio"
                        name="gender"
                        value={opt.value}
                        checked={formData.gender === opt.value}
                        onChange={handleChange}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="sg-row">
                <div className="sg-field">
                  <label htmlFor="password">Password</label>
                  <div className="sg-input-wrap">
                    <span className="sg-input-icon"><IconLock /></span>
                    <input type={showPassword ? 'text' : 'password'} id="password" name="password"
                      placeholder="Create password" value={formData.password} onChange={handleChange} required />
                    <button type="button" className="sg-eye-btn"
                      onClick={() => setShowPassword(p => !p)} aria-label="Toggle password">
                      {showPassword ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </div>
                  {formData.password && (
                    <div className="sg-strength">
                      {[1, 2, 3, 4].map(n => (
                        <div key={n} className={`sg-strength-bar ${n <= strength.level ? `active-${strength.cls}` : ''}`} />
                      ))}
                      <span className={`sg-strength-label ${strength.cls}`}>{strength.label}</span>
                    </div>
                  )}
                </div>

                <div className="sg-field">
                  <label htmlFor="confirmPassword">Confirm password</label>
                  <div className="sg-input-wrap">
                    <span className="sg-input-icon"><IconLock /></span>
                    <input type={showConfirmPassword ? 'text' : 'password'} id="confirmPassword"
                      name="confirmPassword" placeholder="Repeat password"
                      value={formData.confirmPassword} onChange={handleChange} required />
                    <button type="button" className="sg-eye-btn"
                      onClick={() => setShowConfirmPassword(p => !p)} aria-label="Toggle password">
                      {showConfirmPassword ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </div>
                </div>
              </div>

              <button type="button" className={`sg-btn-primary ${loading ? 'fp-btn-loading' : ''}`} onClick={goNext} disabled={loading}>
                {loading ? <><span className="fp-spinner" /> Sending Code…</> : <>Continue <IconArrowRight /></>}
              </button>

              {error && <div className="sg-error-msg" role="alert">{error}</div>}

              <div className="sg-divider">
                <div className="sg-divider-line" />
                <span>or sign up with</span>
                <div className="sg-divider-line" />
              </div>

              <div className="sg-social">
                <button type="button" className="sg-social-btn">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>
                <button type="button" className="sg-social-btn">
                  <svg viewBox="0 0 24 24" fill="#1877F2" width="18" height="18">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </button>
                <button type="button" className="sg-social-btn">
                  <svg viewBox="0 0 814 1000" fill="currentColor" width="16" height="18">
                    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-167.5-127.5c-66-96.7-120.5-251.7-120.5-399.5 0-237.9 155.9-364.2 309.3-364.2 79.2 0 145.5 52.4 195.5 52.4 48 0 123.9-55.4 214.7-55.4zm-105.4-187.6c39.5-47.5 66.7-112.7 66.7-177.9 0-9-.6-18.1-2.1-25.5-63.5 2.4-139.4 42.5-185.2 95.8-36 40.5-68.4 106.8-68.4 172.8 0 9.7 1.5 19.4 2.1 22.4 3.5.6 9.1 1.3 14.7 1.3 57 0 127.5-38.6 172.2-88.9z"/>
                  </svg>
                  Apple
                </button>
              </div>

              <div className="sg-form-footer">
                Already have an account? <Link to="/login">Sign in</Link>
              </div>
            </div>
          )}

          {/* ── Step 2: Email OTP ── */}
          {step === 2 && (
            <form className={`sg-step-panel fp-panel ${direction === 'back' ? 'prev' : ''}`} onSubmit={handleOtpSubmit}>
              <div className="sg-field">
                <label>6-Digit Verification Code</label>
                <div className="fp-otp-row" onPaste={handleDigitPaste}>
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={el => inputRefs.current[i] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      className="fp-otp-box"
                      onChange={e => handleDigitChange(i, e.target.value)}
                      onKeyDown={e => handleDigitKeyDown(i, e)}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>
              </div>

              {otpError && <p className="fp-error-text" style={{ marginBottom: '8px' }}>{otpError}</p>}

              <button type="submit" className={`sg-btn-primary ${otpLoading ? 'fp-btn-loading' : ''}`} disabled={otpLoading}>
                {otpLoading ? <><span className="fp-spinner" /> Verifying…</> : <>Verify Email <IconArrowRight /></>}
              </button>

              <button type="button" className="sg-btn-secondary" onClick={goBack}>
                ← Back
              </button>

              <div className="sg-form-footer">
                Already have an account? <Link to="/login">Sign in</Link>
              </div>
            </form>
          )}

          {/* ── Step 3 ── */}
          {step === 3 && (
            <form className={`sg-step-panel ${direction === 'back' ? 'prev' : ''}`} onSubmit={handleSubmit}>
              <p className="sg-section-label">Travel Style</p>
              <div className="sg-style-grid">
                {TRAVEL_STYLES.map(({ value, emoji }) => (
                  <label key={value} className="sg-style-card">
                    <input type="radio" name="travelStyle" value={value}
                      checked={formData.travelStyle === value} onChange={handleChange} />
                    <div className="sg-style-face">
                      <span className="sg-style-emoji">{emoji}</span>
                      <span className="sg-style-name">{value}</span>
                    </div>
                  </label>
                ))}
              </div>

              <p className="sg-section-label">
                Interests{' '}
                <span style={{ color: '#94A3B8', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                  (pick as many as you like)
                </span>
              </p>
              <div className="sg-interests">
                {INTEREST_OPTIONS.map(interest => (
                  <label key={interest} className="sg-chip">
                    <input type="checkbox" checked={formData.interests.includes(interest)}
                      onChange={() => toggleInterest(interest)} />
                    <span className="sg-chip-label">{interest}</span>
                  </label>
                ))}
              </div>

              <p className="sg-section-label">Currency</p>
              <div className="sg-interests" style={{ gap: '8px' }}>
                {[{code:'LKR',label:'LKR (Rs)'},{code:'USD',label:'USD ($)'},{code:'EUR',label:'EUR (€)'}].map(({code,label}) => (
                  <label key={code} className="sg-chip">
                    <input
                      type="radio"
                      name="currency"
                      value={code}
                      checked={formData.currency === code}
                      onChange={handleChange}
                    />
                    <span className="sg-chip-label">{label}</span>
                  </label>
                ))}
              </div>

              <label className="sg-terms">
                <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} />
                <span>
                  I agree to the <a href="#terms">Terms &amp; Conditions</a> and{' '}
                  <a href="#privacy">Privacy Policy</a>
                </span>
              </label>

              {error && (
                <div className="sg-error-msg" role="alert">
                  {error}
                </div>
              )}

              <button type="submit" className="sg-btn-primary" disabled={loading}>
                {loading ? 'Creating Account…' : <><>Create Account</> <IconCheck /></>}
              </button>
              <button type="button" className="sg-btn-secondary" onClick={() => { setDirection('back'); setStep(2) }}>
                ← Back
              </button>

              <div className="sg-form-footer">
                Already have an account? <Link to="/login">Sign in</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default Signup
