import { Metadata } from 'next';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AuthGate from '@/components/AuthGate';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Kiosk Management',
  description: 'Administrative interface for kiosk widget management',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate role="admin">
      <div className="min-h-screen bg-gray-50">
        <AdminSidebar />
        <div className="md:pl-64 flex flex-col flex-1">
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </AuthGate>
  );
}
