const { Op, fn, col } = require('sequelize');
const Expense         = require('../models/Expense');
const ExpenseCategory = require('../models/ExpenseCategory');
const TripItinerary   = require('../../tripItineraryManagement/models/TripItinerary');
const User            = require('../../userManagement/models/User');
const Notification    = require('../../notificationManagement/models/Notification');
const { sendNotificationEmailIfEnabled } = require('../../../utils/notificationEmail');
const { successResponse, errorResponse } = require('../../../utils/helpers');

const CURRENCY_TO_LKR = { LKR: 1, USD: 1 / 0.0033, EUR: 1 / 0.0031 };
const toLKR = (amount, currency) => {
  const code = String(currency || 'LKR').toUpperCase();
  const rate = CURRENCY_TO_LKR[code] || 1;
  return (Number(amount) || 0) * rate;
};

const maybeCreateAutoBudgetAlert = async ({ tripId, userId }) => {
  if (!tripId || !userId) return;

  const trip = await TripItinerary.findByPk(tripId, {
    attributes: ['trip_id', 'title', 'total_budget', 'budget_currency'],
  });
  if (!trip) return;

  const budgetLkr = toLKR(trip.total_budget, trip.budget_currency || 'LKR');
  if (budgetLkr <= 0) return;

  const actualExpenses = await Expense.findAll({
    where: { trip_id: tripId, user_id: userId, expense_type: 'ACTUAL' },
    attributes: ['amount', 'currency'],
  });
  const usedLkr = actualExpenses.reduce(
    (sum, e) => sum + toLKR(e.amount, e.currency || 'LKR'),
    0
  );
  const usagePct = (usedLkr / budgetLkr) * 100;
  if (usagePct < 100) return;

  const alreadySent = await Notification.findOne({
    where: {
      user_id: userId,
      trip_id: tripId,
      type: 'BUDGET_100',
    },
    attributes: ['notification_id', 'created_at'],
  });
  const message = `Budget alert: You have used ${Math.round(usagePct)}% of your planned trip budget for ${trip.title || `Trip #${tripId}`}. Please review your expenses.`;

  if (alreadySent) {
    const createdAt = alreadySent.created_at ? new Date(alreadySent.created_at).getTime() : 0;
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    const shouldSendReminderEmail = !createdAt || (Date.now() - createdAt) >= twentyFourHoursMs;
    if (shouldSendReminderEmail) {
      await sendNotificationEmailIfEnabled({
        userId,
        type: 'BUDGET_100',
        message,
      });
    }
    return;
  }

  await Notification.create({
    user_id: userId,
    trip_id: tripId,
    type: 'BUDGET_100',
    message,
  });

  await sendNotificationEmailIfEnabled({
    userId,
    type: 'BUDGET_100',
    message,
  });
};

// ── Expense Categories ────────────────────────────────────────────────────────

// @desc  Get all categories  @route GET /api/expenses/categories  @access Public
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await ExpenseCategory.findAll();
    res.status(200).json(successResponse(categories, 'Categories fetched'));
  } catch (error) { next(error); }
};

// @desc  Create category  @route POST /api/expenses/categories  @access Admin
exports.createCategory = async (req, res, next) => {
  try {
    const cat = await ExpenseCategory.create(req.body);
    res.status(201).json(successResponse(cat, 'Category created'));
  } catch (error) { next(error); }
};

// ── Expenses ──────────────────────────────────────────────────────────────────

// @desc  Get expenses for a trip  @route GET /api/expenses/trip/:tripId  @access Private
exports.getTripExpenses = async (req, res, next) => {
  try {
    const where = { trip_id: req.params.tripId };
    if (req.query.type) where.expense_type = req.query.type;

    const expenses = await Expense.findAll({
      where,
      include: [
        { model: ExpenseCategory, as: 'category' },
        { model: User, as: 'user', attributes: ['id', 'name'] },
      ],
      order: [['expense_date', 'DESC']],
    });
    res.status(200).json(successResponse(expenses, 'Expenses fetched'));
  } catch (error) { next(error); }
};

// @desc  Get all expenses (admin)  @route GET /api/expenses/admin  @access Private/Admin
exports.getAllExpensesAdmin = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { count: total, rows: expenses } = await Expense.findAndCountAll({
      include: [
        { model: ExpenseCategory, as: 'category' },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: TripItinerary, as: 'tripPlan', attributes: ['trip_id', 'title'] },
      ],
      offset, limit, order: [['expense_date', 'DESC']],
    });
    res.status(200).json({ success: true, count: expenses.length, total, page, pages: Math.ceil(total / limit), data: expenses });
  } catch (error) { next(error); }
};

