const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

// Subtype of Place - hotel_id is the PK, place_id is FK to places
const Hotel = sequelize.define(
  'Hotel',
  {
    hotel_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    place_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'places', key: 'place_id' },
    },
    nearby_place_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'places', key: 'place_id' },
    },
    name:         { type: DataTypes.STRING(200), allowNull: false, defaultValue: '' },
    address_text: { type: DataTypes.STRING(500) },
    description:  { type: DataTypes.TEXT },
    image_url:    { type: DataTypes.STRING(500) },
    hotel_type: {
      type: DataTypes.ENUM(
        'hotel', 'resort', 'hostel', 'guesthouse', 'apartment', 'villa', 'motel', 'boutique'
      ),
      allowNull: false,
    },
    price_per_night: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    star_class: {
      type: DataTypes.INTEGER,
      validate: { min: 1, max: 5 },
    },
    amenities: { type: DataTypes.JSONB, defaultValue: [] },
    contact: { type: DataTypes.JSONB, defaultValue: {} },
    rating: { type: DataTypes.FLOAT, defaultValue: 0, validate: { min: 0, max: 5 } },
    review_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { tableName: 'hotels', timestamps: false }
);

module.exports = Hotel;
