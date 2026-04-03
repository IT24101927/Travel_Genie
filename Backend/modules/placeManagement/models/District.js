const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

const District = sequelize.define(
  'District',
  {
    district_id:  { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name:         { type: DataTypes.STRING(100), allowNull: false, unique: true },
    province:     { type: DataTypes.STRING(100) },
    description:  { type: DataTypes.TEXT },
    highlights:   { type: DataTypes.ARRAY(DataTypes.TEXT) },
    best_for:     { type: DataTypes.ARRAY(DataTypes.TEXT) },
    image_url:    { type: DataTypes.TEXT },
  },
  { tableName: 'districts', timestamps: false }
);

module.exports = District;
