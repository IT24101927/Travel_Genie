const router = require('express').Router();
const { protect, authorize } = require('../../../middleware/auth');
const ctrl = require('../controllers/notificationController');

router.get('/', protect, ctrl.getMyNotifications);
router.put('/read-all', protect, ctrl.markAllRead);
router.put('/:id/read', protect, ctrl.markRead);
router.post('/', protect, authorize('admin'), ctrl.create);
router.delete('/:id', protect, ctrl.remove);

module.exports = router;
