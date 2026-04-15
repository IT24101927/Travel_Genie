import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
const MapSection = lazy(() => import('./MapSection'))
import placeholderImg from '../../assets/placeholder.svg'
import { clearUserData } from '../../utils/clearUserData'
import { API_BASE, API_BASE_URL } from '../../config/api'

/* ── Convert relative image paths from the backend to absolute URLs ── */
function toAbsUrl(value) {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  const base = API_BASE_URL.replace(/\/+$/, '')
  const path = value.startsWith('/') ? value : `/${value}`
  return `${base}${path}`
}

/* ── Skeleton loader placeholder ── */
function SkeletonCard({ height = 340, className = '' }) {
  return <div className={`skeleton-card ${className}`} style={{ minHeight: height }} />
}

/* ── Animated counter hook ── */
function useCountUp(end, duration = 2000) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const counted = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true
          let start = 0
          const step = end / (duration / 16)
          const timer = setInterval(() => {
            start += step
            if (start >= end) { setCount(end); clearInterval(timer) }
            else setCount(Math.floor(start))
          }, 16)
        }
      },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [end, duration])

  return [count, ref]
}

/* ── Scroll reveal hook ── */
function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed')
        }
      },
      { threshold: 0.15 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return ref
}

/* ── Mouse-tilt card ── */
function TiltCard({ children, className }) {
  const ref = useRef(null)
  const handleMove = (e) => {
    const rect = ref.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -12
    ref.current.style.transform = `perspective(800px) rotateY(${x}deg) rotateX(${y}deg) scale(1.02)`
  }
  const handleLeave = () => {
    ref.current.style.transform = 'perspective(800px) rotateY(0) rotateX(0) scale(1)'
  }
  return (
    <div ref={ref} className={className} onMouseMove={handleMove} onMouseLeave={handleLeave}>
      {children}
    </div>
  )
}

