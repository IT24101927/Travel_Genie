const { Op } = require('sequelize');
const Hotel = require('../models/Hotel');
const Place = require('../../placeManagement/models/Place');
const District = require('../../placeManagement/models/District');
const Tag = require('../../tagManagement/models/Tag');
const TripItinerary = require('../../tripItineraryManagement/models/TripItinerary');
const { successResponse, errorResponse } = require('../../../utils/helpers');
const { scoreHotels } = require('../services/hotelRecommendationService');

const placeInclude = {
  model: Place,
  as: 'place',
  include: [
    { model: District, as: 'district', attributes: ['district_id', 'name', 'province'] },
    { model: Tag, as: 'tags', through: { attributes: ['weight'] } },
  ],
};

const nearbyPlaceInclude = {
  model: Place,
  as: 'nearbyPlace',
  required: false,
  attributes: ['place_id', 'district_id', 'name', 'type', 'lat', 'lng'],
  include: [
    { model: District, as: 'district', attributes: ['district_id', 'name', 'province'] },
  ],
};

const hotelIncludes = [placeInclude, nearbyPlaceInclude];

function withLegacyPlaceImages(hotelRow) {
  const hotel = hotelRow?.toJSON ? hotelRow.toJSON() : hotelRow;
  if (!hotel?.place) return hotel;
  return {
    ...hotel,
    place: {
      ...hotel.place,
      images: hotel.place.image_url
        ? [{ image_id: hotel.place.place_id, image_url: hotel.place.image_url, caption: hotel.place.name || '' }]
        : [],
    },
  };
}

async function validateNearbyPlaceId(rawNearbyPlaceId, districtId) {
  if (rawNearbyPlaceId === undefined) return { ok: true, value: undefined };
  if (rawNearbyPlaceId === null || rawNearbyPlaceId === '') return { ok: true, value: null };

  const nearbyPlaceId = parseInt(rawNearbyPlaceId, 10);
  if (Number.isNaN(nearbyPlaceId)) {
    return { ok: false, message: 'nearby_place_id must be a valid place ID' };
  }

  const nearbyPlace = await Place.findByPk(nearbyPlaceId);
  if (!nearbyPlace || !nearbyPlace.type) {
    return { ok: false, message: 'Nearby place must reference an existing destination' };
  }

  const linkedHotel = await Hotel.findOne({ where: { place_id: nearbyPlaceId } });
  if (linkedHotel) {
    return { ok: false, message: 'Nearby place must reference a destination, not a hotel' };
  }

  if (districtId && parseInt(nearbyPlace.district_id, 10) !== parseInt(districtId, 10)) {
    return { ok: false, message: 'Nearby place must belong to the selected district' };
  }

  return { ok: true, value: nearbyPlaceId, record: nearbyPlace };
}

// @desc    Get all hotels  @route GET /api/hotels  @access Public
exports.getAllHotels = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const rawLimit = String(req.query.limit || '').toLowerCase();
    const limit = rawLimit === 'all' ? null : (parseInt(req.query.limit, 10) || 100);
    const offset = limit ? (page - 1) * limit : 0;

    const hotelWhere = {};
    if (req.query.hotel_type) hotelWhere.hotel_type = req.query.hotel_type;
    if (req.query.star_class) hotelWhere.star_class = parseInt(req.query.star_class);
    if (req.query.minPrice) hotelWhere.price_per_night = { [Op.gte]: parseFloat(req.query.minPrice) };
    if (req.query.maxPrice) {
      hotelWhere.price_per_night = { ...(hotelWhere.price_per_night || {}), [Op.lte]: parseFloat(req.query.maxPrice) };
    }

    const placeWhere = {};
    if (req.query.includeInactive !== 'true') placeWhere.isActive = true;
    if (req.query.district_id) placeWhere.district_id = req.query.district_id;
    if (req.query.search) {
      hotelWhere[Op.or] = [
        { name:        { [Op.iLike]: `%${req.query.search}%` } },
        { description: { [Op.iLike]: `%${req.query.search}%` } },
      ];
      placeWhere[Op.or] = [
        { name:        { [Op.iLike]: `%${req.query.search}%` } },
        { description: { [Op.iLike]: `%${req.query.search}%` } },
      ];
    }

    const query = {
      where: hotelWhere,
      include: [{ ...placeInclude, where: placeWhere, required: true }, nearbyPlaceInclude],
      order: [['rating', 'DESC']],
      distinct: true,
    };
    if (limit !== null) {
      query.offset = offset;
      query.limit = limit;
    }

    const { count: total, rows } = await Hotel.findAndCountAll(query);
    const hotels = rows.map(withLegacyPlaceImages);

    res.status(200).json({
      success: true, count: hotels.length, total, page,
      pages: limit ? Math.ceil(total / limit) : 1, data: hotels,
    });
  } catch (error) { next(error); }
};

