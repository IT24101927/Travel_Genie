/**
 * List Users Script
 * Lists all users in the database
 *
 * Usage: node utils/listUsers.js
 * Or: npm run list:users
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const User = require('../modules/userManagement/models/User');

const listUsers = async () => {
  try {
    console.log('👥 Fetching all users...\n');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Fetch all users
    const users = await User.findAll({
      order: [['id', 'ASC']],
      attributes: ['id', 'name', 'email', 'role', 'phone', 'gender', 'isActive', 'createdAt', 'lastLogin'],
    });

    if (users.length === 0) {
      console.log('⚠️  No users found in database');
      console.log('\n💡 Create users with:');
      console.log('   npm run seed:admin  - Create admin user');
      console.log('   npm run seed:user   - Create regular user\n');
      process.exit(0);
    }

    console.log(`📊 Total Users: ${users.length}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name}`);
      console.log('   ─────────────────────────────────────────────');
      console.log(`   🆔 ID: ${user.id}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👑 Role: ${user.role}`);
      console.log(`   📞 Phone: ${user.phone || 'N/A'}`);
      console.log(`   🚻 Gender: ${user.gender || 'N/A'}`);
      console.log(`   ✅ Active: ${user.isActive ? 'Yes' : 'No'}`);
      console.log(`   📅 Created: ${new Date(user.createdAt).toLocaleDateString()}`);
      console.log(`   🔐 Last Login: ${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Summary by role
    const adminCount = users.filter(u => u.role === 'admin').length;
    const userCount = users.filter(u => u.role === 'user').length;
    const activeCount = users.filter(u => u.isActive).length;

    console.log('📈 Summary:');
    console.log(`   👑 Admins: ${adminCount}`);
    console.log(`   👨 Users: ${userCount}`);
    console.log(`   ✅ Active: ${activeCount}`);
    console.log(`   ❌ Inactive: ${users.length - activeCount}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  }
};

// Run the script
listUsers();
