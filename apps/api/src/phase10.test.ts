import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from './index.js';
import { prisma } from './db/prisma.js';
import { TotpService } from './services/totp.service.js';
import { securityGuardian } from './services/security.service.js';
import { emailService } from './services/email.service.js';
import { renderVerifyEmail, renderPasswordReset, renderSuspiciousLogin, renderWeeklyDigest } from './services/emailTemplates.js';
import { NotificationService } from './services/notification.service.js';
import { SUPPORTED_LOCALES } from '@chukta/shared';

describe('Phase 10: Account & Trust Standards', () => {
  beforeEach(() => {
    securityGuardian.resetAll();
    emailService.sentEmails = [];
  });

  describe('1. Email Verification & Password Reset Flow', () => {
    const testEmail = `test_p10_${Date.now()}@example.com`;
    const password = 'Password@1234';
    let verifyToken = '';

    it('registers user, creates single-use token, sends email, and gives safe non-enumerating message', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password,
          fullName: 'Ananya Roy',
          preferredLanguage: 'hi'
        });

      expect(res.status).toBe(201);
      expect(res.body.emailVerified).toBe(false);
      expect(res.body.user.email).toBe(testEmail.toLowerCase());

      // Verify email was captured in emailService
      const sent = emailService.sentEmails.find(e => e.to === testEmail.toLowerCase());
      expect(sent).toBeDefined();
      expect(sent?.subject).toContain('अपना ईमेल पता सत्यापित करें'); // Hindi locale translation check
      expect(sent?.text).toContain('Verify URL:');

      // Extract raw token from verification URL
      const match = sent?.text.match(/token=([a-f0-9]+)/);
      expect(match).toBeTruthy();
      verifyToken = match![1];

      // Second register attempt with identical email must NOT reveal user exists (non-enumerating)
      const dupRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: 'AnotherPassword99',
          fullName: 'Ananya Roy'
        });

      expect(dupRes.status).toBe(200);
      expect(dupRes.body.emailSent).toBe(true);
      expect(dupRes.body.message).toContain('If this email is eligible');
    });

    it('verifies email with valid single-use token, then rejects duplicate consumption', async () => {
      const verifyRes = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: verifyToken });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.emailVerified).toBe(true);

      // Verify DB updated
      const user = await prisma.user.findUnique({ where: { email: testEmail.toLowerCase() } });
      expect(user?.emailVerified).toBe(true);
      expect(user?.emailVerifiedAt).toBeDefined();

      // Second attempt with same token must fail (single-use)
      const repeatRes = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: verifyToken });

      expect(repeatRes.status).toBe(400);
      expect(repeatRes.body.error).toContain('Invalid or expired');
    });

    it('forgot password non-enumerating response whether email exists or not', async () => {
      // Existing email
      const resExist = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testEmail });

      expect(resExist.status).toBe(200);
      expect(resExist.body.message).toContain('If an account exists');

      // Non-existent email (must yield the exact same generic response)
      const resNonExist = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'ghost_nonexistent_user@chukta.com' });

      expect(resNonExist.status).toBe(200);
      expect(resNonExist.body.message).toBe(resExist.body.message);

      // Find password reset email dispatched for existing user
      const resetEmail = emailService.sentEmails.find(e => e.to === testEmail.toLowerCase() && e.subject.includes('पासवर्ड'));
      expect(resetEmail).toBeDefined();
      const resetTokenMatch = resetEmail?.text.match(/token=([a-f0-9]+)/);
      expect(resetTokenMatch).toBeTruthy();
      const resetToken = resetTokenMatch![1];

      // Reset password with token
      const newPassword = 'NewSecretPassword@999';
      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: resetToken, newPassword });

      expect(resetRes.status).toBe(200);

      // Verify login with new password succeeds
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: newPassword });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.accessToken).toBeDefined();
    });
  });

  describe('2. Optional TOTP 2FA & Single-Use Recovery Codes', () => {
    let authCookie = '';
    let accessToken = '';
    let secret = '';
    let recoveryCodes: string[] = [];
    const userEmail = `totp_user_${Date.now()}@example.com`;

    it('sets up 2FA QR parameters and generates 8 recovery codes', async () => {
      // Create user
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: userEmail,
          password: 'Password@2fa123',
          fullName: 'Vikram Joshi'
        });

      accessToken = regRes.body.accessToken;
      authCookie = regRes.headers['set-cookie'][0];

      // Setup 2FA
      const setupRes = await request(app)
        .post('/api/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send();

      expect(setupRes.status).toBe(200);
      expect(setupRes.body.secret).toBeDefined();
      expect(setupRes.body.otpauthUrl).toContain('otpauth://totp/');
      expect(setupRes.body.recoveryCodes).toHaveLength(8);

      secret = setupRes.body.secret;
      recoveryCodes = setupRes.body.recoveryCodes;
    });

    it('enables 2FA by verifying valid TOTP token', async () => {
      const validOtp = TotpService.generateToken(secret);

      const enableRes = await request(app)
        .post('/api/v1/auth/2fa/enable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          secret,
          token: validOtp,
          recoveryCodes
        });

      expect(enableRes.status).toBe(200);
      expect(enableRes.body.message).toContain('enabled');

      // Verify DB shows 2FA enabled
      const user = await prisma.user.findUnique({ where: { email: userEmail.toLowerCase() } });
      expect(user?.twoFactorEnabled).toBe(true);

      const dbCodes = await prisma.twoFactorRecoveryCode.findMany({ where: { userId: user!.id } });
      expect(dbCodes).toHaveLength(8);
      expect(dbCodes[0].used).toBe(false);
    });

    it('login prompts for 2FA and succeeds with valid TOTP code', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: userEmail, password: 'Password@2fa123' });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.requires2FA).toBe(true);
      expect(loginRes.body.tempToken).toBeDefined();

      const tempToken = loginRes.body.tempToken;
      const validOtp = TotpService.generateToken(secret);

      const verify2FARes = await request(app)
        .post('/api/v1/auth/2fa/verify')
        .send({ tempToken, code: validOtp });

      expect(verify2FARes.status).toBe(200);
      expect(verify2FARes.body.accessToken).toBeDefined();
      expect(verify2FARes.body.user.email).toBe(userEmail.toLowerCase());
    });

    it('login succeeds with single-use recovery code and marks it redeemed', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: userEmail, password: 'Password@2fa123' });

      const tempToken = loginRes.body.tempToken;
      const testCode = recoveryCodes[0];

      const verify2FARes = await request(app)
        .post('/api/v1/auth/2fa/verify')
        .send({ tempToken, recoveryCode: testCode });

      expect(verify2FARes.status).toBe(200);
      expect(verify2FARes.body.accessToken).toBeDefined();

      // Using the same recovery code again must fail
      const loginAgain = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: userEmail, password: 'Password@2fa123' });

      const duplicateUse = await request(app)
        .post('/api/v1/auth/2fa/verify')
        .send({ tempToken: loginAgain.body.tempToken, recoveryCode: testCode });

      expect(duplicateUse.status).toBe(400);
      expect(duplicateUse.body.error).toContain('Invalid 2FA code or recovery code');
    });

    it('disabling 2FA requires re-authentication', async () => {
      // Attempting to disable without re-auth token must be blocked (403)
      const blockedRes = await request(app)
        .post('/api/v1/auth/2fa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send();

      expect(blockedRes.status).toBe(403);
      expect(blockedRes.body.code).toBe('REAUTH_REQUIRED');

      // Perform re-authentication
      const reAuthRes = await request(app)
        .post('/api/v1/auth/reauth')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: 'Password@2fa123' });

      expect(reAuthRes.status).toBe(200);
      expect(reAuthRes.body.reAuthToken).toBeDefined();
      const reAuthToken = reAuthRes.body.reAuthToken;

      // Now disable with re-auth token in header
      const disableRes = await request(app)
        .post('/api/v1/auth/2fa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-reauth-token', reAuthToken)
        .send();

      expect(disableRes.status).toBe(200);

      const user = await prisma.user.findUnique({ where: { email: userEmail.toLowerCase() } });
      expect(user?.twoFactorEnabled).toBe(false);
      expect(user?.twoFactorSecret).toBeNull();
    });
  });

  describe('3. Brute-Force Guardian & Suspicious Login Alerts', () => {
    it('applies lockout after 5 consecutive failed attempts and triggers security alert email on suspicious login', async () => {
      const email = `lockout_${Date.now()}@test.com`;
      const pass = 'CorrectPass123!';

      await request(app)
        .post('/api/v1/auth/register')
        .send({ email, password: pass, fullName: 'Security Tester' });

      emailService.sentEmails = [];

      // 4 consecutive bad attempts
      for (let i = 0; i < 4; i++) {
        const failRes = await request(app)
          .post('/api/v1/auth/login')
          .send({ email, password: 'WrongPassword!' });
        expect(failRes.status).toBe(401);
      }

      // 5th bad attempt triggers lockout
      const fifthRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: 'WrongPassword!' });

      expect(fifthRes.status).toBe(401);

      // 6th attempt is locked out with 429
      const lockedRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: pass });

      expect(lockedRes.status).toBe(429);
      expect(lockedRes.body.code).toBe('ACCOUNT_LOCKED');

      // Reset guardian for testing successful suspicious recovery
      securityGuardian.resetAll();

      // Successful login after failed attempts triggers "Was this you?" alert email
      await securityGuardian.recordFailedAttempt(email, '127.0.0.1');
      const recoveredRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: pass });

      expect(recoveredRes.status).toBe(200);

      // Verify alert email dispatched
      const alertEmail = emailService.sentEmails.find(e => e.to === email && e.subject.includes('Was this you?'));
      expect(alertEmail).toBeDefined();
    });
  });

  describe('4. Re-Authentication for Sensitive Operations', () => {
    let accessToken = '';
    const userEmail = `sensitive_${Date.now()}@example.com`;
    const password = 'SafePassword123';

    it('blocks export, change email, and delete account without re-auth', async () => {
      const reg = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: userEmail, password, fullName: 'Priya Sharma' });

      accessToken = reg.body.accessToken;

      // 1. Export Data blocked
      const exportBlocked = await request(app)
        .get('/api/v1/auth/export-data')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(exportBlocked.status).toBe(403);
      expect(exportBlocked.body.code).toBe('REAUTH_REQUIRED');

      // 2. Change Email blocked
      const changeBlocked = await request(app)
        .post('/api/v1/auth/change-email')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ newEmail: 'priya_new@example.com' });
      expect(changeBlocked.status).toBe(403);

      // 3. Delete Account blocked
      const deleteBlocked = await request(app)
        .delete('/api/v1/auth/account')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(deleteBlocked.status).toBe(403);

      // Authenticate with valid password
      const reAuthRes = await request(app)
        .post('/api/v1/auth/reauth')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password });
      expect(reAuthRes.status).toBe(200);
      const reAuthToken = reAuthRes.body.reAuthToken;

      // Change email now succeeds with re-auth token
      const changeEmailRes = await request(app)
        .post('/api/v1/auth/change-email')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-reauth-token', reAuthToken)
        .send({ newEmail: `priya_verified_${Date.now()}@example.com` });

      expect(changeEmailRes.status).toBe(200);
      expect(changeEmailRes.body.emailVerified).toBe(false);

      // Export data now succeeds with re-auth token
      const exportRes = await request(app)
        .get('/api/v1/auth/export-data')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-reauth-token', reAuthToken);

      expect(exportRes.status).toBe(200);
      expect(exportRes.body.data.fullName).toBe('Priya Sharma');
    });
  });

  describe('5. Notification Preferences Center & Quiet Hours', () => {
    let accessToken = '';
    let userId = '';

    it('fetches default preferences and updates channels & quiet-hours', async () => {
      const email = `notif_${Date.now()}@example.com`;
      const reg = await request(app)
        .post('/api/v1/auth/register')
        .send({ email, password: 'Password123', fullName: 'Kavita Nair' });

      accessToken = reg.body.accessToken;
      userId = reg.body.user.id;

      // GET default preferences
      const getRes = await request(app)
        .get('/api/v1/auth/notification-preferences')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.preferences.inApp).toBe(true);
      expect(getRes.body.preferences.email).toBe(true);
      expect(getRes.body.preferences.weeklyDigest).toBe(true);
      expect(getRes.body.preferences.quietHoursEnabled).toBe(false);

      // PUT update preferences: enable quiet hours 23:00 to 07:00
      const putRes = await request(app)
        .put('/api/v1/auth/notification-preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: false,
          quietHoursEnabled: true,
          quietHoursStart: '23:00',
          quietHoursEnd: '07:00',
          timezone: 'Asia/Kolkata'
        });

      expect(putRes.status).toBe(200);
      expect(putRes.body.preferences.email).toBe(false);
      expect(putRes.body.preferences.quietHoursEnabled).toBe(true);

      // Test NotificationService evaluation
      const canEmail = await NotificationService.canSend(userId, 'email', 'expenseAdded');
      expect(canEmail).toBe(false); // Because email channel was turned off

      const canInApp = await NotificationService.canSend(userId, 'inApp', 'expenseAdded');
      expect(canInApp).toBe(true);

      // Test manual trigger of weekly digest
      const digestRes = await request(app)
        .post('/api/v1/auth/notification-preferences/test-digest')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(digestRes.status).toBe(200);
      expect(digestRes.body.message).toContain('Weekly digest');
    });
  });

  describe('6. Transactional Email Templates in All 10 Supported Locales', () => {
    it('renders all email templates across en, hi, bn, mr, ta, te, kn, ml, gu, pa with plain-text fallback', () => {
      for (const locale of SUPPORTED_LOCALES) {
        // Verify email
        const v = renderVerifyEmail({ name: 'Rahul', url: 'https://chukta.app/verify', locale });
        expect(v.subject).toBeDefined();
        expect(v.html).toContain('Chukta');
        expect(v.text).toContain('https://chukta.app/verify');

        // Reset password
        const r = renderPasswordReset({ name: 'Rahul', url: 'https://chukta.app/reset', locale });
        expect(r.subject).toBeDefined();
        expect(r.html).toContain('Chukta');
        expect(r.text).toContain('https://chukta.app/reset');

        // Suspicious login
        const s = renderSuspiciousLogin({
          name: 'Rahul',
          ip: '49.207.12.34',
          device: 'Chrome on MacOS',
          time: '24 Oct 2026, 08:30 AM',
          locale
        });
        expect(s.subject).toBeDefined();
        expect(s.html).toContain('49.207.12.34');
        expect(s.text).toContain('Chrome on MacOS');

        // Weekly digest
        const d = renderWeeklyDigest({
          name: 'Rahul',
          owedRupees: 2450,
          oweRupees: 800,
          activeGroups: 3,
          url: 'https://chukta.app/dashboard',
          locale
        });
        expect(d.subject).toBeDefined();
        expect(d.html).toContain('2,450');
        expect(d.text).toContain('₹2450');
      }
    });
  });
});
