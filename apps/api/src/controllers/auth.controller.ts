import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { AuthRequest } from '../middleware/auth.js';

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
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        phone: data.phone,
        upiId: data.upiId || `${data.email.split('@')[0]}@upi`,
        preferredLanguage: data.preferredLanguage
      },
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

    const accessToken = generateAccessToken(user);
    const refreshToken = await createRefreshToken(user.id);
    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({
      message: 'Account created successfully',
      user,
      accessToken
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await createRefreshToken(user.id);
    setRefreshTokenCookie(res, refreshToken);

    const { passwordHash: _, ...safeUser } = user;

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
