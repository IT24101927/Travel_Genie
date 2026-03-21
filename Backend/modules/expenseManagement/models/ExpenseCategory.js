const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

const ExpenseCategory = sequelize.define(
  'ExpenseCategory',
  {
    category_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    category_name: {
      type: DataTypes.ENUM(
        'Accommodation', 'Food', 'Transport', 'Tickets',
        'Shopping', 'Entertainment', 'Emergency', 'Other'
      ),
      allowNull: false,
      unique: true,
    },
  },
  { tableName: 'expense_categories', timestamps: false }
);

module.exports = ExpenseCategory;
