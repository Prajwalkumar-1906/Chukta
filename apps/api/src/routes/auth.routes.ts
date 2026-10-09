import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  me,
  sendOtp,
  verifyOtp,
  googleAuth
} from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticateToken, me);
router.post('/otp/send', sendOtp);
router.post('/otp/verify', verifyOtp);
router.post('/google', googleAuth);

export default router;
