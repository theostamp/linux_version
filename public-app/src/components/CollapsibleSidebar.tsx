'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useNavigationWithLoading } from '@/hooks/useNavigationWithLoading';
import { CalculatorModal } from '@/components/ui/CalculatorModal';
import { getEffectiveRole } from '@/lib/roleUtils';
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
  ChevronRight,
  Info,
  Mail,
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
        label: 'Αιτήματα',
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
        label: 'Προσφορές',
        icon: <FileText className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
        tooltip: 'Διαχείριση προσφορών και έργων',
      },
      {
        href: '/documents',
        label: 'Παραστατικά',
        icon: <FileText className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
        isBeta: true,
        tooltip: 'Διαχείριση παραστατικών και οικονομικών εγγράφων',
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
    id: 'kiosk',
    title: 'Kiosk',
    colorKey: 'purple',
    links: [
      {
        href: '/kiosk-management',
        label: 'Διαχείριση',
        icon: <Settings className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
        tooltip: 'Ρυθμίσεις και διαχείριση του Kiosk',
      },
      {
        href: '/kiosk',
        label: 'Display',
        icon: <Monitor className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
        tooltip: 'Προβολή της οθόνης Kiosk',
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

  // Check if staff has a specific permission
  const staffHasPermission = (permissionKey: NavigationLink['staffPermission']): boolean => {
    if (!permissionKey) return true; // No permission required
    if (!user || userRole !== 'staff') return true; // Only check for staff role
    
    const permissions = user.staff_permissions;
    if (!permissions || !permissions.is_active) return false;
    
    return permissions[permissionKey] === true;
  };

  // Filter available groups and links based on user role AND staff permissions
  const availableGroups = navigationGroups.map(group => ({
    ...group,
    links: group.links.filter(link => {
      // First check role
      if (!userRole || !link.roles.includes(userRole)) return false;
      
      // Then check staff permission if required
      if (link.staffPermission && userRole === 'staff') {
        return staffHasPermission(link.staffPermission);
      }
      
      return true;
    })
  })).filter(group => group.links.length > 0);

  // Map color keys to Tailwind classes for Dark Mode support
  const getColorClasses = (colorKey: keyof typeof designSystem.colors) => {
    const colorMap: Record<string, {
      bg: string;
      hover: string;
      text: string;
      icon: string;
      active: string;
    }> = {
      primary: {
        bg: "bg-indigo-50 dark:bg-transparent",
        hover: "hover:bg-indigo-50 dark:hover:bg-indigo-400/10 dark:hover:text-indigo-200",
        text: "text-indigo-700 dark:text-indigo-400",
        icon: "text-indigo-600 dark:text-indigo-400",
        active: "bg-indigo-100 text-indigo-900 dark:bg-indigo-500/20 dark:text-indigo-200",
      },
      success: {
        bg: "bg-teal-50 dark:bg-transparent",
        hover: "hover:bg-teal-50 dark:hover:bg-teal-400/10 dark:hover:text-teal-200",
        text: "text-teal-700 dark:text-teal-400",
        icon: "text-teal-600 dark:text-teal-400",
        active: "bg-teal-100 text-teal-900 dark:bg-teal-500/20 dark:text-teal-200",
      },
      orange: {
        bg: "bg-orange-50 dark:bg-transparent",
        hover: "hover:bg-orange-50 dark:hover:bg-orange-400/10 dark:hover:text-orange-200",
        text: "text-orange-700 dark:text-orange-400",
        icon: "text-orange-600 dark:text-orange-400",
        active: "bg-orange-100 text-orange-900 dark:bg-orange-500/20 dark:text-orange-200",
      },
      info: {
        bg: "bg-sky-50 dark:bg-transparent",
        hover: "hover:bg-sky-50 dark:hover:bg-sky-400/10 dark:hover:text-sky-200",
        text: "text-sky-700 dark:text-sky-400",
        icon: "text-sky-600 dark:text-sky-400",
        active: "bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-200",
      },
      purple: {
        bg: "bg-purple-50 dark:bg-transparent",
        hover: "hover:bg-purple-50 dark:hover:bg-purple-400/10 dark:hover:text-purple-200",
        text: "text-purple-700 dark:text-purple-400",
        icon: "text-purple-600 dark:text-purple-400",
        active: "bg-purple-100 text-purple-900 dark:bg-purple-500/20 dark:text-purple-200",
      },
      danger: {
        bg: "bg-rose-50 dark:bg-transparent",
        hover: "hover:bg-rose-50 dark:hover:bg-rose-400/10 dark:hover:text-rose-200",
        text: "text-rose-700 dark:text-rose-400",
        icon: "text-rose-600 dark:text-rose-400",
        active: "bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-200",
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
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card rounded-lg shadow-lg border border-gray-300"
        >
          <Menu className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Loading Sidebar */}
        <aside
          className="hidden lg:flex fixed left-0 top-0 h-full shadow-xl border-r border-gray-300 flex-col justify-center items-center z-40 bg-gray-50 transition-colors duration-300"
          style={{
            width: '80px',
          }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </aside>
      </>
    );
  }

  return (
    <TooltipProvider>
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card rounded-lg shadow-lg border border-border"
      >
        <Menu className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* Desktop Sidebar - Collapsible */}
      <aside
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => {
          if (!isPinned) setIsExpanded(false);
        }}
        className={cn(
          "hidden lg:flex fixed left-0 top-0 h-full shadow-xl border-r border-gray-300 flex-col z-40 overflow-hidden text-card-foreground",
          "transition-all duration-300 ease-in-out",
          !isExpanded ? "bg-gray-50" : "bg-card"
        )}
        style={{
          width: isExpanded ? '256px' : '80px',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {/* Header */}
        <div 
          className="p-4 border-b border-gray-300 flex items-center gap-3 min-h-[64px]"
        >
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md bg-primary text-primary-foreground"
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
            className="ml-auto p-2 rounded-lg border border-gray-300 bg-muted/30 hover:bg-muted transition"
            aria-label={isExpanded ? 'Σύμπτυξη sidebar' : 'Άνοιγμα sidebar'}
          >
            <ChevronRight
              className={cn(
                "w-4 h-4 text-muted-foreground transition-transform duration-200",
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
                    
                    return (
                      <div key={link.href} className="relative group/item">
                        <Tooltip disableHoverableContent={isExpanded}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleNavigation(link.href)}
                              className={cn(
                                'flex items-center w-full rounded-lg font-medium transition-all duration-200 group relative',
                                isExpanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center',
                                isActive && 'shadow-md',
                                isActive ? colorClasses.active : `text-muted-foreground ${colorClasses.hover} hover:text-foreground`
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
                                        isActive ? "hover:bg-white/10 text-white/80" : "hover:bg-muted text-muted-foreground"
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
                              className="z-50 bg-popover text-popover-foreground border-gray-300 shadow-lg"
                              sideOffset={10}
                            >
                              <p className="text-xs font-semibold">{link.label}</p>
                              {link.tooltip && (
                                <p className="text-xs mt-1 text-muted-foreground/80">{link.tooltip}</p>
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
          className="p-3 border-t border-gray-300"
        >
          <CalculatorModal>
            <button 
              title={!isExpanded ? 'Αριθμομηχανή' : undefined}
              className={cn(
                'flex items-center w-full rounded-lg font-medium transition-all duration-200',
                isExpanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center',
                'text-sm text-foreground hover:bg-muted'
              )}
            >
              <Calculator 
                className={cn('w-5 h-5 transition-colors text-muted-foreground', isExpanded && 'mr-3')}
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

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed left-0 top-0 h-full w-64 shadow-xl border-r border-gray-300 flex flex-col z-50 bg-card text-card-foreground",
          "transform transition-transform duration-300",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          fontFamily: 'var(--font-sans)',
        }}
      >
        {/* Mobile Header */}
        <div 
          className="p-4 border-b border-gray-300 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md bg-primary text-primary-foreground"
            >
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 
                className="font-bold tracking-tight text-sm text-foreground"
              >
                Digital Concierge
              </h1>
              <p 
                className="text-xs text-muted-foreground"
              >
                Διαχείριση Κτιρίων
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
                    
                    return (
                      <div key={link.href} className="relative flex items-center">
                        <button
                          onClick={() => handleNavigation(link.href)}
                          className={cn(
                            "flex items-center flex-1 px-3 py-2.5 rounded-lg font-medium transition-all duration-200",
                            isActive ? colorClasses.active : `text-muted-foreground ${colorClasses.hover} hover:text-foreground`
                          )}
                          style={{
                            fontSize: designSystem.typography.fontSize.sm,
                          }}
                        >
                          <span className={cn("mr-3", !isActive && colorClasses.icon)}>
                            {link.icon}
                          </span>
                          <span>{link.label}</span>
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
                                  isActive ? "hover:bg-white/10 text-white/80" : "hover:bg-muted text-muted-foreground"
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
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </TooltipProvider>
  );
}
