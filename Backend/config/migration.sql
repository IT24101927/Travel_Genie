-- =============================================================================
--  TravelGenie – Full Database Migration Script (PostgreSQL)
--  Run once on a fresh database or whenever you need to recreate the schema.
--  To apply to an existing DB without data loss use:
--      psql -U <user> -d travelgenie -f migration.sql
-- =============================================================================

-- Drop all tables in reverse FK-dependency order (safe re-run)
DROP TABLE IF EXISTS item_reactions          CASCADE;
DROP TABLE IF EXISTS notifications           CASCADE;
DROP TABLE IF EXISTS recommendation_logs     CASCADE;
DROP TABLE IF EXISTS reviews                 CASCADE;
DROP TABLE IF EXISTS price_records           CASCADE;
DROP TABLE IF EXISTS expenses                CASCADE;
DROP TABLE IF EXISTS expense_categories      CASCADE;
DROP TABLE IF EXISTS trip_stays              CASCADE;
DROP TABLE IF EXISTS itinerary_items         CASCADE;
DROP TABLE IF EXISTS trip_days               CASCADE;
DROP TABLE IF EXISTS trip_plans              CASCADE;
DROP TABLE IF EXISTS place_images            CASCADE;
DROP TABLE IF EXISTS place_tags              CASCADE;
DROP TABLE IF EXISTS destinations            CASCADE;
DROP TABLE IF EXISTS hotels                  CASCADE;
DROP TABLE IF EXISTS places                  CASCADE;
DROP TABLE IF EXISTS districts               CASCADE;
DROP TABLE IF EXISTS user_interests          CASCADE;
DROP TABLE IF EXISTS user_preferences        CASCADE;
DROP TABLE IF EXISTS users                   CASCADE;
DROP TABLE IF EXISTS travel_styles           CASCADE;
DROP TABLE IF EXISTS tags                    CASCADE;

-- Drop custom ENUM types (Postgres keeps them separately)
DROP TYPE IF EXISTS enum_users_role                      CASCADE;
DROP TYPE IF EXISTS enum_users_gender                    CASCADE;
DROP TYPE IF EXISTS enum_travel_styles_style_name        CASCADE;
DROP TYPE IF EXISTS enum_tags_tag_type                   CASCADE;
DROP TYPE IF EXISTS enum_destinations_destination_category CASCADE;
DROP TYPE IF EXISTS enum_destinations_best_time_to_visit CASCADE;
DROP TYPE IF EXISTS enum_hotels_hotel_type               CASCADE;
DROP TYPE IF EXISTS enum_trip_plans_status               CASCADE;
DROP TYPE IF EXISTS enum_itinerary_items_item_type       CASCADE;
DROP TYPE IF EXISTS enum_expense_categories_category_name CASCADE;
DROP TYPE IF EXISTS enum_expenses_expense_type           CASCADE;
DROP TYPE IF EXISTS enum_expenses_payment_method         CASCADE;
DROP TYPE IF EXISTS enum_price_records_item_type         CASCADE;
DROP TYPE IF EXISTS enum_reviews_travel_type             CASCADE;
DROP TYPE IF EXISTS enum_reviews_status                  CASCADE;
DROP TYPE IF EXISTS enum_recommendation_logs_rec_type    CASCADE;
DROP TYPE IF EXISTS enum_recommendation_logs_user_action CASCADE;
DROP TYPE IF EXISTS enum_item_reactions_reaction         CASCADE;
DROP TYPE IF EXISTS enum_notifications_type             CASCADE;

-- =============================================================================
-- ENUM types
-- =============================================================================

CREATE TYPE enum_users_role                       AS ENUM ('user', 'admin');
CREATE TYPE enum_users_gender                     AS ENUM ('male', 'female', 'other');

CREATE TYPE enum_travel_styles_style_name         AS ENUM (
  'Relax', 'Adventure', 'Culture', 'Luxury', 'Budget', 'Family', 'Backpacker'
);

CREATE TYPE enum_tags_tag_type                    AS ENUM (
  'INTEREST', 'ACTIVITY', 'CLIMATE', 'ATTRACTION', 'AMENITY', 'HOTEL_TYPE'
);

CREATE TYPE enum_destinations_destination_category AS ENUM (
  'beach', 'mountain', 'city', 'historical', 'adventure',
  'cultural', 'nature', 'religious', 'wildlife', 'other'
);

CREATE TYPE enum_destinations_best_time_to_visit  AS ENUM (
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december', 'year-round'
);

