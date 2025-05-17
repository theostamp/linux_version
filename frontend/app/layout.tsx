// frontend/app/layout.tsx

import './globals.css';
import React from 'react';
import { AuthProvider } from '@/components/contexts/AuthContext';
import { BuildingProvider } from '@/components/contexts/BuildingContext';
import Sidebar from '@/components/Sidebar';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'My App',
  description: '...',
};

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <html lang="el">
      <body>
        <AuthProvider>
          <BuildingProvider>
            <div className="flex h-screen bg-gray-100 dark:bg-gray-950">
              <Sidebar />
              <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto">
                {children}
              </main>
              {/* Global toast notifications */}
              <Toaster position="top-right" />
            </div>
          </BuildingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
