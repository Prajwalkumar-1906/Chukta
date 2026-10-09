import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default('postgresql://settleup:settleup123@localhost:5432/settleup_db?schema=public'),
  JWT_SECRET: z.string().default('super-secret-jwt-key-settleup-min-32-chars-long'),
  JWT_REFRESH_SECRET: z.string().default('super-secret-refresh-key-settleup-min-32-chars-long'),
  COOKIE_SECRET: z.string().default('super-secret-cookie-key-settleup'),
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  GEMINI_API_KEY: z.string().optional()
});

export const env = envSchema.parse(process.env);