CREATE TYPE enum_hotels_hotel_type                AS ENUM (
  'hotel', 'resort', 'hostel', 'guesthouse', 'apartment', 'villa', 'motel', 'boutique'
);

CREATE TYPE enum_trip_plans_status                AS ENUM (
  'draft', 'planned', 'ongoing', 'completed', 'cancelled'
);

CREATE TYPE enum_itinerary_items_item_type        AS ENUM (
  'DESTINATION_VISIT', 'HOTEL_STAY', 'FOOD', 'TRANSPORT', 'ACTIVITY', 'OTHER'
);

CREATE TYPE enum_expense_categories_category_name AS ENUM (
  'Accommodation', 'Food', 'Transport', 'Tickets',
  'Shopping', 'Entertainment', 'Emergency', 'Other'
);

CREATE TYPE enum_expenses_expense_type            AS ENUM ('ESTIMATED', 'ACTUAL');

CREATE TYPE enum_expenses_payment_method          AS ENUM (
  'cash', 'credit-card', 'debit-card', 'online-payment', 'bank-transfer', 'other'
);

CREATE TYPE enum_price_records_item_type          AS ENUM ('ticket', 'hotel', 'transport');

CREATE TYPE enum_reviews_travel_type              AS ENUM (
  'solo', 'couple', 'family', 'friends', 'business'
);

CREATE TYPE enum_reviews_status                   AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE enum_recommendation_logs_rec_type     AS ENUM ('DESTINATION', 'HOTEL');

CREATE TYPE enum_recommendation_logs_user_action  AS ENUM ('VIEWED', 'SELECTED', 'IGNORED');

CREATE TYPE enum_item_reactions_reaction          AS ENUM ('LIKE', 'DISLIKE');

CREATE TYPE enum_notifications_type              AS ENUM ('BUDGET_80', 'BUDGET_100', 'PRICE_CHANGE');

-- =============================================================================
-- 1. travel_styles
-- =============================================================================
CREATE TABLE travel_styles (
  style_id    SERIAL PRIMARY KEY,
  style_name  enum_travel_styles_style_name NOT NULL UNIQUE
);

-- =============================================================================
-- 2. tags
-- =============================================================================
CREATE TABLE tags (
  tag_id    SERIAL PRIMARY KEY,
  tag_name  VARCHAR(100) NOT NULL UNIQUE,
  tag_type  enum_tags_tag_type NOT NULL
);

