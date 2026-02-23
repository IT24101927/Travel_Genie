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
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Sigiriya.jpg/960px-Sigiriya.jpg',
    icon: '🏰',
    details: 'UNESCO World Heritage Site • 200m high rock • 1200 steps to top'
  },
  {
    id: 2,
    name: 'Ella Nine Arch Bridge',
    position: [6.8667, 81.0467],
    description: 'Iconic colonial-era railway bridge surrounded by lush tea plantations and misty mountains.',
    tours: 15,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/SL_Demodara_near_Ella_asv2020-01_img02.jpg/960px-SL_Demodara_near_Ella_asv2020-01_img02.jpg',
    icon: '🌉',
    details: 'Best views at sunrise • Train passes 6 times daily • 1km hike from town'
  },
  {
    id: 3,
    name: 'Temple of the Tooth - Kandy',
    position: [7.2906, 80.6337],
    description: 'Sacred Buddhist temple housing a relic of Buddha, situated beside the picturesque Kandy Lake.',
    tours: 10,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Sri_Dalada_Maligawa.jpg/960px-Sri_Dalada_Maligawa.jpg',
    icon: '🛕',
    details: 'UNESCO Site • Daily puja ceremonies • Cultural capital of Sri Lanka'
  },
  {
    id: 4,
    name: 'Mirissa Beach & Whale Watching',
    position: [5.9487, 80.4706],
    description: 'Pristine beaches with golden sand, palm trees, and the best whale watching spot in Asia.',
    tours: 14,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Mirissa_Beach_Sri_Lanka.jpg/960px-Mirissa_Beach_Sri_Lanka.jpg',
    icon: '🐋',
    details: 'Blue whale season: Nov-Apr • Surfing • Stunning sunsets'
  },
  {
    id: 5,
    name: 'Galle Dutch Fort',
    position: [6.0535, 80.2210],
    description: 'Well-preserved 17th-century Dutch colonial fortress with cobblestone streets and ocean views.',
    tours: 11,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/SL_Galle_Fort_asv2020-01_img24.jpg/960px-SL_Galle_Fort_asv2020-01_img24.jpg',
    icon: '🏛️',
    details: 'UNESCO Site • Built in 1663 • Cafés, boutiques & galleries'
  },
  {
    id: 6,
    name: 'Nuwara Eliya Tea Country',
    position: [6.9497, 80.7891],
    description: 'Cool highland town surrounded by emerald tea plantations, waterfalls, and colonial architecture.',
    tours: 8,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Nuwara_Eliya.jpg/960px-Nuwara_Eliya.jpg',
    icon: '🍵',
    details: 'Ceylon tea tastings • 1800m altitude • Known as "Little England"'
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

  return (
    <section className="map-section" id="map">
      <div className="container">
        <div className="section-header">
          <span className="section-subtitle">Interactive Journey</span>
          <h2 className="section-title">
            Explore <span className="gradient-text">Sri Lanka</span> on Map
          </h2>
          <p className="section-description">
            Discover our curated destinations across the island. Click on any marker to learn more about each location.
          </p>
        </div>

        <div className="map-container glass-card">
          <MapContainer 
            center={center} 
            zoom={8} 
            style={{ height: '600px', width: '100%', borderRadius: '24px' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {destinations.map((dest) => (
              <Marker 
                key={dest.id} 
                position={dest.position}
                icon={createCustomIcon(dest.icon, selectedDestination?.id === dest.id ? '#E8A830' : '#0E7C5F')}
                eventHandlers={{
                  click: () => setSelectedDestination(dest),
                }}
              >
                <Popup>
                  <div className="map-popup">
                    <img src={dest.image} alt={dest.name} onError={(e) => { e.target.onerror = null; e.target.src = placeholderImg; }} />
                    <h3>{dest.icon} {dest.name}</h3>
                    <p className="popup-desc">{dest.description}</p>
                    <p className="popup-details">{dest.details}</p>
                    <div className="popup-footer">
                      <span className="tour-count">🎯 {dest.tours} tours</span>
                      <button className="btn-explore">Explore →</button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Destination Cards Below Map */}
        <div className="map-destinations-grid">
          {destinations.map((dest) => (
            <div 
              key={dest.id} 
              className={`map-dest-card glass-card ${selectedDestination?.id === dest.id ? 'highlighted' : ''}`}
              onClick={() => setSelectedDestination(dest)}
            >
              <span className="dest-icon">{dest.icon}</span>
              <div className="dest-info">
                <h4>{dest.name}</h4>
                <p>{dest.tours} tours available</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default MapSection
