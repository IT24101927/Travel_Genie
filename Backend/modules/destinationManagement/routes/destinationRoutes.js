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
} = require('../controllers/destinationController');

const { protect, authorize } = require('../../../middleware/auth');

// Public routes
router.get('/',                         getAllDestinations);
router.get('/popular',                  getPopularDestinations);
router.get('/district/:districtId',     getDestinationsByDistrict);
router.get('/:id',                      getDestination);

// Admin only routes
router.post('/',   protect, authorize('admin'), createDestination);
router.put('/:id', protect, authorize('admin'), updateDestination);
router.delete('/:id', protect, authorize('admin'), deleteDestination);

module.exports = router;
