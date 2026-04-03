const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

const Notification = sequelize.define(
  'Notification',
  {
    notification_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    trip_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'trip_itineraries', key: 'trip_id' },
    },
    expense_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'expenses', key: 'expense_id' },
    },
    type: {
      type: DataTypes.ENUM('BUDGET_80', 'BUDGET_100', 'PRICE_CHANGE'),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'notifications',
    timestamps: false,
  }
);

module.exports = Notification;
