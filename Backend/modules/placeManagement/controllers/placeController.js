const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../../../config/database');
const District = require('../models/District');
const Place = require('../models/Place');
const Destination = require('../../destinationManagement/models/Destination');
const Hotel = require('../../hotelManagement/models/Hotel');
const PlaceImage = require('../../tagManagement/models/PlaceImage');
const Tag = require('../../tagManagement/models/Tag');
const { successResponse, errorResponse } = require('../../../utils/helpers');

// ── Districts ────────────────────────────────────────────────────────────────

// @desc  Get all districts  @route GET /api/districts  @access Public
exports.getAllDistricts = async (req, res, next) => {
  try {
    const districts = await District.findAll({
      order: [['name', 'ASC']],
      attributes: {
        include: [[sequelize.fn('COUNT', sequelize.col('places.place_id')), 'place_count']],
      },
      include: [{ model: Place, as: 'places', attributes: [] }],
      group: ['District.district_id'],
    });
    res.status(200).json(successResponse(districts, 'Districts fetched successfully'));
  } catch (error) {
    // If image_url column missing, retry without it (column not yet migrated)
    if (error.message && error.message.includes('image_url')) {
      console.warn('  [DB] districts.image_url column missing — run: ALTER TABLE districts ADD COLUMN IF NOT EXISTS image_url TEXT;');
      try {
        const districts = await District.findAll({
          order: [['name', 'ASC']],
          attributes: ['district_id', 'name', 'province',
            [sequelize.fn('COUNT', sequelize.col('places.place_id')), 'place_count']],
          include: [{ model: Place, as: 'places', attributes: [] }],
          group: ['District.district_id'],
        });
        return res.status(200).json(successResponse(districts, 'Districts fetched successfully'));
      } catch (e2) { return next(e2); }
    }
    next(error);
  }
};

// @desc  Get single district  @route GET /api/districts/:id  @access Public
exports.getDistrict = async (req, res, next) => {
  try {
    const district = await District.findByPk(req.params.id, {
      include: [{ model: Place, as: 'places', attributes: ['place_id', 'name', 'description', 'lat', 'lng'] }],
    });
    if (!district) return res.status(404).json(errorResponse('District not found'));
    res.status(200).json(successResponse(district, 'District fetched successfully'));
  } catch (error) { next(error); }
};

// @desc  Create district  @route POST /api/districts  @access Private/Admin
exports.createDistrict = async (req, res, next) => {
  try {
    const district = await District.create(req.body);
    res.status(201).json(successResponse(district, 'District created successfully'));
  } catch (error) { next(error); }
};

// @desc  Update district  @route PUT /api/districts/:id  @access Private/Admin
exports.updateDistrict = async (req, res, next) => {
  try {
    const district = await District.findByPk(req.params.id);
    if (!district) return res.status(404).json(errorResponse('District not found'));
    await district.update(req.body);
    res.status(200).json(successResponse(district, 'District updated successfully'));
  } catch (error) { next(error); }
};

// @desc  Delete district  @route DELETE /api/districts/:id  @access Private/Admin
exports.deleteDistrict = async (req, res, next) => {
  try {
    const district = await District.findByPk(req.params.id);
    if (!district) return res.status(404).json(errorResponse('District not found'));
    await district.destroy();
    res.status(200).json(successResponse(null, 'District deleted successfully'));
  } catch (error) { next(error); }
};

