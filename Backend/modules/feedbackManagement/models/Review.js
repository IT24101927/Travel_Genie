const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

const Review = sequelize.define(
  'Review',
  {
    review_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    // Link to Place supertype (covers both Destination & Hotel reviews)
    place_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'places', key: 'place_id' },
    },
    rating: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
    title: { type: DataTypes.STRING(100) },
    comment: { type: DataTypes.TEXT, allowNull: false },
    visit_date: { type: DataTypes.DATEONLY },
    travel_type: {
      type: DataTypes.ENUM('solo', 'couple', 'family', 'friends', 'business'),
    },
    images: { type: DataTypes.JSONB, defaultValue: [] },
    sentiment_score: { type: DataTypes.FLOAT },
    is_flagged: { type: DataTypes.BOOLEAN, defaultValue: false },
    helpful: { type: DataTypes.INTEGER, defaultValue: 0 },
    helpful_by: { type: DataTypes.JSONB, defaultValue: [] },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'approved',
    },
    response: { type: DataTypes.JSONB, defaultValue: null },
  },
  {
    tableName: 'reviews',
    timestamps: true,
    hooks: {
      afterCreate: async (review) => {
        try {
          await Review.updatePlaceRating(review.place_id);
        } catch (err) {
          // Do not fail review creation if aggregate refresh fails.
          console.warn('[Review.afterCreate] rating refresh failed:', err.message);
        }
      },
      afterUpdate: async (review) => {
        if (review.changed('status') || review.changed('rating')) {
          try {
            await Review.updatePlaceRating(review.place_id);
          } catch (err) {
            // Keep update successful even if denormalized counters fail to refresh.
            console.warn('[Review.afterUpdate] rating refresh failed:', err.message);
          }
        }
      },
    },
  }
);

// Recalculate average rating on the Place's Destination or Hotel subtype
Review.updatePlaceRating = async (place_id) => {
  if (!place_id) return;

  const [result] = await sequelize.query(
    `SELECT AVG(rating)::numeric(10,1) AS avg_rating, COUNT(*) AS review_count
     FROM reviews
     WHERE place_id = :place_id AND status = 'approved'`,
    { replacements: { place_id }, type: sequelize.QueryTypes.SELECT }
  );

  if (result) {
    // Update Place supertype rating/counters.
    await sequelize.query(
      `UPDATE places SET rating = :rating, review_count = :count WHERE place_id = :place_id`,
      {
        replacements: {
          rating: parseFloat(result.avg_rating) || 0,
          count: parseInt(result.review_count) || 0,
          place_id,
        },
      }
    );
    // Update Hotel subtype rating if it exists
    await sequelize.query(
      `UPDATE hotels SET rating = :rating, review_count = :count WHERE place_id = :place_id`,
      {
        replacements: {
          rating: parseFloat(result.avg_rating) || 0,
          count: parseInt(result.review_count) || 0,
          place_id,
        },
      }
    );
  }
};

module.exports = Review;
