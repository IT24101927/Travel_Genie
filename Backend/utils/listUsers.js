require('dotenv').config();
const { connectDB } = require('../config/database');
const User = require('../modules/userManagement/models/User');

const listAdmins = async () => {
  try {
    await connectDB();
    console.log('🔍 Checking for admin users...\n');

    const admins = await User.findAll({ where: { role: 'admin' } });
    const totalUsers = await User.count();
    const regularUsers = await User.count({ where: { role: 'user' } });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 User Statistics:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👥 Total Users: ${totalUsers}`);
    console.log(`👤 Regular Users: ${regularUsers}`);
    console.log(`👨‍💼 Admin Users: ${admins.length}\n`);

    if (admins.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('👨‍💼 Admin Accounts:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      admins.forEach((admin, index) => {
        console.log(`\n${index + 1}. ${admin.name}`);
        console.log(`   📧 Email: ${admin.email}`);
        console.log(`   🆔 ID: ${admin.id}`);
        console.log(`   ✅ Active: ${admin.isActive ? 'Yes' : 'No'}`);
        console.log(`   📅 Created: ${admin.createdAt.toLocaleDateString()}`);
      });
    } else {
      console.log('⚠️  No admin users found!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

listAdmins();
