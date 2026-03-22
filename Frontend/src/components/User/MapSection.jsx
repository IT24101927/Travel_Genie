import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './MapSection.css'

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Center of Sri Lanka
const center = [7.8731, 80.7718]

const destinations = [
  {
    id: 1,
    name: 'Sigiriya Rock Fortress',
    position: [7.9570, 80.7603],
    description: '5th-century rock fortress with ancient frescoes and stunning panoramic views from the summit.',
    tours: 12,
    province: 'Central',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Sigiriya.jpg/960px-Sigiriya.jpg',
    icon: '🏰',
    category: 'Heritage',
    details: 'UNESCO World Heritage Site • 200m high rock • 1200 steps to top',
  },
  {
    id: 2,
    name: 'Ella Nine Arch Bridge',
    position: [6.8667, 81.0467],
    description: 'Iconic colonial-era railway bridge surrounded by lush tea plantations and misty mountains.',
    tours: 15,
    province: 'Uva',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/SL_Demodara_near_Ella_asv2020-01_img02.jpg/960px-SL_Demodara_near_Ella_asv2020-01_img02.jpg',
    icon: '🌉',
    category: 'Scenic',
    details: 'Best views at sunrise • Train passes 6 times daily • 1km hike from town',
  },
  {
    id: 3,
    name: 'Temple of the Tooth — Kandy',
    position: [7.2906, 80.6337],
    description: 'Sacred Buddhist temple housing a relic of Buddha, situated beside the picturesque Kandy Lake.',
    tours: 10,
    province: 'Central',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Sri_Dalada_Maligawa.jpg/960px-Sri_Dalada_Maligawa.jpg',
    icon: '🛕',
    category: 'Heritage',
    details: 'UNESCO Site • Daily puja ceremonies • Cultural capital of Sri Lanka',
  },
  {
    id: 4,
    name: 'Mirissa — Whale Watching',
    position: [5.9487, 80.4706],
    description: 'Pristine beaches with golden sand, palm trees, and the best whale watching spot in Asia.',
    tours: 14,
    province: 'Southern',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Mirissa_Beach_Sri_Lanka.jpg/960px-Mirissa_Beach_Sri_Lanka.jpg',
    icon: '🐋',
    category: 'Beach',
    details: 'Blue whale season: Nov–Apr • Surfing • Stunning sunsets',
  },
  {
    id: 5,
    name: 'Galle Dutch Fort',
    position: [6.0535, 80.2210],
    description: 'Well-preserved 17th-century Dutch colonial fortress with cobblestone streets and ocean views.',
    tours: 11,
    province: 'Southern',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/SL_Galle_Fort_asv2020-01_img24.jpg/960px-SL_Galle_Fort_asv2020-01_img24.jpg',
    icon: '🏛️',
    category: 'Heritage',
    details: 'UNESCO Site • Built in 1663 • Cafés, boutiques & galleries',
  },
  {
    id: 6,
    name: 'Nuwara Eliya — Tea Country',
    position: [6.9497, 80.7891],
    description: 'Cool highland town surrounded by emerald tea plantations, waterfalls, and colonial architecture.',
    tours: 8,
    province: 'Central',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Nuwara_Eliya.jpg/960px-Nuwara_Eliya.jpg',
    icon: '🍵',
    category: 'Nature',
    details: 'Ceylon tea tastings • 1800m altitude • Known as "Little England"',
  },
  {
    id: 7,
    name: 'Anuradhapura Sacred City',
    position: [8.3114, 80.4037],
    description: 'Ancient capital with massive stupas, sacred bo tree, and sprawling archaeological ruins spanning 2,500 years.',
    tours: 9,
    province: 'North Central',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Ruwanwelisaya.jpg/960px-Ruwanwelisaya.jpg',
    icon: '🗿',
    category: 'Heritage',
    details: 'UNESCO Site • Sri Maha Bodhi tree (2,300 yrs old) • Ancient irrigation lakes',
  },
  {
    id: 8,
    name: 'Polonnaruwa Ancient City',
    position: [7.9403, 81.0188],
    description: 'Magnificent medieval capital with remarkable stone sculptures, royal ruins, and the Gal Vihara rock temple.',
    tours: 7,
    province: 'North Central',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Gal_Vihara.jpg/960px-Gal_Vihara.jpg',
    icon: '🏯',
    category: 'Heritage',
    details: 'UNESCO Site • Gal Vihara giant Buddhas • Best explored by bicycle',
  },
  {
    id: 9,
    name: 'Yala National Park',
    position: [6.3728, 81.5197],
    description: 'World-famous wildlife park with the highest leopard density on the planet, plus elephants, sloth bears, and crocodiles.',
    tours: 18,
    province: 'Southern / Uva',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Yala_National_Park_%28Sri_Lanka_2012%29.jpg/960px-Yala_National_Park_%28Sri_Lanka_2012%29.jpg',
    icon: '🐆',
    category: 'Wildlife',
    details: 'Highest leopard density on earth • 215 bird species • Sunrise jeep safaris',
  },
  {
    id: 10,
    name: "Adam's Peak — Sri Pada",
    position: [6.8096, 80.4994],
    description: 'Sacred conical peak revered by four religions, famous for pre-dawn pilgrimages rewarded with a sea-of-clouds sunrise.',
    tours: 6,
    province: 'Sabaragamuwa',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Adams_peak_Sri_Lanka.jpg/960px-Adams_peak_Sri_Lanka.jpg',
    icon: '⛰️',
    category: 'Pilgrimage',
    details: '5,500 steps • Sacred to Buddhism, Hinduism, Islam & Christianity • Dec–May pilgrimage season',
  },
  {
    id: 11,
    name: 'Jaffna Fort & Peninsula',
    position: [9.6615, 80.0255],
    description: 'The cultural heartland of Tamil Sri Lanka with ancient Hindu temples, colonial forts, and unique island day trips.',
    tours: 8,
    province: 'Northern',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Jaffna_Fort_entrance.JPG/960px-Jaffna_Fort_entrance.JPG',
    icon: '🏟️',
    category: 'Heritage',
    details: 'Nallur Kovil • Nainativu Island • Fresh lagoon seafood',
  },
  {
    id: 12,
    name: 'Trincomalee — Nilaveli Beach',
    position: [8.5874, 81.2152],
    description: 'One of the finest natural harbours in the world with crystal-clear beaches, whale watching, and Pigeon Island coral reef.',
    tours: 10,
    province: 'Eastern',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Nilaveli_Beach_Trincomalee.jpg/960px-Nilaveli_Beach_Trincomalee.jpg',
    icon: '🌊',
    category: 'Beach',
    details: 'Pigeon Island snorkelling • Whale watching Apr–Sep • Koneswaram Temple',
  },
  {
    id: 13,
    name: 'Arugam Bay — Surf Point',
    position: [6.8408, 81.8368],
    description: "One of the world's top surf destinations, with a chilled beach-town vibe close to Kumana National Park and Crocodile Rock.",
    tours: 9,
    province: 'Eastern',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Arugam_Bay_Sri_Lanka.jpg/960px-Arugam_Bay_Sri_Lanka.jpg',
    icon: '🏄',
    category: 'Beach',
    details: 'Best surf: May–Oct • Kumana NP nearby • Laid-back beach town',
  },
  {
    id: 14,
    name: 'Horton Plains — World\'s End',
    position: [6.8020, 80.8036],
    description: "A sweeping high-altitude plateau ending at a stunning 880m sheer cliff called World's End, with misty forest trails.",
    tours: 5,
    province: 'Central',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/View_from_World%27s_End.jpg/960px-View_from_World%27s_End.jpg',
    icon: '🌄',
    category: 'Nature',
    details: "UNESCO Site • 2,100m altitude • Best at 6am before mist rolls in",
  },
  {
    id: 15,
    name: 'Pinnawala Elephant Orphanage',
    position: [7.3004, 80.3833],
    description: 'Iconic protected sanctuary where orphaned wild elephants are raised and cared for, with daily river bathing shows.',
    tours: 11,
    province: 'Sabaragamuwa',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Pinnawala_Elephant_Orphanage.jpg/960px-Pinnawala_Elephant_Orphanage.jpg',
    icon: '🐘',
    category: 'Wildlife',
    details: 'River bath twice daily • 90+ elephants • Feeding sessions available',
  },
]

