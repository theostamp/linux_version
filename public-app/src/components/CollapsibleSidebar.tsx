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
} from 'lucide-react';

// Navigation link interface
interface NavigationLink {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
  isBeta?: boolean;
  // Staff permission required (for staff role only)
  staffPermission?: 'can_access_office_finance' | 'can_view_financials' | 'can_manage_requests';
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
      },
      {
        href: '/office-dashboard',
        label: 'Κέντρο Ελέγχου',
        icon: <Shield className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
      },
      {
        href: '/my-apartment',
        label: 'Το Διαμέρισμά μου',
        icon: <Home className="w-5 h-5" />,
        roles: ['resident', 'internal_manager'],
      },
      {
        href: '/online-payments',
        label: 'Πληρωμή Online',
        icon: <CreditCard className="w-5 h-5" />,
        roles: ['resident', 'internal_manager'],
      },
      {
        href: '/announcements',
        label: 'Ανακοινώσεις',
        icon: <Megaphone className="w-5 h-5" />,
        roles: ['manager', 'resident', 'internal_manager', 'staff', 'superuser'],
      },
      {
        href: '/votes',
        label: 'Ψηφοφορίες',
        icon: <CheckSquare className="w-5 h-5" />,
        roles: ['manager', 'resident', 'internal_manager', 'staff', 'superuser'],
      },
      {
        href: '/requests',
        label: 'Αιτήματα',
        icon: <ClipboardList className="w-5 h-5" />,
        roles: ['manager', 'resident', 'internal_manager', 'staff', 'superuser'],
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
      },
      {
        href: '/maintenance',
        label: 'Υπηρεσίες',
        icon: <Wrench className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
      },
      {
        href: '/projects',
        label: 'Προσφορές',
        icon: <FileText className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
      },
      {
        href: '/documents',
        label: 'Παραστατικά',
        icon: <FileText className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
        isBeta: true,
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
      },
      {
        href: '/apartments',
        label: 'Διαμερίσματα',
        icon: <Building className="w-5 h-5" />,
        roles: ['manager', 'internal_manager', 'staff', 'superuser'],
      },
      {
        href: '/map-visualization',
        label: 'Χάρτης',
        icon: <MapPin className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
      },
      {
        href: '/data-migration',
        label: 'Μετανάστευση',
        icon: <RefreshCw className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
      },
    ]
  },
  // Προσωρινά απενεργοποιημένο - Συνεργασίες & Ομάδες
  // {
  //   id: 'collaboration',
  //   title: 'Συνεργασίες',
  //   colorKey: 'info',
  //   links: [
  //     {
  //       href: '/teams',
  //       label: 'Ομάδες',
  //       icon: <Users className="w-5 h-5" />,
  //       roles: ['manager', 'staff', 'superuser'],
  //     },
  //     {
  //       href: '/collaborators',
  //       label: 'Συνεργάτες',
  //       icon: <UserCheck className="w-5 h-5" />,
  //       roles: ['manager', 'staff', 'superuser'],
  //     },
  //     {
  //       href: '/suppliers',
  //       label: 'Προμηθευτές',
  //       icon: <Truck className="w-5 h-5" />,
  //       roles: ['manager', 'staff', 'superuser'],
  //     },
  //   ]
  // },
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
      },
      {
        href: '/notifications',
        label: 'Ειδοποιήσεις',
        icon: <Send className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
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
      },
      {
        href: '/office-finance',
        label: 'Οικονομικά Γραφείου',
        icon: <CreditCard className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
        staffPermission: 'can_access_office_finance', // Staff needs this permission
      },
      {
        href: '/my-profile',
        label: 'Προφίλ',
        icon: <User className="w-5 h-5" />,
        roles: ['manager', 'resident', 'internal_manager', 'staff', 'superuser'],
      },
      {
        href: '/my-subscription',
        label: 'Συνδρομή',
        icon: <CreditCard className="w-5 h-5" />,
        roles: ['manager', 'resident', 'internal_manager', 'staff', 'superuser'],
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
      },
      {
        href: '/kiosk',
        label: 'Display',
        icon: <Monitor className="w-5 h-5" />,
        roles: ['manager', 'staff', 'superuser'],
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
      },
      {
        href: '/admin/database-cleanup',
        label: 'Εκκαθάριση DB',
        icon: <TestTube2 className="w-5 h-5" />,
        roles: ['manager', 'superuser'], // Admin (mapped to manager) and superuser
      },
    ]
  },
];