// @desc  Get all expenses for the logged-in user  @route GET /api/expenses  @access Private
exports.getAllExpenses = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const where = { user_id: req.user.id };
    if (req.query.type) where.expense_type = req.query.type;

    const { count: total, rows: expenses } = await Expense.findAndCountAll({
      where,
      include: [
        { model: ExpenseCategory, as: 'category' },
        { model: TripItinerary, as: 'tripPlan', attributes: ['trip_id', 'title'] },
      ],
      offset, limit, order: [['expense_date', 'DESC']],
    });
    res.status(200).json({ success: true, count: expenses.length, total, page, pages: Math.ceil(total / limit), data: expenses });
  } catch (error) { next(error); }
};

// @desc  Get single expense  @route GET /api/expenses/:id  @access Private
exports.getExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByPk(req.params.id, {
      include: [
        { model: ExpenseCategory, as: 'category' },
        { model: TripItinerary, as: 'tripPlan', attributes: ['trip_id', 'title'] },
        { model: User, as: 'user', attributes: ['id', 'name'] },
      ],
    });
    if (!expense) return res.status(404).json(errorResponse('Expense not found'));
    if (expense.user_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json(errorResponse('Not authorised'));
    res.status(200).json(successResponse(expense, 'Expense fetched'));
  } catch (error) { next(error); }
};

// @desc  Create expense  @route POST /api/expenses  @access Private
exports.createExpense = async (req, res, next) => {
  try {
    req.body.user_id = req.user.id;
    const expense = await Expense.create(req.body);
    await maybeCreateAutoBudgetAlert({
      tripId: expense.trip_id,
      userId: expense.user_id,
    });
    const full = await Expense.findByPk(expense.expense_id, {
      include: [{ model: ExpenseCategory, as: 'category' }],
    });
    res.status(201).json(successResponse(full, 'Expense created'));
  } catch (error) { next(error); }
};

// @desc  Update expense  @route PUT /api/expenses/:id  @access Private
exports.updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json(errorResponse('Expense not found'));
    if (expense.user_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json(errorResponse('Not authorised'));
    await expense.update(req.body);
    await maybeCreateAutoBudgetAlert({
      tripId: expense.trip_id,
      userId: expense.user_id,
    });
    // Re-fetch with category so the response mirrors createExpense
    const full = await Expense.findByPk(expense.expense_id, {
      include: [{ model: ExpenseCategory, as: 'category' }],
    });
    res.status(200).json(successResponse(full, 'Expense updated'));
  } catch (error) { next(error); }
};

// @desc  Delete expense  @route DELETE /api/expenses/:id  @access Private
exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json(errorResponse('Expense not found'));
    if (expense.user_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json(errorResponse('Not authorised'));
    await expense.destroy();
    res.status(200).json(successResponse(null, 'Expense deleted'));
  } catch (error) { next(error); }
};

// @desc  Get expense summary for a trip  @route GET /api/expenses/trip/:tripId/summary  @access Private
exports.getTripExpenseSummary = async (req, res, next) => {
  try {
    const { sequelize } = require('../../../config/database');
    const summary = await sequelize.query(
      `SELECT
         ec.category_name,
         e.expense_type,
         SUM(e.amount) AS total,
         COUNT(*) AS count
       FROM expenses e
       LEFT JOIN expense_categories ec ON e.category_id = ec.category_id
       WHERE e.trip_id = :tripId
       GROUP BY ec.category_name, e.expense_type
       ORDER BY total DESC`,
      { replacements: { tripId: req.params.tripId }, type: sequelize.QueryTypes.SELECT }
    );
    res.status(200).json(successResponse(summary, 'Summary fetched'));
  } catch (error) { next(error); }
};

// @desc  Get expense statistics for the current user  @route GET /api/expenses/stats  @access Private
exports.getExpenseStats = async (req, res, next) => {
  try {
    const overall = await Expense.findOne({
      where: { user_id: req.user.id },
      attributes: [
        [fn('SUM', col('amount')), 'totalExpenses'],
        [fn('AVG', col('amount')), 'averageExpense'],
        [fn('COUNT', col('expense_id')), 'expenseCount'],
      ],
      raw: true,
    });
    res.status(200).json(successResponse({ overall: overall || {} }, 'Stats fetched'));
  } catch (error) { next(error); }
};
