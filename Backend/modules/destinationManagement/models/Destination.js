/**
 * The `destinations` table has been dropped.
 * Destination data (type, duration, rating, review_count)
 * now lives directly on the `places` table.
 * Re-export Place so any legacy import of Destination still works.
 */
const Place = require('../../placeManagement/models/Place');

module.exports = Place;
