# TravelGenie Backend API

A comprehensive Node.js backend API for the TravelGenie travel management system.

## Features

### 1. User Account Management
- User registration and authentication (JWT-based)
- User profiles with preferences
- Role-based access control (User, Admin)
- Password management

### 2. Destination Management
- CRUD operations for destinations
- Geospatial queries (find destinations within radius)
- Search and filtering by category, country
- Popular destinations
- Image gallery and attractions

### 3. Trip Itinerary Management
- Create and manage trip itineraries
- Day-by-day planning with activities
- Trip sharing with other users
- Status tracking (draft, planned, ongoing, completed)
- Document management

### 4. Hotel and Accommodation
- Hotel listings with detailed information
- Room types and pricing
- Search and filter by location, price, rating
- Geospatial queries
- Featured hotels

### 5. Expense Management
- Track trip expenses by category
- Split expenses between travelers
- Expense analytics and statistics
- Receipt uploads
- Multi-currency support

### 6. Feedback and Review System
- Reviews for destinations and hotels
- Rating system (1-5 stars)
- Helpful/not helpful voting
- Admin moderation
- Response system

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM (Neon for cloud/team collaboration)
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcryptjs for password hashing
- **Validation**: express-validator

## 🗄️ Database Setup

### Cloud Database (Recommended for Teams)

