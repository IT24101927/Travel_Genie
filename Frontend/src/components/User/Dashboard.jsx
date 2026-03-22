import { useState, useEffect, useMemo } from 'react'
import { clearUserData } from '../../utils/clearUserData'
import { API_BASE } from '../../config/api'
import { Link, useNavigate } from 'react-router-dom'
import './Dashboard.css'

const EXPENSE_CATS = [
  { id: 'accommodation', icon: '🏨', color: '#0E7C5F' },
  { id: 'transportation',icon: '🚗', color: '#3b82f6' },
  { id: 'food',          icon: '🍽️', color: '#f59e0b' },
  { id: 'activities',   icon: '🎯', color: '#8b5cf6' },
  { id: 'shopping',     icon: '🛍️', color: '#ec4899' },
  { id: 'entertainment',icon: '🎭', color: '#06b6d4' },
  { id: 'emergency',    icon: '🚨', color: '#ef4444' },
  { id: 'other',        icon: '📦', color: '#6b7280' },
]
const CAT_MAP_DB = Object.fromEntries(EXPENSE_CATS.map(c => [c.id, c]))

/* ── Currency helpers — identical to ExpenseTracker ── */
const DISPLAY_CURRENCIES = [
  { code: 'LKR', symbol: 'Rs', label: 'Sri Lankan Rupee', flag: '🇱🇰', rate: 300  },
  { code: 'USD', symbol: '$',  label: 'US Dollar',        flag: '🇺🇸', rate: 1    },
  { code: 'EUR', symbol: '€',  label: 'Euro',             flag: '🇪🇺', rate: 0.92 },
]
function convertAmt(amount, fromCode, toCode) {
  if (!amount) return 0
  const from = DISPLAY_CURRENCIES.find(c => c.code === fromCode)?.rate ?? 1
  const to   = DISPLAY_CURRENCIES.find(c => c.code === toCode)?.rate   ?? 1
  return Math.round((amount / from) * to * 100) / 100
}
/* Maps district name → frontend 'd1'-style id used by PLACES_BY_DISTRICT in DistrictExplore */
const DISTRICT_NAME_TO_ID = {
  'Colombo':'d1','Gampaha':'d2','Kalutara':'d3','Kandy':'d4','Matale':'d5',
  'Nuwara Eliya':'d6','Galle':'d7','Matara':'d8','Hambantota':'d9','Jaffna':'d10',
  'Kilinochchi':'d11','Mannar':'d12','Vavuniya':'d13','Mullaitivu':'d14',
  'Trincomalee':'d15','Batticaloa':'d16','Ampara':'d17','Kurunegala':'d18',
  'Puttalam':'d19','Anuradhapura':'d20','Polonnaruwa':'d21','Badulla':'d22',
  'Monaragala':'d23','Ratnapura':'d24','Kegalle':'d25',
}

const DISTRICT_LIST = [
  {id:'d1', name:'Colombo',      province:'Western'},
  {id:'d2', name:'Gampaha',      province:'Western'},
  {id:'d3', name:'Kalutara',     province:'Western'},
  {id:'d4', name:'Kandy',        province:'Central'},
  {id:'d5', name:'Matale',       province:'Central'},
  {id:'d6', name:'Nuwara Eliya', province:'Central'},
  {id:'d7', name:'Galle',        province:'Southern'},
  {id:'d8', name:'Matara',       province:'Southern'},
  {id:'d9', name:'Hambantota',   province:'Southern'},
  {id:'d10',name:'Jaffna',       province:'Northern'},
  {id:'d11',name:'Kilinochchi',  province:'Northern'},
  {id:'d12',name:'Mannar',       province:'Northern'},
  {id:'d13',name:'Vavuniya',     province:'Northern'},
  {id:'d14',name:'Mullaitivu',   province:'Northern'},
  {id:'d15',name:'Trincomalee',  province:'Eastern'},
  {id:'d16',name:'Batticaloa',   province:'Eastern'},
  {id:'d17',name:'Ampara',       province:'Eastern'},
  {id:'d18',name:'Kurunegala',   province:'North Western'},
  {id:'d19',name:'Puttalam',     province:'North Western'},
  {id:'d20',name:'Anuradhapura', province:'North Central'},
  {id:'d21',name:'Polonnaruwa',  province:'North Central'},
  {id:'d22',name:'Badulla',      province:'Uva'},
  {id:'d23',name:'Monaragala',   province:'Uva'},
  {id:'d24',name:'Ratnapura',    province:'Sabaragamuwa'},
  {id:'d25',name:'Kegalle',      province:'Sabaragamuwa'},
]

/* Place names by district frontend-id — mirrors DistrictExplore PLACES_BY_DISTRICT */
const DISTRICT_PLACES = {
  d1: ['Gangaramaya Temple','Galle Face Green','National Museum','Pettah Market','Independence Memorial Hall','Viharamahadevi Park','Lotus Tower','Mount Lavinia Beach','Kelaniya Raja Maha Vihara','One Galle Face Mall','Dutch Hospital Shopping Precinct','Red Mosque (Jami Ul-Alfar)'],
  d2: ['Pinnawala Elephant Orphanage','Henarathgoda Botanical Garden','Attanagalla Rajamaha Viharaya','Bolgoda Lake','Seetha Eliya Dambulla','Kelaniya Water World','Horagolla National Park','Thewatte Basilica (Tewatta)','Negombo Beach','Angurukaramulla Temple'],
  d3: ['Kalutara Bodhiya','Bentota River','Kalutara Beach','Richmond Castle','Lunuganga Estate','Beruwala Lighthouse','Brief Garden','Fa Hien Cave','Thudugala Ella Waterfall','Kande Viharaya'],
  d4: ['Temple of the Tooth Relic','Kandy Lake','Peradeniya Botanical Gardens','Bahirawakanda Buddha Statue','Kandyan Cultural Show','Udawatta Kele Sanctuary','Ceylon Tea Museum','Commonwealth War Cemetery','Gadaladeniya Temple','Lankatilaka Vihara','Embekke Devalaya'],
  d5: ['Nalanda Gedige','Aluvihara Rock Temple','Spice Garden Matale','Sri Muthumariamman Thevasthanam','Sigiriya Rock','Pidurangala Rock','Sembuwatta Lake','Riverston Gap','Wasgamuwa National Park','Dambulla Cave Temple'],
  d6: ["Horton Plains & World's End",'Gregory Lake','Hakgala Botanical Garden','Pedro Tea Estate','Seetha Amman Temple','Moon Plains','Victoria Park',"St. Clair's Falls",'Devon Falls','Strawberry Fields','Ambewela Farm'],
  d7: ['Galle Fort','Galle Lighthouse','National Maritime Museum','Jungle Beach (Unawatuna)','Historical Mansion Museum','Dutch Reformed Church','Unawatuna Beach','Koggala Lake','Japanese Peace Pagoda','Sea Turtle Hatchery'],
  d8: ['Mirissa Beach','Star Fort Matara','Paravi Duwa Temple','Dondra Head Lighthouse','Polhena Reef','Wella Dewalaya','Snake Farm','Coconut Tree Hill','Secret Beach Mirissa','Weherahena Temple'],
  d9: ['Yala National Park','Bundala National Park','Tissamaharama Stupa','Kataragama Dewalaya','Rekawa Turtle Conservation','Mulkirigala Rock Temple','Birds Park Hambantota','Ridiyagama Safari Park','Madunagala Hot Springs','Ussangoda National Park'],
  d10:['Jaffna Fort','Nallur Kandaswamy Kovil','Nainativu Island','Jaffna Public Library','Casuarina Beach','Keerimalai Hot Springs','Delft Island','Dambakola Patuna','Point Pedro','Rio Ice Cream'],
  d11:['Iranamadu Tank','War Memorial Water Tower','Pooneryn Fort','Aadampan Bird Sanctuary','Kilinochchi Town Market','Lubai Nagar Mosque',"Devil's Point"],
  d12:['Mannar Fort','Ancient Baobab Tree',"Adam's Bridge (Rama's Bridge)","Giant's Tank & Bird Sanctuary",'Talaimannar Pier','Thiruketheeswaram Kovil','Doric House','Mannar Bird Sanctuary'],
  d13:['Kandasamy Kovil','Madhu Church','Ularapokuna Tank','Vavuniya Museum','Cheddikulam Bird Sanctuary','Grand Jummah Mosque','Iratperiyakulam Tank'],
  d14:['Mullaitivu Beach','Nandikadal Lagoon','Chalai Beach','Mangrove Canoe Tours','Putumattalan Memorial','Kokkilai Bird Sanctuary','Red Barna Golf Club'],
  d15:['Koneswaram Temple','Nilaveli Beach','Pigeon Island Marine NP','Hot Springs (Kanniya)','Fort Frederick','Whale Watching','Marble Beach','Gokana Temple','Naval Museum','Seruwila Mangala Raja Maha Vihara'],
  d16:['Batticaloa Fort','Pasikudah Bay','Singing Fish Lagoon','Kallady Bridge','Kalkudah Beach','Batticaloa Lighthouse','Batticaloa Gate','Amritagali Mamangam Kovil'],
  d17:['Arugam Bay','Kumana National Park','Lahugala Elephant Sanctuary','Deegavapi Stupa','Crocodile Rock (Arugam Bay)','Muhudu Maha Vihara','Whisky Point','Panama Tank','Buddhangala Monastery'],
  d18:['Ethagala (Elephant Rock)','Ridi Vihara','Aukana Buddha Statue','Padeniya Raja Maha Vihara','Kurunegala Lake','Yapahuwa Rock Fortress','Panduwasnuwara Ruins','Arankele Forest Monastery'],
  d19:['Wilpattu National Park','Kalpitiya Peninsula','Puttalam Lagoon','Salt Flats of Puttalam','Dutch Fort Kalpitiya','Munneswaram Temple',"St. Anne's Church Talawila",'Anawilundawa Bird Sanctuary'],
  d20:['Sri Maha Bodhi','Ruwanwelisaya Stupa','Abhayagiri Monastery','Isurumuniya Vihara','Mihintale','Thuparama Stupa','Lovamahapaya','Jetavanaramaya','Kuttam Pokuna (Twin Ponds)','Moonstone (Sandakada Pahana)'],
  d21:['Gal Vihara','Parakrama Samudra','Royal Palace of Parakramabahu','Vatadage','Lankathilaka Image House','Minneriya National Park','Somawathiya Chaitya','Rankoth Vehera','Kaudulla National Park','Pothgul Vihara'],
  d22:['Nine Arch Bridge Ella','Ella Rock Hike','Rawana Falls',"Little Adam's Peak",'Dunhinda Falls','Demodara Train Loop','Muthiyangana Raja Maha Vihara',"Lipton's Seat",'Adisham Bungalow','Diyaluma Falls'],
  d23:['Maligawila Buddha Statue','Buduruwagala Rock Temple','Gal Oya National Park','Wellawaya Valley','Inginiyagala Dam','Yudaganawa Stupa','Maduru Oya National Park','Nilgala Forest Reserve'],
  d24:["Adam's Peak (Sri Pada)",'Sinharaja Forest Reserve','Ratnapura Gem Museum','Maha Saman Devalaya','Bopath Falls','Udawalawe National Park','Batadombalena','Pahanthudawa Falls','Waulpane Limestone Cave'],
  d25:['White Water Rafting Kitulgala','Belilena Cave','Bridge on the River Kwai Site','Rambukkana','Ambuluwawa Tower','Pinnawala Open Zoo','Millennium Elephant Foundation','Saradiel Village','Asupini Ella'],
}

