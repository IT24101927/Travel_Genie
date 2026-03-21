const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

const TripDay = sequelize.define(
  'TripDay',
  {
    day_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    trip_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'trip_plans', key: 'trip_id' },
    },
    day_no: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY },
    daily_budget: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    food_budget: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    transport_budget: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    other_budget: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    notes: { type: DataTypes.TEXT },
  },
  { tableName: 'trip_days', timestamps: false }
);

module.exports = TripDay;
