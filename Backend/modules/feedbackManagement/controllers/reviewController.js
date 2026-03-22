const { Op } = require('sequelize');
const Review = require('../models/Review');
const RecommendationLog = require('../models/RecommendationLog');
const Place = require('../../placeManagement/models/Place');
const District = require('../../placeManagement/models/District');
const User = require('../../userManagement/models/User');
const { successResponse, errorResponse } = require('../../../utils/helpers');

const reviewIncludes = [
  { model: User, as: 'user', attributes: ['id', 'name', 'email', 'avatar'] },
  {
    model: Place, as: 'place',
    attributes: ['place_id', 'name', 'lat', 'lng'],
    include: [{ model: District, as: 'district', attributes: ['name', 'province'] }],
  },
];

// @desc    Admin: Get ALL reviews  @route GET /api/reviews/admin  @access Private/Admin
exports.getAllReviewsAdmin = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.place_id) where.place_id = req.query.place_id;
    if (req.query.rating) where.rating = parseInt(req.query.rating);
    if (req.query.is_flagged) where.is_flagged = req.query.is_flagged === 'true';

    const { count: total, rows: reviews } = await Review.findAndCountAll({
      where, include: reviewIncludes, offset, limit,
      order: [['createdAt', 'DESC']], distinct: true,
    });
    res.status(200).json({ success: true, count: reviews.length, total, page, pages: Math.ceil(total / limit), data: reviews });
  } catch (error) { next(error); }
};

// @desc    Get all approved reviews  @route GET /api/reviews  @access Public
exports.getAllReviews = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const where = { status: 'approved' };
    if (req.query.place_id) where.place_id = req.query.place_id;
    if (req.query.rating)   where.rating   = parseInt(req.query.rating);

    const { count: total, rows: reviews } = await Review.findAndCountAll({
      where, include: reviewIncludes, offset, limit,
      order: [['createdAt', 'DESC']], distinct: true,
    });
    res.status(200).json({ success: true, count: reviews.length, total, page, pages: Math.ceil(total / limit), data: reviews });
  } catch (error) { next(error); }
};

// @desc    Get reviews for a specific place  @route GET /api/reviews/place/:placeId  @access Public
exports.getReviewsByPlace = async (req, res, next) => {
  try {
    const reviews = await Review.findAll({
      where: { place_id: req.params.placeId, status: 'approved' },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatar'] }],
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (error) { next(error); }
};

// @desc    Get single review  @route GET /api/reviews/:id  @access Public
exports.getReview = async (req, res, next) => {
  try {
    const review = await Review.findByPk(req.params.id, { include: reviewIncludes });
    if (!review) return res.status(404).json(errorResponse('Review not found'));
    res.status(200).json(successResponse(review, 'Review fetched successfully'));
  } catch (error) { next(error); }
};

// @desc    Get current user's reviews  @route GET /api/reviews/my  @access Private
exports.getMyReviews = async (req, res, next) => {
  try {
    const reviews = await Review.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: Place, as: 'place',
          attributes: ['place_id', 'name'],
          include: [{ model: District, as: 'district', attributes: ['name'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (error) { next(error); }
};

// @desc    Create new review  @route POST /api/reviews  @access Private
// Body: { place_id, rating, comment, title?, visit_date?, travel_type?, images? }
exports.createReview = async (req, res, next) => {
  try {
    req.body.user_id = req.user.id;

    const place = await Place.findByPk(req.body.place_id);
    if (!place) return res.status(404).json(errorResponse('Place not found'));

    // Prevent duplicate reviews
    const existing = await Review.findOne({ where: { user_id: req.user.id, place_id: req.body.place_id } });
    if (existing) return res.status(400).json(errorResponse('You have already reviewed this place'));

    const review = await Review.create(req.body);
    const populated = await Review.findByPk(review.review_id, { include: reviewIncludes });
    res.status(201).json(successResponse(populated, 'Review created successfully'));
  } catch (error) { next(error); }
};

// @desc    Update review  @route PUT /api/reviews/:id  @access Private
exports.updateReview = async (req, res, next) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json(errorResponse('Review not found'));
    if (review.user_id !== req.user.id)
      return res.status(403).json(errorResponse('Not authorized'));
    await review.update(req.body);
    const updated = await Review.findByPk(review.review_id, { include: reviewIncludes });
    res.status(200).json(successResponse(updated, 'Review updated successfully'));
  } catch (error) { next(error); }
};

// @desc    Delete review  @route DELETE /api/reviews/:id  @access Private
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json(errorResponse('Review not found'));
    if (review.user_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json(errorResponse('Not authorized'));
    await review.destroy();
    res.status(200).json(successResponse(null, 'Review deleted successfully'));
  } catch (error) { next(error); }
};

// @desc    Mark review helpful  @route POST /api/reviews/:id/helpful  @access Private
exports.markHelpful = async (req, res, next) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json(errorResponse('Review not found'));

    const helpfulBy = Array.isArray(review.helpful_by) ? review.helpful_by : [];
    if (helpfulBy.includes(req.user.id))
      return res.status(400).json(errorResponse('Already rated'));

    review.helpful += 1;
    review.helpful_by = [...helpfulBy, req.user.id];
    await review.save();
    res.status(200).json(successResponse(review, 'Thank you for your feedback'));
  } catch (error) { next(error); }
};

// @desc    Flag review  @route POST /api/reviews/:id/flag  @access Private
exports.flagReview = async (req, res, next) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json(errorResponse('Review not found'));
    await review.update({ is_flagged: true });
    res.status(200).json(successResponse(null, 'Review flagged'));
  } catch (error) { next(error); }
};

// @desc    Update review status (Admin)  @route PUT /api/reviews/:id/status  @access Private/Admin
exports.updateReviewStatus = async (req, res, next) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json(errorResponse('Review not found'));
    await review.update({ status: req.body.status, is_flagged: false });
    res.status(200).json(successResponse(review, 'Review status updated'));
  } catch (error) { next(error); }
};

// @desc    Add admin response  @route POST /api/reviews/:id/response  @access Private/Admin
exports.addResponse = async (req, res, next) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json(errorResponse('Review not found'));
    review.response = { comment: req.body.comment, respondedBy: req.user.id, respondedAt: new Date() };
    await review.save();
    res.status(200).json(successResponse(review, 'Response added'));
  } catch (error) { next(error); }
};

// ── RecommendationLog ────────────────────────────────────────────────────────

// @desc  Log a recommendation interaction  @route POST /api/reviews/rec-log  @access Private
exports.logRecommendation = async (req, res, next) => {
  try {
    req.body.user_id = req.user.id;
    const log = await RecommendationLog.create(req.body);
    res.status(201).json(successResponse(log, 'Logged'));
  } catch (error) { next(error); }
};

// @desc  Get recommendation logs (admin)  @route GET /api/reviews/rec-log  @access Private/Admin
exports.getRecommendationLogs = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const { count: total, rows: logs } = await RecommendationLog.findAndCountAll({
      include: [
        { model: User,  as: 'user',    attributes: ['id', 'name'] },
        { model: Place, as: 'place',   attributes: ['place_id', 'name'] },
      ],
      offset, limit, order: [['createdAt', 'DESC']],
    });
    res.status(200).json({ success: true, count: logs.length, total, page, pages: Math.ceil(total / limit), data: logs });
  } catch (error) { next(error); }
};

// @desc    Admin: Get ALL reviews with any status  @route GET /api/reviews/admin  @access Private/Admin
