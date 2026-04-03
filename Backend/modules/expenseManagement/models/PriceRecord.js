const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

const PriceRecord = sequelize.define(
  'PriceRecord',
  {
    price_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    place_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'places', key: 'place_id' },
    },
    item_type: {
      type: DataTypes.ENUM('ticket', 'hotel', 'transport'),
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
    },
    recorded_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'price_records',
    timestamps: false,
  }
);

module.exports = PriceRecord;
