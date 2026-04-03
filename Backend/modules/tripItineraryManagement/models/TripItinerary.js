const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

const TripItinerary = sequelize.define(
  'TripItinerary',
  {
    trip_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    district_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'districts', key: 'district_id' },
    },
    title: { type: DataTypes.STRING(200), allowNull: false },
    start_date: { type: DataTypes.DATEONLY, allowNull: false },
    end_date: { type: DataTypes.DATEONLY, allowNull: false },
    num_days: { type: DataTypes.INTEGER },
    num_people: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
    total_budget: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    hotel_budget: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    budget_currency: { type: DataTypes.STRING(10), defaultValue: 'LKR' },
    hotel_place_id: {
      type: DataTypes.INTEGER,
      references: { model: 'places', key: 'place_id' },
    },
    hotel_name: { type: DataTypes.STRING(200) },
    hotel_category: { type: DataTypes.STRING(100) },
    hotel_star_class: { type: DataTypes.INTEGER, validate: { min: 0, max: 5 } },
    hotel_price_min: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    hotel_price_currency: { type: DataTypes.STRING(10), defaultValue: 'LKR' },
    selected_places: { type: DataTypes.JSONB, defaultValue: [] },
    selected_hotels: { type: DataTypes.JSONB, defaultValue: [] },
    preferences: { type: DataTypes.JSONB, defaultValue: {} },
    status: {
      type: DataTypes.ENUM('draft', 'planned', 'ongoing', 'completed', 'cancelled'),
      defaultValue: 'draft',
    },
    notes: { type: DataTypes.TEXT },
  },
  {
    tableName: 'trip_itineraries',
    timestamps: true,
    hooks: {
      beforeSave: (trip) => {
        if (trip.start_date && trip.end_date) {
          const diffTime = Math.abs(new Date(trip.end_date) - new Date(trip.start_date));
          trip.num_days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
      },
    },
  }
);

module.exports = TripItinerary;