// @desc    Get single hotel  @route GET /api/hotels/:id  @access Public
exports.getHotel = async (req, res, next) => {
  try {
    const hotelRow = await Hotel.findByPk(req.params.id, { include: hotelIncludes });
    if (!hotelRow) return res.status(404).json(errorResponse('Hotel not found'));
    const hotel = withLegacyPlaceImages(hotelRow);
    res.status(200).json(successResponse(hotel, 'Hotel fetched successfully'));
  } catch (error) { next(error); }
};

// @desc    Create new hotel  @route POST /api/hotels  @access Private/Admin
// Creates a NEW Place record for the hotel (hotels own their place, not shared with destinations)
exports.createHotel = async (req, res, next) => {
  try {
    const { district_id, hotel_type, price_per_night, star_class,
            amenities, contact,
            name, description, address_text, lat, lng, nearby_place_id, image_url } = req.body;

    if (!district_id) return res.status(400).json(errorResponse('district_id is required'));
    if (!name)        return res.status(400).json(errorResponse('Hotel name is required'));

    const parsedDistrictId = parseInt(district_id, 10);
    if (Number.isNaN(parsedDistrictId)) {
      return res.status(400).json(errorResponse('district_id must be a valid district ID'));
    }

    // Verify district exists
    const district = await District.findByPk(parsedDistrictId);
    if (!district) return res.status(400).json(errorResponse('District not found'));

    const nearbyPlaceValidation = await validateNearbyPlaceId(nearby_place_id, parsedDistrictId);
    if (!nearbyPlaceValidation.ok) {
      return res.status(400).json(errorResponse(nearbyPlaceValidation.message));
    }

    // Create a dedicated Place for this hotel (type=null so it never appears as a destination)
    const placeRecord = await Place.create({
      district_id: parsedDistrictId,
      name,
      description:  description  || '',
      address_text: address_text || '',
      image_url: image_url || null,
      lat: lat || null,
      lng: lng || null,
      isActive: true,
    });

    // Create Hotel subtype
    const hotel = await Hotel.create({
      place_id:     placeRecord.place_id,
      nearby_place_id: nearbyPlaceValidation.value ?? null,
      name:         name,
      address_text: address_text || '',
      description:  description  || '',
      image_url:    image_url || null,
      hotel_type, price_per_night, star_class,
      amenities, contact,
    });

    const resultRow = await Hotel.findByPk(hotel.hotel_id, { include: hotelIncludes });
    const result = withLegacyPlaceImages(resultRow);
    res.status(201).json(successResponse(result, 'Hotel created successfully'));
  } catch (error) { next(error); }
};

