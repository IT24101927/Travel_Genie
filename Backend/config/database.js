const { Sequelize } = require('sequelize');

// Build connection string from individual env vars if DATABASE_URL is not provided
const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'travelgenie'}`;

const isRemoteDatabase =
  connectionString.includes('sslmode=require') ||
  (!connectionString.includes('@localhost:') &&
    !connectionString.includes('@127.0.0.1:') &&
    !connectionString.includes('@localhost/') &&
    !connectionString.includes('@127.0.0.1/'));

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: isRemoteDatabase
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {},
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();

    // Remove deprecated hotel columns (idempotent)
    try {
      await sequelize.query(`ALTER TABLE hotels DROP COLUMN IF EXISTS cancellation_policy`);
      await sequelize.query(`ALTER TABLE hotels DROP COLUMN IF EXISTS is_featured`);
      await sequelize.query(`ALTER TABLE hotels ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)`);
      await sequelize.query(`ALTER TABLE places ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)`);
      await sequelize.query(`ALTER TABLE hotels ADD COLUMN IF NOT EXISTS nearby_place_id INTEGER`);
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'hotels_nearby_place_id_fkey'
          ) THEN
            ALTER TABLE hotels
              ADD CONSTRAINT hotels_nearby_place_id_fkey
              FOREIGN KEY (nearby_place_id) REFERENCES places (place_id) ON DELETE SET NULL;
          END IF;
        END $$;
      `);
      await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_hotels_nearby_place_id ON hotels (nearby_place_id)`);
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_indexes
            WHERE indexname = 'ux_hotels_place_id'
          ) AND NOT EXISTS (
            SELECT place_id
            FROM hotels
            GROUP BY place_id
            HAVING COUNT(*) > 1
          ) THEN
            CREATE UNIQUE INDEX ux_hotels_place_id ON hotels (place_id);
          END IF;
        END $$;
      `);
    } catch (alterErr) {
      // Table may not exist yet — sync will create it without these columns
    }

    // Ensure new district columns exist before sync (idempotent)
    try {
      await sequelize.query(`ALTER TABLE districts ADD COLUMN IF NOT EXISTS description TEXT`);
      await sequelize.query(`ALTER TABLE districts ADD COLUMN IF NOT EXISTS highlights TEXT[]`);
      await sequelize.query(`ALTER TABLE districts ADD COLUMN IF NOT EXISTS best_for TEXT[]`);
    } catch (alterErr) {
      // Table may not exist yet on first run — sync will create it with all columns
    }

    // Ensure new user_preferences columns exist (idempotent)
    try {
      await sequelize.query(`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{}'`);
      await sequelize.query(`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS regional_prefs JSONB NOT NULL DEFAULT '{}'`);
      await sequelize.query(`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS privacy_prefs JSONB NOT NULL DEFAULT '{}'`);
      await sequelize.query(`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS destination_prefs JSONB NOT NULL DEFAULT '{}'`);
      await sequelize.query(`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS trip_defaults JSONB NOT NULL DEFAULT '{}'`);
    } catch (alterErr) {
      // Table may not exist yet on first run — sync will create it with all columns
    }

    // Ensure notifications can be linked to expenses (idempotent)
    try {
      await sequelize.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expense_id INTEGER`);
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'notifications_expense_id_fkey'
          ) THEN
            ALTER TABLE notifications
              ADD CONSTRAINT notifications_expense_id_fkey
              FOREIGN KEY (expense_id) REFERENCES expenses (expense_id) ON DELETE SET NULL;
          END IF;
        END $$;
      `);
      await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_notifications_expense_id ON notifications (expense_id)`);

      // Clean legacy one-off price alerts that were sent before expense linking existed.
      await sequelize.query(`DELETE FROM notifications WHERE type = 'PRICE_CHANGE' AND expense_id IS NULL`);
    } catch (alterErr) {
      // Table may not exist yet on first run — sync will create it with all columns.
    }

    // ── Migrate trip_plans → trip_itineraries ────────────────────────────────
    // If the old trip_plans table still exists, drop it so Sequelize can
    // re-create it as trip_itineraries with the correct schema on next sync.
    try {
      const [tblCheck] = await sequelize.query(
        "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='trip_plans'"
      );
      const tripPlansExists = tblCheck.length > 0;
      if (tripPlansExists) {
        // Drop FK constraints that reference trip_plans
        await sequelize.query(`ALTER TABLE IF EXISTS expenses DROP CONSTRAINT IF EXISTS expenses_trip_id_fkey`);
        await sequelize.query(`ALTER TABLE IF EXISTS notifications DROP CONSTRAINT IF EXISTS notifications_trip_id_fkey`);
        // Drop the old table (clears all existing trip data as requested)
        await sequelize.query(`DROP TABLE IF EXISTS trip_plans`);
      }
    } catch (migErr) {
      // Non-fatal — table may have already been migrated
    }

    // Set up model associations before syncing
    require('./associations');

    const syncOptions = process.env.DB_FORCE_SYNC === 'true'
      ? { force: true }
      : { alter: false };
    await sequelize.sync(syncOptions);

    // ── Re-create FK constraints to trip_itineraries (post-sync) ─────────────
    try {
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_trip_id_fkey') THEN
            ALTER TABLE expenses
              ADD CONSTRAINT expenses_trip_id_fkey
              FOREIGN KEY (trip_id) REFERENCES trip_itineraries (trip_id) ON DELETE SET NULL;
          END IF;
        END $$;
      `);
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_trip_id_fkey') THEN
            ALTER TABLE notifications
              ADD CONSTRAINT notifications_trip_id_fkey
              FOREIGN KEY (trip_id) REFERENCES trip_itineraries (trip_id) ON DELETE SET NULL;
          END IF;
        END $$;
      `);
    } catch (fkErr) {
      // Non-fatal — FK constraints are for referential integrity only
    }

    // Ensure review workflow is direct-publish for existing data too.
    // This keeps old pending/rejected rows visible immediately in user/admin views.
    try {
      await sequelize.query(`
        UPDATE reviews
        SET status = 'approved'
        WHERE status IS DISTINCT FROM 'approved'
      `);

      // Recompute ratings/counts after status normalization.
      await sequelize.query(`
        UPDATE places d
        SET
          rating = COALESCE(r.avg_rating, 0),
          review_count = COALESCE(r.review_count, 0)
        FROM (
          SELECT place_id, AVG(rating)::numeric(10,1) AS avg_rating, COUNT(*)::int AS review_count
          FROM reviews
          WHERE status = 'approved'
          GROUP BY place_id
        ) r
        WHERE d.place_id = r.place_id
      `);

      await sequelize.query(`
        UPDATE places
        SET rating = 0, review_count = 0
        WHERE place_id NOT IN (
          SELECT DISTINCT place_id
          FROM reviews
          WHERE status = 'approved'
        )
      `);

      await sequelize.query(`
        UPDATE hotels h
        SET
          rating = COALESCE(r.avg_rating, 0),
          review_count = COALESCE(r.review_count, 0)
        FROM (
          SELECT place_id, AVG(rating)::numeric(10,1) AS avg_rating, COUNT(*)::int AS review_count
          FROM reviews
          WHERE status = 'approved'
          GROUP BY place_id
        ) r
        WHERE h.place_id = r.place_id
      `);

      await sequelize.query(`
        UPDATE hotels
        SET rating = 0, review_count = 0
        WHERE place_id NOT IN (
          SELECT DISTINCT place_id
          FROM reviews
          WHERE status = 'approved'
        )
      `);
    } catch (reviewStatusErr) {
      // Skip on first-run databases where review-related tables may not be ready yet.
    }

    // Backfill places.image_url from legacy place_images table (if table still exists)
    try {
      await sequelize.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'place_images'
          ) THEN
            UPDATE places p
            SET image_url = src.image_url
            FROM (
              SELECT DISTINCT ON (pi.place_id)
                pi.place_id,
                pi.image_url
              FROM place_images pi
              ORDER BY pi.place_id, pi.sort_order ASC, pi.image_id ASC
            ) src
            WHERE src.place_id = p.place_id
              AND (p.image_url IS NULL OR p.image_url = '');
          END IF;
        END $$;
      `);
    } catch (backfillErr) {
      // Optional data backfill; skip safely if source table is unavailable.
    }

    // Backfill hotels.image_url from places.image_url
    try {
      await sequelize.query(`
        UPDATE hotels h
        SET image_url = p.image_url
        FROM places p
        WHERE p.place_id = h.place_id
          AND (h.image_url IS NULL OR h.image_url = '')
          AND p.image_url IS NOT NULL
          AND p.image_url <> ''
      `);
    } catch (backfillErr) {
      // Optional data backfill; skip safely.
    }

    // Fully retire old place_images relation (table/view) after migration.
    try {
      await sequelize.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relname = 'place_images'
              AND c.relkind IN ('v', 'm')
          ) THEN
            EXECUTE 'DROP VIEW IF EXISTS public.place_images CASCADE';
          ELSIF EXISTS (
            SELECT 1
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relname = 'place_images'
              AND c.relkind = 'r'
          ) THEN
            EXECUTE 'DROP TABLE IF EXISTS public.place_images CASCADE';
          END IF;
        END $$;
      `);
    } catch (dropErr) {
      // Ignore if already dropped.
    }

    // place_images compatibility view retired. places.image_url is canonical.

    // Seed expense categories (idempotent)
    try {
      const ExpenseCategory = require('../modules/expenseManagement/models/ExpenseCategory');
      const CAT_NAMES = ['Accommodation', 'Food', 'Transport', 'Tickets', 'Shopping', 'Entertainment', 'Emergency', 'Other'];
      for (const name of CAT_NAMES) {
        await ExpenseCategory.findOrCreate({ where: { category_name: name }, defaults: { category_name: name } });
      }
    } catch (seedErr) {
      console.error('  [DB] Expense category seeding failed:', seedErr.message);
    }

    // Seed Sri Lanka districts (idempotent)
    try {
      const District = require('../modules/placeManagement/models/District');
      const SL_DISTRICTS = [
        { name: 'Colombo',      province: 'Western Province' },
        { name: 'Gampaha',      province: 'Western Province' },
        { name: 'Kalutara',     province: 'Western Province' },
        { name: 'Kandy',        province: 'Central Province' },
        { name: 'Matale',       province: 'Central Province' },
        { name: 'Nuwara Eliya', province: 'Central Province' },
        { name: 'Galle',        province: 'Southern Province' },
        { name: 'Matara',       province: 'Southern Province' },
        { name: 'Hambantota',   province: 'Southern Province' },
        { name: 'Jaffna',       province: 'Northern Province' },
        { name: 'Kilinochchi',  province: 'Northern Province' },
        { name: 'Mannar',       province: 'Northern Province' },
        { name: 'Mullaitivu',   province: 'Northern Province' },
        { name: 'Vavuniya',     province: 'Northern Province' },
        { name: 'Ampara',       province: 'Eastern Province' },
        { name: 'Batticaloa',   province: 'Eastern Province' },
        { name: 'Trincomalee',  province: 'Eastern Province' },
        { name: 'Kurunegala',   province: 'North Western Province' },
        { name: 'Puttalam',     province: 'North Western Province' },
        { name: 'Anuradhapura', province: 'North Central Province' },
        { name: 'Polonnaruwa',  province: 'North Central Province' },
        { name: 'Badulla',      province: 'Uva Province' },
        { name: 'Monaragala',   province: 'Uva Province' },
        { name: 'Kegalle',      province: 'Sabaragamuwa Province' },
        { name: 'Ratnapura',    province: 'Sabaragamuwa Province' },
      ];
      for (const d of SL_DISTRICTS) {
        await District.findOrCreate({ where: { name: d.name }, defaults: d });
      }
    } catch (seedErr) {
      console.error('  [DB] District seeding failed:', seedErr.message);
    }
  } catch (error) {
    console.error(`  [DB] Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
