const { Op, literal } = require('sequelize');
const TripItinerary = require('../models/TripItinerary');
const Place = require('../../placeManagement/models/Destination');
const Hotel = require('../../hotelManagement/models/Hotel');
const User = require('../../userManagement/models/User');
const { successResponse, errorResponse } = require('../../../utils/helpers');

const populateOptions = [
  { model: Place, as: 'destination', attributes: ['place_id', 'name', 'type'] },
  { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
];

// @desc    Admin: Get ALL trip itineraries  @route GET /api/trips/admin  @access Private/Admin
exports.getAllTripsAdmin = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.status) where.status = req.query.status;

    const { count: total, rows: trips } = await TripItinerary.findAndCountAll({
      where, include: populateOptions, offset, limit,
      order: [['createdAt', 'DESC']], distinct: true,
    });

    res.status(200).json({
      success: true, count: trips.length, total, page,
      pages: Math.ceil(total / limit), data: trips,
    });
  } catch (error) { next(error); }
};

// @desc    Get all trip itineraries  @route GET /api/trips  @access Private
exports.getAllTrips = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const where = {
      [Op.or]: [
        { userId: req.user.id },
        literal(`"TripItinerary"."sharedWith" @> '[${req.user.id}]'`),
      ],
    };
    if (req.query.status) where.status = req.query.status;

    const { count: total, rows: trips } = await TripItinerary.findAndCountAll({
      where, include: populateOptions, offset, limit,
      order: [['createdAt', 'DESC']], distinct: true,
    });

    res.status(200).json({
      success: true, count: trips.length, total, page,
      pages: Math.ceil(total / limit), data: trips,
    });
  } catch (error) { next(error); }
};

// @desc    Get single trip  @route GET /api/trips/:id  @access Private
exports.getTrip = async (req, res, next) => {
  try {
    const trip = await TripItinerary.findByPk(req.params.id, { include: populateOptions });
    if (!trip) return res.status(404).json(errorResponse('Trip not found'));

    const isOwner = trip.userId === req.user.id;
    const isShared = Array.isArray(trip.sharedWith) && trip.sharedWith.includes(req.user.id);
    if (!isOwner && !isShared)
      return res.status(403).json(errorResponse('Not authorized to access this trip'));

    res.status(200).json(successResponse(trip, 'Trip fetched successfully'));
  } catch (error) { next(error); }
};

// @desc    Create new trip  @route POST /api/trips  @access Private
exports.createTrip = async (req, res, next) => {
  try {
    req.body.userId = req.user.id;
    const trip = await TripItinerary.create(req.body);
    const populated = await TripItinerary.findByPk(trip.id, { include: populateOptions });
    res.status(201).json(successResponse(populated, 'Trip created successfully'));
  } catch (error) { next(error); }
};

// @desc    Update trip  @route PUT /api/trips/:id  @access Private
exports.updateTrip = async (req, res, next) => {
  try {
    const trip = await TripItinerary.findByPk(req.params.id);
    if (!trip) return res.status(404).json(errorResponse('Trip not found'));
    if (trip.userId !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json(errorResponse('Not authorized to update this trip'));

    await trip.update(req.body);
    const updated = await TripItinerary.findByPk(trip.id, { include: populateOptions });
    res.status(200).json(successResponse(updated, 'Trip updated successfully'));
  } catch (error) { next(error); }
};

// @desc    Delete trip  @route DELETE /api/trips/:id  @access Private
exports.deleteTrip = async (req, res, next) => {
  try {
    const trip = await TripItinerary.findByPk(req.params.id);
    if (!trip) return res.status(404).json(errorResponse('Trip not found'));
    if (trip.userId !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json(errorResponse('Not authorized to delete this trip'));
    await trip.destroy();
    res.status(200).json(successResponse(null, 'Trip deleted successfully'));
  } catch (error) { next(error); }
};

// @desc    Share trip with other users  @route POST /api/trips/:id/share  @access Private
exports.shareTrip = async (req, res, next) => {
  try {
    const { userIds } = req.body;
    const trip = await TripItinerary.findByPk(req.params.id);
    if (!trip) return res.status(404).json(errorResponse('Trip not found'));
    if (trip.userId !== req.user.id)
      return res.status(403).json(errorResponse('Not authorized to share this trip'));

    const existing = Array.isArray(trip.sharedWith) ? trip.sharedWith : [];
    trip.sharedWith = [...new Set([...existing, ...userIds])];
    await trip.save();
    res.status(200).json(successResponse(trip, 'Trip shared successfully'));
  } catch (error) { next(error); }
};

// @desc    Update trip status  @route PUT /api/trips/:id/status  @access Private
exports.updateTripStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const trip = await TripItinerary.findByPk(req.params.id);
    if (!trip) return res.status(404).json(errorResponse('Trip not found'));
    if (trip.userId !== req.user.id)
      return res.status(403).json(errorResponse('Not authorized to update this trip'));
    await trip.update({ status });
    res.status(200).json(successResponse(trip, 'Trip status updated successfully'));
  } catch (error) { next(error); }
};

// @desc    Get upcoming trips  @route GET /api/trips/upcoming  @access Private
exports.getUpcomingTrips = async (req, res, next) => {
  try {
    const trips = await TripItinerary.findAll({
      where: {
        userId: req.user.id,
        startDate: { [Op.gte]: new Date() },
        status: { [Op.in]: ['planned', 'ongoing'] },
      },
      include: [{ model: Place, as: 'destination', attributes: ['place_id', 'name', 'type'] }],
      order: [['startDate', 'ASC']],
      limit: 5,
    });
    res.status(200).json({ success: true, count: trips.length, data: trips });
  } catch (error) { next(error); }
};
