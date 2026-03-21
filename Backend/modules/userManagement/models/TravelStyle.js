const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

const TravelStyle = sequelize.define(
  'TravelStyle',
  {
    style_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    style_name: {
      type: DataTypes.ENUM('Relax', 'Adventure', 'Culture', 'Luxury', 'Budget', 'Family', 'Backpacker'),
      allowNull: false,
      unique: true,
    },
  },
  { tableName: 'travel_styles', timestamps: false }
);

module.exports = TravelStyle;
