const router = require('express').Router();
const { protect, authorize } = require('../../../middleware/auth');
const ctrl = require('../controllers/priceRecordController');

router.get('/', protect, ctrl.getAll);
router.get('/place/:placeId', protect, ctrl.getByPlace);
router.post('/', protect, authorize('admin'), ctrl.create);
router.delete('/:id', protect, authorize('admin'), ctrl.remove);

module.exports = router;
