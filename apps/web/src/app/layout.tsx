import React from 'react';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import { APP_NAME, APP_DESCRIPTION } from '@chukta/shared';

export const metadata = {
  title: `${APP_NAME} - Smart Indian Group Expense Splitter`,
  description: APP_DESCRIPTION
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full flex flex-col antialiased">
        <AuthProvider>
          {children}
          <CookieConsentBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
