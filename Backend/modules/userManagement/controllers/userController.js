const { Op } = require('sequelize');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../../../utils/helpers');

// @desc    Register new user
// @route   POST /api/users/register  @access Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone, dateOfBirth, nic, interests, travelStyle } = req.body;

    const userExists = await User.findOne({ where: { email } });
    if (userExists) return res.status(400).json(errorResponse('User already exists'));

    const user = await User.create({
      name, email, password, phone, dateOfBirth, nic,
      interests: interests || [],
      preferences: travelStyle ? { travelStyle } : {},
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
          interests: user.interests, travelStyle: user.preferences?.travelStyle,
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
          interests: user.interests, travelStyle: user.preferences?.travelStyle,
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
    const allowed = ['name', 'phone', 'dateOfBirth', 'nic', 'interests', 'address', 'preferences', 'avatar'];
    const fieldsToUpdate = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) fieldsToUpdate[k] = req.body[k]; });

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json(errorResponse('User not found'));
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

// @desc    Forgot password  @route POST /api/users/forgot-password  @access Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json(errorResponse('No user with that email'));

    // In a real app, send reset email; here we return a simple confirmation
    res.status(200).json(successResponse(null, 'Password reset email sent'));
  } catch (error) { next(error); }
};

// @desc    Reset password  @route PUT /api/users/reset-password/:token  @access Public
exports.resetPassword = async (req, res, next) => {
  try {
    res.status(501).json(errorResponse('Reset password via email token not implemented'));
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
