const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../../middleware/auth');
const upload = require('../../../middleware/upload');
const {
  positiveIntParam,
  requireFields,
  requireAtLeastOneField,
} = require('../../../middleware/requestValidation');
const {
  getAllDistricts,
  getDistrict,
  createDistrict,
  updateDistrict,
  deleteDistrict,
  uploadDistrictImage,
  getAllPlaces,
  getPlace,
  createPlace,
  updatePlace,
  deletePlace,
  searchPlaces,
  uploadPlaceImages,
  getPlaceImages,
  deletePlaceImage,
  addPlaceImageByUrl,
} = require('../controllers/placeController');

// District routes
router.get('/districts',                getAllDistricts);           // public (users + admin both need it)
router.get('/districts/:id',            positiveIntParam('id'), getDistrict);
router.post('/districts',               protect, authorize('admin'), requireFields(['name']), createDistrict);
router.put('/districts/:id',            protect, authorize('admin'), positiveIntParam('id'), requireAtLeastOneField(['name', 'province', 'description', 'highlights', 'best_for', 'image_url']), updateDistrict);
router.delete('/districts/:id',         protect, authorize('admin'), positiveIntParam('id'), deleteDistrict);
router.post('/districts/:id/image',     protect, authorize('admin'), positiveIntParam('id'), upload.single('image'), uploadDistrictImage);

// Place routes
router.get('/places/search',      searchPlaces);
router.get('/places',             getAllPlaces);
router.get('/places/:id',         positiveIntParam('id'), getPlace);
router.post('/places',            protect, authorize('admin'), requireFields(['name', 'district_id']), createPlace);
router.put('/places/:id',         protect, authorize('admin'), positiveIntParam('id'), requireAtLeastOneField(['name', 'district_id', 'description', 'address_text', 'image_url', 'lat', 'lng', 'isActive', 'type', 'duration']), updatePlace);
router.delete('/places/:id',      protect, authorize('admin'), positiveIntParam('id'), deletePlace);

// Place image routes
router.get('/places/:placeId/images',            positiveIntParam('placeId', 'placeId'), getPlaceImages);
router.post('/places/:placeId/images',           protect, authorize('admin'), positiveIntParam('placeId', 'placeId'), upload.array('images', 10), uploadPlaceImages);
router.post('/places/:placeId/images/url',       protect, authorize('admin'), positiveIntParam('placeId', 'placeId'), requireFields(['image_url']), addPlaceImageByUrl);
router.delete('/places/images/:imageId',         protect, authorize('admin'), positiveIntParam('imageId', 'imageId'), deletePlaceImage);

module.exports = router;
