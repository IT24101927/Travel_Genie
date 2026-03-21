const router = require('express').Router();
const { protect } = require('../../../middleware/auth');
const ctrl = require('../controllers/itemReactionController');

router.post('/', protect, ctrl.toggleReaction);
router.get('/item/:itemId', protect, ctrl.getByItem);
router.get('/item/:itemId/me', protect, ctrl.getMyReaction);

module.exports = router;
