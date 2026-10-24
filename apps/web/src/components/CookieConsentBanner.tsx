'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, ChevronRight, X, Sliders } from 'lucide-react';
import { APP_NAME } from '@chukta/shared';

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  savedAt: string;
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [preferences, setPreferences] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('chukta_cookie_consent');
    if (!saved) {
      // Delay slightly for smooth entrance
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = (prefs: { analytics: boolean; marketing: boolean; preferences: boolean }) => {
    const consent: CookiePreferences = {
      essential: true,
      analytics: prefs.analytics,
      marketing: prefs.marketing,
      preferences: prefs.preferences,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem('chukta_cookie_consent', JSON.stringify(consent));
    setVisible(false);
  };

  const handleAcceptAll = () => {
    saveConsent({ analytics: true, marketing: true, preferences: true });
  };

  const handleRejectNonEssential = () => {
    saveConsent({ analytics: false, marketing: false, preferences: false });
  };

  const handleSaveCustom = () => {
    saveConsent({ analytics, marketing, preferences });
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="glass-card bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold tracking-tight">Privacy & Consent</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">DPDP Act (India) & Privacy Standards</p>
            </div>
          </div>
          <button
            onClick={handleRejectNonEssential}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            title="Dismiss (Essential only)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          {APP_NAME} prioritizes your privacy. By default, only strictly essential cookies (for authentication, UPI idempotency, and session security) are enabled.
        </p>

        {/* Customization Drawer */}
        {showCustomize && (
          <div className="space-y-3 pt-2 pb-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold block">Essential Cookies</span>
                <span className="text-[10px] text-slate-500">Required for authentication & account security.</span>
              </div>
              <span className="text-[11px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded">Always Active</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold block">Performance & Diagnostics</span>
                <span className="text-[10px] text-slate-500">Helps us optimize settlement engine calculation speeds.</span>
              </div>
              <input
                type="checkbox"
                checked={analytics}
                onChange={e => setAnalytics(e.target.checked)}
                className="w-4 h-4 accent-teal-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold block">Custom Preferences</span>
                <span className="text-[10px] text-slate-500">Remembers selected language & theme preferences.</span>
              </div>
              <input
                type="checkbox"
                checked={preferences}
                onChange={e => setPreferences(e.target.checked)}
                className="w-4 h-4 accent-teal-600 rounded"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          {showCustomize ? (
            <button
              onClick={handleSaveCustom}
              className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              Save Custom Choices
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleAcceptAll}
                className="py-2 px-3 bg-gradient-to-r from-teal-500 to-indigo-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-sm transition"
              >
                Accept All
              </button>
              <button
                onClick={handleRejectNonEssential}
                className="py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs rounded-xl transition"
              >
                Essential Only
              </button>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <button
              onClick={() => setShowCustomize(!showCustomize)}
              className="hover:underline flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium"
            >
              <Sliders className="w-3 h-3" />
              {showCustomize ? 'Back to Overview' : 'Customize Preferences'}
            </button>
            <div className="flex gap-2">
              <Link href="/privacy" className="hover:underline text-teal-600 dark:text-teal-400">
                Privacy Policy
              </Link>
              <span>•</span>
              <Link href="/terms" className="hover:underline text-teal-600 dark:text-teal-400">
                Terms
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
