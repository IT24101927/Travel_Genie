const { Op } = require('sequelize');
const Destination = require('../models/Destination');
const Place = require('../../placeManagement/models/Place');
const District = require('../../placeManagement/models/District');
const PlaceImage = require('../../tagManagement/models/PlaceImage');
const Tag = require('../../tagManagement/models/Tag');
const { successResponse, errorResponse } = require('../../../utils/helpers');

const placeInclude = {
  model: Place,
  as: 'place',
  include: [
    { model: District, as: 'district', attributes: ['district_id', 'name', 'province'] },
    { model: PlaceImage, as: 'images', limit: 5 },
    { model: Tag, as: 'tags', through: { attributes: ['weight'] } },
  ],
};

// @desc    Get all destinations  @route GET /api/destinations  @access Public
exports.getAllDestinations = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const destWhere = {};
    if (req.query.category) destWhere.destination_category = req.query.category;

    const placeWhere = { isActive: true };
    if (req.query.district_id) placeWhere.district_id = req.query.district_id;
    if (req.query.search) {
      placeWhere[Op.or] = [
        { name:        { [Op.iLike]: `%${req.query.search}%` } },
        { description: { [Op.iLike]: `%${req.query.search}%` } },
      ];
    }

    const { count: total, rows: destinations } = await Destination.findAndCountAll({
      where: destWhere,
      include: [{
        ...placeInclude,
        where: placeWhere,
        required: true,
      }],
      offset, limit, order: [['rating', 'DESC']],
      distinct: true,
    });

    res.status(200).json({
      success: true, count: destinations.length, total, page,
      pages: Math.ceil(total / limit), data: destinations,
    });
  } catch (error) { next(error); }
};

// @desc    Get single destination  @route GET /api/destinations/:id  @access Public
exports.getDestination = async (req, res, next) => {
  try {
    const destination = await Destination.findByPk(req.params.id, { include: [placeInclude] });
    if (!destination) return res.status(404).json(errorResponse('Destination not found'));
    res.status(200).json(successResponse(destination, 'Destination fetched successfully'));
  } catch (error) { next(error); }
};

// @desc    Create new destination  @route POST /api/destinations  @access Private/Admin
// Body: place fields (name, description, district_id, lat, lng, climate, address_text) + destination fields
exports.createDestination = async (req, res, next) => {
  try {
    const { destination_category, opening_hours, best_time_to_visit, entry_fee,
            name, description, district_id, lat, lng, climate, address_text } = req.body;

    // 1. Create the Place supertype
    const place = await Place.create({ name, description, district_id, lat, lng, climate, address_text });

    // 2. Create the Destination subtype linked to the same place_id
    const destination = await Destination.create({
      place_id: place.place_id,
      destination_category, opening_hours, best_time_to_visit, entry_fee,
    });

    const result = await Destination.findByPk(destination.place_id, { include: [placeInclude] });
    res.status(201).json(successResponse(result, 'Destination created successfully'));
  } catch (error) { next(error); }
};

// @desc    Update destination  @route PUT /api/destinations/:id  @access Private/Admin
exports.updateDestination = async (req, res, next) => {
  try {
    const destination = await Destination.findByPk(req.params.id, { include: [placeInclude] });
    if (!destination) return res.status(404).json(errorResponse('Destination not found'));

    // Update Place fields if provided
    const placeFields = ['name', 'description', 'district_id', 'lat', 'lng', 'climate', 'address_text', 'isActive'];
    const placeData = Object.fromEntries(Object.entries(req.body).filter(([k]) => placeFields.includes(k)));
    if (Object.keys(placeData).length) await destination.place.update(placeData);

    // Update Destination-specific fields
    const destFields = ['destination_category', 'opening_hours', 'best_time_to_visit', 'entry_fee'];
    const destData = Object.fromEntries(Object.entries(req.body).filter(([k]) => destFields.includes(k)));
    if (Object.keys(destData).length) await destination.update(destData);

    const updated = await Destination.findByPk(req.params.id, { include: [placeInclude] });
    res.status(200).json(successResponse(updated, 'Destination updated successfully'));
  } catch (error) { next(error); }
};

// @desc    Delete destination  @route DELETE /api/destinations/:id  @access Private/Admin
exports.deleteDestination = async (req, res, next) => {
  try {
    const destination = await Destination.findByPk(req.params.id, { include: [placeInclude] });
    if (!destination) return res.status(404).json(errorResponse('Destination not found'));
    // Soft delete via Place.isActive
    await destination.place.update({ isActive: false });
    res.status(200).json(successResponse(null, 'Destination deleted successfully'));
  } catch (error) { next(error); }
};

// @desc    Get popular destinations  @route GET /api/destinations/popular  @access Public
exports.getPopularDestinations = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const destinations = await Destination.findAll({
      include: [{ ...placeInclude, where: { isActive: true }, required: true }],
      order: [['rating', 'DESC'], ['review_count', 'DESC']],
      limit,
    });
    res.status(200).json({ success: true, count: destinations.length, data: destinations });
  } catch (error) { next(error); }
};

// @desc    Get destinations by district  @route GET /api/destinations/district/:districtId  @access Public
exports.getDestinationsByDistrict = async (req, res, next) => {
  try {
    const destinations = await Destination.findAll({
      include: [{
        ...placeInclude,
        where: { isActive: true, district_id: req.params.districtId },
        required: true,
      }],
      order: [['rating', 'DESC']],
    });
    res.status(200).json({ success: true, count: destinations.length, data: destinations });
  } catch (error) { next(error); }
};

