const { Op } = require('sequelize');
const Review = require('../models/Review');
const Place = require('../../placeManagement/models/Place');
const District = require('../../placeManagement/models/District');
const Hotel = require('../../hotelManagement/models/Hotel');
const User = require('../../userManagement/models/User');
const { successResponse, errorResponse } = require('../../../utils/helpers');

const reviewIncludes = [
  { model: User, as: 'user', attributes: ['id', 'name', 'email', 'avatar'] },
  {
    model: Place, as: 'place',
    attributes: ['place_id', 'name', 'lat', 'lng'],
    include: [
      { model: District, as: 'district', attributes: ['name', 'province'] },
      { model: Hotel, as: 'hotels', attributes: ['hotel_id', 'hotel_type'], required: false },
    ],
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

    const where = { status: 'approved', is_flagged: false };
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
      where: { place_id: req.params.placeId, status: 'approved', is_flagged: false },
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
    if (review.status !== 'approved' || review.is_flagged === true) {
      return res.status(404).json(errorResponse('Review not found'));
    }
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
    const placeId = parseInt(req.body.place_id, 10);
    if (!Number.isInteger(placeId) || placeId <= 0) {
      return res.status(400).json(errorResponse('place_id must be a positive integer'));
    }

    const visitDate = req.body.visit_date || null;
    if (visitDate && new Date(visitDate) > new Date()) {
      return res.status(400).json(errorResponse('visit_date cannot be in the future'));
    }

    const payload = {
      user_id: req.user.id,
      place_id: placeId,
      rating: parseInt(req.body.rating, 10),
      title: req.body.title?.trim() || null,
      comment: String(req.body.comment || '').trim(),
      visit_date: visitDate,
      travel_type: req.body.travel_type || null,
      images: Array.isArray(req.body.images) ? req.body.images : [],
      status: 'approved',
    };

    const place = await Place.findByPk(payload.place_id);
    if (!place) return res.status(404).json(errorResponse('Place not found'));

    // Prevent duplicate reviews
    const existing = await Review.findOne({ where: { user_id: req.user.id, place_id: payload.place_id } });
    if (existing) return res.status(400).json(errorResponse('You have already reviewed this place'));

    const review = await Review.create(payload);

    // Keep create successful even if optional eager-loading fails.
    let responseReview = review;
    try {
      const populated = await Review.findByPk(review.review_id, { include: reviewIncludes });
      if (populated) responseReview = populated;
    } catch {
      // Non-blocking: return created row if include mapping fails in some environments.
    }

    res.status(201).json(successResponse(responseReview, 'Review created successfully'));
  } catch (error) { next(error); }
};

// @desc    Update review  @route PUT /api/reviews/:id  @access Private
exports.updateReview = async (req, res, next) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json(errorResponse('Review not found'));
    if (review.user_id !== req.user.id)
      return res.status(403).json(errorResponse('Not authorized'));

    // Whitelist updatable fields to prevent mass assignment of sensitive columns
    // (user_id, place_id, status, is_flagged, helpful, helpful_by, etc.)
    const body = req.body;
    const travelType = body.travel_type || body.travelType || undefined;
    const visitDate  = body.visit_date  || body.visitDate  || undefined;

    if (visitDate && new Date(visitDate) > new Date()) {
      return res.status(400).json(errorResponse('visit_date cannot be in the future'));
    }

    const payload = {};
    if (body.rating      !== undefined) payload.rating      = parseInt(body.rating, 10);
    if (body.title       !== undefined) payload.title       = body.title?.trim() || null;
    if (body.comment     !== undefined) payload.comment     = String(body.comment).trim();
    if (travelType       !== undefined) payload.travel_type = travelType;
    if (visitDate        !== undefined) payload.visit_date  = visitDate || null;
    if (Array.isArray(body.images))     payload.images      = body.images;
    if (body.wouldRecommend !== undefined) payload.wouldRecommend = body.wouldRecommend;
    if (Array.isArray(body.pros))       payload.pros        = body.pros;
    if (Array.isArray(body.cons))       payload.cons        = body.cons;

    await review.update(payload);
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

    const markedHelpful = req.body?.helpful !== false;
    if (markedHelpful) review.helpful += 1;
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

    if (req.user?.role === 'admin') {
      // Admin moderation decision: mark as violation.
      await review.update({ status: 'rejected', is_flagged: true });
      return res.status(200).json(successResponse(null, 'Review flagged by admin'));
    }

    // User report flow: send to moderation queue (pending) instead of hard-flagging immediately.
    await review.update({ status: 'pending' });
    res.status(200).json(successResponse(null, 'Review reported and sent for admin moderation'));
  } catch (error) { next(error); }
};

// @desc    Unflag review  @route POST /api/reviews/:id/unflag  @access Private/Admin
exports.unflagReview = async (req, res, next) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json(errorResponse('Review not found'));
    if (req.user.role !== 'admin' && review.user_id !== req.user.id) {
      return res.status(403).json(errorResponse('Not authorized'));
    }
    // Clearing moderation marks returns the review to public approved state.
    await review.update({ is_flagged: false, status: 'approved' });
    res.status(200).json(successResponse(null, 'Review unflagged'));
  } catch (error) { next(error); }
};

// @desc    Update review status (Admin)  @route PUT /api/reviews/:id/status  @access Private/Admin
exports.updateReviewStatus = async (req, res, next) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json(errorResponse('Review not found'));
    const nextStatus = req.body.status;
    const flaggedByStatus = nextStatus === 'rejected';
    await review.update({ status: nextStatus, is_flagged: flaggedByStatus });
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

// @desc    Admin: Get ALL reviews with any status  @route GET /api/reviews/admin  @access Private/Admin
