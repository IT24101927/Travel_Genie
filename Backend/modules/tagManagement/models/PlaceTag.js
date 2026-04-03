const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

// Junction table: Place <-> Tag (many-to-many)
const PlaceTag = sequelize.define(
  'PlaceTag',
  {
    place_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: { model: 'places', key: 'place_id' },
    },
    tag_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: { model: 'tags', key: 'tag_id' },
    },
    weight: { type: DataTypes.FLOAT, defaultValue: 1.0 },
  },
  { tableName: 'place_tags', timestamps: false }
);

module.exports = PlaceTag;
