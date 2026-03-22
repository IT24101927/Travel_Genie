/**
 * Seed Admin User Script
 * Creates an admin user for testing and development
 *
 * Usage: node utils/seedAdmin.js
 * Or: npm run seed:admin
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const User = require('../modules/userManagement/models/User');

const seedAdmin = async () => {
  try {
    console.log('🌱 Seeding Admin User...\n');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ where: { email: 'admin@travelgenie.com' } });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Email:', existingAdmin.email);
      console.log('Name:', existingAdmin.name);
      console.log('Role:', existingAdmin.role);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      process.exit(0);
    }

    // Create admin user
    const adminData = {
      name: 'Admin User',
      email: 'admin@travelgenie.com',
      password_hash: 'admin123', // Will be hashed automatically by beforeSave hook
      role: 'admin',
      phone: '+94771234567',
      gender: 'other',
      isActive: true,
    };

    const admin = await User.create(adminData);

    console.log('✅ Admin user created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', admin.email);
    console.log('👤 Name:', admin.name);
    console.log('🔑 Password: admin123');
    console.log('👑 Role:', admin.role);
    console.log('📞 Phone:', admin.phone);
    console.log('🆔 User ID:', admin.id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('💡 You can now login with:');
    console.log('   Email: admin@travelgenie.com');
    console.log('   Password: admin123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin user:', error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  }
};

// Run the seeder
seedAdmin();
