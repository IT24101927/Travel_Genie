const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

const PlaceImage = sequelize.define(
  'PlaceImage',
  {
    image_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    place_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'places', key: 'place_id' },
    },
    image_url: { type: DataTypes.STRING(500), allowNull: false },
    caption: { type: DataTypes.STRING(300) },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { tableName: 'place_images', timestamps: true }
);

module.exports = PlaceImage;
