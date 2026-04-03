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
const { requireAtLeastOneField } = require('../../../middleware/requestValidation');

// All preference routes require authentication
router.use(protect);

// User preferences (travel style, notifications, regional, privacy)
router.get('/', getUserPreferences);
router.put('/', requireAtLeastOneField(['travelStyle', 'interests', 'preferred_weather', 'notifications', 'regional', 'privacy']), updateUserPreferences);

// Destination preferences (preferred categories, budget, climate)
router.get('/destinations', getDestinationPreferences);
router.put('/destinations', requireAtLeastOneField(['preferred_categories', 'budget_range', 'preferred_climate', 'preferred_best_time']), updateDestinationPreferences);

// Trip defaults (days, trip type, people, hotel type)
router.get('/trip-defaults', getTripDefaults);
router.put('/trip-defaults', requireAtLeastOneField(['days', 'tripType', 'people', 'hotelType']), updateTripDefaults);

module.exports = router;
