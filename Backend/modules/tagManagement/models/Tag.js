const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

const Tag = sequelize.define(
  'Tag',
  {
    tag_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tag_name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    tag_type: {
      type: DataTypes.ENUM('INTEREST', 'ACTIVITY', 'CLIMATE', 'ATTRACTION', 'AMENITY', 'HOTEL_TYPE'),
      allowNull: false,
    },
  },
  { tableName: 'tags', timestamps: false }
);

module.exports = Tag;
