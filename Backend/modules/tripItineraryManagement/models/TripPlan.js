const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

const TripPlan = sequelize.define(
  'TripPlan',
  {
    trip_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    title: { type: DataTypes.STRING(200), allowNull: false },
    start_date: { type: DataTypes.DATEONLY, allowNull: false },
    end_date: { type: DataTypes.DATEONLY, allowNull: false },
    num_days: { type: DataTypes.INTEGER },
    num_people: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
    total_budget: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    hotel_budget: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    status: {
      type: DataTypes.ENUM('draft', 'planned', 'ongoing', 'completed', 'cancelled'),
      defaultValue: 'draft',
    },
    notes: { type: DataTypes.TEXT },
  },
  {
    tableName: 'trip_plans',
    timestamps: true,
    hooks: {
      beforeSave: (trip) => {
        if (trip.start_date && trip.end_date) {
          const diffTime = Math.abs(new Date(trip.end_date) - new Date(trip.start_date));
          trip.num_days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }
      },
    },
  }
);

module.exports = TripPlan;