// @desc    Update hotel  @route PUT /api/hotels/:id  @access Private/Admin
exports.updateHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findByPk(req.params.id, { include: hotelIncludes });
    if (!hotel) return res.status(404).json(errorResponse('Hotel not found'));

    const districtIdWasProvided = Object.prototype.hasOwnProperty.call(req.body, 'district_id');
    const parsedDistrictId = districtIdWasProvided ? parseInt(req.body.district_id, 10) : hotel.place.district_id;
    if (districtIdWasProvided) {
      if (Number.isNaN(parsedDistrictId)) {
        return res.status(400).json(errorResponse('district_id must be a valid district ID'));
      }
      const district = await District.findByPk(parsedDistrictId);
      if (!district) return res.status(400).json(errorResponse('District not found'));
    }

    const placeFields = ['name', 'description', 'district_id', 'lat', 'lng', 'address_text', 'isActive'];
    const placeData = Object.fromEntries(Object.entries(req.body).filter(([k]) => placeFields.includes(k)));

    const hotelFields = ['name', 'address_text', 'description',
                         'image_url',
                         'hotel_type', 'price_per_night', 'star_class',
                         'amenities', 'contact'];
    const hotelData = Object.fromEntries(Object.entries(req.body).filter(([k]) => hotelFields.includes(k)));

    if (Object.prototype.hasOwnProperty.call(req.body, 'nearby_place_id')) {
      const nearbyPlaceValidation = await validateNearbyPlaceId(req.body.nearby_place_id, parsedDistrictId);
      if (!nearbyPlaceValidation.ok) {
        return res.status(400).json(errorResponse(nearbyPlaceValidation.message));
      }
      hotelData.nearby_place_id = nearbyPlaceValidation.value;
    } else if (districtIdWasProvided && hotel.nearby_place_id) {
      const currentNearbyDistrictId = hotel.nearbyPlace?.district_id;
      if (currentNearbyDistrictId && parseInt(currentNearbyDistrictId, 10) !== parsedDistrictId) {
        hotelData.nearby_place_id = null;
      }
    }

    if (Object.keys(hotelData).length && Object.prototype.hasOwnProperty.call(hotelData, 'image_url')) {
      placeData.image_url = hotelData.image_url;
    }

    if (Object.keys(placeData).length) await hotel.place.update(placeData);
    if (Object.keys(hotelData).length) await hotel.update(hotelData);

    const updatedRow = await Hotel.findByPk(req.params.id, { include: hotelIncludes });
    const updated = withLegacyPlaceImages(updatedRow);
    res.status(200).json(successResponse(updated, 'Hotel updated successfully'));
  } catch (error) { next(error); }
};

// @desc    Delete hotel  @route DELETE /api/hotels/:id  @access Private/Admin
// Deletes both the Hotel record AND its dedicated Place record (+ cascaded images, tags, reviews, price_records).
// Blocked with 409 if the hotel is referenced in any trip plans.
exports.deleteHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findByPk(req.params.id);
    if (!hotel) return res.status(404).json(errorResponse('Hotel not found'));

    const placeId = hotel.place_id;

    // Block deletion if this hotel's place is referenced by any trip plans.
    const tripPlanCount = await TripItinerary.count({ where: { hotel_place_id: placeId } });
    if (tripPlanCount > 0) {
      return res.status(409).json(
        errorResponse(`Cannot delete: this hotel is booked in ${tripPlanCount} trip plan(s). Remove it from all trip plans first.`)
      );
    }

    // Delete Hotel first (removes the FK reference so Place can be safely deleted)
    await hotel.destroy();

    // Delete Place — DB CASCADE handles images, tags, reviews, and price_records automatically;
    // itinerary_items and recommendation_logs use ON DELETE SET NULL so they are preserved.
    await Place.destroy({ where: { place_id: placeId } });

    res.status(200).json(successResponse(null, 'Hotel deleted successfully'));
  } catch (error) { next(error); }
};

// @desc    Get hotels by district  @route GET /api/hotels/district/:districtId  @access Public
exports.getHotelsByDistrict = async (req, res, next) => {
  try {
    const districtId = parseInt(req.params.districtId, 10);
    if (isNaN(districtId)) return res.status(400).json({ success: false, message: 'Invalid district ID' });
    const hotelRows = await Hotel.findAll({
      include: [{ ...placeInclude, where: { isActive: true, district_id: districtId }, required: true }, nearbyPlaceInclude],
      order: [['rating', 'DESC']],
    });
    const hotels = hotelRows.map(withLegacyPlaceImages);
    res.status(200).json({ success: true, count: hotels.length, data: hotels });
  } catch (error) { next(error); }
};

