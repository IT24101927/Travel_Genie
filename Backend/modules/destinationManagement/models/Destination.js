const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

// Subtype of Place - shares place_id as PK/FK
const Destination = sequelize.define(
  'Destination',
  {
    // PK is also a FK to places.place_id
    place_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: { model: 'places', key: 'place_id' },
    },
    destination_category: {
      type: DataTypes.ENUM(
        'beach', 'mountain', 'city', 'historical', 'adventure',
        'cultural', 'nature', 'religious', 'wildlife', 'other'
      ),
      allowNull: false,
    },
    opening_hours: { type: DataTypes.STRING(200) },
    best_time_to_visit: {
      type: DataTypes.ENUM(
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december', 'year-round'
      ),
    },
    rating: { type: DataTypes.FLOAT, defaultValue: 0, validate: { min: 0, max: 5 } },
    review_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    entry_fee: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  },
  { tableName: 'destinations', timestamps: false }
);

module.exports = Destination;
