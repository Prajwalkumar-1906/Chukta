import { Router } from 'express';
import {
  createGroup,
  getUserGroups,
  getGroupById,
  addMember,
  claimGuestProfile,
  getGroupBalances
} from '../controllers/groups.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { createExpense, getGroupExpenses } from '../controllers/expenses.controller.js';

const router = Router();

router.use(authenticateToken);

router.post('/', createGroup);
router.get('/', getUserGroups);
router.post('/claim-guest', claimGuestProfile);
router.get('/:id', getGroupById);
router.post('/:id/members', addMember);
router.get('/:id/balances', getGroupBalances);
router.post('/:id/expenses', createExpense);
router.get('/:id/expenses', getGroupExpenses);

export default router;
