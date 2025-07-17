'use client';
import './globals.css';
import React from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/components/contexts/AuthContext';
import { BuildingProvider } from '@/components/contexts/BuildingContext';
import Sidebar from '@/components/Sidebar';
import { Toaster } from 'react-hot-toast';
import { ReactQueryProvider } from '@/components/contexts/ReactQueryProvider'; // ✅
import NewsTicker from '@/components/NewsTicker';

export const metadata = {
  title: 'My App',
  description: '...',
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  const pathname = usePathname();
  const isInfoScreen = pathname?.startsWith('/info-screen');

  return (
    <html lang="el">
      <body>
        <ReactQueryProvider>
          <AuthProvider>
            <BuildingProvider>
              {isInfoScreen ? (
                <div className="min-h-screen">{children}</div>
              ) : (
                <div className="flex h-screen bg-gray-100 dark:bg-gray-950">
                  <Sidebar />
                  <div className="flex flex-col flex-1">
                    <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto">
                      {children}
                    </main>
                    <NewsTicker />
                  </div>
                  <Toaster position="top-right" />
                </div>
              )}
            </BuildingProvider>
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}