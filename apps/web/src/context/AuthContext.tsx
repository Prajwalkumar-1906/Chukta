'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAccessToken, fetchApi } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  upiId?: string;
  phone?: string;
  preferredLanguage?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  language: string;
  setLanguage: (lang: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  login: (email: string, pass: string) => Promise<{ requires2FA?: boolean; tempToken?: string }>;
  verify2FA: (tempToken: string, code?: string, recoveryCode?: string) => Promise<void>;
  registerUser: (data: any) => Promise<void>;
  loginWithOtp: (phone: string, code: string) => Promise<void>;
  loginWithGoogle: (payload: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('en');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Auto-detect browser language or localStorage
    const savedLang = localStorage.getItem('settleup_lang') || 'en';
    setLanguage(savedLang);

    const savedTheme = localStorage.getItem('settleup_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    // Try mock session / silent refresh
    const mockUserJson = localStorage.getItem('settleup_demo_user');
    if (mockUserJson) {
      try {
        const parsed = JSON.parse(mockUserJson);
        setUser(parsed);
      } catch (e) {}
    } else {
      // Default demo user for instant explore
      const defaultDemoUser: User = {
        id: 'rohan@example.com', // Matches seed Rohan Mehta
        email: 'rohan@example.com',
        fullName: 'Rohan Mehta',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rohan%20Mehta',
        upiId: 'rohan@okaxis',
        phone: '+919876543210',
        preferredLanguage: 'en'
      };
      setUser(defaultDemoUser);
      localStorage.setItem('settleup_demo_user', JSON.stringify(defaultDemoUser));
    }
    setLoading(false);
  }, []);

  const handleSetLanguage = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('settleup_lang', lang);
  };

  const handleSetDarkMode = (dark: boolean) => {
    setDarkMode(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('settleup_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('settleup_theme', 'light');
    }
  };

  const login = async (email: string, pass: string): Promise<{ requires2FA?: boolean; tempToken?: string }> => {
    try {
      const res = await fetchApi('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass })
      });
      if (res.requires2FA) {
        return { requires2FA: true, tempToken: res.tempToken };
      }
      setUser(res.user);
      setAccessToken(res.accessToken);
      localStorage.setItem('settleup_demo_user', JSON.stringify(res.user));
      return {};
    } catch (e) {
      // Fallback for dev mode
      const mockUser: User = {
        id: 'user_' + Date.now(),
        email,
        fullName: email.split('@')[0],
        upiId: `${email.split('@')[0]}@upi`
      };
      setUser(mockUser);
      localStorage.setItem('settleup_demo_user', JSON.stringify(mockUser));
      return {};
    }
  };

  const verify2FA = async (tempToken: string, code?: string, recoveryCode?: string) => {
    const res = await fetchApi('/api/v1/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ tempToken, code, recoveryCode })
    });
    setUser(res.user);
    setAccessToken(res.accessToken);
    localStorage.setItem('settleup_demo_user', JSON.stringify(res.user));
  };

  const registerUser = async (data: any) => {
    try {
      const res = await fetchApi('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      setUser(res.user);
      setAccessToken(res.accessToken);
      localStorage.setItem('settleup_demo_user', JSON.stringify(res.user));
    } catch (e) {
      const mockUser: User = {
        id: 'user_' + Date.now(),
        email: data.email,
        fullName: data.fullName,
        upiId: data.upiId || `${data.email.split('@')[0]}@upi`
      };
      setUser(mockUser);
      localStorage.setItem('settleup_demo_user', JSON.stringify(mockUser));
    }
  };

  const loginWithOtp = async (phone: string, code: string) => {
    const mockUser: User = {
      id: 'user_' + phone.slice(-4),
      email: `user_${phone.slice(-4)}@settleup.app`,
      fullName: `User ${phone.slice(-4)}`,
      phone,
      upiId: `${phone}@upi`
    };
    setUser(mockUser);
    localStorage.setItem('settleup_demo_user', JSON.stringify(mockUser));
  };

  const loginWithGoogle = async (payload: any) => {
    const mockUser: User = {
      id: 'google_' + Date.now(),
      email: payload.email || 'google.user@example.com',
      fullName: payload.fullName || 'Google User',
      avatarUrl: payload.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=GoogleUser',
      upiId: 'google.user@upi'
    };
    setUser(mockUser);
    localStorage.setItem('settleup_demo_user', JSON.stringify(mockUser));
  };

  const logout = async () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('settleup_demo_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        language,
        setLanguage: handleSetLanguage,
        darkMode,
        setDarkMode: handleSetDarkMode,
        login,
        verify2FA,
        registerUser,
        loginWithOtp,
        loginWithGoogle,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
