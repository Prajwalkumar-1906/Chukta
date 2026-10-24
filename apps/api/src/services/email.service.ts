import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';
import {
  renderVerifyEmail,
  renderPasswordReset,
  renderSuspiciousLogin,
  renderWeeklyDigest,
  EmailRenderOutput
} from './emailTemplates.js';

export interface SentEmailRecord {
  to: string;
  subject: string;
  html: string;
  text: string;
  sentAt: Date;
}

class EmailService {
  private transporter: Transporter | null = null;
  public sentEmails: SentEmailRecord[] = []; // In-memory store for verification in test suite

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: env.SMTP_USER ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS || ''
        } : undefined
      });
    } catch (e) {
      console.warn('[EmailService] SMTP transporter initialization failed. Falling back to log transport.', e);
      this.transporter = null;
    }
  }

  async sendMail(to: string, renderOutput: EmailRenderOutput): Promise<boolean> {
    const record: SentEmailRecord = {
      to,
      subject: renderOutput.subject,
      html: renderOutput.html,
      text: renderOutput.text,
      sentAt: new Date()
    };
    this.sentEmails.push(record);

    if (process.env.NODE_ENV === 'test') {
      return true;
    }

    if (!this.transporter) {
      console.log(`[EmailService MOCK] Sent to: ${to} | Subject: ${renderOutput.subject}`);
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject: renderOutput.subject,
        html: renderOutput.html,
        text: renderOutput.text
      });
      return true;
    } catch (err) {
      console.warn(`[EmailService] Failed to dispatch email to ${to} via SMTP. Logged mock email instead.`, err);
      return true;
    }
  }

  async sendVerificationEmail(to: string, name: string, token: string, locale?: string) {
    const url = `${env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${token}`;
    const output = renderVerifyEmail({ name, url, locale });
    return this.sendMail(to, output);
  }

  async sendPasswordResetEmail(to: string, name: string, token: string, locale?: string) {
    const url = `${env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`;
    const output = renderPasswordReset({ name, url, locale });
    return this.sendMail(to, output);
  }

  async sendSuspiciousLoginAlert(to: string, name: string, ip: string, device: string, locale?: string) {
    const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const output = renderSuspiciousLogin({ name, ip, device, time, locale });
    return this.sendMail(to, output);
  }

  async sendWeeklyDigestEmail(
    to: string,
    name: string,
    owedRupees: number,
    oweRupees: number,
    activeGroups: number,
    locale?: string
  ) {
    const url = `${env.NEXT_PUBLIC_APP_URL}/dashboard`;
    const output = renderWeeklyDigest({ name, owedRupees, oweRupees, activeGroups, url, locale });
    return this.sendMail(to, output);
  }
}

export const emailService = new EmailService();
