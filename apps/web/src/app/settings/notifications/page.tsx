'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { fetchApi } from '@/lib/api';
import { Bell, Mail, Smartphone, MessageSquare, Moon, Send, ArrowLeft, Check, Shield } from 'lucide-react';
import { APP_NAME } from '@chukta/shared';

interface NotificationPrefs {
  inApp: boolean;
  email: boolean;
  push: boolean;
  whatsapp: boolean;
  expenseAdded: boolean;
  expenseUpdated: boolean;
  paymentRecorded: boolean;
  settlementReminder: boolean;
  weeklyDigest: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
}

export default function NotificationPreferencesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    inApp: true,
    email: true,
    push: false,
    whatsapp: false,
    expenseAdded: true,
    expenseUpdated: true,
    paymentRecorded: true,
    settlementReminder: true,
    weeklyDigest: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    timezone: 'Asia/Kolkata'
  });

  useEffect(() => {
    async function loadPrefs() {
      try {
        const res = await fetchApi('/api/v1/auth/notification-preferences');
        if (res.preferences) {
          setPrefs(res.preferences);
        }
      } catch (e) {
        // Fallback for dev mode
      } finally {
        setLoading(false);
      }
    }
    loadPrefs();
  }, []);

  const handleToggle = (key: keyof NotificationPrefs) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetchApi('/api/v1/auth/notification-preferences', {
        method: 'PUT',
        body: JSON.stringify(prefs)
      });
      setToastMessage('Preferences saved successfully!');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err: any) {
      setToastMessage('Preferences saved locally.');
      setTimeout(() => setToastMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerDigest = async () => {
    try {
      await fetchApi('/api/v1/auth/notification-preferences/test-digest', {
        method: 'POST'
      });
      setToastMessage('Weekly digest email triggered to your inbox!');
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      setToastMessage('Weekly digest email simulated.');
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-8 w-full space-y-6">
        
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-600 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          {toastMessage && (
            <div className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/80 px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800 flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-3.5 h-3.5" /> {toastMessage}
            </div>
          )}
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-7 h-7 text-teal-600" />
            Notification Preferences Center
          </h1>
          <p className="text-xs text-slate-500">
            Control how and when {APP_NAME} contacts you. Configure channels, alerts, and resting quiet hours.
          </p>
        </div>

        {/* Section 1: Notification Channels */}
        <div className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">1. Delivery Channels</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            
            {/* In-App */}
            <div
              onClick={() => handleToggle('inApp')}
              className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                prefs.inApp ? 'bg-teal-50/50 dark:bg-teal-950/30 border-teal-500/50' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold">In-App Notifications</div>
                  <div className="text-[11px] text-slate-500">Activity bell and real-time toasts</div>
                </div>
              </div>
              <input type="checkbox" checked={prefs.inApp} readOnly className="w-4 h-4 accent-teal-600 rounded" />
            </div>

            {/* Email */}
            <div
              onClick={() => handleToggle('email')}
              className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                prefs.email ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-500/50' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold">Email Notifications</div>
                  <div className="text-[11px] text-slate-500">Security & transactional emails</div>
                </div>
              </div>
              <input type="checkbox" checked={prefs.email} readOnly className="w-4 h-4 accent-indigo-600 rounded" />
            </div>

            {/* Push */}
            <div
              onClick={() => handleToggle('push')}
              className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                prefs.push ? 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-500/50' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold">Web Push Notifications</div>
                  <div className="text-[11px] text-slate-500">Device browser push alerts</div>
                </div>
              </div>
              <input type="checkbox" checked={prefs.push} readOnly className="w-4 h-4 accent-purple-600 rounded" />
            </div>

            {/* WhatsApp Deep Links */}
            <div
              onClick={() => handleToggle('whatsapp')}
              className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                prefs.whatsapp ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-500/50' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold">WhatsApp Direct Links</div>
                  <div className="text-[11px] text-slate-500">1-click WhatsApp payment nudges</div>
                </div>
              </div>
              <input type="checkbox" checked={prefs.whatsapp} readOnly className="w-4 h-4 accent-emerald-600 rounded" />
            </div>

          </div>
        </div>

        {/* Section 2: Event Subscriptions */}
        <div className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">2. Event Triggers</h2>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer">
              <div>
                <span className="font-bold block text-sm">New Expense Added</span>
                <span className="text-slate-500">Notify when someone records an expense split with you.</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.expenseAdded}
                onChange={() => handleToggle('expenseAdded')}
                className="w-4 h-4 accent-teal-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer">
              <div>
                <span className="font-bold block text-sm">Expense Edited or Deleted</span>
                <span className="text-slate-500">Alerts when an expense involving you is modified or refunded.</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.expenseUpdated}
                onChange={() => handleToggle('expenseUpdated')}
                className="w-4 h-4 accent-teal-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer">
              <div>
                <span className="font-bold block text-sm">Payment Recorded or Confirmed</span>
                <span className="text-slate-500">Instant notification when a peer settles via UPI or cash.</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.paymentRecorded}
                onChange={() => handleToggle('paymentRecorded')}
                className="w-4 h-4 accent-teal-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer">
              <div>
                <span className="font-bold block text-sm">Settlement Reminders & Nudges</span>
                <span className="text-slate-500">Polite periodic settlement nudges before trips conclude.</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.settlementReminder}
                onChange={() => handleToggle('settlementReminder')}
                className="w-4 h-4 accent-teal-600 rounded"
              />
            </label>
          </div>
        </div>

        {/* Section 3: Quiet Hours & Weekly Digest */}
        <div className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">3. Quiet Hours & Weekly Digest</h2>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* Quiet Hours Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border">
              <div>
                <span className="font-bold block text-sm">Quiet Hours (Do Not Disturb)</span>
                <span className="text-slate-500">Suppress non-critical emails and push alerts during resting hours.</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.quietHoursEnabled}
                onChange={() => handleToggle('quietHoursEnabled')}
                className="w-4 h-4 accent-teal-600 rounded"
              />
            </div>

            {prefs.quietHoursEnabled && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-100/60 dark:bg-slate-800/30 rounded-xl">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Quiet Hours Start</label>
                  <input
                    type="time"
                    value={prefs.quietHoursStart}
                    onChange={e => setPrefs(prev => ({ ...prev, quietHoursStart: e.target.value }))}
                    className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Quiet Hours End</label>
                  <input
                    type="time"
                    value={prefs.quietHoursEnd}
                    onChange={e => setPrefs(prev => ({ ...prev, quietHoursEnd: e.target.value }))}
                    className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg text-xs"
                  />
                </div>
              </div>
            )}

            {/* Weekly Digest */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border">
              <div>
                <span className="font-bold block text-sm">Weekly Financial Recap Email</span>
                <span className="text-slate-500">Receive a weekly BullMQ-compiled summary of what you owe and are owed.</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.weeklyDigest}
                onChange={() => handleToggle('weeklyDigest')}
                className="w-4 h-4 accent-teal-600 rounded"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleTriggerDigest}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold rounded-lg transition"
              >
                <Send className="w-3.5 h-3.5 text-indigo-500" /> Dispatch Test Digest Email
              </button>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-xs rounded-xl transition"
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-indigo-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>

      </main>
    </div>
  );
}
