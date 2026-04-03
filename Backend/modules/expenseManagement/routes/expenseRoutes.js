const express = require('express');
const router = express.Router();
const {
  getCategories,
  createCategory,
  getAllExpenses,
  getAllExpensesAdmin,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getTripExpenses,
  getTripExpenseSummary,
  getExpenseStats,
} = require('../controllers/expenseController');

const { protect, authorize } = require('../../../middleware/auth');
const {
  positiveIntParam,
  requireFields,
  requireAtLeastOneField,
  enumField,
  numberField,
} = require('../../../middleware/requestValidation');

// Category routes (public read)
router.get('/categories',                  getCategories);
router.post('/categories', protect, authorize('admin'), requireFields(['category_name']), createCategory);

// All expense routes require authentication
router.use(protect);

router.get('/admin/all',                   authorize('admin'), getAllExpensesAdmin);
router.get('/stats',                       getExpenseStats);
router.get('/trip/:tripId/summary',        positiveIntParam('tripId', 'tripId'), getTripExpenseSummary);
router.get('/trip/:tripId',                positiveIntParam('tripId', 'tripId'), getTripExpenses);
router.get('/',                            getAllExpenses);
router.post('/',                           requireFields(['trip_id', 'amount']), enumField('expense_type', ['ESTIMATED', 'ACTUAL']), numberField('amount', { min: 0 }), createExpense);
router.get('/:id',                         positiveIntParam('id'), getExpense);
router.put('/:id',                         positiveIntParam('id'), requireAtLeastOneField(['trip_id', 'category_id', 'amount', 'currency', 'expense_date', 'note', 'expense_type', 'payment_method', 'receipt_url']), enumField('expense_type', ['ESTIMATED', 'ACTUAL']), numberField('amount', { min: 0 }), updateExpense);
router.delete('/:id',                      positiveIntParam('id'), deleteExpense);

module.exports = router;