// Custom marker icons
const createCustomIcon = (emoji, color = '#0E7C5F') => {
  return L.divIcon({
    html: `<div style="
      background: ${color};
      width: 36px;
      height: 36px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <span style="transform: rotate(45deg); font-size: 18px;">${emoji}</span>
    </div>`,
    className: 'custom-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  })
}

function MapSection() {
  const [selectedDestination, setSelectedDestination] = useState(null)
  const [activeCategory, setActiveCategory] = useState('All')

  const categories = ['All', 'Heritage', 'Beach', 'Wildlife', 'Nature', 'Scenic', 'Pilgrimage']
  const filtered = activeCategory === 'All'
    ? destinations
    : destinations.filter(d => d.category === activeCategory)

  return (
    <section className="map-section" id="map">
      <div className="container">
        <div className="section-header">
          <span className="section-subtitle">Interactive Journey</span>
          <h2 className="section-title">
            Explore <span className="gradient-text">Sri Lanka</span> on Map
          </h2>
          <p className="section-description">
            Discover 15 iconic destinations across the island. Click any marker for details, or filter by category below.
          </p>
        </div>

        {/* Category filter */}
        <div className="map-filter-pills">
          {categories.map(cat => (
            <button
              key={cat}
              className={`map-pill ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="map-container glass-card">
          <MapContainer
            center={center}
            zoom={7}
            style={{ height: '600px', width: '100%', borderRadius: '24px' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {filtered.map((dest) => (
              <Marker
                key={dest.id}
                position={dest.position}
                icon={createCustomIcon(dest.icon, selectedDestination?.id === dest.id ? '#E8A830' : '#0E7C5F')}
                eventHandlers={{ click: () => setSelectedDestination(dest) }}
              >
                <Popup>
                  <div className="map-popup">
                    <img src={dest.image} alt={dest.name} onError={(e) => { e.target.onerror = null; e.target.src = '' }} />
                    <h3>{dest.icon} {dest.name}</h3>
                    <p className="popup-province">📌 {dest.province} Province</p>
                    <p className="popup-desc">{dest.description}</p>
                    <p className="popup-details">{dest.details}</p>
                    <div className="popup-footer">
                      <span className="tour-count">🎯 {dest.tours} tours</span>
                      <span className="popup-cat">{dest.category}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Destination Cards Below Map */}
        <div className="map-destinations-grid">
          {filtered.map((dest) => (
            <div
              key={dest.id}
              className={`map-dest-card glass-card ${selectedDestination?.id === dest.id ? 'highlighted' : ''}`}
              onClick={() => setSelectedDestination(dest)}
            >
              <span className="dest-icon">{dest.icon}</span>
              <div className="dest-info">
                <h4>{dest.name}</h4>
                <p className="dest-province">{dest.province} Province</p>
                <p>{dest.tours} tours available</p>
              </div>
              <span className="dest-cat-badge">{dest.category}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default MapSection
