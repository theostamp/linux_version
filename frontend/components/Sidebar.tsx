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
  UserPlus,
  Loader2,
} from 'lucide-react';

const mainLinks = [
  {
    href: '/dashboard',
    label: 'Πίνακας Ελέγχου',
    icon: <Home className="w-5 h-5 mr-2" />,
    roles: ['manager', 'resident', 'staff', 'superuser'],
  },
  {
    href: '/announcements',
    label: 'Ανακοινώσεις',
    icon: <Megaphone className="w-5 h-5 mr-2" />,
    roles: ['manager', 'resident', 'staff', 'superuser'],
  },
  {
    href: '/votes',
    label: 'Ψηφοφορίες',
    icon: <CheckSquare className="w-5 h-5 mr-2" />,
    roles: ['manager', 'resident', 'staff', 'superuser'],
  },
  {
    href: '/requests',
    label: 'Αιτήματα',
    icon: <ClipboardList className="w-5 h-5 mr-2" />,
    roles: ['manager', 'resident', 'staff', 'superuser'],
  },
  {
    href: '/buildings',
    label: 'Διαχείριση Κτιρίων',
    icon: <Building2 className="w-5 h-5 mr-2" />,
    roles: ['manager', 'staff', 'superuser'],
  },
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

  // ΝΕΟ: Εμφάνιση loader μόνο όταν φορτώνει authentication ή buildings
  if (
    authIsLoading ||
    !isAuthReady ||
    buildingsIsLoading
  ) {
    return (
      <aside className="w-64 bg-white dark:bg-gray-900 shadow-md flex flex-col justify-center items-center min-h-screen p-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Φόρτωση μενού...</p>
      </aside>
    );
  }

  // ΝΕΟ: Αν δεν έχει δικαιώματα ή δεν βλέπει κανένα κτίριο
  if (!user || !currentBuilding) {
    return (
      <aside className="w-64 bg-white dark:bg-gray-900 shadow-md flex flex-col justify-center items-center min-h-screen p-6 text-center">
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          Δεν έχετε πρόσβαση σε κάποιο κτίριο. Επικοινωνήστε με τον διαχειριστή για να αντιστοιχιστείτε.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition"
        >
          Επιστροφή στην Αρχική
        </Link>
      </aside>
    );
  }

let userRole: 'superuser' | 'staff' | 'manager' | 'resident' | undefined;
if (user?.is_superuser) {
  userRole = 'superuser';
} else if (user?.is_staff) {
  userRole = 'staff';
} else {
  userRole = user?.profile?.role;
}


  if (buildings.length === 0 && userRole !== 'superuser') {
    return (
      <aside className="w-64 bg-white dark:bg-gray-900 shadow-md flex flex-col justify-center items-center min-h-screen p-6 text-center">
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          Δεν υπάρχουν διαθέσιμα κτίρια για εσάς. Επικοινωνήστε με τον διαχειριστή.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition"
        >
          Επιστροφή στην Αρχική
        </Link>
      </aside>
    );
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

          {/* 🔗 Αντιστοίχιση Κατοίκου */}
          {userRole && ['manager', 'staff', 'superuser'].includes(userRole) && (
            <Link
              href="/residents/assign"
              className={cn(
                'flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out',
                'hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-50',
                pathname === '/residents/assign'
                  ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold'
                  : 'text-gray-600 dark:text-gray-300'
              )}
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Αντιστοίχιση Κατοίκου
            </Link>
          )}

          {/* 📋 Λίστα Κατοίκων */}
          {userRole && ['manager', 'staff', 'superuser'].includes(userRole) && (
            <Link
              href="/residents/list"
              className={cn(
                'flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out',
                'hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-50',
                pathname === '/residents/list'
                  ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold'
                  : 'text-gray-600 dark:text-gray-300'
              )}
            >
              <ClipboardList className="w-5 h-5 mr-2" />
              Λίστα Κατοίκων
            </Link>
          )}

          {/* ...υπόλοιπος κώδικας... */}
        </nav>
      </div>

      {/* 👤 Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <div className="mb-2">
            <p className="font-medium">
              {user.first_name || user.last_name
                ? `${user.first_name} ${user.last_name}`.trim()
                : user.email}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : ''}
            </p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
