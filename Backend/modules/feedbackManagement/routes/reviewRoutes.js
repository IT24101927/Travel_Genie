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
  unflagReview,
  updateReviewStatus,
  addResponse,
} = require('../controllers/reviewController');

const { protect, authorize } = require('../../../middleware/auth');
const {
  positiveIntParam,
  requireFields,
  requireAtLeastOneField,
  enumField,
  numberField,
} = require('../../../middleware/requestValidation');

// Protected: current user's reviews
router.get('/my',                  protect, getMyReviews);

// Public routes
router.get('/',                    getAllReviews);
router.get('/place/:placeId',      positiveIntParam('placeId', 'placeId'), getReviewsByPlace);

// Admin only
router.get('/admin/all',           protect, authorize('admin'), getAllReviewsAdmin);

// Protected routes
router.post('/',                   protect, requireFields(['place_id', 'rating', 'comment']), numberField('rating', { required: true, integer: true, min: 1, max: 5 }), createReview);
router.put('/:id',                 protect, positiveIntParam('id'), requireAtLeastOneField(['rating', 'title', 'comment', 'visit_date', 'travel_type', 'travelType', 'visitDate', 'images']), numberField('rating', { integer: true, min: 1, max: 5 }), updateReview);
router.delete('/:id',              protect, positiveIntParam('id'), deleteReview);
router.post('/:id/helpful',        protect, positiveIntParam('id'), markHelpful);
router.post('/:id/flag',           protect, positiveIntParam('id'), flagReview);
router.post('/:id/unflag',         protect, positiveIntParam('id'), unflagReview);
router.put('/:id/unflag',          protect, positiveIntParam('id'), unflagReview);

router.put('/:id/status',          protect, authorize('admin'), positiveIntParam('id'), enumField('status', ['pending', 'approved', 'rejected'], { required: true }), updateReviewStatus);
router.post('/:id/response',       protect, authorize('admin'), positiveIntParam('id'), requireFields(['comment']), addResponse);

// Public routes with params must remain at the end.
router.get('/:id',                 positiveIntParam('id'), getReview);

module.exports = router;
