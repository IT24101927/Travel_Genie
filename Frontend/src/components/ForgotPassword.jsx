import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_BASE } from '../config/api'
import './Login.css'
import './ForgotPassword.css'

/* ── SVG Icons ── */
const IconCompass = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88 16.24,7.76"/>
  </svg>
)
const IconMail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <polyline points="2,4 12,13 22,4"/>
  </svg>
)
const IconArrowRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12,5 19,12 12,19"/>
  </svg>
)
const IconArrowLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12,19 5,12 12,5"/>
  </svg>
)
const IconStar = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
)

function ForgotPassword({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const [step, setStep]       = useState(1)   // 1 = email, 2 = OTP code
  const [email, setEmail]     = useState('')
  const [digits, setDigits]   = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const inputRefs = useRef([])

  /* ── Step 1: request code ── */
  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/users/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Request failed')
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /* ── Step 2: OTP digit handlers ── */
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

  const handleCodeSubmit = async (e) => {
    e.preventDefault()
    const code = digits.join('')
    if (code.length !== 6) { setError('Please enter the full 6-digit code'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/users/verify-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Invalid code')
      navigate('/reset-password', { state: { email, code } })
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
            Account Recovery
          </div>

          <h1>
            Reset your<br />
            <em>Password</em>
          </h1>
          <p>
            No worries — it happens to the best of us. We'll send you a secure link to get back on track in seconds.
          </p>

          <div className="lg-stats">
            <div className="lg-stat">
              <span className="lg-stat-num">60<span>s</span></span>
              <span className="lg-stat-label">Quick Reset</span>
            </div>
            <div className="lg-stat">
              <span className="lg-stat-num">256<span>-bit</span></span>
              <span className="lg-stat-label">Encrypted</span>
            </div>
            <div className="lg-stat">
              <span className="lg-stat-num">24<span>h</span></span>
              <span className="lg-stat-label">Link Valid</span>
            </div>
          </div>
        </div>

        <div className="lg-testimonial">
          <div className="lg-testimonial-quote">"</div>
          <blockquote>
            Got back into my account in under a minute. The reset process was smooth and hassle-free!
          </blockquote>
          <div className="lg-testimonial-author">
            <div className="lg-avatar">K</div>
            <div className="lg-author-info">
              <strong>Kavinda Silva</strong>
              <span>Kandy, Sri Lanka</span>
            </div>
            <div className="lg-stars">
              {[1,2,3,4,5].map(n => <IconStar key={n} />)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="lg-right">
        <button className="lg-theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'light' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          )}
        </button>

        <div className="lg-form-container">
          {step === 1 ? (
            /* ── Step 1: Email ── */
            <div className="fp-panel">
              <div className="lg-form-header">
                <h2>Forgot Password?</h2>
                <p>Enter the email linked to your account and we'll send you a 6-digit reset code.</p>
              </div>

              <form onSubmit={handleEmailSubmit}>
                <div className="lg-field">
                  <label htmlFor="email">Email Address</label>
                  <div className="lg-input-wrap">
                    <span className="lg-input-icon"><IconMail /></span>
                    <input
                      type="email"
                      id="email"
                      placeholder="jane@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError('') }}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {error && <p className="fp-error-text" style={{ marginBottom: '8px' }}>{error}</p>}

                <button
                  type="submit"
                  className={`lg-btn-primary ${loading ? 'fp-btn-loading' : ''}`}
                  disabled={loading}
                >
                  {loading
                    ? <><span className="fp-spinner" /> Sending…</>
                    : <> Send Reset Code <IconArrowRight /></>
                  }
                </button>
              </form>

              <div className="fp-back">
                <Link to="/login" className="fp-back-link">
                  <IconArrowLeft /> Back to Sign In
                </Link>
              </div>

              <div className="lg-form-footer">
                Don't have an account? <Link to="/signup">Sign up free</Link>
              </div>
            </div>
          ) : (
            /* ── Step 2: OTP Code ── */
            <div className="fp-panel">
              <div className="lg-form-header">
                <h2>Enter Reset Code</h2>
                <p>
                  We sent a 6-digit code to <strong>{email}</strong>.<br />
                  <span style={{ fontSize: '13px', color: 'var(--text-muted, #6b7280)' }}>Check your spam folder if you don't see it — or look in the server terminal if email isn't configured.</span>
                </p>
              </div>

              <form onSubmit={handleCodeSubmit}>
                <div className="lg-field">
                  <label>6-Digit Code</label>
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

                {error && <p className="fp-error-text" style={{ marginBottom: '8px' }}>{error}</p>}

                <button type="submit" className={`lg-btn-primary ${loading ? 'fp-btn-loading' : ''}`} disabled={loading}>
                  {loading
                    ? <><span className="fp-spinner" /> Verifying…</>
                    : <>Continue <IconArrowRight /></>
                  }
                </button>
              </form>

              <div className="fp-back">
                <button className="fp-back-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => { setStep(1); setDigits(['','','','','','']); setError('') }}>
                  <IconArrowLeft /> Change email
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
