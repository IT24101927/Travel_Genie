# 👥 User Database Seeding Scripts

Quick reference for adding users to your TravelGenie database.

---

## 🎯 Available Scripts

### 1. **Create Admin User**
```bash
npm run seed:admin
```
Creates an admin user with full privileges.

**Credentials:**
- Email: `admin@travelgenie.com`
- Password: `admin123`
- Role: `admin`

---

### 2. **Create Regular User**
```bash
npm run seed:user
```
Creates a regular test user.

**Credentials:**
- Email: `user@travelgenie.com`
- Password: `user123`
- Role: `user`

---

### 3. **Create Multiple Test Users**
```bash
npm run seed:testusers
```
Creates 5 test users at once for testing purposes.

**Test Users:**
- john@example.com (password123)
- jane@example.com (password123)
- mike@example.com (password123)
- sarah@example.com (password123)
- david@example.com (password123)

All passwords: `password123`

---

### 4. **Add Custom User (Interactive)**
```bash
npm run add:user
```
Prompts you to enter custom user details:
- Name
- Email
- Password
- Role (user/admin)
- Phone (optional)
- Gender (optional)

---

### 5. **List All Users**
```bash
npm run list:users
```
Displays all users in the database with their details:
- ID, Name, Email, Role
- Phone, Gender, Active status
- Created date, Last login

---

## 📊 Current Database Users

```
👑 Admin User
   📧 admin@travelgenie.com
   🔑 admin123

👨 Test User
   📧 user@travelgenie.com
   🔑 user123
```

---

## 🔧 Script Files Location

All seed scripts are in: `Backend/utils/`

- `seedAdmin.js` - Admin user seeder
- `seedUser.js` - Regular user seeder
- `seedTestUsers.js` - Multiple test users seeder
- `addUser.js` - Interactive custom user creation
- `listUsers.js` - List all database users

---

## 💡 Usage Examples

### Quick Setup (Admin + User)
```bash
cd Backend
npm run seed:admin
npm run seed:user
```

### Add Multiple Test Users
```bash
npm run seed:testusers
```

### Add Your Own User
```bash
npm run add:user
# Follow the prompts
```

### Check All Users
```bash
npm run list:users
```

---

## ⚠️ Important Notes

1. **Duplicate Prevention**: Scripts check if user exists before creating
2. **Password Hashing**: Passwords are automatically hashed using bcrypt
3. **Database Connection**: Scripts connect to your Neon database via .env
4. **Default Password**: Test users use simple passwords (change in production!)

---

## 🔐 Security Reminders

- ✅ Change default passwords before deploying to production
- ✅ Use strong passwords for admin accounts
- ✅ Never commit .env file with real credentials
- ✅ Regularly audit user accounts

---

## 📝 User Model Fields

```javascript
{
  name: String(50) - Required
  email: String - Required, Unique
  password: String - Required (auto-hashed)
  role: 'user' | 'admin' - Default: 'user'
  phone: String - Optional
  dateOfBirth: Date - Optional
  gender: 'male' | 'female' | 'other' - Optional
  nic: String - Optional
  avatar: Text - Optional
  address: JSONB - Optional
  isActive: Boolean - Default: true
  lastLogin: Date - Optional
}
```

---

## 🆘 Troubleshooting

### "User already exists"
The user with that email is already in the database. Use a different email or check existing users with `npm run list:users`.

### "Database connection error"
Check your `.env` file has the correct `DATABASE_URL` for Neon.

### "Validation error"
Ensure email format is valid and all required fields are provided.

---

**Last Updated:** March 18, 2026
