import './globals.css';
import React from 'react';
import { AuthProvider } from '@/components/contexts/AuthContext';
import { BuildingProvider } from '@/components/contexts/BuildingContext';
import Sidebar from '@/components/Sidebar';
import { Toaster } from 'react-hot-toast';
import { ReactQueryProvider } from '@/components/contexts/ReactQueryProvider'; // ✅

export const metadata = {
  title: 'My App',
  description: '...',
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="el">
      <body>
        <ReactQueryProvider> {/* ✅ Client wrapper */}
          <AuthProvider>
            <BuildingProvider>
              <div className="flex h-screen bg-gray-100 dark:bg-gray-950">
                <Sidebar />
                <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto">
                  {children}
                </main>
                <Toaster position="top-right" />
              </div>
            </BuildingProvider>
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