We use **[Neon](https://neon.tech)** - a serverless PostgreSQL platform that allows the entire team to share the same database.

**Benefits:**
- ✅ No local PostgreSQL installation needed
- ✅ Shared database for all team members
- ✅ Free tier (512 MB storage, 3 projects)
- ✅ Automatic backups & SSL encryption
- ✅ Database branching for dev/staging/production

**Quick Setup:**
1. See **[NEON_SETUP.md](./NEON_SETUP.md)** for detailed instructions
2. Get connection string from [Neon Console](https://console.neon.tech)
3. Add to `.env`: `DATABASE_URL=postgresql://user:pass@host/db?sslmode=require`
4. Run `npm run test:db` to verify connection

**Quick Reference:**
- 📖 **[NEON_SETUP.md](./NEON_SETUP.md)** - Complete setup guide
- 📋 **[DATABASE_REFERENCE.md](./DATABASE_REFERENCE.md)** - Quick reference & commands

### Local Database (Optional)

If you prefer local development:
```bash
# Install PostgreSQL, then:
createdb travelgenie
psql travelgenie -f config/migration.sql
```

Update `.env`:
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/travelgenie
```

## Project Structure

```
Backend/
├── config/
│   ├── database.js          # PostgreSQL/Sequelize connection
│   ├── associations.js      # Sequelize model associations
│   └── config.js            # App configuration
├── middleware/
│   ├── auth.js              # Authentication & authorization
│   └── errorHandler.js      # Error handling middleware
├── modules/
│   ├── userManagement/
│   │   ├── models/          # User model
│   │   ├── controllers/     # User controllers
│   │   └── routes/          # User routes
│   ├── destinationManagement/
│   │   ├── models/          # Destination model
│   │   ├── controllers/     # Destination controllers
│   │   └── routes/          # Destination routes
│   ├── tripItineraryManagement/
│   │   ├── models/          # Trip model
│   │   ├── controllers/     # Trip controllers
│   │   └── routes/          # Trip routes
│   ├── hotelManagement/
│   │   ├── models/          # Hotel model
│   │   ├── controllers/     # Hotel controllers
│   │   └── routes/          # Hotel routes
│   ├── expenseManagement/
│   │   ├── models/          # Expense model
│   │   ├── controllers/     # Expense controllers
│   │   └── routes/          # Expense routes
│   └── feedbackManagement/
│       ├── models/          # Review model
│       ├── controllers/     # Review controllers
│       └── routes/          # Review routes
├── utils/
│   └── helpers.js           # Utility functions
├── .env.example             # Environment variables template
├── server.js                # Main application entry point
└── package.json             # Dependencies and scripts
```

## Installation

### 1. Install dependencies:
```bash
npm install
```

### 2. Setup Database

**Option A: Neon Cloud Database (Recommended)**
- Follow the complete guide: **[NEON_SETUP.md](./NEON_SETUP.md)**
- Quick steps:
  1. Create account at [neon.tech](https://neon.tech)
  2. Create project & copy connection string
  3. Run schema migration in Neon SQL Editor
  4. Add connection string to `.env`

**Option B: Local PostgreSQL**
```bash
createdb travelgenie
psql travelgenie -f config/migration.sql
```

### 3. Create `.env` file:
```bash
cp .env.example .env
```

### 4. Update `.env` with your configuration:

**For Neon (Cloud):**
```env
PORT=5000
NODE_ENV=development

# Neon Database
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require

JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:5173
```

**For Local PostgreSQL:**
```env
PORT=5000
NODE_ENV=development

# Local Database
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/travelgenie

JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:5173
```

### 5. Test your database connection:
```bash
npm run test:db
```

You should see:
```
✅ Database connection successful!
✅ Found X table(s) in database
🎉 Database is ready to use!
```

## Running the Application

### Development mode (with auto-restart):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### User Management
- POST `/api/users/register` - Register new user
- POST `/api/users/login` - Login user
- GET `/api/users/profile` - Get user profile (Protected)
- PUT `/api/users/profile` - Update profile (Protected)
- PUT `/api/users/change-password` - Change password (Protected)
- GET `/api/users` - Get all users (Admin)
- GET `/api/users/:id` - Get user by ID (Admin)
- PUT `/api/users/:id` - Update user (Admin)
- DELETE `/api/users/:id` - Delete user (Admin)

### Destination Management
- GET `/api/destinations` - Get all destinations
- GET `/api/destinations/popular` - Get popular destinations
- GET `/api/destinations/radius/:lng/:lat/:distance` - Get destinations within radius
- GET `/api/destinations/:id` - Get single destination
- POST `/api/destinations` - Create destination (Admin)
- PUT `/api/destinations/:id` - Update destination (Admin)
- DELETE `/api/destinations/:id` - Delete destination (Admin)

### Trip Itinerary Management
- GET `/api/trips` - Get user's trips (Protected)
- GET `/api/trips/upcoming` - Get upcoming trips (Protected)
- GET `/api/trips/:id` - Get single trip (Protected)
- POST `/api/trips` - Create trip (Protected)
- PUT `/api/trips/:id` - Update trip (Protected)
- DELETE `/api/trips/:id` - Delete trip (Protected)
- POST `/api/trips/:id/share` - Share trip (Protected)
- PUT `/api/trips/:id/status` - Update trip status (Protected)

### Hotel Management
- GET `/api/hotels` - Get all hotels
- GET `/api/hotels/featured` - Get featured hotels
- GET `/api/hotels/radius/:lng/:lat/:distance` - Get hotels within radius
- GET `/api/hotels/destination/:destinationId` - Get hotels by destination
- GET `/api/hotels/:id` - Get single hotel
- POST `/api/hotels` - Create hotel (Admin)
- PUT `/api/hotels/:id` - Update hotel (Admin)
- DELETE `/api/hotels/:id` - Delete hotel (Admin)

### Expense Management
- GET `/api/expenses` - Get user's expenses (Protected)
- GET `/api/expenses/stats` - Get expense statistics (Protected)
- GET `/api/expenses/trip/:tripId` - Get expenses by trip (Protected)
- GET `/api/expenses/:id` - Get single expense (Protected)
- POST `/api/expenses` - Create expense (Protected)
- PUT `/api/expenses/:id` - Update expense (Protected)
- DELETE `/api/expenses/:id` - Delete expense (Protected)

### Review Management
- GET `/api/reviews` - Get all reviews
- GET `/api/reviews/destination/:destinationId` - Get reviews by destination
- GET `/api/reviews/hotel/:hotelId` - Get reviews by hotel
- GET `/api/reviews/:id` - Get single review
- POST `/api/reviews` - Create review (Protected)
- PUT `/api/reviews/:id` - Update review (Protected)
- DELETE `/api/reviews/:id` - Delete review (Protected)
- POST `/api/reviews/:id/helpful` - Mark review as helpful (Protected)
- PUT `/api/reviews/:id/status` - Update review status (Admin)
- POST `/api/reviews/:id/response` - Add response to review (Admin)

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Error Handling

The API uses standard HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Server Error

Error responses follow this format:
```json
{
  "success": false,
  "error": "Error message"
}
```

Success responses follow this format:
```json
{
  "success": true,
  "message": "Success message",
  "data": {}
}
```

## Database Models

The application uses the following PostgreSQL tables (auto-created by Sequelize `sync`):
- `users`
- `destinations`
- `hotels`
- `trip_itineraries`
- `TripHotels` (junction table for trips ↔ hotels)
- `expenses`
- `reviews`

## License

ISC
