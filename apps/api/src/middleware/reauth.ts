import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from './auth.js';
import { env } from '../config/env.js';

export interface ReAuthPayload {
  userId: string;
  scope: 'reauth';
  iat: number;
  exp: number;
}

export function generateReAuthToken(userId: string): string {
  return jwt.sign(
    { userId, scope: 'reauth' },
    env.JWT_SECRET,
    { expiresIn: '10m' }
  );
}

export function requireReAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  const token =
    (req.headers['x-reauth-token'] as string) ||
    req.cookies?.reAuthToken ||
    req.body?.reAuthToken;

  if (!token) {
    return res.status(403).json({
      error: 'Re-authentication required before performing this sensitive action.',
      code: 'REAUTH_REQUIRED'
    });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as ReAuthPayload;
    if (payload.userId !== req.user.userId || payload.scope !== 'reauth') {
      return res.status(403).json({
        error: 'Invalid or unauthorized re-authentication token.',
        code: 'REAUTH_REQUIRED'
      });
    }

    next();
  } catch (err) {
    return res.status(403).json({
      error: 'Re-authentication session expired. Please confirm your credentials again.',
      code: 'REAUTH_EXPIRED'
    });
  }
}
