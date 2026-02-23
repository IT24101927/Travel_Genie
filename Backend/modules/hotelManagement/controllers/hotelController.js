const { Op, literal } = require('sequelize');
const Hotel = require('../models/Hotel');
const Destination = require('../../destinationManagement/models/Destination');
const User = require('../../userManagement/models/User');
const { successResponse, errorResponse } = require('../../../utils/helpers');

const destinationInclude = { model: Destination, as: 'destination', attributes: ['id', 'name', 'city', 'country'] };
const creatorInclude = { model: User, as: 'creator', attributes: ['id', 'name', 'email'] };

// @desc    Get all hotels  @route GET /api/hotels  @access Public
exports.getAllHotels = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const where = { isActive: true };
    if (req.query.destination) where.destinationId = req.query.destination;
    if (req.query.category) where.category = req.query.category;
    if (req.query.starRating) where.starRating = parseInt(req.query.starRating);
    if (req.query.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${req.query.search}%` } },
        { description: { [Op.iLike]: `%${req.query.search}%` } },
      ];
    }

    // Price range filter via JSONB cast
    const extraWhere = [];
    if (req.query.minPrice)
      extraWhere.push(literal(`("priceRange"->>'min')::numeric >= ${parseInt(req.query.minPrice)}`));
    if (req.query.maxPrice)
      extraWhere.push(literal(`("priceRange"->>'max')::numeric <= ${parseInt(req.query.maxPrice)}`));
    if (extraWhere.length) where[Op.and] = extraWhere;

    const sortField = req.query.sort ? req.query.sort.replace('-', '') : 'createdAt';
    const sortDir = req.query.sort && req.query.sort.startsWith('-') ? 'DESC' : 'DESC';

    const { count: total, rows: hotels } = await Hotel.findAndCountAll({
      where, include: [destinationInclude, creatorInclude],
      offset, limit, order: [[sortField, sortDir]],
    });

    res.status(200).json({
      success: true, count: hotels.length, total, page,
      pages: Math.ceil(total / limit), data: hotels,
    });
  } catch (error) { next(error); }
};

// @desc    Get single hotel  @route GET /api/hotels/:id  @access Public
exports.getHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findByPk(req.params.id, {
      include: [
        { model: Destination, as: 'destination', attributes: ['id', 'name', 'city', 'country', 'images'] },
        creatorInclude,
      ],
    });
    if (!hotel) return res.status(404).json(errorResponse('Hotel not found'));
    res.status(200).json(successResponse(hotel, 'Hotel fetched successfully'));
  } catch (error) { next(error); }
};

// @desc    Create new hotel  @route POST /api/hotels  @access Private/Admin
exports.createHotel = async (req, res, next) => {
  try {
    req.body.createdBy = req.user.id;
    const hotel = await Hotel.create(req.body);
    const populatedHotel = await Hotel.findByPk(hotel.id, { include: [destinationInclude] });
    res.status(201).json(successResponse(populatedHotel, 'Hotel created successfully'));
  } catch (error) { next(error); }
};

// @desc    Update hotel  @route PUT /api/hotels/:id  @access Private/Admin
exports.updateHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findByPk(req.params.id);
    if (!hotel) return res.status(404).json(errorResponse('Hotel not found'));
    await hotel.update(req.body);
    const updated = await Hotel.findByPk(hotel.id, { include: [destinationInclude] });
    res.status(200).json(successResponse(updated, 'Hotel updated successfully'));
  } catch (error) { next(error); }
};

// @desc    Delete hotel  @route DELETE /api/hotels/:id  @access Private/Admin
exports.deleteHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findByPk(req.params.id);
    if (!hotel) return res.status(404).json(errorResponse('Hotel not found'));
    await hotel.destroy();
    res.status(200).json(successResponse(null, 'Hotel deleted successfully'));
  } catch (error) { next(error); }
};

// @desc    Get hotels by destination  @route GET /api/hotels/destination/:destinationId  @access Public
exports.getHotelsByDestination = async (req, res, next) => {
  try {
    const hotels = await Hotel.findAll({
      where: { destinationId: req.params.destinationId, isActive: true },
      include: [destinationInclude],
      order: [['rating', 'DESC']],
    });
    res.status(200).json({ success: true, count: hotels.length, data: hotels });
  } catch (error) { next(error); }
};

// @desc    Get featured hotels  @route GET /api/hotels/featured  @access Public
exports.getFeaturedHotels = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const hotels = await Hotel.findAll({
      where: { isActive: true, isFeatured: true },
      include: [destinationInclude],
      order: [['rating', 'DESC']],
      limit,
    });
    res.status(200).json({ success: true, count: hotels.length, data: hotels });
  } catch (error) { next(error); }
};

// @desc    Get hotels within radius  @route GET /api/hotels/radius/:lng/:lat/:distance  @access Public
exports.getHotelsInRadius = async (req, res, next) => {
  try {
    const { lng, lat, distance } = req.params;
    const { sequelize } = require('../../../config/database');
    const hotels = await sequelize.query(
      `SELECT *, (6371 * acos(LEAST(1.0, cos(radians(:lat)) * cos(radians((location->>'coordinates'::text)::json->>1)) *
         cos(radians((location->>'coordinates'::text)::json->>0) - radians(:lng)) +
         sin(radians(:lat)) * sin(radians((location->>'coordinates'::text)::json->>1))))
       ) AS distance
       FROM hotels
       WHERE "isActive" = true
       HAVING (6371 * acos(LEAST(1.0, cos(radians(:lat)) * cos(radians((location->>'coordinates'::text)::json->>1)) *
         cos(radians((location->>'coordinates'::text)::json->>0) - radians(:lng)) +
         sin(radians(:lat)) * sin(radians((location->>'coordinates'::text)::json->>1))))) < :distance`,
      { replacements: { lat: parseFloat(lat), lng: parseFloat(lng), distance: parseFloat(distance) }, type: sequelize.QueryTypes.SELECT }
    );
    res.status(200).json({ success: true, count: hotels.length, data: hotels });
  } catch (error) { next(error); }
};
