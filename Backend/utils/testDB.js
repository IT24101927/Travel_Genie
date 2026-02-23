const { Sequelize } = require('sequelize');
require('dotenv').config();

const testConnection = async () => {
  const connectionString =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'travelgenie'}`;

  const sequelize = new Sequelize(connectionString, { dialect: 'postgres', logging: false });

  try {
    console.log('🔍 Testing PostgreSQL connection...');
    console.log('📍 Connection URI:', connectionString.replace(/:([^:@]+)@/, ':****@'));

    await sequelize.authenticate();

    console.log('✅ PostgreSQL Connection Successful!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // List tables
    const [tables] = await sequelize.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    );
    console.log('\n📚 Available Tables:');
    if (tables.length === 0) {
      console.log('   (No tables yet - Database is empty)');
    } else {
      tables.forEach(t => console.log(`   - ${t.tablename}`));
    }

    await sequelize.close();
    console.log('\n✅ Connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ PostgreSQL Connection Failed!');
    console.error('Error:', error.message);
    process.exit(1);
  }
};

testConnection();

