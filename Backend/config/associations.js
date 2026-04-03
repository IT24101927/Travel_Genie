/**
 * Sequelize model associations
 * Imported once during database initialization in config/database.js
 */
const User            = require('../modules/userManagement/models/User');
const TravelStyle     = require('../modules/userManagement/models/TravelStyle');
const UserPreference  = require('../modules/userManagement/models/UserPreference');
const UserInterest    = require('../modules/userManagement/models/UserInterest');

const District        = require('../modules/placeManagement/models/District');
const Place           = require('../modules/placeManagement/models/Place');

const Hotel           = require('../modules/hotelManagement/models/Hotel');

const Tag             = require('../modules/tagManagement/models/Tag');
const PlaceTag        = require('../modules/tagManagement/models/PlaceTag');

const TripItinerary   = require('../modules/tripItineraryManagement/models/TripItinerary');

const ExpenseCategory = require('../modules/expenseManagement/models/ExpenseCategory');
const Expense         = require('../modules/expenseManagement/models/Expense');

const Review          = require('../modules/feedbackManagement/models/Review');

const PriceRecord     = require('../modules/expenseManagement/models/PriceRecord');
const Notification    = require('../modules/notificationManagement/models/Notification');

// ── District ─────────────────────────────────────────────────────────────────
District.hasMany(Place, { foreignKey: 'district_id', as: 'places' });
Place.belongsTo(District, { foreignKey: 'district_id', as: 'district' });

// ── Place <-> Hotel ───────────────────────────────────────────────────────────
// DB: hotels.place_id REFERENCES places(place_id) ON DELETE CASCADE
// Style rule: one hotel profile belongs to one place row (enforced by unique index when possible).
Place.hasMany(Hotel, { foreignKey: 'place_id', as: 'hotels', onDelete: 'CASCADE' });
Hotel.belongsTo(Place, { foreignKey: 'place_id', as: 'place' });
// Optional nearby destination link shown in hotel cards.
Place.hasMany(Hotel, { foreignKey: 'nearby_place_id', as: 'nearbyHotels', onDelete: 'SET NULL' });
Hotel.belongsTo(Place, { foreignKey: 'nearby_place_id', as: 'nearbyPlace' });

// ── Place <-> Tag (many-to-many via PlaceTag) ─────────────────────────────────
Place.belongsToMany(Tag, { through: PlaceTag, foreignKey: 'place_id', otherKey: 'tag_id', as: 'tags' });
Tag.belongsToMany(Place, { through: PlaceTag, foreignKey: 'tag_id', otherKey: 'place_id', as: 'places' });
PlaceTag.belongsTo(Place, { foreignKey: 'place_id' });
PlaceTag.belongsTo(Tag,   { foreignKey: 'tag_id' });

// ── User ──────────────────────────────────────────────────────────────────────
User.hasOne(UserPreference, { foreignKey: 'user_id', as: 'preference' });
UserPreference.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

UserPreference.belongsTo(TravelStyle, { foreignKey: 'style_id', as: 'travelStyle' });
TravelStyle.hasMany(UserPreference, { foreignKey: 'style_id', as: 'userPreferences' });

// User <-> Tag (many-to-many via UserInterest)
User.belongsToMany(Tag, { through: UserInterest, foreignKey: 'user_id', otherKey: 'tag_id', as: 'interests' });
Tag.belongsToMany(User, { through: UserInterest, foreignKey: 'tag_id', otherKey: 'user_id', as: 'interestedUsers' });

// ── TripItinerary ─────────────────────────────────────────────────────────────
User.hasMany(TripItinerary, { foreignKey: 'user_id', as: 'tripPlans' });
TripItinerary.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
District.hasMany(TripItinerary, { foreignKey: 'district_id', as: 'tripPlans' });
TripItinerary.belongsTo(District, { foreignKey: 'district_id', as: 'district' });

// ── Expense ───────────────────────────────────────────────────────────────────
TripItinerary.hasMany(Expense, { foreignKey: 'trip_id', as: 'expenses' });
Expense.belongsTo(TripItinerary, { foreignKey: 'trip_id', as: 'tripPlan' });

User.hasMany(Expense, { foreignKey: 'user_id', as: 'expenses' });
Expense.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

ExpenseCategory.hasMany(Expense, { foreignKey: 'category_id', as: 'expenses' });
Expense.belongsTo(ExpenseCategory, { foreignKey: 'category_id', as: 'category' });

// ── Review ────────────────────────────────────────────────────────────────────
// DB: reviews.user_id ON DELETE CASCADE, reviews.place_id ON DELETE CASCADE
User.hasMany(Review, { foreignKey: 'user_id', as: 'reviews', onDelete: 'CASCADE' });
Review.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Place.hasMany(Review, { foreignKey: 'place_id', as: 'reviews', onDelete: 'CASCADE' });
Review.belongsTo(Place, { foreignKey: 'place_id', as: 'place' });

// ── PriceRecord ───────────────────────────────────────────────────────────────
// DB: price_records.place_id ON DELETE CASCADE
Place.hasMany(PriceRecord, { foreignKey: 'place_id', as: 'priceRecords', onDelete: 'CASCADE' });
PriceRecord.belongsTo(Place, { foreignKey: 'place_id', as: 'place' });

// ── Notification ──────────────────────────────────────────────────────────────
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

TripItinerary.hasMany(Notification, { foreignKey: 'trip_id', as: 'notifications' });
Notification.belongsTo(TripItinerary, { foreignKey: 'trip_id', as: 'tripPlan' });


