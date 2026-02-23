const express = require('express');
const router = express.Router();
const {
  getAllExpenses,
  getAllExpensesAdmin,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpensesByTrip,
  getExpenseStats
} = require('../controllers/expenseController');

const { protect, authorize } = require('../../../middleware/auth');

// All routes are protected (require authentication)
router.use(protect);

router.get('/admin/all', authorize('admin'), getAllExpensesAdmin);
router.get('/', getAllExpenses);
router.get('/stats', getExpenseStats);
router.get('/trip/:tripId', getExpensesByTrip);
router.post('/', createExpense);
router.get('/:id', getExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
