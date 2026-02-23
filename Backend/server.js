const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const { connectDB } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import Routes
const userRoutes = require('./modules/userManagement/routes/userRoutes');
const destinationRoutes = require('./modules/destinationManagement/routes/destinationRoutes');
const tripItineraryRoutes = require('./modules/tripItineraryManagement/routes/tripItineraryRoutes');
const hotelRoutes = require('./modules/hotelManagement/routes/hotelRoutes');
const expenseRoutes = require('./modules/expenseManagement/routes/expenseRoutes');
const reviewRoutes = require('./modules/feedbackManagement/routes/reviewRoutes');

// Initialize Express App
const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      process.env.CORS_ORIGIN,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174'
    ].filter(Boolean);
    // Allow requests with no origin (e.g. mobile apps, Postman)
    if (!origin || allowed.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/trips', tripItineraryRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reviews', reviewRoutes);

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
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

module.exports = app;
