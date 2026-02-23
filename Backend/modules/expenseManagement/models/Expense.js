const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

const Expense = sequelize.define(
  'Expense',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tripId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'trip_itineraries', key: 'id' },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    category: {
      type: DataTypes.ENUM(
        'accommodation', 'transportation', 'food', 'activities',
        'shopping', 'entertainment', 'emergency', 'other'
      ),
      allowNull: false,
    },
    subcategory: { type: DataTypes.STRING },
    description: { type: DataTypes.STRING(500), allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false, validate: { min: 0 } },
    currency: { type: DataTypes.STRING, defaultValue: 'USD' },
    // { amount, currency, exchangeRate }
    convertedAmount: { type: DataTypes.JSONB, defaultValue: {} },
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    paymentMethod: {
      type: DataTypes.ENUM(
        'cash', 'credit-card', 'debit-card', 'online-payment', 'bank-transfer', 'other'
      ),
      allowNull: false,
    },
    paidById: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    // [{ userId, amount, paid }]
    splitBetween: { type: DataTypes.JSONB, defaultValue: [] },
    // { url, uploadedAt }
    receipt: { type: DataTypes.JSONB, defaultValue: {} },
    // { name, address, coordinates: [lng, lat] }
    location: { type: DataTypes.JSONB, defaultValue: {} },
    tags: { type: DataTypes.JSONB, defaultValue: [] },
    notes: { type: DataTypes.TEXT },
    isRecurring: { type: DataTypes.BOOLEAN, defaultValue: false },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'settled', 'cancelled'),
      defaultValue: 'paid',
    },
  },
  { tableName: 'expenses', timestamps: true }
);

module.exports = Expense;
