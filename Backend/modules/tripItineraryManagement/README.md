# Trip Itinerary Management Module

**Student ID:** IT23361690  
**Project:** TravelGenie (Kishkya Group Project)  
**Stack:** Node.js · Express · Sequelize · PostgreSQL (Neon) · React · Vite

---

## Overview

This module handles all trip planning and itinerary functions for TravelGenie. Users can create personalised trip plans by selecting from system-recommended destinations, schedule time and activities across multiple days, pick hotels, and plan their full travel budget. Admins can view and manage all trips across the platform with pagination support.

The module covers the full trip lifecycle — from a `draft` plan through `planned`, `ongoing`, and `completed` states, including the ability to `cancel` at any point.

---

## Module Structure

```
tripItineraryManagement/
├── controllers/
│   └── tripPlanController.js   # All business logic (CRUD + payload normalisation)
├── models/
│   └── TripItinerary.js        # Core trip itinerary model
└── routes/
    └── tripPlanRoutes.js       # Route definitions + middleware guards
```

**Frontend components (in `Frontend/src/components/`):**

| File | Purpose |
|---|---|
| `User/PlanTrip.jsx / .css` | Landing page — browse & select a district to plan a trip |
| `User/PlanTripLanding.jsx / .css` | Entry point / introduction to the trip planner |
| `User/TripPreferences.jsx / .css` | Set trip type, group size, date range, and travel preferences |
| `User/TripDetails.jsx / .css` | Step-by-step activity scheduling per day of the trip |
| `User/HotelPicker.jsx / .css` | Browse and select a hotel for the trip |
| `User/TripBudget.jsx / .css` | Full budget breakdown — total, hotel, and per-day costs |
| `User/TripDetails.jsx / .css` | View a saved trip plan in full detail |
| `Admin/TripItineraryManagement.jsx / .css` | Admin panel — list, search, view, edit, and delete all trips |

---

## Database Model

### `trip_itineraries` table (`TripItinerary.js`)

| Column | Type | Notes |
|---|---|---|
| `trip_id` | INTEGER | Primary key, auto-increment |
| `user_id` | INTEGER | FK → `users.id` — owner of the trip |
| `district_id` | INTEGER | FK → `districts.district_id` — destination district |
| `title` | STRING(200) | Required — name of the trip plan |
| `start_date` | DATEONLY | Required — trip start date |
| `end_date` | DATEONLY | Required — trip end date |
| `num_days` | INTEGER | Auto-calculated from start/end dates via `beforeSave` hook |
| `num_people` | INTEGER | Required — group size, minimum 1 |
| `total_budget` | DECIMAL(12,2) | Overall trip budget, defaults to `0` |
| `hotel_budget` | DECIMAL(12,2) | Allocated hotel budget, defaults to `0` |
| `budget_currency` | STRING(10) | Currency code — defaults to `LKR` |
| `hotel_place_id` | INTEGER | FK → `places.place_id` — selected hotel (optional) |
| `hotel_name` | STRING(200) | Name of the selected hotel |
| `hotel_category` | STRING(100) | Hotel category (e.g. budget, luxury, boutique) |
| `hotel_star_class` | INTEGER | Star rating 0–5 |
| `hotel_price_min` | DECIMAL(12,2) | Minimum nightly price of the hotel |
| `hotel_price_currency` | STRING(10) | Hotel price currency — defaults to `LKR` |
| `selected_places` | JSONB | Array of place objects chosen for the itinerary |
| `selected_hotels` | JSONB | Array of hotel objects considered during planning |
| `preferences` | JSONB | Freeform object — stores trip type, activity preferences, notes |
| `status` | ENUM | `draft` / `planned` / `ongoing` / `completed` / `cancelled` — defaults to `draft` |
| `notes` | TEXT | Optional free-text notes for the trip |
| `createdAt` / `updatedAt` | DATE | Auto-managed by Sequelize |

> `num_days` is automatically derived on every save via a Sequelize `beforeSave` hook — it does not need to be supplied manually.

---

## API Endpoints

Base path: `/api/trips`

### User Routes (requires `Authorization: Bearer <token>`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/my` | Get all trips belonging to the logged-in user |
| `GET` | `/:id` | Get a single trip plan by ID (owner or admin only) |
| `POST` | `/` | Create a new trip plan |
| `PUT` | `/:id` | Update an existing trip plan (owner or admin only) |
| `DELETE` | `/:id` | Delete a trip plan (owner or admin only) |

### Admin-Only Routes (requires token + `role: admin`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/all` | List all trips across all users — supports `?page=` and `?limit=` |

---

## Trip Planning Flow

```
User opens Plan Trip
    └─► Browses system-recommended districts (PlanTrip.jsx)
    └─► Selects a destination district

Trip Setup
    └─► Sets trip title, date range, group size, and preferences (TripPreferences.jsx)
    └─► POST /api/trips  →  Trip created with status: draft

Activity Scheduling
    └─► Views recommended places within the selected district (TripDetails.jsx)
    └─► Schedules activities day-by-day
    └─► Selects places from system recommendations
    └─► PUT /api/trips/:id  →  selected_places saved

Hotel Selection
    └─► Browses recommended hotels in the district (HotelPicker.jsx)
    └─► Selects a hotel and allocates hotel budget
    └─► PUT /api/trips/:id  →  hotel details saved

Budget Planning
    └─► Views full cost breakdown (TripBudget.jsx)
    └─► Sets total budget, hotel budget, and currency
    └─► PUT /api/trips/:id  →  budget details saved
    └─► Trip status updated: draft → planned
```

