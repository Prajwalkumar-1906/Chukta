'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { fetchApi } from '@/lib/api';
import { Mail, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { APP_NAME } from '@chukta/shared';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const res = await fetchApi('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      setMessage(res.message || 'If an account exists with this email, a reset link has been dispatched.');
      setSubmitted(true);
    } catch (err: any) {
      setMessage('If an account exists with this email, a reset link has been dispatched.');
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-md p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
          
          <div>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-600 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Log In
            </Link>
          </div>

          <div className="space-y-2 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <Mail className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Reset Password</h1>
            <p className="text-xs text-slate-500">
              Enter your registered email address and we will send you a secure, single-use password reset link.
            </p>
          </div>

          {submitted ? (
            <div className="space-y-4 text-center animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-300 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {message}
              </p>
              <div className="pt-2">
                <Link
                  href="/auth/login"
                  className="w-full py-2.5 bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition block"
                >
                  Return to Log In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-teal-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md hover:opacity-95 transition flex items-center justify-center gap-2"
              >
                {loading ? 'Sending...' : 'Send Password Reset Link'} <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

        </div>
      </main>
    </div>
  );
}
