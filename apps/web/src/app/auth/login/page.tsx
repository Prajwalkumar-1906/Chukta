'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { Zap, Phone, Mail, Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithOtp, loginWithGoogle } = useAuth();

  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await login(email, password);
    setLoading(false);
    router.push('/dashboard');
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) return;
    setOtpSent(true);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await loginWithOtp(phone, otpCode);
    setLoading(false);
    router.push('/dashboard');
  };

  const handleGoogleClick = async () => {
    setLoading(true);
    await loginWithGoogle({ email: 'demo.google@settleup.app', fullName: 'Demo Google User' });
    setLoading(false);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-card rounded-3xl p-8 border shadow-2xl space-y-6">
          
          <div className="text-center space-y-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-md">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <h1 className="text-2xl font-black pt-2">Welcome Back</h1>
            <p className="text-xs text-slate-500">Log in to manage your group settlements</p>
          </div>

          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold border">
            <button
              onClick={() => setMode('email')}
              className={`flex-1 py-1.5 rounded-lg transition ${mode === 'email' ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-900 dark:text-white font-bold' : 'text-slate-500'}`}
            >
              Email Login
            </button>
            <button
              onClick={() => setMode('phone')}
              className={`flex-1 py-1.5 rounded-lg transition ${mode === 'phone' ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-900 dark:text-white font-bold' : 'text-slate-500'}`}
            >
              Phone OTP
            </button>
          </div>

          {mode === 'email' ? (
            <form onSubmit={handleEmailLogin} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 font-medium mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="rohan@example.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border outline-none font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border outline-none font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:opacity-95 transition"
              >
                {loading ? 'Logging in...' : 'Log In'}
              </button>
            </form>
          ) : (
            <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4 text-xs">
              {!otpSent ? (
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Mobile Phone (+91)</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border outline-none font-semibold"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full mt-3 py-3 bg-teal-600 text-white font-bold rounded-xl shadow-lg hover:bg-teal-700 transition"
                  >
                    Send Verification Code
                  </button>
                </div>
              ) : (
                <div>
                  <div className="p-2.5 bg-teal-50 dark:bg-teal-950 rounded-xl text-[11px] text-teal-700 dark:text-teal-300 mb-3 border border-teal-200">
                    💡 Dev OTP Code is <b>123456</b> sent to +91 {phone}
                  </div>
                  <label className="block text-slate-500 font-medium mb-1">6-Digit Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    placeholder="123456"
                    className="w-full tracking-widest text-center py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border outline-none font-bold text-base"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-3 py-3 bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg transition"
                  >
                    {loading ? 'Verifying...' : 'Verify & Log In'}
                  </button>
                </div>
              )}
            </form>
          )}

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-semibold uppercase">Or continue with</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          <button
            onClick={handleGoogleClick}
            disabled={loading}
            className="w-full py-2.5 bg-white dark:bg-slate-800 border hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
          >
            <span className="text-teal-600 font-black">G</span> One-Click Google Sign In
          </button>

          <p className="text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link href="/auth/register" className="font-bold text-teal-600 hover:underline">
              Sign up
            </Link>
          </p>

        </div>
      </main>
    </div>
  );
}
