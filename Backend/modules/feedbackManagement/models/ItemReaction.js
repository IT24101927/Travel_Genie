const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

const ItemReaction = sequelize.define(
  'ItemReaction',
  {
    reaction_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'itinerary_items', key: 'item_id' },
    },
    reaction: {
      type: DataTypes.ENUM('LIKE', 'DISLIKE'),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'item_reactions',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['user_id', 'item_id'] }, // One reaction per user per item
    ],
  }
);

module.exports = ItemReaction;
