const router = require('express').Router();
const { protect, authorize } = require('../../../middleware/auth');
const ctrl = require('../controllers/notificationController');
const {
	positiveIntParam,
	requireFields,
	requireAtLeastOneField,
	enumField,
} = require('../../../middleware/requestValidation');

router.get('/', protect, ctrl.getMyNotifications);
router.get('/admin/budget-auto-status', protect, authorize('admin'), ctrl.getBudgetAutoStatus);
router.get('/admin/expense-alert-status', protect, authorize('admin'), ctrl.getExpenseAlertStatus);
router.get('/admin/expense-alert-history', protect, authorize('admin'), ctrl.getExpenseAlertHistory);
router.get('/:id', protect, positiveIntParam('id'), ctrl.getOne);
router.put('/read-all', protect, ctrl.markAllRead);
router.put('/:id/read', protect, positiveIntParam('id'), ctrl.markRead);
router.put('/:id', protect, positiveIntParam('id'), requireAtLeastOneField(['message', 'type', 'trip_id', 'expense_id', 'is_read']), enumField('type', ['BUDGET_80', 'BUDGET_100', 'PRICE_CHANGE']), ctrl.update);
router.post('/', protect, authorize('admin'), requireFields(['user_id', 'type', 'message']), enumField('type', ['BUDGET_80', 'BUDGET_100', 'PRICE_CHANGE'], { required: true }), ctrl.create);
router.delete('/:id', protect, positiveIntParam('id'), ctrl.remove);

module.exports = router;
