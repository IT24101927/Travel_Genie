const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

const RecommendationLog = sequelize.define(
  'RecommendationLog',
  {
    rec_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    trip_id: {
      type: DataTypes.INTEGER,
      references: { model: 'trip_plans', key: 'trip_id' },
    },
    place_id: {
      type: DataTypes.INTEGER,
      references: { model: 'places', key: 'place_id' },
    },
    rec_type: {
      type: DataTypes.ENUM('DESTINATION', 'HOTEL'),
      allowNull: false,
    },
    score: { type: DataTypes.FLOAT },
    rank: { type: DataTypes.INTEGER },
    user_action: {
      type: DataTypes.ENUM('VIEWED', 'SELECTED', 'IGNORED'),
      defaultValue: 'VIEWED',
    },
  },
  { tableName: 'recommendation_logs', timestamps: true }
);

module.exports = RecommendationLog;
