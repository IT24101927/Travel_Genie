const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

const TripStay = sequelize.define(
  'TripStay',
  {
    stay_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    trip_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'trip_plans', key: 'trip_id' },
    },
    hotel_place_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'places', key: 'place_id' },
    },
    check_in: { type: DataTypes.DATEONLY, allowNull: false },
    check_out: { type: DataTypes.DATEONLY, allowNull: false },
    est_cost: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    notes: { type: DataTypes.TEXT },
  },
  { tableName: 'trip_stays', timestamps: false }
);

module.exports = TripStay;
