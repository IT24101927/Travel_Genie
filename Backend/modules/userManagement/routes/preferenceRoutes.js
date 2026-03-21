const express = require('express');
const router = express.Router();
const {
  getUserPreferences,
  updateUserPreferences,
  getDestinationPreferences,
  updateDestinationPreferences,
  getTripDefaults,
  updateTripDefaults,
} = require('../controllers/preferenceController');

const { protect } = require('../../../middleware/auth');

// All preference routes require authentication
router.use(protect);

// User preferences (travel style, notifications, regional, privacy)
router.get('/', getUserPreferences);
router.put('/', updateUserPreferences);

// Destination preferences (preferred categories, budget, climate)
router.get('/destinations', getDestinationPreferences);
router.put('/destinations', updateDestinationPreferences);

// Trip defaults (days, trip type, people, hotel type)
router.get('/trip-defaults', getTripDefaults);
router.put('/trip-defaults', updateTripDefaults);

module.exports = router;
