import './globals.css';
import React from 'react';
import { AuthProvider } from '@/components/contexts/AuthContext';
import { BuildingProvider } from '@/components/contexts/BuildingContext';
import { ReactQueryProvider } from '@/components/contexts/ReactQueryProvider'; // ✅
import LayoutWrapper from '@/components/LayoutWrapper';

export const metadata = {
  title: 'My App',
  description: '...',
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="el">
      <body>
        <ReactQueryProvider>
          <AuthProvider>
            <BuildingProvider>
              <LayoutWrapper>{children}</LayoutWrapper>
            </BuildingProvider>
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}