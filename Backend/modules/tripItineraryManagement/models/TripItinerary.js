const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

const TripItinerary = sequelize.define(
  'TripItinerary',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    destinationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'places', key: 'place_id' },
    },
    startDate: { type: DataTypes.DATE, allowNull: false },
    endDate: { type: DataTypes.DATE, allowNull: false },
    numberOfDays: { type: DataTypes.INTEGER },
    numberOfTravelers: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
    // { amount, currency }
    budget: { type: DataTypes.JSONB, defaultValue: { amount: 0, currency: 'USD' } },
    itinerary: { type: DataTypes.JSONB, defaultValue: [] },
    status: {
      type: DataTypes.ENUM('draft', 'planned', 'ongoing', 'completed', 'cancelled'),
      defaultValue: 'draft',
    },
    // { flights, hotels, activities }
    bookingStatus: {
      type: DataTypes.JSONB,
      defaultValue: { flights: false, hotels: false, activities: false },
    },
    travelType: {
      type: DataTypes.ENUM('solo', 'couple', 'family', 'friends', 'business', 'group'),
      allowNull: false,
    },
    preferences: { type: DataTypes.JSONB, defaultValue: {} },
    documents: { type: DataTypes.JSONB, defaultValue: [] },
    notes: { type: DataTypes.TEXT },
    isPublic: { type: DataTypes.BOOLEAN, defaultValue: false },
    // Array of user IDs (integers)
    sharedWith: { type: DataTypes.JSONB, defaultValue: [] },
    totalExpenses: { type: DataTypes.FLOAT, defaultValue: 0 },
  },
  {
    tableName: 'trip_itineraries',
    timestamps: true,
    hooks: {
      beforeSave: (trip) => {
        if (trip.startDate && trip.endDate) {
          const diffTime = Math.abs(new Date(trip.endDate) - new Date(trip.startDate));
          trip.numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }
      },
    },
  }
);

module.exports = TripItinerary;
