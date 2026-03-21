# User Account Management Module

**Student ID:** IT24100853  
**Project:** TravelGenie (Kishkya Group Project)  
**Stack:** Node.js · Express · Sequelize · PostgreSQL (Neon) · React · Vite

---

## Overview

This module handles all user identity and account functions for TravelGenie — from registration and login through to profile management and admin-level user controls. It includes JWT-based authentication, role-based access control, email verification on signup, and a password-reset flow using one-time codes.

---

## Module Structure

```
userManagement/
├── controllers/
│   └── userController.js       # All business logic
├── models/
│   ├── User.js                 # Core user model + JWT + bcrypt helpers
│   ├── UserPreference.js       # Travel style preference per user
│   ├── UserInterest.js         # Many-to-many: user ↔ tags (interests)
│   └── TravelStyle.js          # Lookup table: Relax, Adventure, Culture …
└── routes/
    └── userRoutes.js           # Route definitions + middleware guards
```

**Frontend components (in `Frontend/src/components/`):**

| File | Purpose |
|---|---|
| `Login.jsx / .css` | Login form with JWT handling |
| `Signup.jsx / .css` | Registration form with email OTP verification |
| `ForgotPassword.jsx / .css` | Request password-reset code |
| `ResetPassword.jsx` | Enter code + set new password |
| `User/Profile.jsx / .css` | View & edit personal profile, avatar, travel settings |
| `Admin/UserManagement.jsx / .css` | Admin panel — list, search, filter, add, edit, delete users |

---

## Database Models

### `users` table (`User.js`)

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER | Primary key, auto-increment |
| `name` | STRING(50) | Required |
| `email` | STRING | Unique, validated |
| `password` | STRING | Bcrypt-hashed automatically via `beforeSave` hook |
| `role` | ENUM | `user` / `admin` — defaults to `user` |
| `phone` | STRING | Optional |
| `dateOfBirth` | DATE | Optional |
| `gender` | ENUM | `male` / `female` / `other` |
| `nic` | STRING | National Identity Card number |
| `avatar` | TEXT | URL or base64 string |
| `address` | JSONB | Stores `travelStyle`, `interests`, `prefs` (currency, privacy settings) |
| `isActive` | BOOLEAN | Account active flag — defaults `true` |
| `lastLogin` | DATE | Updated on every successful login |
| `createdAt` / `updatedAt` | DATE | Auto-managed by Sequelize |

### `travel_styles` table (`TravelStyle.js`)
Lookup table for travel style options: `Relax`, `Adventure`, `Culture`, `Luxury`, `Budget`, `Family`, `Backpacker`.

### `user_preferences` table (`UserPreference.js`)
Links a user to a travel style with an optional preferred-weather field.

### `user_interests` table (`UserInterest.js`)
Junction table linking `users` ↔ `tags` (many-to-many) for interest tagging.

---

## API Endpoints

Base path: `/api/users`

### Public Routes (no token required)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/register` | Register a new user account |
| `POST` | `/login` | Login and receive a JWT token |
| `POST` | `/send-verification-code` | Send 6-digit OTP to email (signup verify) |
| `POST` | `/verify-email-code` | Verify the OTP before completing signup |
| `POST` | `/forgot-password` | Send 6-digit reset code to email |
| `POST` | `/reset-password` | Verify reset code and set new password |

### Protected Routes (requires `Authorization: Bearer <token>`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/profile` | Get current user's profile |
| `PUT` | `/profile` | Update profile (name, phone, DOB, NIC, avatar, gender, address) |
| `PUT` | `/change-password` | Change password (requires current password) |

### Admin-Only Routes (requires token + `role: admin`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | List all users (supports `?limit=` query) |
| `GET` | `/:id` | Get a specific user by ID |
| `PUT` | `/:id` | Update any user's details |
| `DELETE` | `/:id` | Delete a user account |

---

## Authentication Flow

