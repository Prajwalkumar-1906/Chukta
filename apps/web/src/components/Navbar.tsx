'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { t, LANGUAGES } from '@/lib/i18n';
import { Sun, Moon, Globe, LogOut, User as UserIcon, Zap } from 'lucide-react';

export default function Navbar() {
  const { user, logout, language, setLanguage, darkMode, setDarkMode } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full glass-card border-b backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <span className="gradient-text font-black text-2xl">SettleUp</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 uppercase tracking-widest">
            India
          </span>
        </Link>

        {/* Navigation & Controls */}
        <div className="flex items-center gap-3">
          
          {/* Language Switcher */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
              <Globe className="w-3.5 h-3.5 text-teal-600" />
              <span>{LANGUAGES.find(l => l.code === language)?.native || 'English'}</span>
            </button>
            <div className="absolute right-0 top-full mt-1 w-40 glass-card rounded-xl shadow-xl border p-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-50">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition flex items-center justify-between ${
                    language === lang.code ? 'bg-teal-50 text-teal-700 font-bold dark:bg-teal-950 dark:text-teal-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{lang.native}</span>
                  <span className="text-[10px] text-slate-400">{lang.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Toggle Theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* User Profile / Auth Action */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden shadow-sm">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                ) : (
                  user.fullName.slice(0, 2).toUpperCase()
                )}
              </div>
              <span className="text-xs font-semibold hidden md:inline">{user.fullName}</span>
              <button
                onClick={logout}
                className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition"
                title={t('logout', language)}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-600 transition"
              >
                {t('login', language)}
              </Link>
              <Link
                href="/auth/register"
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-teal-500 to-indigo-600 rounded-lg shadow-md hover:opacity-95 transition"
              >
                {t('register', language)}
              </Link>
            </div>
          )}

        </div>
      </div>
    </header>
  );
}
