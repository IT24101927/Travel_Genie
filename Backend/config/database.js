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

    // Set up model associations before syncing
    require('./associations');

    const syncOptions = process.env.DB_FORCE_SYNC === 'true'
      ? { force: true }
      : { alter: false };
    await sequelize.sync(syncOptions);

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
