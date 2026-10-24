import { Request } from 'express';
import { emailService } from './email.service.js';

interface AttemptRecord {
  count: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

class SecurityGuardian {
  private accountAttempts: Map<string, AttemptRecord> = new Map();
  private ipAttempts: Map<string, AttemptRecord> = new Map();

  private readonly LOCKOUT_THRESHOLD = 5;
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly WINDOW_MS = 15 * 60 * 1000;

  getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || '127.0.0.1';
  }

  isLocked(email?: string, ip?: string): { locked: boolean; waitSeconds?: number } {
    const now = Date.now();

    if (email) {
      const acc = this.accountAttempts.get(email.toLowerCase());
      if (acc && acc.lockedUntil && acc.lockedUntil > now) {
        return { locked: true, waitSeconds: Math.ceil((acc.lockedUntil - now) / 1000) };
      }
    }

    if (ip) {
      const ipRec = this.ipAttempts.get(ip);
      if (ipRec && ipRec.lockedUntil && ipRec.lockedUntil > now) {
        return { locked: true, waitSeconds: Math.ceil((ipRec.lockedUntil - now) / 1000) };
      }
    }

    return { locked: false };
  }

  async recordFailedAttempt(email?: string, ip?: string): Promise<{ locked: boolean; delayMs: number }> {
    const now = Date.now();
    let maxAttempts = 0;

    const updateRecord = (map: Map<string, AttemptRecord>, key: string) => {
      let rec = map.get(key);
      if (!rec || now - rec.lastAttempt > this.WINDOW_MS) {
        rec = { count: 1, lastAttempt: now, lockedUntil: null };
      } else {
        rec.count += 1;
        rec.lastAttempt = now;
      }

      if (rec.count >= this.LOCKOUT_THRESHOLD) {
        rec.lockedUntil = now + this.LOCKOUT_DURATION_MS;
      }

      map.set(key, rec);
      if (rec.count > maxAttempts) maxAttempts = rec.count;
      return rec;
    };

    if (email) updateRecord(this.accountAttempts, email.toLowerCase());
    if (ip) updateRecord(this.ipAttempts, ip);

    // Calculate progressive delay: attempts 3 = 1000ms, 4 = 2000ms, etc.
    let delayMs = 0;
    if (maxAttempts >= 3) {
      delayMs = Math.min((maxAttempts - 2) * 1000, 3000); // capped at 3s to keep UX responsive
      if (process.env.NODE_ENV !== 'test') {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    const locked = maxAttempts >= this.LOCKOUT_THRESHOLD;
    return { locked, delayMs };
  }

  recordSuccessfulLogin(email: string, ip: string, user: { fullName: string; preferredLanguage: string }, userAgent: string = 'Unknown') {
    const prevAttempts = this.accountAttempts.get(email.toLowerCase())?.count || 0;

    // Reset records
    this.accountAttempts.delete(email.toLowerCase());
    this.ipAttempts.delete(ip);

    // If suspicious: previous failed attempts existed before success or unknown IP
    if (prevAttempts > 0 || process.env.NODE_ENV !== 'test') {
      emailService.sendSuspiciousLoginAlert(
        email,
        user.fullName,
        ip,
        userAgent,
        user.preferredLanguage
      ).catch(err => console.error('[SecurityGuardian] Alert error:', err));
    }
  }

  // Clear all tracking (for tests)
  resetAll() {
    this.accountAttempts.clear();
    this.ipAttempts.clear();
  }
}

export const securityGuardian = new SecurityGuardian();
