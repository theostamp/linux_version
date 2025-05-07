
// frontend\app\layout.tsx
import { Sidebar } from '@/components/Sidebar';
import '@/app/globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import UserGreeting from '@/components/UserGreeting';
import CsrfInitializer from '@/components/CsrfInitializer';
export const metadata = {
  title: 'Ψηφιακός Θυρωρός',
  description: 'PWA Διαχείριση Πολυκατοικίας',
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="el">
      <body className="flex min-h-screen bg-gray-100">
        <AuthProvider>
          <Sidebar />
          {/* <LoginStatusIndicator /> */}
          <main className="flex-1 p-4 overflow-auto space-y-2">
            <CsrfInitializer /> {/* ✅ Το μόνο που χρειάζεται */}
            <UserGreeting />
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
