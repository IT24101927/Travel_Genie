const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../../../utils/helpers');

/* ── In-memory store for signup email verification codes ── */
// email -> { codeHash: string, expire: Date }
const signupCodes = new Map();

/* ── In-memory store for password reset codes ── */
// email -> { codeHash: string, expire: Date }
const resetCodes = new Map();

/* ── Email helper ── */
async function sendResetEmail(email, code) {
  const domain = email.split('@')[1]?.toLowerCase();
  const isGmail = domain === 'gmail.com';

  // Non-gmail domains → always print to terminal, skip SMTP
  if (!isGmail) {
    console.log(`\n[ForgotPassword] Non-Gmail domain detected (${domain}) — skipping email.`);
    console.log(`[ForgotPassword] Reset code for ${email}: ${code}`);
    console.log(`[ForgotPassword] Code expires in 15 minutes.\n`);
    return;
  }

  // Gmail → attempt SMTP delivery
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.log(`\n[ForgotPassword] SMTP not configured.`);
    console.log(`[ForgotPassword] Reset code for ${email}: ${code}`);
    console.log(`[ForgotPassword] Code expires in 15 minutes.\n`);
    return;
  }

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
    console.log(`[ForgotPassword] Reset code sent to ${email}`);
  } catch (err) {
    console.log(`\n[ForgotPassword] Email delivery failed: ${err.message}`);
    console.log(`[ForgotPassword] Reset code for ${email}: ${code}`);
    console.log(`[ForgotPassword] Code expires in 15 minutes.\n`);
  }
}

/* ── Email helper for signup verification ── */
async function sendVerificationEmail(email, code) {
  const domain = email.split('@')[1]?.toLowerCase();
  const isGmail = domain === 'gmail.com';

  if (!isGmail) {
    console.log(`\n[SignupVerify] Non-Gmail domain detected (${domain}) — skipping email.`);
    console.log(`[SignupVerify] Verification code for ${email}: ${code}`);
    console.log(`[SignupVerify] Code expires in 15 minutes.\n`);
    return;
  }

  const user_email = process.env.EMAIL_USER;
  const user_pass  = process.env.EMAIL_PASS;

  if (!user_email || !user_pass) {
    console.log(`\n[SignupVerify] SMTP not configured.`);
    console.log(`[SignupVerify] Verification code for ${email}: ${code}`);
    console.log(`[SignupVerify] Code expires in 15 minutes.\n`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: user_email, pass: user_pass },
    });

    await transporter.sendMail({
      from: `"TravelGenie" <${user_email}>`,
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
    console.log(`[SignupVerify] Verification code sent to ${email}`);
  } catch (err) {
    console.log(`\n[SignupVerify] Email delivery failed: ${err.message}`);
    console.log(`[SignupVerify] Verification code for ${email}: ${code}`);
    console.log(`[SignupVerify] Code expires in 15 minutes.\n`);
  }
}

// @desc    Register new user
// @route   POST /api/users/register  @access Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone, dateOfBirth, nic, gender, avatar,
            interests, travelStyle, currency } = req.body;

    const userExists = await User.findOne({ where: { email } });
    if (userExists) return res.status(400).json(errorResponse('User already exists'));

    // Pack extra profile data into the address JSONB column
    const addressData = {
      travelStyle: travelStyle || null,
      interests:   Array.isArray(interests) ? interests : [],
      prefs: { currency: currency || 'LKR' },
    };

    const user = await User.create({
      name, email, password, phone, dateOfBirth, nic, gender,
      avatar: avatar || '', address: addressData,
    });

    const token = user.getSignedJwtToken();
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: user.id, name: user.name, email: user.email, role: user.role,
          phone: user.phone, dateOfBirth: user.dateOfBirth, nic: user.nic,
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

    const user = await User.findOne({ where: { email }, attributes: { include: ['password'] } });
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
          phone: user.phone, dateOfBirth: user.dateOfBirth, nic: user.nic,
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
    const allowed = ['name', 'phone', 'dateOfBirth', 'nic', 'address', 'avatar', 'gender'];
    const fieldsToUpdate = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) fieldsToUpdate[k] = req.body[k]; });

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
    const user = await User.findOne({ where: { id: req.user.id }, attributes: { include: ['password'] } });

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(401).json(errorResponse('Current password is incorrect'));

    user.password = newPassword;
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

    const user = await User.findOne({ where: { email } });

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
    resetCodes.set(email, { codeHash, expire });

    await sendResetEmail(email, code);

    res.status(200).json(successResponse(null, 'If that email is registered, a reset code has been sent'));
  } catch (error) { next(error); }
};

// @desc    Reset password with code
// @route   POST /api/users/reset-password  @access Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, code, password } = req.body;
    if (!email || !code || !password)
      return res.status(400).json(errorResponse('Email, code and new password are required'));

    const entry = resetCodes.get(email);
    if (!entry) return res.status(400).json(errorResponse('Invalid or expired reset code'));

    if (new Date() > entry.expire) {
      resetCodes.delete(email);
      return res.status(400).json(errorResponse('Invalid or expired reset code'));
    }

    const isMatch = await bcrypt.compare(code, entry.codeHash);
    if (!isMatch) return res.status(400).json(errorResponse('Invalid or expired reset code'));

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json(errorResponse('User not found'));

    // Update password and clear the in-memory entry
    user.password = password;
    await user.save();
    resetCodes.delete(email);

    res.status(200).json(successResponse(null, 'Password reset successfully'));
  } catch (error) { next(error); }
};

// @desc    Send signup email verification code
// @route   POST /api/users/send-verification-code  @access Public
exports.sendVerificationCode = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json(errorResponse('Email is required'));

    // Check if email is already taken
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json(errorResponse('An account with this email already exists'));

    // Generate 6-digit code
    const code   = Math.floor(100000 + Math.random() * 900000).toString();
    const expire = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const salt     = await bcrypt.genSalt(10);
    const codeHash = await bcrypt.hash(code, salt);

    signupCodes.set(email, { codeHash, expire });

    await sendVerificationEmail(email, code);

    res.status(200).json(successResponse(null, 'Verification code sent'));
  } catch (error) { next(error); }
};

// @desc    Verify signup email code
// @route   POST /api/users/verify-email-code  @access Public
exports.verifyEmailCode = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json(errorResponse('Email and code are required'));

    const entry = signupCodes.get(email);
    if (!entry) return res.status(400).json(errorResponse('No verification code found for this email. Please request a new one.'));

    if (new Date() > entry.expire) {
      signupCodes.delete(email);
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
    await user.update(req.body);
    res.status(200).json(successResponse(user, 'User updated successfully'));
  } catch (error) { next(error); }
};

// @desc    Delete user (Admin)  @route DELETE /api/users/:id  @access Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json(errorResponse('User not found'));
    await user.destroy();
    res.status(200).json(successResponse(null, 'User deleted successfully'));
  } catch (error) { next(error); }
};
