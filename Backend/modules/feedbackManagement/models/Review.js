const { DataTypes, fn, col } = require('sequelize');
const { sequelize } = require('../../../config/database');

const Review = sequelize.define(
  'Review',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    reviewType: {
      type: DataTypes.ENUM('destination', 'hotel', 'trip'),
      allowNull: false,
    },
    destinationId: {
      type: DataTypes.INTEGER,
      references: { model: 'destinations', key: 'id' },
    },
    hotelId: {
      type: DataTypes.INTEGER,
      references: { model: 'hotels', key: 'id' },
    },
    tripId: {
      type: DataTypes.INTEGER,
      references: { model: 'trip_itineraries', key: 'id' },
    },
    rating: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
    title: { type: DataTypes.STRING(100), allowNull: false },
    comment: { type: DataTypes.TEXT, allowNull: false },
    pros: { type: DataTypes.JSONB, defaultValue: [] },
    cons: { type: DataTypes.JSONB, defaultValue: [] },
    // { cleanliness, service, value, location, facilities } each 1-5
    ratings: { type: DataTypes.JSONB, defaultValue: {} },
    images: { type: DataTypes.JSONB, defaultValue: [] },
    visitDate: { type: DataTypes.DATE },
    travelType: {
      type: DataTypes.ENUM('solo', 'couple', 'family', 'friends', 'business'),
    },
    wouldRecommend: { type: DataTypes.BOOLEAN, defaultValue: true },
    helpful: { type: DataTypes.INTEGER, defaultValue: 0 },
    notHelpful: { type: DataTypes.INTEGER, defaultValue: 0 },
    // Array of user IDs who marked helpful
    helpfulBy: { type: DataTypes.JSONB, defaultValue: [] },
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
    },
    // { comment, respondedBy (userId), respondedAt }
    response: { type: DataTypes.JSONB, defaultValue: null },
    reportCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    tableName: 'reviews',
    timestamps: true,
    hooks: {
      afterCreate: async (review) => {
        await Review.updateTargetRating(review);
      },
      afterUpdate: async (review) => {
        if (review.changed('status') || review.changed('rating')) {
          await Review.updateTargetRating(review);
        }
      },
    },
  }
);

// Recalculate average rating for associated destination or hotel
Review.updateTargetRating = async (review) => {
  const targetField = review.reviewType === 'destination' ? 'destinationId' : 'hotelId';
  const targetId = review[targetField];
  const tableName = review.reviewType === 'destination' ? 'destinations' : 'hotels';

  if (!targetId) return;

  const [results] = await sequelize.query(
    `SELECT AVG(rating)::numeric(10,1) AS avg_rating, COUNT(*) AS review_count
     FROM reviews
     WHERE "${targetField}" = :targetId AND status = 'approved'`,
    { replacements: { targetId }, type: sequelize.QueryTypes.SELECT }
  );

  if (results) {
    await sequelize.query(
      `UPDATE "${tableName}" SET rating = :rating, "reviewCount" = :count WHERE id = :targetId`,
      {
        replacements: {
          rating: parseFloat(results.avg_rating) || 0,
          count: parseInt(results.review_count) || 0,
          targetId,
        },
      }
    );
  }
};

module.exports = Review;
