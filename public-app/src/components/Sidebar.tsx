'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
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
  UserCheck,
  Truck,
  RefreshCw,
  Calculator,
  TestTube2,
  Monitor,
  Settings,
  Send,
  User,
  CreditCard,
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

// User role type - includes new office_staff role
type UserRoleType = 'superuser' | 'staff' | 'manager' | 'office_staff' | 'internal_manager' | 'resident';

// Grouped navigation links with categories
// Roles explanation:
// - manager: Office Manager (Γραφείο Διαχείρισης) - πλήρης πρόσβαση
// - internal_manager: Εσωτερικός Διαχειριστής - read + προσφορές/συνελεύσεις
// - resident: Ένοικος - read-only + αιτήματα
const navigationGroups: NavigationGroup[] = [
  {
    id: 'operations',
    title: 'Οικονομικά και Έργα',
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    links: [
      {
        href: '/financial',
        label: 'Οικονομικά',
        icon: <Euro className="w-4 h-4" />,
        // Office Staff, Internal Manager και Resident μπορούν να βλέπουν
        roles: ['manager', 'office_staff', 'internal_manager', 'resident', 'staff', 'superuser'],
      },
      {
        href: '/maintenance',
        label: 'Υπηρεσίες & Δαπάνες',
        icon: <Wrench className="w-4 h-4" />,
        // Office Staff, Internal Manager μπορεί να βλέπει, Resident μόνο read
        roles: ['manager', 'office_staff', 'internal_manager', 'resident', 'staff', 'superuser'],
      },
      {
        href: '/projects',
        label: 'Προσφορές & Έργα',
        icon: <FileText className="w-4 h-4" />,
        // Office Staff, Internal Manager μπορεί να διαχειρίζεται, Resident μόνο read
        roles: ['manager', 'office_staff', 'internal_manager', 'resident', 'staff', 'superuser'],
      },
      {
        href: '/documents',
        label: 'Παραστατικά',
        icon: <FileText className="w-4 h-4" />,
        roles: ['manager', 'office_staff', 'internal_manager', 'resident', 'staff', 'superuser'],
        isBeta: true,
      },
    ]
  },
  {
    id: 'main',
    title: 'Κύρια Λειτουργίες',
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    links: [
      {
        href: '/dashboard',
        label: 'Πίνακας Ελέγχου',
        icon: <Home className="w-4 h-4" />,
        // ADMIN-ONLY: Dashboard μόνο για Office Manager
        roles: ['manager', 'staff', 'superuser'],
      },
      {
        href: '/announcements',
        label: 'Ανακοινώσεις',
        icon: <Megaphone className="w-4 h-4" />,
        roles: ['manager', 'office_staff', 'internal_manager', 'resident', 'staff', 'superuser'],
      },
      {
        href: '/votes',
        label: 'Ψηφοφορίες',
        icon: <CheckSquare className="w-4 h-4" />,
        // Office Staff, Internal Manager μπορεί να δημιουργεί, Resident μπορεί να ψηφίζει
        roles: ['manager', 'office_staff', 'internal_manager', 'resident', 'staff', 'superuser'],
      },
      {
        href: '/requests',
        label: 'Αιτήματα',
        icon: <ClipboardList className="w-4 h-4" />,
        // Office Staff μπορεί να διαχειρίζεται, Residents μπορούν να δημιουργούν
        roles: ['manager', 'office_staff', 'internal_manager', 'resident', 'staff', 'superuser'],
      },
      {
        href: '/chat',
        label: 'Chat',
        icon: <MessageCircle className="w-4 h-4" />,
        roles: ['manager', 'office_staff', 'internal_manager', 'resident', 'staff', 'superuser'],
      },
      {
        href: '/notifications',
        label: 'Ειδοποιήσεις',
        icon: <Send className="w-4 h-4" />,
        roles: ['manager', 'office_staff', 'internal_manager', 'staff', 'superuser'],
      },
    ]
  },
  {
    id: 'personal',
    title: 'Προσωπικά',
    color: 'indigo',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    links: [
      {
        href: '/my-profile',
        label: 'Το Προφίλ μου',
        icon: <User className="w-4 h-4" />,
        roles: ['manager', 'internal_manager', 'resident', 'staff', 'superuser'],
      },
      {
        href: '/my-subscription',
        label: 'Η Συνδρομή μου',
        icon: <CreditCard className="w-4 h-4" />,
        // Μόνο Office Manager (που πληρώνει τη συνδρομή)
        roles: ['manager', 'staff', 'superuser'],
      },
    ]
  },
  {
    id: 'kiosk',
    title: 'Kiosk & Display',
    color: 'purple',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    links: [
      {
        href: '/kiosk-management',
        label: 'Kiosk Management',
        icon: <Settings className="w-4 h-4" />,
        roles: ['manager', 'office_staff', 'internal_manager', 'staff', 'superuser'],
      },
      {
        href: '/kiosk',
        label: 'Kiosk Display',
        icon: <Monitor className="w-4 h-4" />,
        roles: ['manager', 'office_staff', 'internal_manager', 'resident', 'staff', 'superuser'],
      },
    ]
  },
  {
    id: 'management',
    title: 'Διαχείριση Κτιρίων',
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    links: [
      {
        href: '/buildings',
        label: 'Διαχείριση Κτιρίων',
        icon: <Building2 className="w-4 h-4" />,
        // ADMIN-ONLY: Κτίρια
        roles: ['manager', 'staff', 'superuser'],
      },
      {
        href: '/office-staff',
        label: 'Υπάλληλοι Γραφείου',
        icon: <UserCheck className="w-4 h-4" />,
        // ADMIN-ONLY: Υπάλληλοι Γραφείου
        roles: ['manager', 'staff', 'superuser'],
      },
      {
        href: '/users',
        label: 'Διαχείριση Χρηστών',
        icon: <Users className="w-4 h-4" />,
        // ADMIN-ONLY: Προσκλήσεις χρηστών
        roles: ['manager', 'staff', 'superuser'],
      },
      {
        href: '/apartments',
        label: 'Διαχείριση Διαμερισμάτων',
        icon: <Building className="w-4 h-4" />,
        // ADMIN-ONLY: Διαμερίσματα
        roles: ['manager', 'staff', 'superuser'],
      },
      {
        href: '/map-visualization',
        label: 'Οπτικοποίηση Χάρτη',
        icon: <MapPin className="w-4 h-4" />,
        // ADMIN-ONLY: Χάρτης
        roles: ['manager', 'staff', 'superuser'],
      },
      {
        href: '/data-migration',
        label: 'Μετανάστευση Δεδομένων',
        icon: <RefreshCw className="w-4 h-4" />,
        // ADMIN-ONLY: Μετανάστευση
        roles: ['manager', 'staff', 'superuser'],
      },
    ]
  },
  {
    id: 'collaboration',
    title: 'Συνεργασίες & Ομάδες',
    color: 'indigo',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
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
        icon: <UserCheck className="w-4 h-4" />,
        roles: ['manager', 'staff', 'superuser'],
      },
      {
        href: '/suppliers',
        label: 'Προμηθευτές',
        icon: <Truck className="w-4 h-4" />,
        roles: ['manager', 'office_staff', 'internal_manager', 'staff', 'superuser'],
      },
    ]
  },
  {
    id: 'system',
    title: 'Σύστημα & Ελέγχοι',
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    links: [
      {
        href: '/financial-tests',
        label: 'Automated Tests Οικονομικού Πυρήνα',
        icon: <TestTube2 className="w-4 h-4" />,
        roles: ['manager', 'staff', 'superuser'],
      },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    setIsMobileMenuOpen(false);
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
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-slate-200/60"
        >
          <Menu className="w-5 h-5 text-slate-500" />
        </button>

        {/* Loading Sidebar */}
        <aside className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl flex flex-col justify-center items-center p-4 z-50 transform transition-transform duration-300 lg:translate-x-0 -translate-x-full border-r border-slate-200/60">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">Φόρτωση μενού...</p>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </>
    );
  }

  // No access state - only show if not loading and user exists but no current building
  // Also show if user has no tenant (buildings won't load)
  if (!user || (!buildingsIsLoading && !currentBuilding && buildings.length === 0)) {
    return (
      <>
        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-slate-200/60"
        >
          <Menu className="w-5 h-5 text-slate-500" />
        </button>

        {/* No Access Sidebar */}
        <aside className={cn(
          "fixed left-0 top-0 h-full w-64 bg-white shadow-xl flex flex-col justify-center items-center p-6 text-center z-50 transform transition-transform duration-300 border-r border-slate-200/60",
          isMobileMenuOpen ? "translate-x-0" : "lg:translate-x-0 -translate-x-full"
        )}>
          {/* Close button for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/25">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-foreground">Δεν έχετε πρόσβαση</h3>
              <p className="text-xs text-muted-foreground">
                Επικοινωνήστε με τον διαχειριστή για να αντιστοιχιστείτε σε κάποιο κτίριο.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all duration-200 shadow-md shadow-indigo-500/25 hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Επιστροφή στην Αρχική
            </Link>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </>
    );
  }

  // Determine user role
  // Ιεραρχία: superuser > staff > manager (office manager) > internal_manager > resident
  let userRole: UserRoleType | undefined;
  if (user?.is_superuser) {
    userRole = 'superuser';
  } else if (user?.is_staff) {
    userRole = 'staff';
  } else {
    // Check for specific role - can be on user.role or user.profile.role
    const directRole = user?.role;
    const profileRole = user?.profile?.role;
    const effectiveRole = directRole || profileRole;
    
    if (effectiveRole === 'manager' || effectiveRole === 'office_staff' || effectiveRole === 'internal_manager' || effectiveRole === 'resident') {
      userRole = effectiveRole as UserRoleType;
    } else {
      // Legacy fallback - default to resident if no role specified
      userRole = effectiveRole as UserRoleType | undefined;
    }
  }

  // Show no buildings message only after loading is complete and no buildings found
  if (!buildingsIsLoading && buildings.length === 0 && userRole !== 'superuser') {
    return (
      <>
        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-slate-200/60"
        >
          <Menu className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* No Buildings Sidebar */}
        <aside className={cn(
          "fixed left-0 top-0 h-full w-64 bg-white shadow-xl flex flex-col justify-center items-center p-6 text-center z-50 transform transition-transform duration-300 border-r border-slate-200/60",
          isMobileMenuOpen ? "translate-x-0" : "lg:translate-x-0 -translate-x-full"
        )}>
          {/* Close button for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-foreground">Δεν υπάρχουν κτίρια</h3>
              <p className="text-xs text-gray-600">
                Δεν υπάρχουν διαθέσιμα κτίρια για εσάς. Επικοινωνήστε με τον διαχειριστή.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all duration-200 shadow-md shadow-indigo-500/25 hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Επιστροφή στην Αρχική
            </Link>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
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
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-slate-200/60"
      >
        <Menu className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* Main Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-full w-64 bg-white shadow-xl flex flex-col z-50 transform transition-transform duration-300 border-r border-slate-200/60",
        isMobileMenuOpen ? "translate-x-0" : "lg:translate-x-0 -translate-x-full"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-slate-200/60 bg-white">
          {/* Close button for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden absolute top-3 right-3 p-2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground tracking-tight leading-tight">Digital Concierge</h1>
              <p className="text-xs text-muted-foreground tracking-wide leading-tight">Διαχείριση Κτιρίων</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-3 overflow-y-auto bg-slate-50/50">
          {availableGroups.map((group) => (
            <div key={group.id} className={cn(
              "rounded-xl border shadow-sm p-2",
              group.bgColor,
              group.borderColor
            )}>
              <h3 className={cn(
                "text-xs font-semibold mb-2 px-2 py-1 rounded-lg tracking-wide",
                group.color === 'orange' && "text-orange-700 bg-orange-100",
                group.color === 'blue' && "text-blue-700 bg-blue-100",
                group.color === 'indigo' && "text-indigo-700 bg-indigo-100",
                group.color === 'purple' && "text-purple-700 bg-purple-100",
                group.color === 'green' && "text-green-700 bg-green-100",
                group.color === 'red' && "text-red-700 bg-red-100"
              )}>
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.links.map((link) => {
                  const isActive = pathname === link.href || (pathname && pathname.startsWith(link.href) && link.href !== '/dashboard');
                  return (
                  <button
                    key={link.href}
                    onClick={() => handleNavigation(link.href, `Μετάβαση στο ${link.label.toLowerCase()}...`)}
                    className={cn(
                      'flex items-center justify-start w-full px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ease-in-out group text-left tracking-wide',
                      'hover:bg-white/80',
                      'hover:shadow-sm hover:transform hover:-translate-y-0.5',
                      isActive && "text-white shadow-md transform -translate-y-0.5",
                      !isActive && "text-foreground",
                      // Active state colors
                      isActive && group.color === 'orange' && "bg-orange-500",
                      isActive && group.color === 'blue' && "bg-blue-500",
                      isActive && group.color === 'indigo' && "bg-indigo-500",
                      isActive && group.color === 'purple' && "bg-purple-500",
                      isActive && group.color === 'green' && "bg-green-500",
                      isActive && group.color === 'red' && "bg-red-500",
                      // Hover state colors
                      !isActive && group.color === 'orange' && "hover:text-orange-700",
                      !isActive && group.color === 'blue' && "hover:text-blue-700",
                      !isActive && group.color === 'indigo' && "hover:text-indigo-700",
                      !isActive && group.color === 'purple' && "hover:text-purple-700",
                      !isActive && group.color === 'green' && "hover:text-green-700",
                      !isActive && group.color === 'red' && "hover:text-red-700"
                    )}
                  >
                    <span className={cn(
                      'mr-2 transition-colors duration-200 flex-shrink-0',
                      isActive && "text-white",
                      !isActive && "text-muted-foreground",
                      // Hover icon colors
                      !isActive && group.color === 'orange' && "group-hover:text-orange-600",
                      !isActive && group.color === 'blue' && "group-hover:text-blue-600",
                      !isActive && group.color === 'indigo' && "group-hover:text-indigo-600",
                      !isActive && group.color === 'purple' && "group-hover:text-purple-600",
                      !isActive && group.color === 'green' && "group-hover:text-green-600",
                      !isActive && group.color === 'red' && "group-hover:text-red-600"
                    )}>
                      {link.icon}
                    </span>
                    <span className="text-left flex-1">{link.label}</span>
                    {link.isBeta && (
                      <span className={cn(
                        'ml-2 px-1.5 py-0.5 text-xs font-bold rounded-full transition-colors duration-200',
                        isActive ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-600'
                      )}>
                        BETA
                      </span>
                    )}
                  </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Calculator Section */}
        <div className="p-3 border-t border-slate-200/60 bg-white">
          <div className="rounded-xl border border-slate-200/60 shadow-sm p-2 bg-slate-50">
            <h3 className="text-xs font-semibold mb-2 px-2 py-1 rounded-lg tracking-wide text-slate-700 bg-slate-100">
              Εργαλεία
            </h3>
            <CalculatorModal>
              <button className="flex items-center justify-start w-full px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ease-in-out group text-left tracking-wide text-slate-700 hover:bg-white hover:shadow-sm hover:transform hover:-translate-y-0.5">
                <Calculator className="w-4 h-4 mr-2 transition-colors duration-200 flex-shrink-0 text-muted-foreground group-hover:text-primary" />
                <span className="text-left">Αριθμομηχανή</span>
              </button>
            </CalculatorModal>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
