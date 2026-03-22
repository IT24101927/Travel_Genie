/**
 * Seed Multiple Test Users Script
 * Creates multiple test users for development and testing
 *
 * Usage: node utils/seedTestUsers.js
 * Or: npm run seed:testusers
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const User = require('../modules/userManagement/models/User');

const testUsers = [
  {
    name: 'John Doe',
    email: 'john@example.com',
    password_hash: 'password123',
    role: 'user',
    phone: '+94771111111',
    gender: 'male',
    date_of_birth: '1990-05-15',
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    password_hash: 'password123',
    role: 'user',
    phone: '+94772222222',
    gender: 'female',
    date_of_birth: '1992-08-20',
  },
  {
    name: 'Mike Johnson',
    email: 'mike@example.com',
    password_hash: 'password123',
    role: 'user',
    phone: '+94773333333',
    gender: 'male',
    date_of_birth: '1988-03-10',
  },
  {
    name: 'Sarah Williams',
    email: 'sarah@example.com',
    password_hash: 'password123',
    role: 'user',
    phone: '+94774444444',
    gender: 'female',
    date_of_birth: '1995-11-25',
  },
  {
    name: 'David Brown',
    email: 'david@example.com',
    password_hash: 'password123',
    role: 'user',
    phone: '+94775555555',
    gender: 'male',
    date_of_birth: '1987-07-30',
  },
];

const seedTestUsers = async () => {
  try {
    console.log('🌱 Seeding Multiple Test Users...\n');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    let created = 0;
    let existing = 0;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const userData of testUsers) {
      try {
        // Check if user exists
        const existingUser = await User.findOne({ where: { email: userData.email } });

        if (existingUser) {
          console.log(`⚠️  ${userData.name} (${userData.email}) - Already exists`);
          existing++;
        } else {
          // Create user
          const user = await User.create({ ...userData, isActive: true });
          console.log(`✅ ${user.name} (${user.email}) - Created (ID: ${user.id})`);
          created++;
        }
      } catch (error) {
        console.log(`❌ ${userData.name} (${userData.email}) - Failed: ${error.message}`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⚠️  Already Existed: ${existing}`);
    console.log(`   📝 Total Attempted: ${testUsers.length}\n`);

    if (created > 0) {
      console.log('💡 All test users have password: password123\n');
      console.log('📧 Test User Emails:');
      testUsers.forEach(user => {
        console.log(`   - ${user.email}`);
      });
      console.log('');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding test users:', error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  }
};

// Run the seeder
seedTestUsers();
