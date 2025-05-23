'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import LogoutButton from '@/components/LogoutButton';
import useCsrf from '@/hooks/useCsrf';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import {
  Home,
  Megaphone,
  CheckSquare,
  ClipboardList,
  Building2,
  Loader2,
} from 'lucide-react';

const mainLinks = [
  { href: '/dashboard', label: 'Πίνακας Ελέγχου', icon: <Home className="w-5 h-5 mr-2" />, roles: ['manager', 'resident', 'staff', 'superuser'] },
  { href: '/announcements', label: 'Ανακοινώσεις', icon: <Megaphone className="w-5 h-5 mr-2" />, roles: ['manager', 'resident', 'staff', 'superuser'] },
  { href: '/votes', label: 'Ψηφοφορίες', icon: <CheckSquare className="w-5 h-5 mr-2" />, roles: ['manager', 'resident', 'staff', 'superuser'] },
  { href: '/requests', label: 'Αιτήματα', icon: <ClipboardList className="w-5 h-5 mr-2" />, roles: ['manager', 'resident', 'staff', 'superuser'] },
  { href: '/buildings', label: 'Διαχείριση Κτιρίων', icon: <Building2 className="w-5 h-5 mr-2" />, roles: ['manager', 'staff', 'superuser'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  useCsrf();

  const { user, isLoading: authIsLoading, isAuthReady } = useAuth();
  const {
    buildings,
    currentBuilding,
    setCurrentBuilding,
    isLoading: buildingsIsLoading,
  } = useBuilding();

  // 🔒 Ασφαλής έλεγχος για πλήρη φόρτωση των contexts
  if (
    authIsLoading ||
    !isAuthReady ||
    buildingsIsLoading ||
    !user ||
    !currentBuilding
  ) {
    return (
      <aside className="w-64 bg-white dark:bg-gray-900 shadow-md flex flex-col justify-center items-center min-h-screen p-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Φόρτωση μενού...</p>
      </aside>
    );
  }

  let userRole;
  if (user.is_superuser) {
    userRole = 'superuser';
  } else if (user.is_staff) {
    userRole = 'manager';
  } else {
    userRole = user?.profile?.role ?? null;
  }

  const availableLinks = mainLinks.filter(
    (link) => userRole && link.roles.includes(userRole)
  );

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 shadow-md flex flex-col justify-between min-h-screen">
      <div>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Σύστημα Διαχείρισης</h1>
        </div>
        <nav className="p-4 space-y-2">
          {availableLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out',
                'hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-50',
                pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/dashboard')
                  ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold'
                  : 'text-gray-600 dark:text-gray-300'
              )}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}

          {userRole === 'manager' && buildings && buildings.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <label
                htmlFor="building-select"
                className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
              >
                Επιλεγμένο Κτίριο:
              </label>
              <select
                id="building-select"
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-800 dark:text-gray-100"
                value={currentBuilding.id.toString()}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const found = buildings.find((b) => b.id.toString() === selectedId);
                  setCurrentBuilding(found || null);
                }}
              >
                {buildings.map((building) => (
                  <option key={building.id} value={building.id.toString()}>
                    {building.name || `Κτίριο #${building.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {userRole === 'manager' && currentBuilding && (
            <div className="mt-4 bg-gray-50 dark:bg-gray-800/70 rounded-lg p-3 text-xs text-gray-700 dark:text-gray-300 space-y-1">
              <p className="font-semibold text-gray-800 dark:text-gray-100">🏢 {currentBuilding.name}</p>
              <p>
  📍 {currentBuilding?.address}
  {currentBuilding?.city ? `, ${currentBuilding.city}` : ''}
  {currentBuilding?.postal_code ? ` ${currentBuilding.postal_code}` : ''}
</p>

            </div>
          )}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <div className="mb-2">
            <p className="font-medium">{user.first_name || user.last_name ? `${user.first_name} ${user.last_name}`.trim() : user.email}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {userRole
                ? userRole.charAt(0).toUpperCase() + userRole.slice(1)
                : ''}
            </p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
