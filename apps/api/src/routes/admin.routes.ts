import { Router } from 'express';
import {
  triggerReconciliation,
  getReconciliationReports,
  backfillLedgerController
} from '../controllers/admin.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.post('/reconcile', triggerReconciliation);
router.get('/reconcile/reports', getReconciliationReports);
router.post('/ledger/backfill', backfillLedgerController);
router.post('/groups/:groupId/ledger/backfill', backfillLedgerController);

export default router;
