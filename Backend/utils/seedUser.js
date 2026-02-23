require('dotenv').config();
const { connectDB } = require('../config/database');
const User = require('../modules/userManagement/models/User');

// Create Regular User
const createUser = async () => {
  await connectDB();

  try {
    // Check if user already exists
    const userExists = await User.findOne({ where: { email: 'user@travelgenie.com' } });
    
    if (userExists) {
      console.log('❌ User already exists!');
      console.log('📧 Email: user@travelgenie.com');
      process.exit(0);
    }

    // Create new regular user
    const user = await User.create({
      name: 'John Doe',
      email: 'user@travelgenie.com',
      password: 'user123', // Will be hashed by pre-save hook
      role: 'user',
      phone: '+94771234568',
      address: {
        street: '456 User Avenue',
        city: 'Kandy',
        state: 'Central Province',
        country: 'Sri Lanka',
        zipCode: '20000'
      },
      preferences: {
        budgetRange: {
          min: 50000,
          max: 200000
        },
        preferredDestinations: ['Ella', 'Sigiriya', 'Galle'],
        travelStyle: 'adventure'
      },
      isActive: true
    });

    console.log('✅ Regular user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email: user@travelgenie.com');
    console.log('🔑 Password: user123');
    console.log('👤 Role: user');
    console.log('🆔 ID:', user.id);
    console.log('🎯 Preferences: Adventure travel');
    console.log('💰 Budget: LKR 50,000 - 200,000');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    process.exit(1);
  }
};

createUser();
