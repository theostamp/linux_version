import './globals.css';
import React from 'react';
import AppProviders from '@/components/AppProviders';
import DevCompileIndicator from '@/components/DevCompileIndicator';
import StartupWrapper from '@/components/StartupWrapper';
import IntroWrapper from '@/components/IntroWrapper';
import NavigationLoader from '@/components/NavigationLoader';
import { Open_Sans, Roboto_Condensed, Inter_Tight, Ubuntu_Condensed } from 'next/font/google';
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

const interTight = Inter_Tight({
  subsets: ['latin', 'greek'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter-tight',
});

const ubuntuCondensed = Ubuntu_Condensed({
  subsets: ['latin', 'greek'],
  weight: ['400'],
  variable: '--font-ubuntu-condensed',
});

export const metadata = {
  title: 'New Concierge - Building Management',
  description: 'Διαχείριση Πολυκατοικίας - Κοινόχρηστα, Ανακοινώσεις, Συντήρηση',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'New Concierge',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#4f46e5',
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="el">
      <body className={`${openSans.variable} ${robotoCondensed.variable} ${interTight.variable} ${ubuntuCondensed.variable}`}>
        <IntroWrapper>
          <DevCompileIndicator />
          <NavigationLoader />
          <StartupWrapper>
            <AppProviders>{children}</AppProviders>
            <Toaster />
          </StartupWrapper>
        </IntroWrapper>
      </body>
    </html>
  );
}