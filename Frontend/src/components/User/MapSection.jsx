import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './MapSection.css'
import { API_BASE, API_BASE_URL } from '../../config/api'

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Center of Sri Lanka
const center = [7.8731, 80.7718]

// Type → emoji icon mapping
const TYPE_ICON = {
  Heritage: '🏰', Beach: '🏖️', Wildlife: '🐆', Nature: '🌿',
  Scenic: '🌄', Pilgrimage: '🛕', Adventure: '⛰️', Culture: '🏛️',
  Temple: '🛕', Museum: '🏛️', Viewpoint: '🌅', Garden: '🌺',
  Park: '🌳', Market: '🛍️', Safari: '🦁', Lake: '💧',
}

function toAbsUrl(value) {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  const base = API_BASE_URL.replace(/\/+$/, '')
  const path = value.startsWith('/') ? value : '/' + value
  return base + path
}

const createCustomIcon = (emoji, color) => {
  const c = color || '#0E7C5F'
  return L.divIcon({
    html: '<div style="background:' + c + ';width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:18px;">' + emoji + '</span></div>',
    className: 'custom-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  })
}

function ZoomWatcher({ onZoom }) {
  useMapEvents({ zoomend: function(e) { onZoom(e.target.getZoom()) } })
  return null
}

function MapCapture({ mapRef }) {
  const map = useMap()
  useEffect(function() { mapRef.current = map }, [map, mapRef])
  return null
}
function ResetOnMapClick() {
  const map = useMap()
  useMapEvents({
    click() {
      map.setView(center, 7, { animate: true })
    }
  })
  return null
}

function MapSection() {
  const [destinations, setDestinations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDestination, setSelectedDestination] = useState(null)
  const [activeCategory, setActiveCategory] = useState('All')
  const [zoom, setZoom] = useState(7)
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)

  // Click outside the map card → zoom back out to full Sri Lanka view
  useEffect(function() {
    function handler(e) {
      if (!mapContainerRef.current || !mapRef.current) return
      if (mapContainerRef.current.contains(e.target)) return
      mapRef.current.setView(center, 7, { animate: true })
      setSelectedDestination(null)
    }
    document.addEventListener('mousedown', handler)
    return function() { document.removeEventListener('mousedown', handler) }
  }, [])

  useEffect(function() {
    fetch(API_BASE + '/destinations?limit=100')
      .then(function(r) { return r.json() })
      .then(function(data) {
        if (Array.isArray(data.data)) {
          var mapped = data.data
            .filter(function(d) { return d.lat && d.lng })
            .map(function(d) {
              return {
                id: d.place_id,
                name: d.name,
                position: [parseFloat(d.lat), parseFloat(d.lng)],
                description: d.description || '',
                province: (d.district && (d.district.province || d.district.name)) || '',
                image: toAbsUrl(d.image_url) || '',
                icon: TYPE_ICON[d.type] || '📍',
                category: d.type || 'Other',
                details: [
                  d.duration ? 'Duration: ' + d.duration : '',
                  d.rating > 0 ? d.rating.toFixed(1) + ' stars' : '',
                  d.review_count > 0 ? d.review_count + ' reviews' : '',
                ].filter(Boolean).join(' - '),
                tours: d.review_count || 0,
              }
            })
          setDestinations(mapped)
        }
      })
      .catch(function() {})
      .finally(function() { setLoading(false) })
  }, [])

  var categories = ['All'].concat(Array.from(new Set(destinations.map(function(d) { return d.category }))).filter(Boolean))
  var filtered = activeCategory === 'All'
    ? destinations
    : destinations.filter(function(d) { return d.category === activeCategory })
  var visibleDests = zoom < 8 ? filtered.slice(0, 25) : zoom < 10 ? filtered.slice(0, 50) : filtered

  return (
    <section className="map-section" id="map">
      <div className="container">
        <div className="section-header">
          <span className="section-subtitle">Interactive Journey</span>
          <h2 className="section-title">Explore <span className="gradient-text">Sri Lanka</span> on Map</h2>
        </div>
        <p className="section-description">
          {loading
            ? 'Loading destinations...'
            : 'Showing ' + visibleDests.length + ' of ' + filtered.length + ' destinations. Zoom in to see more.'
          }
        </p>
        {!loading && categories.length > 1 && (
          <div className="map-filter-pills">
            {categories.map(function(cat) {
              return (
                <button
                  key={cat}
                  className={'map-pill' + (activeCategory === cat ? ' active' : '')}
                  onClick={function() { setActiveCategory(cat) }}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        )}
        <div className="map-container glass-card" ref={mapContainerRef}>
          {loading ? (
            <div className="map-loading">
              <div className="loading-spinner" />
              <p>Loading map...</p>
            </div>
          ) : (
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
              <ZoomWatcher onZoom={setZoom} />
              <MapCapture mapRef={mapRef} />
              <ResetOnMapClick />
              {visibleDests.map(function(dest) {
                return (
                  <Marker
                    key={dest.id}
                    position={dest.position}
                    icon={createCustomIcon(dest.icon, selectedDestination && selectedDestination.id === dest.id ? '#E8A830' : '#0E7C5F')}
                    eventHandlers={{ click: function() { setSelectedDestination(dest) } }}
                  >
                    <Popup>
                      <div className="map-popup">
                        {dest.image && (
                          <img
                            src={dest.image}
                            alt={dest.name}
                            onError={function(e) { e.target.onerror = null; e.target.style.display = 'none' }}
                          />
                        )}
                        <h3>{dest.icon} {dest.name}</h3>
                        {dest.province && <p className="popup-province">{dest.province} Province</p>}
                        {dest.description && <p className="popup-desc">{dest.description}</p>}
                        {dest.details && <p className="popup-details">{dest.details}</p>}
                        <div className="popup-footer">
                          <span className="tour-count">{dest.tours} reviews</span>
                          <span className="popup-cat">{dest.category}</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
          )}
        </div>
      </div>
    </section>
  )
}

export default MapSection
