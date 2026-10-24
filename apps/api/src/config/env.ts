import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  APP_NAME: z.string().default('Chukta'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default('file:./dev.db'),
  JWT_SECRET: z.string().default('super-secret-jwt-key-chukta-min-32-chars-long'),
  JWT_REFRESH_SECRET: z.string().default('super-secret-refresh-key-chukta-min-32-chars-long'),
  COOKIE_SECRET: z.string().default('super-secret-cookie-key-chukta'),
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  REDIS_URL: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET_RECEIPTS: z.string().default('receipts'),
  S3_BUCKET_AVATARS: z.string().default('avatars'),
  GEMINI_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('no-reply@chukta.app')
});

export const env = envSchema.parse(process.env);

