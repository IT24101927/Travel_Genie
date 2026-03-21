const { Op } = require('sequelize');
const Place = require('../../placeManagement/models/Place');
const District = require('../../placeManagement/models/District');
const PlaceImage = require('../../tagManagement/models/PlaceImage');
const Tag = require('../../tagManagement/models/Tag');
const User = require('../../userManagement/models/User');
const { successResponse, errorResponse } = require('../../../utils/helpers');

// Map user interest names → place type values (matching DistrictExplore types)
const INTEREST_TO_TYPE = {
  'Beaches':      'Beach',
  'Mountains':    'Nature',
  'Historical':   'Heritage',
  'History':      'Heritage',
  'Cultural':     'Culture',
  'Culture':      'Culture',
  'Adventure':    'Adventure',
  'Nature':       'Nature',
  'Wildlife':     'Wildlife',
  'Religious':    'Temple',
  'City':         'Park',
  'Food':         'Market',
  'Nightlife':    'Culture',
  'Photography':  'Viewpoint',
  'Art':          'Museum',
  'Shopping':     'Shopping',
  'Sports':       'Adventure',
  'Spa':          'Nature',
  'Wellness':     'Nature',
};

// Map travel style → additional place types
const STYLE_TO_TYPES = {
  'Adventure':  ['Adventure', 'Nature', 'Wildlife', 'Safari'],
  'Relax':      ['Beach', 'Garden', 'Lake', 'Nature'],
  'Culture':    ['Culture', 'Heritage', 'Temple', 'Museum'],
  'Luxury':     ['Beach', 'Shopping', 'Theme Park'],
  'Budget':     ['Nature', 'Temple', 'Park', 'Viewpoint'],
  'Family':     ['Beach', 'Nature', 'Park', 'Theme Park', 'Wildlife'],
  'Backpacker': ['Adventure', 'Nature', 'Viewpoint', 'Market'],
};

const defaultInclude = [
  { model: District, as: 'district', attributes: ['district_id', 'name', 'province'] },
  { model: PlaceImage, as: 'images', limit: 5 },
  { model: Tag, as: 'tags', through: { attributes: ['weight'] } },
];

// @desc    Get all destinations  @route GET /api/destinations  @access Public
exports.getAllDestinations = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const where = { type: { [Op.ne]: null } };
    // Only filter active by default; admin panel passes includeInactive=true to see all
    if (!req.query.includeInactive) where.isActive = true;
    if (req.query.type) where.type = req.query.type;
    if (req.query.district_id) where.district_id = req.query.district_id;
    if (req.query.search) {
      where[Op.or] = [
        { name:        { [Op.iLike]: `%${req.query.search}%` } },
        { description: { [Op.iLike]: `%${req.query.search}%` } },
      ];
    }

    const { count: total, rows: destinations } = await Place.findAndCountAll({
      where,
      include: defaultInclude,
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
    const destination = await Place.findOne({
      where: { place_id: req.params.id, type: { [Op.ne]: null } },
      include: defaultInclude,
    });
    if (!destination) return res.status(404).json(errorResponse('Destination not found'));
    res.status(200).json(successResponse(destination, 'Destination fetched successfully'));
  } catch (error) { next(error); }
};

// @desc    Create new destination  @route POST /api/destinations  @access Private/Admin
exports.createDestination = async (req, res, next) => {
  try {
    const { type, duration, name, description, district_id, isActive } = req.body;

    const destination = await Place.create({
      name, description, district_id, type, duration,
      isActive: isActive !== undefined ? isActive : true,
    });

    const result = await Place.findByPk(destination.place_id, { include: defaultInclude });
    res.status(201).json(successResponse(result, 'Destination created successfully'));
  } catch (error) { next(error); }
};

// @desc    Update destination  @route PUT /api/destinations/:id  @access Private/Admin
exports.updateDestination = async (req, res, next) => {
  try {
    const destination = await Place.findOne({
      where: { place_id: req.params.id, type: { [Op.ne]: null } },
    });
    if (!destination) return res.status(404).json(errorResponse('Destination not found'));

    const updatableFields = [
      'name', 'description', 'district_id', 'isActive',
      'type', 'duration',
    ];
    const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => updatableFields.includes(k)));
    if (Object.keys(data).length) await destination.update(data);

    const updated = await Place.findByPk(req.params.id, { include: defaultInclude });
    res.status(200).json(successResponse(updated, 'Destination updated successfully'));
  } catch (error) { next(error); }
};

