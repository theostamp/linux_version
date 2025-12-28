'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useNavigationWithLoading } from '@/hooks/useNavigationWithLoading';
import { CalculatorModal } from '@/components/ui/CalculatorModal';
import { getEffectiveRole, isResident } from '@/lib/roleUtils';
import BuildingSelectorButton from './BuildingSelectorButton';
import { designSystem } from '@/lib/design-system';
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
  FolderArchive,
  Users,
  UserCheck,
  Truck,
  RefreshCw,
  Calculator,
  TestTube2,
  Monitor,
  Settings,
  Send,
  Lock,
    User,
    CreditCard,
    ChevronRight,
    Info,
    Mail,
    BarChart3,
    Flame,
  } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Navigation link interface
interface NavigationLink {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
  isBeta?: boolean;
  requiresUltraAdmin?: boolean;
  requiresPremium?: boolean;
  // Staff permission required (for staff role only)
  staffPermission?: 'can_access_office_finance' | 'can_view_financials' | 'can_manage_requests';
  // Tooltip description
  tooltip?: string;
}

// Navigation group interface
interface NavigationGroup {
  id: string;
  title: string;
  colorKey: keyof typeof designSystem.colors;
  links: NavigationLink[];
}

// Grouped navigation links with design system colors
const navigationGroups: NavigationGroup[] = [
  {
    id: 'main',
    title: 'Κύρια',
    colorKey: 'primary',
    links: [
      {
        href: '/dashboard',
        label: 'Πίνακας Ελέγχου',
        icon: <Home className="w-5 h-5" />,
        roles: ['manager', 'internal_manager', 'staff', 'superuser'],
        tooltip: 'Εδώ βλέπετε την συνολική εικόνα του κτιρίου που έχετε επιλέξει ή όλων των κτιρίων',
      },
      {
        href: '/office-dashboard',
        label: 'Κέντρο Ελέγχου',
        icon: <Shield className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
        tooltip: 'Συγκεντρωτική εικόνα όλων των κτιρίων και οικονομικών στοιχείων του γραφείου',
      },
      {
        href: '/my-apartment',
        label: 'Το Διαμέρισμά μου',
        icon: <Home className="w-5 h-5" />,
        roles: ['resident', 'internal_manager'],
        tooltip: 'Προβολή και διαχείριση των στοιχείων του διαμερίσματός σας',
      },
      {
        href: '/online-payments',
        label: 'Πληρωμή Online',
        icon: <CreditCard className="w-5 h-5" />,
        roles: ['resident', 'internal_manager'],
        tooltip: 'Πραγματοποιήστε πληρωμές για τα οφειλόμενα ποσά του διαμερίσματός σας',
      },
      {
        href: '/announcements',
        label: 'Ανακοινώσεις',
        icon: <Megaphone className="w-5 h-5" />,
        roles: ['manager', 'resident', 'internal_manager', 'staff', 'superuser'],
        tooltip: 'Δείτε και διαχειριστείτε τις ανακοινώσεις του κτιρίου',
      },
      {
        href: '/votes',
        label: 'Ψηφοφορίες',
        icon: <CheckSquare className="w-5 h-5" />,
        roles: ['manager', 'resident', 'internal_manager', 'staff', 'superuser'],
        tooltip: 'Δημιουργήστε και συμμετέχετε σε ψηφοφορίες για θέματα του κτιρίου',
      },
      {
        href: '/assemblies',
        label: 'Συνελεύσεις',
        icon: <Users className="w-5 h-5" />,
        roles: ['manager', 'resident', 'internal_manager', 'staff', 'superuser'],
        tooltip: 'Οργάνωση και διαχείριση γενικών συνελεύσεων με δομημένη ατζέντα',
      },
      {
        href: '/requests',
        label: 'Αναφορά Βλαβών',
        icon: <ClipboardList className="w-5 h-5" />,
        roles: ['manager', 'resident', 'internal_manager', 'staff', 'superuser'],
        tooltip: 'Υποβάλετε και παρακολουθήστε αιτήματα για συντήρηση και επισκευές',
      },
    ]
  },
  {
    id: 'financial',
    title: 'Οικονομικά',
    colorKey: 'orange',
    links: [
      {
        href: '/financial',
        label: 'Οικονομικά Κτιρίων',
        icon: <Euro className="w-5 h-5" />,
        roles: ['manager', 'internal_manager', 'staff', 'superuser'],
        tooltip: 'Διαχείριση εσόδων, εξόδων και οικονομικών στοιχείων των κτιρίων',
      },
      {
        href: '/maintenance',
        label: 'Υπηρεσίες',
        icon: <Wrench className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
        tooltip: 'Διαχείριση υπηρεσιών συντήρησης και επισκευών',
      },
      {
        href: '/projects',
        label: 'Εργα & Προσφορές',
        icon: <FileText className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
        tooltip: 'Διαχείριση προσφορών και έργων',
      },
    ]
  },
  {
    id: 'management',
    title: 'Διαχείριση',
    colorKey: 'success',
    links: [
      {
        href: '/buildings',
        label: 'Κτίρια',
        icon: <Building2 className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
        tooltip: 'Διαχείριση και προβολή όλων των κτιρίων',
      },
      {
        href: '/apartments',
        label: 'Διαμερίσματα',
        icon: <Building className="w-5 h-5" />,
        roles: ['manager', 'internal_manager', 'staff', 'superuser'],
        tooltip: 'Διαχείριση διαμερισμάτων και κατοίκων',
      },
      {
        href: '/users',
        label: 'Χρήστες & Προσκλήσεις',
        icon: <Users className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
        tooltip: 'Διαχείριση χρηστών και αποστολή προσκλήσεων',
      },
      {
        href: '/map-visualization',
        label: 'Χάρτης',
        icon: <MapPin className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
        tooltip: 'Οπτικοποίηση των κτιρίων σε χάρτη',
      },
      {
        href: '/data-migration',
        label: 'Μετανάστευση',
        icon: <RefreshCw className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
        tooltip: 'Μεταφορά δεδομένων μεταξύ συστημάτων',
      },
    ]
  },
  {
    id: 'communication',
    title: 'Επικοινωνία',
    colorKey: 'info',
    links: [
      {
        href: '/chat',
        label: 'Chat',
        icon: <MessageCircle className="w-5 h-5" />,
        roles: ['manager', 'resident', 'internal_manager', 'staff', 'superuser'],
        tooltip: 'Συνομιλία με διαχειριστές και κατοίκους',
      },
      {
        href: '/notifications',
        label: 'Ειδοποιήσεις',
        icon: <Send className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
        tooltip: 'Αποστολή και διαχείριση ειδοποιήσεων',
      },
    ]
  },
  {
    id: 'office',
    title: 'Γραφείο Διαχείρισης',
    colorKey: 'purple',
    links: [
      {
        href: '/office-staff',
        label: 'Υπάλληλοι',
        icon: <UserCheck className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
        tooltip: 'Διαχείριση υπαλλήλων του γραφείου',
      },
      {
        href: '/office-finance',
        label: 'Οικονομικά Γραφείου',
        icon: <CreditCard className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
        staffPermission: 'can_access_office_finance', // Staff needs this permission
        tooltip: 'Συνολική οικονομική εικόνα του γραφείου διαχείρισης',
      },
      {
        href: '/my-profile',
        label: 'Προφίλ',
        icon: <User className="w-5 h-5" />,
        roles: ['manager', 'resident', 'internal_manager', 'staff', 'superuser'],
        tooltip: 'Διαχείριση των προσωπικών σας στοιχείων',
      },
      {
        href: '/my-subscription',
        label: 'Συνδρομή',
        icon: <CreditCard className="w-5 h-5" />,
        roles: ['manager', 'resident', 'internal_manager', 'staff', 'superuser'],
        tooltip: 'Προβολή και διαχείριση της συνδρομής σας',
      },
    ]
  },
  {
    id: 'premium',
    title: 'Premium',
    colorKey: 'purple',
    links: [
      {
        href: '/kiosk-management',
        label: 'Διαχείριση info point',
        icon: <Settings className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
        requiresPremium: true,
        tooltip: 'Ρύθμιση scenes, widgets και προγράμματος προβολής για το info point εισόδου με live preview.',
      },
      {
        href: '/kiosk',
        label: 'Display kiosk info point',
        icon: <Monitor className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
        requiresPremium: true,
        tooltip: 'Άνοιγμα της οθόνης προβολής σε πλήρη οθόνη για TV/monitor στην είσοδο.',
      },
      {
        href: '/heating',
        label: 'Smart Heating',
        icon: <Flame className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
        requiresPremium: true,
        tooltip: 'Έλεγχος κεντρικής θέρμανσης με ωράρια, θερμοκρασίες, ζώνες και αυτοματισμούς IoT.',
      },
      {
        href: '/documents',
        label: 'Παραστατικά',
        icon: <FileText className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
        isBeta: true,
        requiresPremium: true,
        tooltip: 'Ψηφιοποίηση παραστατικών με AI/OCR, αυτόματη συμπλήρωση στοιχείων και δημιουργία δαπανών.',
      },
      {
        href: '/archive',
        label: 'Ηλεκτρονικό Αρχείο',
        icon: <FolderArchive className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
        requiresPremium: true,
        tooltip: 'Κεντρικό αρχείο για πρακτικά, συμβάσεις και παραστατικά με κατηγοριοποίηση και αναζήτηση.',
      },
    ]
  },
  // Admin System Tools (for manager/admin/superuser)
  {
    id: 'system',
    title: 'Σύστημα',
    colorKey: 'danger',
    links: [
      {
        href: '/admin/backup-restore',
        label: 'Backup/Restore',
        icon: <RefreshCw className="w-5 h-5" />,
        roles: ['manager', 'superuser'], // Admin (mapped to manager) and superuser
        tooltip: 'Δημιουργία αντιγράφων ασφαλείας και επαναφορά δεδομένων',
      },
      {
        href: '/admin/database-cleanup',
        label: 'Εκκαθάριση DB',
        icon: <TestTube2 className="w-5 h-5" />,
        roles: ['manager', 'superuser'], // Admin (mapped to manager) and superuser
        tooltip: 'Εκκαθάριση και βελτιστοποίηση της βάσης δεδομένων',
      },
    ]
  },
  {
    id: 'ads',
    title: 'Διαφημίσεις',
    colorKey: 'warning',
    links: [
      {
        href: '/admin/ad-portal',
        label: 'Ad Settings',
        icon: <Megaphone className="w-5 h-5" />,
        roles: ['superuser'],
        requiresUltraAdmin: true,
        tooltip: 'Ρύθμιση πακέτων/τιμών και δημιουργία QR tokens (Ultra Admin μόνο)',
      },
      {
        href: '/office-dashboard/ad-analytics',
        label: 'Ad Analytics',
        icon: <BarChart3 className="w-5 h-5" />,
        roles: ['superuser'],
        requiresUltraAdmin: true,
        tooltip: 'Funnel metrics ανά κτίριο (Ultra Admin μόνο)',
      },
    ],
  },
  {
    id: 'ultra',
    title: 'Ultra Admin',
    colorKey: 'purple',
    links: [
      {
        href: '/admin/marketplace',
        label: 'Marketplace',
        icon: <Truck className="w-5 h-5" />,
        roles: ['superuser'],
        requiresUltraAdmin: true,
        tooltip: 'Διαχείριση συνεργατών Marketplace (Ultra Admin μόνο)',
      },
    ],
  },
];

