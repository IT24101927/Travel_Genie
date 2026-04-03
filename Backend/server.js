const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import Routes
const userRoutes = require('./modules/userManagement/routes/userRoutes');
const preferenceRoutes = require('./modules/userManagement/routes/preferenceRoutes');
const destinationRoutes = require('./modules/destinationManagement/routes/destinationRoutes');
const hotelRoutes = require('./modules/hotelManagement/routes/hotelRoutes');
const expenseRoutes = require('./modules/expenseManagement/routes/expenseRoutes');
const reviewRoutes = require('./modules/feedbackManagement/routes/reviewRoutes');
const placeRoutes = require('./modules/placeManagement/routes/placeRoutes');
const tagRoutes = require('./modules/tagManagement/routes/tagRoutes');
const tripPlanRoutes = require('./modules/tripItineraryManagement/routes/tripPlanRoutes');
const notificationRoutes = require('./modules/notificationManagement/routes/notificationRoutes');
const priceRecordRoutes = require('./modules/expenseManagement/routes/priceRecordRoutes');

// Initialize Express App
const app = express();

const allowedOrigins = [
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
];

// Connect to Database
connectDB();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, Postman)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('tiny'));
}

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/preferences', preferenceRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reviews', reviewRoutes);
// New EER-based routes (placeRoutes handles /districts and /places sub-paths)
app.use('/api', placeRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/trips', tripPlanRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/price-records', priceRecordRoutes);

// Health Check Route
app.get('/', (req, res) => {
  res.json({ 
    message: 'TravelGenie API Server',
    status: 'Running',
    version: '1.0.0'
  });
});

// Error Handler Middleware (should be last)
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;
const ENV = process.env.NODE_ENV || 'development';
app.listen(PORT, () => {
  console.log('\n  ╔══════════════════════════════════════╗');
  console.log('  ║       TravelGenie API Server         ║');
  console.log('  ╠══════════════════════════════════════╣');
  console.log(`  ║  Port        : ${String(PORT).padEnd(22)}║`);
  console.log(`  ║  Environment : ${ENV.padEnd(22)}║`);
  console.log('  ╚══════════════════════════════════════╝\n');
});

module.exports = app;
