const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../../middleware/auth');
const {
  getMyTrips,
  getAllTrips,
  getTrip,
  createTrip,
  updateTrip,
  deleteTrip,
  getTripDays,
  updateTripDay,
  addItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
} = require('../controllers/tripPlanController');

// TripPlan
router.get('/my',              protect, getMyTrips);
router.get('/all',             protect, authorize('admin'), getAllTrips);
router.get('/:id',             protect, getTrip);
router.post('/',               protect, createTrip);
router.put('/:id',             protect, updateTrip);
router.delete('/:id',          protect, deleteTrip);

// TripDay
router.get('/:id/days',        protect, getTripDays);
router.put('/:id/days/:dayId', protect, updateTripDay);

// ItineraryItem
router.post('/:id/days/:dayId/items', protect, addItineraryItem);
router.put('/items/:itemId',          protect, updateItineraryItem);
router.delete('/items/:itemId',       protect, deleteItineraryItem);

module.exports = router;