function Home({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const token = localStorage.getItem('token')
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}')
  const isLoggedIn = !!token
  const dashPath = currentUser.role === 'admin' ? '/admin' : '/dashboard'

  /* ── Live data from DB ── */
  const [destinations, setDestinations] = useState([])
  const [hotels, setHotels] = useState([])
  const [reviews, setReviews] = useState([])
  const [destTotal, setDestTotal] = useState(50)
  const [hotelTotal, setHotelTotal] = useState(30)
  const [reviewTotal, setReviewTotal] = useState(500)

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/destinations?limit=8`).then(r => r.json()).catch(() => ({})),
      fetch(`${API_BASE}/hotels?limit=3`).then(r => r.json()).catch(() => ({})),
      fetch(`${API_BASE}/reviews?limit=6`).then(r => r.json()).catch(() => ({})),
    ]).then(([destData, hotelData, reviewData]) => {
      if (Array.isArray(destData.data))   { setDestinations(destData.data);  setDestTotal(destData.total   || destData.data.length) }
      if (Array.isArray(hotelData.data))  { setHotels(hotelData.data);       setHotelTotal(hotelData.total || hotelData.data.length) }
      if (Array.isArray(reviewData.data)) { setReviews(reviewData.data);     setReviewTotal(reviewData.total || reviewData.data.length) }
    })
  }, [])

  /* ── Image helpers ── */
  const getDestImage  = (d) => toAbsUrl(d.image_url || d.images?.[0]?.image_url || '') || placeholderImg
  const getHotelImage = (h) => toAbsUrl(h.place?.image_url || h.place?.images?.[0]?.image_url || h.image_url || '') || placeholderImg
  const starBar = (n) => '★'.repeat(Math.min(5, Math.max(1, Math.round(n || 1))))

  const handleSignOut = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    clearUserData()
    navigate('/')
  }

  /* ── Hero search state ── */
  const [searchQ, setSearchQ]         = useState('')
  const [searchDate, setSearchDate]   = useState('')
  const [searchGuests, setSearchGuests] = useState('1')

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (searchQ.trim())    params.set('q',      searchQ.trim())
    if (searchDate)        params.set('date',   searchDate)
    if (searchGuests)      params.set('guests', searchGuests)
    navigate(`/tours?${params.toString()}`)
  }

  /* Navbar scroll listener */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Scroll-reveal refs */
  const revDest    = useReveal()
  const revFeat    = useReveal()
  const revHotel   = useReveal()
  const revTest    = useReveal()
  const revPlatform = useReveal()
  const revNews    = useReveal()

  /* Animated counters */
  const [destCount, destRef]    = useCountUp(destTotal)
  const [hotelCount, hotelRef]  = useCountUp(hotelTotal)
  const [revCount, revRef]      = useCountUp(reviewTotal)
  const [districtCount, districtRef] = useCountUp(25)

  const features = [
    { icon: '🏛️', title: 'Cultural Heritage',   description: 'Explore UNESCO World Heritage Sites, ancient kingdoms, and sacred temples across the island.' },
    { icon: '🏖️', title: 'Tropical Beaches',    description: 'Pristine golden coastlines, turquoise waters, and world-class surfing in the south and east.' },
    { icon: '🐘', title: 'Wildlife Safari',      description: 'Spot leopards in Yala, elephants in Udawalawe, and rare birds in Sinharaja rainforest.' },
    { icon: '🍵', title: 'Tea Country',          description: 'Wander through misty highland tea estates and taste the finest Ceylon tea at its source.' },
    { icon: '🌶️', title: 'Spice & Cuisine',     description: 'Savor authentic rice & curry, hoppers, and explore cinnamon and spice gardens.' },
    { icon: '🧘', title: 'Ayurveda & Wellness',  description: 'Rejuvenate with traditional Ayurvedic treatments, yoga retreats, and healing rituals.' },
  ]

  return (
    <>
      {/* ── Floating Glass Particles ── */}
      <div className="particles" aria-hidden>
        {[...Array(6)].map((_, i) => <span key={i} className="particle" />)}
      </div>

      {/* ── Navigation ── */}
      <nav className={`navbar glass-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <Link to={isLoggedIn ? dashPath : '/'} className="logo">Travel<span>Genie</span></Link>

          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <span className={`hamburger ${menuOpen ? 'open' : ''}`} />
          </button>

          <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
            <li><a href="#home">Home</a></li>
            <li><a href="#destinations">Destinations</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href="#hotels">Hotels</a></li>
            <li><a href="#map">Map</a></li>
            <li><a href="#reviews">Reviews</a></li>
            <li><Link to="/plan-trip-landing">Plan a Trip</Link></li>
            <li className="nav-auth-mobile">
              {isLoggedIn ? (
                <>
                  <Link to={dashPath} className="btn-nav-login" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                  <button className="btn-nav-cta" onClick={() => { handleSignOut(); setMenuOpen(false) }}>Sign Out</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-nav-login" onClick={() => setMenuOpen(false)}>Log In</Link>
                  <Link to="/signup" className="btn-nav-cta" onClick={() => setMenuOpen(false)}>Sign Up</Link>
                </>
              )}
            </li>
          </ul>

          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'light' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            )}
          </button>

          <div className="auth-buttons">
            {isLoggedIn ? (
              <>
                <Link to={dashPath} className="btn-nav-login">Dashboard</Link>
                <button className="btn-nav-cta" onClick={handleSignOut}>Sign Out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-nav-login">Log In</Link>
                <Link to="/signup" className="btn-nav-cta">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="app">
      {/* ── Hero ── */}
      <section className="hero" id="home">
        <div className="hero-bg" />
        <div className="hero-overlay" />

        <div className="hero-content">
          <p className="hero-tag">🌴 Welcome to the Pearl of the Indian Ocean</p>
          <h1 className="hero-title">
            Discover<br /><span className="gradient-text">Sri Lanka</span>
          </h1>
          <p className="hero-description">
            Plan complete Sri Lanka trips with one platform: choose districts,
            discover places, pick hotels, set budgets, and track expenses.
          </p>
          <div className="hero-buttons">
            <button className="btn-primary glow" onClick={() => navigate('/tours')}>Browse Destinations</button>
            <button className="btn-outline-light" onClick={() => navigate('/plan-trip-landing')}>Plan a Trip</button>
          </div>

          {/* Glass search bar */}
          <div className="hero-search glass-card">
            <div className="search-field">
              <label>Place or District</label>
              <input
                type="text"
                placeholder="Search Sri Lanka places"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="search-field">
              <label>Date</label>
              <input type="date" value={searchDate} onChange={e => setSearchDate(e.target.value)} />
            </div>
            <div className="search-field">
              <label>Guests</label>
              <select value={searchGuests} onChange={e => setSearchGuests(e.target.value)}>
                <option value="1">1 Guest</option>
                <option value="2">2 Guests</option>
                <option value="3">3 Guests</option>
                <option value="4">4+ Guests</option>
              </select>
            </div>
            <button className="btn-primary search-btn" onClick={handleSearch}>Find Places</button>
          </div>
        </div>
      </section>

      {/* ── Stats Counter ── */}
      <section className="stats-section">
        <div className="container stats-grid">
          <div className="stat-item glass-card" ref={destRef}>
            <h3>{destCount}+</h3><p>Destinations</p>
          </div>
          <div className="stat-item glass-card" ref={hotelRef}>
            <h3>{hotelCount}+</h3><p>Hotels</p>
          </div>
          <div className="stat-item glass-card" ref={revRef}>
            <h3>{revCount}+</h3><p>Reviews</p>
          </div>
          <div className="stat-item glass-card" ref={districtRef}>
            <h3>{districtCount}</h3><p>Districts Covered</p>
          </div>
        </div>
      </section>

      {/* ── Why Sri Lanka Features ── */}
      <section className="features-section reveal-section" id="features" ref={revFeat}>
        <div className="container">
          <div className="section-header">
            <span className="section-subtitle">Why Sri Lanka</span>
            <h2 className="section-title">Unforgettable <span className="gradient-text">Experiences Await</span></h2>
          </div>
          <div className="features-grid">
            {features.map((f, i) => (
              <div className="feature-card glass-card" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="feature-icon-wrap">
                  <span className="feature-icon">{f.icon}</span>
                </div>
                <h3>{f.title}</h3>
                <p>{f.description}</p>
                <div className="feature-glow" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform Features (what you unlock by signing in) ── */}
      <section className="platform-section reveal-section" ref={revPlatform}>
        <div className="container">
          <div className="section-header">
            <span className="section-subtitle">Everything in One Place</span>
            <h2 className="section-title">What You Can Do <span className="gradient-text">After Sign Up</span></h2>
          </div>
          <div className="platform-grid">
            <div className="platform-card glass-card">
              <div className="platform-icon">🗺️</div>
              <h3>6-Step Trip Planner</h3>
              <p>Follow a guided flow from district selection to trip confirmation with your places, hotels, and budget in one itinerary.</p>
              <span className="platform-tag">Structured Planning</span>
            </div>
            <div className="platform-card glass-card">
              <div className="platform-icon">🧠</div>
              <h3>AI Recommendations</h3>
              <p>Get personalised place, hotel, and budget guidance using your preferences, district context, and live platform data.</p>
              <span className="platform-tag">AI Assisted</span>
            </div>
            <div className="platform-card glass-card">
              <div className="platform-icon">📋</div>
              <h3>Trip Management</h3>
              <p>Save and update multiple itineraries, manage notes and dates, and keep all selected places and hotels tied to each trip.</p>
              <span className="platform-tag">Organised</span>
            </div>
            <div className="platform-card glass-card">
              <div className="platform-icon">💸</div>
              <h3>Expense Tracker</h3>
              <p>Log estimated and actual expenses by category and compare spending against trip budgets with notification support.</p>
              <span className="platform-tag">Budget Smart</span>
            </div>
            <div className="platform-card glass-card">
              <div className="platform-icon">🏨</div>
              <h3>Hotel Selection</h3>
              <p>Compare hotels by type, star class, and location, then add selected stays directly into your trip workflow.</p>
              <span className="platform-tag">Integrated Stays</span>
            </div>
            <div className="platform-card glass-card">
              <div className="platform-icon">⭐</div>
              <h3>Reviews & Feedback</h3>
              <p>Read and post reviews with ratings for places and hotels, helping future travelers make better planning decisions.</p>
              <span className="platform-tag">Community</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Top Destinations ── */}
      <section className="destinations-section reveal-section" id="destinations" ref={revDest}>
        <div className="container">
          <div className="section-header">
            <span className="section-subtitle">Explore the Island</span>
            <h2 className="section-title">Must-Visit <span className="gradient-text">Destinations</span></h2>
          </div>
          <div className="destinations-grid">
            {destinations.length === 0
              ? [...Array(8)].map((_, i) => (
                  <div className="destination-card" key={i}>
                    <SkeletonCard height="100%" />
                  </div>
                ))
              : destinations.map((dest, i) => (
                  <div className="destination-card" key={dest.place_id || i} style={{ animationDelay: `${i * 0.08}s` }}>
                    <img
                      src={getDestImage(dest)}
                      alt={dest.name}
                      loading="lazy"
                      onError={(e) => { e.target.onerror = null; e.target.src = placeholderImg }}
                    />
                    <div className="destination-overlay glass-overlay">
                      {dest.type && <span className="dest-tours">{dest.type}</span>}
                      <h3>{dest.name}</h3>
                      {dest.district?.name && (
                        <span className="dest-district">📍 {dest.district.name}{dest.district.province ? `, ${dest.district.province}` : ''}</span>
                      )}
                      {dest.rating > 0 && (
                        <span className="dest-rating">⭐ {Number(dest.rating).toFixed(1)}</span>
                      )}
                      <button className="btn-small" onClick={() => navigate('/login')}>Explore →</button>
                    </div>
                  </div>
                ))
            }
          </div>
          <div className="section-cta">
            <button className="btn-secondary" onClick={() => navigate('/tours')}>View All Destinations →</button>
          </div>
        </div>
      </section>

      {/* ── Featured Hotels ── */}
      <section className="packages-section reveal-section" id="hotels" ref={revHotel}>
        <div className="container">
          <div className="section-header">
            <span className="section-subtitle">Where to Stay</span>
            <h2 className="section-title">Featured <span className="gradient-text">Hotels</span></h2>
          </div>
          <div className="packages-grid">
            {hotels.length === 0
              ? [...Array(3)].map((_, i) => <SkeletonCard key={i} height={380} className="glass-card" style={{ borderRadius: 'var(--radius)' }} />)
              : hotels.map((hotel, i) => (
                  <TiltCard className="package-card glass-card" key={hotel.hotel_id || i}>
                    <div className="package-image">
                      <img
                        src={getHotelImage(hotel)}
                        alt={hotel.name}
                        loading="lazy"
                        onError={(e) => { e.target.onerror = null; e.target.src = placeholderImg }}
                      />
                      {hotel.price_per_night && (
                        <span className="package-price glass-badge">LKR {Number(hotel.price_per_night).toFixed(0)}/night</span>
                      )}
                      <span className="package-tag glass-badge">{hotel.hotel_type || 'Hotel'}</span>
                    </div>
                    <div className="package-content">
                      <div className="package-meta">
                        <span className="stars">{'★'.repeat(Math.min(5, Math.max(1, Math.round(hotel.rating || 4))))}</span>
                        <span className="package-duration">{'⭐'.repeat(hotel.star_class || 3)} {hotel.star_class || 3}-Star</span>
                      </div>
                      <h3>{hotel.name}</h3>
                      <p className="package-location">
                        📍 {hotel.place?.district?.name || '—'}
                        {hotel.place?.district?.province ? `, ${hotel.place.district.province}` : ''}
                      </p>
                      <p className="package-description">
                        {hotel.description
                          ? hotel.description.length > 120
                            ? `${hotel.description.slice(0, 120)}...`
                            : hotel.description
                          : 'A wonderful place to stay while exploring Sri Lanka.'}
                      </p>
                      <button className="btn-secondary" onClick={() => navigate('/login')}>View Details →</button>
                    </div>
                  </TiltCard>
                ))
            }
          </div>
           <div className="section-cta">
            <button className="btn-primary glow" onClick={() => navigate('/hotels')}>View All Hotels</button>
          </div>
        </div>
      </section>

      {/* ── Interactive Map ── */}
      <Suspense fallback={
        <section className="map-section" id="map">
          <div className="container">
            <div className="map-container glass-card">
              <div className="map-loading"><div className="loading-spinner" /><p>Loading map…</p></div>
            </div>
          </div>
        </section>
      }>
        <MapSection />
      </Suspense>

      {/* ── Guest Reviews ── */}
      <section className="testimonials-section reveal-section" id="reviews" ref={revTest}>
        <div className="container">
          <div className="section-header">
            <span className="section-subtitle">Traveler Stories</span>
            <h2 className="section-title">What Travelers <span className="gradient-text">Are Saying</span></h2>
          </div>
          <div className="testimonials-grid">
            {reviews.length === 0
              ? [...Array(3)].map((_, i) => <SkeletonCard key={i} height={200} className="glass-card" style={{ borderRadius: 'var(--radius)' }} />)
              : reviews.map((r, i) => (
                  <div className="testimonial-card glass-card" key={r.review_id || i}>
                    <div className="quote-icon">"</div>
                    <p className="testimonial-review">
                      {r.comment?.length > 220 ? `${r.comment.slice(0, 220)}...` : r.comment}
                    </p>
                    <div className="testimonial-author">
                      <div className="author-avatar">
                        {r.user?.name ? r.user.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div>
                        <h4>{r.user?.name || 'Anonymous'}</h4>
                        <span>{r.place?.name || 'Sri Lanka'}</span>
                      </div>
                    </div>
                    <div className="testimonial-stars">{starBar(r.rating)}</div>
                  </div>
                ))
            }
          </div>
        </div>
      </section>

      {/* ── Newsletter ── */}
      <section className="newsletter-section reveal-section" ref={revNews}>
        <div className="container">
          <div className="newsletter-glass glass-card">
            <h2>Get <span className="gradient-text">TravelGenie</span> Updates</h2>
            <p>Stay updated with new districts, destination highlights, and planning improvements across the platform.</p>
            <div className="newsletter-form">
              <input type="email" placeholder="Enter your email address" />
              <button className="btn-primary glow">Subscribe</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              <h3 className="footer-logo">Travel<span>Genie</span></h3>
              <p>Your trusted partner for discovering Sri Lanka's beauty — from ancient ruins and misty highlands to golden coast and vibrant wildlife.</p>
              <div className="social-icons">
                <a href="#facebook" aria-label="Facebook">📘</a>
                <a href="#twitter" aria-label="Twitter">🐦</a>
                <a href="#instagram" aria-label="Instagram">📷</a>
                <a href="#linkedin" aria-label="LinkedIn">💼</a>
              </div>
            </div>
            <div className="footer-col">
              <h4>Quick Links</h4>
              <ul>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/tours">Destinations</Link></li>
                <li><Link to="/hotels">Hotels</Link></li>
                <li><Link to="/plan-trip-landing">Plan a Trip</Link></li>
                <li><Link to="/login">Log In</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Platform</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#destinations">Top Destinations</a></li>
                <li><a href="#hotels">Featured Hotels</a></li>
                <li><a href="#reviews">Traveler Reviews</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Contact Us</h4>
              <p>📍 45 Galle Road, Colombo 03, Sri Lanka</p>
              <p>📧 hello@travelgenie.lk</p>
              <p>📞 +94 11 234 5678</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 TravelGenie. All Rights Reserved.</p>
          </div>
        </div>
      </footer>
      </div>
    </>
  )
}

export default Home
