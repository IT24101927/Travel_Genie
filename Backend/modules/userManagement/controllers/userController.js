const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const UserPreference = require('../models/UserPreference');
const TravelStyle = require('../models/TravelStyle');
const TripItinerary = require('../../tripItineraryManagement/models/TripItinerary');
const Expense = require('../../expenseManagement/models/Expense');
const Review = require('../../feedbackManagement/models/Review');
const Notification = require('../../notificationManagement/models/Notification');
const Tag = require('../../tagManagement/models/Tag');
const UserInterest = require('../models/UserInterest');
const { successResponse, errorResponse } = require('../../../utils/helpers');
const { sequelize } = require('../../../config/database');

function normalizeNic(value) {
  if (value === undefined || value === null) return null;
  const nic = String(value).trim();
  if (!nic) return null;
  if (/^\d{9}[vVxX]$/.test(nic)) return nic.slice(0, 9) + nic.slice(9).toUpperCase();
  return nic;
}

function isValidSriLankanNic(value) {
  if (value === undefined || value === null || String(value).trim() === '') return true;
  const nic = String(value).trim();
  return /^\d{12}$/.test(nic) || /^\d{9}[VvXx]$/.test(nic);
}

function isPasswordValid(password) {
  if (typeof password !== 'string') return false;
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[!@#$%^&*()\-_=+\[\]{};:'",.<>?/\\|`~]/.test(password)
  );
}

function normalizePhone(value) {
  if (value === undefined || value === null) return null;
  const digits = String(value).replace(/\D/g, '');
  return digits || null;
}

function isValidLocalPhone(value) {
  if (value === undefined || value === null || String(value).trim() === '') return true;
  const phone = normalizePhone(value);
  return /^0\d{9}$/.test(phone || '');
}

function isUsersPrimaryKeyConflict(error) {
  if (!error || error.name !== 'SequelizeUniqueConstraintError') return false;
  const detail = error.original?.detail || error.parent?.detail || '';
  const constraint = error.original?.constraint || error.parent?.constraint || '';
  const fields = error.fields ? Object.keys(error.fields) : [];
  return constraint === 'users_pkey'
    || fields.includes('id')
    || /Key \(id\)=\(.+\) already exists/i.test(detail);
}

async function syncUsersIdSequence() {
  await sequelize.query(`
    SELECT setval(
      pg_get_serial_sequence('users', 'id'),
      GREATEST((SELECT COALESCE(MAX(id), 0) + 1 FROM users), 1),
      false
    );
  `);
}

async function deleteUserRelatedData(userId, transaction) {
  await Notification.destroy({ where: { user_id: userId }, transaction });
  await Review.destroy({ where: { user_id: userId }, transaction });
  await Expense.destroy({ where: { user_id: userId }, transaction });
  await UserInterest.destroy({ where: { user_id: userId }, transaction });
  await UserPreference.destroy({ where: { user_id: userId }, transaction });
  await TripItinerary.destroy({ where: { user_id: userId }, transaction });
}

/* ── In-memory store for signup email verification codes ── */
// email -> { codeHash: string, expire: Date }
const signupCodes = new Map();

/* ── In-memory store for password reset codes ── */
// email -> { codeHash: string, expire: Date }
const resetCodes = new Map();

/* ── Email helper ── */
async function sendResetEmail(email, code) {
  // Always print the code to terminal
  console.log(`\n========================================`);
  console.log(`[ForgotPassword] Reset code for: ${email}`);
  console.log(`[ForgotPassword] CODE: ${code}`);
  console.log(`[ForgotPassword] Expires in 15 minutes`);
  console.log(`========================================\n`);

  // Only send email to Gmail addresses
  const domain = email.split('@')[1]?.toLowerCase();
  if (domain !== 'gmail.com') return;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return;

  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"TravelGenie" <${user}>`,
      to: email,
      subject: 'TravelGenie – Password Reset Code',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#4f46e5">Password Reset</h2>
          <p>Use the 6-digit code below to reset your TravelGenie password. It expires in <strong>15 minutes</strong>.</p>
          <div style="background:#f3f4f6;border-radius:8px;padding:24px;text-align:center;font-size:36px;letter-spacing:8px;font-weight:bold;color:#1f2937">${code}</div>
          <p style="margin-top:16px;color:#6b7280;font-size:13px">If you did not request this, please ignore this email.</p>
        </div>`,
    });
    console.log(`[ForgotPassword] Email sent to ${email}`);
  } catch (err) {
    console.log(`[ForgotPassword] Email delivery failed: ${err.message}`);
  }
}

