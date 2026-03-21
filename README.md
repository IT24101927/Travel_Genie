# TravelGenie

A full-stack travel management web application built with React (Frontend) and Node.js/Express (Backend), using PostgreSQL (Neon) as the database.

## Project Structure

```
Travel_Genie/
├── Backend/        # Node.js + Express REST API
└── Frontend/       # React + Vite web app
```

## Tech Stack

**Frontend**
- React 19 + Vite
- React Router v7
- Leaflet / React-Leaflet (maps)
- React Google Maps API

**Backend**
- Node.js + Express
- Sequelize ORM
- PostgreSQL (Neon cloud database)
- JWT Authentication
- Nodemailer (email)
- Multer (file uploads)

## Features

- User registration, login, and JWT-based authentication
- Role-based access control (User / Admin)
- Destination management with filtering and recommendations
- Trip itinerary planning
- Hotel management
- Expense tracking
- Review and feedback system
- Tag management for places
- Notification system
- Place and district management with image uploads

## Getting Started

### Prerequisites
- Node.js 18+
- A PostgreSQL database (local or [Neon](https://neon.tech))

### Backend Setup

```bash
cd Backend
npm install
```

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your database URL, JWT secret, and SMTP details.

Start the server:

```bash
npm run dev      # development (nodemon)
npm start        # production
```

Optional seed scripts:

```bash
npm run seed:admin       # Create admin user
npm run seed:user        # Create a test user
npm run seed:districts   # Seed Sri Lanka districts
```

### Frontend Setup

```bash
cd Frontend
npm install
```

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your backend API URL (default: `http://localhost:5000`).

Start the dev server:

```bash
npm run dev
```

## Environment Variables

### Backend (`Backend/.env`)

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 5000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT tokens |
| `JWT_EXPIRE` | Token expiry duration (e.g. `7d`) |
| `CORS_ORIGIN` | Allowed frontend origin |
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP server port |
| `SMTP_USER` | SMTP email address |
| `SMTP_PASS` | SMTP app password |

### Frontend (`Frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API base URL |

## License

ISC
