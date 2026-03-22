const PriceRecord = require('../models/PriceRecord');
const Place = require('../../placeManagement/models/Place');
const { successResponse, errorResponse } = require('../../../utils/helpers');

// @desc    Get price records for a place
// @route   GET /api/price-records/place/:placeId
exports.getByPlace = async (req, res, next) => {
  try {
    const records = await PriceRecord.findAll({
      where: { place_id: req.params.placeId },
      order: [['recorded_at', 'DESC']],
      include: [{ model: Place, as: 'place', attributes: ['place_id', 'name'] }],
    });
    res.status(200).json(successResponse(records, 'Price records fetched'));
  } catch (error) { next(error); }
};

// @desc    Create a price record
// @route   POST /api/price-records
exports.create = async (req, res, next) => {
  try {
    const { place_id, item_type, price } = req.body;
    const record = await PriceRecord.create({ place_id, item_type, price });
    res.status(201).json(successResponse(record, 'Price record created'));
  } catch (error) { next(error); }
};

// @desc    Get all price records
// @route   GET /api/price-records
exports.getAll = async (req, res, next) => {
  try {
    const records = await PriceRecord.findAll({
      order: [['recorded_at', 'DESC']],
      limit: parseInt(req.query.limit) || 100,
      include: [{ model: Place, as: 'place', attributes: ['place_id', 'name'] }],
    });
    res.status(200).json(successResponse(records, 'Price records fetched'));
  } catch (error) { next(error); }
};

// @desc    Delete a price record
// @route   DELETE /api/price-records/:id
exports.remove = async (req, res, next) => {
  try {
    const record = await PriceRecord.findByPk(req.params.id);
    if (!record) return res.status(404).json(errorResponse('Price record not found'));
    await record.destroy();
    res.status(200).json(successResponse(null, 'Price record deleted'));
  } catch (error) { next(error); }
};