export default function CollapsibleSidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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

  const getColorScheme = (colorKey: keyof typeof designSystem.colors) => {
    const colors = designSystem.colors[colorKey];
    return {
      bg: colors[50],
      hover: colors[100],
      text: colors[700],
      icon: colors[600],
      active: colors[500],
    };
  };

  // Loading state
  if (authIsLoading || !isAuthReady || buildingsIsLoading) {
    return (
      <>
        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card rounded-lg shadow-lg border border-slate-200/60"
        >
          <Menu className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Loading Sidebar */}
        <aside
          className="hidden lg:flex fixed left-0 top-0 h-full shadow-xl border-r border-slate-200/60 flex-col justify-center items-center z-40"
          style={{
            backgroundColor: '#FFFAF0',
            width: '80px',
          }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </aside>
      </>
    );
  }

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card rounded-lg shadow-lg border border-slate-200/60"
      >
        <Menu className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* Desktop Sidebar - Collapsible */}
      <aside
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={cn(
          "hidden lg:flex fixed left-0 top-0 h-full shadow-xl border-r border-slate-200/60 flex-col z-40 overflow-hidden",
          "transition-all duration-300 ease-in-out"
        )}
        style={{
          backgroundColor: '#FFFAF0',
          width: isExpanded ? '256px' : '80px',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {/* Header */}
        <div 
          className="p-4 border-b border-slate-200/50 flex items-center gap-3 min-h-[64px]"
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
          
          {/* Expand/Collapse Indicator */}
          <div className={cn(
            "ml-auto transition-all duration-300",
            isExpanded ? "opacity-100" : "opacity-0"
          )}>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
          {availableGroups.map((group) => {
            const colors = getColorScheme(group.colorKey);
            
            return (
              <div key={group.id} className="mb-4">
                {/* Group Title - Only visible when expanded */}
                {isExpanded && (
                  <div
                    className="px-3 py-1.5 mb-2 rounded-lg font-semibold tracking-wide uppercase whitespace-nowrap"
                    style={{
                      fontSize: '10px',
                      color: colors.text,
                      backgroundColor: colors.bg,
                    }}
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
                      <button
                        key={link.href}
                        onClick={() => handleNavigation(link.href)}
                        title={!isExpanded ? link.label : undefined}
                        className={cn(
                          'flex items-center w-full rounded-lg font-medium transition-all duration-200 group relative',
                          isExpanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center',
                          isActive && 'shadow-md',
                        )}
                        style={{
                          fontSize: designSystem.typography.fontSize.sm,
                          color: isActive ? 'white' : colors.text,
                          backgroundColor: isActive ? colors.active : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = colors.hover;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {/* Icon */}
                        <span 
                          className={cn(
                            'transition-colors duration-200 flex-shrink-0',
                            isExpanded && 'mr-3'
                          )}
                          style={{
                            color: isActive ? 'white' : colors.icon,
                          }}
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
                        
                        {/* Beta Badge */}
                        {link.isBeta && isExpanded && (
                          <span 
                            className="ml-auto px-2 py-0.5 rounded-full font-bold"
                            style={{
                              fontSize: designSystem.typography.fontSize.xs,
                              backgroundColor: isActive 
                                ? 'rgba(255, 255, 255, 0.2)' 
                                : colors.hover,
                              color: isActive ? 'white' : colors.text,
                            }}
                          >
                            BETA
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Calculator Tool */}
        <div 
          className="p-3 border-t border-slate-200/50"
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
          "lg:hidden fixed left-0 top-0 h-full w-64 shadow-xl border-r border-slate-200/60 flex flex-col z-50",
          "transform transition-transform duration-300",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          backgroundColor: '#FFFAF0',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {/* Mobile Header */}
        <div 
          className="p-4 border-b border-slate-200/50 flex items-center justify-between"
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
            const colors = getColorScheme(group.colorKey);
            
            return (
              <div key={group.id}>
                <div
                  className="px-3 py-1.5 mb-2 rounded-lg font-semibold tracking-wide uppercase"
                  style={{
                    fontSize: '10px',
                    color: colors.text,
                    backgroundColor: colors.bg,
                  }}
                >
                  {group.title}
                </div>
                
                <div className="space-y-1">
                  {group.links.map((link) => {
                    const isActive = pathname === link.href;
                    
                    return (
                      <button
                        key={link.href}
                        onClick={() => handleNavigation(link.href)}
                        className="flex items-center w-full px-3 py-2.5 rounded-lg font-medium transition-all duration-200"
                        style={{
                          fontSize: designSystem.typography.fontSize.sm,
                          color: isActive ? 'white' : colors.text,
                          backgroundColor: isActive ? colors.active : 'transparent',
                        }}
                      >
                        <span className="mr-3" style={{ color: isActive ? 'white' : colors.icon }}>
                          {link.icon}
                        </span>
                        <span>{link.label}</span>
                      </button>
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
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}

