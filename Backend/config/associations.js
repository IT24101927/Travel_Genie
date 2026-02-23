/**
 * Sequelize model associations
 * Imported once during database initialization in config/database.js
 */
const User = require('../modules/userManagement/models/User');
const Destination = require('../modules/destinationManagement/models/Destination');
const Hotel = require('../modules/hotelManagement/models/Hotel');
const TripItinerary = require('../modules/tripItineraryManagement/models/TripItinerary');
const Expense = require('../modules/expenseManagement/models/Expense');
const Review = require('../modules/feedbackManagement/models/Review');

// ── User ────────────────────────────────────────────────────────────────────
User.hasMany(Destination, { foreignKey: 'createdBy', as: 'createdDestinations' });
User.hasMany(Hotel, { foreignKey: 'createdBy', as: 'createdHotels' });
User.hasMany(TripItinerary, { foreignKey: 'userId', as: 'trips' });
User.hasMany(Expense, { foreignKey: 'userId', as: 'expenses' });
User.hasMany(Expense, { foreignKey: 'paidById', as: 'paidExpenses' });
User.hasMany(Review, { foreignKey: 'userId', as: 'reviews' });

// ── Destination ─────────────────────────────────────────────────────────────
Destination.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Destination.hasMany(Hotel, { foreignKey: 'destinationId', as: 'hotels' });
Destination.hasMany(TripItinerary, { foreignKey: 'destinationId', as: 'trips' });
Destination.hasMany(Review, { foreignKey: 'destinationId', as: 'reviews' });

// ── Hotel ───────────────────────────────────────────────────────────────────
Hotel.belongsTo(Destination, { foreignKey: 'destinationId', as: 'destination' });
Hotel.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Hotel.hasMany(Review, { foreignKey: 'hotelId', as: 'reviews' });
Hotel.belongsToMany(TripItinerary, {
  through: 'TripHotels',
  foreignKey: 'hotelId',
  otherKey: 'tripId',
  as: 'tripItineraries',
});

// ── TripItinerary ────────────────────────────────────────────────────────────
TripItinerary.belongsTo(User, { foreignKey: 'userId', as: 'user' });
TripItinerary.belongsTo(Destination, { foreignKey: 'destinationId', as: 'destination' });
TripItinerary.hasMany(Expense, { foreignKey: 'tripId', as: 'expenses' });
TripItinerary.hasMany(Review, { foreignKey: 'tripId', as: 'reviews' });
TripItinerary.belongsToMany(Hotel, {
  through: 'TripHotels',
  foreignKey: 'tripId',
  otherKey: 'hotelId',
  as: 'hotels',
});

// ── Expense ──────────────────────────────────────────────────────────────────
Expense.belongsTo(TripItinerary, { foreignKey: 'tripId', as: 'trip' });
Expense.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Expense.belongsTo(User, { foreignKey: 'paidById', as: 'paidBy' });

// ── Review ───────────────────────────────────────────────────────────────────
Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Review.belongsTo(Destination, { foreignKey: 'destinationId', as: 'destination' });
Review.belongsTo(Hotel, { foreignKey: 'hotelId', as: 'hotel' });
Review.belongsTo(TripItinerary, { foreignKey: 'tripId', as: 'trip' });
