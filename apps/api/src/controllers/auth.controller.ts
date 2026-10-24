import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { AuthRequest } from '../middleware/auth.js';
import { emailService } from '../services/email.service.js';
import { TotpService } from '../services/totp.service.js';
import { securityGuardian } from '../services/security.service.js';
import { generateReAuthToken } from '../middleware/reauth.js';
import { NotificationService } from '../services/notification.service.js';
import { dispatchWeeklyDigest } from '../jobs/queue.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  upiId: z.string().optional(),
  preferredLanguage: z.string().default('en')
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const otpSendSchema = z.object({
  phone: z.string().min(10)
});

const otpVerifySchema = z.object({
  phone: z.string().min(10),
  code: z.string().length(6)
});

const googleAuthSchema = z.object({
  email: z.string().email(),
  fullName: z.string(),
  avatarUrl: z.string().optional(),
  googleId: z.string().optional()
});

function generateAccessToken(user: { id: string; email: string }) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

async function createRefreshToken(userId: string) {
  const token = jwt.sign({ userId, nonce: Math.random() }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId,
      token,
      expiresAt
    }
  });

  return token;
}

function setRefreshTokenCookie(res: Response, token: string) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) {
      // Non-enumerating response to avoid exposing email existence
      return res.status(200).json({
        message: 'If this email is eligible, a verification link has been sent. Please check your inbox.',
        emailSent: true
      });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        fullName: data.fullName,
        phone: data.phone,
        upiId: data.upiId || `${data.email.split('@')[0]}@upi`,
        preferredLanguage: data.preferredLanguage,
        emailVerified: false
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        phone: true,
        upiId: true,
        preferredLanguage: true,
        emailVerified: true,
        createdAt: true
      }
    });

    // Create single-use expiring email verification token (24h)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await prisma.authToken.create({
      data: {
        userId: user.id,
        tokenHash,
        type: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });

    // Dispatch verification email in user's preferred language
    await emailService.sendVerificationEmail(
      user.email,
      user.fullName,
      rawToken,
      user.preferredLanguage
    );

    const accessToken = generateAccessToken(user);
    const refreshToken = await createRefreshToken(user.id);
    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({
      message: 'Account created successfully. A verification link has been sent to your email.',
      user,
      accessToken,
      emailVerified: false
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const clientIp = securityGuardian.getClientIp(req);

    // 1. Check Brute-Force Guardian Lockout
    const lockStatus = securityGuardian.isLocked(email, clientIp);
    if (lockStatus.locked) {
      return res.status(429).json({
        error: `Account or IP temporarily locked due to multiple failed login attempts. Please try again after ${lockStatus.waitSeconds} seconds.`,
        code: 'ACCOUNT_LOCKED',
        waitSeconds: lockStatus.waitSeconds
      });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.passwordHash) {
      await securityGuardian.recordFailedAttempt(email, clientIp);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await securityGuardian.recordFailedAttempt(email, clientIp);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // 2. Optional TOTP 2FA Check
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const tempToken = jwt.sign(
        { userId: user.id, scope: '2fa_pending' },
        env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      return res.json({
        requires2FA: true,
        tempToken,
        message: 'Two-factor authentication code required.'
      });
    }

    // 3. Successful Login: Record & Trigger Alerts if suspicious
    securityGuardian.recordSuccessfulLogin(
      email,
      clientIp,
      { fullName: user.fullName, preferredLanguage: user.preferredLanguage },
      (req.headers['user-agent'] as string) || 'Browser'
    );

    const accessToken = generateAccessToken(user);
    const refreshToken = await createRefreshToken(user.id);
    setRefreshTokenCookie(res, refreshToken);

    const { passwordHash: _, twoFactorSecret: __, ...safeUser } = user;

    res.json({
      message: 'Logged in successfully',
      user: safeUser,
      accessToken
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (!token) {
      return res.status(401).json({ error: 'Refresh token missing.' });
    }

    const existingToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!existingToken || existingToken.revoked || existingToken.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token.' });
    }

    // Token Rotation: revoke old refresh token
    await prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: { revoked: true }
    });

    // Create new refresh token and access token
    const newAccessToken = generateAccessToken(existingToken.user);
    const newRefreshToken = await createRefreshToken(existingToken.userId);
    setRefreshTokenCookie(res, newRefreshToken);

    res.json({
      accessToken: newAccessToken
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (token) {
      await prisma.refreshToken.updateMany({
        where: { token },
        data: { revoked: true }
      });
    }

    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

export async function me(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        phone: true,
        upiId: true,
        preferredLanguage: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function sendOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone } = otpSendSchema.parse(req.body);
    // Mock OTP provider in dev environment
    console.log(`[MOCK OTP] Sent verification code 123456 to ${phone}`);
    res.json({
      message: 'OTP sent successfully. (Dev mock code: 123456)',
      phone
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone, code } = otpVerifySchema.parse(req.body);

    if (code !== '123456') {
      return res.status(400).json({ error: 'Invalid OTP code. Use 123456 for dev.' });
    }

    let user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      const mockEmail = `user_${phone.slice(-4)}@settleup.app`;
      user = await prisma.user.create({
        data: {
          phone,
          email: mockEmail,
          fullName: `User ${phone.slice(-4)}`,
          upiId: `${phone}@upi`,
          preferredLanguage: 'en'
        }
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await createRefreshToken(user.id);
    setRefreshTokenCookie(res, refreshToken);

    const { passwordHash: _, ...safeUser } = user;

    res.json({
      message: 'Phone verified successfully',
      user: safeUser,
      accessToken
    });
  } catch (err) {
    next(err);
  }
}

export async function googleAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, fullName, avatarUrl } = googleAuthSchema.parse(req.body);

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          fullName,
          avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`,
          upiId: `${email.split('@')[0]}@upi`,
          preferredLanguage: 'en'
        }
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await createRefreshToken(user.id);
    setRefreshTokenCookie(res, refreshToken);

    const { passwordHash: _, ...safeUser } = user;

    res.json({
      message: 'Google login successful',
      user: safeUser,
      accessToken
    });
  } catch (err) {
    next(err);
  }
}

/**
 * One-click "Demo as a guest" login for recruiters and quick reviews.
 * Authenticates as the primary seeded demo user (Rohan Mehta) with full pre-seeded groups and transactions.
 */
export async function demoLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const demoEmail = 'rohan@example.com';
    let user = await prisma.user.findUnique({ where: { email: demoEmail } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: demoEmail,
          fullName: 'Rohan Mehta (Demo)',
          upiId: 'rohan@okaxis',
          preferredLanguage: 'en',
          isGuestDemo: true
        }
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await createRefreshToken(user.id);
    setRefreshTokenCookie(res, refreshToken);

    const { passwordHash: _, ...safeUser } = user;

    res.json({
      message: 'Logged in as Demo User',
      user: safeUser,
      accessToken
    });
  } catch (err) {
    next(err);
  }
}

/**
 * India DPDP Act aligned: Complete data export in JSON format.
 */
export async function exportUserData(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        createdGroups: true,
        groupMemberships: { include: { group: true } },
        expensesCreated: true,
        expensePayers: true,
        expenseSplits: true,
        loansGiven: true,
        loansTaken: true,
        initiatedFriendships: true,
        receivedFriendships: true,
        auditLogs: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { passwordHash: _, ...exportPayload } = user;
    res.setHeader('Content-Disposition', `attachment; filename="chukta_user_data_${userId}.json"`);
    res.json({
      exportDate: new Date().toISOString(),
      dpdpActNotice: 'Exported under India Digital Personal Data Protection Act compliance.',
      data: exportPayload
    });
  } catch (err) {
    next(err);
  }
}

/**
 * India DPDP Act aligned: Account deletion with financial ledger integrity preservation.
 * Historical expenses are anonymized to "Deleted User" to maintain balance math for peers.
 */
export async function deleteAccount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.user.userId;

    // Anonymize user details
    await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: 'Deleted User',
        email: `deleted_${userId.slice(0, 8)}@chukta.internal`,
        phone: null,
        upiId: null,
        avatarUrl: null,
        passwordHash: null,
        anonymized: true
      }
    });

    // Revoke all tokens
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true }
    });

    res.clearCookie('refreshToken');
    res.json({ message: 'Account successfully deleted and anonymized in accordance with DPDP Act.' });
  } catch (err) {
    next(err);
  }
}

/**
 * WebAuthn / Passkeys Challenge Stub
 */
export async function passkeyChallenge(req: Request, res: Response, next: NextFunction) {
  try {
    const challenge = Buffer.from(Math.random().toString()).toString('base64');
    res.json({ challenge, rpId: 'localhost' });
  } catch (err) {
    next(err);
  }
}

/**
 * WebAuthn / Passkeys Verification Stub
 */
export async function passkeyVerify(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required for passkey login.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await createRefreshToken(user.id);
    setRefreshTokenCookie(res, refreshToken);

    const { passwordHash: _, ...safeUser } = user;
    res.json({
      message: 'Passkey verification successful',
      user: safeUser,
      accessToken
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Set In-App App Lock PIN
 */
export async function setPin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const { pin } = req.body;
    if (!pin || pin.length < 4 || pin.length > 6) {
      return res.status(400).json({ error: 'PIN must be between 4 and 6 digits.' });
    }

    const hashedPin = await bcrypt.hash(pin, 10);
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { inAppPinHash: hashedPin }
    });

    res.json({ message: 'App lock PIN set successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Verify In-App App Lock PIN
 */
export async function verifyPin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const { pin } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });

    if (!user || !user.inAppPinHash) {
      return res.status(400).json({ error: 'No PIN is set for this account.' });
    }

    const valid = await bcrypt.compare(pin, user.inAppPinHash);
    if (!valid) {
      return res.status(400).json({ valid: false, error: 'Incorrect PIN.' });
    }

    res.json({ valid: true, message: 'PIN unlocked successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Single-use Email Verification
 */
export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Verification token is required.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const authToken = await prisma.authToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (
      !authToken ||
      authToken.type !== 'EMAIL_VERIFICATION' ||
      authToken.usedAt !== null ||
      authToken.expiresAt < new Date()
    ) {
      return res.status(400).json({ error: 'Invalid or expired verification token.' });
    }

    // Mark token as consumed (single-use)
    await prisma.authToken.update({
      where: { id: authToken.id },
      data: { usedAt: new Date() }
    });

    // Mark user email verified
    await prisma.user.update({
      where: { id: authToken.userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date()
      }
    });

    res.json({
      message: 'Email address verified successfully. Your account is in good standing.',
      emailVerified: true
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Non-enumerating Password Reset Request
 */
export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await prisma.authToken.create({
        data: {
          userId: user.id,
          tokenHash,
          type: 'PASSWORD_RESET',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
        }
      });

      await emailService.sendPasswordResetEmail(
        user.email,
        user.fullName,
        rawToken,
        user.preferredLanguage
      );
    }

    // Non-enumerating response
    res.json({
      message: 'If an account exists with this email address, a password reset link has been dispatched to your inbox.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Single-use Password Reset Execution
 */
export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Valid token and new password (min 6 characters) are required.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const authToken = await prisma.authToken.findUnique({
      where: { tokenHash }
    });

    if (
      !authToken ||
      authToken.type !== 'PASSWORD_RESET' ||
      authToken.usedAt !== null ||
      authToken.expiresAt < new Date()
    ) {
      return res.status(400).json({ error: 'Invalid or expired password reset link.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password and consume token atomically
    await prisma.$transaction([
      prisma.user.update({
        where: { id: authToken.userId },
        data: { passwordHash }
      }),
      prisma.authToken.update({
        where: { id: authToken.id },
        data: { usedAt: new Date() }
      }),
      // Revoke all existing sessions for security
      prisma.refreshToken.updateMany({
        where: { userId: authToken.userId },
        data: { revoked: true }
      })
    ]);

    res.json({ message: 'Password has been reset successfully. Please log in with your new password.' });
  } catch (err) {
    next(err);
  }
}

/**
 * TOTP 2FA: Initiate QR Setup
 */
export async function setup2FA(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const secret = TotpService.generateSecret();
    const otpauthUrl = TotpService.getOtpAuthUrl(user.email, secret);
    const { plainCodes, hashedCodes } = await TotpService.generateRecoveryCodes();

    res.json({
      secret,
      otpauthUrl,
      recoveryCodes: plainCodes,
      hashedCodes
    });
  } catch (err) {
    next(err);
  }
}

/**
 * TOTP 2FA: Verify Token and Enable
 */
export async function enable2FA(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
    const { secret, token, recoveryCodes } = req.body;

    if (!secret || !token || !Array.isArray(recoveryCodes) || recoveryCodes.length === 0) {
      return res.status(400).json({ error: 'Secret, 6-digit token, and recovery codes are required.' });
    }

    const isValid = TotpService.verifyToken(secret, token);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid 6-digit TOTP code. Please check your Authenticator app.' });
    }

    // Save secret, enable 2FA, and store hashed recovery codes
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: req.user!.userId },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: secret
        }
      });

      // Clear any prior recovery codes
      await tx.twoFactorRecoveryCode.deleteMany({
        where: { userId: req.user!.userId }
      });

      for (const code of recoveryCodes) {
        const hash = await bcrypt.hash(code.trim().toUpperCase(), 10);
        await tx.twoFactorRecoveryCode.create({
          data: {
            userId: req.user!.userId,
            codeHash: hash
          }
        });
      }
    });

    res.json({ message: 'Two-factor authentication (TOTP) successfully enabled.' });
  } catch (err) {
    next(err);
  }
}

/**
 * TOTP 2FA: Verify during Login
 */
export async function verify2FALogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { tempToken, code, recoveryCode } = req.body;
    if (!tempToken) {
      return res.status(400).json({ error: 'Temporary 2FA token is required.' });
    }

    let payload: { userId: string; scope: string };
    try {
      payload = jwt.verify(tempToken, env.JWT_SECRET) as any;
      if (payload.scope !== '2fa_pending') throw new Error('Invalid scope');
    } catch {
      return res.status(401).json({ error: 'Expired or invalid 2FA session. Please log in again.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { recoveryCodes: { where: { used: false } } }
    });

    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA is not enabled for this user.' });
    }

    let verified = false;

    // Check TOTP 6-digit code
    if (code && user.twoFactorSecret) {
      verified = TotpService.verifyToken(user.twoFactorSecret, code);
    }

    // Or check Single-Use Recovery Code
    if (!verified && recoveryCode) {
      for (const rec of user.recoveryCodes) {
        const match = await TotpService.verifyRecoveryCode(recoveryCode, rec.codeHash);
        if (match) {
          verified = true;
          await prisma.twoFactorRecoveryCode.update({
            where: { id: rec.id },
            data: { used: true, usedAt: new Date() }
          });
          break;
        }
      }
    }

    if (!verified) {
      return res.status(400).json({ error: 'Invalid 2FA code or recovery code.' });
    }

    // Success
    const clientIp = securityGuardian.getClientIp(req);
    securityGuardian.recordSuccessfulLogin(
      user.email,
      clientIp,
      { fullName: user.fullName, preferredLanguage: user.preferredLanguage },
      (req.headers['user-agent'] as string) || 'Browser'
    );

    const accessToken = generateAccessToken(user);
    const refreshToken = await createRefreshToken(user.id);
    setRefreshTokenCookie(res, refreshToken);

    const { passwordHash: _, twoFactorSecret: __, ...safeUser } = user;

    res.json({
      message: 'Two-factor authentication verified',
      user: safeUser,
      accessToken
    });
  } catch (err) {
    next(err);
  }
}

/**
 * TOTP 2FA: Disable (Requires Re-Authentication)
 */
export async function disable2FA(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });

    await prisma.$transaction([
      prisma.user.update({
        where: { id: req.user.userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null
        }
      }),
      prisma.twoFactorRecoveryCode.deleteMany({
        where: { userId: req.user.userId }
      })
    ]);

    res.json({ message: 'Two-factor authentication has been disabled.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Re-Authentication (Password or Passkey) before sensitive actions
 */
export async function reauthenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
    const { password } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user || !user.passwordHash) {
      return res.status(400).json({ error: 'Unable to re-authenticate this account with password.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect password. Re-authentication failed.' });
    }

    const reAuthToken = generateReAuthToken(user.id);
    res.cookie('reAuthToken', reAuthToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 10 * 60 * 1000 // 10 minutes
    });

    res.json({
      message: 'Re-authentication verified. You may proceed with sensitive operations for the next 10 minutes.',
      reAuthToken,
      expiresIn: '10m'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Change Account Email (Sensitive action: requires Re-Auth)
 */
export async function changeEmail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
    const { newEmail } = req.body;

    if (!newEmail || typeof newEmail !== 'string') {
      return res.status(400).json({ error: 'Valid new email is required.' });
    }

    const normalized = newEmail.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalized } });
    if (existing) {
      return res.status(400).json({ error: 'This email is already in use by another account.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        email: normalized,
        emailVerified: false,
        emailVerifiedAt: null
      }
    });

    // Generate new email verification token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await prisma.authToken.create({
      data: {
        userId: updatedUser.id,
        tokenHash,
        type: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });

    await emailService.sendVerificationEmail(
      updatedUser.email,
      updatedUser.fullName,
      rawToken,
      updatedUser.preferredLanguage
    );

    res.json({
      message: 'Email address updated. A new verification link has been sent to your email.',
      email: normalized,
      emailVerified: false
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Notification Preferences
 */
export async function getNotificationPreferences(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
    const preferences = await NotificationService.getPreferences(req.user.userId);
    res.json({ preferences });
  } catch (err) {
    next(err);
  }
}

/**
 * Update Notification Preferences
 */
export async function updateNotificationPreferences(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
    const preferences = await NotificationService.updatePreferences(req.user.userId, req.body);
    res.json({
      message: 'Notification preferences updated successfully.',
      preferences
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Trigger Weekly Digest (Manual / Test)
 */
export async function triggerWeeklyDigest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
    await dispatchWeeklyDigest(req.user.userId);
    res.json({ message: 'Weekly digest email generated and dispatched.' });
  } catch (err) {
    next(err);
  }
}

