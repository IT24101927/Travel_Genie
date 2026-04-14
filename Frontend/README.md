<div align="center">

# 🖥️ TravelGenie — Frontend

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React Router](https://img.shields.io/badge/React_Router-7-CA4245?style=flat-square&logo=react-router&logoColor=white)](https://reactrouter.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=flat-square&logo=leaflet&logoColor=white)](https://leafletjs.dev/)
[![ESLint](https://img.shields.io/badge/ESLint-9-4B32C3?style=flat-square&logo=eslint&logoColor=white)](https://eslint.org/)

React SPA for the TravelGenie travel planning platform, built with Vite.

[⚙️ Backend Docs](../Backend/README.md) · [🏠 Project Overview](../README.md)

</div>

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | React + Vite | 19 / 7 |
| Routing | React Router (BrowserRouter) | 7 |
| Maps (primary) | react-leaflet + leaflet | 5 / 1.9 |
| Maps (secondary) | @react-google-maps/api | 2.20 |
| State | React `useState` / `useEffect` | — |
| Auth storage | `localStorage` (`token`, `currentUser`) | — |
| Theme | Light / dark toggle via `data-theme`, persisted to `localStorage` | — |

---

## 🆕 Recent Updates (April 2026)

- Budget planner UX was simplified to focus on user actions instead of technical AI details.
- Currency conversion in `TripBudget` now uses a canonical LKR source-of-truth to avoid round-trip drift.
- `TripDetails` now uses saved adjusted split data (`dailySplit`) for budget breakdown.
- `ExpenseTracker` planned allocations now read the same per-trip split so values match `TripDetails`.
- Admin AI monitor now tracks all services (Budget, Hotel, Place) with availability donuts, request bars, and per-service health table.

---

## 🚀 Getting Started

### 1 — Install dependencies

```bash
cd Frontend
npm install
```

### 2 — Create `.env` file

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key   # optional
```

### 3 — Start dev server

```bash
npm run dev   # → http://localhost:5173
```

The Backend API must be running on port `5000`.

### Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

---

## 📁 Project Structure

```
Frontend/
├── public/
│   └── images/                  # Static public assets
├── src/
│   ├── App.jsx                  # All route definitions
│   ├── main.jsx                 # React DOM entry point
│   ├── index.css                # Global styles + CSS variables
│   ├── assets/images/
│   ├── components/
│   │   ├── Login.jsx            # Email + password login
│   │   ├── Signup.jsx           # Registration + email OTP
│   │   ├── ForgotPassword.jsx   # Send reset code
│   │   ├── ResetPassword.jsx    # Verify code + new password
│   │   ├── Loading.jsx          # Fullscreen splash screen
│   │   ├── Admin/               # 8 admin panel sections
│   │   └── User/                # 15 user-facing pages
│   ├── config/
│   │   └── api.js               # API base URL helper
│   └── utils/
│       ├── clearUserData.js     # Wipe localStorage on logout
│       └── validation.js        # Form validation helpers
├── index.html
├── vite.config.js
└── eslint.config.js
```

---

## 🗺️ Pages & Routes

| Path | Component | Access | Description |
|---|---|---|---|
| `/` | `Home` | 🔓 Public | Landing page with animated counters + map preview |
| `/login` | `Login` | 🔓 Public | Email + password login |
| `/signup` | `Signup` | 🔓 Public | Register with email OTP verification |
| `/forgot-password` | `ForgotPassword` | 🔓 Public | Send reset code |
| `/reset-password` | `ResetPassword` | 🔓 Public | Verify code + set new password |
| `/plan-trip-landing` | `PlanTripLanding` | 🔓 Public | Trip planning onboarding |
| `/tours` | `Tours` | 🔓 Public | Browse destinations |
| `/hotels` | `Hotels` | 🔓 Public | Browse hotels |
| `/dashboard` | `Dashboard` | 🔐 Auth | Leaflet map of Sri Lanka + trip cards |
| `/profile` | `Profile` | 🔐 Auth | Profile · preferences · privacy tabs |
| `/plan-trip` | `PlanTrip` | 🔐 Auth | Wizard step 1 — pick district |
| `/district-explore` | `DistrictExplore` | 🔐 Auth | Wizard step 2 — browse places + map |
| `/trip-preferences` | `TripPreferences` | 🔐 Auth | Wizard step 3 — dates, people, style |
| `/hotel-picker` | `HotelPicker` | 🔐 Auth | Wizard step 4 — pick hotel |
| `/trip-budget` | `TripBudget` | 🔐 Auth | Wizard step 5 — set budget |
| `/trip-details` | `TripDetails` | 🔐 Auth | Wizard step 6 — review + save |
| `/expenses` | `ExpenseTracker` | 🔐 Auth | Log and track trip expenses |
| `/admin` | `AdminDashboard` | 🛡️ Admin | Admin panel |

---

## 🧭 Trip Planning Wizard

State passes through `localStorage` across 6 steps:

```
/plan-trip-landing
        │
        ▼
/plan-trip              ←  Select district
        │
        ▼
/district-explore       ←  Browse places on Leaflet map
        │
        ▼
/trip-preferences       ←  Dates · people count · travel style
        │
        ▼
/hotel-picker           ←  Pick hotel (ranked by budget + ratings)
        │
        ▼
/trip-budget            ←  Set per-category budget (LKR / USD / EUR)
        │
        ▼
/trip-details           ←  Review everything → POST /api/trips
        │
        ▼
/expenses               ←  Track real spend per category
```

**`localStorage` keys used across wizard:**

| Key | Written by | Read by |
|---|---|---|
| `selectedDistrict` | `PlanTrip` | `DistrictExplore`, `TripPreferences`, `HotelPicker`, `TripBudget`, `TripDetails` |
| Trip preferences | `TripPreferences` | `HotelPicker`, `TripBudget`, `TripDetails` |
| Selected hotel | `HotelPicker` | `TripBudget`, `TripDetails` |
| Budget data | `TripBudget` | `TripDetails` |
| `tripBudgetSplits` | `TripDetails` (save/update) | `ExpenseTracker` (planned budget breakdown) |

---

## 👤 User Components

| Component | Description |
|---|---|
| `Home` | Public landing page with animated stats + map |
| `Dashboard` | Authenticated home — Leaflet map of Sri Lanka + trip cards |
| `PlanTripLanding` | Trip planning marketing / onboarding page |
| `PlanTrip` | District picker (Step 1) |
| `DistrictExplore` | Browse places in selected district with interactive map |
| `TripPreferences` | Set trip dates, people count, hotel type, travel style |
| `HotelPicker` | Hotel selection with embedded map + reviews |
| `TripBudget` | Budget planner — per-category with LKR/USD/EUR toggle |
| `TripDetails` | Full trip review + save to backend |
| `ExpenseTracker` | Expense log — 8 categories + budget threshold alerts |
| `Tours` | Public destination browser with search + type filters |
| `Hotels` | Public hotel browser |
| `Profile` | Profile settings + travel preferences + privacy controls |
| `ReviewSection` | Reusable review widget (used in DistrictExplore + HotelPicker) |
| `MapSection` | Reusable Leaflet map (lazy-loaded on Home) |

---

## 🛡️ Admin Panel

Accessed at `/admin`. Sidebar selects one of 8 sections:

| Section | Component | Description |
|---|---|---|
| Overview | *(inline)* | Stats dashboard + recent users + recent reviews |
| Users | `UserManagement` | Full CRUD · role / status filters · travel style · 14 interests |
| Districts | `DistrictManagement` | CRUD + province badges + highlights array + image upload |
| Destinations | `DestinationManagement` | CRUD + 16 place types + tag assignment + images |
| Hotels | `HotelManagement` | CRUD + 8 hotel types + amenities + multi-currency prices |
| Expenses | `ExpenseManagement` | All-user expenses + budget alert dispatch |
| Reviews | `ReviewManagement` | Approve / reject / flag / unflag + admin response |
| Trips | `TripItineraryManagement` | All trips + status workflow |

### AI Monitor panel

`AiMonitorPanel` provides cross-service monitoring for:

- Budget AI (`/api/budget/ai-monitor` + `/api/budget/ai-service-health`)
- Hotel AI (`/api/hotels/ai-monitor` + `/api/hotels/ai-service-health`)
- Place AI (`/api/places/ai-monitor` + `/api/places/ai-service-health`)

Displayed metrics include total requests, successes, unavailable responses, timeouts, invalid responses, and computed availability.

---

## 🔐 Authentication

- JWT token stored in `localStorage` as `token`
- User object stored as `currentUser`
- All API calls include `Authorization: Bearer <token>`
- Unauthenticated users are redirected to `/login`
- Admin users are redirected to `/admin` after login

---

## 🌍 Currency Support

Budgets are stored in **LKR** on the backend. The frontend converts for display:

| Currency | Rate |
|---|---|
| 🇱🇰 LKR | Base (1) |
| 🇺🇸 USD | ~303 LKR |
| 🇪🇺 EUR | ~323 LKR |

---

## 🎨 Theming & Responsive Design

- Light / dark theme toggled via `data-theme` attribute on `<html>`
- Theme choice persisted to `localStorage`
- Component styles are co-located (e.g., `Dashboard.css` next to `Dashboard.jsx`)
- CSS variables used for all theme-sensitive colors

| Breakpoint | Width |
|---|---|
| Mobile | < 768px |
| Tablet | 768px – 1024px |
| Desktop | > 1024px |

---

## 🔧 Environment Variables

All variables must be prefixed with `VITE_` to be exposed to the browser:

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:5000` | Backend API base URL |
| `VITE_GOOGLE_MAPS_API_KEY` | — | Google Maps API key (optional) |