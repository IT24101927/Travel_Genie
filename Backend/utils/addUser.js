/**
 * Add Custom User Script
 * Creates a custom user with your specified details
 *
 * Usage: node utils/addUser.js
 * Or: npm run add:user
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const User = require('../modules/userManagement/models/User');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

const addUser = async () => {
  try {
    console.log('👤 Add Custom User to Database\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Get user input
    const name = await question('👤 Name: ');
    const email = await question('📧 Email: ');
    const password = await question('🔑 Password: ');
    const role = await question('👑 Role (user/admin) [user]: ');
    const phone = await question('📞 Phone (optional): ');
    const gender = await question('🚻 Gender (male/female/other) (optional): ');

    rl.close();

    // Validate required fields
    if (!name || !email || !password) {
      console.log('\n❌ Name, email, and password are required!');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.log('\n❌ User with this email already exists!');
      process.exit(1);
    }

    // Create user
    const userData = {
      name,
      email,
      password_hash: password, // Will be hashed automatically by beforeSave hook
      role: role || 'user',
      isActive: true,
    };

    if (phone) userData.phone = phone;
    if (gender && ['male', 'female', 'other'].includes(gender)) {
      userData.gender = gender;
    }

    const user = await User.create(userData);

    console.log('\n✅ User created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🆔 ID:', user.id);
    console.log('👤 Name:', user.name);
    console.log('📧 Email:', user.email);
    console.log('👑 Role:', user.role);
    if (user.phone) console.log('📞 Phone:', user.phone);
    if (user.gender) console.log('🚻 Gender:', user.gender);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('💡 Login credentials:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${password}\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating user:', error.message);
    if (error.name === 'SequelizeValidationError') {
      console.error('\nValidation errors:');
      error.errors.forEach(err => console.error(`  - ${err.message}`));
    }
    rl.close();
    process.exit(1);
  }
};

// Run the script
addUser();
