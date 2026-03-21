const TripPlan      = require('../models/TripPlan');
const TripDay       = require('../models/TripDay');
const ItineraryItem = require('../models/ItineraryItem');
const TripStay      = require('../models/TripStay');
const District      = require('../../placeManagement/models/District');
const Place         = require('../../placeManagement/models/Place');
const { successResponse, errorResponse } = require('../../../utils/helpers');

// ── TripPlan CRUD ────────────────────────────────────────────────────────────

// @desc  Get my trip plans  @route GET /api/trips  @access Private
exports.getMyTrips = async (req, res, next) => {
  try {
    const trips = await TripPlan.findAll({
      where: { user_id: req.user.id },
      include: [
        { model: District, as: 'district', attributes: ['district_id', 'name', 'province'] },
        { model: TripDay,  as: 'days', include: [{ model: ItineraryItem, as: 'items' }] },
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
    const { count: total, rows: trips } = await TripPlan.findAndCountAll({
      include: [{ model: District, as: 'district' }],
      offset, limit, order: [['createdAt', 'DESC']],
    });
    res.status(200).json({ success: true, count: trips.length, total, page, pages: Math.ceil(total / limit), data: trips });
  } catch (error) { next(error); }
};

// @desc  Get single trip plan  @route GET /api/trips/:id  @access Private
exports.getTrip = async (req, res, next) => {
  try {
    const trip = await TripPlan.findByPk(req.params.id, {
      include: [
        { model: District, as: 'district' },
        {
          model: TripDay, as: 'days',
          include: [{
            model: ItineraryItem, as: 'items',
            include: [{ model: Place, as: 'place', attributes: ['place_id', 'name', 'lat', 'lng'] }],
          }],
          order: [['day_no', 'ASC']],
        },
        { model: TripStay, as: 'stays' },
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
    req.body.user_id = req.user.id;
    const trip = await TripPlan.create(req.body);

    // Auto-create TripDays if num_days provided
    if (trip.num_days && trip.start_date) {
      const days = [];
      for (let i = 0; i < trip.num_days; i++) {
        const d = new Date(trip.start_date);
        d.setDate(d.getDate() + i);
        days.push({ trip_id: trip.trip_id, day_no: i + 1, date: d.toISOString().split('T')[0] });
      }
      await TripDay.bulkCreate(days);
    }

    const full = await TripPlan.findByPk(trip.trip_id, {
      include: [{ model: District, as: 'district' }, { model: TripDay, as: 'days' }],
    });
    res.status(201).json(successResponse(full, 'Trip plan created'));
  } catch (error) { next(error); }
};

// @desc  Update trip plan  @route PUT /api/trips/:id  @access Private
exports.updateTrip = async (req, res, next) => {
  try {
    const trip = await TripPlan.findByPk(req.params.id);
    if (!trip) return res.status(404).json(errorResponse('Trip not found'));
    if (trip.user_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json(errorResponse('Not authorised'));
    await trip.update(req.body);
    res.status(200).json(successResponse(trip, 'Trip updated'));
  } catch (error) { next(error); }
};

// @desc  Delete trip plan  @route DELETE /api/trips/:id  @access Private
exports.deleteTrip = async (req, res, next) => {
  try {
    const trip = await TripPlan.findByPk(req.params.id);
    if (!trip) return res.status(404).json(errorResponse('Trip not found'));
    if (trip.user_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json(errorResponse('Not authorised'));
    await trip.destroy();
    res.status(200).json(successResponse(null, 'Trip deleted'));
  } catch (error) { next(error); }
};

// ── TripDay ──────────────────────────────────────────────────────────────────

// @desc  Get days for a trip  @route GET /api/trips/:id/days  @access Private
exports.getTripDays = async (req, res, next) => {
  try {
    const days = await TripDay.findAll({
      where: { trip_id: req.params.id },
      include: [{
        model: ItineraryItem, as: 'items',
        include: [{ model: Place, as: 'place', attributes: ['place_id', 'name', 'lat', 'lng'] }],
      }],
      order: [['day_no', 'ASC']],
    });
    res.status(200).json(successResponse(days, 'Days fetched'));
  } catch (error) { next(error); }
};

// @desc  Update a trip day budget  @route PUT /api/trips/:id/days/:dayId  @access Private
exports.updateTripDay = async (req, res, next) => {
  try {
    const day = await TripDay.findOne({ where: { day_id: req.params.dayId, trip_id: req.params.id } });
    if (!day) return res.status(404).json(errorResponse('Day not found'));
    await day.update(req.body);
    res.status(200).json(successResponse(day, 'Day updated'));
  } catch (error) { next(error); }
};

// ── ItineraryItem ─────────────────────────────────────────────────────────────

// @desc  Add item to a day  @route POST /api/trips/:id/days/:dayId/items  @access Private
exports.addItineraryItem = async (req, res, next) => {
  try {
    req.body.day_id = req.params.dayId;
    const item = await ItineraryItem.create(req.body);
    const full = await ItineraryItem.findByPk(item.item_id, {
      include: [{ model: Place, as: 'place', attributes: ['place_id', 'name', 'lat', 'lng'] }],
    });
    res.status(201).json(successResponse(full, 'Item added'));
  } catch (error) { next(error); }
};

// @desc  Update itinerary item  @route PUT /api/trips/items/:itemId  @access Private
exports.updateItineraryItem = async (req, res, next) => {
  try {
    const item = await ItineraryItem.findByPk(req.params.itemId);
    if (!item) return res.status(404).json(errorResponse('Item not found'));
    await item.update(req.body);
    res.status(200).json(successResponse(item, 'Item updated'));
  } catch (error) { next(error); }
};

// @desc  Delete itinerary item  @route DELETE /api/trips/items/:itemId  @access Private
exports.deleteItineraryItem = async (req, res, next) => {
  try {
    const item = await ItineraryItem.findByPk(req.params.itemId);
    if (!item) return res.status(404).json(errorResponse('Item not found'));
    await item.destroy();
    res.status(200).json(successResponse(null, 'Item removed'));
  } catch (error) { next(error); }
};
