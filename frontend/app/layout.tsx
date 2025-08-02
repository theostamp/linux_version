import './globals.css';
import React from 'react';
import AppProviders from '@/components/AppProviders';
import { Ubuntu, Roboto } from 'next/font/google';

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-ubuntu',
});

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto',
});

export const metadata = {
  title: 'My App',
  description: '...',
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="el">
      <body className={`${ubuntu.variable} ${roboto.variable}`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}