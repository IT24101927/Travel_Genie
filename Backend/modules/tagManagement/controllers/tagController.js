const Tag = require('../models/Tag');
const PlaceTag = require('../models/PlaceTag');
const Place = require('../../placeManagement/models/Place');
const { successResponse, errorResponse } = require('../../../utils/helpers');

// @desc  Get all tags  @route GET /api/tags  @access Public
exports.getAllTags = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.type) where.tag_type = req.query.type;
    const tags = await Tag.findAll({ where, order: [['tag_name', 'ASC']] });
    res.status(200).json(successResponse(tags, 'Tags fetched successfully'));
  } catch (error) { next(error); }
};

// @desc  Create a tag  @route POST /api/tags  @access Private/Admin
exports.createTag = async (req, res, next) => {
  try {
    const tag = await Tag.create(req.body);
    res.status(201).json(successResponse(tag, 'Tag created successfully'));
  } catch (error) { next(error); }
};

// @desc  Update a tag  @route PUT /api/tags/:id  @access Private/Admin
exports.updateTag = async (req, res, next) => {
  try {
    const tag = await Tag.findByPk(req.params.id);
    if (!tag) return res.status(404).json(errorResponse('Tag not found'));
    await tag.update(req.body);
    res.status(200).json(successResponse(tag, 'Tag updated successfully'));
  } catch (error) { next(error); }
};

// @desc  Delete a tag  @route DELETE /api/tags/:id  @access Private/Admin
exports.deleteTag = async (req, res, next) => {
  try {
    const tag = await Tag.findByPk(req.params.id);
    if (!tag) return res.status(404).json(errorResponse('Tag not found'));
    await tag.destroy();
    res.status(200).json(successResponse(null, 'Tag deleted successfully'));
  } catch (error) { next(error); }
};

// @desc  Assign tags to a place  @route POST /api/tags/place/:placeId  @access Private/Admin
exports.assignTagsToPlace = async (req, res, next) => {
  try {
    const { placeId } = req.params;
    const { tags } = req.body; // [{ tag_id, weight }]
    const place = await Place.findByPk(placeId);
    if (!place) return res.status(404).json(errorResponse('Place not found'));

    // Remove existing tags then re-insert
    await PlaceTag.destroy({ where: { place_id: placeId } });
    if (tags && tags.length > 0) {
      const records = tags.map(t => ({ place_id: parseInt(placeId), tag_id: t.tag_id, weight: t.weight || 1.0 }));
      await PlaceTag.bulkCreate(records);
    }
    res.status(200).json(successResponse(null, 'Tags assigned to place'));
  } catch (error) { next(error); }
};
