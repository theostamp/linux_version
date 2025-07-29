'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import LogoutButton from '@/components/LogoutButton';
import useCsrf from '@/hooks/useCsrf';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import BuildingSelectorButton from '@/components/BuildingSelectorButton';
import { useNavigationWithLoading } from '@/hooks/useNavigationWithLoading';
import {
  Home,
  Megaphone,
  CheckSquare,
  ClipboardList,
  Building2,
  Loader2,
  Building,
  MapPin,
  User,
  Shield,
  X,
  Menu,
} from 'lucide-react';

const mainLinks = [
  {
    href: '/dashboard',
    label: 'Πίνακας Ελέγχου',
    icon: <Home className="w-5 h-5" />,
    roles: ['manager', 'resident', 'staff', 'superuser'],
  },
  {
    href: '/announcements',
    label: 'Ανακοινώσεις',
    icon: <Megaphone className="w-5 h-5" />,
    roles: ['manager', 'resident', 'staff', 'superuser'],
  },
  {
    href: '/votes',
    label: 'Ψηφοφορίες',
    icon: <CheckSquare className="w-5 h-5" />,
    roles: ['manager', 'resident', 'staff', 'superuser'],
  },
  {
    href: '/requests',
    label: 'Αιτήματα',
    icon: <ClipboardList className="w-5 h-5" />,
    roles: ['manager', 'resident', 'staff', 'superuser'],
  },
  {
    href: '/buildings',
    label: 'Διαχείριση Κτιρίων',
    icon: <Building2 className="w-5 h-5" />,
    roles: ['manager', 'staff', 'superuser'],
  },
  {
    href: '/apartments',
    label: 'Διαχείριση Διαμερισμάτων',
    icon: <Building className="w-5 h-5" />,
    roles: ['manager', 'staff', 'superuser'],
  },
  {
    href: '/map-visualization',
    label: 'Οπτικοποίηση Χάρτη',
    icon: <MapPin className="w-5 h-5" />,
    roles: ['manager', 'staff', 'superuser'],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasSeenTooltip, setHasSeenTooltip] = useState(false);
  useCsrf();

  const { user, isLoading: authIsLoading, isAuthReady } = useAuth();
  const {
    buildings,
    currentBuilding,
    selectedBuilding,
    setSelectedBuilding,
    isLoading: buildingsIsLoading,
  } = useBuilding();
  const { navigateWithLoading } = useNavigationWithLoading();

  // Auto-show tooltip for first-time users
  useEffect(() => {
    const seen = localStorage.getItem('sidebar-tooltip-seen');
    if (!seen) {
      const timer = setTimeout(() => {
        setShowTooltip(true);
        setTimeout(() => {
          setShowTooltip(false);
          setHasSeenTooltip(true);
          localStorage.setItem('sidebar-tooltip-seen', 'true');
        }, 5000);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setHasSeenTooltip(true);
    }
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const handleMouseEnter = () => {
    if (hasSeenTooltip) {
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    if (hasSeenTooltip) {
      setShowTooltip(false);
    }
  };

  const handleNavigation = async (href: string, message?: string) => {
    // Close mobile menu if open
    setIsMobileMenuOpen(false);
    
    // Navigate with loading state
    await navigateWithLoading(href, message);
  };

  // Loading state
  if (
    authIsLoading ||
    !isAuthReady ||
    buildingsIsLoading
  ) {
    return (
      <>
        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>

        {/* Loading Sidebar */}
        <aside className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 shadow-xl border-r border-gray-200 dark:border-gray-700 flex flex-col justify-center items-center p-4 z-50 transform transition-transform duration-300 lg:translate-x-0 -translate-x-full">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Φόρτωση μενού...</p>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </>
    );
  }

  // No access state
  if (!user || !currentBuilding) {
    return (
      <>
        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>

        {/* No Access Sidebar */}
        <aside className={cn(
          "fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 shadow-xl border-r border-gray-200 dark:border-gray-700 flex flex-col justify-center items-center p-6 text-center z-50 transform transition-transform duration-300",
          isMobileMenuOpen ? "translate-x-0" : "lg:translate-x-0 -translate-x-full"
        )}>
          {/* Close button for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Δεν έχετε πρόσβαση</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Επικοινωνήστε με τον διαχειριστή για να αντιστοιχιστείτε σε κάποιο κτίριο.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Επιστροφή στην Αρχική
            </Link>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </>
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
      <>
        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>

        {/* No Buildings Sidebar */}
        <aside className={cn(
          "fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 shadow-xl border-r border-gray-200 dark:border-gray-700 flex flex-col justify-center items-center p-6 text-center z-50 transform transition-transform duration-300",
          isMobileMenuOpen ? "translate-x-0" : "lg:translate-x-0 -translate-x-full"
        )}>
          {/* Close button for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Δεν υπάρχουν κτίρια</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Δεν υπάρχουν διαθέσιμα κτίρια για εσάς. Επικοινωνήστε με τον διαχειριστή.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Επιστροφή στην Αρχική
            </Link>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </>
    );
  }

  const availableLinks = mainLinks.filter(
    (link) => userRole && link.roles.includes(userRole)
  );

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>

      {/* Main Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 shadow-xl border-r border-gray-200 dark:border-gray-700 flex flex-col z-50 transform transition-transform duration-300",
        isMobileMenuOpen ? "translate-x-0" : "lg:translate-x-0 -translate-x-full"
      )}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {/* Close button for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">Digital Concierge</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Διαχείριση Κτιρίων</p>
            </div>
          </div>
          <div className="relative group" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <BuildingSelectorButton
              onBuildingSelect={setSelectedBuilding}
              selectedBuilding={selectedBuilding}
              className="w-full text-sm"
            />
            
            {/* Hover Tooltip */}
            {showTooltip && (
              <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                <div className="bg-white/95 backdrop-blur-sm text-gray-800 text-xs rounded-lg p-2 shadow-lg border border-gray-200 max-w-xs">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-1 flex-shrink-0"></div>
                    <div>
                      <p className="font-medium mb-1 text-xs">Επιλογέας Κτιρίων</p>
                      <p className="text-gray-600 text-xs leading-relaxed">
                        Επιλέξτε το κτίριο που θέλετε να διαχειριστείτε.
                      </p>
                    </div>
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-0 h-0 border-t-3 border-b-3 border-r-3 border-transparent border-r-white/95"></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {availableLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => handleNavigation(link.href, `Μετάβαση στο ${link.label.toLowerCase()}...`)}
              className={cn(
                'flex items-center justify-start w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ease-in-out group text-left',
                'hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/50 dark:hover:to-blue-800/50',
                'hover:shadow-md hover:transform hover:-translate-y-0.5',
                pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/dashboard')
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform -translate-y-0.5'
                  : 'text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300'
              )}
            >
              <span className={cn(
                'mr-3 transition-colors duration-200 flex-shrink-0',
                pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/dashboard')
                  ? 'text-white'
                  : 'text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
              )}>
                {link.icon}
              </span>
              <span className="text-left">{link.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer - User Info */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                {user.first_name || user.last_name
                  ? `${user.first_name} ${user.last_name}`.trim()
                  : user.email}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {userRole ? userRole : ''}
              </p>
            </div>
          </div>
          <LogoutButton className="w-full text-sm" />
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
