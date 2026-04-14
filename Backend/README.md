<div align="center">

# ⚙️ TravelGenie — Backend API

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org/)
[![Sequelize](https://img.shields.io/badge/Sequelize-6.37-52B0E7?style=flat-square&logo=sequelize&logoColor=white)](https://sequelize.org/)
[![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)

REST API for the TravelGenie travel planning platform, built with Express and Sequelize on PostgreSQL.

[🖥️ Frontend Docs](../Frontend/README.md) · [🏠 Project Overview](../README.md)

</div>

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js + Express | 4.18 |
| ORM | Sequelize (PostgreSQL dialect) | 6.37 |
| Database | PostgreSQL | 14+ |
| Auth | JWT + bcryptjs | 9.0 / 2.4 |
| File uploads | multer → `/uploads/` static | 2.0 |
| Email | nodemailer (OTP + alerts) | 8.0 |
| Dev server | nodemon | 3.0 |

---

## 🚀 Getting Started

### 1 — Install dependencies

```bash
cd Backend
npm install
```

### 2 — Create `.env` file

```env
PORT=5000
NODE_ENV=development

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=travelgenie
DB_USER=postgres
DB_PASSWORD=yourpassword

# Auth
JWT_SECRET=your_jwt_secret_key_here

# CORS
CORS_ORIGIN=http://localhost:5173

# SMTP (optional — OTP codes are always printed to terminal as fallback)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password

# AI service proxy target (Flask service)
AI_HOST=localhost
AI_SERVICE_PORT=5001
```

### 3 — Start the server

```bash
npm run dev     # Development with auto-restart → http://localhost:5000
npm start       # Production
```

> The server syncs all Sequelize models to the database on startup. No manual migration needed for a fresh database.

### AI service dependency

The backend proxies recommendation requests to the Python AI service in `Aiml/`.

- Start backend: `http://localhost:5000`
- Start AI service: `http://localhost:5001`
- Health source used by monitor endpoints: `GET /health` on AI service

---

## 📁 Project Structure

```
Backend/
├── config/
│   ├── database.js          # Sequelize connection + sync
│   ├── associations.js      # All model associations in one place
│   └── migration.sql        # Full schema DDL reference
├── middleware/
│   ├── auth.js              # protect() + authorize() middleware
│   ├── errorHandler.js      # Global error handler
│   ├── requestValidation.js # Input validation helpers
│   └── upload.js            # multer config (images)
├── modules/
│   ├── userManagement/          # Users, preferences, interests
│   ├── placeManagement/         # Districts + places
│   ├── destinationManagement/   # Destination content + recommendations
│   ├── hotelManagement/         # Hotels + stats
│   ├── tagManagement/           # Tags + place-tag joins
│   ├── tripItineraryManagement/ # Trip plans (trip_itineraries table)
│   ├── expenseManagement/       # Expenses + categories + price records
│   ├── feedbackManagement/      # Reviews + reactions
│   └── notificationManagement/  # Notifications + budget alerts
├── utils/
│   ├── helpers.js           # successResponse / errorResponse
│   └── notificationEmail.js # SMTP notification sender
├── uploads/                 # Uploaded images (served as static)
└── server.js                # Express app + route mounts
```

---

## 🔌 API Reference

All endpoints are prefixed with `/api`.

> 🔓 **Public** — no token needed  
> 🔐 **Protected** — requires `Authorization: Bearer <token>`  
> 🛡️ **Admin** — requires `role: admin`

---

### 🤖 AI Proxy + Monitor Endpoints

These endpoints are mounted from:

- `modules/expenseManagement/routes/aiBudgetRoutes.js`
- `modules/hotelManagement/routes/aiHotelRoutes.js`
- `modules/placeManagement/routes/aiPlaceRoutes.js`

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/budget/ai-recommend` | 🔐 | Budget recommendation proxy |
| `POST` | `/budget/ai-monitor-event` | 🔐 | Budget AI usage/fallback telemetry event |
| `GET` | `/budget/ai-monitor` | 🛡️ | Budget AI metrics snapshot |
| `GET` | `/budget/ai-service-health` | 🛡️ | Budget AI health snapshot |
| `GET` | `/hotels/ai-recommend` | 🔐 | Hotel recommendation proxy |
| `GET` | `/hotels/ai-monitor` | 🛡️ | Hotel AI metrics snapshot |
| `GET` | `/hotels/ai-service-health` | 🛡️ | Hotel AI health snapshot |
| `GET` | `/places/ai-recommend` | 🔐 | Place recommendation proxy |
| `GET` | `/places/ai-monitor` | 🛡️ | Place AI metrics snapshot |
| `GET` | `/places/ai-service-health` | 🛡️ | Place AI health snapshot |

Monitoring behavior:

- `availabilityRate` is computed as `successfulResponses / totalRequests`
- If there are no requests yet, `availabilityRate` is `0` (not `100`)
- AI failures are captured separately as unavailable, timeout, and invalid-response counters

---

### 👤 Users — `/api/users`

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/register` | 🔓 | Register new user |
| `POST` | `/login` | 🔓 | Login → returns JWT |
| `POST` | `/forgot-password` | 🔓 | Send reset code to email |
| `POST` | `/verify-reset-code` | 🔓 | Verify 6-digit reset code |
| `POST` | `/reset-password` | 🔓 | Set new password |
| `POST` | `/send-verification-code` | 🔓 | Send email OTP |
| `POST` | `/verify-email-code` | 🔓 | Confirm email OTP |
| `GET` | `/profile` | 🔐 | Get own profile |
| `PUT` | `/profile` | 🔐 | Update own profile |
| `DELETE` | `/profile` | 🔐 | Delete own account |
| `PUT` | `/change-password` | 🔐 | Change password |
| `GET` | `/` | 🛡️ | List all users |
| `POST` | `/` | 🛡️ | Create user |
| `GET` | `/:id` | 🛡️ | Get user by ID |
| `PUT` | `/:id` | 🛡️ | Update user |
| `DELETE` | `/:id` | 🛡️ | Delete user |

---

### ⚙️ Preferences — `/api/preferences`

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/` | 🔐 | Get user preferences |
| `PUT` | `/` | 🔐 | Update user preferences |
| `GET` | `/destinations` | 🔐 | Get destination preferences |
| `PUT` | `/destinations` | 🔐 | Update destination preferences |
| `GET` | `/trip-defaults` | 🔐 | Get trip defaults |
| `PUT` | `/trip-defaults` | 🔐 | Update trip defaults |

---

### 🗺️ Districts — `/api/districts`

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/` | 🔓 | List all districts |
| `GET` | `/:id` | 🔓 | Get district |
| `POST` | `/` | 🛡️ | Create district |
| `PUT` | `/:id` | 🛡️ | Update district |
| `DELETE` | `/:id` | 🛡️ | Delete district |
| `POST` | `/:id/image` | 🛡️ | Upload district image |

---

### 📍 Places — `/api/places`

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/search` | 🔓 | Search places |
| `GET` | `/` | 🔓 | List all places |
| `GET` | `/:id` | 🔓 | Get place |
| `POST` | `/` | 🛡️ | Create place |
| `PUT` | `/:id` | 🛡️ | Update place |
| `DELETE` | `/:id` | 🛡️ | Delete place |
| `GET` | `/:placeId/images` | 🔓 | Get place image gallery |
| `POST` | `/:placeId/images` | 🛡️ | Upload place images |
| `POST` | `/:placeId/images/url` | 🛡️ | Add image by URL |
| `DELETE` | `/images/:imageId` | 🛡️ | Delete place image |

---

### 🏖️ Destinations — `/api/destinations`

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/` | 🔓 | List all destinations |
| `GET` | `/popular` | 🔓 | Popular destinations |
| `GET` | `/types` | 🔓 | List destination types |
| `GET` | `/district/:districtId` | 🔓 | Destinations by district |
| `GET` | `/recommended` | 🔐 | Personalized recommendations |
| `GET` | `/recommended/:userId` | 🛡️ | Recommendations for user |
| `GET` | `/:id` | 🔓 | Get destination |
| `POST` | `/` | 🛡️ | Create destination |
| `PUT` | `/:id` | 🛡️ | Update destination |
| `DELETE` | `/:id` | 🛡️ | Delete destination |

---

### 🏨 Hotels — `/api/hotels`

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/` | 🔓 | List hotels (filterable) |
| `GET` | `/near` | 🔓 | Hotels near a place |
| `GET` | `/district/:districtId` | 🔓 | Hotels in district |
| `GET` | `/:id` | 🔓 | Get hotel |
| `POST` | `/` | 🛡️ | Create hotel |
| `PUT` | `/:id` | 🛡️ | Update hotel |
| `DELETE` | `/:id` | 🛡️ | Delete hotel |

---

### 🏷️ Tags — `/api/tags`

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/` | 🔓 | List tags (filter by `?type=`) |
| `POST` | `/` | 🛡️ | Create tag |
| `PUT` | `/:id` | 🛡️ | Update tag |
| `DELETE` | `/:id` | 🛡️ | Delete tag |
| `POST` | `/place/:placeId` | 🛡️ | Assign tags to place |

---

### 🧳 Trips — `/api/trips`

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/my` | 🔐 | Get own trips |
| `GET` | `/all` | 🛡️ | Get all trips |
| `GET` | `/:id` | 🔐 | Get trip |
| `POST` | `/` | 🔐 | Create trip |
| `PUT` | `/:id` | 🔐 | Update trip |
| `DELETE` | `/:id` | 🔐 | Delete trip |

---

### 💸 Expenses — `/api/expenses`

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/categories` | 🔓 | List expense categories |
| `POST` | `/categories` | 🛡️ | Create category |
| `GET` | `/admin/all` | 🛡️ | All users' expenses |
| `GET` | `/stats` | 🔐 | Expense statistics |
| `GET` | `/trip/:tripId/summary` | 🔐 | Trip expense summary |
| `GET` | `/trip/:tripId` | 🔐 | Trip expenses |
| `GET` | `/` | 🔐 | Own expenses |
| `POST` | `/` | 🔐 | Create expense |
| `GET` | `/:id` | 🔐 | Get expense |
| `PUT` | `/:id` | 🔐 | Update expense |
| `DELETE` | `/:id` | 🔐 | Delete expense |

---

### 💰 Price Records — `/api/price-records`

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/` | 🔐 | List price records |
| `GET` | `/place/:placeId` | 🔐 | Records for a place |
| `POST` | `/` | 🛡️ | Create record |
| `DELETE` | `/:id` | 🛡️ | Delete record |

---

### ⭐ Reviews — `/api/reviews`

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/my` | 🔐 | Own reviews |
| `GET` | `/` | 🔓 | All reviews |
| `GET` | `/place/:placeId` | 🔓 | Reviews for a place |
| `GET` | `/admin/all` | 🛡️ | All reviews (admin view) |
| `POST` | `/` | 🔐 | Create review |
| `PUT` | `/:id` | 🔐 | Update review |
| `DELETE` | `/:id` | 🔐 | Delete review |
| `POST` | `/:id/helpful` | 🔐 | Mark as helpful |
| `POST` | `/:id/flag` | 🔐 | Flag review |
| `POST` | `/:id/unflag` | 🔐 | Unflag review |
| `PUT` | `/:id/status` | 🛡️ | Approve / reject |
| `POST` | `/:id/response` | 🛡️ | Add admin response |

---

### 🔔 Notifications — `/api/notifications`

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/` | 🔐 | Own notifications |
| `GET` | `/:id` | 🔐 | Get notification |
| `PUT` | `/read-all` | 🔐 | Mark all as read |
| `PUT` | `/:id/read` | 🔐 | Mark as read |
| `PUT` | `/:id` | 🔐 | Update notification |
| `DELETE` | `/:id` | 🔐 | Delete notification |
| `POST` | `/` | 🛡️ | Create notification |
| `GET` | `/admin/budget-auto-status` | 🛡️ | Budget alert status |
| `GET` | `/admin/expense-alert-status` | 🛡️ | Expense alert status |
| `GET` | `/admin/expense-alert-history` | 🛡️ | Alert history |

---

## 🔐 Authentication

Include the JWT token in all protected requests:

```http
Authorization: Bearer <your_jwt_token>
```

Tokens are valid for **7 days**. Obtain a token via `POST /api/users/login`.

---

## ❌ Error Format

All error responses follow a consistent format:

```json
{
  "success": false,
  "message": "Human-readable error message"
}
```

| Code | Meaning |
|---|---|
| `400` | Bad request / validation error |
| `401` | Missing or invalid token |
| `403` | Insufficient role (admin required) |
| `404` | Resource not found |
| `500` | Internal server error |

---

## 🗄️ Database Notes

- **TripItinerary** model maps to the `trip_itineraries` table (Sequelize model name and table name differ intentionally).
- **Places** is the supertype for both destinations and hotels. Each hotel owns a `places` row (1:1 via `place_id`).
- Reviews, tags, ratings, and price records all attach to a `places` row.
- Creating or updating an expense automatically triggers a `BUDGET_100` notification when spend reaches 100% of trip budget.
- `Review.afterCreate` / `afterUpdate` hooks denormalize `rating` and `review_count` directly onto the parent `Place` row.
- OTP codes are always printed to the server terminal as a fallback when SMTP is not configured.