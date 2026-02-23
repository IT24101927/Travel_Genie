import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import MapSection from './MapSection'
import placeholderImg from '../../assets/placeholder.svg'

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
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  /* Parallax + navbar scroll listener */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Scroll-reveal refs */
  const revPkg   = useReveal()
  const revFeat  = useReveal()
  const revDest  = useReveal()
  const revTest  = useReveal()
  const revNews  = useReveal()

  /* Animated counters */
  const [destCount, destRef]   = useCountUp(50)
  const [tourCount, tourRef]   = useCountUp(300)
  const [happyCount, happyRef] = useCountUp(8000)
  const [yearCount, yearRef]   = useCountUp(10)

  const destinations = [
    { name: 'Sigiriya',      tours: 12, image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Sigiriya.jpg/960px-Sigiriya.jpg' },
    { name: 'Ella',          tours: 15, image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/SL_Demodara_near_Ella_asv2020-01_img02.jpg/960px-SL_Demodara_near_Ella_asv2020-01_img02.jpg' },
    { name: 'Kandy',         tours: 10, image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Sri_Dalada_Maligawa.jpg/960px-Sri_Dalada_Maligawa.jpg' },
    { name: 'Mirissa',       tours: 14, image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Mirissa_Beach_Sri_Lanka.jpg/960px-Mirissa_Beach_Sri_Lanka.jpg' },
    { name: 'Galle',         tours: 11, image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/SL_Galle_Fort_asv2020-01_img24.jpg/960px-SL_Galle_Fort_asv2020-01_img24.jpg' },
    { name: 'Nuwara Eliya',  tours: 8,  image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Nuwara_Eliya.jpg/960px-Nuwara_Eliya.jpg' },
  ]

  const packages = [
    {
      title: 'Ancient Heritage Tour',
      location: 'Sigiriya & Kandy, Sri Lanka',
      price: 350, days: 5, reviews: 68,
      description: 'Climb the legendary Sigiriya Rock Fortress, explore the sacred Temple of the Tooth, and immerse yourself in centuries of rich history.',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Sigiriya.jpg/960px-Sigiriya.jpg',
    },
    {
      title: 'Southern Coast Escape',
      location: 'Galle & Mirissa, Sri Lanka',
      price: 280, days: 4, reviews: 54,
      description: 'Wander through the charming Galle Fort, spot blue whales in Mirissa, and relax on pristine golden beaches.',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/SL_Galle_Fort_asv2020-01_img24.jpg/960px-SL_Galle_Fort_asv2020-01_img24.jpg',
    },
    {
      title: 'Hill Country Express',
      location: 'Ella & Nuwara Eliya, Sri Lanka',
      price: 220, days: 3, reviews: 47,
      description: 'Ride the iconic blue train across the Nine Arch Bridge, hike through emerald tea plantations, and breathe in the cool misty highlands.',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/SL_Demodara_near_Ella_asv2020-01_img02.jpg/960px-SL_Demodara_near_Ella_asv2020-01_img02.jpg',
    },
  ]

  const features = [
    { icon: '🏛️', title: 'Cultural Heritage',     description: 'Explore UNESCO World Heritage Sites, ancient kingdoms, and sacred temples across the island.' },
    { icon: '🏖️', title: 'Tropical Beaches',      description: 'Pristine golden coastlines, turquoise waters, and world-class surfing in the south and east.' },
    { icon: '🐘', title: 'Wildlife Safari',        description: 'Spot leopards in Yala, elephants in Udawalawe, and rare birds in Sinharaja rainforest.' },
    { icon: '🍵', title: 'Tea Country',            description: 'Wander through misty highland tea estates and taste the finest Ceylon tea at its source.' },
    { icon: '🌶️', title: 'Spice & Cuisine',       description: 'Savor authentic rice & curry, hoppers, and explore cinnamon and spice gardens.' },
    { icon: '🧘', title: 'Ayurveda & Wellness',    description: 'Rejuvenate with traditional Ayurvedic treatments, yoga retreats, and healing rituals.' },
  ]

  const testimonials = [
    { name: 'David & Laura',      role: 'Honeymooners from UK',     review: 'Sri Lanka exceeded every expectation. TravelGenie arranged the perfect route from Sigiriya to the southern beaches — absolutely magical!', rating: 5 },
    { name: 'Akiko Tanaka',       role: 'Solo Traveler from Japan', review: 'The train ride through hill country was a dream. TravelGenie\'s local guides made me feel safe and showed me hidden gems no tourist knows about.', rating: 5 },
    { name: 'Marcus Hofmann',     role: 'Family Trip from Germany', review: 'Our kids loved the elephant safari and the beach. Everything was perfectly organized — transfers, hotels, and even surprise experiences. Highly recommend!', rating: 5 },
  ]

  return (
    <div className="app">

      {/* ── Floating Glass Particles ── */}
      <div className="particles" aria-hidden>
        {[...Array(6)].map((_, i) => <span key={i} className="particle" />)}
      </div>

      {/* ── Navigation ── */}
      <nav className={`navbar glass-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <Link to="/" className="logo">Travel<span>Genie</span></Link>

          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <span className={`hamburger ${menuOpen ? 'open' : ''}`} />
          </button>

          <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
            <li><a href="#home">Home</a></li>
            <li><a href="#packages">Packages</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href="#destinations">Destinations</a></li>
            <li><a href="#map">Map</a></li>
            <li><a href="#reviews">Reviews</a></li>
          </ul>

          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          <div className="auth-buttons">
            <Link to="/login" className="btn-nav-login">Log In</Link>
            <Link to="/signup" className="btn-nav-cta">Sign Up</Link>
          </div>
        </div>
      </nav>

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
            Ancient ruins, misty tea hills, golden beaches, and rich wildlife — 
            experience the magic of Sri Lanka with expertly curated tour packages.
          </p>
          <div className="hero-buttons">
            <button className="btn-primary glow">View All Tours</button>
            <button className="btn-outline-light">▶ Watch Video</button>
          </div>

          {/* Glass search bar */}
          <div className="hero-search glass-card">
            <div className="search-field">
              <label>Destination</label>
              <input type="text" placeholder="Where to?" />
            </div>
            <div className="search-field">
              <label>Date</label>
              <input type="date" />
            </div>
            <div className="search-field">
              <label>Guests</label>
              <select>
                <option>1 Guest</option>
                <option>2 Guests</option>
                <option>3 Guests</option>
                <option>4+ Guests</option>
              </select>
            </div>
            <button className="btn-primary search-btn">Search</button>
          </div>
        </div>
      </section>

      {/* ── Stats Counter ── */}
      <section className="stats-section">
        <div className="container stats-grid">
          <div className="stat-item glass-card" ref={destRef}>
            <h3>{destCount}+</h3><p>Destinations</p>
          </div>
          <div className="stat-item glass-card" ref={tourRef}>
            <h3>{tourCount}+</h3><p>Tours Completed</p>
          </div>
          <div className="stat-item glass-card" ref={happyRef}>
            <h3>{happyCount.toLocaleString()}+</h3><p>Happy Travelers</p>
          </div>
          <div className="stat-item glass-card" ref={yearRef}>
            <h3>{yearCount}+</h3><p>Years Experience</p>
          </div>
        </div>
      </section>

      {/* ── Packages ── */}
      <section className="packages-section reveal-section" id="packages" ref={revPkg}>
        <div className="container">
          <div className="section-header">
            <span className="section-subtitle">Curated Experiences</span>
            <h2 className="section-title">Popular <span className="gradient-text">Sri Lanka Tours</span></h2>
          </div>
          <div className="packages-grid">
            {packages.map((pkg, i) => (
              <TiltCard className="package-card glass-card" key={i}>
                <div className="package-image">
                  <img
                    src={pkg.image}
                    alt={pkg.title}
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = placeholderImg;
                    }}
                  />
                  <span className="package-price glass-badge">${pkg.price}</span>
                  <span className="package-tag glass-badge">Popular</span>
                </div>
                <div className="package-content">
                  <div className="package-meta">
                    <span className="stars">{'★'.repeat(5)}</span>
                    <span className="package-duration">🕒 {pkg.days} days</span>
                  </div>
                  <h3>{pkg.title}</h3>
                  <p className="package-location">📍 {pkg.location}</p>
                  <p className="package-description">{pkg.description}</p>
                  <button className="btn-secondary">View Details →</button>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
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

      {/* ── Destinations ── */}
      <section className="destinations-section reveal-section" id="destinations" ref={revDest}>
        <div className="container">
          <div className="section-header">
            <span className="section-subtitle">Explore the Island</span>
            <h2 className="section-title">Must-Visit <span className="gradient-text">Destinations</span></h2>
          </div>
          <div className="destinations-grid">
            {destinations.map((dest, i) => (
              <div className="destination-card" key={i} style={{ animationDelay: `${i * 0.08}s` }}>
                <img 
                  src={dest.image} 
                  alt={dest.name} 
                  loading="lazy" 
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.src = placeholderImg;
                  }} 
                />
                <div className="destination-overlay glass-overlay">
                  <span className="dest-tours">{dest.tours} Tours</span>
                  <h3>{dest.name}</h3>
                  <button className="btn-small">Explore →</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interactive Map ── */}
      <MapSection />

      {/* ── Testimonials ── */}
      <section className="testimonials-section reveal-section" id="reviews" ref={revTest}>
        <div className="container">
          <div className="section-header">
            <span className="section-subtitle">Traveler Stories</span>
            <h2 className="section-title">What Our Guests <span className="gradient-text">Are Saying</span></h2>
          </div>
          <div className="testimonials-grid">
            {testimonials.map((t, i) => (
              <div className="testimonial-card glass-card" key={i}>
                <div className="quote-icon">"</div>
                <p className="testimonial-review">{t.review}</p>
                <div className="testimonial-author">
                  <div className="author-avatar">{t.name.charAt(0)}</div>
                  <div>
                    <h4>{t.name}</h4>
                    <span>{t.role}</span>
                  </div>
                </div>
                <div className="testimonial-stars">{'★'.repeat(t.rating)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Newsletter ── */}
      <section className="newsletter-section reveal-section" ref={revNews}>
        <div className="container">
          <div className="newsletter-glass glass-card">
            <h2>Get <span className="gradient-text">Sri Lanka</span> Travel Updates</h2>
            <p>Receive exclusive deals, seasonal guides, and hidden gem recommendations for Sri Lanka</p>
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
                <li><a href="#about">About Us</a></li>
                <li><a href="#contact">Contact</a></li>
                <li><a href="#blog">Blog</a></li>
                <li><a href="#faq">FAQs</a></li>
                <li><a href="#careers">Careers</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Explore</h4>
              <ul>
                <li><a href="#account">Account</a></li>
                <li><a href="#privacy">Privacy Policy</a></li>
                <li><a href="#affiliate">Affiliate Program</a></li>
                <li><a href="#partners">Our Partners</a></li>
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
  )
}

export default Home
