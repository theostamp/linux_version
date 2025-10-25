import './globals.css';
import '@fontsource/open-sans/300.css';
import '@fontsource/open-sans/400.css';
import '@fontsource/open-sans/500.css';
import '@fontsource/open-sans/700.css';
import '@fontsource/roboto-condensed/400.css';
import '@fontsource/roboto-condensed/500.css';
import '@fontsource/roboto-condensed/600.css';
import '@fontsource/roboto-condensed/700.css';
import '@fontsource/inter-tight/300.css';
import '@fontsource/inter-tight/400.css';
import '@fontsource/inter-tight/500.css';
import '@fontsource/inter-tight/600.css';
import '@fontsource/inter-tight/700.css';
import '@fontsource/ubuntu-condensed/400.css';
import React from 'react';
import AppProviders from '@/components/AppProviders';
import DevCompileIndicator from '@/components/DevCompileIndicator';
import StartupWrapper from '@/components/StartupWrapper';
import IntroWrapper from '@/components/IntroWrapper';
import NavigationLoader from '@/components/NavigationLoader';
import { Toaster } from '@/components/ui/toaster';

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

// Force new deployment - 2025-10-25-v2
export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="el">
      <body>
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
