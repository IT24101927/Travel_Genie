const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

// Junction table: User <-> Tag (many-to-many - user interests)
const UserInterest = sequelize.define(
  'UserInterest',
  {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: { model: 'users', key: 'id' },
    },
    tag_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: { model: 'tags', key: 'tag_id' },
    },
  },
  { tableName: 'user_interests', timestamps: false }
);

module.exports = UserInterest;
