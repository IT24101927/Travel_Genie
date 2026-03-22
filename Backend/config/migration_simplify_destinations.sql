-- =============================================================================
--  Simplify Destinations: replace destination_category/opening_hours/
--  best_time_to_visit/entry_fee with simple type + duration columns
-- =============================================================================

-- 1. Add new columns
ALTER TABLE places ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE places ADD COLUMN IF NOT EXISTS duration VARCHAR(100);

-- 2. Migrate existing destination_category values to new type column
UPDATE places SET type = CASE destination_category
  WHEN 'beach'      THEN 'Beach'
  WHEN 'mountain'   THEN 'Nature'
  WHEN 'city'       THEN 'Park'
  WHEN 'historical' THEN 'Heritage'
  WHEN 'adventure'  THEN 'Adventure'
  WHEN 'cultural'   THEN 'Culture'
  WHEN 'nature'     THEN 'Nature'
  WHEN 'religious'  THEN 'Temple'
  WHEN 'wildlife'   THEN 'Wildlife'
  WHEN 'other'      THEN 'Heritage'
  ELSE NULL
END
WHERE destination_category IS NOT NULL AND type IS NULL;

-- 3. Set default duration for existing destinations that don't have one
UPDATE places SET duration = '1–2 hrs'
WHERE type IS NOT NULL AND duration IS NULL;

-- 4. Drop old columns
ALTER TABLE places DROP COLUMN IF EXISTS destination_category;
ALTER TABLE places DROP COLUMN IF EXISTS opening_hours;
ALTER TABLE places DROP COLUMN IF EXISTS best_time_to_visit;
ALTER TABLE places DROP COLUMN IF EXISTS entry_fee;

-- 5. Clean up old enum types (they are no longer needed)
DROP TYPE IF EXISTS enum_destinations_destination_category CASCADE;
DROP TYPE IF EXISTS enum_destinations_best_time_to_visit CASCADE;
