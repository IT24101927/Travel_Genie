const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

// Subtype of Place - shares place_id as PK/FK
const Hotel = sequelize.define(
  'Hotel',
  {
    // PK is also a FK to places.place_id
    place_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: { model: 'places', key: 'place_id' },
    },
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
    phone: { type: DataTypes.STRING(50) },
    check_in_time: { type: DataTypes.STRING(10), defaultValue: '14:00' },
    check_out_time: { type: DataTypes.STRING(10), defaultValue: '11:00' },
    amenities: { type: DataTypes.JSONB, defaultValue: [] },
    contact: { type: DataTypes.JSONB, defaultValue: {} },
    cancellation_policy: { type: DataTypes.TEXT },
    rating: { type: DataTypes.FLOAT, defaultValue: 0, validate: { min: 0, max: 5 } },
    review_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_featured: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { tableName: 'hotels', timestamps: false }
);

module.exports = Hotel;
