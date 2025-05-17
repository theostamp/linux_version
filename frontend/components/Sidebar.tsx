'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import LogoutButton from '@/components/LogoutButton';
import useCsrf from '@/hooks/useCsrf';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Home, Megaphone, Vote, ClipboardList, Building as BldIcon } from 'lucide-react';

const links = [
  { href: '/dashboard', label: 'Πίνακας Ελέγχου', icon: <Home className="w-4 h-4 mr-2" /> },
  { href: '/announcements', label: 'Ανακοινώσεις', icon: <Megaphone className="w-4 h-4 mr-2" /> },
  { href: '/votes', label: 'Ψηφοφορίες', icon: <Vote className="w-4 h-4 mr-2" /> },
  { href: '/requests', label: 'Αιτήματα', icon: <ClipboardList className="w-4 h-4 mr-2" /> },
  { href: '/buildings', label: 'Κτίρια', icon: <BldIcon className="w-4 h-4 mr-2" /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  useCsrf();

  const { user } = useAuth();
  const { buildings, currentBuilding, setCurrentBuilding } = useBuilding();

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 shadow-md flex flex-col justify-between min-h-screen">
      <nav className="p-4 space-y-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex items-center px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800',
              pathname === link.href
                ? 'bg-gray-200 dark:bg-gray-800 font-semibold'
                : 'text-gray-700 dark:text-gray-300'
            )}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}

        {/* dropdown επιλογής κτηρίου */}
        {buildings.length > 0 && (
          <div className="mt-4">
            <label className="block text-xs text-gray-500 mb-1">
              Επιλογή Κτηρίου:
            </label>
            <select
              className="w-full border rounded px-2 py-1 text-sm"
              value={currentBuilding?.id ?? ''}
              onChange={(e) => {
                const sel = buildings.find(b => String(b.id) === e.target.value);
                if (sel) setCurrentBuilding(sel);
              }}
            >
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || `#${b.id}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* εμφάνιση τρέχοντος κτηρίου */}
        {currentBuilding && (
          <div className="mt-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-sm text-gray-800 dark:text-gray-200">
            🏢 <strong>Βρίσκεστε στο:</strong>{' '}
            {currentBuilding.name || `#${currentBuilding.id}`}
            <br />
            📍 <strong>Διεύθυνση:</strong>{' '}
            {currentBuilding.address}
            {currentBuilding.city ? `, ${currentBuilding.city}` : ''}
            {currentBuilding.postal_code ? ` ${currentBuilding.postal_code}` : ''}
          </div>
        )}
      </nav>

      <div className="bg-gray-50 dark:bg-gray-800 text-center text-sm text-gray-700 dark:text-gray-300 p-4">
        {user ? (
          <>
            <div className="mb-2">
              Συνδεδεμένος ως:{' '}
              <strong>
                {user.first_name || user.last_name
                  ? `${user.first_name} ${user.last_name}`
                  : user.email}
              </strong>
            </div>
            <LogoutButton />
          </>
        ) : (
          <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
            Σύνδεση
          </Link>
        )}
      </div>
    </aside>
);
}
