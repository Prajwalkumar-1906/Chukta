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
  verifyPin,
  verifyEmail,
  forgotPassword,
  resetPassword,
  setup2FA,
  enable2FA,
  verify2FALogin,
  disable2FA,
  reauthenticate,
  changeEmail,
  getNotificationPreferences,
  updateNotificationPreferences,
  triggerWeeklyDigest
} from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireReAuth } from '../middleware/reauth.js';

const router = Router();

// Standard Auth
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticateToken, me);

// Email Verification & Password Reset Flow
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Re-Authentication for Sensitive Operations
router.post('/reauth', authenticateToken, reauthenticate);

// Optional TOTP 2FA
router.post('/2fa/setup', authenticateToken, setup2FA);
router.post('/2fa/enable', authenticateToken, enable2FA);
router.post('/2fa/verify', verify2FALogin);
router.post('/2fa/disable', authenticateToken, requireReAuth, disable2FA);

// Sensitive User Actions (Guarded by Re-Authentication)
router.post('/change-email', authenticateToken, requireReAuth, changeEmail);
router.get('/export-data', authenticateToken, requireReAuth, exportUserData);
router.delete('/account', authenticateToken, requireReAuth, deleteAccount);

// Notification Preferences Center
router.get('/notification-preferences', authenticateToken, getNotificationPreferences);
router.put('/notification-preferences', authenticateToken, updateNotificationPreferences);
router.post('/notification-preferences/test-digest', authenticateToken, triggerWeeklyDigest);

// Phone OTP Mock Auth
router.post('/otp/send', sendOtp);
router.post('/otp/verify', verifyOtp);

// Google Sign-In
router.post('/google', googleAuth);

// One-Click Demo Login
router.post('/demo-login', demoLogin);

// Optional Passkeys / WebAuthn
router.post('/passkeys/challenge', passkeyChallenge);
router.post('/passkeys/verify', passkeyVerify);

// Optional In-App PIN Lock
router.post('/pin/set', authenticateToken, setPin);
router.post('/pin/verify', authenticateToken, verifyPin);

export default router;

