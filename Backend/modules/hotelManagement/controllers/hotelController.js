const { Op } = require('sequelize');
const Hotel = require('../models/Hotel');
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

// @desc    Get all hotels  @route GET /api/hotels  @access Public
exports.getAllHotels = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const hotelWhere = {};
    if (req.query.hotel_type) hotelWhere.hotel_type = req.query.hotel_type;
    if (req.query.star_class) hotelWhere.star_class = parseInt(req.query.star_class);
    if (req.query.minPrice) hotelWhere.price_per_night = { [Op.gte]: parseFloat(req.query.minPrice) };
    if (req.query.maxPrice) {
      hotelWhere.price_per_night = { ...(hotelWhere.price_per_night || {}), [Op.lte]: parseFloat(req.query.maxPrice) };
    }

    const placeWhere = { isActive: true };
    if (req.query.district_id) placeWhere.district_id = req.query.district_id;
    if (req.query.search) {
      placeWhere[Op.or] = [
        { name:        { [Op.iLike]: `%${req.query.search}%` } },
        { description: { [Op.iLike]: `%${req.query.search}%` } },
      ];
    }

    const { count: total, rows: hotels } = await Hotel.findAndCountAll({
      where: hotelWhere,
      include: [{ ...placeInclude, where: placeWhere, required: true }],
      offset, limit, order: [['rating', 'DESC']],
      distinct: true,
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
    const hotel = await Hotel.findByPk(req.params.id, { include: [placeInclude] });
    if (!hotel) return res.status(404).json(errorResponse('Hotel not found'));
    res.status(200).json(successResponse(hotel, 'Hotel fetched successfully'));
  } catch (error) { next(error); }
};

// @desc    Create new hotel  @route POST /api/hotels  @access Private/Admin
// Body: place fields (name, description, district_id, lat, lng, climate, address_text) + hotel fields
exports.createHotel = async (req, res, next) => {
  try {
    const { hotel_type, price_per_night, star_class, check_in_time, check_out_time,
            amenities, contact, cancellation_policy, is_featured,
            name, description, district_id, lat, lng, climate, address_text } = req.body;

    // 1. Create Place supertype
    const place = await Place.create({ name, description, district_id, lat, lng, climate, address_text });

    // 2. Create Hotel subtype
    const hotel = await Hotel.create({
      place_id: place.place_id,
      hotel_type, price_per_night, star_class, check_in_time, check_out_time,
      amenities, contact, cancellation_policy, is_featured,
    });

    const result = await Hotel.findByPk(hotel.place_id, { include: [placeInclude] });
    res.status(201).json(successResponse(result, 'Hotel created successfully'));
  } catch (error) { next(error); }
};

// @desc    Update hotel  @route PUT /api/hotels/:id  @access Private/Admin
exports.updateHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findByPk(req.params.id, { include: [placeInclude] });
    if (!hotel) return res.status(404).json(errorResponse('Hotel not found'));

    const placeFields = ['name', 'description', 'district_id', 'lat', 'lng', 'climate', 'address_text', 'isActive'];
    const placeData = Object.fromEntries(Object.entries(req.body).filter(([k]) => placeFields.includes(k)));
    if (Object.keys(placeData).length) await hotel.place.update(placeData);

    const hotelFields = ['hotel_type', 'price_per_night', 'star_class', 'check_in_time', 'check_out_time',
                         'amenities', 'contact', 'cancellation_policy', 'is_featured'];
    const hotelData = Object.fromEntries(Object.entries(req.body).filter(([k]) => hotelFields.includes(k)));
    if (Object.keys(hotelData).length) await hotel.update(hotelData);

    const updated = await Hotel.findByPk(req.params.id, { include: [placeInclude] });
    res.status(200).json(successResponse(updated, 'Hotel updated successfully'));
  } catch (error) { next(error); }
};

// @desc    Delete hotel  @route DELETE /api/hotels/:id  @access Private/Admin
exports.deleteHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findByPk(req.params.id, { include: [placeInclude] });
    if (!hotel) return res.status(404).json(errorResponse('Hotel not found'));
    await hotel.place.update({ isActive: false });
    res.status(200).json(successResponse(null, 'Hotel deleted successfully'));
  } catch (error) { next(error); }
};

// @desc    Get hotels by district  @route GET /api/hotels/district/:districtId  @access Public
exports.getHotelsByDistrict = async (req, res, next) => {
  try {
    const hotels = await Hotel.findAll({
      include: [{ ...placeInclude, where: { isActive: true, district_id: req.params.districtId }, required: true }],
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
      where: { is_featured: true },
      include: [{ ...placeInclude, where: { isActive: true }, required: true }],
      order: [['rating', 'DESC']],
      limit,
    });
    res.status(200).json({ success: true, count: hotels.length, data: hotels });
  } catch (error) { next(error); }
};