```
User registers
    └─► POST /send-verification-code  →  6-digit OTP sent to email
    └─► POST /verify-email-code       →  OTP confirmed
    └─► POST /register                →  User created, JWT returned

User logs in
    └─► POST /login                   →  JWT returned (expires in 7 days)
    └─► Token stored in localStorage
    └─► All protected requests send:  Authorization: Bearer <token>

Password reset
    └─► POST /forgot-password         →  6-digit code sent to email (15 min expiry)
    └─► POST /reset-password          →  Code verified, new password saved
```

---

## Security

- **Passwords** are hashed with `bcryptjs` (salt rounds: 10) via a Sequelize `beforeSave` hook — plain-text passwords are never stored.
- **JWT tokens** are signed with `JWT_SECRET` from `.env` and expire after 7 days by default (`JWT_EXPIRE` env var).
- **OTP codes** are 6-digit random codes; the stored value is a bcrypt hash — raw codes are never persisted to the database.
- **Email enumeration prevention:** the forgot-password endpoint returns the same response whether or not the email exists.
- **Password excluded from API responses** via `User.prototype.toJSON()` — it is never serialised to JSON automatically.
- **Role-based access** is enforced server-side via `authorize('admin')` middleware — front-end role checks are UI-only helpers.

---

## Middleware

### `auth.js` — `protect` & `authorize`

```js
// Protect a route — must have a valid JWT
router.get('/profile', protect, getProfile)

// Restrict to specific roles
router.delete('/:id', protect, authorize('admin'), deleteUser)
```

- `protect` — extracts the Bearer token, verifies it, loads the user from DB, and attaches to `req.user`.
- `authorize(...roles)` — checks `req.user.role` against the allowed roles list.

---

## Environment Variables

Add these to `Backend/.env`:

```env
# Database
DATABASE_URL=your_neon_postgres_connection_string

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d

# SMTP (for password reset emails — Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM="TravelGenie" <your_gmail@gmail.com>

# Email verification (signup)
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_password
```

> **Note:** For non-Gmail addresses, OTP codes are printed to the server console instead of being emailed.

---

## Frontend Features

### Login (`Login.jsx`)
- Email + password form with show/hide password toggle
- Stores JWT token and user profile in `localStorage` on success
- Clears previous user data if a different account logs in
- Redirects: `admin` → Admin Dashboard, `user` → User Dashboard

### Signup (`Signup.jsx`)
- Two-step flow: email OTP verification → fill registration form
- Collects: name, email, password, phone, DOB, NIC, gender, travel style, interests

### Forgot Password (`ForgotPassword.jsx`) & Reset Password (`ResetPassword.jsx`)
- Enter registered email → receive 6-digit code
- Enter code + new password to reset

### User Profile (`User/Profile.jsx`)
- View and edit: full name, email, phone, DOB, NIC, gender, avatar
- Travel preferences: travel style, interests
- Data synced with backend on mount; changes saved via `PUT /api/users/profile`

### Admin User Management (`Admin/UserManagement.jsx`)
- Full CRUD: add, view, edit, delete users
- Search by name/email
- Filter by: role, account status, travel style
- Sort by: creation date and other fields
- Interest picker (multi-select: Beaches, Mountains, Food, History, etc.)
- Travel style picker (Relax, Adventure, Culture, Luxury, Budget, Family, Backpacker)

---

## Sample Request & Response

### POST `/api/users/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "mypassword"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "<jwt_token>",
    "user": {
      "id": 1,
      "name": "Kavisha",
      "email": "user@example.com",
      "role": "user",
      "phone": "0771234567",
      "gender": "male",
      "avatar": "",
      "travelStyle": "Adventure",
      "interests": ["Beaches", "Mountains"],
      "preferences": { "currency": "LKR" }
    }
  }
}
```

---

## Related Modules

This module integrates with:
- **Tag Management** — `UserInterest` links users to tags for personalised recommendations
- **Destination Management** — user travel style and interests influence destination filtering
- **Notification Management** — notifications are sent per user ID
- **Review & Feedback** — reviews are authored by user accounts
- **Trip Itinerary / Expense** — all trip and expense data is scoped to a user

---

*IT24100853 — Kishkya Group Project — TravelGenie*
