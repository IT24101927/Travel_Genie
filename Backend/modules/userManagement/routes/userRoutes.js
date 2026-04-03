const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyResetCode,
  sendVerificationCode,
  verifyEmailCode,
  getAllUsers,
  getUserById,
  updateUser,
  deleteOwnAccount,
  deleteUser,
  createUser
} = require('../controllers/userController');

const { protect, authorize } = require('../../../middleware/auth');
const {
  positiveIntParam,
  requireFields,
  requireAtLeastOneField,
} = require('../../../middleware/requestValidation');

// Public routes
router.post('/register', requireFields(['name', 'email', 'password']), register);
router.post('/login', requireFields(['email', 'password']), login);
router.post('/forgot-password', requireFields(['email']), forgotPassword);
router.post('/verify-reset-code', requireFields(['email', 'code']), verifyResetCode);
router.post('/reset-password', requireFields(['email', 'code', 'password']), resetPassword);
router.post('/send-verification-code', requireFields(['email']), sendVerificationCode);
router.post('/verify-email-code', requireFields(['email', 'code']), verifyEmailCode);

// Protected routes (authenticated users)
router.get('/profile', protect, getProfile);
router.put('/profile', protect, requireAtLeastOneField(['name', 'phone', 'date_of_birth', 'nic', 'address', 'avatar', 'gender']), updateProfile);
router.delete('/profile', protect, deleteOwnAccount);
router.put('/change-password', protect, requireFields(['currentPassword', 'newPassword']), changePassword);

// Admin only routes
router.get('/', protect, authorize('admin'), getAllUsers);
router.post('/', protect, authorize('admin'), requireFields(['name', 'email', 'password']), createUser);
router.get('/:id', protect, authorize('admin'), positiveIntParam('id'), getUserById);
router.put('/:id', protect, authorize('admin'), positiveIntParam('id'), requireAtLeastOneField(['name', 'email', 'password', 'phone', 'date_of_birth', 'nic', 'gender', 'role', 'isActive', 'avatar', 'address']), updateUser);
router.delete('/:id', protect, authorize('admin'), positiveIntParam('id'), deleteUser);

module.exports = router;
