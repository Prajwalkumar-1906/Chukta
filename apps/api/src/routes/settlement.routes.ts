import { Router } from 'express';
import { createSettlement, recordPayment, confirmPayment } from '../controllers/settlement.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.post('/settlements', createSettlement);
router.post('/payments', recordPayment);
router.post('/payments/:paymentId/confirm', confirmPayment);

export default router;
