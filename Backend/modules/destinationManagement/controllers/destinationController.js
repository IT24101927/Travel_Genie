const { Op, literal } = require('sequelize');
const Place = require('../../placeManagement/models/Place');
const District = require('../../placeManagement/models/District');
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
  'Relax':        'Beach',
  'Food':         'Market',
  'Nightlife':    'Culture',
  'Photography':  'Viewpoint',
  'Art':          'Museum',
  'Shopping':     'Shopping',
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
  { model: Tag, as: 'tags', through: { attributes: ['weight'] } },
];

const INTEREST_TO_TYPE_LC = Object.fromEntries(
  Object.entries(INTEREST_TO_TYPE).map(([k, v]) => [k.toLowerCase(), v])
);

function normalizeToken(value) {
  return String(value || '').trim().toLowerCase();
}

function collectTypeMatches(interests = [], travelStyle = '') {
  const cats = new Set();
  for (const interest of interests) {
    const cat = INTEREST_TO_TYPE_LC[normalizeToken(interest)];
    if (cat) cats.add(cat);
  }
  if (travelStyle && STYLE_TO_TYPES[travelStyle]) {
    for (const cat of STYLE_TO_TYPES[travelStyle]) cats.add(cat);
  }
  return [...cats];
}

async function getUserSignals(userId) {
  const user = await User.findByPk(userId);
  if (!user) return null;

  const addressInterests = Array.isArray(user.address?.interests) ? user.address.interests : [];
  const travelStyle = user.address?.travelStyle || '';

  // Also include interests linked via user_interests -> tags when available.
  const linkedTagRows = await Tag.findAll({
    include: [{ model: User, as: 'interestedUsers', where: { id: userId }, attributes: [] }],
    attributes: ['tag_name'],
  });
  const linkedInterestNames = linkedTagRows.map((t) => t.tag_name).filter(Boolean);

  const interestNames = [...new Set([...addressInterests, ...linkedInterestNames])];
  const interestKeys = new Set(interestNames.map(normalizeToken).filter(Boolean));
  const matchedTypes = collectTypeMatches(interestNames, travelStyle);

  return { user, interestNames, interestKeys, matchedTypes };
}

function scoreByTagOverlap(rows, interestKeys) {
  if (!interestKeys || interestKeys.size === 0) return [];

  const scored = rows
    .map((row) => {
      const place = row?.toJSON ? row.toJSON() : row;
      const tags = Array.isArray(place.tags) ? place.tags : [];

      let score = 0;
      const matchedTagNames = [];
      for (const tag of tags) {
        const key = normalizeToken(tag.tag_name);
        if (!key || !interestKeys.has(key)) continue;
        const weight = Number(tag?.PlaceTag?.weight ?? 1);
        score += Number.isFinite(weight) && weight > 0 ? weight : 1;
        matchedTagNames.push(tag.tag_name);
      }

      return {
        place,
        score,
        matchedTagNames,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) =>
      (b.score - a.score) ||
      ((b.place.rating || 0) - (a.place.rating || 0)) ||
      ((b.place.review_count || 0) - (a.place.review_count || 0))
    );

  return scored;
}

function withLegacyImages(placeRow) {
  const place = placeRow?.toJSON ? placeRow.toJSON() : placeRow;
  return {
    ...place,
    images: place?.image_url
      ? [{ image_id: place.place_id, image_url: place.image_url, caption: place.name || '' }]
      : [],
  };
}

// @desc    Get distinct destination types  @route GET /api/destinations/types  @access Public
exports.getDestinationTypes = async (req, res, next) => {
  try {
    const rows = await Place.findAll({
      where: { type: { [Op.ne]: null }, isActive: true, place_id: { [Op.notIn]: literal('(SELECT "place_id" FROM "hotels")') } },
      attributes: [[literal('DISTINCT "type"'), 'type']],
      raw: true,
      order: [['type', 'ASC']],
    });
    const types = rows.map(r => r.type).filter(Boolean);
    res.status(200).json({ success: true, data: types });
  } catch (error) { next(error); }
};

// @desc    Get all destinations  @route GET /api/destinations  @access Public
exports.getAllDestinations = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const rawLimit = String(req.query.limit || '').toLowerCase();
    const limit = rawLimit === 'all' ? null : (parseInt(req.query.limit, 10) || 100);
    const offset = limit ? (page - 1) * limit : 0;

    const where = { type: { [Op.ne]: null }, place_id: { [Op.notIn]: literal('(SELECT "place_id" FROM "hotels")') } };
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

    const query = {
      where,
      include: defaultInclude,
      order: [['rating', 'DESC']],
      distinct: true,
    };
    if (limit !== null) {
      query.offset = offset;
      query.limit = limit;
    }

    const { count: total, rows } = await Place.findAndCountAll(query);
    const destinations = rows.map(withLegacyImages);

    res.status(200).json({
      success: true, count: destinations.length, total, page,
      pages: limit ? Math.ceil(total / limit) : 1, data: destinations,
    });
  } catch (error) { next(error); }
};

