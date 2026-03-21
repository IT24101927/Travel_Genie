# TravelGenie

A full-stack travel management web application for Sri Lanka built with **React + Vite** (Frontend) and **Node.js/Express** (Backend), using **PostgreSQL (Neon)** as the cloud database.

---

## Project Structure

```
Travel_Genie/
├── Backend/        # Node.js + Express REST API
└── Frontend/       # React + Vite web app
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router v7 |
| Mapping | Leaflet / React-Leaflet, Google Maps API |
| Backend | Node.js, Express |
| ORM | Sequelize v6 |
| Database | PostgreSQL (Neon cloud) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Email | Nodemailer (SMTP) |
| File Upload | Multer |

---

## Features

### User Side
- Register, login, forgot/reset password (JWT + email)
- Personal profile with travel preferences and interests
- Browse destinations by district with type, photo, and duration
- Personalized destination recommendations based on interests and travel style
- Plan and manage trip itineraries
- Hotel picker integrated into trip planning
- Expense tracker per trip with categories
- Budget overview and price record lookup
- Reviews and reaction system for places
- Map view with interactive markers
- Notification centre

### Admin Side
- Admin dashboard with overview statistics
- Full **Destination Management** (see below)
- District management with description, highlights, and best-for tags
- Hotel management (CRUD)
- User management (view, activate/deactivate)
- Trip itinerary management view
- Expense and price record management
- Review moderation

---

## Destination Management (Danidu)

### Database Changes
- Removed legacy `destinations` table and complex enum columns (`destination_category`, `opening_hours`, `best_time_to_visit`, `entry_fee`)
- Added `type` (VARCHAR 50) and `duration` (VARCHAR 100) columns to the `places` table
- Migration script (`migration_simplify_destinations.sql`) converts old category enums to new type values and sets default durations
- `Destination` model is now an alias for `Place` — no separate table needed
- District model extended with `description`, `highlights[]`, and `best_for[]` columns (added via `ALTER TABLE IF EXISTS` on startup)

### Backend API (`/api/destinations`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Public | Paginated list with search, type, district, active/inactive filters |
| GET | `/popular` | Public | Sorted by rating + review count |
| GET | `/district/:districtId` | Public | All destinations in a district |
| GET | `/:id` | Public | Single destination detail |
| GET | `/recommended` | Auth (user) | Personalised based on saved interests + travel style |
| GET | `/recommended/:userId` | Auth (admin) | Recommendations for any user |
| POST | `/` | Admin | Create destination |
| PUT | `/:id` | Admin | Update destination |
| DELETE | `/:id` | Admin | Delete destination |

All responses include: district info, up to 5 images, and tags with weights.

### Frontend — Admin (`DestinationManagement.jsx`)
- Add / Edit modal with fields: name, type, district, description, duration, active status
- Image upload (new uploads and manage existing images)
- Filter bar: by type, district, active/inactive status, and text search
- Collapsible grouped view by district
- 16 place type options with colour-coded pills and emoji indicators
- Fallback Unsplash images per type
- Toast notifications for all actions

### Frontend — User (`DistrictExplore.jsx`)
- Browse all places within a district filtered by type
- Type pills with colour coding and emoji icons
- Fallback Unsplash images per place type
- Integrated review section per place

---

## Database Schema Overview

Key tables: `users`, `user_preferences`, `user_interests`, `travel_styles`, `districts`, `places`, `hotels`, `tags`, `place_tags`, `place_images`, `trip_plans`, `trip_days`, `itinerary_items`, `trip_stays`, `expense_categories`, `expenses`, `price_records`, `reviews`, `item_reactions`, `recommendation_logs`, `notifications`

Migration files are in `Backend/config/`:
- `migration.sql` — full schema from scratch (drop + recreate all tables)
- `migration_simplify_destinations.sql` — patches an existing DB to use the new `type`/`duration` columns

---

## Getting Started

### Prerequisites
- Node.js 18+
- A PostgreSQL database (local or [Neon](https://neon.tech))

### Backend Setup

```bash
cd Backend
npm install
cp .env.example .env
# Edit .env with your database URL, JWT secret, and SMTP settings
npm run dev
```

Optional seed scripts:

```bash
npm run seed:admin       # Create admin user (admin@travelgenie.com / admin123)
npm run seed:user        # Create a test user
npm run seed:districts   # Seed all Sri Lanka districts
```

### Frontend Setup

```bash
cd Frontend
npm install
cp .env.example .env
# Set VITE_API_BASE_URL=http://localhost:5000
npm run dev
```

---

## Environment Variables

### `Backend/.env`

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 5000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT tokens |
| `JWT_EXPIRE` | Token expiry (e.g. `7d`) |
| `CORS_ORIGIN` | Allowed frontend origin |
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP port |
| `SMTP_USER` | SMTP email address |
| `SMTP_PASS` | SMTP app password |

### `Frontend/.env`

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API base URL |

---

## Branch

Current development branch: **Danidu**

---

## License

ISC
