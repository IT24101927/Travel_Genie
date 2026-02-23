const { Op, fn, col, literal } = require('sequelize');
const Expense = require('../models/Expense');
const TripItinerary = require('../../tripItineraryManagement/models/TripItinerary');
const User = require('../../userManagement/models/User');
const { successResponse, errorResponse } = require('../../../utils/helpers');

const expenseIncludes = [
  { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
  { model: User, as: 'paidBy', attributes: ['id', 'name', 'email'] },
];

// @desc    Get all expenses for a trip  @route GET /api/expenses/trip/:tripId  @access Private
exports.getExpensesByTrip = async (req, res, next) => {
  try {
    const trip = await TripItinerary.findByPk(req.params.tripId);
    if (!trip) return res.status(404).json(errorResponse('Trip not found'));

    const isOwner = trip.userId === req.user.id;
    const isShared = Array.isArray(trip.sharedWith) && trip.sharedWith.includes(req.user.id);
    if (!isOwner && !isShared)
      return res.status(403).json(errorResponse('Not authorized to access these expenses'));

    const expenses = await Expense.findAll({
      where: { tripId: req.params.tripId },
      include: expenseIncludes,
      order: [['date', 'DESC']],
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Group by category
    const { sequelize } = require('../../../config/database');
    const expensesByCategory = await sequelize.query(
      'SELECT category, SUM(amount) AS total, COUNT(*) AS count FROM expenses WHERE "tripId" = :tripId GROUP BY category',
      { replacements: { tripId: req.params.tripId }, type: sequelize.QueryTypes.SELECT }
    );

    res.status(200).json({
      success: true, count: expenses.length, totalExpenses, expensesByCategory, data: expenses,
    });
  } catch (error) { next(error); }
};

// @desc    Admin: Get all expenses for all users  @route GET /api/expenses/admin  @access Private/Admin
exports.getAllExpensesAdmin = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.category) where.category = req.query.category;
    if (req.query.status) where.status = req.query.status;
    if (req.query.userId) where.userId = req.query.userId;

    const { count: total, rows: expenses } = await Expense.findAndCountAll({
      where,
      include: [
        { model: TripItinerary, as: 'trip', attributes: ['id', 'title'] },
        ...expenseIncludes,
      ],
      offset, limit, order: [['date', 'DESC']],
    });

    res.status(200).json({
      success: true, count: expenses.length, total, page,
      pages: Math.ceil(total / limit), data: expenses,
    });
  } catch (error) { next(error); }
};

// @desc    Get all expenses for logged-in user  @route GET /api/expenses  @access Private
exports.getAllExpenses = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const where = { userId: req.user.id };
    if (req.query.category) where.category = req.query.category;
    if (req.query.startDate || req.query.endDate) {
      where.date = {};
      if (req.query.startDate) where.date[Op.gte] = new Date(req.query.startDate);
      if (req.query.endDate) where.date[Op.lte] = new Date(req.query.endDate);
    }

    const { count: total, rows: expenses } = await Expense.findAndCountAll({
      where,
      include: [
        { model: TripItinerary, as: 'trip', attributes: ['id', 'title'] },
        ...expenseIncludes,
      ],
      offset, limit, order: [['date', 'DESC']],
    });

    res.status(200).json({
      success: true, count: expenses.length, total, page,
      pages: Math.ceil(total / limit), data: expenses,
    });
  } catch (error) { next(error); }
};

// @desc    Get single expense  @route GET /api/expenses/:id  @access Private
exports.getExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByPk(req.params.id, {
      include: [
        { model: TripItinerary, as: 'trip', attributes: ['id', 'title'] },
        ...expenseIncludes,
      ],
    });
    if (!expense) return res.status(404).json(errorResponse('Expense not found'));
    if (expense.userId !== req.user.id)
      return res.status(403).json(errorResponse('Not authorized to access this expense'));
    res.status(200).json(successResponse(expense, 'Expense fetched successfully'));
  } catch (error) { next(error); }
};

// @desc    Create new expense  @route POST /api/expenses  @access Private
exports.createExpense = async (req, res, next) => {
  try {
    req.body.userId = req.user.id;
    req.body.paidById = req.body.paidById || req.user.id;

    const trip = await TripItinerary.findByPk(req.body.tripId || req.body.trip);
    if (!trip) return res.status(404).json(errorResponse('Trip not found'));

    const isOwner = trip.userId === req.user.id;
    const isShared = Array.isArray(trip.sharedWith) && trip.sharedWith.includes(req.user.id);
    if (!isOwner && !isShared)
      return res.status(403).json(errorResponse('Not authorized to add expenses to this trip'));

    // Normalize tripId
    req.body.tripId = trip.id;
    delete req.body.trip;

    const expense = await Expense.create(req.body);
    const populated = await Expense.findByPk(expense.id, {
      include: [
        { model: TripItinerary, as: 'trip', attributes: ['id', 'title'] },
        ...expenseIncludes,
      ],
    });
    res.status(201).json(successResponse(populated, 'Expense created successfully'));
  } catch (error) { next(error); }
};

// @desc    Update expense  @route PUT /api/expenses/:id  @access Private
exports.updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json(errorResponse('Expense not found'));
    if (expense.userId !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json(errorResponse('Not authorized to update this expense'));

    await expense.update(req.body);
    const updated = await Expense.findByPk(expense.id, {
      include: [
        { model: TripItinerary, as: 'trip', attributes: ['id', 'title'] },
        ...expenseIncludes,
      ],
    });
    res.status(200).json(successResponse(updated, 'Expense updated successfully'));
  } catch (error) { next(error); }
};

// @desc    Delete expense  @route DELETE /api/expenses/:id  @access Private
exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json(errorResponse('Expense not found'));
    if (expense.userId !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json(errorResponse('Not authorized to delete this expense'));
    await expense.destroy();
    res.status(200).json(successResponse(null, 'Expense deleted successfully'));
  } catch (error) { next(error); }
};

// @desc    Get expense statistics  @route GET /api/expenses/stats  @access Private
exports.getExpenseStats = async (req, res, next) => {
  try {
    const { tripId, startDate, endDate } = req.query;
    const { sequelize } = require('../../../config/database');

    const where = { userId: req.user.id };
    if (tripId) where.tripId = tripId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[Op.gte] = new Date(startDate);
      if (endDate) where.date[Op.lte] = new Date(endDate);
    }

    const overall = await Expense.findOne({
      where,
      attributes: [
        [fn('SUM', col('amount')), 'totalExpenses'],
        [fn('AVG', col('amount')), 'averageExpense'],
        [fn('COUNT', col('id')), 'expenseCount'],
        [fn('MAX', col('amount')), 'maxExpense'],
        [fn('MIN', col('amount')), 'minExpense'],
      ],
      raw: true,
    });

    const byCategory = await Expense.findAll({
      where,
      attributes: [
        'category',
        [fn('SUM', col('amount')), 'total'],
        [fn('COUNT', col('id')), 'count'],
        [fn('AVG', col('amount')), 'average'],
      ],
      group: ['category'],
      order: [[fn('SUM', col('amount')), 'DESC']],
      raw: true,
    });

    res.status(200).json({ success: true, data: { overall: overall || {}, byCategory } });
  } catch (error) { next(error); }
};
