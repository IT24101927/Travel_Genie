const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

const ItineraryItem = sequelize.define(
  'ItineraryItem',
  {
    item_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    day_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'trip_days', key: 'day_id' },
    },
    place_id: {
      type: DataTypes.INTEGER,
      references: { model: 'places', key: 'place_id' },
    },
    item_type: {
      type: DataTypes.ENUM('DESTINATION_VISIT', 'HOTEL_STAY', 'FOOD', 'TRANSPORT', 'ACTIVITY', 'OTHER'),
      allowNull: false,
      defaultValue: 'DESTINATION_VISIT',
    },
    description: { type: DataTypes.STRING(500) },
    est_cost: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    start_time: { type: DataTypes.TIME },
    end_time: { type: DataTypes.TIME },
    priority_score: { type: DataTypes.FLOAT, defaultValue: 0 },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { tableName: 'itinerary_items', timestamps: false }
);

module.exports = ItineraryItem;
