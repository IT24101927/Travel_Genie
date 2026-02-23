const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

const Hotel = sequelize.define(
  'Hotel',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    destinationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'destinations', key: 'id' },
    },
    // { street, city, state, country, zipCode }
    address: { type: DataTypes.JSONB, defaultValue: {} },
    // { type: 'Point', coordinates: [lng, lat] }
    location: { type: DataTypes.JSONB, defaultValue: {} },
    starRating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    category: {
      type: DataTypes.ENUM(
        'hotel', 'resort', 'hostel', 'guesthouse', 'apartment', 'villa', 'motel', 'boutique'
      ),
      allowNull: false,
    },
    amenities: { type: DataTypes.JSONB, defaultValue: [] },
    images: { type: DataTypes.JSONB, defaultValue: [] },
    rooms: { type: DataTypes.JSONB, defaultValue: [] },
    // { phone, email, website }
    contact: { type: DataTypes.JSONB, defaultValue: {} },
    checkInTime: { type: DataTypes.STRING, defaultValue: '14:00' },
    checkOutTime: { type: DataTypes.STRING, defaultValue: '11:00' },
    cancellationPolicy: { type: DataTypes.TEXT, allowNull: false },
    paymentMethods: { type: DataTypes.JSONB, defaultValue: [] },
    rating: { type: DataTypes.FLOAT, defaultValue: 0, validate: { min: 0, max: 5 } },
    reviewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    // { min, max, currency }
    priceRange: { type: DataTypes.JSONB, defaultValue: { min: 0, max: 0, currency: 'USD' } },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    isFeatured: { type: DataTypes.BOOLEAN, defaultValue: false },
    createdBy: {
      type: DataTypes.INTEGER,
      references: { model: 'users', key: 'id' },
    },
  },
  { tableName: 'hotels', timestamps: true }
);

module.exports = Hotel;