export default function CollapsibleSidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Desktop: expanded by default. Mobile: collapsed (set in effect).
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPinned, setIsPinned] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const { user, isLoading: authIsLoading, isAuthReady } = useAuth();
  const {
    buildings,
    currentBuilding,
    selectedBuilding,
    setSelectedBuilding,
    isLoading: buildingsIsLoading,
    buildingContext,
  } = useBuilding();

  // Check if resident has multiple buildings
  const isResidentUser = isResident(user);
  const hasMultipleBuildings = buildings && buildings.length > 1;
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

  const handleNavigation = async (href: string) => {
    setIsMobileMenuOpen(false);
    await navigateWithLoading(href);
  };

  // Auto-set expanded state based on viewport (lg breakpoint ~1024px)
  useEffect(() => {
    const applyResponsiveState = () => {
      const isMobile = window.innerWidth < 1024;
      setIsExpanded(!isMobile);
      setIsPinned(!isMobile);
    };
    applyResponsiveState();
    window.addEventListener('resize', applyResponsiveState);
    return () => window.removeEventListener('resize', applyResponsiveState);
  }, []);

  // Track dark mode (class-based) to switch sidebar backplate
  useEffect(() => {
    const root = document.documentElement;
    const updateMode = () => setIsDarkMode(root.classList.contains('dark'));
    updateMode();
    const observer = new MutationObserver(updateMode);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Determine user role
  const userRole = getEffectiveRole(user);
  const isUltraAdminUser = Boolean(
    user?.role?.toLowerCase() === 'admin' && user?.is_superuser && user?.is_staff
  );

  // Check if staff has a specific permission
  const staffHasPermission = (permissionKey: NavigationLink['staffPermission']): boolean => {
    if (!permissionKey) return true; // No permission required
    if (!user || userRole !== 'staff') return true; // Only check for staff role

    const permissions = user.staff_permissions;
    if (!permissions || !permissions.is_active) return false;

    return permissions[permissionKey] === true;
  };

  const getPremiumUpgradeHref = () => {
    const buildingId = selectedBuilding?.id;
    return buildingId ? `/upgrade?building_id=${buildingId}` : '/upgrade';
  };

  const getLockedHref = (link: NavigationLink) => {
    if (link.href === '/documents' || link.href === '/archive') {
      return link.href;
    }
    return getPremiumUpgradeHref();
  };

  const isLinkLocked = (link: NavigationLink): boolean => {
    if (!link.requiresPremium) return false;

    // If we don't have a resolved building context yet, be conservative and lock.
    const kioskEnabled =
      buildingContext?.billing?.kiosk_enabled ??
      buildingContext?.premium_enabled ??
      false;

    return !kioskEnabled;
  };

  // Filter available groups and links based on user role AND staff permissions
  const availableGroups = navigationGroups.map(group => ({
    ...group,
    links: group.links.filter(link => {
      // First check role
      if (!userRole || !link.roles.includes(userRole)) return false;

      // Ultra admin gating (extra hard check, not just role mapping)
      if (link.requiresUltraAdmin) {
        return isUltraAdminUser;
      }

      // Then check staff permission if required
      if (link.staffPermission && userRole === 'staff') {
        return staffHasPermission(link.staffPermission);
      }

      return true;
    })
  })).filter(group => group.links.length > 0);

  // Map color keys to Tailwind classes - Kaspersky-inspired soft colors
  const getColorClasses = (colorKey: keyof typeof designSystem.colors) => {
    const colorMap: Record<string, {
      bg: string;
      hover: string;
      text: string;
      icon: string;
      active: string;
    }> = {
      primary: {
        bg: "bg-teal-50/80 dark:bg-teal-500/10",
        hover: "hover:bg-teal-50 dark:hover:bg-teal-500/15 hover:text-teal-800 dark:hover:text-teal-300",
        text: "text-teal-700 dark:text-teal-400",
        icon: "text-teal-600 dark:text-teal-400",
        active: "bg-teal-100 text-teal-900 dark:bg-teal-500/25 dark:text-teal-200 shadow-sm",
      },
      success: {
        bg: "bg-emerald-50/80 dark:bg-emerald-500/10",
        hover: "hover:bg-emerald-50 dark:hover:bg-emerald-500/15 hover:text-emerald-800 dark:hover:text-emerald-300",
        text: "text-emerald-700 dark:text-emerald-400",
        icon: "text-emerald-600 dark:text-emerald-400",
        active: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/25 dark:text-emerald-200 shadow-sm",
      },
      orange: {
        bg: "bg-amber-50/80 dark:bg-amber-500/10",
        hover: "hover:bg-amber-50 dark:hover:bg-amber-500/15 hover:text-amber-800 dark:hover:text-amber-300",
        text: "text-amber-700 dark:text-amber-400",
        icon: "text-amber-600 dark:text-amber-400",
        active: "bg-amber-100 text-amber-900 dark:bg-amber-500/25 dark:text-amber-200 shadow-sm",
      },
      info: {
        bg: "bg-cyan-50/80 dark:bg-cyan-500/10",
        hover: "hover:bg-cyan-50 dark:hover:bg-cyan-500/15 hover:text-cyan-800 dark:hover:text-cyan-300",
        text: "text-cyan-700 dark:text-cyan-400",
        icon: "text-cyan-600 dark:text-cyan-400",
        active: "bg-cyan-100 text-cyan-900 dark:bg-cyan-500/25 dark:text-cyan-200 shadow-sm",
      },
      purple: {
        bg: "bg-purple-50/80 dark:bg-purple-500/10",
        hover: "hover:bg-purple-50 dark:hover:bg-purple-500/15 hover:text-purple-800 dark:hover:text-purple-300",
        text: "text-purple-700 dark:text-purple-400",
        icon: "text-purple-600 dark:text-purple-400",
        active: "bg-purple-100 text-purple-900 dark:bg-purple-500/25 dark:text-purple-200 shadow-sm",
      },
      danger: {
        bg: "bg-rose-50/80 dark:bg-rose-500/10",
        hover: "hover:bg-rose-50 dark:hover:bg-rose-500/15 hover:text-rose-800 dark:hover:text-rose-300",
        text: "text-rose-700 dark:text-rose-400",
        icon: "text-rose-600 dark:text-rose-400",
        active: "bg-rose-100 text-rose-900 dark:bg-rose-500/25 dark:text-rose-200 shadow-sm",
      },
      // Kaspersky category colors
      cyan: {
        bg: "bg-blue-50/80 dark:bg-blue-500/10",
        hover: "hover:bg-blue-50 dark:hover:bg-blue-500/15 hover:text-blue-800 dark:hover:text-blue-300",
        text: "text-blue-700 dark:text-blue-400",
        icon: "text-blue-600 dark:text-blue-400",
        active: "bg-blue-100 text-blue-900 dark:bg-blue-500/25 dark:text-blue-200 shadow-sm",
      },
    };

    // Fallback if color key not found
    return colorMap[colorKey] || colorMap.primary;
  };

  // Loading state
  if (authIsLoading || !isAuthReady || buildingsIsLoading) {
    return (
      <>
        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden fixed top-3 left-3 z-[60] p-2 bg-white dark:bg-slate-800 rounded-xl shadow-md"
          aria-label="Άνοιγμα μενού"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>

        {/* Loading Sidebar - Kaspersky mint style */}
        <aside
          className="hidden lg:flex fixed left-0 top-0 h-full shadow-[0_4px_20px_rgba(0,0,0,0.08)] flex-col justify-center items-center z-40 bg-[#e8f5f3] dark:bg-slate-900 transition-colors duration-300"
          style={{
            width: '80px',
          }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-teal-600 dark:text-teal-400" />
        </aside>
      </>
    );
  }

  return (
    <TooltipProvider>
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-[60] p-2 bg-white dark:bg-slate-800 rounded-xl shadow-md"
        aria-label="Άνοιγμα μενού"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      {/* Desktop Sidebar - Kaspersky mint style */}
      <aside
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => {
          if (!isPinned) setIsExpanded(false);
        }}
        className={cn(
          "hidden lg:flex sticky top-0 h-screen flex-col z-40 overflow-hidden shrink-0",
          "transition-all duration-300 ease-in-out",
          "shadow-[0_4px_20px_rgba(0,0,0,0.06)]",
          // Kaspersky mint background in light mode, dark slate in dark mode
          !isExpanded
            ? "bg-[#e8f5f3] dark:bg-slate-900"
            : "bg-[#e8f5f3] dark:bg-slate-900"
        )}
        style={{
          width: isExpanded ? '256px' : '80px',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {/* Header */}
        <div
          className="p-4 border-b border-teal-100 dark:border-slate-700 flex items-center gap-3 h-20 bg-white/50 dark:bg-slate-800/50"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md bg-teal-500 dark:bg-teal-600 text-white"
          >
            <Building2 className="h-6 w-6" />
          </div>
          <div
            className={cn(
              "transition-all duration-300 overflow-hidden",
              isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
            )}
          >
            <h1
              className="font-bold tracking-tight whitespace-nowrap text-sm text-foreground"
            >
              Digital Concierge
            </h1>
            <p
              className="tracking-wide whitespace-nowrap text-xs text-muted-foreground"
            >
              Διαχείριση Κτιρίων
            </p>
          </div>

          {/* Expand/Collapse Toggle */}
          <button
            onClick={() => {
              setIsPinned((prev) => !prev);
              setIsExpanded((prev) => !prev);
            }}
            className="ml-auto p-2 rounded-lg bg-white/60 dark:bg-slate-700/60 hover:bg-white dark:hover:bg-slate-700 transition shadow-sm"
            aria-label={isExpanded ? 'Σύμπτυξη sidebar' : 'Άνοιγμα sidebar'}
          >
            <ChevronRight
              className={cn(
                "w-4 h-4 text-teal-600 dark:text-teal-400 transition-transform duration-200",
                isExpanded ? "rotate-180" : "rotate-0"
              )}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          {availableGroups.map((group) => {
            const colorClasses = getColorClasses(group.colorKey);

            return (
              <div key={group.id} className="mb-4">
                {/* Group Title - Only visible when expanded */}
                {isExpanded && (
                  <div
                    className={cn(
                      "px-3 py-1.5 mb-2 rounded-lg font-semibold tracking-wide uppercase whitespace-nowrap text-[10px]",
                      colorClasses.bg,
                      colorClasses.text
                    )}
                  >
                    {group.title}
                  </div>
                )}

                {/* Links */}
                <div className="space-y-1">
                  {group.links.map((link) => {
                    const isActive = pathname === link.href ||
                      (pathname && pathname.startsWith(link.href) && link.href !== '/dashboard');
                    const locked = isLinkLocked(link);
                    const effectiveHref = locked ? getLockedHref(link) : link.href;

                    return (
                      <div key={link.href} className="relative group/item">
                        <Tooltip disableHoverableContent={isExpanded}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleNavigation(effectiveHref)}
                              className={cn(
                                'flex items-center w-full rounded-lg font-medium transition-all duration-200 group relative',
                                isExpanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center',
                                isActive && 'shadow-md',
                                locked && 'opacity-60',
                                // Ensure readable text in dark mode (some themes map muted-foreground too dark)
                                isActive
                                  ? colorClasses.active
                                  : `text-muted-foreground dark:text-slate-200 ${colorClasses.hover} hover:text-foreground`
                              )}
                              style={{
                                fontSize: designSystem.typography.fontSize.sm,
                              }}
                            >
                              {/* Icon */}
                              <span
                                className={cn(
                                  'transition-colors duration-200 flex-shrink-0',
                                  isExpanded && 'mr-3',
                                  !isActive && colorClasses.icon
                                )}
                              >
                                {link.icon}
                              </span>

                              {/* Label */}
                              <span
                                className={cn(
                                  "transition-all duration-300 overflow-hidden whitespace-nowrap",
                                  isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
                                )}
                              >
                                {link.label}
                              </span>

                              {/* Premium Lock */}
                              {locked && isExpanded && (
                                <span className="ml-2 flex items-center">
                                  <Lock className="w-4 h-4 text-muted-foreground dark:text-slate-300" />
                                </span>
                              )}

                              {/* Info Icon with Tooltip */}
                              {link.tooltip && isExpanded && (
                                <Tooltip disableHoverableContent>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                      }}
                                      className={cn(
                                        "ml-auto p-1 rounded transition-colors flex-shrink-0",
                                        isActive
                                          ? "hover:bg-white/10 text-white/80"
                                          : "hover:bg-muted text-muted-foreground dark:text-slate-200"
                                      )}
                                    >
                                      <Info className="w-3.5 h-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="right"
                                    className="max-w-xs z-50 bg-popover text-popover-foreground border-border shadow-lg"
                                    sideOffset={8}
                                  >
                                    <p className="text-xs leading-relaxed">{link.tooltip}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              {/* Beta Badge */}
                              {link.isBeta && isExpanded && (
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded-full font-bold",
                                    link.tooltip ? "ml-2" : "ml-auto",
                                    !isActive && colorClasses.bg,
                                    !isActive && colorClasses.text
                                  )}
                                  style={{
                                    fontSize: designSystem.typography.fontSize.xs,
                                    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : undefined,
                                  }}
                                >
                                  BETA
                                </span>
                              )}
                            </button>
                          </TooltipTrigger>
                          {!isExpanded && (
                            <TooltipContent
                              side="right"
                              className="z-50 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 border-gray-200 dark:border-slate-600 shadow-lg rounded-lg"
                              sideOffset={10}
                            >
                              <p className="text-xs font-semibold">{link.label}</p>
                              {locked && (
                                <p className="text-xs mt-1 text-muted-foreground">Απαιτείται Premium (Kiosk + AI + Αρχείο)</p>
                              )}
                              {link.tooltip && (
                                <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">{link.tooltip}</p>
                              )}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Calculator Tool */}
        <div
          className="p-3 border-t border-teal-100 dark:border-slate-700 bg-white/30 dark:bg-slate-800/30"
        >
          <CalculatorModal>
            <button
              title={!isExpanded ? 'Αριθμομηχανή' : undefined}
              className={cn(
                'flex items-center w-full rounded-lg font-medium transition-all duration-200',
                isExpanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center',
                'text-sm text-gray-700 dark:text-gray-200 hover:bg-white/60 dark:hover:bg-slate-700/60'
              )}
            >
              <Calculator
                className={cn('w-5 h-5 transition-colors text-teal-600 dark:text-teal-400', isExpanded && 'mr-3')}
              />
              <span
                className={cn(
                  "transition-all duration-300 overflow-hidden whitespace-nowrap",
                  isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
                )}
              >
                Αριθμομηχανή
              </span>
            </button>
          </CalculatorModal>
        </div>
      </aside>

      {/* Mobile Sidebar - Kaspersky mint style */}
      <aside
        className={cn(
          "lg:hidden fixed left-0 top-0 h-full w-64 flex flex-col z-[70]",
          "shadow-[0_4px_24px_rgba(0,0,0,0.12)]",
          // Kaspersky mint background
          "bg-[#e8f5f3] dark:bg-slate-900",
          "transform transition-transform duration-300",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          fontFamily: 'var(--font-sans)',
        }}
      >
        {/* Mobile Header */}
        <div
          className="p-4 border-b border-teal-100 dark:border-slate-700 flex items-center justify-between bg-white/50 dark:bg-slate-800/50 h-20"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md bg-teal-500 dark:bg-teal-600 text-white"
            >
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1
                className="font-bold tracking-tight text-sm text-gray-800 dark:text-gray-100"
              >
                Digital Concierge
              </h1>
              <p
                className="text-xs text-gray-500 dark:text-gray-400"
              >
                Διαχείριση Κτιρίων
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-white/60 dark:hover:bg-slate-700/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Building Selector for users with multiple buildings */}
        {hasMultipleBuildings && (
          <div className="px-4 py-3 border-b border-teal-100 dark:border-slate-700 bg-white/30 dark:bg-slate-800/30">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Επιλέξτε Πολυκατοικία:</p>
            <BuildingSelectorButton
              onBuildingSelect={setSelectedBuilding}
              selectedBuilding={selectedBuilding}
              className="w-full justify-between"
            />
          </div>
        )}

        {/* Mobile Navigation */}
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {availableGroups.map((group) => {
            const colorClasses = getColorClasses(group.colorKey);

            return (
              <div key={group.id}>
                <div
                  className={cn(
                    "px-3 py-1.5 mb-2 rounded-lg font-semibold tracking-wide uppercase text-[10px]",
                    colorClasses.bg,
                    colorClasses.text
                  )}
                >
                  {group.title}
                </div>

                <div className="space-y-1">
                  {group.links.map((link) => {
                    const isActive = pathname === link.href;
                    const locked = isLinkLocked(link);
                    const effectiveHref = locked ? getLockedHref(link) : link.href;

                    return (
                      <div key={link.href} className="relative flex items-center">
                        <button
                          onClick={() => handleNavigation(effectiveHref)}
                          className={cn(
                            "flex items-center flex-1 px-3 py-2.5 rounded-lg font-medium transition-all duration-200",
                            locked && "opacity-60",
                            // Ensure readable text in dark mode (some themes map muted-foreground too dark)
                            isActive
                              ? colorClasses.active
                              : `text-muted-foreground dark:text-slate-200 ${colorClasses.hover} hover:text-foreground`
                          )}
                          style={{
                            fontSize: designSystem.typography.fontSize.sm,
                          }}
                        >
                          <span className={cn("mr-3", !isActive && colorClasses.icon)}>
                            {link.icon}
                          </span>
                          <span>{link.label}</span>
                          {locked && <Lock className="ml-2 w-4 h-4 text-muted-foreground dark:text-slate-300" />}
                        </button>
                        {/* Info Icon with Tooltip for Mobile */}
                        {link.tooltip && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                className={cn(
                                  "p-1 rounded transition-colors flex-shrink-0 ml-2",
                                  isActive
                                    ? "hover:bg-white/10 text-white/80"
                                    : "hover:bg-muted text-muted-foreground dark:text-slate-200"
                                )}
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="max-w-xs z-[60] bg-popover text-popover-foreground border-border shadow-lg"
                              sideOffset={8}
                            >
                              <p className="text-xs leading-relaxed">{link.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-[65] backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </TooltipProvider>
  );
}
