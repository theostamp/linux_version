import './globals.css';
import React from 'react';
import AppProviders from '@/components/AppProviders';

export const metadata = {
  title: 'My App',
  description: '...',
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="el">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}