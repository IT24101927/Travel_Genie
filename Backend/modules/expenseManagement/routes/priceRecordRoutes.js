const router = require('express').Router();
const { protect, authorize } = require('../../../middleware/auth');
const ctrl = require('../controllers/priceRecordController');
const {
	positiveIntParam,
	requireFields,
	enumField,
	numberField,
} = require('../../../middleware/requestValidation');

router.get('/', protect, ctrl.getAll);
router.get('/place/:placeId', protect, positiveIntParam('placeId', 'placeId'), ctrl.getByPlace);
router.post('/', protect, authorize('admin'), requireFields(['place_id', 'item_type', 'price']), enumField('item_type', ['ticket', 'hotel', 'transport'], { required: true }), numberField('price', { required: true, min: 0 }), ctrl.create);
router.delete('/:id', protect, authorize('admin'), positiveIntParam('id'), ctrl.remove);

module.exports = router;
