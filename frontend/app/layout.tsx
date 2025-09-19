import './globals.css';
import React from 'react';
import AppProviders from '@/components/AppProviders';
import DevCompileIndicator from '@/components/DevCompileIndicator';
import StartupWrapper from '@/components/StartupWrapper';
import IntroWrapper from '@/components/IntroWrapper';
import { Open_Sans, Roboto_Condensed, Inter_Tight } from 'next/font/google';
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

export const metadata = {
  title: 'My App',
  description: '...',
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="el">
      <body className={`${openSans.variable} ${robotoCondensed.variable} ${interTight.variable}`}>
        <IntroWrapper>
          <DevCompileIndicator />
          <StartupWrapper>
            <AppProviders>{children}</AppProviders>
            <Toaster />
          </StartupWrapper>
        </IntroWrapper>
      </body>
    </html>
  );
}