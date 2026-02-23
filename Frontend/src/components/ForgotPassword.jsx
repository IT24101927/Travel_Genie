import { useState } from 'react'
import { Link } from 'react-router-dom'
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
const IconCheckCircle = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22,4 12,14.01 9,11.01"/>
  </svg>
)

function ForgotPassword({ theme, toggleTheme }) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
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
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        <div className="lg-form-container">
          {!submitted ? (
            /* ── Request Form ── */
            <div className="fp-panel">
              <div className="lg-form-header">
                <h2>Forgot Password?</h2>
                <p>Enter the email linked to your account and we'll send you a reset link.</p>
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

                <button
                  type="submit"
                  className={`lg-btn-primary ${loading ? 'fp-btn-loading' : ''}`}
                  disabled={loading}
                >
                  {loading
                    ? <><span className="fp-spinner" /> Sending…</>
                    : <> Send Reset Link <IconArrowRight /></>
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
            /* ── Success State ── */
            <div className="fp-success-panel">
              <div className="fp-success-icon">
                <IconCheckCircle />
              </div>
              <h2>Check Your Email</h2>
              <p>
                We've sent a password reset link to<br />
                <strong>{email}</strong>
              </p>
              <p className="fp-hint">
                Didn't receive it? Check your spam folder or{' '}
                <button className="fp-resend-btn" onClick={() => setSubmitted(false)}>
                  try again
                </button>
                .
              </p>

              <Link to="/login" className="lg-btn-primary fp-back-btn">
                <IconArrowLeft /> Back to Sign In
              </Link>

              <div className="lg-form-footer" style={{ marginTop: '24px' }}>
                Need help? <a href="mailto:support@travelgenie.lk">Contact Support</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
