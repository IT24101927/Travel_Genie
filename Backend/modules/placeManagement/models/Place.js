const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

// Supertype for Destination and Hotel
const Place = sequelize.define(
  'Place',
  {
    place_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    district_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'districts', key: 'district_id' },
    },
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT },
    address_text: { type: DataTypes.STRING(500) },
    image_url: { type: DataTypes.STRING(500) },
    lat: { type: DataTypes.DECIMAL(10, 7) },
    lng: { type: DataTypes.DECIMAL(10, 7) },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    // Destination fields
    type: { type: DataTypes.STRING(50) },
    duration: { type: DataTypes.STRING(100) },
    rating: { type: DataTypes.FLOAT, defaultValue: 0 },
    review_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { tableName: 'places', timestamps: true }
);

module.exports = Place;
