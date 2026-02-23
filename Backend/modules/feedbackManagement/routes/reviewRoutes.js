const express = require('express');
const router = express.Router();
const {
  getAllReviews,
  getAllReviewsAdmin,
  getReview,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
  updateReviewStatus,
  addResponse,
  getReviewsByDestination,
  getReviewsByHotel
} = require('../controllers/reviewController');

const { protect, authorize } = require('../../../middleware/auth');

// Public routes
router.get('/', getAllReviews);
router.get('/destination/:destinationId', getReviewsByDestination);
router.get('/hotel/:hotelId', getReviewsByHotel);
router.get('/:id', getReview);

// Protected routes (authenticated users)
router.post('/', protect, createReview);
router.put('/:id', protect, updateReview);
router.delete('/:id', protect, deleteReview);
router.post('/:id/helpful', protect, markHelpful);

// Admin only routes
router.get('/admin/all', protect, authorize('admin'), getAllReviewsAdmin);
router.put('/:id/status', protect, authorize('admin'), updateReviewStatus);
router.post('/:id/response', protect, authorize('admin'), addResponse);

module.exports = router;