// Haversine distance in km
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// @desc    Get recommended hotels for a trip  @route GET /api/hotels/recommended  @access Public
exports.getRecommendedHotels = async (req, res, next) => {
  try {
    const districtId = parseInt(req.query.district_id, 10);
    if (isNaN(districtId)) {
      return res.status(400).json(errorResponse('district_id query param is required'));
    }

    // Fetch all active hotels in the district
    const hotelRows = await Hotel.findAll({
      include: [{ ...placeInclude, where: { isActive: true, district_id: districtId }, required: true }, nearbyPlaceInclude],
      order: [['rating', 'DESC']],
    });
    const hotels = hotelRows.map(withLegacyPlaceImages);

    if (!hotels.length) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    // Build centroid from selected place IDs (optional)
    let centroidLat = null;
    let centroidLng = null;
    const rawPlaceIds = req.query.selected_place_ids;
    if (rawPlaceIds) {
      const placeIds = String(rawPlaceIds).split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      if (placeIds.length) {
        const places = await Place.findAll({
          where: { place_id: { [Op.in]: placeIds } },
          attributes: ['lat', 'lng'],
        });
        const validPlaces = places.filter(p => p.lat != null && p.lng != null);
        if (validPlaces.length) {
          centroidLat = validPlaces.reduce((s, p) => s + parseFloat(p.lat), 0) / validPlaces.length;
          centroidLng = validPlaces.reduce((s, p) => s + parseFloat(p.lng), 0) / validPlaces.length;
        }
      }
    }

    // Parse budget — convert from user currency to LKR
    const LKR_RATES = { LKR: 1, USD: 0.0031, EUR: 0.0029 };
    const currency  = (req.query.currency || 'LKR').toUpperCase();
    const rate      = LKR_RATES[currency] || 1;
    const budgetLKR = req.query.hotel_budget ? Number(req.query.hotel_budget) / rate : 0;

    const context = {
      centroidLat,
      centroidLng,
      hotelType:  req.query.hotel_type  || null,
      budgetLKR,
      nights:     parseInt(req.query.nights, 10) || 1,
    };

    const scored = scoreHotels(hotels, context);
    res.status(200).json({ success: true, count: scored.length, data: scored });
  } catch (error) { next(error); }
};

// @desc    Get hotels near coordinates  @route GET /api/hotels/near  @access Public
exports.getHotelsNear = async (req, res, next) => {
  try {
    const lat      = parseFloat(req.query.lat);
    const lng      = parseFloat(req.query.lng);
    const radius   = parseFloat(req.query.radius) || 25; // km
    const districtId = req.query.district_id;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json(errorResponse('lat and lng query params are required'));
    }

    const placeWhere = { isActive: true };
    if (districtId) placeWhere.district_id = parseInt(districtId, 10);

    const allHotelRows = await Hotel.findAll({
      include: [{ ...placeInclude, where: placeWhere, required: true }, nearbyPlaceInclude],
      order: [['rating', 'DESC']],
    });
    const allHotels = allHotelRows.map(withLegacyPlaceImages);

    // Annotate each hotel with distance from the target point
    const withDist = allHotels.map(h => {
      const hLat = parseFloat(h.place?.lat);
      const hLng = parseFloat(h.place?.lng);
      const dist = (!isNaN(hLat) && !isNaN(hLng)) ? haversineKm(lat, lng, hLat, hLng) : null;
      return { hotel: h, dist };
    });

    // Hotels within radius, sorted nearest first
    const nearby = withDist
      .filter(({ dist }) => dist !== null && dist <= radius)
      .sort((a, b) => a.dist - b.dist)
      .map(({ hotel }) => hotel);

    // Fallback: if nothing within radius, return all district hotels rated-first
    const result = nearby.length > 0 ? nearby : allHotels;

    res.status(200).json({ success: true, count: result.length, data: result });
  } catch (error) { next(error); }
};

