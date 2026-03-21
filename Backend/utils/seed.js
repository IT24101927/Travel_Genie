/**
 * Seed script — creates admin and sample user accounts.
 * Safe to re-run: skips records that already exist.
 * Usage: node utils/seed.js
 */
require('dotenv').config();
const { sequelize } = require('../config/database');
const User = require('../modules/userManagement/models/User');

const accounts = [
  {
    name: 'Super Admin',
    email: 'admin@travelgenie.com',
    password_hash: 'Admin@123',
    role: 'admin',
    phone: '+94771234567',
    gender: 'male',
    date_of_birth: '1990-06-15',
    nic: '900000000V',
    address: {
      street: '123 Admin Street',
      city: 'Colombo',
      state: 'Western Province',
      country: 'Sri Lanka',
      zipCode: '00100',
    },
    isActive: true,
  },
  {
    name: 'Amara Perera',
    email: 'user@travelgenie.com',
    password_hash: 'User@123',
    role: 'user',
    phone: '+94712345678',
    gender: 'female',
    date_of_birth: '1997-03-22',
    nic: '970000000V',
    address: {
      street: '45 Kandy Road',
      city: 'Kandy',
      state: 'Central Province',
      country: 'Sri Lanka',
      zipCode: '20000',
    },
    isActive: true,
  },
];

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to PostgreSQL');
  } catch (err) {
    console.error('❌ DB connection failed:', err.message);
    process.exit(1);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  TravelGenie — Seed Accounts');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const data of accounts) {
    const existing = await User.findOne({ where: { email: data.email } });
    if (existing) {
      console.log(`⚠️  Skipped (already exists): ${data.email}`);
      continue;
    }

    try {
      const user = await User.create(data);
      const icon = data.role === 'admin' ? '👑' : '👤';
      console.log(`✅ Created ${icon} ${data.role.toUpperCase()}`);
      console.log(`   Name   : ${data.name}`);
      console.log(`   Email  : ${data.email}`);
      console.log(`   Pass   : ${data.password_hash}`);
      console.log(`   Gender : ${data.gender}`);
      console.log(`   DOB    : ${data.date_of_birth}`);
      console.log(`   ID     : ${user.id}`);
      console.log('');
    } catch (err) {
      console.error(`❌ Failed to create ${data.email}: ${err.message}`);
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  Change passwords after first login!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(0);
};

run();
