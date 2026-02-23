import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Login.css'
import './ForgotPassword.css'

/* ── SVG Icons ── */
const IconCompass = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88 16.24,7.76"/>
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
const IconArrowLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12,19 5,12 12,5"/>
  </svg>
)
const IconCheckCircle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22,4 12,14.01 9,11.01"/>
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

function ResetPassword({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const [password, setPassword]         = useState('')
  const [confirm, setConfirm]           = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [done, setDone]                 = useState(false)
  const [loading, setLoading]           = useState(false)

  const strength = getStrength(password)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (password !== confirm) {
      alert("Passwords don't match!")
      return
    }
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      setLoading(false)
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    }, 1200)
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
            Almost There
          </div>

          <h1>
            Create a<br />
            <em>New Password</em>
          </h1>
          <p>
            Choose a strong password to keep your TravelGenie account safe and secure.
          </p>

          <div className="lg-stats">
            <div className="lg-stat">
              <span className="lg-stat-num">256<span>-bit</span></span>
              <span className="lg-stat-label">Encrypted</span>
            </div>
            <div className="lg-stat">
              <span className="lg-stat-num">100<span>%</span></span>
              <span className="lg-stat-label">Secure</span>
            </div>
            <div className="lg-stat">
              <span className="lg-stat-num">0<span>s</span></span>
              <span className="lg-stat-label">Downtime</span>
            </div>
          </div>
        </div>

        <div className="lg-testimonial">
          <div className="lg-testimonial-quote">"</div>
          <blockquote>
            Super smooth reset experience. Back exploring Sri Lanka's hidden gems within minutes!
          </blockquote>
          <div className="lg-testimonial-author">
            <div className="lg-avatar">N</div>
            <div className="lg-author-info">
              <strong>Nimal Fernando</strong>
              <span>Galle, Sri Lanka</span>
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
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        <div className="lg-form-container">
          {!done ? (
            <div className="fp-panel">
              <div className="lg-form-header">
                <h2>Set New Password</h2>
                <p>Your new password must be at least 8 characters and include uppercase, numbers and symbols.</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="lg-field">
                  <label htmlFor="password">New Password</label>
                  <div className="lg-input-wrap">
                    <span className="lg-input-icon"><IconLock /></span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      placeholder="Create new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoFocus
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
                  {password && (
                    <div className="fp-strength">
                      {[1, 2, 3, 4].map(n => (
                        <div key={n} className={`fp-strength-bar ${n <= strength.level ? `active-${strength.cls}` : ''}`} />
                      ))}
                      <span className={`fp-strength-label ${strength.cls}`}>{strength.label}</span>
                    </div>
                  )}
                </div>

                <div className="lg-field">
                  <label htmlFor="confirm">Confirm Password</label>
                  <div className={`lg-input-wrap ${confirm && confirm !== password ? 'fp-input-error' : ''}`}>
                    <span className="lg-input-icon"><IconLock /></span>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      id="confirm"
                      placeholder="Repeat new password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="lg-eye-btn"
                      onClick={() => setShowConfirm(p => !p)}
                      aria-label="Toggle confirm password"
                    >
                      {showConfirm ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </div>
                  {confirm && confirm !== password && (
                    <p className="fp-error-text">Passwords do not match</p>
                  )}
                </div>

                <button
                  type="submit"
                  className={`lg-btn-primary ${loading ? 'fp-btn-loading' : ''}`}
                  disabled={loading}
                  style={{ marginTop: '8px' }}
                >
                  {loading
                    ? <><span className="fp-spinner" /> Updating…</>
                    : 'Reset Password'
                  }
                </button>
              </form>

              <div className="fp-back">
                <Link to="/login" className="fp-back-link">
                  <IconArrowLeft /> Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            /* ── Success State ── */
            <div className="fp-success-panel">
              <div className="fp-success-icon">
                <IconCheckCircle />
              </div>
              <h2>Password Updated!</h2>
              <p>Your password has been reset successfully.<br />Redirecting you to sign in…</p>
              <div className="fp-redirect-bar">
                <div className="fp-redirect-progress" />
              </div>
              <Link to="/login" className="lg-btn-primary fp-back-btn">
                <IconArrowLeft /> Go to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
