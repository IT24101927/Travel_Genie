<div align="center">

# ✈️ TravelGenie

### AI-Assisted Travel Planning Platform for Sri Lanka

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)](LICENSE)

TravelGenie helps users plan multi-day trips across Sri Lanka — select a district, explore places on an interactive map, choose accommodation, plan a budget, and track expenses in one seamless workflow.

[📖 Backend Docs](Backend/README.md) · [🖥️ Frontend Docs](Frontend/README.md) · [🤖 AI Service Docs](Aiml/README.md)

</div>

---

## 👥 Team

| # | Registration | Feature |
|:---:|:---:|---|
| 01 | IT24100853 | User Account Management |
| 02 | IT24100858 | Destination Management |
| 03 | IT23361690 | Trip Itinerary Management |
| 04 | IT24100533 | Hotel and Accommodation Management |
| 05 | IT24101021 | Expenses Management |
| 06 | IT24101927 | Feedback and Review System Management |

---

## ✨ Features

<details>
<summary><strong>01 · User Account Management</strong> <em>(IT24100853)</em></summary>
<br>

- Full Create / Read / Update / Delete on user accounts
- Email OTP verification on signup; JWT-secured session
- Password reset via emailed verification code
- User preference management:
  - **Interests** — Beaches, mountains, food, history, nightlife, etc.
  - **Travel style** — Adventure · Relax · Culture · Luxury

</details>

<details>
<summary><strong>02 · Destination Management</strong> <em>(IT24100858)</em></summary>
<br>

- Full CRUD for destinations and place content
- Content-based filtering driven by user preferences
- Attraction ranking via similarity scores
- Personalized destination suggestions on dashboard

</details>

<details>
<summary><strong>03 · Trip Itinerary Management</strong> <em>(IT23361690)</em></summary>
<br>

- Full CRUD for trip plans
- Guided 6-step wizard — select best options from system recommendations
- Time and activity scheduling across multiple days
- Integrated budget planning with per-category breakdowns

</details>

<details>
<summary><strong>04 · Hotel and Accommodation Management</strong> <em>(IT24100533)</em></summary>
<br>

- Full CRUD for hotel records
- Hotel recommendations ranked by budget, preferences, ratings, and proximity
- Supports 8 hotel categories across all Sri Lankan districts
- Multi-currency pricing display (LKR / USD / EUR)

</details>

<details>
<summary><strong>05 · Expenses Management</strong> <em>(IT24101021)</em></summary>
<br>

- Full CRUD for expense records per trip
- Estimated budget vs. actual spend comparison with visual tracking
- Historical price data stored in database
- Travel cost trend monitoring
- Automated alerts and analysis for significant price changes

</details>

<details>
<summary><strong>06 · Feedback and Review System Management</strong> <em>(IT24101927)</em></summary>
<br>

- Full CRUD for reviews
- 1–5 star ratings for places and hotels
- Like / Dislike reactions on itinerary items
- Admin moderation — approve, reject, and flag reviews

</details>

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────┐
│                  React Frontend                  │
│   React 19 · Vite 7 · React Router 7 · Leaflet  │
│                   Port 5173                      │
└─────────────────────┬────────────────────────────┘
                      │  REST API  ·  JWT Auth
┌─────────────────────▼────────────────────────────┐
│                Express Backend                   │
│       Node.js · Sequelize ORM · multer           │
│                   Port 5000                      │
└─────────────────────┬────────────────────────────┘
                      │  Internal AI proxy
┌─────────────────────▼────────────────────────────┐
│                Flask AI Service                  │
│      Place · Hotel · Budget Recommendations      │
│                   Port 5001                      │
└─────────────────────┬────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────┐
│             PostgreSQL Database                  │
│               travelgenie  ·  21 tables          │
└──────────────────────────────────────────────────┘
```

---

## 🗺️ Trip Planning Workflow

```
 ① Register / Login
        │
        ▼
 ② Select District          ──  Browse all 25 districts on a map
        │
        ▼
 ③ Explore Places            ──  Interactive Leaflet map + place cards
        │
        ▼
 ④ Set Preferences           ──  Dates · people count · travel style
        │
        ▼
 ⑤ Pick Hotel                ──  Ranked by budget, rating, proximity
        │
        ▼
 ⑥ Set Budget                ──  Per-category breakdown (LKR / USD / EUR)
        │
        ▼
 ⑦ Confirm & Save Itinerary  ──  Stored to trip_itineraries table
        │
        ▼
 ⑧ Track Expenses            ──  Real spend vs. budget with alerts
```

---

## 🗄️ Database

21 tables managed by Sequelize, synced on server startup:

| Category | Tables |
|---|---|
| 👤 Users | `users`, `user_preferences`, `privacy_settings` |
| 🗺️ Geography | `districts`, `places`, `place_tags`, `tags` |
| 🏨 Hotels | `hotels`, `hotel_stats` |
| 🧳 Trips | `trip_itineraries`, `expenses`, `expense_categories` |
| ⭐ Reviews | `reviews` |
| 📍 Destinations | `destinations`, `destination_images` |
| 🔔 Notifications | `notifications` |
| 💰 Prices | `price_records` |

---

## 📁 Repository Structure

```
Travelgenie/
├── Backend/
│   ├── modules/
│   │   ├── userManagement/          # Feature 01
│   │   ├── destinationManagement/   # Feature 02
│   │   ├── tripItineraryManagement/ # Feature 03
│   │   ├── hotelManagement/         # Feature 04
│   │   ├── expenseManagement/       # Feature 05
│   │   ├── feedbackManagement/      # Feature 06
│   │   ├── placeManagement/         # Supporting
│   │   ├── tagManagement/           # Supporting
│   │   └── notificationManagement/  # Supporting
│   ├── config/
│   ├── middleware/
│   ├── utils/
│   └── server.js
└── Frontend/
    └── src/
        ├── components/
        │   ├── Admin/               # 8 admin panel sections
        │   └── User/                # 15 user-facing pages
        ├── config/
        └── utils/
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **PostgreSQL** 14+ — create a database named `travelgenie`

### 1 — Backend

```bash
cd Backend
npm install
```

Create a `.env` file:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=travelgenie
DB_USER=postgres
DB_PASSWORD=yourpassword
JWT_SECRET=your_jwt_secret
EMAIL_USER=your@email.com
EMAIL_PASS=your_email_password
PORT=5000
```

```bash
npm run dev   # → http://localhost:5000
```

### 2 — Frontend

```bash
cd Frontend
npm install
```

Create a `.env` file:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

```bash
npm run dev   # → http://localhost:5173
```

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Backend runtime | Node.js + Express | 4.18 |
| ORM | Sequelize | 6.37 |
| Database | PostgreSQL | 14+ |
| Authentication | JWT + bcryptjs | 9.0 / 2.4 |
| File uploads | multer | 2.0 |
| Email | nodemailer | 8.0 |
| Frontend | React + Vite | 19 / 7 |
| Routing | React Router | 7 |
| Maps | react-leaflet + @react-google-maps/api | 5 / 2.20 |

---

## 🔌 Port Reference

| Service | URL |
|---|---|
| Backend API | `http://localhost:5000` |
| Frontend dev | `http://localhost:5173` |

---

<div align="center">

Built with ❤️ for Sri Lanka 🇱🇰

</div>