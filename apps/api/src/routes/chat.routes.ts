import { Router } from 'express';
import { processChat } from '../controllers/chat.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.post('/chat', processChat);

export default router;
