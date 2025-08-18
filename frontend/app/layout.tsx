import './globals.css';
import React from 'react';
import AppProviders from '@/components/AppProviders';
import { Roboto, Roboto_Condensed } from 'next/font/google';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto',
});

const robotoCondensed = Roboto_Condensed({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-roboto-condensed',
});

export const metadata = {
  title: 'My App',
  description: '...',
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="el">
      <body className={`${roboto.variable} ${robotoCondensed.variable}`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}