/* ── Email helper for signup verification ── */
async function sendVerificationEmail(email, code) {
  // Always print the code to terminal
  console.log(`\n========================================`);
  console.log(`[SignupVerify] Verification code for: ${email}`);
  console.log(`[SignupVerify] CODE: ${code}`);
  console.log(`[SignupVerify] Expires in 15 minutes`);
  console.log(`========================================\n`);

  // Only send email to Gmail addresses
  const domain = email.split('@')[1]?.toLowerCase();
  if (domain !== 'gmail.com') return;

  const host       = process.env.SMTP_HOST;
  const user_email = process.env.SMTP_USER;
  const user_pass  = process.env.SMTP_PASS;
  if (!host || !user_email || !user_pass) return;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: user_email, pass: user_pass },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"TravelGenie" <${user_email}>`,
      to: email,
      subject: 'TravelGenie – Email Verification Code',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#0E7C5F">Verify your email</h2>
          <p>Use the 6-digit code below to verify your email address. It expires in <strong>15 minutes</strong>.</p>
          <div style="background:#f3f4f6;border-radius:8px;padding:24px;text-align:center;font-size:36px;letter-spacing:8px;font-weight:bold;color:#1f2937">${code}</div>
          <p style="color:#6b7280;font-size:13px;margin-top:16px">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
    console.log(`[SignupVerify] Email sent to ${email}`);
  } catch (err) {
    console.log(`[SignupVerify] Email delivery failed: ${err.message}`);
  }
}

// @desc    Register new user
// @route   POST /api/users/register  @access Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone, date_of_birth, nic, gender, avatar,
            interests, travelStyle, currency } = req.body;

    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!isValidSriLankanNic(nic)) {
      return res.status(400).json(errorResponse('NIC must be either 12 digits or 9 digits followed by V/v (X/x also accepted)'));
    }

    if (!isPasswordValid(password)) {
      return res.status(400).json(errorResponse('Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.'));
    }

    if (!isValidLocalPhone(phone)) {
      return res.status(400).json(errorResponse('Phone number must be exactly 10 digits and start with 0'));
    }

    const normalizedNic = normalizeNic(nic);
    const normalizedPhone = normalizePhone(phone);

    const userExists = await User.findOne({ where: { email: normalizedEmail } });
    if (userExists) return res.status(400).json(errorResponse('User already exists'));

    // Pack extra profile data into the address JSONB column
    const addressData = {
      travelStyle: travelStyle || null,
      interests:   Array.isArray(interests) ? interests : [],
      prefs: { currency: currency || 'LKR' },
    };

    let user;
    const userPayload = {
      name, email: normalizedEmail, password_hash: password, phone: normalizedPhone, date_of_birth, nic: normalizedNic, gender,
      avatar: avatar || '', address: addressData,
    };

    try {
      user = await User.create(userPayload);
    } catch (createError) {
      if (!isUsersPrimaryKeyConflict(createError)) throw createError;
      await syncUsersIdSequence();
      user = await User.create(userPayload);
    }

    // Create user_preferences row and resolve travel style
    try {
      const prefData = { user_id: user.id };
      if (travelStyle) {
        const style = await TravelStyle.findOne({ where: { style_name: travelStyle } });
        if (style) prefData.style_id = style.style_id;
      }
      prefData.regional_prefs = { currency: currency || 'LKR' };
      await UserPreference.create(prefData);
    } catch { /* pref row creation is non-critical */ }

    // Save interests to user_interests junction table (map interest names to tags)
    try {
      if (Array.isArray(interests) && interests.length > 0) {
        const tags = await Tag.findAll({ where: { tag_name: { [require('sequelize').Op.in]: interests } } });
        if (tags.length > 0) {
          const rows = tags.map(t => ({ user_id: user.id, tag_id: t.tag_id }));
          await UserInterest.bulkCreate(rows, { ignoreDuplicates: true });
        }
      }
    } catch { /* interest linking is non-critical */ }

    const token = user.getSignedJwtToken();
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: user.id, name: user.name, email: user.email, role: user.role,
          phone: user.phone, date_of_birth: user.date_of_birth, nic: user.nic,
          gender: user.gender, avatar: user.avatar || '',
          address: user.address,
          travelStyle: user.address?.travelStyle || null,
          interests:   user.address?.interests   || [],
          preferences: user.address?.prefs       || {},
        },
      },
    });
  } catch (error) { next(error); }
};

// @desc    Login user  @route POST /api/users/login  @access Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json(errorResponse('Please provide email and password'));

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await User.findOne({ where: { email: normalizedEmail }, attributes: { include: ['password_hash'] } });
    if (!user) return res.status(401).json(errorResponse('Invalid credentials'));

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json(errorResponse('Invalid credentials'));

    if (!user.isActive) return res.status(401).json(errorResponse('Account is deactivated'));

    user.lastLogin = new Date();
    await user.save();

    const token = user.getSignedJwtToken();
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id, name: user.name, email: user.email, role: user.role,
          phone: user.phone, date_of_birth: user.date_of_birth, nic: user.nic,
          gender: user.gender, avatar: user.avatar || '',
          address: user.address,
          travelStyle: user.address?.travelStyle || null,
          interests:   user.address?.interests   || [],
          preferences: user.address?.prefs       || {},
        },
      },
    });
  } catch (error) { next(error); }
};

// @desc    Get current user profile  @route GET /api/users/profile  @access Private
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    res.status(200).json(successResponse(user, 'Profile fetched successfully'));
  } catch (error) { next(error); }
};

// @desc    Update user profile  @route PUT /api/users/profile  @access Private
exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'date_of_birth', 'nic', 'address', 'avatar', 'gender'];
    const fieldsToUpdate = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) fieldsToUpdate[k] = req.body[k]; });

    if (!isValidSriLankanNic(fieldsToUpdate.nic)) {
      return res.status(400).json(errorResponse('NIC must be either 12 digits or 9 digits followed by V/v (X/x also accepted)'));
    }
    if (Object.prototype.hasOwnProperty.call(fieldsToUpdate, 'nic')) {
      fieldsToUpdate.nic = normalizeNic(fieldsToUpdate.nic);
    }

    if (!isValidLocalPhone(fieldsToUpdate.phone)) {
      return res.status(400).json(errorResponse('Phone number must be exactly 10 digits and start with 0'));
    }
    if (Object.prototype.hasOwnProperty.call(fieldsToUpdate, 'phone')) {
      fieldsToUpdate.phone = normalizePhone(fieldsToUpdate.phone);
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json(errorResponse('User not found'));

    // Merge address JSONB — don't overwrite existing keys (e.g. prefs, privacy)
    if (fieldsToUpdate.address) {
      fieldsToUpdate.address = { ...(user.address || {}), ...fieldsToUpdate.address };
    }

    await user.update(fieldsToUpdate);
    res.status(200).json(successResponse(user, 'Profile updated successfully'));
  } catch (error) { next(error); }
};

// @desc    Change password  @route PUT /api/users/change-password  @access Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!isPasswordValid(newPassword)) {
      return res.status(400).json(errorResponse('Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.'));
    }

    const user = await User.findOne({ where: { id: req.user.id }, attributes: { include: ['password_hash'] } });

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(401).json(errorResponse('Current password is incorrect'));

    user.password_hash = newPassword;
    await user.save();
    res.status(200).json(successResponse(null, 'Password changed successfully'));
  } catch (error) { next(error); }
};

// @desc    Forgot password – generate & email 6-digit code
// @route   POST /api/users/forgot-password  @access Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json(errorResponse('Email is required'));

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await User.findOne({ where: { email: normalizedEmail } });

    // Always respond the same way to prevent email enumeration
    if (!user) {
      return res.status(200).json(successResponse(null, 'If that email is registered, a reset code has been sent'));
    }

    // Generate 6-digit numeric code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expire = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store hashed code + expiry in memory (no DB write needed)
    const salt = await bcrypt.genSalt(10);
    const codeHash = await bcrypt.hash(code, salt);
    resetCodes.set(normalizedEmail, { codeHash, expire });

    await sendResetEmail(normalizedEmail, code);

    res.status(200).json(successResponse(null, 'If that email is registered, a reset code has been sent'));
  } catch (error) { next(error); }
};

// @desc    Verify reset code (without consuming it)
// @route   POST /api/users/verify-reset-code  @access Public
exports.verifyResetCode = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code)
      return res.status(400).json(errorResponse('Email and code are required'));

    const normalizedEmail = String(email).trim().toLowerCase();

    const entry = resetCodes.get(normalizedEmail);
    if (!entry) return res.status(400).json(errorResponse('Invalid or expired reset code'));

    if (new Date() > entry.expire) {
      resetCodes.delete(normalizedEmail);
      return res.status(400).json(errorResponse('Reset code has expired'));
    }

    const isMatch = await bcrypt.compare(code, entry.codeHash);
    if (!isMatch) return res.status(400).json(errorResponse('Invalid reset code'));

    res.status(200).json(successResponse(null, 'Code verified'));
  } catch (error) { next(error); }
};

// @desc    Reset password with code
// @route   POST /api/users/reset-password  @access Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, code, password } = req.body;
    if (!email || !code || !password)
      return res.status(400).json(errorResponse('Email, code and new password are required'));

    if (!isPasswordValid(password)) {
      return res.status(400).json(errorResponse('Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.'));
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const entry = resetCodes.get(normalizedEmail);
    if (!entry) return res.status(400).json(errorResponse('Invalid or expired reset code'));

    if (new Date() > entry.expire) {
      resetCodes.delete(normalizedEmail);
      return res.status(400).json(errorResponse('Invalid or expired reset code'));
    }

    const isMatch = await bcrypt.compare(code, entry.codeHash);
    if (!isMatch) return res.status(400).json(errorResponse('Invalid or expired reset code'));

    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) return res.status(400).json(errorResponse('User not found'));

    // Update password and clear the in-memory entry
    user.password_hash = password;
    await user.save();
    resetCodes.delete(normalizedEmail);

    res.status(200).json(successResponse(null, 'Password reset successfully'));
  } catch (error) { next(error); }
};

// @desc    Send signup email verification code
// @route   POST /api/users/send-verification-code  @access Public
exports.sendVerificationCode = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json(errorResponse('Email is required'));

    const normalizedEmail = String(email).trim().toLowerCase();

    // Check if email is already taken
    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing) return res.status(409).json(errorResponse('An account with this email already exists'));

    // Generate 6-digit code
    const code   = Math.floor(100000 + Math.random() * 900000).toString();
    const expire = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const salt     = await bcrypt.genSalt(10);
    const codeHash = await bcrypt.hash(code, salt);

    signupCodes.set(normalizedEmail, { codeHash, expire });

    await sendVerificationEmail(normalizedEmail, code);

    res.status(200).json(successResponse(null, 'Verification code sent'));
  } catch (error) { next(error); }
};

// @desc    Verify signup email code
// @route   POST /api/users/verify-email-code  @access Public
exports.verifyEmailCode = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json(errorResponse('Email and code are required'));

    const normalizedEmail = String(email).trim().toLowerCase();

    const entry = signupCodes.get(normalizedEmail);
    if (!entry) return res.status(400).json(errorResponse('No verification code found for this email. Please request a new one.'));

    if (new Date() > entry.expire) {
      signupCodes.delete(normalizedEmail);
      return res.status(400).json(errorResponse('Verification code has expired. Please request a new one.'));
    }

    const isMatch = await bcrypt.compare(code, entry.codeHash);
    if (!isMatch) return res.status(400).json(errorResponse('Invalid verification code'));

    // Keep the entry so the register route can optionally reference it, but mark it verified
    // (we simply leave it; it auto-expires and is cleared on next send or after registration)
    res.status(200).json(successResponse(null, 'Email verified successfully'));
  } catch (error) { next(error); }
};

// @desc    Get all users (Admin)  @route GET /api/users  @access Private/Admin
exports.getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count: totalUsers, rows: users } = await User.findAndCountAll({
      offset, limit, order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true, count: users.length, total: totalUsers, page,
      pages: Math.ceil(totalUsers / limit), data: users,
    });
  } catch (error) { next(error); }
};

// @desc    Get single user (Admin)  @route GET /api/users/:id  @access Private/Admin
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json(errorResponse('User not found'));
    res.status(200).json(successResponse(user, 'User fetched successfully'));
  } catch (error) { next(error); }
};

// @desc    Update user (Admin)  @route PUT /api/users/:id  @access Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json(errorResponse('User not found'));
    const { password, ...fields } = req.body;

    if (!isValidSriLankanNic(fields.nic)) {
      return res.status(400).json(errorResponse('NIC must be either 12 digits or 9 digits followed by V/v (X/x also accepted)'));
    }
    if (Object.prototype.hasOwnProperty.call(fields, 'nic')) {
      fields.nic = normalizeNic(fields.nic);
    }

    if (!isValidLocalPhone(fields.phone)) {
      return res.status(400).json(errorResponse('Phone number must be exactly 10 digits and start with 0'));
    }
    if (Object.prototype.hasOwnProperty.call(fields, 'phone')) {
      fields.phone = normalizePhone(fields.phone);
    }

    if (password) fields.password_hash = password;
    // Merge address JSONB instead of overwriting
    if (fields.address) {
      fields.address = { ...(user.address || {}), ...fields.address };
    }
    await user.update(fields);
    res.status(200).json(successResponse(user, 'User updated successfully'));
  } catch (error) { next(error); }
};

// @desc    Delete user (Admin)  @route DELETE /api/users/:id  @access Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(req.params.id, { transaction });
      if (!user) {
        const err = new Error('User not found');
        err.statusCode = 404;
        throw err;
      }
      await deleteUserRelatedData(user.id, transaction);
      await user.destroy({ transaction });
    });
    res.status(200).json(successResponse(null, 'User deleted successfully'));
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json(errorResponse(error.message));
    }
    next(error);
  }
};

// @desc    Delete own account  @route DELETE /api/users/profile  @access Private
exports.deleteOwnAccount = async (req, res, next) => {
  try {
    await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(req.user.id, { transaction });
      if (!user) {
        const err = new Error('User not found');
        err.statusCode = 404;
        throw err;
      }
      await deleteUserRelatedData(user.id, transaction);
      await user.destroy({ transaction });
    });

    res.status(200).json(successResponse(null, 'Your account has been deleted successfully'));
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json(errorResponse(error.message));
    }
    next(error);
  }
};

// @desc    Create user (Admin)  @route POST /api/users  @access Private/Admin
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, phone, gender, role, isActive, travelStyle, interests, date_of_birth, nic, currency } = req.body;
    if (!name || !email || !password) return res.status(400).json(errorResponse('Name, email, and password are required'));

    if (!isPasswordValid(password)) {
      return res.status(400).json(errorResponse('Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.'));
    }

    if (!isValidLocalPhone(phone)) {
      return res.status(400).json(errorResponse('Phone number must be exactly 10 digits and start with 0'));
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (!isValidSriLankanNic(nic)) {
      return res.status(400).json(errorResponse('NIC must be either 12 digits or 9 digits followed by V/v (X/x also accepted)'));
    }

    const normalizedNic = normalizeNic(nic);
    const normalizedPhone = normalizePhone(phone);

    const userExists = await User.findOne({ where: { email: normalizedEmail } });
    if (userExists) return res.status(400).json(errorResponse('User with this email already exists'));

    const addressData = {
      travelStyle: travelStyle || null,
      interests: Array.isArray(interests) ? interests : [],
      prefs: { currency: currency || 'LKR' },
    };

    let user;
    const userPayload = {
      name, email: normalizedEmail, password_hash: password,
      phone: normalizedPhone,
      gender: gender || null,
      date_of_birth: date_of_birth || null,
      nic: normalizedNic,
      role: role || 'user',
      isActive: isActive !== undefined ? isActive : true,
      avatar: '', address: addressData,
    };

    try {
      user = await User.create(userPayload);
    } catch (createError) {
      if (!isUsersPrimaryKeyConflict(createError)) throw createError;
      await syncUsersIdSequence();
      user = await User.create(userPayload);
    }

    res.status(201).json(successResponse(user, 'User created successfully'));
  } catch (error) { next(error); }
};
