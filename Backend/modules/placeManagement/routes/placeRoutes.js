const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../../middleware/auth');
const upload = require('../../../middleware/upload');
const {
  getAllDistricts,
  getDistrict,
  createDistrict,
  updateDistrict,
  deleteDistrict,
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
router.get('/districts',          getAllDistricts);
router.get('/districts/:id',      getDistrict);
router.post('/districts',         protect, authorize('admin'), createDistrict);
router.put('/districts/:id',      protect, authorize('admin'), updateDistrict);
router.delete('/districts/:id',   protect, authorize('admin'), deleteDistrict);

// Place routes
router.get('/places/search',      searchPlaces);
router.get('/places',             getAllPlaces);
router.get('/places/:id',         getPlace);
router.post('/places',            protect, authorize('admin'), createPlace);
router.put('/places/:id',         protect, authorize('admin'), updatePlace);
router.delete('/places/:id',      protect, authorize('admin'), deletePlace);

// Place image routes
router.get('/places/:placeId/images',            getPlaceImages);
router.post('/places/:placeId/images',           protect, authorize('admin'), upload.array('images', 10), uploadPlaceImages);
router.post('/places/:placeId/images/url',       protect, authorize('admin'), addPlaceImageByUrl);
router.delete('/places/images/:imageId',         protect, authorize('admin'), deletePlaceImage);

module.exports = router;
