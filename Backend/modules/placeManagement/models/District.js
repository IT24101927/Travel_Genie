const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

const District = sequelize.define(
  'District',
  {
    district_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    province: { type: DataTypes.STRING(100) },
  },
  { tableName: 'districts', timestamps: false }
);

module.exports = District;