// @desc    Get single destination  @route GET /api/destinations/:id  @access Public
exports.getDestination = async (req, res, next) => {
  try {
    const destinationRow = await Place.findOne({
      where: { place_id: req.params.id, type: { [Op.ne]: null }, [Op.and]: [literal('"Place"."place_id" NOT IN (SELECT "place_id" FROM "hotels")')] },
      include: defaultInclude,
    });
    if (!destinationRow) return res.status(404).json(errorResponse('Destination not found'));
    const destination = withLegacyImages(destinationRow);
    res.status(200).json(successResponse(destination, 'Destination fetched successfully'));
  } catch (error) { next(error); }
};

// @desc    Create new destination  @route POST /api/destinations  @access Private/Admin
exports.createDestination = async (req, res, next) => {
  try {
    const { type, duration, name, description, district_id, isActive, lat, lng, address_text, image_url } = req.body;

    const destination = await Place.create({
      name, description, district_id, type, duration,
      isActive: isActive !== undefined ? isActive : true,
      lat: lat || null,
      lng: lng || null,
      address_text: address_text || '',
      image_url: image_url || null,
    });

    const resultRow = await Place.findByPk(destination.place_id, { include: defaultInclude });
    const result = withLegacyImages(resultRow);
    res.status(201).json(successResponse(result, 'Destination created successfully'));
  } catch (error) { next(error); }
};

// @desc    Update destination  @route PUT /api/destinations/:id  @access Private/Admin
exports.updateDestination = async (req, res, next) => {
  try {
    const destination = await Place.findOne({
      where: {
        [Op.and]: [
          { place_id: req.params.id },
          { type: { [Op.ne]: null } },
          literal('"place_id" NOT IN (SELECT "place_id" FROM "hotels")'),
        ],
      },
    });
    if (!destination) return res.status(404).json(errorResponse('Destination not found'));

    const updatableFields = [
      'name', 'description', 'district_id', 'isActive',
      'type', 'duration', 'lat', 'lng', 'address_text', 'image_url',
    ];
    const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => updatableFields.includes(k)));
    if (Object.keys(data).length) await destination.update(data);

    const updatedRow = await Place.findByPk(req.params.id, { include: defaultInclude });
    const updated = withLegacyImages(updatedRow);
    res.status(200).json(successResponse(updated, 'Destination updated successfully'));
  } catch (error) { next(error); }
};

