import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { APP_NAME } from '@chukta/shared';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(base32: string): Buffer {
  const cleaned = base32.toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_CHARS.indexOf(cleaned[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export class TotpService {
  /**
   * Generates a new random Base32 secret key (20 bytes / 160 bits)
   */
  static generateSecret(): string {
    const buffer = crypto.randomBytes(20);
    return base32Encode(buffer);
  }

  /**
   * Generates a standard RFC 6238 Key URI for Authenticator apps (Google Authenticator, Authy, Microsoft Authenticator)
   */
  static getOtpAuthUrl(email: string, secret: string): string {
    const issuer = encodeURIComponent(APP_NAME);
    const label = encodeURIComponent(`${APP_NAME}:${email}`);
    return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  }

  /**
   * Computes the 6-digit TOTP code for a given timestamp
   */
  static generateToken(secret: string, timestamp: number = Date.now()): string {
    const key = base32Decode(secret);
    const counter = Math.floor(timestamp / 1000 / 30);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }

  /**
   * Validates a TOTP token against secret, allowing ±1 step (30s) drift tolerance
   */
  static verifyToken(secret: string, token: string): boolean {
    if (!token || token.length !== 6 || !/^\d{6}$/.test(token)) {
      return false;
    }

    const now = Date.now();
    const windows = [-1, 0, 1];

    for (const step of windows) {
      const stepTime = now + step * 30 * 1000;
      const expected = this.generateToken(secret, stepTime);
      if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generates 8 single-use recovery codes
   */
  static async generateRecoveryCodes(): Promise<{ plainCodes: string[]; hashedCodes: string[] }> {
    const plainCodes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < 8; i++) {
      const p1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const p2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const code = `${p1}-${p2}`;
      plainCodes.push(code);

      const hash = await bcrypt.hash(code, 10);
      hashedCodes.push(hash);
    }

    return { plainCodes, hashedCodes };
  }

  /**
   * Validates a recovery code against stored bcrypt hashes
   */
  static async verifyRecoveryCode(plainCode: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainCode.trim().toUpperCase(), hash);
  }
}
