import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { APP_NAME } from '@chukta/shared';
import { Shield, Lock, ArrowLeft, Download, UserX, Bell, Cookie } from 'lucide-react';

export const metadata = {
  title: `Privacy Policy - ${APP_NAME}`,
  description: `Privacy Policy and DPDP Act compliance standards for ${APP_NAME}.`
};

export default function PrivacyPolicyPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
            <Shield className="w-3.5 h-3.5" /> India DPDP Act 2023 Compliant
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Effective Date: October 24, 2026 • Aligned with Digital Personal Data Protection Act (India)
          </p>
        </div>

        {/* Content Sections */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-8 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-teal-600" />
              1. Commitment to Data Minimization & Privacy
            </h2>
            <p>
              At <strong>{APP_NAME}</strong>, we believe your personal finances are strictly your business. We collect only the data necessary to accurately split expenses, compute optimal settlements, and facilitate peer-to-peer UPI transfers. We do not sell, rent, or monetize your personal or financial data with third-party advertisers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              2. Information We Process
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-900 dark:text-white block mb-1">Identity & Credentials</span>
                <p className="text-slate-500">Name, email address, optional phone number, bcrypt-hashed passwords, and optional TOTP secrets.</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-900 dark:text-white block mb-1">Payment Identifiers</span>
                <p className="text-slate-500">Virtual Payment Address (UPI ID) solely to construct `upi://pay` deep links and QR codes.</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-900 dark:text-white block mb-1">Expense & Split Entries</span>
                <p className="text-slate-500">Expense descriptions, amounts in paise, category tags, split allocations, and optional receipt images.</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-900 dark:text-white block mb-1">Audit & Access Logs</span>
                <p className="text-slate-500">IP address and user agent records for brute-force defense and suspicious login notifications.</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-600" />
              3. Right to Data Portability & Complete Export
            </h2>
            <p>
              Under Section 11 of the Digital Personal Data Protection Act 2023, you have the right to access a summary of all personal data processed by us. You can export your full account history, expense allocations, payments, and activity log in open JSON format at any time from your account settings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserX className="w-5 h-5 text-rose-600" />
              4. Right to Erasure & Ledger-Preserving Anonymization
            </h2>
            <p>
              You have the right to delete your account. To maintain financial math integrity for group peers who share past expenses with you:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <li>Your personal identifiers (name, email, phone number, UPI ID, avatar) are permanently redacted and replaced with &quot;Deleted User&quot;.</li>
              <li>All active session tokens and credentials are immediately revoked.</li>
              <li>Past monetary split rows are preserved anonymously so remaining group members&apos; net balance calculations remain mathematically accurate.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cookie className="w-5 h-5 text-amber-500" />
              5. Cookie Policy & Preferences
            </h2>
            <p>
              We implement an <strong>essential-only by default</strong> cookie policy. Non-essential tracking cookies require your explicit affirmative consent through our Cookie Consent banner, and your choices can be updated at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-600" />
              6. Notification Preferences & Quiet Hours
            </h2>
            <p>
              You retain granular control over which channels (in-app, email, push, or WhatsApp link) and events notify you. Furthermore, our system respects your configured <strong>Quiet Hours</strong>, suppressing non-essential emails and alerts during your selected resting window.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-teal-600" />
              7. Data Protection & Grievance Redressal Officer
            </h2>
            <p>
              In accordance with the India DPDP Act 2023, for any privacy concerns, data subject requests, or grievances, you may contact our designated Grievance Officer:
            </p>
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">Grievance Redressal Officer: Chukta Data Trust Team</p>
              <p>Email: <a href="mailto:privacy@chukta.app" className="text-teal-600 dark:text-teal-400 underline">privacy@chukta.app</a></p>
              <p>Physical Address: Chukta Technologies, Koramangala 4th Block, Bengaluru, KA 560034, India</p>
            </div>
          </section>

        </div>

      </main>
    </div>
  );
}