/* Place type → fallback photo (mirrors DistrictExplore) */
const TYPE_IMAGES = {
  Temple:    'https://images.unsplash.com/photo-1548013146-72479768bada?w=400&auto=format',
  Beach:     'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&auto=format',
  Nature:    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&auto=format',
  Heritage:  'https://images.unsplash.com/photo-1553913861-c0fddf2619ee?w=400&auto=format',
  Museum:    'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=400&auto=format',
  Safari:    'https://images.unsplash.com/photo-1549366021-9f761d450615?w=400&auto=format',
  Wildlife:  'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=400&auto=format',
  Garden:    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&auto=format',
  Lake:      'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&auto=format',
  Market:    'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=400&auto=format',
  Viewpoint: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&auto=format',
  Culture:   'https://images.unsplash.com/photo-1582192730841-2a682d7375f9?w=400&auto=format',
  Adventure: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&auto=format',
  Park:      'https://images.unsplash.com/photo-1586348943529-beaae6c28db9?w=400&auto=format',
  Shopping:  'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&auto=format',
  'Theme Park': 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=400&auto=format',
}
const HOTEL_IMAGES = {
  luxury:   'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&auto=format',
  resort:   'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&auto=format',
  boutique: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=400&auto=format',
  budget:   'https://images.unsplash.com/photo-1586611292717-f828b167408c?w=400&auto=format',
  hostel:   'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&auto=format',
  default:  'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400&auto=format',
}
function placeImage(p) {
  if (p.image) return p.image
  if (p.type && TYPE_IMAGES[p.type]) return TYPE_IMAGES[p.type]
  // infer type from name keywords
  const n = (p.name || p.place_name || '').toLowerCase()
  if (/temple|vihara|kovil|church|mosque|stupa|devalaya|dagoba|bodhi/.test(n)) return TYPE_IMAGES.Temple
  if (/beach|bay|coast/.test(n)) return TYPE_IMAGES.Beach
  if (/falls|waterfall|forest|jungle|peak|mountain|wild/.test(n)) return TYPE_IMAGES.Nature
  if (/fort|museum|palace|heritage|ruin|ancient|historic/.test(n)) return TYPE_IMAGES.Heritage
  if (/park|national park|safari|elephant|leopard/.test(n)) return TYPE_IMAGES.Safari
  if (/lake|tank|lagoon|river/.test(n)) return TYPE_IMAGES.Lake
  if (/garden|botanical/.test(n)) return TYPE_IMAGES.Garden
  if (/viewpoint|view|rock|summit|gap/.test(n)) return TYPE_IMAGES.Viewpoint
  if (/market|mall|shop/.test(n)) return TYPE_IMAGES.Market
  return TYPE_IMAGES.Heritage
}
function hotelImage(cat) {
  const c = (cat || '').toLowerCase()
  if (/luxury|5 star|five/.test(c)) return HOTEL_IMAGES.luxury
  if (/resort/.test(c)) return HOTEL_IMAGES.resort
  if (/boutique/.test(c)) return HOTEL_IMAGES.boutique
  if (/budget|economy|cheap/.test(c)) return HOTEL_IMAGES.budget
  if (/hostel|backpacker/.test(c)) return HOTEL_IMAGES.hostel
  return HOTEL_IMAGES.default
}

