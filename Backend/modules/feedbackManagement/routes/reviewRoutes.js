const express = require('express');
const router = express.Router();
const {
  getAllReviews,
  getAllReviewsAdmin,
  getReviewsByPlace,
  getMyReviews,
  getReview,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
  flagReview,
  updateReviewStatus,
  addResponse,
  logRecommendation,
  getRecommendationLogs,
} = require('../controllers/reviewController');

const { protect, authorize } = require('../../../middleware/auth');

// Recommendation log routes (admin)
router.get('/rec-log',  protect, authorize('admin'), getRecommendationLogs);
router.post('/rec-log', protect, logRecommendation);

// Protected: current user's reviews
router.get('/my',                  protect, getMyReviews);

// Public routes
router.get('/',                    getAllReviews);
router.get('/place/:placeId',      getReviewsByPlace);
router.get('/:id',                 getReview);

// Protected routes
router.post('/',                   protect, createReview);
router.put('/:id',                 protect, updateReview);
router.delete('/:id',              protect, deleteReview);
router.post('/:id/helpful',        protect, markHelpful);
router.post('/:id/flag',           protect, flagReview);

// Admin only
router.get('/admin/all',           protect, authorize('admin'), getAllReviewsAdmin);
router.put('/:id/status',          protect, authorize('admin'), updateReviewStatus);
router.post('/:id/response',       protect, authorize('admin'), addResponse);

module.exports = router;
