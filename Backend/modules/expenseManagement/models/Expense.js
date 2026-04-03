const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

const Expense = sequelize.define(
  'Expense',
  {
    expense_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    trip_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'trip_itineraries', key: 'trip_id' },
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    category_id: {
      type: DataTypes.INTEGER,
      references: { model: 'expense_categories', key: 'category_id' },
    },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, validate: { min: 0 } },
    currency: { type: DataTypes.STRING(10), defaultValue: 'LKR' },
    expense_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
    note: { type: DataTypes.STRING(500) },
    expense_type: {
      type: DataTypes.ENUM('ESTIMATED', 'ACTUAL'),
      allowNull: false,
      defaultValue: 'ACTUAL',
    },
    payment_method: {
      type: DataTypes.ENUM(
        'cash', 'credit-card', 'debit-card', 'online-payment', 'bank-transfer', 'other'
      ),
      defaultValue: 'cash',
    },
    receipt_url: { type: DataTypes.STRING(500) },
  },
  { tableName: 'expenses', timestamps: true }
);

module.exports = Expense;
