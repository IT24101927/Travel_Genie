const { Op } = require('sequelize');
const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../../../utils/helpers');

// @desc    Get notifications for the logged-in user
// @route   GET /api/notifications
exports.getMyNotifications = async (req, res, next) => {
  try {
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
    const { user_id, trip_id, type, message } = req.body;
    const notif = await Notification.create({ user_id, trip_id, type, message });
    res.status(201).json(successResponse(notif, 'Notification created'));
  } catch (error) { next(error); }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
exports.remove = async (req, res, next) => {
  try {
    const notif = await Notification.findOne({
      where: { notification_id: req.params.id, user_id: req.user.id },
    });
    if (!notif) return res.status(404).json(errorResponse('Notification not found'));
    await notif.destroy();
    res.status(200).json(successResponse(null, 'Notification deleted'));
  } catch (error) { next(error); }
};
