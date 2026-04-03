const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../../middleware/auth');
const { getAllTags, createTag, updateTag, deleteTag, assignTagsToPlace } = require('../controllers/tagController');
const {
	positiveIntParam,
	requireFields,
	requireAtLeastOneField,
	enumField,
} = require('../../../middleware/requestValidation');

router.get('/',                    getAllTags);
router.post('/',                   protect, authorize('admin'), requireFields(['tag_name', 'tag_type']), enumField('tag_type', ['INTEREST', 'ACTIVITY', 'CLIMATE', 'ATTRACTION', 'AMENITY', 'HOTEL_TYPE'], { required: true }), createTag);
router.put('/:id',                 protect, authorize('admin'), positiveIntParam('id'), requireAtLeastOneField(['tag_name', 'tag_type']), enumField('tag_type', ['INTEREST', 'ACTIVITY', 'CLIMATE', 'ATTRACTION', 'AMENITY', 'HOTEL_TYPE']), updateTag);
router.delete('/:id',              protect, authorize('admin'), positiveIntParam('id'), deleteTag);
router.post('/place/:placeId',     protect, authorize('admin'), positiveIntParam('placeId', 'placeId'), requireFields(['tags']), assignTagsToPlace);

module.exports = router;