// @desc  Upload district image  @route POST /api/districts/:id/image  @access Private/Admin
exports.uploadDistrictImage = async (req, res, next) => {
  try {
    const district = await District.findByPk(req.params.id);
    if (!district) return res.status(404).json(errorResponse('District not found'));
    if (!req.file) return res.status(400).json(errorResponse('No image file provided'));
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/places/${req.file.filename}`;
    await district.update({ image_url: imageUrl });
    res.status(200).json(successResponse({ image_url: imageUrl }, 'District image uploaded'));
  } catch (error) { next(error); }
};

// ── Places ────────────────────────────────────────────────────────────────────

// @desc  Get all places (with optional type filter)  @route GET /api/places  @access Public
exports.getAllPlaces = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    const where = { isActive: true };
    if (req.query.district_id) where.district_id = req.query.district_id;
    if (req.query.search) {
      where[Op.or] = [
        { name:        { [Op.iLike]: `%${req.query.search}%` } },
        { description: { [Op.iLike]: `%${req.query.search}%` } },
      ];
    }

    const include = [
      { model: District,     as: 'district',     attributes: ['district_id', 'name', 'province'] },
      { model: PlaceImage,   as: 'images',        attributes: ['image_id', 'image_url', 'caption'], limit: 3 },
      { model: Tag,          as: 'tags',          attributes: ['tag_id', 'tag_name', 'tag_type'], through: { attributes: [] } },
      { model: Destination,  as: 'destination', required: false },
      { model: Hotel,        as: 'hotel',        required: false },
    ];

    // Filter by place type
    if (req.query.type === 'destination') include[3].required = true;
    if (req.query.type === 'hotel')       include[4].required = true;

    const { count: total, rows: places } = await Place.findAndCountAll({
      where, include, distinct: true,
      offset, limit, order: [['name', 'ASC']],
    });

    res.status(200).json({
      success: true, count: places.length, total, page,
      pages: Math.ceil(total / limit), data: places,
    });
  } catch (error) { next(error); }
};

// @desc  Get single place  @route GET /api/places/:id  @access Public
exports.getPlace = async (req, res, next) => {
  try {
    const place = await Place.findByPk(req.params.id, {
      include: [
        { model: District,   as: 'district' },
        { model: PlaceImage, as: 'images' },
        { model: Tag,        as: 'tags', through: { attributes: ['weight'] } },
        { model: Destination, as: 'destination', required: false },
        { model: Hotel,       as: 'hotel',       required: false },
      ],
    });
    if (!place) return res.status(404).json(errorResponse('Place not found'));
    res.status(200).json(successResponse(place, 'Place fetched successfully'));
  } catch (error) { next(error); }
};

// @desc  Create a place  @route POST /api/places  @access Private/Admin
exports.createPlace = async (req, res, next) => {
  try {
    const place = await Place.create(req.body);
    res.status(201).json(successResponse(place, 'Place created successfully'));
  } catch (error) { next(error); }
};

// @desc  Update a place  @route PUT /api/places/:id  @access Private/Admin
exports.updatePlace = async (req, res, next) => {
  try {
    const place = await Place.findByPk(req.params.id);
    if (!place) return res.status(404).json(errorResponse('Place not found'));
    await place.update(req.body);
    res.status(200).json(successResponse(place, 'Place updated successfully'));
  } catch (error) { next(error); }
};

// @desc  Delete a place  @route DELETE /api/places/:id  @access Private/Admin
exports.deletePlace = async (req, res, next) => {
  try {
    const place = await Place.findByPk(req.params.id);
    if (!place) return res.status(404).json(errorResponse('Place not found'));
    await place.update({ isActive: false });
    res.status(200).json(successResponse(null, 'Place deactivated successfully'));
  } catch (error) { next(error); }
};

// @desc  Search places (destinations + hotels) with district filter  @route GET /api/places/search  @access Public
exports.searchPlaces = async (req, res, next) => {
  try {
    const { q, district_id, type, limit = 10 } = req.query;
    const where = { isActive: true };
    if (q) where[Op.or] = [
      { name:        { [Op.iLike]: `%${q}%` } },
      { description: { [Op.iLike]: `%${q}%` } },
    ];
    if (district_id) where.district_id = district_id;

    const include = [
      { model: District,    as: 'district', attributes: ['name', 'province'] },
      { model: Destination, as: 'destination', required: type === 'destination' },
      { model: Hotel,       as: 'hotel',       required: type === 'hotel' },
    ];

    const places = await Place.findAll({ where, include, limit: parseInt(limit) });
    res.status(200).json(successResponse(places, 'Search results'));
  } catch (error) { next(error); }
};

// ── Place Images ─────────────────────────────────────────────────────────────

// @desc  Upload images for a place  @route POST /api/places/:placeId/images  @access Private/Admin
exports.uploadPlaceImages = async (req, res, next) => {
  try {
    const place = await Place.findByPk(req.params.placeId);
    if (!place) return res.status(404).json(errorResponse('Place not found'));

    if (!req.files || req.files.length === 0)
      return res.status(400).json(errorResponse('No image files provided'));

    const BASE_URL = process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`;

    // Determine the current max sort_order
    const existing = await PlaceImage.findAll({
      where: { place_id: req.params.placeId },
      order: [['sort_order', 'DESC']],
      limit: 1,
    });
    let sortOrder = existing.length > 0 ? (existing[0].sort_order + 1) : 0;

    const created = [];
    for (const file of req.files) {
      const image_url = `${BASE_URL}/uploads/places/${file.filename}`;
      const caption = req.body.caption || '';
      const img = await PlaceImage.create({
        place_id: parseInt(req.params.placeId),
        image_url,
        caption,
        sort_order: sortOrder++,
      });
      created.push(img);
    }

    res.status(201).json(successResponse(created, 'Images uploaded successfully'));
  } catch (error) { next(error); }
};

// @desc  Add an image by URL  @route POST /api/places/:placeId/images/url  @access Private/Admin
exports.addPlaceImageByUrl = async (req, res, next) => {
  try {
    const place = await Place.findByPk(req.params.placeId);
    if (!place) return res.status(404).json(errorResponse('Place not found'));

    const { image_url, caption } = req.body;
    if (!image_url) return res.status(400).json(errorResponse('image_url is required'));

    const existing = await PlaceImage.findAll({
      where: { place_id: req.params.placeId },
      order: [['sort_order', 'DESC']],
      limit: 1,
    });
    const sortOrder = existing.length > 0 ? (existing[0].sort_order + 1) : 0;

    const img = await PlaceImage.create({
      place_id: parseInt(req.params.placeId),
      image_url,
      caption: caption || '',
      sort_order: sortOrder,
    });
    res.status(201).json(successResponse(img, 'Image URL saved'));
  } catch (error) { next(error); }
};

// @desc  Get images for a place  @route GET /api/places/:placeId/images  @access Public
exports.getPlaceImages = async (req, res, next) => {
  try {
    const images = await PlaceImage.findAll({
      where: { place_id: req.params.placeId },
      order: [['sort_order', 'ASC']],
    });
    res.status(200).json(successResponse(images, 'Images fetched'));
  } catch (error) { next(error); }
};

// @desc  Delete a place image  @route DELETE /api/places/images/:imageId  @access Private/Admin
exports.deletePlaceImage = async (req, res, next) => {
  try {
    const img = await PlaceImage.findByPk(req.params.imageId);
    if (!img) return res.status(404).json(errorResponse('Image not found'));

    // Try to remove the file from disk
    const path = require('path');
    const fs = require('fs');
    try {
      const filename = img.image_url.split('/uploads/places/').pop();
      if (filename) {
        const filePath = path.join(__dirname, '..', '..', '..', 'uploads', 'places', filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    } catch { /* ignore file-not-found errors */ }

    await img.destroy();
    res.status(200).json(successResponse(null, 'Image deleted'));
  } catch (error) { next(error); }
};