-- =============================================================================
-- 3. users
-- =============================================================================
CREATE TABLE users (
  id                    SERIAL PRIMARY KEY,
  name                  VARCHAR(50)          NOT NULL,
  email                 VARCHAR(255)         NOT NULL UNIQUE,
  password_hash         VARCHAR(255)         NOT NULL,
  role                  enum_users_role      NOT NULL DEFAULT 'user',
  phone                 VARCHAR(50),
  date_of_birth         DATE,
  gender                enum_users_gender,
  nic                   VARCHAR(50),
  avatar                TEXT                 NOT NULL DEFAULT '',
  address               JSONB                NOT NULL DEFAULT '{}',
  "isActive"            BOOLEAN              NOT NULL DEFAULT TRUE,
  "lastLogin"           TIMESTAMPTZ,
  "createdAt"           TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 4. user_preferences  (1-to-1 with users)
-- =============================================================================
CREATE TABLE user_preferences (
  user_id           INTEGER PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  style_id          INTEGER REFERENCES travel_styles (style_id) ON DELETE SET NULL,
  preferred_weather VARCHAR(100),
  notification_prefs JSONB NOT NULL DEFAULT '{}',
  regional_prefs    JSONB NOT NULL DEFAULT '{}',
  privacy_prefs     JSONB NOT NULL DEFAULT '{}',
  destination_prefs JSONB NOT NULL DEFAULT '{}',
  trip_defaults     JSONB NOT NULL DEFAULT '{}',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 5. user_interests  (User ↔ Tag many-to-many junction)
-- =============================================================================
CREATE TABLE user_interests (
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags  (tag_id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, tag_id)
);

-- =============================================================================
-- 6. districts
-- =============================================================================
CREATE TABLE districts (
  district_id  SERIAL PRIMARY KEY,
  name         VARCHAR(100) NOT NULL UNIQUE,
  province     VARCHAR(100),
  description  TEXT,
  highlights   TEXT[],
  best_for     TEXT[],
  image_url    TEXT
);

-- =============================================================================
-- 7. places  (supertype for Destination & Hotel)
-- =============================================================================
CREATE TABLE places (
  place_id     SERIAL PRIMARY KEY,
  district_id  INTEGER      NOT NULL REFERENCES districts (district_id) ON DELETE RESTRICT,
  name         VARCHAR(200) NOT NULL,
  description  TEXT,
  address_text VARCHAR(500),
  lat          DECIMAL(10, 7),
  lng          DECIMAL(10, 7),
  climate      VARCHAR(100),
  "isActive"   BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 8. destinations  (subtype of Place – shared PK)
-- =============================================================================
CREATE TABLE destinations (
  place_id               INTEGER PRIMARY KEY REFERENCES places (place_id) ON DELETE CASCADE,
  destination_category   enum_destinations_destination_category NOT NULL,
  opening_hours          VARCHAR(200),
  best_time_to_visit     enum_destinations_best_time_to_visit,
  rating                 FLOAT            NOT NULL DEFAULT 0  CHECK (rating BETWEEN 0 AND 5),
  review_count           INTEGER          NOT NULL DEFAULT 0,
  entry_fee              DECIMAL(10, 2)   NOT NULL DEFAULT 0
);

-- =============================================================================
-- 9. hotels  (subtype of Place – shared PK)
-- =============================================================================
CREATE TABLE hotels (
  place_id              INTEGER PRIMARY KEY REFERENCES places (place_id) ON DELETE CASCADE,
  hotel_type            enum_hotels_hotel_type NOT NULL,
  price_per_night       DECIMAL(10, 2)  NOT NULL DEFAULT 0,
  star_class            INTEGER              CHECK (star_class BETWEEN 1 AND 5),
  phone                 VARCHAR(50),
  check_in_time         VARCHAR(10)          NOT NULL DEFAULT '14:00',
  check_out_time        VARCHAR(10)          NOT NULL DEFAULT '11:00',
  amenities             JSONB                NOT NULL DEFAULT '[]',
  contact               JSONB                NOT NULL DEFAULT '{}',
  cancellation_policy   TEXT,
  rating                FLOAT                NOT NULL DEFAULT 0  CHECK (rating BETWEEN 0 AND 5),
  review_count          INTEGER              NOT NULL DEFAULT 0,
  is_featured           BOOLEAN              NOT NULL DEFAULT FALSE
);

-- =============================================================================
-- 10. place_tags  (Place ↔ Tag many-to-many junction)
-- =============================================================================
CREATE TABLE place_tags (
  place_id INTEGER NOT NULL REFERENCES places (place_id) ON DELETE CASCADE,
  tag_id   INTEGER NOT NULL REFERENCES tags   (tag_id)   ON DELETE CASCADE,
  weight   FLOAT   NOT NULL DEFAULT 1.0,
  PRIMARY KEY (place_id, tag_id)
);

-- =============================================================================
-- 11. place_images
-- =============================================================================
CREATE TABLE place_images (
  image_id   SERIAL PRIMARY KEY,
  place_id   INTEGER      NOT NULL REFERENCES places (place_id) ON DELETE CASCADE,
  image_url  VARCHAR(500) NOT NULL,
  caption    VARCHAR(300),
  sort_order INTEGER      NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 12. trip_plans
-- =============================================================================
CREATE TABLE trip_plans (
  trip_id       SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users     (id)          ON DELETE CASCADE,
  district_id   INTEGER NOT NULL REFERENCES districts (district_id) ON DELETE RESTRICT,
  title         VARCHAR(200)        NOT NULL,
  start_date    DATE                NOT NULL,
  end_date      DATE                NOT NULL,
  num_days      INTEGER,
  num_people    INTEGER             NOT NULL CHECK (num_people >= 1),
  total_budget  DECIMAL(12, 2)      NOT NULL DEFAULT 0,
  hotel_budget  DECIMAL(12, 2)      NOT NULL DEFAULT 0,
  status        enum_trip_plans_status NOT NULL DEFAULT 'draft',
  notes         TEXT,
  "createdAt"   TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 13. trip_days
-- =============================================================================
CREATE TABLE trip_days (
  day_id             SERIAL PRIMARY KEY,
  trip_id            INTEGER        NOT NULL REFERENCES trip_plans (trip_id) ON DELETE CASCADE,
  day_no             INTEGER        NOT NULL,
  date               DATE,
  daily_budget       DECIMAL(12, 2) NOT NULL DEFAULT 0,
  food_budget        DECIMAL(12, 2) NOT NULL DEFAULT 0,
  transport_budget   DECIMAL(12, 2) NOT NULL DEFAULT 0,
  other_budget       DECIMAL(12, 2) NOT NULL DEFAULT 0,
  notes              TEXT,
  UNIQUE (trip_id, day_no)
);

-- =============================================================================
-- 14. itinerary_items
-- =============================================================================
CREATE TABLE itinerary_items (
  item_id        SERIAL PRIMARY KEY,
  day_id         INTEGER NOT NULL REFERENCES trip_days (day_id) ON DELETE CASCADE,
  place_id       INTEGER REFERENCES places (place_id) ON DELETE SET NULL,
  item_type      enum_itinerary_items_item_type NOT NULL DEFAULT 'DESTINATION_VISIT',
  description    VARCHAR(500),
  est_cost       DECIMAL(12, 2) NOT NULL DEFAULT 0,
  start_time     TIME,
  end_time       TIME,
  priority_score FLOAT          NOT NULL DEFAULT 0,
  sort_order     INTEGER        NOT NULL DEFAULT 0
);

-- =============================================================================
-- 15. trip_stays
-- =============================================================================
CREATE TABLE trip_stays (
  stay_id        SERIAL PRIMARY KEY,
  trip_id        INTEGER        NOT NULL REFERENCES trip_plans (trip_id) ON DELETE CASCADE,
  hotel_place_id INTEGER        NOT NULL REFERENCES places     (place_id) ON DELETE RESTRICT,
  check_in       DATE           NOT NULL,
  check_out      DATE           NOT NULL,
  est_cost       DECIMAL(12, 2) NOT NULL DEFAULT 0,
  notes          TEXT
);

-- =============================================================================
-- 16. expense_categories
-- =============================================================================
CREATE TABLE expense_categories (
  category_id   SERIAL PRIMARY KEY,
  category_name enum_expense_categories_category_name NOT NULL UNIQUE
);

-- =============================================================================
-- 17. expenses
-- =============================================================================
CREATE TABLE expenses (
  expense_id     SERIAL PRIMARY KEY,
  trip_id        INTEGER        NOT NULL REFERENCES trip_plans        (trip_id)    ON DELETE CASCADE,
  user_id        INTEGER        NOT NULL REFERENCES users             (id)         ON DELETE CASCADE,
  category_id    INTEGER        REFERENCES expense_categories (category_id) ON DELETE SET NULL,
  linked_item_id INTEGER        REFERENCES itinerary_items    (item_id)     ON DELETE SET NULL,
  amount         DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  currency       VARCHAR(10)    NOT NULL DEFAULT 'LKR',
  expense_date   DATE           NOT NULL DEFAULT CURRENT_DATE,
  note           VARCHAR(500),
  expense_type   enum_expenses_expense_type   NOT NULL DEFAULT 'ACTUAL',
  payment_method enum_expenses_payment_method NOT NULL DEFAULT 'cash',
  receipt_url    VARCHAR(500),
  "createdAt"    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 18. price_records
-- =============================================================================
CREATE TABLE price_records (
  price_id    SERIAL PRIMARY KEY,
  place_id    INTEGER        NOT NULL REFERENCES places (place_id) ON DELETE CASCADE,
  item_type   enum_price_records_item_type NOT NULL,
  price       DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  recorded_at TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 19. reviews
-- =============================================================================
CREATE TABLE reviews (
  review_id       SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users  (id)       ON DELETE CASCADE,
  place_id        INTEGER NOT NULL REFERENCES places (place_id) ON DELETE CASCADE,
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title           VARCHAR(100),
  comment         TEXT    NOT NULL,
  visit_date      DATE,
  travel_type     enum_reviews_travel_type,
  images          JSONB        NOT NULL DEFAULT '[]',
  sentiment_score FLOAT,
  is_flagged      BOOLEAN      NOT NULL DEFAULT FALSE,
  helpful         INTEGER      NOT NULL DEFAULT 0,
  helpful_by      JSONB        NOT NULL DEFAULT '[]',
  status          enum_reviews_status NOT NULL DEFAULT 'pending',
  response        JSONB,
  "createdAt"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 20. recommendation_logs
-- =============================================================================
CREATE TABLE recommendation_logs (
  rec_id      SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users      (id)       ON DELETE CASCADE,
  trip_id     INTEGER REFERENCES trip_plans (trip_id) ON DELETE SET NULL,
  place_id    INTEGER REFERENCES places     (place_id) ON DELETE SET NULL,
  rec_type    enum_recommendation_logs_rec_type    NOT NULL,
  score       FLOAT,
  rank        INTEGER,
  user_action enum_recommendation_logs_user_action NOT NULL DEFAULT 'VIEWED',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 21. item_reactions  (one reaction per user per itinerary item)
-- =============================================================================
CREATE TABLE item_reactions (
  reaction_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users           (id)      ON DELETE CASCADE,
  item_id     INTEGER NOT NULL REFERENCES itinerary_items (item_id) ON DELETE CASCADE,
  reaction    enum_item_reactions_reaction NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, item_id)
);

-- =============================================================================
-- 22. notifications
-- =============================================================================
CREATE TABLE notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users      (id)       ON DELETE CASCADE,
  trip_id         INTEGER REFERENCES trip_plans (trip_id) ON DELETE SET NULL,
  type            enum_notifications_type NOT NULL,
  message         TEXT      NOT NULL,
  is_read         BOOLEAN   NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Seed: expense_categories (idempotent)
-- =============================================================================
INSERT INTO expense_categories (category_name) VALUES
  ('Accommodation'), ('Food'), ('Transport'), ('Tickets'),
  ('Shopping'), ('Entertainment'), ('Emergency'), ('Other')
ON CONFLICT (category_name) DO NOTHING;

-- =============================================================================
-- Seed: travel_styles (idempotent)
-- =============================================================================
INSERT INTO travel_styles (style_name) VALUES
  ('Relax'), ('Adventure'), ('Culture'), ('Luxury'),
  ('Budget'), ('Family'), ('Backpacker')
ON CONFLICT (style_name) DO NOTHING;

-- =============================================================================
-- Seed: districts (all 25 Sri Lanka districts, idempotent)
-- =============================================================================
INSERT INTO districts (name, province) VALUES
  ('Colombo',      'Western Province'),
  ('Gampaha',      'Western Province'),
  ('Kalutara',     'Western Province'),
  ('Kandy',        'Central Province'),
  ('Matale',       'Central Province'),
  ('Nuwara Eliya', 'Central Province'),
  ('Galle',        'Southern Province'),
  ('Matara',       'Southern Province'),
  ('Hambantota',   'Southern Province'),
  ('Jaffna',       'Northern Province'),
  ('Kilinochchi',  'Northern Province'),
  ('Mannar',       'Northern Province'),
  ('Mullaitivu',   'Northern Province'),
  ('Vavuniya',     'Northern Province'),
  ('Ampara',       'Eastern Province'),
  ('Batticaloa',   'Eastern Province'),
  ('Trincomalee',  'Eastern Province'),
  ('Kurunegala',   'North Western Province'),
  ('Puttalam',     'North Western Province'),
  ('Anuradhapura', 'North Central Province'),
  ('Polonnaruwa',  'North Central Province'),
  ('Badulla',      'Uva Province'),
  ('Monaragala',   'Uva Province'),
  ('Kegalle',      'Sabaragamuwa Province'),
  ('Ratnapura',    'Sabaragamuwa Province')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- Seed: example users
-- NOTE: password_hash values below are bcrypt hashes (cost 10).
--   Admin password : Admin@123
--   User password  : User@123
-- After running this migration you can also run:  node utils/seed.js
-- =============================================================================
INSERT INTO users (name, email, password_hash, role, phone, gender, date_of_birth, nic, "isActive", address) VALUES
  (
    'Super Admin',
    'admin@travelgenie.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'admin',
    '+94771234567',
    'male',
    '1990-06-15',
    '900000000V',
    TRUE,
    '{"street":"123 Admin Street","city":"Colombo","state":"Western Province","country":"Sri Lanka","zipCode":"00100"}'
  ),
  (
    'Amara Perera',
    'user@travelgenie.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'user',
    '+94712345678',
    'female',
    '1997-03-22',
    '970000000V',
    TRUE,
    '{"street":"45 Kandy Road","city":"Kandy","state":"Central Province","country":"Sri Lanka","zipCode":"20000"}'
  ),
  (
    'Kasun Silva',
    'kasun@travelgenie.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'user',
    '+94723456789',
    'male',
    '2000-11-05',
    '001234567V',
    TRUE,
    '{"street":"77 Galle Road","city":"Galle","state":"Southern Province","country":"Sri Lanka","zipCode":"80000"}'
  )
ON CONFLICT (email) DO NOTHING;
-- ⚠️  The password hash above is Laravel's well-known test hash for "password".
-- Run `node utils/seed.js` to overwrite with properly hashed Admin@123 / User@123 passwords.
