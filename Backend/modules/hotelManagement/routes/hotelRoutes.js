const express = require('express');
const router = express.Router();
const {
  getAllHotels,
  getHotel,
  createHotel,
  updateHotel,
  deleteHotel,
  getHotelsByDestination,
  getFeaturedHotels,
  getHotelsInRadius
} = require('../controllers/hotelController');

const { protect, authorize } = require('../../../middleware/auth');

// Public routes
router.get('/', getAllHotels);
router.get('/featured', getFeaturedHotels);
router.get('/radius/:lng/:lat/:distance', getHotelsInRadius);
router.get('/destination/:destinationId', getHotelsByDestination);
router.get('/:id', getHotel);

// Admin only routes
router.post('/', protect, authorize('admin'), createHotel);
router.put('/:id', protect, authorize('admin'), updateHotel);
router.delete('/:id', protect, authorize('admin'), deleteHotel);

module.exports = router;
