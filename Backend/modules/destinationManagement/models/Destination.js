const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

const Destination = sequelize.define(
  'Destination',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    country: { type: DataTypes.STRING, allowNull: false },
    city: { type: DataTypes.STRING, allowNull: false },
    // { type: 'Point', coordinates: [lng, lat] }
    location: { type: DataTypes.JSONB, defaultValue: {} },
    category: {
      type: DataTypes.ENUM(
        'beach', 'mountain', 'city', 'historical', 'adventure',
        'cultural', 'nature', 'religious', 'other'
      ),
      allowNull: false,
    },
    images: { type: DataTypes.JSONB, defaultValue: [] },
    attractions: { type: DataTypes.JSONB, defaultValue: [] },
    bestTimeToVisit: {
      type: DataTypes.ENUM(
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december', 'year-round'
      ),
    },
    // { min, max, currency }
    averageCost: { type: DataTypes.JSONB, defaultValue: { min: 0, max: 0, currency: 'USD' } },
    activities: { type: DataTypes.JSONB, defaultValue: [] },
    // { averageTemperature, climate }
    weather: { type: DataTypes.JSONB, defaultValue: {} },
    languages: { type: DataTypes.JSONB, defaultValue: [] },
    currency: { type: DataTypes.STRING },
    timeZone: { type: DataTypes.STRING },
    popularWith: { type: DataTypes.JSONB, defaultValue: [] },
    rating: { type: DataTypes.FLOAT, defaultValue: 0, validate: { min: 0, max: 5 } },
    reviewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    createdBy: {
      type: DataTypes.INTEGER,
      references: { model: 'users', key: 'id' },
    },
  },
  { tableName: 'destinations', timestamps: true }
);

module.exports = Destination;
