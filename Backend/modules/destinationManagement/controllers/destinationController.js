const { Op } = require('sequelize');
const Destination = require('../models/Destination');
const User = require('../../userManagement/models/User');
const { successResponse, errorResponse } = require('../../../utils/helpers');

// @desc    Get all destinations  @route GET /api/destinations  @access Public
exports.getAllDestinations = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const where = { isActive: true };
    if (req.query.category) where.category = req.query.category;
    if (req.query.country) where.country = req.query.country;
    if (req.query.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${req.query.search}%` } },
        { description: { [Op.iLike]: `%${req.query.search}%` } },
      ];
    }

    const { count: total, rows: destinations } = await Destination.findAndCountAll({
      where,
      include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'email'] }],
      offset, limit, order: [['createdAt', 'DESC']],
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
    const destination = await Destination.findByPk(req.params.id, {
      include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'email'] }],
    });
    if (!destination) return res.status(404).json(errorResponse('Destination not found'));
    res.status(200).json(successResponse(destination, 'Destination fetched successfully'));
  } catch (error) { next(error); }
};

// @desc    Create new destination  @route POST /api/destinations  @access Private/Admin
exports.createDestination = async (req, res, next) => {
  try {
    req.body.createdBy = req.user.id;
    const destination = await Destination.create(req.body);
    res.status(201).json(successResponse(destination, 'Destination created successfully'));
  } catch (error) { next(error); }
};

// @desc    Update destination  @route PUT /api/destinations/:id  @access Private/Admin
exports.updateDestination = async (req, res, next) => {
  try {
    const destination = await Destination.findByPk(req.params.id);
    if (!destination) return res.status(404).json(errorResponse('Destination not found'));
    await destination.update(req.body);
    res.status(200).json(successResponse(destination, 'Destination updated successfully'));
  } catch (error) { next(error); }
};

// @desc    Delete destination  @route DELETE /api/destinations/:id  @access Private/Admin
exports.deleteDestination = async (req, res, next) => {
  try {
    const destination = await Destination.findByPk(req.params.id);
    if (!destination) return res.status(404).json(errorResponse('Destination not found'));
    await destination.destroy();
    res.status(200).json(successResponse(null, 'Destination deleted successfully'));
  } catch (error) { next(error); }
};

// @desc    Get popular destinations  @route GET /api/destinations/popular  @access Public
exports.getPopularDestinations = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const destinations = await Destination.findAll({
      where: { isActive: true },
      include: [{ model: User, as: 'creator', attributes: ['id', 'name'] }],
      order: [['rating', 'DESC'], ['reviewCount', 'DESC']],
      limit,
    });
    res.status(200).json({ success: true, count: destinations.length, data: destinations });
  } catch (error) { next(error); }
};

// @desc    Get destinations within radius  @route GET /api/destinations/radius/:lng/:lat/:distance  @access Public
exports.getDestinationsInRadius = async (req, res, next) => {
  try {
    const { lng, lat, distance } = req.params;
    const { sequelize } = require('../../../config/database');
    // Haversine formula via raw SQL using coordinates stored in JSONB location field
    const destinations = await sequelize.query(
      `SELECT *, (6371 * acos(LEAST(1.0, cos(radians(:lat)) * cos(radians((location->>'coordinates'::text)::json->>1)) *
         cos(radians((location->>'coordinates'::text)::json->>0) - radians(:lng)) +
         sin(radians(:lat)) * sin(radians((location->>'coordinates'::text)::json->>1))))
       ) AS distance
       FROM destinations
       WHERE "isActive" = true
       HAVING (6371 * acos(LEAST(1.0, cos(radians(:lat)) * cos(radians((location->>'coordinates'::text)::json->>1)) *
         cos(radians((location->>'coordinates'::text)::json->>0) - radians(:lng)) +
         sin(radians(:lat)) * sin(radians((location->>'coordinates'::text)::json->>1))))) < :distance`,
      { replacements: { lat: parseFloat(lat), lng: parseFloat(lng), distance: parseFloat(distance) }, type: sequelize.QueryTypes.SELECT }
    );
    res.status(200).json({ success: true, count: destinations.length, data: destinations });
  } catch (error) { next(error); }
};