---

## Trip Status Lifecycle

```
draft  →  planned  →  ongoing  →  completed
                 ↘              ↙
                    cancelled
```

| Status | Meaning |
|---|---|
| `draft` | Trip is being built — not yet finalised |
| `planned` | Trip is fully planned and ready to go |
| `ongoing` | Trip is currently in progress |
| `completed` | Trip has been completed |
| `cancelled` | Trip was cancelled at any stage |

---

## Payload Normalisation

The controller applies strict normalisation to all incoming payloads via `normalizeTripPayload()`:

- **JSONB fields** (`selected_places`, `selected_hotels`, `preferences`) — parsed from strings if needed; default to `[]` / `{}`.
- **Numeric fields** (`total_budget`, `hotel_budget`, `hotel_price_min`, `num_people`) — coerced to numbers, with fallbacks for empty/invalid values.
- **Currency fields** — default to `LKR` when blank.
- **Partial updates** (`PUT`) — only fields present in the request body are touched; missing fields retain their current DB values.

---

## Security & Authorisation

- All routes require a valid JWT (`protect` middleware).
- `GET /:id`, `PUT /:id`, `DELETE /:id` enforce **ownership checks** — a user can only access their own trips; admins can access any trip.
- `GET /all` is restricted to `role: admin` via the `authorize('admin')` middleware.
- Route parameters are validated as positive integers via `positiveIntParam` middleware — invalid IDs are rejected before reaching the controller.
- Required fields on create (`district_id`, `title`, `start_date`, `end_date`) are enforced by `requireFields` middleware.
- `status` values are validated against the allowed enum list by `enumField` middleware.

---

## Environment Variables

No additional environment variables are needed beyond the shared backend `.env`:

```env
# Database
DATABASE_URL=your_neon_postgres_connection_string

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
```

---

## Sample Request & Response

### POST `/api/trips` — Create a Trip Plan

**Request:**
```json
{
  "district_id": 3,
  "title": "Kandy Weekend Getaway",
  "start_date": "2026-05-10",
  "end_date": "2026-05-13",
  "num_people": 2,
  "total_budget": 50000,
  "hotel_budget": 20000,
  "budget_currency": "LKR",
  "preferences": {
    "trip_type": "couple",
    "activity_types": ["culture", "nature"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Trip plan created",
  "data": {
    "trip_id": 12,
    "user_id": 5,
    "district_id": 3,
    "title": "Kandy Weekend Getaway",
    "start_date": "2026-05-10",
    "end_date": "2026-05-13",
    "num_days": 3,
    "num_people": 2,
    "total_budget": "50000.00",
    "hotel_budget": "20000.00",
    "budget_currency": "LKR",
    "selected_places": [],
    "selected_hotels": [],
    "preferences": { "trip_type": "couple", "activity_types": ["culture", "nature"] },
    "status": "draft",
    "notes": null,
    "district": {
      "district_id": 3,
      "name": "Kandy",
      "province": "Central"
    }
  }
}
```

### GET `/api/trips/my` — Get My Trips

**Response:**
```json
{
  "success": true,
  "message": "Trips fetched",
  "data": [
    {
      "trip_id": 12,
      "title": "Kandy Weekend Getaway",
      "start_date": "2026-05-10",
      "end_date": "2026-05-13",
      "num_days": 3,
      "status": "planned",
      "district": { "district_id": 3, "name": "Kandy", "province": "Central" }
    }
  ]
}
```

---

## Frontend Features

### Plan Trip (`User/PlanTrip.jsx`)
- Displays all districts fetched from the backend
- Filter by province (Western, Central, Southern, etc.)
- Each district card shows image, highlights, and a "Plan Trip" CTA
- Selecting a district navigates to the trip setup flow

### Trip Preferences (`User/TripPreferences.jsx`)
- Set trip title, start/end date, group size
- Choose trip type: solo, couple, family, or group
- Select travel preferences and activity interests

### Trip Details / Activity Scheduling (`User/TripDetails.jsx`)
- Day-by-day activity planner based on trip duration
- Displays system-recommended places within the chosen district
- User selects which places to include each day
- Saved as a structured `selected_places` JSONB array

### Hotel Picker (`User/HotelPicker.jsx`)
- Browse hotels in the selected district
- Filter by category: budget, midrange, luxury, boutique, villa
- View hotel star rating, price range, and images
- Select a hotel to attach to the trip plan

### Trip Budget (`User/TripBudget.jsx`)
- Set total trip budget and dedicated hotel budget
- Multi-currency support: LKR, USD, EUR with live conversion display
- Quick-select preset amounts
- Visual cost breakdown across accommodation and activities

### Admin Trip Itinerary Management (`Admin/TripItineraryManagement.jsx`)
- Paginated list of all trips across all users
- View trip details including district, status, dates, budget, and assigned user
- Edit any trip's details (title, dates, budget, status, notes, selected places/hotels)
- Delete any trip
- Status badge styling for all lifecycle states
- Multi-currency display (LKR / USD / EUR)

---

## Related Modules

This module integrates with:
- **User Management** — trips are scoped to authenticated user accounts
- **Place / Destination Management** — `district_id` references the `districts` table; `selected_places` stores place data from the places catalogue
- **Hotel Management** — `hotel_place_id` references a hotel entry in the `places` table
- **Expense Tracker** — trip plans link to expense records for tracking actual spend against budget
- **Review & Feedback** — completed trips can be reviewed by the user

---

*IT23361690 — Kishkya Group Project — TravelGenie*
