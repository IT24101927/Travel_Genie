const User = require('../models/User');
const UserPreference = require('../models/UserPreference');
const TravelStyle = require('../models/TravelStyle');
const Tag = require('../../tagManagement/models/Tag');
const UserInterest = require('../models/UserInterest');
const { successResponse, errorResponse } = require('../../../utils/helpers');

// ─── GET /api/preferences ──────────────────────────────────────────────────
// Returns the full preferences payload for the logged-in user.
exports.getUserPreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Ensure a row exists (upsert-style)
    let pref = await UserPreference.findByPk(userId);
    if (!pref) {
      pref = await UserPreference.create({ user_id: userId });
    }

    const user = await User.findByPk(userId);
    const addressData = user.address || {};

    // Resolve travel style name
    let travelStyleName = addressData.travelStyle || null;
    if (pref.style_id && !travelStyleName) {
      const style = await TravelStyle.findByPk(pref.style_id);
      if (style) travelStyleName = style.style_name;
    }

    // Fetch user interests (tag names)
    const interests = await Tag.findAll({
      include: [{
        model: User,
        as: 'interestedUsers',
        where: { id: userId },
        attributes: [],
      }],
      attributes: ['tag_id', 'tag_name', 'tag_type'],
    });
    const interestNames = interests.map(t => t.tag_name);
    // Also include interests from address JSONB (backward compat)
    const allInterests = [...new Set([...interestNames, ...(addressData.interests || [])])];

    res.status(200).json(successResponse({
      travelStyle: travelStyleName,
      interests: allInterests,
      preferred_weather: pref.preferred_weather || addressData.prefs?.preferred_weather || '',
      notifications: {
        emailNotifications: true,
        smsNotifications: false,
        promotionalEmails: true,
        newsletterSubscription: true,
        ...(addressData.prefs || {}),
        ...(pref.notification_prefs || {}),
      },
      regional: {
        language: 'en',
        currency: 'LKR',
        ...(addressData.prefs || {}),
        ...(pref.regional_prefs || {}),
      },
      privacy: {
        profilePublic: true,
        shareTrips: false,
        locationSharing: false,
        dataCollection: true,
        ...(addressData.privacy || {}),
        ...(pref.privacy_prefs || {}),
      },
      destinationPrefs: {
        preferred_categories: [],
        budget_range: 'any',
        preferred_climate: '',
        preferred_best_time: '',
        ...(pref.destination_prefs || {}),
      },
      tripDefaults: {
        days: 3,
        tripType: 'couple',
        people: 2,
        hotelType: 'any',
        ...(pref.trip_defaults || {}),
      },
    }, 'Preferences fetched'));
  } catch (error) { next(error); }
};

// ─── PUT /api/preferences ──────────────────────────────────────────────────
// Accepts a partial payload; only provided keys are merged.
exports.updateUserPreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { travelStyle, interests, preferred_weather, notifications, regional, privacy } = req.body;

    let pref = await UserPreference.findByPk(userId);
    if (!pref) pref = await UserPreference.create({ user_id: userId });

    const updates = { updated_at: new Date() };

    // Travel style → resolve to style_id
    if (travelStyle !== undefined) {
      if (travelStyle) {
        const style = await TravelStyle.findOne({ where: { style_name: travelStyle } });
        if (style) updates.style_id = style.style_id;
      } else {
        updates.style_id = null;
      }
    }

    if (preferred_weather !== undefined) updates.preferred_weather = preferred_weather;
    if (notifications) updates.notification_prefs = { ...(pref.notification_prefs || {}), ...notifications };
    if (regional) updates.regional_prefs = { ...(pref.regional_prefs || {}), ...regional };
    if (privacy) updates.privacy_prefs = { ...(pref.privacy_prefs || {}), ...privacy };

    await pref.update(updates);

    // Sync interests to user_interests table (if tags exist)
    if (Array.isArray(interests)) {
      const tags = await Tag.findAll({ where: { tag_name: interests } });
      const tagIds = tags.map(t => t.tag_id);
      // Clear and re-insert
      await UserInterest.destroy({ where: { user_id: userId } });
      if (tagIds.length) {
        await UserInterest.bulkCreate(tagIds.map(tag_id => ({ user_id: userId, tag_id })));
      }
    }

    // Also sync to address JSONB for backward compatibility
    const user = await User.findByPk(userId);
    const addr = { ...(user.address || {}) };
    if (travelStyle !== undefined) addr.travelStyle = travelStyle;
    if (Array.isArray(interests)) addr.interests = interests;
    if (notifications || regional || preferred_weather !== undefined) {
      addr.prefs = {
        ...(addr.prefs || {}),
        ...(notifications || {}),
        ...(regional || {}),
      };
      if (preferred_weather !== undefined) addr.prefs.preferred_weather = preferred_weather;
    }
    if (privacy) addr.privacy = { ...(addr.privacy || {}), ...privacy };
    await user.update({ address: addr });

    res.status(200).json(successResponse(null, 'Preferences updated'));
  } catch (error) { next(error); }
};

// ─── GET /api/preferences/destinations ─────────────────────────────────────
exports.getDestinationPreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let pref = await UserPreference.findByPk(userId);
    if (!pref) pref = await UserPreference.create({ user_id: userId });

    res.status(200).json(successResponse({
      preferred_categories: [],
      budget_range: 'any',
      preferred_climate: '',
      preferred_best_time: '',
      ...(pref.destination_prefs || {}),
    }, 'Destination preferences fetched'));
  } catch (error) { next(error); }
};

// ─── PUT /api/preferences/destinations ─────────────────────────────────────
exports.updateDestinationPreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { preferred_categories, budget_range, preferred_climate, preferred_best_time } = req.body;

    let pref = await UserPreference.findByPk(userId);
    if (!pref) pref = await UserPreference.create({ user_id: userId });

    const merged = { ...(pref.destination_prefs || {}) };
    if (preferred_categories !== undefined) merged.preferred_categories = preferred_categories;
    if (budget_range !== undefined) merged.budget_range = budget_range;
    if (preferred_climate !== undefined) merged.preferred_climate = preferred_climate;
    if (preferred_best_time !== undefined) merged.preferred_best_time = preferred_best_time;

    await pref.update({ destination_prefs: merged, updated_at: new Date() });

    res.status(200).json(successResponse(merged, 'Destination preferences updated'));
  } catch (error) { next(error); }
};

// ─── GET /api/preferences/trip-defaults ────────────────────────────────────
exports.getTripDefaults = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let pref = await UserPreference.findByPk(userId);
    if (!pref) pref = await UserPreference.create({ user_id: userId });

    res.status(200).json(successResponse({
      days: 3,
      tripType: 'couple',
      people: 2,
      hotelType: 'any',
      ...(pref.trip_defaults || {}),
    }, 'Trip defaults fetched'));
  } catch (error) { next(error); }
};

// ─── PUT /api/preferences/trip-defaults ────────────────────────────────────
exports.updateTripDefaults = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { days, tripType, people, hotelType } = req.body;

    let pref = await UserPreference.findByPk(userId);
    if (!pref) pref = await UserPreference.create({ user_id: userId });

    const merged = { ...(pref.trip_defaults || {}) };
    if (days !== undefined) merged.days = days;
    if (tripType !== undefined) merged.tripType = tripType;
    if (people !== undefined) merged.people = people;
    if (hotelType !== undefined) merged.hotelType = hotelType;

    await pref.update({ trip_defaults: merged, updated_at: new Date() });

    res.status(200).json(successResponse(merged, 'Trip defaults updated'));
  } catch (error) { next(error); }
};
