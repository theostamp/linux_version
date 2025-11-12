'use client';

import { usePathname, useRouter } from 'next/navigation';
import { 
  Building, 
  Users, 
  DollarSign, 
  FileText, 
  Bell, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  user?: {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
}

const menuItems = [
  { icon: Building, label: 'Dashboard', path: '/dashboard' },
  { icon: Building, label: 'Κτίρια', path: '/buildings' },
  { icon: Users, label: 'Κάτοικοι', path: '/residents' },
  { icon: DollarSign, label: 'Οικονομικά', path: '/financial' },
  { icon: FileText, label: 'Ανακοινώσεις', path: '/announcements' },
  { icon: Bell, label: 'Ειδοποιήσεις', path: '/notifications' },
  { icon: Settings, label: 'Ρυθμίσεις', path: '/settings' },
];

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/login');
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg"
      >
        {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 z-40
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <Building className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">New Concierge</span>
            </div>
          </div>

          {/* User Info */}
          {user && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <p className="text-sm font-medium text-gray-900">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
              <p className="text-xs text-gray-500 capitalize mt-1">
                {user.role === 'manager' ? 'Διαχειριστής' : user.role}
              </p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
                
                return (
                  <li key={item.path}>
                    <button
                      onClick={() => {
                        router.push(item.path);
                        setIsMobileOpen(false);
                      }}
                      className={`
                        w-full flex items-center px-4 py-3 rounded-lg transition-colors
                        ${isActive 
                          ? 'bg-blue-600 text-white' 
                          : 'text-gray-700 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-5 w-5 mr-3" />
              <span className="font-medium">Αποσύνδεση</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}

