'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import useCsrf from '@/hooks/useCsrf';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useNavigationWithLoading } from '@/hooks/useNavigationWithLoading';
import { CalculatorModal } from '@/components/ui/CalculatorModal';
import {
  Home,
  Megaphone,
  CheckSquare,
  ClipboardList,
  Building2,
  Loader2,
  Building,
  MapPin,
  Shield,
  X,
  Menu,
  MessageCircle,
  Wrench,
  Euro,
  FileText,
  Users,
  Handshake,
  Truck,
  RefreshCw,
  Activity,
  Calculator,
  TestTube2,
} from 'lucide-react';

// Navigation link interface
interface NavigationLink {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
  isBeta?: boolean;
}

// Navigation group interface
interface NavigationGroup {
  id: string;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
  links: NavigationLink[];
}

// Grouped navigation links with categories
const navigationGroups: NavigationGroup[] = [
  {
    id: 'operations',
    title: 'Οικονομικά και Έργα',
    color: 'orange',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    links: [
      {
        href: '/financial',
        label: 'Οικονομικά',
        icon: <Euro className="w-4 h-4" />,
        roles: ['manager', 'staff', 'superuser'],
      },
      {
        href: '/maintenance',
        label: 'Υπηρεσίες & Δαπάνες',
        icon: <Wrench className="w-4 h-4" />,
        roles: ['manager', 'staff', 'superuser'],
      },
      {
        href: '/projects',
        label: 'Προσφορές & Έργα',
        icon: <FileText className="w-4 h-4" />,
        roles: ['manager', 'staff', 'superuser'],
      },
      {
        href: '/documents',
        label: 'Παραστατικά',
        icon: <FileText className="w-4 h-4" />,
        roles: ['manager', 'staff', 'superuser'],
        isBeta: true,
      },
    ]
  },
  {
    id: 'main',
    title: 'Kiosk',
    color: 'blue',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    links: [
      {
        href: '/dashboard',
        label: 'Πίνακας Ελέγχου',
        icon: <Home className="w-4 h-4" />,
        roles: ['manager', 'resident', 'staff', 'superuser'],
      },
      {
        href: '/announcements',
        label: 'Ανακοινώσεις',
        icon: <Megaphone className="w-4 h-4" />,
        roles: ['manager', 'resident', 'staff', 'superuser'],
      },
      {
        href: '/votes',
        label: 'Ψηφοφορίες',
        icon: <CheckSquare className="w-4 h-4" />,
        roles: ['manager', 'resident', 'staff', 'superuser'],
      },
      {
        href: '/requests',
        label: 'Αιτήματα',
        icon: <ClipboardList className="w-4 h-4" />,
        roles: ['manager', 'resident', 'staff', 'superuser'],
      },
      {
        href: '/chat',
        label: 'Chat',
        icon: <MessageCircle className="w-4 h-4" />,
        roles: ['manager', 'resident', 'staff', 'superuser'],
      },
    ]
  },
  {
    id: 'management',
    title: 'Διαχείριση Κτιρίων',
    color: 'green',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    links: [
      {
        href: '/buildings',
        label: 'Διαχείριση Κτιρίων',
        icon: <Building2 className="w-4 h-4" />,
        roles: ['manager', 'staff', 'superuser'],
      },
      {
        href: '/apartments',
        label: 'Διαχείριση Διαμερισμάτων',
        icon: <Building className="w-4 h-4" />,
        roles: ['manager', 'staff', 'superuser'],
      },
      {
        href: '/map-visualization',
        label: 'Οπτικοποίηση Χάρτη',
        icon: <MapPin className="w-4 h-4" />,
        roles: ['manager', 'staff', 'superuser'],
      },
      {
        href: '/data-migration',
        label: 'Μετανάστευση Δεδομένων',
        icon: <RefreshCw className="w-4 h-4" />,
        roles: ['manager', 'staff', 'superuser'],
      },
    ]
  },
  {
    id: 'collaboration',
    title: 'Συνεργασίες & Ομάδες',
    color: 'purple',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    links: [
      {
        href: '/teams',
        label: 'Ομάδες',
        icon: <Users className="w-4 h-4" />,
        roles: ['manager', 'staff', 'superuser'],
      },
      {
        href: '/collaborators',
        label: 'Συνεργάτες',
        icon: <Handshake className="w-4 h-4" />,
        roles: ['manager', 'staff', 'superuser'],
      },
      {
        href: '/suppliers',
        label: 'Προμηθευτές',
        icon: <Truck className="w-4 h-4" />,
        roles: ['manager', 'staff', 'superuser'],
      },
    ]
  },
  {
    id: 'system',
    title: 'Σύστημα & Ελέγχοι',
    color: 'red',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    links: [
      {
        href: '/financial-tests',
        label: 'Automated Tests Οικονομικού Πυρήνα',
        icon: <TestTube2 className="w-4 h-4" />,
        roles: ['manager', 'staff', 'superuser', 'admin'],
      },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  useCsrf();

  const { user, isLoading: authIsLoading, isAuthReady } = useAuth();
  const {
    buildings,
    currentBuilding,
    isLoading: buildingsIsLoading,
  } = useBuilding();
  const { navigateWithLoading } = useNavigationWithLoading();


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
            <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">Φόρτωση μενού...</p>
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

  // No access state - only show if not loading and user exists but no current building
  if (!user || (!buildingsIsLoading && !currentBuilding)) {
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
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Δεν έχετε πρόσβαση</h3>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Επικοινωνήστε με τον διαχειριστή για να αντιστοιχιστείτε σε κάποιο κτίριο.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
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

  // Show no buildings message only after loading is complete and no buildings found
  if (!buildingsIsLoading && buildings.length === 0 && userRole !== 'superuser') {
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
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Δεν υπάρχουν κτίρια</h3>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Δεν υπάρχουν διαθέσιμα κτίρια για εσάς. Επικοινωνήστε με τον διαχειριστή.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
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

  // Filter available groups and links based on user role
  const availableGroups = navigationGroups.map(group => ({
    ...group,
    links: group.links.filter(link => userRole && link.roles.includes(userRole))
  })).filter(group => group.links.length > 0);

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
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {/* Close button for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden absolute top-3 right-3 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-800 dark:text-gray-100 tracking-tight leading-tight font-condensed">Digital Concierge</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 tracking-wide leading-tight font-condensed">Διαχείριση Κτιρίων</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
          {availableGroups.map((group) => (
            <div key={group.id} className={cn(
              "rounded-lg border p-2",
              group.bgColor,
              group.borderColor
            )}>
              <h3 className={cn(
                "text-xs font-semibold mb-2 px-2 py-1 rounded tracking-wide font-condensed",
                `text-${group.color}-700 dark:text-${group.color}-300`,
                `bg-${group.color}-100 dark:bg-${group.color}-900/30`
              )}>
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.links.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => handleNavigation(link.href, `Μετάβαση στο ${link.label.toLowerCase()}...`)}
                    className={cn(
                      'flex items-center justify-start w-full px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ease-in-out group text-left tracking-wide',
                      'hover:bg-white/60 dark:hover:bg-gray-800/60',
                      'hover:shadow-sm hover:transform hover:-translate-y-0.5',
                      pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/dashboard')
                        ? `bg-${group.color}-500 text-white shadow-md transform -translate-y-0.5`
                        : `text-gray-700 dark:text-gray-300 hover:text-${group.color}-700 dark:hover:text-${group.color}-300`
                    )}
                  >
                    <span className={cn(
                      'mr-2 transition-colors duration-200 flex-shrink-0',
                      pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/dashboard')
                        ? 'text-white'
                        : `text-gray-500 dark:text-gray-400 group-hover:text-${group.color}-600 dark:group-hover:text-${group.color}-400`
                    )}>
                      {link.icon}
                    </span>
                    <span className="text-left flex-1">{link.label}</span>
                    {link.isBeta && (
                      <span className={cn(
                        'ml-2 px-1.5 py-0.5 text-xs font-bold rounded-full transition-colors duration-200',
                        pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/dashboard')
                          ? 'bg-white/20 text-white'
                          : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                      )}>
                        BETA
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Calculator Section */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="rounded-lg border border-gray-200 dark:border-gray-600 p-2 bg-white dark:bg-gray-800">
            <h3 className="text-xs font-semibold mb-2 px-2 py-1 rounded tracking-wide text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 font-condensed">
              Εργαλεία
            </h3>
            <CalculatorModal>
              <button className="flex items-center justify-start w-full px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ease-in-out group text-left tracking-wide text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-sm hover:transform hover:-translate-y-0.5">
                <Calculator className="w-4 h-4 mr-2 transition-colors duration-200 flex-shrink-0 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                <span className="text-left">Αριθμομηχανή</span>
              </button>
            </CalculatorModal>
          </div>
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
