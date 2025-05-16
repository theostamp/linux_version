// frontend/app/layout.tsx

import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import React from 'react';
import Sidebar from '@/components/Sidebar'; // Προσαρμόστε τη διαδρομή αν χρειάζεται

export const metadata = {
  title: 'My App',
  description: '...',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="el">
      <body>
        <AuthProvider>
          <div className="flex h-screen bg-gray-100 dark:bg-gray-950">
            <Sidebar />
            <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
