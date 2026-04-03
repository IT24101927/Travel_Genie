const TripItinerary = require('../models/TripItinerary');
const District      = require('../../placeManagement/models/District');
const User          = require('../../userManagement/models/User');
const { successResponse, errorResponse } = require('../../../utils/helpers');

const asJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const asJsonObject = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
};

const asNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = typeof value === 'string' ? value.replace(/,/g, '') : value;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : fallback;
};

const normalizeTripPayload = (body = {}, { partial = false } = {}) => {
  const payload = { ...body };

  // JSON fields: only normalize when explicitly provided during partial update.
  if (!partial || Object.prototype.hasOwnProperty.call(body, 'selected_places')) {
    payload.selected_places = asJsonArray(body.selected_places);
  }
  if (!partial || Object.prototype.hasOwnProperty.call(body, 'selected_hotels')) {
    payload.selected_hotels = asJsonArray(body.selected_hotels);
  }
  if (!partial || Object.prototype.hasOwnProperty.call(body, 'preferences')) {
    payload.preferences = asJsonObject(body.preferences);
  }

  // Numbers/defaults
  if (Object.prototype.hasOwnProperty.call(body, 'num_people')) {
    const people = Number(payload.num_people);
    payload.num_people = Number.isFinite(people) && people >= 1 ? people : 1;
  } else if (!partial) {
    payload.num_people = 1;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'hotel_place_id')) {
    if (payload.hotel_place_id !== undefined && payload.hotel_place_id !== null && payload.hotel_place_id !== '') {
      payload.hotel_place_id = Number(payload.hotel_place_id);
      if (Number.isNaN(payload.hotel_place_id)) payload.hotel_place_id = null;
    } else {
      payload.hotel_place_id = null;
    }
  } else if (!partial) {
    payload.hotel_place_id = null;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'district_id')) {
    payload.district_id = asNumber(payload.district_id, null);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'total_budget')) {
    payload.total_budget = asNumber(payload.total_budget, 0);
  } else if (!partial) {
    payload.total_budget = 0;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'hotel_budget')) {
    payload.hotel_budget = asNumber(payload.hotel_budget, 0);
  } else if (!partial) {
    payload.hotel_budget = 0;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'hotel_price_min')) {
    payload.hotel_price_min = asNumber(payload.hotel_price_min, 0);
  } else if (!partial) {
    payload.hotel_price_min = 0;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'budget_currency')) {
    if (!payload.budget_currency) payload.budget_currency = 'LKR';
  } else if (!partial) {
    payload.budget_currency = 'LKR';
  }

  if (Object.prototype.hasOwnProperty.call(body, 'hotel_price_currency')) {
    if (!payload.hotel_price_currency) payload.hotel_price_currency = 'LKR';
  } else if (!partial) {
    payload.hotel_price_currency = 'LKR';
  }

  return payload;
};

// ── TripItinerary CRUD ────────────────────────────────────────────────────────────

// @desc  Get my trip plans  @route GET /api/trips  @access Private
exports.getMyTrips = async (req, res, next) => {
  try {
    const trips = await TripItinerary.findAll({
      where: { user_id: req.user.id },
      include: [
        { model: District, as: 'district', attributes: ['district_id', 'name', 'province'] },
      ],
      order: [['start_date', 'DESC']],
    });
    res.status(200).json(successResponse(trips, 'Trips fetched'));
  } catch (error) { next(error); }
};

// @desc  Get all trips (admin)  @route GET /api/trips/all  @access Private/Admin
exports.getAllTrips = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { count: total, rows: trips } = await TripItinerary.findAndCountAll({
      include: [
        { model: District, as: 'district', attributes: ['district_id', 'name', 'province'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'avatar'] },
      ],
      offset, limit, order: [['createdAt', 'DESC']],
    });
    res.status(200).json({ success: true, count: trips.length, total, page, pages: Math.ceil(total / limit), data: trips });
  } catch (error) { next(error); }
};

// @desc  Get single trip plan  @route GET /api/trips/:id  @access Private
exports.getTrip = async (req, res, next) => {
  try {
    const trip = await TripItinerary.findByPk(req.params.id, {
      include: [
        { model: District, as: 'district', attributes: ['district_id', 'name', 'province'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'avatar'] },
      ],
    });
    if (!trip) return res.status(404).json(errorResponse('Trip not found'));
    if (trip.user_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json(errorResponse('Not authorised'));
    res.status(200).json(successResponse(trip, 'Trip fetched'));
  } catch (error) { next(error); }
};

// @desc  Create trip plan  @route POST /api/trips  @access Private
exports.createTrip = async (req, res, next) => {
  try {
    const payload = normalizeTripPayload({ ...req.body, user_id: req.user.id }, { partial: false });
    const trip = await TripItinerary.create(payload);
    const full = await TripItinerary.findByPk(trip.trip_id, {
      include: [{ model: District, as: 'district', attributes: ['district_id', 'name', 'province'] }],
    });
    res.status(201).json(successResponse(full, 'Trip plan created'));
  } catch (error) { next(error); }
};

// @desc  Update trip plan  @route PUT /api/trips/:id  @access Private
exports.updateTrip = async (req, res, next) => {
  try {
    const trip = await TripItinerary.findByPk(req.params.id);
    if (!trip) return res.status(404).json(errorResponse('Trip not found'));
    if (trip.user_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json(errorResponse('Not authorised'));
    const payload = normalizeTripPayload(req.body, { partial: true });
    await trip.update(payload);
    res.status(200).json(successResponse(trip, 'Trip updated'));
  } catch (error) { next(error); }
};

// @desc  Delete trip plan  @route DELETE /api/trips/:id  @access Private
exports.deleteTrip = async (req, res, next) => {
  try {
    const trip = await TripItinerary.findByPk(req.params.id);
    if (!trip) return res.status(404).json(errorResponse('Trip not found'));
    if (trip.user_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json(errorResponse('Not authorised'));
    await trip.destroy();
    res.status(200).json(successResponse(null, 'Trip deleted'));
  } catch (error) { next(error); }
};


