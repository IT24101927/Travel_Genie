const express = require('express');
const router = express.Router();
const {
  getAllDestinations,
  getDestination,
  createDestination,
  updateDestination,
  deleteDestination,
  getPopularDestinations,
  getDestinationsByDistrict,
  getRecommendedDestinations,
  getRecommendedForUser,
  getDestinationTypes,
} = require('../controllers/destinationController');

const { protect, authorize } = require('../../../middleware/auth');
const {
  positiveIntParam,
  requireFields,
  requireAtLeastOneField,
} = require('../../../middleware/requestValidation');

// Public routes
router.get('/',                         getAllDestinations);
router.get('/popular',                  getPopularDestinations);
router.get('/types',                    getDestinationTypes);
router.get('/district/:districtId',     positiveIntParam('districtId', 'districtId'), getDestinationsByDistrict);

// Private - recommended destinations based on user preferences
router.get('/recommended',              protect, getRecommendedDestinations);

// Admin - recommended destinations for a specific user
router.get('/recommended/:userId',      protect, authorize('admin'), positiveIntParam('userId', 'userId'), getRecommendedForUser);

router.get('/:id',                      positiveIntParam('id'), getDestination);

// Admin only routes
router.post('/',   protect, authorize('admin'), requireFields(['name', 'district_id', 'type']), createDestination);
router.put('/:id', protect, authorize('admin'), positiveIntParam('id'), requireAtLeastOneField(['name', 'description', 'district_id', 'isActive', 'type', 'duration', 'lat', 'lng', 'address_text', 'image_url']), updateDestination);
router.delete('/:id', protect, authorize('admin'), positiveIntParam('id'), deleteDestination);

module.exports = router;
