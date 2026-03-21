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

// Category routes (public read)
router.get('/categories',                  getCategories);
router.post('/categories', protect, authorize('admin'), createCategory);

// All expense routes require authentication
router.use(protect);

router.get('/admin/all',                   authorize('admin'), getAllExpensesAdmin);
router.get('/stats',                       getExpenseStats);
router.get('/trip/:tripId/summary',        getTripExpenseSummary);
router.get('/trip/:tripId',                getTripExpenses);
router.get('/',                            getAllExpenses);
router.post('/',                           createExpense);
router.get('/:id',                         getExpense);
router.put('/:id',                         updateExpense);
router.delete('/:id',                      deleteExpense);

module.exports = router;
