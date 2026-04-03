const { Op } = require('sequelize');
const Notification = require('../models/Notification');
const Expense = require('../../expenseManagement/models/Expense');
const TripItinerary = require('../../tripItineraryManagement/models/TripItinerary');
const { successResponse, errorResponse } = require('../../../utils/helpers');
const { sendNotificationEmailIfEnabled } = require('../../../utils/notificationEmail');

const CURRENCY_TO_LKR = { LKR: 1, USD: 1 / 0.0033, EUR: 1 / 0.0031 };
const toLkr = (amount, currency) => {
  const code = String(currency || 'LKR').toUpperCase();
  const rate = CURRENCY_TO_LKR[code] || 1;
  return (Number(amount) || 0) * rate;
};

const ensureAutoBudgetAlertsForUser = async (userId) => {
  if (!userId) return;

  const trips = await TripItinerary.findAll({
    where: { user_id: userId },
    attributes: ['trip_id', 'title', 'total_budget', 'budget_currency'],
  });
  if (!trips.length) return;

  const tripIds = trips.map((t) => Number(t.trip_id)).filter((id) => Number.isInteger(id) && id > 0);
  if (!tripIds.length) return;

  const expenses = await Expense.findAll({
    where: {
      user_id: userId,
      trip_id: { [Op.in]: tripIds },
      expense_type: 'ACTUAL',
    },
    attributes: ['trip_id', 'amount', 'currency'],
  });

  const spentByTrip = new Map();
  expenses.forEach((e) => {
    const tripId = Number(e.trip_id);
    if (!tripId) return;
    const current = spentByTrip.get(tripId) || 0;
    spentByTrip.set(tripId, current + toLkr(e.amount, e.currency || 'LKR'));
  });

  const existing = await Notification.findAll({
    where: {
      user_id: userId,
      type: 'BUDGET_100',
      trip_id: { [Op.in]: tripIds },
    },
    attributes: ['trip_id'],
  });
  const alreadyAlertedTripIds = new Set(existing.map((n) => Number(n.trip_id)).filter(Boolean));

  for (const trip of trips) {
    const tripId = Number(trip.trip_id);
    if (!tripId || alreadyAlertedTripIds.has(tripId)) continue;

    const budgetLkr = toLkr(trip.total_budget, trip.budget_currency || 'LKR');
    if (budgetLkr <= 0) continue;

    const spentLkr = spentByTrip.get(tripId) || 0;
    const usagePct = (spentLkr / budgetLkr) * 100;
    if (usagePct < 100) continue;

    const message = `Budget alert: You have used ${Math.round(usagePct)}% of your planned trip budget for ${trip.title || `Trip #${tripId}`}. Please review your expenses.`;
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
  }
};

// @desc    Get notifications for the logged-in user
// @route   GET /api/notifications
exports.getMyNotifications = async (req, res, next) => {
  try {
    await ensureAutoBudgetAlertsForUser(req.user.id);

    const notifications = await Notification.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
      limit: parseInt(req.query.limit) || 50,
    });
    const unreadCount = await Notification.count({
      where: { user_id: req.user.id, is_read: false },
    });
    res.status(200).json({ success: true, data: notifications, unreadCount });
  } catch (error) { next(error); }
};

// @desc    Get users with existing auto budget alerts (admin)
// @route   GET /api/notifications/admin/budget-auto-status?user_ids=1,2,3
exports.getBudgetAutoStatus = async (req, res, next) => {
  try {
    const rawIds = String(req.query.user_ids || '')
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isInteger(n) && n > 0);

    if (!rawIds.length) {
      return res.status(200).json(successResponse([], 'No user ids provided'));
    }

    const rows = await Notification.findAll({
      where: {
        user_id: { [Op.in]: rawIds },
        type: 'BUDGET_100',
      },
      attributes: ['user_id'],
      group: ['user_id'],
    });

    const userIds = rows.map((r) => Number(r.user_id)).filter(Boolean);
    res.status(200).json(successResponse(userIds, 'Budget auto status fetched'));
  } catch (error) { next(error); }
};

