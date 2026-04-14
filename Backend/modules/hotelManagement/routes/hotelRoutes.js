const express = require('express');
const router = express.Router();
const {
  getAllHotels,
  getHotel,
  createHotel,
  updateHotel,
  deleteHotel,
  getHotelsByDistrict,
  getHotelsNear,
  getRecommendedHotels,
} = require('../controllers/hotelController');

const { protect, authorize } = require('../../../middleware/auth');
const {
  positiveIntParam,
  requireFields,
  requireAtLeastOneField,
} = require('../../../middleware/requestValidation');

// Public routes
router.get('/',                          getAllHotels);
router.get('/near',                      getHotelsNear);
router.get('/recommended',               getRecommendedHotels);
router.get('/district/:districtId',      positiveIntParam('districtId', 'districtId'), getHotelsByDistrict);
router.get('/:id',                       positiveIntParam('id'), getHotel);

// Admin only routes
router.post('/',   protect, authorize('admin'), requireFields(['district_id', 'name', 'hotel_type']), createHotel);
router.put('/:id', protect, authorize('admin'), positiveIntParam('id'), requireAtLeastOneField(['district_id', 'name', 'description', 'address_text', 'lat', 'lng', 'image_url', 'hotel_type', 'price_per_night', 'star_class', 'amenities', 'contact', 'nearby_place_id']), updateHotel);
router.delete('/:id', protect, authorize('admin'), positiveIntParam('id'), deleteHotel);

module.exports = router;
