const { Op } = require('sequelize');
const Review = require('../models/Review');
const Destination = require('../../destinationManagement/models/Destination');
const Hotel = require('../../hotelManagement/models/Hotel');
const User = require('../../userManagement/models/User');
const { successResponse, errorResponse } = require('../../../utils/helpers');

const reviewIncludes = [
  { model: User, as: 'user', attributes: ['id', 'name', 'email', 'avatar'] },
  { model: Destination, as: 'destination', attributes: ['id', 'name', 'city', 'country', 'images'] },
  { model: Hotel, as: 'hotel', attributes: ['id', 'name', 'address', 'images'] },
];

// @desc    Admin: Get ALL reviews with any status  @route GET /api/reviews/admin  @access Private/Admin
exports.getAllReviewsAdmin = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.reviewType) where.reviewType = req.query.reviewType;
    if (req.query.rating) where.rating = parseInt(req.query.rating);

    const { count: total, rows: reviews } = await Review.findAndCountAll({
      where, include: reviewIncludes, offset, limit,
      order: [['createdAt', 'DESC']], distinct: true,
    });

    res.status(200).json({
      success: true, count: reviews.length, total, page,
      pages: Math.ceil(total / limit), data: reviews,
    });
  } catch (error) { next(error); }
};

// @desc    Get all reviews  @route GET /api/reviews  @access Public
exports.getAllReviews = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const where = { status: 'approved' };
    if (req.query.reviewType) where.reviewType = req.query.reviewType;
    if (req.query.destination) where.destinationId = req.query.destination;
    if (req.query.hotel) where.hotelId = req.query.hotel;
    if (req.query.rating) where.rating = parseInt(req.query.rating);

    const { count: total, rows: reviews } = await Review.findAndCountAll({
      where, include: reviewIncludes, offset, limit,
      order: [['createdAt', 'DESC']], distinct: true,
    });

    res.status(200).json({
      success: true, count: reviews.length, total, page,
      pages: Math.ceil(total / limit), data: reviews,
    });
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

// @desc    Create new review  @route POST /api/reviews  @access Private
exports.createReview = async (req, res, next) => {
  try {
    req.body.userId = req.user.id;

    if (req.body.reviewType === 'destination' && req.body.destination) {
      const dest = await Destination.findByPk(req.body.destination);
      if (!dest) return res.status(404).json(errorResponse('Destination not found'));
      req.body.destinationId = dest.id;
      delete req.body.destination;
    } else if (req.body.reviewType === 'hotel' && req.body.hotel) {
      const hotel = await Hotel.findByPk(req.body.hotel);
      if (!hotel) return res.status(404).json(errorResponse('Hotel not found'));
      req.body.hotelId = hotel.id;
      delete req.body.hotel;
    } else if (req.body.reviewType === 'trip' && req.body.trip) {
      req.body.tripId = req.body.trip;
      delete req.body.trip;
    }

    // Prevent duplicate reviews
    const dupWhere = { userId: req.user.id, reviewType: req.body.reviewType };
    if (req.body.destinationId) dupWhere.destinationId = req.body.destinationId;
    if (req.body.hotelId) dupWhere.hotelId = req.body.hotelId;
    if (req.body.tripId) dupWhere.tripId = req.body.tripId;

    const existing = await Review.findOne({ where: dupWhere });
    if (existing) return res.status(400).json(errorResponse('You have already reviewed this item'));

    const review = await Review.create(req.body);
    const populated = await Review.findByPk(review.id, { include: reviewIncludes });
    res.status(201).json(successResponse(populated, 'Review created successfully'));
  } catch (error) { next(error); }
};

// @desc    Update review  @route PUT /api/reviews/:id  @access Private
exports.updateReview = async (req, res, next) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json(errorResponse('Review not found'));
    if (review.userId !== req.user.id)
      return res.status(403).json(errorResponse('Not authorized to update this review'));
    await review.update(req.body);
    const updated = await Review.findByPk(review.id, { include: reviewIncludes });
    res.status(200).json(successResponse(updated, 'Review updated successfully'));
  } catch (error) { next(error); }
};

// @desc    Delete review  @route DELETE /api/reviews/:id  @access Private
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json(errorResponse('Review not found'));
    if (review.userId !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json(errorResponse('Not authorized to delete this review'));
    await review.destroy();
    res.status(200).json(successResponse(null, 'Review deleted successfully'));
  } catch (error) { next(error); }
};

// @desc    Mark review helpful  @route POST /api/reviews/:id/helpful  @access Private
exports.markHelpful = async (req, res, next) => {
  try {
    const { helpful } = req.body;
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json(errorResponse('Review not found'));

    const helpfulBy = Array.isArray(review.helpfulBy) ? review.helpfulBy : [];
    if (helpfulBy.includes(req.user.id))
      return res.status(400).json(errorResponse('You have already rated this review'));

    if (helpful) review.helpful += 1;
    else review.notHelpful += 1;
    review.helpfulBy = [...helpfulBy, req.user.id];
    await review.save();

    res.status(200).json(successResponse(review, 'Thank you for your feedback'));
  } catch (error) { next(error); }
};

// @desc    Update review status (Admin)  @route PUT /api/reviews/:id/status  @access Private/Admin
exports.updateReviewStatus = async (req, res, next) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json(errorResponse('Review not found'));
    await review.update({ status: req.body.status });
    res.status(200).json(successResponse(review, 'Review status updated successfully'));
  } catch (error) { next(error); }
};

// @desc    Add response to review (Admin)  @route POST /api/reviews/:id/response  @access Private/Admin
exports.addResponse = async (req, res, next) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json(errorResponse('Review not found'));
    review.response = { comment: req.body.comment, respondedBy: req.user.id, respondedAt: new Date() };
    await review.save();
    res.status(200).json(successResponse(review, 'Response added successfully'));
  } catch (error) { next(error); }
};

// @desc    Get reviews by destination  @route GET /api/reviews/destination/:destinationId  @access Public
exports.getReviewsByDestination = async (req, res, next) => {
  try {
    const reviews = await Review.findAll({
      where: { destinationId: req.params.destinationId, status: 'approved' },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'avatar'] }],
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (error) { next(error); }
};

// @desc    Get reviews by hotel  @route GET /api/reviews/hotel/:hotelId  @access Public
exports.getReviewsByHotel = async (req, res, next) => {
  try {
    const reviews = await Review.findAll({
      where: { hotelId: req.params.hotelId, status: 'approved' },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'avatar'] }],
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (error) { next(error); }
};
