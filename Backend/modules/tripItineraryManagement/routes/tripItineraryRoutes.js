const express = require('express');
const router = express.Router();
const {
  getAllTrips,
  getAllTripsAdmin,
  getTrip,
  createTrip,
  updateTrip,
  deleteTrip,
  shareTrip,
  updateTripStatus,
  getUpcomingTrips
} = require('../controllers/tripItineraryController');

const { protect, authorize } = require('../../../middleware/auth');

// All routes are protected (require authentication)
router.use(protect);

router.get('/admin/all', authorize('admin'), getAllTripsAdmin);
router.get('/', getAllTrips);
router.get('/upcoming', getUpcomingTrips);
router.post('/', createTrip);
router.get('/:id', getTrip);
router.put('/:id', updateTrip);
router.delete('/:id', deleteTrip);
router.post('/:id/share', shareTrip);
router.put('/:id/status', updateTripStatus);

module.exports = router;
