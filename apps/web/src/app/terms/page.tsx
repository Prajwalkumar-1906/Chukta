import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { APP_NAME } from '@chukta/shared';
import { FileText, Shield, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';

export const metadata = {
  title: `Terms of Service - ${APP_NAME}`,
  description: `Terms and conditions for using the ${APP_NAME} group expense splitting platform.`
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-10 w-full space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-600 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>

        {/* Page Header */}
        <div className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-bold">
            <FileText className="w-3.5 h-3.5" /> Legal Standards & User Agreement
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Terms of Service
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Effective Date: October 24, 2026 • Last updated: October 2026
          </p>
        </div>

        {/* Content Sections */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-8 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using <strong>{APP_NAME}</strong> (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Service. {APP_NAME} is developed and provided as an expense-tracking, group debt simplification, and calculation utility.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              2. Nature of the Service & Non-Banking Disclaimer
            </h2>
            <p>
              {APP_NAME} is <strong>not a bank, financial institution, money transmitter, or payment aggregator</strong>.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>{APP_NAME} does not hold user balances in custodial bank accounts, escrow, or digital wallets.</li>
              <li>Calculated settlements, dynamic QR codes, and UPI deep links (`upi://pay`) provide shortcuts that hand off execution directly to your authorized PSP apps (such as Google Pay, PhonePe, Paytm, or BHIM).</li>
              <li>Financial settlements occur peer-to-peer over the National Payments Corporation of India (NPCI) UPI infrastructure or via direct cash exchange.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
              3. User Accounts & Security Standards
            </h2>
            <p>
              You agree to provide accurate registration information and keep your credentials secure. We implement industry-leading trust standards:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <li>Single-use expiring email verification and password reset tokens.</li>
              <li>Optional RFC 6238 TOTP two-factor authentication (2FA) with 8 single-use hashed recovery codes.</li>
              <li>Progressive rate limiting and automated lockouts against brute-force attempts.</li>
              <li>Mandatory re-authentication before sensitive modifications (including account deletion, email alteration, or disabling 2FA).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              4. Accuracy of Split Data & Discrepancies
            </h2>
            <p>
              Group members are mutually responsible for the authenticity and amounts of expenses entered into {APP_NAME}. Group members retain the ability to flag, dispute, or undo transactions. While {APP_NAME} employs mathematical bitmask dynamic programming and balanced double-entry ledger algorithms to minimize debt transfers, users should independently verify final payment figures before dispatching funds via their banking apps.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
              5. Governing Law & Jurisdiction
            </h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of India. Any disputes arising in connection with the Service shall be subject to the exclusive jurisdiction of the competent courts in Bengaluru, Karnataka, India.
            </p>
          </section>

        </div>

        {/* Footer contact note */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-4">
          Questions regarding these terms? Contact us at{' '}
          <a href="mailto:support@chukta.app" className="text-teal-600 dark:text-teal-400 font-semibold hover:underline">
            support@chukta.app
          </a>
        </div>

      </main>
    </div>
  );
}
