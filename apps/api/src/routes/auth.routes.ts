import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  me,
  sendOtp,
  verifyOtp,
  googleAuth,
  demoLogin,
  exportUserData,
  deleteAccount,
  passkeyChallenge,
  passkeyVerify,
  setPin,
  verifyPin
} from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Standard Auth
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticateToken, me);

// Phone OTP Mock Auth
router.post('/otp/send', sendOtp);
router.post('/otp/verify', verifyOtp);

// Google Sign-In
router.post('/google', googleAuth);

// One-Click Demo Login
router.post('/demo-login', demoLogin);

// India DPDP Act Compliance Endpoints
router.get('/export-data', authenticateToken, exportUserData);
router.delete('/account', authenticateToken, deleteAccount);

// Optional Passkeys / WebAuthn
router.post('/passkeys/challenge', passkeyChallenge);
router.post('/passkeys/verify', passkeyVerify);

// Optional In-App PIN Lock
router.post('/pin/set', authenticateToken, setPin);
router.post('/pin/verify', authenticateToken, verifyPin);

export default router;