function symFor(code) {
  return DISPLAY_CURRENCIES.find(c => c.code === code)?.symbol ?? code
}
function fmtAmt(amount, code) {
  const sym = symFor(code)
  return `${sym} ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/* ── helpers ─────────────────────────────── */
function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')
}
function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function calcNights(start, end) {
  if (!start || !end) return 0
  return Math.max(0, Math.round((new Date(end) - new Date(start)) / 86400000))
}
function TGLogo() {
  return (
    <svg viewBox="0 0 32 32" fill="none" style={{ width: 28, height: 28 }}>
      <circle cx="16" cy="16" r="16" fill="#0E7C5F" />
      <path d="M8 22 L16 8 L24 22 Z" fill="white" fillOpacity=".9" />
      <circle cx="16" cy="19" r="3" fill="#F5C842" />
    </svg>
  )
}

export default function Dashboard({ theme, toggleTheme }) {
  const navigate = useNavigate()

  // Auth guard — must be logged in as a regular user
  useEffect(() => {
    const token = localStorage.getItem('token')
    const u = JSON.parse(localStorage.getItem('currentUser') || '{}')
    if (!token) { navigate('/login', { replace: true }); return }
    if (u.role === 'admin') { navigate('/admin', { replace: true }) }
  }, [navigate])

  const [menuOpen, setMenuOpen] = useState(false)
  const [myTrips, setMyTrips] = useState([])
  const [allExpenses, setAllExpenses] = useState([])
  const [myReviews, setMyReviews] = useState([])
  const [editReviewTarget, setEditReviewTarget] = useState(null)
  const [reviewForm, setReviewForm] = useState({})
  const [editExpenseTarget, setEditExpenseTarget] = useState(null)
  const [expenseForm, setExpenseForm] = useState({})
  const [showAllExpenses, setShowAllExpenses] = useState(false)
  const [savedDests, setSavedDests] = useState(() => {
    try { return JSON.parse(localStorage.getItem('savedDestinations') || '[]') }
    catch { return [] }
  })
  const [recommendedDests, setRecommendedDests] = useState([])
  const [recLoading, setRecLoading] = useState(false)
  const [recCategories, setRecCategories] = useState([])

  const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}')
  const user = {
    name:        storedUser.name        || 'Traveller',
    email:       storedUser.email       || '',
    phone:       storedUser.phone       || '',
    joinDate:    storedUser.joinDate    || 'January 2026',
    travelStyle: storedUser.travelStyle || '',
    interests:   storedUser.interests   || [],
    avatar:      storedUser.avatar      || '',
  }

  /* ── helpers mirrored from ExpenseTracker ── */
  const DB_CAT_MAP = {
    accommodation: 'accommodation', food: 'food', transport: 'transportation',
    tickets: 'activities', shopping: 'shopping', entertainment: 'entertainment',
    emergency: 'emergency', other: 'other',
  }
  const normCat = (name) => DB_CAT_MAP[(name || 'other').toLowerCase()] || (name || 'other').toLowerCase()

  /* reads all locally-stored expenses — scans every expenses_trip_* key once */
  const readLocalExpenses = () => {
    const all = []
    const seen = new Set()
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k?.startsWith('expenses_trip_')) continue
      try {
        const arr = JSON.parse(localStorage.getItem(k) || '[]')
        if (!Array.isArray(arr)) continue
        for (const e of arr) {
          // composite key in case id is missing
          const uid = e.id != null ? String(e.id) : `${e.amount}_${e.date}_${e.description}`
          if (!seen.has(uid)) { seen.add(uid); all.push(e) }
        }
      } catch { /* skip corrupt key */ }
    }
    return all
  }

  useEffect(() => {
    const raw = localStorage.getItem('myTrips')
    const localTrips = raw ? JSON.parse(raw) : []
    const token = localStorage.getItem('token')

    /* ── purge orphaned localStorage expense keys for unknown trip IDs ── */
    const purgeOrphanedExpenses = (knownTripIds) => {
      const validSet = new Set(knownTripIds.map(id => String(id)))
      validSet.add('standalone')
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i)
        if (!k?.startsWith('expenses_trip_')) continue
        const tid = k.replace('expenses_trip_', '')
        if (!validSet.has(tid)) {
          localStorage.removeItem(k)
        }
      }
    }

    /* ── load trips ── */
    const loadTrips = () => {
      if (!token) { setMyTrips(localTrips); return Promise.resolve(localTrips) }
      return fetch(`${API_BASE}/trips/my`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
            const apiTrips = json.data.map(t => ({
              id: t.trip_id, dbTripId: t.trip_id, tripName: t.title,
              destinationName: t.district?.name || 'Trip',
              destinationCity: t.district?.province ? `${t.district.province} Province` : '',
              destinationId: t.district?.district_id || null,
              districtFrontendId: DISTRICT_NAME_TO_ID[t.district?.name] || null,
              provinceName: t.district?.province || '',
              startDate: t.start_date, endDate: t.end_date,
              travelers: t.num_people, travelStyle: '', status: t.status,
              notes: t.notes, createdAt: t.createdAt,
            }))
            const dbIds = new Set(apiTrips.map(t => t.dbTripId))
            const merged = [...apiTrips, ...localTrips.filter(t => !t.dbTripId || !dbIds.has(t.dbTripId))]
            setMyTrips(merged)
            purgeOrphanedExpenses(merged.map(t => t.id || t._id))
            return merged
          }
          setMyTrips(localTrips)
          purgeOrphanedExpenses(localTrips.map(t => t.id || t._id))
          return localTrips
        })
        .catch(() => { setMyTrips(localTrips); return localTrips })
    }

    /* ── load expenses after trips resolve (so trip names display correctly) ── */
    const doLoadExpenses = (tripList) => {
      const knownIds = new Set(tripList.map(t => String(t.id || t._id)))
      const localData = readLocalExpenses()
      if (!token) {
        // filter out expenses for trips that no longer exist
        setAllExpenses(localData.filter(e => !e.tripId || e.tripId === 'standalone' || knownIds.has(String(e.tripId))))
        return
      }

      fetch(`${API_BASE}/expenses?limit=500`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          if (json?.success && Array.isArray(json.data)) {
            const apiExpenses = json.data.map(e => ({
              id: e.expense_id || e.id,
              description: e.note || e.description || '',
              category: normCat(e.category?.category_name),
              amount: parseFloat(e.amount) || 0,
              currency: e.currency || 'LKR',
              date: e.expense_date || e.date,
              tripId: e.trip_id ? String(e.trip_id) : null,
            }))
            // merge: prefer API copy; append local-only entries
            const apiIds = new Set(apiExpenses.map(e => String(e.id)))
            const onlyLocal = localData.filter(e => e.id != null && !apiIds.has(String(e.id)))
            const merged = [...apiExpenses, ...onlyLocal]
            // filter out expenses whose tripId doesn't match any known trip
            setAllExpenses(merged.filter(e => !e.tripId || e.tripId === 'standalone' || knownIds.has(String(e.tripId))))
          } else {
            setAllExpenses(localData.filter(e => !e.tripId || e.tripId === 'standalone' || knownIds.has(String(e.tripId))))
          }
        })
        .catch(() => setAllExpenses(localData.filter(e => !e.tripId || e.tripId === 'standalone' || knownIds.has(String(e.tripId)))))
    }

    /* ── read local-storage reviews (all reviews_* keys) ── */
    const readLocalReviews = () => {
      const all = []
      let placeNamesMap = {}
      try { placeNamesMap = JSON.parse(localStorage.getItem('placeNamesMap') || '{}') } catch { /* ignore */ }
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (!k?.startsWith('reviews_')) continue
        try {
          const arr = JSON.parse(localStorage.getItem(k) || '[]')
          const keyId = k.replace(/^reviews_/, '')          // e.g. "hotel_abc123" or "place_kandy_1"
          const keyTargetType = keyId.split('_')[0]         // "hotel", "place", "destination" …
          const mapEntry = placeNamesMap[keyId]
          const fallbackName     = typeof mapEntry === 'object' ? (mapEntry?.name     || '') : (mapEntry || '')
          const fallbackDistrict = typeof mapEntry === 'object' ? (mapEntry?.district || '') : ''
          // prefer explicit targetType stored in the map entry, then in the review itself, then key-name parse
          const fallbackType     = (typeof mapEntry === 'object' ? mapEntry?.targetType : null) || keyTargetType
          if (Array.isArray(arr)) arr.forEach(r => {
            all.push({
              ...r,
              placeName:    r.placeName    || fallbackName,
              districtName: r.districtName || fallbackDistrict,
              targetType:   r.targetType   || fallbackType,
            })
          })
        } catch { /* skip */ }
      }
      return all
    }

    /* ── load my reviews (API + localStorage merge) ── */
    const loadMyReviews = () => {
      const freshToken = localStorage.getItem('token')
      const localReviews = readLocalReviews()

      if (!freshToken) {
        setMyReviews(localReviews)
        return
      }
      fetch(`${API_BASE}/reviews/my`, { headers: { Authorization: `Bearer ${freshToken}` } })
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          const raw = json?.success ? (json.data || []) : []
          const apiReviews = raw.map(r => ({
            ...r,
            targetType: r.targetType || (
              r.place?.place?.hotel        ? 'hotel' :
              r.place?.place?.destination  ? 'destination' : 'place'
            ),
          }))
          // local reviews that don't have a matching backend entry
          const apiIds = new Set(apiReviews.map(r => String(r.review_id || r.id)))
          const onlyLocal = localReviews.filter(r => !apiIds.has(String(r.id || '')))
          setMyReviews([...apiReviews, ...onlyLocal])
        })
        .catch(() => setMyReviews(localReviews))
    }

    loadTrips().then(doLoadExpenses)
    loadMyReviews()

    // Load recommended destinations based on user preferences
    const loadRecommended = () => {
      const tk = localStorage.getItem('token')
      if (!tk) return
      setRecLoading(true)
      fetch(`${API_BASE}/destinations/recommended?limit=8`, {
        headers: { Authorization: `Bearer ${tk}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          if (json?.success && Array.isArray(json.data)) {
            setRecommendedDests(json.data)
            setRecCategories(json.matchedCategories || [])
          }
        })
        .catch(() => {})
        .finally(() => setRecLoading(false))
    }
    loadRecommended()

    // Re-fetch when user navigates back to this tab (e.g. from ExpenseTracker)
    const onFocus = () => { loadTrips().then(doLoadExpenses); loadMyReviews(); loadRecommended() }
    window.addEventListener('focus', onFocus)
    // Re-sync reviews when ReviewSection emits a change
    window.addEventListener('reviewsUpdated', loadMyReviews)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('reviewsUpdated', loadMyReviews)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    clearUserData()
    navigate('/')
  }

  const goToSavedPlace = (d) => {
    if (d.districtData && d.placeId) {
      localStorage.setItem('selectedDistrict', JSON.stringify(d.districtData))
      localStorage.setItem('scrollToPlace', d.placeId)
      navigate('/district-explore')
    } else {
      navigate('/plan-trip')
    }
  }

  // ── display currency (shared with ExpenseTracker via localStorage) ──
  const [displayCurrency, setDisplayCurrencyState] = useState(
    () => localStorage.getItem('et_displayCurrency') || 'LKR'
  )
  const setDisplayCurrency = (code) => {
    localStorage.setItem('et_displayCurrency', code)
    setDisplayCurrencyState(code)
  }
  const expSym = symFor(displayCurrency)

  // ── expenses: convert each to displayCurrency (same as ExpenseTracker) ──
  const totalSpent = allExpenses.reduce(
    (s, e) => s + convertAmt(e.amount || 0, e.currency || 'LKR', displayCurrency), 0
  )

  // ── budget: stored in LKR by ExpenseTracker → convert to displayCurrency ──
  const _tripBudgetsStored = (() => { try { return JSON.parse(localStorage.getItem('tripBudgets') || '{}') } catch { return {} } })()
  const _tripBudgets = { ..._tripBudgetsStored }
  myTrips.forEach(t => {
    const tid = String(t.id || t._id)
    if (_tripBudgets[tid] === undefined && Number(t.totalBudget) > 0)
      _tripBudgets[tid] = Number(t.totalBudget)
  })
  const totalBudgetLKR = Object.values(_tripBudgets).reduce((s, v) => s + (Number(v) || 0), 0)
  const totalBudget    = convertAmt(totalBudgetLKR, 'LKR', displayCurrency)

  const budgetUsedPct = (totalBudget > 0)
    ? Math.min(Math.round(totalSpent / totalBudget * 100), 100)
    : null

  const spendingByCategory = useMemo(() => {
    const acc = {}
    allExpenses.forEach(e => {
      const v = convertAmt(e.amount || 0, e.currency || 'LKR', displayCurrency)
      acc[e.category] = (acc[e.category] || 0) + v
    })
    return EXPENSE_CATS.map(c => ({ ...c, value: acc[c.id] || 0 }))
      .filter(c => c.value > 0).sort((a, b) => b.value - a.value).slice(0, 4)
  }, [allExpenses, displayCurrency])

  const spendingByTrip = useMemo(() => {
    const acc = {}
    allExpenses.forEach(e => {
      const tid = String(e.tripId || e.trip_id || 'standalone')
      if (!acc[tid]) {
        const trip = myTrips.find(t => String(t.id || t._id) === tid)
        acc[tid] = {
          tripId: tid,
          tripName: trip?.tripName || trip?.destinationName || (tid === 'standalone' ? 'General' : `Trip ${tid}`),
          total: 0, count: 0,
        }
      }
      acc[tid].total += convertAmt(e.amount || 0, e.currency || 'LKR', displayCurrency)
      acc[tid].count++
    })
    return Object.values(acc).sort((a, b) => b.total - a.total)
  }, [allExpenses, myTrips, displayCurrency])

  const countStats = [
    { label: 'Trips Planned', value: myTrips.length || 0,  icon: '✈️', color: '#0E7C5F' },
    { label: 'Saved Places',  value: savedDests.length,    icon: '❤️', color: '#ec4899' },
    { label: 'Reviews Given', value: myReviews.length,      icon: '⭐', color: '#f59e0b' },
  ]
  const moneyStats = [
    { label: 'Total Spent',   value: totalSpent > 0 ? fmtAmt(totalSpent, displayCurrency) : '—', icon: '💸', color: '#3b82f6' },
    { label: 'Budget Used',   value: budgetUsedPct !== null ? `${budgetUsedPct}%` : '—',          icon: '📊', color: '#8b5cf6' },
  ]

  const removeSaved = (id) => {
    const updated = savedDests.filter(d => d.id !== id)
    setSavedDests(updated)
    localStorage.setItem('savedDestinations', JSON.stringify(updated))
  }

  /* ── trip detail view ── */
  const [viewTripTarget, setViewTripTarget] = useState(null)

  /* ── trip edit / delete ── */
  const [editTripTarget, setEditTripTarget] = useState(null)
  const [tripForm, setTripForm] = useState({})

  const openEditTrip = (trip) => {
    const fixedDays = trip.tripDays || trip.nights
      || calcNights(trip.startDate, trip.endDate)
      || 1
    setTripForm({
      tripName:  trip.tripName  || '',
      startDate: trip.startDate ? trip.startDate.slice(0, 10) : '',
      tripDays:  fixedDays,
      notes:     trip.notes     || '',
    })
    setEditTripTarget(trip)
  }

  const saveEditTrip = () => {
    const nights = tripForm.tripDays
    const endDate = (() => {
      if (!tripForm.startDate || !nights) return tripForm.startDate || ''
      const d = new Date(tripForm.startDate)
      d.setDate(d.getDate() + nights - 1)
      return d.toISOString().split('T')[0]
    })()
    const updated = myTrips.map(t =>
      (t.id || t._id) === (editTripTarget.id || editTripTarget._id)
        ? { ...t, tripName: tripForm.tripName, startDate: tripForm.startDate,
            endDate, nights, tripDays: nights, notes: tripForm.notes }
        : t
    )
    setMyTrips(updated)
    localStorage.setItem('myTrips', JSON.stringify(updated))

    // Persist to backend if this trip was fetched from the API
    const dbId = editTripTarget.dbTripId || editTripTarget.id
    const token = localStorage.getItem('token')
    if (dbId && token) {
      fetch(`${API_BASE}/trips/${dbId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title:      tripForm.tripName,
          start_date: tripForm.startDate,
          end_date:   (() => {
            if (!tripForm.startDate || !tripForm.tripDays) return ''
            const d = new Date(tripForm.startDate)
            d.setDate(d.getDate() + tripForm.tripDays - 1)
            return d.toISOString().split('T')[0]
          })(),
          num_days:   tripForm.tripDays,
          notes:      tripForm.notes,
        }),
      }).catch(() => {/* silent — local update already applied */})
    }

    setEditTripTarget(null)
  }

  /* set editingTripId + seed planning localStorage, then go to a planning step */
  const goChangeStep = (trip, to) => {
    localStorage.setItem('editingTripId', String(trip.id || trip._id))
    // Seed destination so planning pages have context
    const frontendDistrictId = trip.districtFrontendId
      || DISTRICT_NAME_TO_ID[trip.destinationName]
      || null
    const minDist = {
      id: frontendDistrictId,
      district_id: trip.destinationId || trip.districtId || null,
      name: trip.destinationName,
      province: trip.provinceName || trip.destinationCity?.replace(' Province', ''),
      image: trip.destinationImage,
    }
    localStorage.setItem('selectedDistrict', JSON.stringify(minDist))
    // Seed places so district-explore page restores selections
    if (Array.isArray(trip.selectedPlaces) && trip.selectedPlaces.length > 0)
      localStorage.setItem('selectedPlaces', JSON.stringify(trip.selectedPlaces))
    // Seed preferences so budget page knows tripDays etc.
    const prefDays = trip.tripDays || trip.nights || calcNights(trip.startDate, trip.endDate) || 3
    const existingPrefs = (() => { try { return JSON.parse(localStorage.getItem('tripPreferences') || '{}') } catch { return {} } })()
    localStorage.setItem('tripPreferences', JSON.stringify({ ...existingPrefs, days: prefDays }))
    // Seed hotel if skipping to budget or beyond
    if (to !== '/plan-trip' && to !== '/district-explore' && trip.hotelName) {
      localStorage.setItem('selectedHotel', JSON.stringify({
        name: trip.hotelName,
        category: trip.hotelCategory,
        starRating: trip.hotelStars,
        priceRange: { min: trip.hotelPriceMin, currency: trip.hotelPriceCurrency },
      }))
    }
    // Seed budget if going to TripBudget or TripDetails
    if ((to === '/trip-details' || to === '/trip-budget') && trip.totalBudget) {
      localStorage.setItem('tripBudget', JSON.stringify({
        totalBudget: trip.totalBudget,
        hotelBudget: trip.hotelBudget,
        currency: trip.budgetCurrency || 'LKR',
        tripDays: prefDays,
      }))
    }
    setEditTripTarget(null)
    navigate(to)
  }

  const deleteTrip = (trip) => {
    if (!window.confirm(`Delete "${trip.tripName}"? This cannot be undone.`)) return
    const updated = myTrips.filter(t => (t.id || t._id) !== (trip.id || trip._id))
    setMyTrips(updated)
    localStorage.setItem('myTrips', JSON.stringify(updated))
  }

  /* ── Review edit / delete ── */
  const openEditReview = (review) => {
    setReviewForm({
      rating:         review.rating        || 0,
      title:          review.title         || '',
      comment:        review.comment       || '',
      travelType:     review.travelType    || '',
      wouldRecommend: review.wouldRecommend !== false,
      pros:           Array.isArray(review.pros) ? review.pros.join(', ') : (review.pros || ''),
      cons:           Array.isArray(review.cons) ? review.cons.join(', ') : (review.cons || ''),
      visitDate:      review.visit_date    || '',
    })
    setEditReviewTarget(review)
  }

  const saveEditReview = () => {
    const token = localStorage.getItem('token')
    const rid   = editReviewTarget.review_id || editReviewTarget.id
    const pros  = reviewForm.pros.split(',').map(s => s.trim()).filter(Boolean)
    const cons  = reviewForm.cons.split(',').map(s => s.trim()).filter(Boolean)
    const changes = {
      rating:         reviewForm.rating,
      title:          reviewForm.title,
      comment:        reviewForm.comment,
      travelType:     reviewForm.travelType,
      wouldRecommend: reviewForm.wouldRecommend,
      pros,
      cons,
      visit_date:     reviewForm.visitDate || null,
    }
    // Optimistic update + close
    setMyReviews(prev => prev.map(r =>
      (r.review_id || r.id) === rid ? { ...r, ...changes } : r
    ))
    setEditReviewTarget(null)

    if (String(rid).startsWith('local_')) {
      // Update in every reviews_* localStorage key
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (!k?.startsWith('reviews_')) continue
        try {
          const arr = JSON.parse(localStorage.getItem(k) || '[]')
          const updated = arr.map(r => r.id === rid ? { ...r, ...changes } : r)
          if (updated.some((r, i) => r !== arr[i])) localStorage.setItem(k, JSON.stringify(updated))
        } catch { /* skip */ }
      }
      window.dispatchEvent(new CustomEvent('reviewsUpdated'))
      return
    }

    fetch(`${API_BASE}/reviews/${rid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(changes),
    })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json?.success) {
          setMyReviews(prev => prev.map(r =>
            (r.review_id || r.id) === rid ? { ...r, ...json.data } : r
          ))
          window.dispatchEvent(new CustomEvent('reviewsUpdated'))
        }
      })
      .catch(() => {})
  }

  const deleteReview = (review) => {
    if (!window.confirm(`Delete your review for "${review.place?.name || review.title || 'this place'}"? This cannot be undone.`)) return
    const token = localStorage.getItem('token')
    const rid   = review.review_id || review.id
    setMyReviews(prev => prev.filter(r => (r.review_id || r.id) !== rid))

    if (String(rid).startsWith('local_')) {
      // Remove from every reviews_* localStorage key
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (!k?.startsWith('reviews_')) continue
        try {
          const arr = JSON.parse(localStorage.getItem(k) || '[]')
          const filtered = arr.filter(r => r.id !== rid)
          if (filtered.length !== arr.length) localStorage.setItem(k, JSON.stringify(filtered))
        } catch { /* skip */ }
      }
      window.dispatchEvent(new CustomEvent('reviewsUpdated'))
      return
    }

    fetch(`${API_BASE}/reviews/${rid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => window.dispatchEvent(new CustomEvent('reviewsUpdated')))
      .catch(() => {})
  }

  /* ── Expense edit / delete ── */
  const openEditExpense = (exp) => {
    setExpenseForm({
      description: exp.description || '',
      amount: String(exp.amount || ''),
      currency: exp.currency || 'LKR',
      category: exp.category || 'other',
      date: exp.date ? exp.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    })
    setEditExpenseTarget(exp)
  }

  const saveEditExpense = () => {
    const updated = {
      ...editExpenseTarget,
      description: expenseForm.description,
      amount: parseFloat(expenseForm.amount) || 0,
      currency: expenseForm.currency,
      category: expenseForm.category,
      date: expenseForm.date,
    }
    setAllExpenses(prev => prev.map(e => String(e.id) === String(editExpenseTarget.id) ? updated : e))

    // Update local storage
    const tripId = editExpenseTarget.tripId || 'standalone'
    const lsKey  = `expenses_trip_${tripId}`
    try {
      const stored = JSON.parse(localStorage.getItem(lsKey) || '[]')
      localStorage.setItem(lsKey, JSON.stringify(
        stored.map(e => String(e.id) === String(editExpenseTarget.id) ? { ...e, ...updated } : e)
      ))
    } catch {}

    // Persist to backend
    const token = localStorage.getItem('token')
    const eid   = editExpenseTarget.id
    if (eid && !String(eid).startsWith('local_') && token) {
      fetch(`${API_BASE}/expenses/${eid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          note: expenseForm.description,
          amount: parseFloat(expenseForm.amount) || 0,
          currency: expenseForm.currency,
          expense_date: expenseForm.date,
        }),
      }).catch(() => {})
    }
    setEditExpenseTarget(null)
  }

  const deleteExpense = (exp) => {
    if (!window.confirm(`Delete "${exp.description || 'this expense'}"? This cannot be undone.`)) return
    setAllExpenses(prev => prev.filter(e => String(e.id) !== String(exp.id)))

    // Remove from local storage
    const tripId = exp.tripId || 'standalone'
    const lsKey  = `expenses_trip_${tripId}`
    try {
      const stored = JSON.parse(localStorage.getItem(lsKey) || '[]')
      localStorage.setItem(lsKey, JSON.stringify(stored.filter(e => String(e.id) !== String(exp.id))))
    } catch {}

    // Delete from backend
    const token = localStorage.getItem('token')
    const eid   = exp.id
    if (eid && !String(eid).startsWith('local_') && token) {
      fetch(`${API_BASE}/expenses/${eid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
  }

  const displayTrips = myTrips

  return (
    <div className="db-page" data-theme={theme}>

      {/* ══ NAV ══ */}
      <nav className="dashboard-nav glass-nav">
        <div className="nav-container">
          <button className="logo" onClick={() => navigate('/dashboard')} style={{background:'none',border:'none',cursor:'pointer',padding:0}}><TGLogo /><span>TravelGenie</span></button>

          <button className="menu-toggle" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
            <span className={`hamburger ${menuOpen ? 'open' : ''}`} />
          </button>

          <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
            <li><Link to="/plan-trip">Plan a Trip</Link></li>
            <li><Link to="/profile">Profile</Link></li>
          </ul>

          <div className="nav-actions">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'light' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              )}
            </button>
            <button className="btn-logout" onClick={handleLogout}>Log Out</button>
          </div>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <header className="db-hero">
        <div className="db-hero-deco" aria-hidden="true" />
        <div className="db-hero-inner">
          <div className="db-avatar">
            {user.avatar
              ? <img src={user.avatar} alt={user.name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} />
              : (initials(user.name) || '👤')
            }
          </div>
          <div className="db-hero-text">
            <p className="db-eyebrow">Welcome back 👋</p>
            <h1 className="db-hero-name">{user.name}</h1>
            <div className="db-hero-meta">
              {user.email && <span>{user.email}</span>}
              {user.travelStyle && <><span className="db-dot">·</span><span className="db-style-pill">{user.travelStyle} Traveller</span></>}
              <span className="db-dot">·</span>
              <span>Since {user.joinDate}</span>
            </div>
            {user.interests.length > 0 && (
              <div className="db-interests">
                {user.interests.slice(0, 6).map(i => <span key={i} className="db-interest-chip">{i}</span>)}
                {user.interests.length > 6 && <span className="db-interest-chip">+{user.interests.length - 6}</span>}
              </div>
            )}
          </div>
          <Link to="/plan-trip" className="db-hero-cta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:18,height:18}}>
              <path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            Plan a Trip
          </Link>
        </div>
      </header>

      {/* ══ BODY ══ */}
      <div className="db-body">

        {/* Main grid */}
        <div className="db-grid">

          {/* LEFT */}
          <div className="db-left">

            {/* Stats */}
            <div className="db-stats-section">
              {/* Row 1 – counts */}
              <div className="db-stats-counts">
                {countStats.map((s, i) => (
                  <div key={i} className="db-stat-card db-stat-card--count">
                    <div className="db-stat-ico" style={{ background: `${s.color}15`, color: s.color }}>
                      {s.icon}
                    </div>
                    <div className="db-stat-val">{s.value}</div>
                    <div className="db-stat-lbl">{s.label}</div>
                  </div>
                ))}
              </div>
              {/* Row 2 – money */}
              <div className="db-stats-money">
                {moneyStats.map((s, i) => (
                  <div key={i} className="db-stat-card db-stat-card--money">
                    <div className="db-stat-ico" style={{ background: `${s.color}15`, color: s.color }}>
                      {s.icon}
                    </div>
                    <div className="db-stat-info">
                      <div className="db-stat-val">{s.value}</div>
                      <div className="db-stat-lbl">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Trips */}
            <section className="db-section">
              <div className="db-sec-hdr">
                <h2 className="db-sec-title">
                  <span>✈️</span> Trips
                  <span className="db-badge">{displayTrips.length}</span>
                </h2>
                <Link to="/plan-trip" className="db-sec-link">+ New Trip</Link>
              </div>

              <div className="db-trips">
                {displayTrips.length === 0 ? (
                  <div className="db-saved-empty">
                    <span className="db-saved-empty-icon">✈️</span>
                    <p>No trips yet!</p>
                    <p className="db-saved-empty-sub">Start planning your next Sri Lankan adventure.</p>
                    <Link to="/plan-trip" className="db-saved-empty-cta">Plan a Trip</Link>
                  </div>
                ) : displayTrips.map((trip, i) => {
                  const n = calcNights(trip.startDate, trip.endDate)
                  const todayStr = new Date().toISOString().split('T')[0]
                  const startStr = trip.startDate ? trip.startDate.slice(0, 10) : null
                  const endStr   = trip.endDate   ? trip.endDate.slice(0, 10)   : null
                  const tripStatus = !startStr ? 'upcoming'
                    : todayStr < startStr ? 'upcoming'
                    : endStr && todayStr > endStr ? 'past'
                    : 'ongoing'
                  const statusLabel = tripStatus === 'ongoing' ? 'Ongoing'
                    : tripStatus === 'past' ? 'Completed' : 'Upcoming'
                  const daysUntil = startStr ? Math.ceil((new Date(startStr) - new Date(todayStr)) / 86400000) : null
                  return (
                    <div key={trip.id || i} className={`db-trip-card db-trip-card--${tripStatus}`}>
                      {/* image area — clickable to open detail */}
                      <div className="db-tc-img" onClick={() => setViewTripTarget(trip)} style={{cursor:'pointer'}}>
                        <img
                          src={trip.destinationImage || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80'}
                          alt={trip.destinationName}
                          onError={e => { e.target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80' }}
                        />
                        <div className="db-tc-img-overlay" />
                        <span className={`db-tc-badge db-tc-badge--${tripStatus}`}>{statusLabel}</span>
                        {tripStatus === 'upcoming' && daysUntil !== null && daysUntil >= 0 && (
                          <span className="db-tc-countdown">{daysUntil === 0 ? 'Today!' : `In ${daysUntil}d`}</span>
                        )}
                      </div>

                      {/* content area — clickable to open detail */}
                      <div className="db-tc-body" onClick={() => setViewTripTarget(trip)} style={{cursor:'pointer'}}>
                        <h3 className="db-tc-name">{trip.tripName}</h3>
                        <p className="db-tc-dest">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          {trip.destinationName}{trip.destinationCity ? `, ${trip.destinationCity}` : ''}
                        </p>

                        <div className="db-tc-stats">
                          {trip.startDate && (
                            <div className="db-tc-stat">
                              <span className="db-tc-stat-lbl">Start</span>
                              <span className="db-tc-stat-val">{formatDate(trip.startDate)}</span>
                            </div>
                          )}
                          {trip.endDate && (
                            <div className="db-tc-stat">
                              <span className="db-tc-stat-lbl">End</span>
                              <span className="db-tc-stat-val">{formatDate(trip.endDate)}</span>
                            </div>
                          )}
                          {trip.travelers && (
                            <div className="db-tc-stat">
                              <span className="db-tc-stat-lbl">Travellers</span>
                              <span className="db-tc-stat-val">{trip.travelers}</span>
                            </div>
                          )}
                        </div>

                        <div className="db-tc-chips-row">
                          {n > 0 && <span className="db-tc-style-chip">🗓️ {n} {n === 1 ? 'day' : 'days'}</span>}
                          {trip.travelStyle && (
                            <span className="db-tc-style-chip">{trip.travelStyle}</span>
                          )}
                        </div>
                        <span className="db-tc-view-hint">Tap to view details →</span>
                      </div>

                      {/* footer actions */}
                      {myTrips.length > 0 && (
                        <div className="db-tc-footer">
                          {(tripStatus === 'upcoming' || tripStatus === 'ongoing') && (
                            <>
                              <button className="db-tc-btn db-tc-btn--edit" onClick={() => openEditTrip(trip)}>✏️ Edit</button>
                              <button className="db-tc-btn db-tc-btn--delete" onClick={() => deleteTrip(trip)}>🗑</button>
                            </>
                          )}
                          {tripStatus === 'past' && (
                            <>
                              <span className="db-tc-no-edit">✅ Completed</span>
                              <button className="db-tc-btn db-tc-btn--delete" onClick={() => deleteTrip(trip)}>🗑</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Spending Summary */}
            <section className="db-section">
              <div className="db-sec-hdr">
                <h2 className="db-sec-title"><span>💸</span> Spending Summary</h2>
                <div className="db-currency-pills">
                  {DISPLAY_CURRENCIES.map(c => (
                    <button
                      key={c.code}
                      className={`db-currency-pill${displayCurrency === c.code ? ' active' : ''}`}
                      onClick={() => setDisplayCurrency(c.code)}
                    >
                      <span className="db-cp-flag">{c.flag}</span>
                      <span className="db-cp-code">{c.code}</span>
                    </button>
                  ))}
                </div>
                <Link to="/expenses" className="db-sec-link">View All →</Link>
              </div>

              {allExpenses.length === 0 ? (
                <div className="db-ew-empty">
                  <p>No expenses recorded yet.</p>
                  <Link to="/expenses" className="db-ew-cta">+ Add your first expense</Link>
                </div>
              ) : (
                <>
                  {/* Total + count */}
                  <div className="db-ew-total">
                    <span className="db-ew-amt">{expSym}{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="db-ew-lbl">total across {allExpenses.length} expense{allExpenses.length !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Budget bar */}
                  {totalBudget > 0 && (
                    <div className="db-ew-budget-bar">
                      {budgetUsedPct !== null ? (
                        <>
                          <div className="db-ew-bar-track">
                            <div
                              className={`db-ew-bar-fill${budgetUsedPct >= 100 ? ' over' : budgetUsedPct >= 90 ? ' warn' : ''}`}
                              style={{ width: `${budgetUsedPct}%` }}
                            />
                          </div>
                          <span className="db-ew-bar-pct">{budgetUsedPct}% of {fmtAmt(totalBudget, displayCurrency)} budget used</span>
                        </>
                      ) : (
                        <span className="db-ew-bar-pct">Budget: {fmtAmt(totalBudget, displayCurrency)} · Spent: {fmtAmt(totalSpent, displayCurrency)}</span>
                      )}
                    </div>
                  )}

                  {/* Per-trip breakdown */}
                  <div className="db-ew-section-label">By Trip Plan</div>
                  <div className="db-ew-trips">
                    {spendingByTrip.map(t => (
                      <div key={t.tripId} className="db-ew-trip-row">
                        <div className="db-ew-trip-info">
                          <span className="db-ew-trip-name">✈️ {t.tripName}</span>
                          <span className="db-ew-trip-count">{t.count} expense{t.count !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="db-ew-trip-right">
                          <div className="db-ew-trip-bar-track">
                            <div className="db-ew-trip-bar-fill" style={{ width: `${Math.round(t.total / totalSpent * 100)}%` }} />
                          </div>
                          <span className="db-ew-trip-amt">{expSym}{t.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Top categories */}
                  <div className="db-ew-section-label">By Category</div>
                  <div className="db-ew-cats">
                    {spendingByCategory.map(c => (
                      <div key={c.id} className="db-ew-cat-row">
                        <span className="db-ew-cat-icon">{c.icon}</span>
                        <span className="db-ew-cat-name">{c.id.charAt(0).toUpperCase() + c.id.slice(1)}</span>
                        <div className="db-ew-cat-bar">
                          <div
                            className="db-ew-cat-fill"
                            style={{ width: `${Math.round(c.value / totalSpent * 100)}%`, background: c.color }}
                          />
                        </div>
                        <span className="db-ew-cat-amt">{expSym}{c.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                    ))}
                  </div>

                  {/* ── Recent Expenses list with edit / delete ── */}
                  <div className="db-ew-section-label">Recent Expenses</div>
                  <div className="db-ew-list">
                    {[...allExpenses]
                      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
                      .slice(0, showAllExpenses ? allExpenses.length : 5)
                      .map(exp => {
                        const cat = CAT_MAP_DB[exp.category] || { icon: '📦', color: '#6b7280' }
                        const tripLabel = (() => {
                          if (!exp.tripId || exp.tripId === 'standalone') return ''
                          const t = myTrips.find(t => String(t.id || t._id) === String(exp.tripId))
                          return t ? ` · ${t.tripName || t.destinationName}` : ''
                        })()
                        return (
                          <div key={exp.id} className="db-ew-row">
                            <span className="db-ew-row-ico" style={{ background: `${cat.color}20`, color: cat.color }}>{cat.icon}</span>
                            <div className="db-ew-row-info">
                              <span className="db-ew-row-desc">{exp.description || exp.category || 'Expense'}</span>
                              <span className="db-ew-row-meta">
                                {exp.date ? new Date(exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}{tripLabel}
                              </span>
                            </div>
                            <div className="db-ew-row-right">
                              <span className="db-ew-row-amt">{symFor(exp.currency || 'LKR')} {Number(exp.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                              <div className="db-ew-row-actions">
                                <button className="db-ew-row-btn db-ew-row-btn--edit" onClick={() => openEditExpense(exp)} title="Edit expense">✏️</button>
                                <button className="db-ew-row-btn db-ew-row-btn--del" onClick={() => deleteExpense(exp)} title="Delete expense">🗑</button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                  {allExpenses.length > 5 && (
                    <button className="db-ew-show-more" onClick={() => setShowAllExpenses(s => !s)}>
                      {showAllExpenses ? '↑ Show less' : `↓ Show all ${allExpenses.length} expenses`}
                    </button>
                  )}

                  <Link to="/expenses" className="db-ew-manage-btn">Manage Expenses</Link>
                </>
              )}
            </section>

            {/* Recommended For You */}
            <section className="db-section">
              <div className="db-sec-hdr">
                <h2 className="db-sec-title">
                  <span>🎯</span> Recommended For You
                  {recommendedDests.length > 0 && <span className="db-badge">{recommendedDests.length}</span>}
                </h2>
                {recCategories.length > 0 && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #6b7280)' }}>
                    Based on: {recCategories.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}
                  </span>
                )}
              </div>

              {recLoading ? (
                <div className="db-saved-empty">
                  <span className="db-saved-empty-icon">⏳</span>
                  <p>Loading recommendations...</p>
                </div>
              ) : recommendedDests.length === 0 ? (
                <div className="db-saved-empty">
                  <span className="db-saved-empty-icon">🎯</span>
                  <p>No recommendations yet.</p>
                  <p className="db-saved-empty-sub">
                    Update your travel style and interests in your <Link to="/profile" style={{ color: '#0E7C5F', textDecoration: 'underline' }}>Profile</Link> to get personalized suggestions.
                  </p>
                </div>
              ) : (
                <div className="db-saved-grid">
                  {recommendedDests.map(dest => {
                    const img = dest.images?.[0]?.image_url
                      || (dest.type && TYPE_IMAGES[dest.type])
                      || TYPE_IMAGES.Heritage
                    const TYPE_EMOJIS_MAP = {
                      Temple: '🛕', Beach: '🏖️', Nature: '🌿', Heritage: '🏛️',
                      Museum: '🏛️', Safari: '🐘', Wildlife: '🦁', Garden: '🌸',
                      Lake: '🏞️', Market: '🛍️', Viewpoint: '🏔️', Culture: '🎭',
                      Adventure: '🧗', Park: '🌳', Shopping: '🛍️', 'Theme Park': '🎢',
                    }
                    return (
                      <div key={dest.place_id} className="db-saved-card">
                        <div className="db-saved-img">
                          <img src={img} alt={dest.name} onError={e => { e.target.src = TYPE_IMAGES.Heritage }} />
                          <span className="db-saved-icon">
                            {TYPE_EMOJIS_MAP[dest.type] || '📍'}
                          </span>
                        </div>
                        <div className="db-saved-body">
                          <div className="db-saved-meta">
                            <span className="db-saved-cat">{dest.type || ''}</span>
                            {dest.district && (
                              <span className="db-saved-province">
                                {dest.district.name}{dest.district.province ? `, ${dest.district.province}` : ''}
                              </span>
                            )}
                          </div>
                          <h4 className="db-saved-name">{dest.name}</h4>
                          {dest.description && <p className="db-saved-desc">{dest.description.length > 80 ? dest.description.slice(0, 80) + '...' : dest.description}</p>}
                          <div className="db-saved-footer">
                            {dest.rating > 0 && <span className="db-saved-tours">⭐ {dest.rating.toFixed(1)}</span>}
                            {dest.duration && <span className="db-saved-tours">🕐 {dest.duration}</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Saved Destinations */}
            <section className="db-section">
              <div className="db-sec-hdr">
                <h2 className="db-sec-title">
                  <span>❤️</span> Saved Destinations
                  {savedDests.length > 0 && <span className="db-badge">{savedDests.length}</span>}
                </h2>
                <Link to="/plan-trip" className="db-sec-link">Explore Destinations</Link>
              </div>

              {savedDests.length === 0 ? (
                <div className="db-saved-empty">
                  <span className="db-saved-empty-icon">🗺️</span>
                  <p>No saved destinations yet.</p>
                  <p className="db-saved-empty-sub">Tap the 🤍 heart on any place while browsing districts, or on the home map.</p>
                  <Link to="/plan-trip" className="db-saved-empty-cta">Browse Places</Link>
                </div>
              ) : (
                <div className="db-saved-grid">
                  {savedDests.map((d) => (
                    <div key={d.id} className="db-saved-card">
                      <div className="db-saved-img">
                        <img src={d.image} alt={d.name} onError={e => { e.target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80' }} />
                        <button className="db-heart active" onClick={() => removeSaved(d.id)} title="Remove from saved">❤️</button>
                        <span className="db-saved-icon">{d.icon}</span>
                      </div>
                      <div className="db-saved-body">
                        <div className="db-saved-meta">
                          <span className="db-saved-cat">{d.category}</span>
                          {(d.districtName || d.province) && (
                            <span className="db-saved-province">
                              {d.districtName ? `${d.districtName}${d.province ? `, ${d.province}` : ''}` : d.province}
                            </span>
                          )}
                        </div>
                        <h4 className="db-saved-name">{d.name}</h4>
                        {d.description && <p className="db-saved-desc">{d.description}</p>}
                        <div className="db-saved-footer">
                          {d.details && <span className="db-saved-tours">⏱ {d.details.replace('Duration: ', '')}</span>}
                          {d.tours && <span className="db-saved-tours">🎯 {d.tours} tours</span>}
                          <button className="db-saved-cta" onClick={() => goToSavedPlace(d)}>Go to Place →</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* My Reviews */}
            <section className="db-section">
              <div className="db-sec-hdr">
                <h2 className="db-sec-title">
                  <span>⭐</span> My Reviews
                  {myReviews.length > 0 && <span className="db-badge">{myReviews.length}</span>}
                </h2>
                <Link to="/plan-trip" className="db-sec-link">Write a Review</Link>
              </div>

              {myReviews.length === 0 ? (
                <div className="db-saved-empty">
                  <span className="db-saved-empty-icon">⭐</span>
                  <p>No reviews yet.</p>
                  <p className="db-saved-empty-sub">Visit a place and share your experience!</p>
                  <Link to="/plan-trip" className="db-saved-empty-cta">Explore Places</Link>
                </div>
              ) : (
                <>
                {/* ── Place Reviews sub-section ── */}
                {(() => {
                  const placeReviews = myReviews.filter(r => r.targetType !== 'hotel')
                  if (placeReviews.length === 0) return null
                  return (
                    <>
                      <div className="db-reviews-subsec-hdr">
                        <span className="db-reviews-subsec-icon">📍</span>
                        <span className="db-reviews-subsec-title">Place Reviews</span>
                        <span className="db-reviews-subsec-count">{placeReviews.length}</span>
                      </div>
                      <div className="db-reviews-list">
                        {placeReviews.map(review => {
                    const rid = review.review_id || review.id
                    const placeName   = review.place?.name     || review.placeName    || 'Unknown Place'
                    const district    = review.place?.district?.name || review.districtName || ''
                    const _rawDate  = review.createdAt || review.date
                    const dateStr   = _rawDate
                      ? new Date(_rawDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : ''
                    const visitDateStr = review.visit_date
                      ? new Date(review.visit_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : ''
                    const travelIcons = { solo:'🧳', couple:'👑', family:'👨‍👩‍👧', friends:'👫', business:'💼' }
                    const ratingLabel = ['','Poor','Fair','Good','Very Good','Excellent'][review.rating] || ''
                    const pros = Array.isArray(review.pros) ? review.pros : (review.pros || '').split(',').map(s=>s.trim()).filter(Boolean)
                    const cons = Array.isArray(review.cons) ? review.cons : (review.cons || '').split(',').map(s=>s.trim()).filter(Boolean)
                    return (
                      <div key={rid} className="db-rv-card">
                        {/* ── Card Top Bar ── */}
                        <div className="db-rv-topbar">
                          <div className="db-rv-place">
                            <span className="db-rv-place-icon">📍</span>
                            <div className="db-rv-place-info">
                              <span className="db-rv-place-name">{placeName}</span>
                              {district && <span className="db-rv-district">📌 {district}</span>}
                            </div>
                          </div>
                          <div className="db-rv-topbar-right">
                            <div className="db-rv-rating-pill">
                              <span className="db-rv-rating-star">★</span>
                              <span className="db-rv-rating-val">{review.rating}.0</span>
                            </div>
                            <div className="db-rv-actions">
                              <button className="db-rv-btn db-rv-btn--edit" onClick={() => openEditReview(review)} title="Edit review">✏️</button>
                              <button className="db-rv-btn db-rv-btn--del" onClick={() => deleteReview(review)} title="Delete review">🗑️</button>
                            </div>
                          </div>
                        </div>

                        {/* ── Stars + dates ── */}
                        <div className="db-rv-stars-row">
                          <div className="db-rv-stars">
                            {[1,2,3,4,5].map(i => (
                              <span key={i} className={`db-rv-star${i <= review.rating ? ' on' : ''}`}>★</span>
                            ))}
                            {ratingLabel && <span className="db-rv-rating-label">{ratingLabel}</span>}
                          </div>
                          <div className="db-rv-dates-group">
                            {visitDateStr && <span className="db-rv-visit-date">📅 {visitDateStr}</span>}
                            {dateStr && <span className="db-rv-posted-date">Posted {dateStr}</span>}
                          </div>
                        </div>

                        {/* ── Title + Comment ── */}
                        {review.title && <p className="db-rv-title">"{review.title}"</p>}
                        {review.comment && <p className="db-rv-comment">{review.comment}</p>}

                        {/* ── Pros / Cons ── */}
                        {(pros.length > 0 || cons.length > 0) && (
                          <div className="db-rv-pros-cons">
                            {pros.length > 0 && (
                              <div className="db-rv-pc-row">
                                <span className="db-rv-pc-label pro">✅ Loved It</span>
                                <div className="db-rv-pc-tags">
                                  {pros.map((p,i) => <span key={i} className="db-rv-tag db-rv-tag--pro">{p}</span>)}
                                </div>
                              </div>
                            )}
                            {cons.length > 0 && (
                              <div className="db-rv-pc-row">
                                <span className="db-rv-pc-label con">⚠️ Watch Out</span>
                                <div className="db-rv-pc-tags">
                                  {cons.map((c,i) => <span key={i} className="db-rv-tag db-rv-tag--con">{c}</span>)}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── Meta footer ── */}
                        <div className="db-rv-footer">
                          {review.travelType && (
                            <span className="db-rv-travel-badge">{travelIcons[review.travelType] || ''} {review.travelType}</span>
                          )}
                          {review.wouldRecommend !== undefined && (
                            <span className={`db-rv-rec-badge${review.wouldRecommend ? ' yes' : ' no'}`}>
                              {review.wouldRecommend ? '👍 Recommends' : '👎 Not recommended'}
                            </span>
                          )}
                          {review.status === 'pending' && <span className="db-rv-pending">⏳ Pending</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()}

          {/* ── Hotel Reviews sub-section ── */}
          {(() => {
            const hotelReviews = myReviews.filter(r => r.targetType === 'hotel')
            if (hotelReviews.length === 0) return null
            return (
              <>
                <div className="db-reviews-subsec-hdr db-reviews-subsec-hdr--hotel">
                  <span className="db-reviews-subsec-icon">🏨</span>
                  <span className="db-reviews-subsec-title">Hotel Reviews</span>
                  <span className="db-reviews-subsec-count">{hotelReviews.length}</span>
                </div>
                <div className="db-reviews-list">
                  {hotelReviews.map(review => {
                    const rid = review.review_id || review.id
                    const hotelName   = review.place?.name || review.placeName || 'Unknown Hotel'
                    const district    = review.place?.district?.name || review.districtName || ''
                    const _rawDate  = review.createdAt || review.date
                    const dateStr   = _rawDate
                      ? new Date(_rawDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : ''
                    const visitDateStr = review.visit_date
                      ? new Date(review.visit_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : ''
                    const travelIcons = { solo:'🧳', couple:'👑', family:'👨‍👩‍👧', friends:'👫', business:'💼' }
                    const ratingLabel = ['','Poor','Fair','Good','Very Good','Excellent'][review.rating] || ''
                    const pros = Array.isArray(review.pros) ? review.pros : (review.pros || '').split(',').map(s=>s.trim()).filter(Boolean)
                    const cons = Array.isArray(review.cons) ? review.cons : (review.cons || '').split(',').map(s=>s.trim()).filter(Boolean)
                    return (
                      <div key={rid} className="db-rv-card db-rv-card--hotel">
                        {/* ── Card Top Bar ── */}
                        <div className="db-rv-topbar">
                          <div className="db-rv-place">
                            <span className="db-rv-place-icon">🏨</span>
                            <div className="db-rv-place-info">
                              <span className="db-rv-place-name">{hotelName}</span>
                              {district && <span className="db-rv-district">📌 {district}</span>}
                            </div>
                          </div>
                          <div className="db-rv-topbar-right">
                            <div className="db-rv-rating-pill db-rv-rating-pill--hotel">
                              <span className="db-rv-rating-star">★</span>
                              <span className="db-rv-rating-val">{review.rating}.0</span>
                            </div>
                            <div className="db-rv-actions">
                              <button className="db-rv-btn db-rv-btn--edit" onClick={() => openEditReview(review)} title="Edit review">✏️</button>
                              <button className="db-rv-btn db-rv-btn--del" onClick={() => deleteReview(review)} title="Delete review">🗑️</button>
                            </div>
                          </div>
                        </div>

                        {/* ── Stars + dates ── */}
                        <div className="db-rv-stars-row">
                          <div className="db-rv-stars">
                            {[1,2,3,4,5].map(i => (
                              <span key={i} className={`db-rv-star${i <= review.rating ? ' on' : ''}`}>★</span>
                            ))}
                            {ratingLabel && <span className="db-rv-rating-label">{ratingLabel}</span>}
                          </div>
                          <div className="db-rv-dates-group">
                            {visitDateStr && <span className="db-rv-visit-date">📅 {visitDateStr}</span>}
                            {dateStr && <span className="db-rv-posted-date">Posted {dateStr}</span>}
                          </div>
                        </div>

                        {/* ── Title + Comment ── */}
                        {review.title && <p className="db-rv-title">"{review.title}"</p>}
                        {review.comment && <p className="db-rv-comment">{review.comment}</p>}

                        {/* ── Pros / Cons ── */}
                        {(pros.length > 0 || cons.length > 0) && (
                          <div className="db-rv-pros-cons">
                            {pros.length > 0 && (
                              <div className="db-rv-pc-row">
                                <span className="db-rv-pc-label pro">✅ Loved It</span>
                                <div className="db-rv-pc-tags">
                                  {pros.map((p,i) => <span key={i} className="db-rv-tag db-rv-tag--pro">{p}</span>)}
                                </div>
                              </div>
                            )}
                            {cons.length > 0 && (
                              <div className="db-rv-pc-row">
                                <span className="db-rv-pc-label con">⚠️ Watch Out</span>
                                <div className="db-rv-pc-tags">
                                  {cons.map((c,i) => <span key={i} className="db-rv-tag db-rv-tag--con">{c}</span>)}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── Meta footer ── */}
                        <div className="db-rv-footer">
                          {review.travelType && (
                            <span className="db-rv-travel-badge">{travelIcons[review.travelType] || ''} {review.travelType}</span>
                          )}
                          {review.wouldRecommend !== undefined && (
                            <span className={`db-rv-rec-badge${review.wouldRecommend ? ' yes' : ' no'}`}>
                              {review.wouldRecommend ? '👍 Recommends' : '👎 Not recommended'}
                            </span>
                          )}
                          {review.status === 'pending' && <span className="db-rv-pending">⏳ Pending</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()}
          </>
        )}
            </section>
          </div>

          {/* RIGHT sidebar */}
          <aside className="db-right">

            {/* Profile card */}
            <div className="db-profile-card">
              <div className="db-profile-av">
                {user.avatar
                  ? <img src={user.avatar} alt={user.name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} />
                  : (initials(user.name) || '👤')
                }
              </div>
              <h3 className="db-profile-name">{user.name}</h3>
              {user.travelStyle && <span className="db-profile-pill">{user.travelStyle}</span>}
              <div className="db-profile-rows">
                {user.email && (
                  <div className="db-prow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:15,height:15,flexShrink:0}}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <span>{user.email}</span>
                  </div>
                )}
                {user.phone && (
                  <div className="db-prow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:15,height:15,flexShrink:0}}>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.1 6.1l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    <span>{user.phone}</span>
                  </div>
                )}
                <div className="db-prow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:15,height:15,flexShrink:0}}>
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>Since {user.joinDate}</span>
                </div>
              </div>
              <Link to="/profile" className="db-edit-btn">Edit Profile</Link>
            </div>

            {/* Quick Actions */}
            <div className="db-quick-card">
              <h3 className="db-quick-title">Quick Actions</h3>
              <div className="db-quick-list">
                {[
                  { icon: '🗺️', bg: '#0E7C5F1A', name: 'Browse Destinations', sub: 'Find your next trip',       as: 'link', to: '/plan-trip' },
                  { icon: '💰', bg: '#3b82f61A', name: 'Track Expenses',      sub: 'Budget & spending tracker', as: 'link', to: '/expenses' },
                  { icon: '⚙️', bg: '#8b5cf61A', name: 'Account Settings',    sub: 'Manage your profile',      as: 'link', to: '/profile' },
                  { icon: '⭐', bg: '#F5C8421A', name: 'Write a Review',       sub: 'Pick a destination first', as: 'link', to: '/plan-trip' },
                ].map((item, i) => {
                  const inner = (
                    <>
                      <span className="db-qi-ico" style={{ background: item.bg }}>{item.icon}</span>
                      <div className="db-qi-text">
                        <p className="db-qi-name">{item.name}</p>
                        <p className="db-qi-sub">{item.sub}</p>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:16,height:16,flexShrink:0,color:'#CBD5E1'}}>
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </>
                  )
                  return item.as === 'link'
                    ? <Link key={i} to={item.to} className="db-qi">{inner}</Link>
                    : <div key={i} className="db-qi">{inner}</div>
                })}
              </div>
            </div>

            {/* Nudge */}
            <div className="db-nudge">
              <span className="db-nudge-icon">🌴</span>
              <h4>Plan Your Next Journey</h4>
              <p>50+ hand-picked Sri Lankan destinations await.</p>
              <Link to="/plan-trip" className="db-nudge-btn">Explore Now</Link>
            </div>
          </aside>
        </div>
      </div>

      {viewTripTarget && (() => {
        const vt = viewTripTarget
        const dn = calcNights(vt.startDate, vt.endDate)
        const todayStr = new Date().toISOString().split('T')[0]
        const startStr = vt.startDate ? vt.startDate.slice(0,10) : null
        const endStr   = vt.endDate   ? vt.endDate.slice(0,10)   : null
        const vtStatus = !startStr ? 'upcoming'
          : todayStr < startStr ? 'upcoming'
          : endStr && todayStr > endStr ? 'past' : 'ongoing'
        const CURRENCY_SYM = { LKR:'Rs', USD:'$', EUR:'€', GBP:'£' }
        const sym = CURRENCY_SYM[vt.budgetCurrency] || ''
        return (
          <div className="db-modal-overlay" onClick={() => setViewTripTarget(null)}>
            <div className="db-detail-modal" onClick={e => e.stopPropagation()}>

              {/* Hero image */}
              <div className="db-detail-hero">
                <img
                  src={vt.destinationImage || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80'}
                  alt={vt.destinationName}
                  onError={e => { e.target.src='https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80' }}
                />
                <div className="db-detail-hero-overlay" />
                <div className="db-detail-hero-content">
                  <span className={`db-tc-badge db-tc-badge--${vtStatus}`}>
                    {vtStatus === 'ongoing' ? 'Ongoing' : vtStatus === 'past' ? 'Completed' : 'Upcoming'}
                  </span>
                  <h2 className="db-detail-title">{vt.tripName}</h2>
                  <p className="db-detail-dest">
                    📍 {vt.destinationName}{vt.destinationCity ? `, ${vt.destinationCity}` : ''}
                    {vt.provinceName ? ` · ${vt.provinceName}` : ''}
                  </p>
                </div>
                <button className="db-modal-close db-detail-close" onClick={() => setViewTripTarget(null)}>✕</button>
              </div>

              {/* Scrollable body */}
              <div className="db-detail-body">

                {/* Dates */}
                <div className="db-detail-section">
                  <p className="db-detail-sec-title">📅 Trip Dates</p>
                  <div className="db-detail-row-grid">
                    <div className="db-detail-item">
                      <span className="db-detail-lbl">Departure</span>
                      <span className="db-detail-val">{vt.startDate ? formatDate(vt.startDate) : '—'}</span>
                    </div>
                    <div className="db-detail-item">
                      <span className="db-detail-lbl">Return</span>
                      <span className="db-detail-val">{vt.endDate ? formatDate(vt.endDate) : '—'}</span>
                    </div>
                    <div className="db-detail-item">
                      <span className="db-detail-lbl">Duration</span>
                      <span className="db-detail-val">{dn > 0 ? `${dn} ${dn === 1 ? 'day' : 'days'}` : '—'}</span>
                    </div>
                    {vt.travelers && (
                      <div className="db-detail-item">
                        <span className="db-detail-lbl">Travellers</span>
                        <span className="db-detail-val">{vt.travelers}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Places */}
                {Array.isArray(vt.selectedPlaces) && vt.selectedPlaces.length > 0 && (
                  <div className="db-detail-section">
                    <p className="db-detail-sec-title">🏛️ Places to Visit</p>
                    <div className="db-detail-places-grid">
                      {vt.selectedPlaces.map((p, i) => (
                        <div key={p.id || p.place_id || i} className="db-detail-place-card">
                          <div className="db-detail-place-img">
                            <img src={placeImage(p)} alt={p.name || p.place_name || p}
                              onError={e => { e.target.src = TYPE_IMAGES.Heritage }} />
                          </div>
                          <span className="db-detail-place-name">{p.name || p.place_name || p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hotel */}
                <div className="db-detail-section">
                  <p className="db-detail-sec-title">🏨 Accommodation</p>
                  {vt.hotelName ? (
                    <>
                      <div className="db-detail-hotel-img">
                        <img src={hotelImage(vt.hotelCategory)} alt={vt.hotelName}
                          onError={e => { e.target.src = HOTEL_IMAGES.default }} />
                        <span className="db-detail-hotel-name-badge">{vt.hotelName}</span>
                      </div>
                      <div className="db-detail-row-grid" style={{marginTop:'10px'}}>
                        <div className="db-detail-item db-detail-item--wide">
                          <span className="db-detail-lbl">Hotel</span>
                          <span className="db-detail-val">{vt.hotelName}</span>
                        </div>
                        {vt.hotelCategory && (
                          <div className="db-detail-item">
                            <span className="db-detail-lbl">Type</span>
                            <span className="db-detail-val" style={{textTransform:'capitalize'}}>{vt.hotelCategory}</span>
                          </div>
                        )}
                        {vt.hotelStars && (
                          <div className="db-detail-item">
                            <span className="db-detail-lbl">Rating</span>
                            <span className="db-detail-val">{'★'.repeat(vt.hotelStars)}</span>
                          </div>
                        )}
                        {vt.hotelPriceMin && (
                          <div className="db-detail-item">
                            <span className="db-detail-lbl">From / night</span>
                            <span className="db-detail-val">${vt.hotelPriceMin.toLocaleString()} USD</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="db-detail-empty">No hotel selected</p>
                  )}
                </div>

                {/* Budget */}
                <div className="db-detail-section">
                  <p className="db-detail-sec-title">💰 Budget</p>
                  {vt.totalBudget > 0 ? (
                    <div className="db-detail-row-grid">
                      <div className="db-detail-item">
                        <span className="db-detail-lbl">Total</span>
                        <span className="db-detail-val db-detail-val--green">{sym}{Number(vt.totalBudget).toLocaleString()} {vt.budgetCurrency}</span>
                      </div>
                      {vt.hotelBudget > 0 && (
                        <div className="db-detail-item">
                          <span className="db-detail-lbl">Hotel</span>
                          <span className="db-detail-val">{sym}{Number(vt.hotelBudget).toLocaleString()}</span>
                        </div>
                      )}
                      {vt.hotelBudget > 0 && vt.totalBudget > 0 && (
                        <div className="db-detail-item">
                          <span className="db-detail-lbl">Other</span>
                          <span className="db-detail-val">{sym}{(vt.totalBudget - vt.hotelBudget).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="db-detail-empty">No budget set</p>
                  )}
                </div>

                {/* Notes */}
                {vt.notes && (
                  <div className="db-detail-section">
                    <p className="db-detail-sec-title">📝 Notes</p>
                    <p className="db-detail-notes">{vt.notes}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="db-modal-actions">
                <button className="db-modal-cancel" onClick={() => setViewTripTarget(null)}>Close</button>
                {vtStatus === 'upcoming' && (
                  <button className="db-modal-save" onClick={() => { setViewTripTarget(null); openEditTrip(vt) }}>✏️ Edit Trip</button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Edit Review Modal ── */}
      {editReviewTarget && (
        <div className="db-rev-overlay" onClick={() => setEditReviewTarget(null)}>
          <div className="db-rev-modal" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="db-rev-modal-hdr">
              <div className="db-rev-modal-hdr-left">
                <span className="db-rev-modal-icon">✏️</span>
                <div>
                  <h3 className="db-rev-modal-title">Edit Review</h3>
                  <p className="db-rev-modal-place">
                    📍 {editReviewTarget.place?.name || editReviewTarget.placeName || 'Review'}
                    {(editReviewTarget.place?.district?.name || editReviewTarget.districtName)
                      ? ` · ${editReviewTarget.place?.district?.name || editReviewTarget.districtName}`
                      : ''}
                  </p>
                </div>
              </div>
              <button className="db-rev-modal-close" onClick={() => setEditReviewTarget(null)}>✕</button>
            </div>

            <div className="db-rev-modal-body">

              {/* Rating */}
              <div className="db-rev-section">
                <span className="db-rev-section-label">Overall Rating</span>
                <div className="db-rev-star-row">
                  {[1,2,3,4,5].map(i => (
                    <button
                      key={i}
                      type="button"
                      className={`db-rev-star-btn${i <= reviewForm.rating ? ' on' : ''}`}
                      onClick={() => setReviewForm(f => ({ ...f, rating: i }))}
                    >★</button>
                  ))}
                  {reviewForm.rating > 0 && (
                    <span className="db-rev-rating-word">
                      {['','Poor','Fair','Good','Very Good','Excellent'][reviewForm.rating]}
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Comment */}
              <div className="db-rev-section">
                <span className="db-rev-section-label">Your Review</span>
                <input
                  className="db-rev-input"
                  value={reviewForm.title}
                  onChange={e => setReviewForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Title — short summary of your visit"
                />
                <textarea
                  className="db-rev-input db-rev-textarea"
                  rows={4}
                  value={reviewForm.comment}
                  onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                  placeholder="Share what you loved, what could be better, and tips for others…"
                />
              </div>

              {/* Pros + Cons */}
              <div className="db-rev-section">
                <span className="db-rev-section-label">Highlights</span>
                <div className="db-rev-two-col">
                  <div className="db-rev-col">
                    <label className="db-rev-sublabel">✅ Loved It <em>(comma-separated)</em></label>
                    <input
                      className="db-rev-input"
                      value={reviewForm.pros || ''}
                      onChange={e => setReviewForm(f => ({ ...f, pros: e.target.value }))}
                      placeholder="Amazing views, Friendly staff"
                    />
                  </div>
                  <div className="db-rev-col">
                    <label className="db-rev-sublabel">⚠️ Watch Out <em>(comma-separated)</em></label>
                    <input
                      className="db-rev-input"
                      value={reviewForm.cons || ''}
                      onChange={e => setReviewForm(f => ({ ...f, cons: e.target.value }))}
                      placeholder="Gets crowded, Limited parking"
                    />
                  </div>
                </div>
              </div>

              {/* Travel type + Recommend + Date */}
              <div className="db-rev-section">
                <span className="db-rev-section-label">Trip Details</span>
                <div className="db-rev-two-col">
                  <div className="db-rev-col">
                    <label className="db-rev-sublabel">Type of travel</label>
                    <div className="db-rev-pills">
                      {[['solo','🧳'],['couple','👑'],['family','👨‍👩‍👧'],['friends','👫'],['business','💼']].map(([t, icon]) => (
                        <button
                          key={t}
                          type="button"
                          className={`db-rev-pill${reviewForm.travelType === t ? ' active' : ''}`}
                          onClick={() => setReviewForm(f => ({ ...f, travelType: f.travelType === t ? '' : t }))}
                        >{icon} {t}</button>
                      ))}
                    </div>
                  </div>
                  <div className="db-rev-col">
                    <label className="db-rev-sublabel">Would you recommend?</label>
                    <div className="db-rev-rec-toggle">
                      <button
                        type="button"
                        className={`db-rev-rec-btn yes${reviewForm.wouldRecommend ? ' active' : ''}`}
                        onClick={() => setReviewForm(f => ({ ...f, wouldRecommend: true }))}
                      >👍 Yes, recommend</button>
                      <button
                        type="button"
                        className={`db-rev-rec-btn no${!reviewForm.wouldRecommend ? ' active' : ''}`}
                        onClick={() => setReviewForm(f => ({ ...f, wouldRecommend: false }))}
                      >👎 Not really</button>
                    </div>
                    <div style={{marginTop:'12px'}}>
                      <label className="db-rev-sublabel">Date of visit</label>
                      <input
                        type="date"
                        className="db-rev-input"
                        value={reviewForm.visitDate || ''}
                        onChange={e => setReviewForm(f => ({ ...f, visitDate: e.target.value }))}
                        max={new Date().toISOString().split('T')[0]}
                        style={{maxWidth:'180px'}}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="db-rev-modal-footer">
              <button className="db-rev-btn-cancel" onClick={() => setEditReviewTarget(null)}>Cancel</button>
              <button className="db-rev-btn-save" onClick={saveEditReview} disabled={reviewForm.rating === 0}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Expense Modal ── */}
      {editExpenseTarget && (
        <div className="db-modal-overlay" onClick={() => setEditExpenseTarget(null)}>
          <div className="db-modal" onClick={e => e.stopPropagation()}>
            <div className="db-modal-hdr">
              <h3 className="db-modal-title">✏️ Edit Expense</h3>
              <button className="db-modal-close" onClick={() => setEditExpenseTarget(null)}>✕</button>
            </div>
            <div className="db-modal-body">
              <div className="db-modal-field">
                <label className="db-modal-label">Description</label>
                <input
                  className="db-modal-input"
                  value={expenseForm.description}
                  onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What was this for?"
                />
              </div>
              <div className="db-modal-field-row">
                <div className="db-modal-field">
                  <label className="db-modal-label">Amount</label>
                  <input
                    className="db-modal-input"
                    type="number" min="0" step="0.01"
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="db-modal-field">
                  <label className="db-modal-label">Currency</label>
                  <select
                    className="db-modal-input"
                    value={expenseForm.currency}
                    onChange={e => setExpenseForm(f => ({ ...f, currency: e.target.value }))}
                  >
                    {DISPLAY_CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.code} – {c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="db-modal-field">
                <label className="db-modal-label">Category</label>
                <div className="db-modal-cat-grid">
                  {EXPENSE_CATS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className={`db-modal-cat-btn${expenseForm.category === c.id ? ' active' : ''}`}
                      style={expenseForm.category === c.id ? { borderColor: c.color, background: `${c.color}18`, color: c.color } : {}}
                      onClick={() => setExpenseForm(f => ({ ...f, category: c.id }))}
                    >
                      {c.icon} {c.id.charAt(0).toUpperCase() + c.id.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="db-modal-field">
                <label className="db-modal-label">Date</label>
                <input
                  className="db-modal-input"
                  type="date"
                  value={expenseForm.date}
                  onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>
            <div className="db-modal-actions">
              <button className="db-modal-cancel" onClick={() => setEditExpenseTarget(null)}>Cancel</button>
              <button className="db-modal-save" onClick={saveEditExpense}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Trip Modal ── */}
      {editTripTarget && (
        <div className="db-modal-overlay" onClick={() => setEditTripTarget(null)}>
          <div className="db-modal" onClick={e => e.stopPropagation()}>
            <div className="db-modal-hdr">
              <h3 className="db-modal-title">✏️ Edit Trip</h3>
              <button className="db-modal-close" onClick={() => setEditTripTarget(null)}>✕</button>
            </div>
            <div className="db-modal-body">
              {/* Changeable planning items */}
              <div className="db-modal-plan-rows">
                {/* District row */}
                <div className="db-modal-plan-row">
                  <span className="db-modal-plan-ico">🗺️</span>
                  <div className="db-modal-plan-info">
                    <span className="db-modal-plan-lbl">District</span>
                    <span className="db-modal-plan-val">
                      {editTripTarget.destinationName || '—'}
                      {editTripTarget.provinceName ? <span className="db-modal-plan-sub"> · {editTripTarget.provinceName} Province</span> : ''}
                    </span>
                  </div>
                  <button className="db-modal-change-btn" onClick={() => goChangeStep(editTripTarget, '/plan-trip')}>Change →</button>
                </div>
                {/* Places row */}
                <div className="db-modal-plan-row db-modal-plan-row--places">
                  <span className="db-modal-plan-ico">🏛️</span>
                  <div className="db-modal-plan-info">
                    <span className="db-modal-plan-lbl">Places</span>
                    {Array.isArray(editTripTarget.selectedPlaces) && editTripTarget.selectedPlaces.length > 0 ? (
                      <div className="db-modal-places-chips">
                        {editTripTarget.selectedPlaces.map((p, i) => (
                          <span key={p.place_id || p._id || i} className="db-modal-place-chip">
                            {p.name || p.place_name || p}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="db-modal-plan-val"><em>No places selected</em></span>
                    )}
                  </div>
                  <button className="db-modal-change-btn" onClick={() => goChangeStep(editTripTarget, '/district-explore')}>Change →</button>
                </div>
                <div className="db-modal-plan-row">
                  <span className="db-modal-plan-ico">🏨</span>
                  <div className="db-modal-plan-info">
                    <span className="db-modal-plan-lbl">Hotel</span>
                    <span className="db-modal-plan-val">{editTripTarget.hotelName || <em>Not selected</em>}</span>
                  </div>
                  <button className="db-modal-change-btn" onClick={() => goChangeStep(editTripTarget, '/hotel-picker')}>Change →</button>
                </div>
                <div className="db-modal-plan-row">
                  <span className="db-modal-plan-ico">💰</span>
                  <div className="db-modal-plan-info">
                    <span className="db-modal-plan-lbl">Budget</span>
                    <span className="db-modal-plan-val">
                      {editTripTarget.totalBudget > 0
                        ? `${editTripTarget.budgetCurrency || ''} ${Number(editTripTarget.totalBudget).toLocaleString()}`
                        : <em>Not set</em>}
                    </span>
                  </div>
                  <button className="db-modal-change-btn" onClick={() => goChangeStep(editTripTarget, '/trip-budget')}>Change →</button>
                </div>
              </div>

              <div className="db-modal-field">
                <label className="db-modal-label">Trip Name</label>
                <input className="db-modal-input" value={tripForm.tripName} onChange={e => setTripForm(f => ({ ...f, tripName: e.target.value }))} placeholder="My trip name" />
              </div>
              {/* Days stepper — mirrors TripPreferences */}
              <div className="db-modal-field">
                <label className="db-modal-label">Duration</label>
                <div className="db-modal-days-control">
                  <button
                    className="db-modal-days-btn"
                    onClick={() => setTripForm(f => ({ ...f, tripDays: Math.max(1, f.tripDays - 1) }))}
                    disabled={tripForm.tripDays <= 1}
                  >−</button>
                  <div className="db-modal-days-display">
                    <span className="db-modal-days-num">{tripForm.tripDays}</span>
                    <span className="db-modal-days-unit">{tripForm.tripDays === 1 ? 'day' : 'days'}</span>
                  </div>
                  <button
                    className="db-modal-days-btn"
                    onClick={() => setTripForm(f => ({ ...f, tripDays: Math.min(21, f.tripDays + 1) }))}
                    disabled={tripForm.tripDays >= 21}
                  >+</button>
                </div>
              </div>

              {/* Start date only — end date auto-computes */}
              <div className="db-modal-field">
                <label className="db-modal-label">Departure Date</label>
                <input
                  className="db-modal-input"
                  type="date"
                  value={tripForm.startDate}
                  onChange={e => setTripForm(f => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              {tripForm.startDate && tripForm.tripDays > 0 && (() => {
                const d = new Date(tripForm.startDate)
                d.setDate(d.getDate() + tripForm.tripDays - 1)
                return (
                  <p className="db-modal-nights">
                    🗓️ Returns {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )
              })()}
              <div className="db-modal-field">
                <label className="db-modal-label">Notes</label>
                <textarea className="db-modal-input db-modal-textarea" rows={3} value={tripForm.notes} onChange={e => setTripForm(f => ({ ...f, notes: e.target.value }))} placeholder="Special requirements, must-see spots…" />
              </div>
            </div>
            <div className="db-modal-actions">
              <button className="db-modal-cancel" onClick={() => setEditTripTarget(null)}>Cancel</button>
              <button className="db-modal-save" onClick={saveEditTrip}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
