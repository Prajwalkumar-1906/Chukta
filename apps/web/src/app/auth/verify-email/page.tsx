'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { fetchApi } from '@/lib/api';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { APP_NAME } from '@chukta/shared';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email token...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing or invalid verification link. Please check your email for the full URL.');
      return;
    }

    async function verify() {
      try {
        const res = await fetchApi('/api/v1/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({ token })
        });
        setStatus('success');
        setMessage(res.message || 'Email verified successfully! Your account is active.');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Verification token is invalid or has already been used.');
      }
    }

    verify();
  }, [token]);

  return (
    <div className="glass-card w-full max-w-md p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-6">
      {status === 'verifying' && (
        <div className="space-y-4">
          <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto" />
          <h2 className="text-xl font-bold">Verifying Token</h2>
          <p className="text-xs text-slate-500">{message}</p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-4 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-300 flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Email Verified!</h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">{message}</p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              Continue to {APP_NAME} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300 flex items-center justify-center mx-auto shadow-md">
            <XCircle className="w-9 h-9" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Verification Failed</h2>
          <p className="text-xs text-rose-600 dark:text-rose-400">{message}</p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/auth/login"
              className="w-full py-3 bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              Return to Log In
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <Suspense fallback={<Loader2 className="w-8 h-8 text-teal-600 animate-spin" />}>
          <VerifyEmailContent />
        </Suspense>
      </main>
    </div>
  );
}