// @desc    Get notifications linked to expenses (admin)
// @route   GET /api/notifications/admin/expense-alert-status?expense_ids=1,2,3
exports.getExpenseAlertStatus = async (req, res, next) => {
  try {
    const rawIds = String(req.query.expense_ids || '')
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isInteger(n) && n > 0);

    const rawTripIds = String(req.query.trip_ids || '')
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isInteger(n) && n > 0);

    const rawUserIds = String(req.query.user_ids || '')
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isInteger(n) && n > 0);

    if (!rawIds.length && !rawTripIds.length && !rawUserIds.length) {
      return res.status(200).json(successResponse([], 'No expense context provided'));
    }

    const orClauses = [];
    if (rawIds.length) {
      orClauses.push({ expense_id: { [Op.in]: rawIds } });
    }

    // Legacy fallback: older alerts may not have expense_id but still have user/trip.
    if (rawTripIds.length && rawUserIds.length) {
      orClauses.push({
        expense_id: null,
        trip_id: { [Op.in]: rawTripIds },
        user_id: { [Op.in]: rawUserIds },
      });
    }

    const rows = await Notification.findAll({
      where: {
        type: 'PRICE_CHANGE',
        [Op.or]: orClauses,
      },
      attributes: ['notification_id', 'expense_id', 'user_id', 'trip_id', 'type', 'message', 'is_read', 'created_at'],
      order: [['created_at', 'DESC']],
    });

    const latestByExpense = new Map();
    rows.forEach((row) => {
      const expenseId = Number(row.expense_id);
      if (!expenseId || latestByExpense.has(expenseId)) return;
      latestByExpense.set(expenseId, row);
    });

    res.status(200).json(successResponse(Array.from(latestByExpense.values()), 'Expense alert status fetched'));
  } catch (error) { next(error); }
};

// @desc    Get sent expense alert history (admin)
// @route   GET /api/notifications/admin/expense-alert-history?limit=100
exports.getExpenseAlertHistory = async (req, res, next) => {
  try {
    const reqLimit = parseInt(req.query.limit, 10);
    const limit = Number.isInteger(reqLimit) && reqLimit > 0 ? Math.min(reqLimit, 500) : 100;

    const rows = await Notification.findAll({
      where: {
        type: { [Op.in]: ['PRICE_CHANGE', 'BUDGET_80', 'BUDGET_100'] },
      },
      attributes: ['notification_id', 'expense_id', 'user_id', 'trip_id', 'type', 'message', 'is_read', 'created_at'],
      order: [['created_at', 'DESC']],
      limit,
    });

    res.status(200).json(successResponse(rows, 'Alert history fetched'));
  } catch (error) { next(error); }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
exports.markRead = async (req, res, next) => {
  try {
    const notif = await Notification.findOne({
      where: { notification_id: req.params.id, user_id: req.user.id },
    });
    if (!notif) return res.status(404).json(errorResponse('Notification not found'));
    notif.is_read = true;
    await notif.save();
    res.status(200).json(successResponse(notif, 'Marked as read'));
  } catch (error) { next(error); }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.update(
      { is_read: true },
      { where: { user_id: req.user.id, is_read: false } }
    );
    res.status(200).json(successResponse(null, 'All notifications marked as read'));
  } catch (error) { next(error); }
};

// @desc    Create a notification (admin or system)
// @route   POST /api/notifications
exports.create = async (req, res, next) => {
  try {
    const { user_id, trip_id, expense_id, type, message } = req.body;
    const notif = await Notification.create({ user_id, trip_id, expense_id, type, message });
    await sendNotificationEmailIfEnabled({ userId: user_id, type, message });
    res.status(201).json(successResponse(notif, 'Notification created'));
  } catch (error) { next(error); }
};

// @desc    Get one notification
// @route   GET /api/notifications/:id
exports.getOne = async (req, res, next) => {
  try {
    const where = { notification_id: req.params.id };
    if (req.user.role !== 'admin') where.user_id = req.user.id;

    const notif = await Notification.findOne({ where });
    if (!notif) return res.status(404).json(errorResponse('Notification not found'));
    res.status(200).json(successResponse(notif, 'Notification fetched'));
  } catch (error) { next(error); }
};

// @desc    Update a notification (admin or owner)
// @route   PUT /api/notifications/:id
exports.update = async (req, res, next) => {
  try {
    const where = { notification_id: req.params.id };
    if (req.user.role !== 'admin') where.user_id = req.user.id;

    const notif = await Notification.findOne({ where });
    if (!notif) return res.status(404).json(errorResponse('Notification not found'));

    const allowed = ['message', 'type', 'trip_id', 'expense_id', 'is_read'];
    const payload = {};
    allowed.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) payload[key] = req.body[key];
    });

    await notif.update(payload);
    res.status(200).json(successResponse(notif, 'Notification updated'));
  } catch (error) { next(error); }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
exports.remove = async (req, res, next) => {
  try {
    const where = { notification_id: req.params.id };
    if (req.user.role !== 'admin') where.user_id = req.user.id;

    const notif = await Notification.findOne({ where });
    if (!notif) return res.status(404).json(errorResponse('Notification not found'));
    await notif.destroy();
    res.status(200).json(successResponse(null, 'Notification deleted'));
  } catch (error) { next(error); }
};
