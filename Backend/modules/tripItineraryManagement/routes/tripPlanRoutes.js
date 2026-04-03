const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../../middleware/auth');
const {
  positiveIntParam,
  requireFields,
  requireAtLeastOneField,
  enumField,
} = require('../../../middleware/requestValidation');
const {
  getMyTrips,
  getAllTrips,
  getTrip,
  createTrip,
  updateTrip,
  deleteTrip,
} = require('../controllers/tripPlanController');

// TripPlan
router.get('/my',              protect, getMyTrips);
router.get('/all',             protect, authorize('admin'), getAllTrips);
router.get('/:id',             protect, positiveIntParam('id'), getTrip);
router.post('/',               protect, requireFields(['district_id', 'title', 'start_date', 'end_date']), createTrip);
router.put('/:id',             protect, positiveIntParam('id'), requireAtLeastOneField(['district_id', 'title', 'start_date', 'end_date', 'num_people', 'total_budget', 'hotel_budget', 'budget_currency', 'hotel_place_id', 'hotel_name', 'hotel_category', 'hotel_star_class', 'hotel_price_min', 'hotel_price_currency', 'selected_places', 'selected_hotels', 'preferences', 'status', 'notes']), enumField('status', ['draft', 'planned', 'ongoing', 'completed', 'cancelled']), updateTrip);
router.delete('/:id',          protect, positiveIntParam('id'), deleteTrip);

module.exports = router;
