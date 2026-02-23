require('dotenv').config();
const { connectDB } = require('../config/database');
const User = require('../modules/userManagement/models/User');

// Create Admin User
const createAdmin = async () => {
  await connectDB();

  try {
    // Check if admin already exists
    const adminExists = await User.findOne({ where: { email: 'admin@travelgenie.com' } });
    
    if (adminExists) {
      console.log('❌ Admin user already exists!');
      console.log('📧 Email: admin@travelgenie.com');
      process.exit(0);
    }

    // Create new admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@travelgenie.com',
      password: 'admin123', // Will be hashed by pre-save hook
      role: 'admin',
      phone: '+94771234567',
      address: {
        street: '123 Admin Street',
        city: 'Colombo',
        state: 'Western Province',
        country: 'Sri Lanka',
        zipCode: '00100'
      },
      isActive: true
    });

    console.log('✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email: admin@travelgenie.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Role: admin');
    console.log('🆔 ID:', admin.id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  Please change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();
