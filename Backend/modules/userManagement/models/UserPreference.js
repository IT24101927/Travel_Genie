const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

const UserPreference = sequelize.define(
  'UserPreference',
  {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: { model: 'users', key: 'id' },
    },
    style_id: {
      type: DataTypes.INTEGER,
      references: { model: 'travel_styles', key: 'style_id' },
    },
    preferred_weather: { type: DataTypes.STRING(100) },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { tableName: 'user_preferences', timestamps: false }
);

module.exports = UserPreference;