// @desc    Delete destination  @route DELETE /api/destinations/:id  @access Private/Admin
exports.deleteDestination = async (req, res, next) => {
  try {
    const destination = await Place.findOne({
      where: { place_id: req.params.id, type: { [Op.ne]: null } },
    });
    if (!destination) return res.status(404).json(errorResponse('Destination not found'));
    await destination.destroy();
    res.status(200).json(successResponse(null, 'Destination deleted successfully'));
  } catch (error) { next(error); }
};

// @desc    Get popular destinations  @route GET /api/destinations/popular  @access Public
exports.getPopularDestinations = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const destinations = await Place.findAll({
      where: { isActive: true, type: { [Op.ne]: null } },
      include: defaultInclude,
      order: [['rating', 'DESC'], ['review_count', 'DESC']],
      limit,
    });
    res.status(200).json({ success: true, count: destinations.length, data: destinations });
  } catch (error) { next(error); }
};

// @desc    Get destinations by district  @route GET /api/destinations/district/:districtId  @access Public
exports.getDestinationsByDistrict = async (req, res, next) => {
  try {
    const destinations = await Place.findAll({
      where: {
        isActive: true,
        district_id: req.params.districtId,
        type: { [Op.ne]: null },
      },
      include: defaultInclude,
      order: [['rating', 'DESC']],
    });
    res.status(200).json({ success: true, count: destinations.length, data: destinations });
  } catch (error) { next(error); }
};

// @desc    Get recommended destinations for the logged-in user
// @route   GET /api/destinations/recommended
// @access  Private
exports.getRecommendedDestinations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json(errorResponse('User not found'));

    const interests = user.address?.interests || [];
    const travelStyle = user.address?.travelStyle || '';

    // Build set of matching place types
    const cats = new Set();
    for (const interest of interests) {
      const cat = INTEREST_TO_TYPE[interest];
      if (cat) cats.add(cat);
    }
    if (travelStyle && STYLE_TO_TYPES[travelStyle]) {
      for (const cat of STYLE_TO_TYPES[travelStyle]) cats.add(cat);
    }

    if (cats.size === 0) {
      // No preferences → return popular destinations as fallback
      const popular = await Place.findAll({
        where: { isActive: true, type: { [Op.ne]: null } },
        include: defaultInclude,
        order: [['rating', 'DESC'], ['review_count', 'DESC']],
        limit: parseInt(req.query.limit) || 12,
      });
      return res.status(200).json({
        success: true, count: popular.length,
        matchedTypes: [], data: popular,
      });
    }

    const typeArr = [...cats];
    const limit = parseInt(req.query.limit) || 12;

    const destinations = await Place.findAll({
      where: {
        isActive: true,
        type: { [Op.in]: typeArr },
      },
      include: defaultInclude,
      order: [['rating', 'DESC'], ['review_count', 'DESC']],
      limit,
    });

    res.status(200).json({
      success: true, count: destinations.length,
      matchedTypes: typeArr, data: destinations,
    });
  } catch (error) { next(error); }
};

// @desc    Get recommended destinations for a specific user by ID (Admin)
// @route   GET /api/destinations/recommended/:userId
// @access  Private/Admin
exports.getRecommendedForUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.userId);
    if (!user) return res.status(404).json(errorResponse('User not found'));

    const interests = user.address?.interests || [];
    const travelStyle = user.address?.travelStyle || '';

    const cats = new Set();
    for (const interest of interests) {
      const cat = INTEREST_TO_TYPE[interest];
      if (cat) cats.add(cat);
    }
    if (travelStyle && STYLE_TO_TYPES[travelStyle]) {
      for (const cat of STYLE_TO_TYPES[travelStyle]) cats.add(cat);
    }

    const typeArr = [...cats];
    if (typeArr.length === 0) {
      return res.status(200).json({ success: true, count: 0, matchedTypes: [], data: [] });
    }

    const destinations = await Place.findAll({
      where: {
        isActive: true,
        type: { [Op.in]: typeArr },
      },
      include: defaultInclude,
      order: [['rating', 'DESC'], ['review_count', 'DESC']],
      limit: parseInt(req.query.limit) || 20,
    });

    res.status(200).json({
      success: true, count: destinations.length,
      matchedTypes: typeArr, data: destinations,
    });
  } catch (error) { next(error); }
};

