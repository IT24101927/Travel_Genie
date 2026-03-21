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
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: isRemoteDatabase
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {},
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL Connected successfully');

    // Set up model associations before syncing
    require('./associations');

    // Sync all models with the database
    // Schema is managed via migration.sql — use alter:false to avoid
    // Sequelize altering ENUM/UNIQUE constraints that PostgreSQL already has.
    // Set DB_FORCE_SYNC=true only when you want to recreate all tables.
    const syncOptions = process.env.DB_FORCE_SYNC === 'true'
      ? { force: true }
      : { alter: false };
    await sequelize.sync(syncOptions);
    console.log('All models synchronized successfully');

    // Seed expense categories (idempotent)
    try {
      const ExpenseCategory = require('../modules/expenseManagement/models/ExpenseCategory');
      const CAT_NAMES = ['Accommodation', 'Food', 'Transport', 'Tickets', 'Shopping', 'Entertainment', 'Emergency', 'Other'];
      for (const name of CAT_NAMES) {
        await ExpenseCategory.findOrCreate({ where: { category_name: name }, defaults: { category_name: name } });
      }
      console.log('Expense categories seeded');
    } catch (seedErr) {
      console.error('Expense category seeding failed:', seedErr.message);
    }
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
