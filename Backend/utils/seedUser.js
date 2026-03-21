/**
 * Seed Regular User Script
 * Creates a regular user for testing and development
 *
 * Usage: node utils/seedUser.js
 * Or: npm run seed:user
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const User = require('../modules/userManagement/models/User');

const seedUser = async () => {
  try {
    console.log('🌱 Seeding Regular User...\n');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: 'user@travelgenie.com' } });

    if (existingUser) {
      console.log('⚠️  User already exists!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Email:', existingUser.email);
      console.log('Name:', existingUser.name);
      console.log('Role:', existingUser.role);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      process.exit(0);
    }

    // Create regular user
    const userData = {
      name: 'Test User',
      email: 'user@travelgenie.com',
      password_hash: 'user123', // Will be hashed automatically by beforeSave hook
      role: 'user',
      phone: '+94777654321',
      gender: 'male',
      date_of_birth: '1995-06-15',
      isActive: true,
    };

    const user = await User.create(userData);

    console.log('✅ Regular user created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', user.email);
    console.log('👤 Name:', user.name);
    console.log('🔑 Password: user123');
    console.log('👨 Role:', user.role);
    console.log('📞 Phone:', user.phone);
    console.log('🆔 User ID:', user.id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('💡 You can now login with:');
    console.log('   Email: user@travelgenie.com');
    console.log('   Password: user123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding user:', error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  }
};

// Run the seeder
seedUser();
