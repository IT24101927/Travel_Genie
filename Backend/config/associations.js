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

const Destination     = require('../modules/destinationManagement/models/Destination');
const Hotel           = require('../modules/hotelManagement/models/Hotel');

const Tag             = require('../modules/tagManagement/models/Tag');
const PlaceTag        = require('../modules/tagManagement/models/PlaceTag');
const PlaceImage      = require('../modules/tagManagement/models/PlaceImage');

const TripPlan        = require('../modules/tripItineraryManagement/models/TripPlan');
const TripDay         = require('../modules/tripItineraryManagement/models/TripDay');
const ItineraryItem   = require('../modules/tripItineraryManagement/models/ItineraryItem');
const TripStay        = require('../modules/tripItineraryManagement/models/TripStay');

const ExpenseCategory = require('../modules/expenseManagement/models/ExpenseCategory');
const Expense         = require('../modules/expenseManagement/models/Expense');

const Review          = require('../modules/feedbackManagement/models/Review');
const RecommendationLog = require('../modules/feedbackManagement/models/RecommendationLog');
const ItemReaction    = require('../modules/feedbackManagement/models/ItemReaction');

const PriceRecord     = require('../modules/expenseManagement/models/PriceRecord');
const Notification    = require('../modules/notificationManagement/models/Notification');

// ── District ─────────────────────────────────────────────────────────────────
District.hasMany(Place, { foreignKey: 'district_id', as: 'places' });
Place.belongsTo(District, { foreignKey: 'district_id', as: 'district' });

// ── Place <-> Destination / Hotel (subtypes) ──────────────────────────────────
Place.hasOne(Destination, { foreignKey: 'place_id', as: 'destination' });
Destination.belongsTo(Place, { foreignKey: 'place_id', as: 'place' });

Place.hasOne(Hotel, { foreignKey: 'place_id', as: 'hotel' });
Hotel.belongsTo(Place, { foreignKey: 'place_id', as: 'place' });

// ── Place <-> Tag (many-to-many via PlaceTag) ─────────────────────────────────
Place.belongsToMany(Tag, { through: PlaceTag, foreignKey: 'place_id', otherKey: 'tag_id', as: 'tags' });
Tag.belongsToMany(Place, { through: PlaceTag, foreignKey: 'tag_id', otherKey: 'place_id', as: 'places' });
PlaceTag.belongsTo(Place, { foreignKey: 'place_id' });
PlaceTag.belongsTo(Tag,   { foreignKey: 'tag_id' });

// ── PlaceImage ────────────────────────────────────────────────────────────────
Place.hasMany(PlaceImage, { foreignKey: 'place_id', as: 'images' });
PlaceImage.belongsTo(Place, { foreignKey: 'place_id', as: 'place' });

// ── User ──────────────────────────────────────────────────────────────────────
User.hasOne(UserPreference, { foreignKey: 'user_id', as: 'preference' });
UserPreference.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

UserPreference.belongsTo(TravelStyle, { foreignKey: 'style_id', as: 'travelStyle' });
TravelStyle.hasMany(UserPreference, { foreignKey: 'style_id', as: 'userPreferences' });

// User <-> Tag (many-to-many via UserInterest)
User.belongsToMany(Tag, { through: UserInterest, foreignKey: 'user_id', otherKey: 'tag_id', as: 'interests' });
Tag.belongsToMany(User, { through: UserInterest, foreignKey: 'tag_id', otherKey: 'user_id', as: 'interestedUsers' });

// ── TripPlan ──────────────────────────────────────────────────────────────────
User.hasMany(TripPlan, { foreignKey: 'user_id', as: 'tripPlans' });
TripPlan.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

District.hasMany(TripPlan, { foreignKey: 'district_id', as: 'tripPlans' });
TripPlan.belongsTo(District, { foreignKey: 'district_id', as: 'district' });

// ── TripDay ───────────────────────────────────────────────────────────────────
TripPlan.hasMany(TripDay, { foreignKey: 'trip_id', as: 'days' });
TripDay.belongsTo(TripPlan, { foreignKey: 'trip_id', as: 'tripPlan' });

// ── ItineraryItem ─────────────────────────────────────────────────────────────
TripDay.hasMany(ItineraryItem, { foreignKey: 'day_id', as: 'items' });
ItineraryItem.belongsTo(TripDay, { foreignKey: 'day_id', as: 'tripDay' });

ItineraryItem.belongsTo(Place, { foreignKey: 'place_id', as: 'place' });
Place.hasMany(ItineraryItem, { foreignKey: 'place_id', as: 'itineraryItems' });

// ── TripStay ──────────────────────────────────────────────────────────────────
TripPlan.hasMany(TripStay, { foreignKey: 'trip_id', as: 'stays' });
TripStay.belongsTo(TripPlan, { foreignKey: 'trip_id', as: 'tripPlan' });

TripStay.belongsTo(Place, { foreignKey: 'hotel_place_id', as: 'hotelPlace' });
Place.hasMany(TripStay, { foreignKey: 'hotel_place_id', as: 'tripStays' });

// ── Expense ───────────────────────────────────────────────────────────────────
TripPlan.hasMany(Expense, { foreignKey: 'trip_id', as: 'expenses' });
Expense.belongsTo(TripPlan, { foreignKey: 'trip_id', as: 'tripPlan' });

User.hasMany(Expense, { foreignKey: 'user_id', as: 'expenses' });
Expense.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

ExpenseCategory.hasMany(Expense, { foreignKey: 'category_id', as: 'expenses' });
Expense.belongsTo(ExpenseCategory, { foreignKey: 'category_id', as: 'category' });

Expense.belongsTo(ItineraryItem, { foreignKey: 'linked_item_id', as: 'itineraryItem' });
ItineraryItem.hasMany(Expense, { foreignKey: 'linked_item_id', as: 'expenses' });

// ── Review ────────────────────────────────────────────────────────────────────
User.hasMany(Review, { foreignKey: 'user_id', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Place.hasMany(Review, { foreignKey: 'place_id', as: 'reviews' });
Review.belongsTo(Place, { foreignKey: 'place_id', as: 'place' });

// ── RecommendationLog ─────────────────────────────────────────────────────────
User.hasMany(RecommendationLog, { foreignKey: 'user_id', as: 'recommendationLogs' });
RecommendationLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

TripPlan.hasMany(RecommendationLog, { foreignKey: 'trip_id', as: 'recommendationLogs' });
RecommendationLog.belongsTo(TripPlan, { foreignKey: 'trip_id', as: 'tripPlan' });

Place.hasMany(RecommendationLog, { foreignKey: 'place_id', as: 'recommendationLogs' });
RecommendationLog.belongsTo(Place, { foreignKey: 'place_id', as: 'place' });

// ── PriceRecord ───────────────────────────────────────────────────────────────
Place.hasMany(PriceRecord, { foreignKey: 'place_id', as: 'priceRecords' });
PriceRecord.belongsTo(Place, { foreignKey: 'place_id', as: 'place' });

// ── Notification ──────────────────────────────────────────────────────────────
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

TripPlan.hasMany(Notification, { foreignKey: 'trip_id', as: 'notifications' });
Notification.belongsTo(TripPlan, { foreignKey: 'trip_id', as: 'tripPlan' });

// ── ItemReaction ──────────────────────────────────────────────────────────────
User.hasMany(ItemReaction, { foreignKey: 'user_id', as: 'itemReactions' });
ItemReaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

ItineraryItem.hasMany(ItemReaction, { foreignKey: 'item_id', as: 'reactions' });
ItemReaction.belongsTo(ItineraryItem, { foreignKey: 'item_id', as: 'itineraryItem' });

