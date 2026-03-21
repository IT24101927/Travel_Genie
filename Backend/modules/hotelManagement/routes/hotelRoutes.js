const express = require('express');
const router = express.Router();
const {
  getAllHotels,
  getHotel,
  createHotel,
  updateHotel,
  deleteHotel,
  getHotelsByDistrict,
  getFeaturedHotels,
} = require('../controllers/hotelController');

const { protect, authorize } = require('../../../middleware/auth');

// Public routes
router.get('/',                          getAllHotels);
router.get('/featured',                  getFeaturedHotels);
router.get('/district/:districtId',      getHotelsByDistrict);
router.get('/:id',                       getHotel);

// Admin only routes
router.post('/',   protect, authorize('admin'), createHotel);
router.put('/:id', protect, authorize('admin'), updateHotel);
router.delete('/:id', protect, authorize('admin'), deleteHotel);

module.exports = router;
