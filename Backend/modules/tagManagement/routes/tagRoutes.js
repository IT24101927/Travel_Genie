const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../../middleware/auth');
const { getAllTags, createTag, updateTag, deleteTag, assignTagsToPlace } = require('../controllers/tagController');

router.get('/',                    getAllTags);
router.post('/',                   protect, authorize('admin'), createTag);
router.put('/:id',                 protect, authorize('admin'), updateTag);
router.delete('/:id',              protect, authorize('admin'), deleteTag);
router.post('/place/:placeId',     protect, authorize('admin'), assignTagsToPlace);

module.exports = router;
