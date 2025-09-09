import './globals.css';
import React from 'react';
import AppProviders from '@/components/AppProviders';
import DevCompileIndicator from '@/components/DevCompileIndicator';
import { Open_Sans, Roboto_Condensed } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';

const openSans = Open_Sans({
  subsets: ['latin', 'greek'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-open-sans',
});

const robotoCondensed = Roboto_Condensed({
  subsets: ['latin', 'greek'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-roboto-condensed',
});

export const metadata = {
  title: 'My App',
  description: '...',
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="el">
      <body className={`${openSans.variable} ${robotoCondensed.variable}`}>
        <DevCompileIndicator />
        <AppProviders>{children}</AppProviders>
        <Toaster />
      </body>
    </html>
  );
}