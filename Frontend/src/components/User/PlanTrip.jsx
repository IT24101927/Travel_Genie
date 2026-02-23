import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './PlanTrip.css'

/* ──── Sri Lanka's 25 Districts ──── */
const SL_DISTRICTS = [
  // Western Province
  {
    id: 'd1',
    name: 'Colombo',
    province: 'Western',
    description: 'The vibrant commercial capital packed with colonial history, a modern skyline, lively markets and a buzzing food and nightlife scene.',
    highlights: ['Gangaramaya Temple', 'Galle Face Green', 'Pettah Market', 'National Museum'],
    bestFor: ['City life', 'Shopping', 'Culture', 'Dining'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Colombo_skyline.jpg/960px-Colombo_skyline.jpg',
  },
  {
    id: 'd2',
    name: 'Gampaha',
    province: 'Western',
    description: 'Home to lush wetlands and the internationally acclaimed Pinnawala Elephant Orphanage, just north of Colombo.',
    highlights: ['Pinnawala Elephant Orphanage', 'Attanagalla Rajamaha Viharaya', 'Bolgoda Lake', 'Henarathgoda Botanical Garden'],
    bestFor: ['Wildlife', 'Nature', 'Family'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Pinnawala_Elephant_Orphanage.jpg/960px-Pinnawala_Elephant_Orphanage.jpg',
  },
  {
    id: 'd3',
    name: 'Kalutara',
    province: 'Western',
    description: 'A coastal gem south of Colombo with golden beaches, the iconic Kalutara Bodhiya stupa, Bentota River and mangrove lagoons.',
    highlights: ['Kalutara Beach', 'Bodhiya Stupa', 'Bentota River', 'Richmond Castle'],
    bestFor: ['Beach', 'Water sports', 'Relaxation'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Kalutara_Bodhiya_at_dusk.jpg/960px-Kalutara_Bodhiya_at_dusk.jpg',
  },
  {
    id: 'd4',
    name: 'Kandy',
    province: 'Central',
    description: "Sri Lanka's cultural capital, home to the sacred Temple of the Tooth Relic, beautiful Kandy Lake and vibrant Kandyan dance performances.",
    highlights: ['Temple of the Tooth', 'Kandy Lake', 'Peradeniya Botanical Gardens', 'Esala Perahera'],
    bestFor: ['Culture', 'History', 'Nature'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Temple_of_the_tooth.jpg/960px-Temple_of_the_tooth.jpg',
  },
  {
    id: 'd5',
    name: 'Matale',
    province: 'Central',
    description: 'A spice-rich district dotted with aromatic spice gardens, the fascinating Nalanda Gedige ruins and ancient cave temples.',
    highlights: ['Nalanda Gedige', 'Spice Gardens', 'Aluvihara Rock Temple', 'Sigiriya (nearby)'],
    bestFor: ['History', 'Culture', 'Nature'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Sri_Lanka_Nalanda_Gedige.jpg/960px-Sri_Lanka_Nalanda_Gedige.jpg',
  },
  {
    id: 'd6',
    name: 'Nuwara Eliya',
    province: 'Central',
    description: "Sri Lanka's \"Little England\" — a misty hill station at 1,868 m surrounded by manicured tea estates, colonial bungalows and stunning waterfalls.",
    highlights: ['Tea Factories', "Horton Plains & World's End", 'Gregory Lake', 'Hakgala Botanical Garden'],
    bestFor: ['Tea trails', 'Hiking', 'Scenic views', 'Cool climate'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Nuwara_Eliya_tea_estate.jpg/960px-Nuwara_Eliya_tea_estate.jpg',
  },
  // Southern Province
  {
    id: 'd7',
    name: 'Galle',
    province: 'Southern',
    description: 'A UNESCO World Heritage fort city with cobblestone streets, Dutch colonial architecture, boutique hotels and panoramic ocean views.',
    highlights: ['Galle Fort', 'Dutch Reformed Church', 'Lighthouse', 'Jungle Beach'],
    bestFor: ['History', 'Beach', 'Culture', 'Architecture'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/SL_Galle_Fort_asv2020-01_img24.jpg/960px-SL_Galle_Fort_asv2020-01_img24.jpg',
  },
  {
    id: 'd8',
    name: 'Matara',
    province: 'Southern',
    description: 'A laid-back southern district with pristine beaches, the historic Star Fort, the Paravi Duwa temple island and world-class surfing at Mirissa.',
    highlights: ['Mirissa Beach', 'Star Fort', 'Paravi Duwa Temple', 'Dondra Head Lighthouse'],
    bestFor: ['Beach', 'Surfing', 'Whale watching', 'History'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Mirissa_Beach_Sri_Lanka.jpg/960px-Mirissa_Beach_Sri_Lanka.jpg',
  },
  {
    id: 'd9',
    name: 'Hambantota',
    province: 'Southern',
    description: 'A fast-developing southern district featuring Yala National Park — the highest leopard density on earth — plus Bundala Wetlands and pink flamingoes.',
    highlights: ['Yala National Park', 'Bundala National Park', 'Hambantota Port', 'Tissamaharama Raja Maha Vihara'],
    bestFor: ['Safari', 'Wildlife', 'Nature', 'Bird watching'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Yala_National_Park_%28Sri_Lanka_2012%29.jpg/960px-Yala_National_Park_%28Sri_Lanka_2012%29.jpg',
  },
  // Northern Province
  {
    id: 'd10',
    name: 'Jaffna',
    province: 'Northern',
    description: "The northern cultural heartland of Sri Lanka, famous for its unique Tamil heritage, ancient Hindu temples, island day trips and fresh seafood cuisine.",
    highlights: ['Jaffna Fort', 'Nainativu Island', 'Nallur Kandaswamy Temple', 'Jaffna Library'],
    bestFor: ['Culture', 'Heritage', 'Temples', 'Cuisine'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Jaffna_Fort_entrance.JPG/960px-Jaffna_Fort_entrance.JPG',
  },
  {
    id: 'd11',
    name: 'Kilinochchi',
    province: 'Northern',
    description: 'A resilient district rebuilding post-conflict, known for its fertile agricultural flatlands, the iconic Water Tower and the vast Iranamadu Tank.',
    highlights: ['Iranamadu Tank', 'War Memorial Water Tower', 'Kilinochchi Market', 'Pooneryn Fort'],
    bestFor: ['Cultural exploration', 'History', 'Off-the-beaten-path'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Kilinochchi_water_tower.JPG/960px-Kilinochchi_water_tower.JPG',
  },
  {
    id: 'd12',
    name: 'Mannar',
    province: 'Northern',
    description: "An island district connected by causeway, known for its ancient giant baobab trees, flamingo-filled sanctuaries and the mythical Adam's Bridge shoals.",
    highlights: ['Mannar Fort', 'Ancient Baobab Tree', "Adam's Bridge", "Giant's Tank Bird Sanctuary"],
    bestFor: ['Bird watching', 'History', 'Off-the-beaten-path', 'Nature'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Mannar_Fort.jpg/960px-Mannar_Fort.jpg',
  },
  {
    id: 'd13',
    name: 'Vavuniya',
    province: 'Northern',
    description: 'A historic gateway to the north dotted with ancient stupas, peaceful irrigation tanks and the Maithreepala Sirisena peace monument.',
    highlights: ['Maithreepala Monument', 'Ularapokuna Tank', 'Vavuniya Museum', 'Pavatkulam Tank'],
    bestFor: ['History', 'Peaceful getaway', 'Temples'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Vavuniya.JPG/960px-Vavuniya.JPG',
  },
  {
    id: 'd14',
    name: 'Mullaitivu',
    province: 'Northern',
    description: "A northern coastal district with unspoiled beaches, serene lagoons and dense mangrove forests — one of Sri Lanka's most pristine natural frontiers.",
    highlights: ['Nandikadal Lagoon', 'Chalai Beach', 'Mullaitivu Beach', 'Mangrove Forests'],
    bestFor: ['Nature', 'Off-the-beaten-path', 'Beach', 'Relaxation'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Mullaitivu_beach.jpg',
  },
  // Eastern Province
  {
    id: 'd15',
    name: 'Trincomalee',
    province: 'Eastern',
    description: "Home to one of the world's finest natural harbours — Trincomalee offers pristine beaches, whale-shark snorkelling and majestic ancient Hindu temples.",
    highlights: ['Uppuveli & Nilaveli Beach', 'Koneswaram Temple', 'Pigeon Island Marine NP', 'Whale watching'],
    bestFor: ['Beach', 'Diving', 'History', 'Whale watching'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Trincomalee_beach_Sri_Lanka.jpg/960px-Trincomalee_beach_Sri_Lanka.jpg',
  },
  {
    id: 'd16',
    name: 'Batticaloa',
    province: 'Eastern',
    description: 'The "Land of the Singing Fish" — a lagoon-laced coastal district with Dutch colonial forts, vibrant Tamil culture and the stunning Pasikudah Bay.',
    highlights: ['Batticaloa Fort', 'Kallady Bridge', 'Pasikudah Beach', 'Singing Fish Lagoon'],
    bestFor: ['Beach', 'Lagoons', 'Culture', 'History'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Pasikuda_Sri_Lanka.jpg/960px-Pasikuda_Sri_Lanka.jpg',
  },
  {
    id: 'd17',
    name: 'Ampara',
    province: 'Eastern',
    description: 'A diverse district encompassing the world-class Arugam Bay surf breaks, the ancient Deegavapi stupa and lush Lahugala elephant sanctuary.',
    highlights: ['Arugam Bay', 'Lahugala National Park', 'Deegavapi Stupa', 'Kumana National Park'],
    bestFor: ['Surfing', 'Wildlife', 'History', 'Adventure'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Arugam_Bay_surf.jpg/960px-Arugam_Bay_surf.jpg',
  },
  // North Western Province
  {
    id: 'd18',
    name: 'Kurunegala',
    province: 'North Western',
    description: 'The commercial hub of the North Western Province, surrounded by ancient reservoirs, cave temples and the bouldering Elephant Rock landmark.',
    highlights: ['Elephant Rock (Ethagala)', 'Ridi Vihara Temple', 'Kurunegala Lake', 'Aukana Buddha Statue'],
    bestFor: ['History', 'Temples', 'Nature', 'Day trips'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Kurunegala-rock.JPG/960px-Kurunegala-rock.JPG',
  },
  {
    id: 'd19',
    name: 'Puttalam',
    province: 'North Western',
    description: 'A coastal district famous for its shimmering salt flats, Wilpattu National Park — the largest national park in Sri Lanka — and the Kalpitiya kitesurfing strip.',
    highlights: ['Wilpattu National Park', 'Kalpitiya Peninsula', 'Salt Flats', 'Puttalam Lagoon'],
    bestFor: ['Wildlife', 'Kitesurfing', 'Nature', 'Safari'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Wilpattu_National_Park.jpg/960px-Wilpattu_National_Park.jpg',
  },
  // North Central Province
  {
    id: 'd20',
    name: 'Anuradhapura',
    province: 'North Central',
    description: "Sri Lanka's first ancient capital and a UNESCO World Heritage Site — a sacred city of colossal stupas, the Sri Maha Bodhi and royal palaces.",
    highlights: ['Sri Maha Bodhi', 'Ruwanwelisaya Stupa', 'Abhayagiri Monastery', 'Isurumuniya Vihara'],
    bestFor: ['History', 'Pilgrimage', 'Archaeology', 'Culture'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Anuradhapura_Ruwanwelisaya.jpg/960px-Anuradhapura_Ruwanwelisaya.jpg',
  },
  {
    id: 'd21',
    name: 'Polonnaruwa',
    province: 'North Central',
    description: "Sri Lanka's medieval capital — a UNESCO city of magnificent standing Buddha statues, royal baths and well-preserved ruins spread across a vast tropical plain.",
    highlights: ['Gal Vihara', 'Parakrama Samudra', 'Royal Palace Ruins', 'Vatadage'],
    bestFor: ['History', 'Cycling', 'Archaeology', 'Photography'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Polonnaruwa_Vatadage.jpg/960px-Polonnaruwa_Vatadage.jpg',
  },
  // Uva Province
  {
    id: 'd22',
    name: 'Badulla',
    province: 'Uva',
    description: "A stunning hill district home to Ella's iconic Nine Arch Bridge, the dramatic Rawana Falls, misty Ella Rock hiking and one of the world's most scenic train journeys.",
    highlights: ['Nine Arch Bridge (Ella)', 'Rawana Falls', 'Ella Rock Hike', 'Dunhinda Falls'],
    bestFor: ['Hiking', 'Scenic train', 'Adventure', 'Photography'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/SL_Demodara_near_Ella_asv2020-01_img02.jpg/960px-SL_Demodara_near_Ella_asv2020-01_img02.jpg',
  },
  {
    id: 'd23',
    name: 'Monaragala',
    province: 'Uva',
    description: 'An unspoiled province of forested highlands, the ancient colossal Maligawila Buddha statues, Buduruwagala rock carvings and the wide Wellawaya plains.',
    highlights: ['Maligawila Buddha Statue', 'Buduruwagala Rock Temple', 'Wellawaya Valley', 'Gal Oya NP'],
    bestFor: ['Off-the-beaten-path', 'History', 'Nature', 'Temples'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Maligawila_Vihara_Buddha_Statue.jpg/960px-Maligawila_Vihara_Buddha_Statue.jpg',
  },
  // Sabaragamuwa Province
  {
    id: 'd24',
    name: 'Ratnapura',
    province: 'Sabaragamuwa',
    description: "The \"City of Gems\" — Sri Lanka's gemstone capital set among lush rainforests, featuring the sacred Adam's Peak pilgrimage and the Sinharaja Biosphere Reserve.",
    highlights: ["Adam's Peak (Sri Pada)", 'Sinharaja Forest Reserve', 'Gemstone Mines', 'Ratnapura Gem Museum'],
    bestFor: ['Hiking', 'Nature', 'Gems', 'Pilgrimage'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Adams_peak2.jpg/960px-Adams_peak2.jpg',
  },
  {
    id: 'd25',
    name: 'Kegalle',
    province: 'Sabaragamuwa',
    description: 'A verdant hilly district famous for white-water rafting at Kitulgala, prehistoric Belilena Cave and the emerald Mawanella gem trade.',
    highlights: ['Kitulgala Rafting', 'Pinnawala (nearby)', 'Belilena Cave', 'Rambukkana'],
    bestFor: ['Adventure', 'Rafting', 'Nature', 'Wildlife'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Pinnawala_Elephant_Orphanage.jpg/960px-Pinnawala_Elephant_Orphanage.jpg',
  },
]

/* ──── Provinces for filtering ──── */
const PROVINCES = [
  { value: 'all',           label: 'All Provinces', emoji: '🇱🇰' },
  { value: 'Western',       label: 'Western',       emoji: '🏙️' },
  { value: 'Central',       label: 'Central',       emoji: '🌿' },
  { value: 'Southern',      label: 'Southern',      emoji: '🏖️' },
  { value: 'Northern',      label: 'Northern',      emoji: '🏛️' },
  { value: 'Eastern',       label: 'Eastern',       emoji: '🌊' },
  { value: 'North Western', label: 'NW Province',   emoji: '🌾' },
  { value: 'North Central', label: 'NC Province',   emoji: '⛩️' },
  { value: 'Uva',           label: 'Uva',           emoji: '🏔️' },
  { value: 'Sabaragamuwa',  label: 'Sabaragamuwa',  emoji: '💎' },
]

/* Province → CSS class mapping */
const PROVINCE_CLASS = {
  'Western':       'prov-western',
  'Central':       'prov-central',
  'Southern':      'prov-southern',
  'Northern':      'prov-northern',
  'Eastern':       'prov-eastern',
  'North Western': 'prov-northwest',
  'North Central': 'prov-northcentral',
  'Uva':           'prov-uva',
  'Sabaragamuwa':  'prov-sabaragamuwa',
}

/* ── District Card ── */
function DistrictCard({ district, onSelect }) {
  const [imgError, setImgError] = useState(false)
  const fallback = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600'

  return (
    <div className="pt-card">
      <div className="pt-card-img">
        <img
          src={imgError ? fallback : district.image}
          alt={`${district.name} District`}
          onError={() => setImgError(true)}
        />
        <span className={`pt-category-badge ${PROVINCE_CLASS[district.province] || ''}`}>
          {district.province} Province
        </span>
      </div>

      <div className="pt-card-body">
        <h3 className="pt-card-name">{district.name} District</h3>
        <p className="pt-card-desc">{district.description.slice(0, 115)}…</p>

        <p className="pt-highlights-label">Highlights</p>
        <div className="pt-activities">
          {district.highlights.slice(0, 3).map(h => (
            <span key={h} className="pt-activity-chip">{h}</span>
          ))}
        </div>

        <p className="pt-best-for">
          <span className="pt-best-for-icon">✦</span>
          {district.bestFor.join(' · ')}
        </p>

        <div className="pt-card-footer">
          <button className="pt-select-btn" onClick={() => onSelect(district)}>
            Explore
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

/* ── Main Component ── */
function PlanTrip({ theme, toggleTheme }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen]   = useState(false)
  const [search,   setSearch]     = useState('')
  const [province, setProvince]   = useState('all')

  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    navigate('/')
  }

  /* Filter districts */
  const filtered = SL_DISTRICTS.filter(d => {
    const matchProv   = province === 'all' || d.province === province
    const q           = search.toLowerCase()
    const matchSearch = !q ||
      d.name.toLowerCase().includes(q) ||
      d.province.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      d.highlights.some(h => h.toLowerCase().includes(q)) ||
      d.bestFor.some(b => b.toLowerCase().includes(q))
    return matchProv && matchSearch
  })

  const handleSelect = (district) => {
    localStorage.setItem('selectedDistrict', JSON.stringify(district))
    localStorage.removeItem('selectedHotel')
    navigate('/district-explore')
  }

  return (
    <div className="pt-page">
      {/* ── Nav ── */}
      <nav className="dashboard-nav glass-nav">
        <div className="nav-container">
          <Link to="/" className="logo">Travel<span>Genie</span></Link>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <span className={`hamburger ${menuOpen ? 'open' : ''}`} />
          </button>
          <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li><Link to="/plan-trip" className="active-link">Plan a Trip</Link></li>
            <li><Link to="/profile">Profile</Link></li>
          </ul>
          <div className="nav-actions">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button className="btn-logout" onClick={handleLogout}>Log Out</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-hero">
        <div className="pt-hero-inner">
          <p className="pt-eyebrow">🇱🇰 Explore Sri Lanka</p>
          <h1>Choose your <em>district</em></h1>
          <p className="pt-hero-sub">
            Sri Lanka has 25 districts across 9 provinces — each with its own character, landscapes and experiences. Pick yours to start building your perfect trip.
          </p>
          <div className="pt-search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pt-search-icon">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              className="pt-search"
              placeholder="Search districts, highlights, activities…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button className="pt-search-clear" onClick={() => setSearch('')} aria-label="Clear">✕</button>
            )}
          </div>
        </div>
      </section>

      <div className="pt-content">
        {/* ── Province Filter Pills ── */}
        <div className="pt-filters">
          <div className="pt-category-pills">
            {PROVINCES.map(p => (
              <button
                key={p.value}
                className={`pt-pill ${province === p.value ? 'active' : ''}`}
                onClick={() => setProvince(p.value)}
              >
                {p.emoji} {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Status bar ── */}
        <div className="pt-status-bar">
          <span className="pt-status-text">
            {filtered.length} district{filtered.length !== 1 ? 's' : ''} found
          </span>
        </div>

        {/* ── District Grid ── */}
        {filtered.length === 0 ? (
          <div className="pt-empty">
            <span className="pt-empty-icon">🔍</span>
            <h3>No districts found</h3>
            <p>Try a different search term or province</p>
            <button className="pt-clear-btn" onClick={() => { setSearch(''); setProvince('all') }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="pt-grid">
            {filtered.map(district => (
              <DistrictCard key={district.id} district={district} onSelect={handleSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default PlanTrip
