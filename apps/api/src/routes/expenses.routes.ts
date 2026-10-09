import { Router } from 'express';
import { deleteExpense } from '../controllers/expenses.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.delete('/:expenseId', deleteExpense);

export default router;