// @desc    Delete destination  @route DELETE /api/destinations/:id  @access Private/Admin
exports.deleteDestination = async (req, res, next) => {
  try {
    const destination = await Place.findOne({
      where: {
        [Op.and]: [
          { place_id: req.params.id },
          { type: { [Op.ne]: null } },
          literal('"place_id" NOT IN (SELECT "place_id" FROM "hotels")'),
        ],
      },
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
    const rows = await Place.findAll({
      where: { isActive: true, type: { [Op.ne]: null }, place_id: { [Op.notIn]: literal('(SELECT "place_id" FROM "hotels")') } },
      include: defaultInclude,
      order: [['rating', 'DESC'], ['review_count', 'DESC']],
      limit,
    });
    const destinations = rows.map(withLegacyImages);
    res.status(200).json({ success: true, count: destinations.length, data: destinations });
  } catch (error) { next(error); }
};

// @desc    Get destinations by district  @route GET /api/destinations/district/:districtId  @access Public
exports.getDestinationsByDistrict = async (req, res, next) => {
  try {
    const rows = await Place.findAll({
      where: {
        isActive: true,
        district_id: req.params.districtId,
        type: { [Op.ne]: null },
        place_id: { [Op.notIn]: literal('(SELECT "place_id" FROM "hotels")') },
      },
      include: defaultInclude,
      order: [['rating', 'DESC']],
    });
    const destinations = rows.map(withLegacyImages);
    res.status(200).json({ success: true, count: destinations.length, data: destinations });
  } catch (error) { next(error); }
};

// @desc    Get recommended destinations for the logged-in user
// @route   GET /api/destinations/recommended
// @access  Private
exports.getRecommendedDestinations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const signals = await getUserSignals(userId);
    if (!signals?.user) return res.status(404).json(errorResponse('User not found'));

    const limit = parseInt(req.query.limit) || 12;

    // 1) Prefer tag-overlap scoring when tag data exists.
    if (signals.interestKeys.size > 0) {
      const candidates = await Place.findAll({
        where: {
          isActive: true,
          type: { [Op.ne]: null },
          place_id: { [Op.notIn]: literal('(SELECT "place_id" FROM "hotels")') },
        },
        include: defaultInclude,
        order: [['rating', 'DESC'], ['review_count', 'DESC']],
        limit: 200,
      });

      const scored = scoreByTagOverlap(candidates, signals.interestKeys).slice(0, limit);
      if (scored.length > 0) {
        const destinations = scored.map((item) => withLegacyImages(item.place));
        const matchedTagNames = [...new Set(scored.flatMap((item) => item.matchedTagNames))];

        return res.status(200).json({
          success: true,
          count: destinations.length,
          matchedTags: matchedTagNames,
          matchedTypes: signals.matchedTypes,
          matchedCategories: signals.matchedTypes,
          data: destinations,
        });
      }
    }

    // 2) Fallback to existing type-based recommendation.
    if (signals.matchedTypes.length === 0) {
      const popularRows = await Place.findAll({
        where: { isActive: true, type: { [Op.ne]: null }, place_id: { [Op.notIn]: literal('(SELECT "place_id" FROM "hotels")') } },
        include: defaultInclude,
        order: [['rating', 'DESC'], ['review_count', 'DESC']],
        limit,
      });
      const popular = popularRows.map(withLegacyImages);
      return res.status(200).json({
        success: true,
        count: popular.length,
        matchedTypes: [],
        matchedCategories: [],
        data: popular,
      });
    }

    const rows = await Place.findAll({
      where: {
        isActive: true,
        type: { [Op.in]: signals.matchedTypes },
        place_id: { [Op.notIn]: literal('(SELECT "place_id" FROM "hotels")') },
      },
      include: defaultInclude,
      order: [['rating', 'DESC'], ['review_count', 'DESC']],
      limit,
    });
    const destinations = rows.map(withLegacyImages);

    res.status(200).json({
      success: true,
      count: destinations.length,
      matchedTypes: signals.matchedTypes,
      matchedCategories: signals.matchedTypes,
      data: destinations,
    });
  } catch (error) { next(error); }
};

// @desc    Get recommended destinations for a specific user by ID (Admin)
// @route   GET /api/destinations/recommended/:userId
// @access  Private/Admin
exports.getRecommendedForUser = async (req, res, next) => {
  try {
    const signals = await getUserSignals(req.params.userId);
    if (!signals?.user) return res.status(404).json(errorResponse('User not found'));

    const limit = parseInt(req.query.limit) || 20;

    if (signals.interestKeys.size > 0) {
      const candidates = await Place.findAll({
        where: {
          isActive: true,
          type: { [Op.ne]: null },
          place_id: { [Op.notIn]: literal('(SELECT "place_id" FROM "hotels")') },
        },
        include: defaultInclude,
        order: [['rating', 'DESC'], ['review_count', 'DESC']],
        limit: 300,
      });

      const scored = scoreByTagOverlap(candidates, signals.interestKeys).slice(0, limit);
      if (scored.length > 0) {
        const destinations = scored.map((item) => withLegacyImages(item.place));
        const matchedTagNames = [...new Set(scored.flatMap((item) => item.matchedTagNames))];
        return res.status(200).json({
          success: true,
          count: destinations.length,
          matchedTags: matchedTagNames,
          matchedTypes: signals.matchedTypes,
          matchedCategories: signals.matchedTypes,
          data: destinations,
        });
      }
    }

    if (signals.matchedTypes.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        matchedTypes: [],
        matchedCategories: [],
        data: [],
      });
    }

    const rows = await Place.findAll({
      where: {
        isActive: true,
        type: { [Op.in]: signals.matchedTypes },
        place_id: { [Op.notIn]: literal('(SELECT "place_id" FROM "hotels")') },
      },
      include: defaultInclude,
      order: [['rating', 'DESC'], ['review_count', 'DESC']],
      limit,
    });
    const destinations = rows.map(withLegacyImages);

    res.status(200).json({
      success: true,
      count: destinations.length,
      matchedTypes: signals.matchedTypes,
      matchedCategories: signals.matchedTypes,
      data: destinations,
    });
  } catch (error) { next(error); }
};

