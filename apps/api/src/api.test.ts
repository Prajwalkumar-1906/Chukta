import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './index.js';

describe('Chukta API Core & Auth Endpoints', () => {
  it('GET /api/v1/health returns status ok and correct appName', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.appName).toBe('Chukta');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('POST /api/v1/auth/demo-login returns authenticated demo session', async () => {
    const res = await request(app)
      .post('/api/v1/auth/demo-login')
      .send();

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('rohan@example.com');
    expect(res.body.accessToken).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('POST /api/v1/auth/otp/send and verify works with mock provider', async () => {
    const phone = '+919999988888';
    const sendRes = await request(app)
      .post('/api/v1/auth/otp/send')
      .send({ phone });

    expect(sendRes.status).toBe(200);
    expect(sendRes.body.message).toContain('OTP sent successfully');

    const verifyRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code: '123456' });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.user.phone).toBe(phone);
    expect(verifyRes.body.accessToken).toBeDefined();
  });

  it('POST /api/v1/auth/passkeys/challenge returns challenge', async () => {
    const res = await request(app)
      .post('/api/v1/auth/passkeys/challenge')
      .send();

    expect(res.status).toBe(200);
    expect(res.body.challenge).toBeDefined();
    expect(res.body.rpId).toBe('localhost');
  });
});
