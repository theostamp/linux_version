'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid'; // Import BentoGrid
import { 
  CommonExpenseCalculatorNew, 
  ExpenseForm, 
  TransactionHistory,
  ChartsContainer,
  BulkImportWizard,
  ExpenseList,
  BuildingOverviewSection
} from './index';
// ScheduledMaintenanceOverviewModal - TODO: Create when maintenance components are migrated
// import ScheduledMaintenanceOverviewModal from '../maintenance/ScheduledMaintenanceOverviewModal';
import { ApartmentBalancesTab } from './ApartmentBalancesTab';

import { MeterReadingList } from './MeterReadingList';
import { MonthSelector } from './MonthSelector';
import { 
  AlertTriangle,
  Building2,
  Calculator, 
  Calendar,
  DollarSign,
  History,
  PieChart,
  Plus, 
  RefreshCw,
  TrendingUp,
  X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useFinancialPermissions, type FinancialPermission } from '@/hooks/useFinancialPermissions';
import { ProtectedFinancialRoute, ConditionalRender, PermissionButton } from './ProtectedFinancialRoute';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchApartments, ApartmentList, api, invalidateApiCache } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useModalState } from '@/hooks/useModalState';
import { useFinancialAutoRefresh } from '@/hooks/useFinancialAutoRefresh';
import { useQueryClient } from '@tanstack/react-query';

interface FinancialPageProps {
  buildingId: number;
}

type FinancialTabKey = 'calculator' | 'balances' | 'expenses' | 'meters' | 'history' | 'charts';

interface FinancialTabTheme {
  cardActive: string;
  cardHover?: string;
  iconActive: string;
  iconHover: string;
  labelActive: string;
  labelHover?: string;
  descriptionActive?: string;
}

interface FinancialTabDefinition {
  value: FinancialTabKey;
  permission: FinancialPermission;
  label: string;
  mobileLabel?: string;
  description: string;
  icon: LucideIcon;
  theme: FinancialTabTheme;
}

const DESKTOP_TAB_BASE_CLASSES =
  'group flex flex-col items-center p-2.5 rounded-lg border border-slate-200/50 bg-white text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-white';
const DESKTOP_TAB_INACTIVE_CLASSES = 'hover:ring-1 hover:ring-slate-200/50';
const MOBILE_TAB_BASE_CLASSES =
  'group flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200/50 bg-white text-sm text-slate-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-white';
const MOBILE_TAB_INACTIVE_CLASSES = 'hover:ring-1 hover:ring-slate-200/50';
const TAB_ACTIVE_SHARED_CLASSES = 'shadow-md ring-2 ring-offset-1 ring-offset-white';
const DESKTOP_ICON_BASE_CLASSES = 'mb-2 p-2 rounded-full transition-colors bg-muted text-muted-foreground';
const MOBILE_ICON_BASE_CLASSES = 'flex items-center justify-center h-7 w-7 rounded-full transition-colors bg-muted text-muted-foreground';
const DESKTOP_LABEL_BASE_CLASSES = 'font-semibold text-xs font-condensed transition-colors duration-200';
const MOBILE_LABEL_BASE_CLASSES = 'font-medium text-xs whitespace-nowrap transition-colors duration-200';
const DESCRIPTION_BASE_CLASSES = 'text-[10px] text-muted-foreground text-center mt-0.5 transition-colors duration-200';

const FINANCIAL_TABS: FinancialTabDefinition[] = [
  {
    value: 'calculator',
    permission: 'financial_write',
    label: 'Κοινόχρηστα',
    mobileLabel: 'Κοινοχρήστων',
    description: 'Υπολογισμός & Έκδοση',
    icon: Calculator,
    theme: {
      cardActive: 'bg-blue-50 ring-blue-200',
      cardHover: 'hover:ring-blue-200/60 hover:bg-blue-50/40',
      iconActive: 'bg-blue-100 text-blue-600',
      iconHover: 'group-hover:bg-blue-100 group-hover:text-blue-600',
      labelActive: 'text-blue-700',
      labelHover: 'group-hover:text-blue-600',
      descriptionActive: 'text-blue-600/80',
    },
  },
  {
    value: 'balances',
    permission: 'financial_read',
    label: 'Εισπράξεις',
    description: 'Κατάσταση Διαμερισμάτων',
    icon: DollarSign,
    theme: {
      cardActive: 'bg-emerald-50 ring-emerald-200',
      cardHover: 'hover:ring-emerald-200/60 hover:bg-emerald-50/40',
      iconActive: 'bg-emerald-100 text-emerald-600',
      iconHover: 'group-hover:bg-emerald-100 group-hover:text-emerald-600',
      labelActive: 'text-emerald-700',
      labelHover: 'group-hover:text-emerald-600',
      descriptionActive: 'text-emerald-600/80',
    },
  },
  {
    value: 'expenses',
    permission: 'expense_manage',
    label: 'Δαπάνες',
    description: 'Διαχείριση Εξόδων',
    icon: Plus,
    theme: {
      cardActive: 'bg-green-50 ring-green-200',
      cardHover: 'hover:ring-green-200/60 hover:bg-green-50/40',
      iconActive: 'bg-green-100 text-green-600',
      iconHover: 'group-hover:bg-green-100 group-hover:text-green-600',
      labelActive: 'text-green-700',
      labelHover: 'group-hover:text-green-600',
      descriptionActive: 'text-green-600/80',
    },
  },
  {
    value: 'meters',
    permission: 'financial_write',
    label: 'Μετρητές',
    description: 'Καταγραφή Μετρήσεων',
    icon: TrendingUp,
    theme: {
      cardActive: 'bg-orange-50 ring-orange-200',
      cardHover: 'hover:ring-orange-200/60 hover:bg-orange-50/40',
      iconActive: 'bg-orange-100 text-orange-600',
      iconHover: 'group-hover:bg-orange-100 group-hover:text-orange-600',
      labelActive: 'text-orange-700',
      labelHover: 'group-hover:text-orange-600',
      descriptionActive: 'text-orange-600/80',
    },
  },
  {
    value: 'history',
    permission: 'financial_read',
    label: 'Ιστορικό',
    description: 'Αρχείο Συναλλαγών',
    icon: History,
    theme: {
      cardActive: 'bg-indigo-50 ring-indigo-200',
      cardHover: 'hover:ring-indigo-200/60 hover:bg-indigo-50/40',
      iconActive: 'bg-indigo-100 text-indigo-600',
      iconHover: 'group-hover:bg-indigo-100 group-hover:text-indigo-600',
      labelActive: 'text-indigo-700',
      labelHover: 'group-hover:text-indigo-600',
      descriptionActive: 'text-indigo-600/80',
    },
  },
  {
    value: 'charts',
    permission: 'financial_read',
    label: 'Γραφήματα',
    description: 'Οπτικοποίηση Δεδομένων',
    icon: PieChart,
    theme: {
      cardActive: 'bg-purple-50 ring-purple-200',
      cardHover: 'hover:ring-purple-200/60 hover:bg-purple-50/40',
      iconActive: 'bg-purple-100 text-purple-600',
      iconHover: 'group-hover:bg-purple-100 group-hover:text-purple-600',
      labelActive: 'text-purple-700',
      labelHover: 'group-hover:text-purple-600',
      descriptionActive: 'text-purple-600/80',
    },
  },
];

export const FinancialPage: React.FC<FinancialPageProps> = ({ buildingId }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { buildings, currentBuilding, selectedBuilding } = useBuilding();
  const queryClient = useQueryClient();
  
  // Use selectedBuilding ID if available, otherwise use the passed buildingId
  // But validate that the buildingId exists in available buildings
  const [activeBuildingId, setActiveBuildingId] = useState(() => {
    const initialId = selectedBuilding?.id || buildingId;
    console.log('[FinancialPage] Initial activeBuildingId:', {
      selectedBuildingId: selectedBuilding?.id,
      buildingIdProp: buildingId,
      initialId,
    });
    return initialId;
  });
  
  // Validate buildingId exists in available buildings
  // Priority: URL parameter > prop buildingId > selectedBuilding
  useEffect(() => {
    if (buildings.length > 0) {
      // Read buildingId from URL first
      const urlBuildingId = searchParams.get('building');
      const urlBuildingIdNum = urlBuildingId ? parseInt(urlBuildingId, 10) : null;
      const validUrlBuildingId = urlBuildingIdNum && !isNaN(urlBuildingIdNum) && buildings.some(b => b.id === urlBuildingIdNum)
        ? urlBuildingIdNum
        : null;
      
      // Priority: URL > prop > selectedBuilding
      const targetId = validUrlBuildingId || buildingId || selectedBuilding?.id;
      const buildingExists = targetId && buildings.some(b => b.id === targetId);
      
      if (!buildingExists || !targetId) {
        // Use first available building if target doesn't exist
        const targetBuilding = buildings[0];
        if (targetBuilding && targetBuilding.id !== activeBuildingId) {
          console.warn(`[FinancialPage] Building ${targetId} not found or invalid. Using building ${targetBuilding.id} instead.`);
          setActiveBuildingId(targetBuilding.id);
          // Update URL with correct building
          const params = new URLSearchParams(window.location.search);
          params.set('building', targetBuilding.id.toString());
          router.replace(`/financial?${params.toString()}`);
        }
      } else {
        // Only update activeBuildingId if it's different AND it's from URL or prop (not selectedBuilding override)
        if (targetId !== activeBuildingId) {
          // If URL has building parameter, use it (highest priority)
          if (validUrlBuildingId) {
            console.log(`[FinancialPage] Using URL buildingId: ${validUrlBuildingId}`);
            setActiveBuildingId(validUrlBuildingId);
          } 
          // If prop buildingId is different, use it (second priority)
          else if (buildingId && buildingId !== activeBuildingId) {
            console.log(`[FinancialPage] Using prop buildingId: ${buildingId}`);
            setActiveBuildingId(buildingId);
          }
          // Only use selectedBuilding if URL and prop don't have buildingId (lowest priority)
          else if (!validUrlBuildingId && !buildingId && selectedBuilding?.id && selectedBuilding.id !== activeBuildingId) {
            console.log(`[FinancialPage] Using selectedBuilding: ${selectedBuilding.id}`);
            setActiveBuildingId(selectedBuilding.id);
          }
        }
      }
    }
  }, [buildings, buildingId, selectedBuilding, router, activeBuildingId, searchParams]);
  const [activeTab, setActiveTab] = useState(() => {
    // Check URL parameters for tab, apartment, and amount
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'calculator';
  });
  
  // Use custom hook for modal management
  const expenseModal = useModalState({
    modalKey: 'expense-form',
    requiredTab: 'expenses',
    buildingId: activeBuildingId
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const result = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    console.log('🔍 FinancialPage selectedMonth initialization:', {
      now: now.toISOString(),
      getMonth: now.getMonth(),
      monthPlusOne: now.getMonth() + 1,
      result,
      currentURL: window.location.href
    });
    return result;
  });
  const [apartments, setApartments] = useState<ApartmentList[]>([]);
  const [reserveFundMonthlyAmount, setReserveFundMonthlyAmount] = useState<number>(0); // No hardcoded default - will be set from building data
  
  // State for maintenance overview modal
  const [maintenanceOverviewOpen, setMaintenanceOverviewOpen] = useState(false);
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<number | null>(null);
  const { canCreateExpense, canAccessReports, canCalculateCommonExpenses } = useFinancialPermissions();
  

  
  // Refs for refreshing components
  const buildingOverviewRef = useRef<{ refresh: () => void }>(null);

  // Ref for expense list to refresh data
  const expenseListRef = useRef<{ refresh: () => void }>(null);
  
  // Event listener for opening maintenance overview modal
  useEffect(() => {
    const handleOpenMaintenanceOverview = async (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🎯 FinancialPage received open-maintenance-overview event:', customEvent.detail);
      const maintenanceId = customEvent.detail.maintenanceId;
      
      if (!maintenanceId) {
        console.warn('⚠️ No maintenance ID provided in event');
        return;
      }
      
      // Validate that the maintenance exists before opening the modal
      try {
        console.log('🔍 Validating maintenance ID:', maintenanceId);
        await api.get(`/maintenance/scheduled/${maintenanceId}/`);
        console.log('✅ Maintenance exists, opening modal');
        setSelectedMaintenanceId(maintenanceId);
        setMaintenanceOverviewOpen(true);
      } catch (error: any) {
        console.error('❌ Maintenance validation failed:', error);
        if (error.response?.status === 404) {
          console.warn(`⚠️ Maintenance with ID ${maintenanceId} not found`);
          toast.error(`Το έργο με ID ${maintenanceId} δεν βρέθηκε`);
        } else {
          console.error('Error validating maintenance:', error);
          toast.error('Σφάλμα κατά την επαλήθευση του έργου');
        }
      }
    };
    
    console.log('👂 FinancialPage setting up open-maintenance-overview event listener');
    window.addEventListener('open-maintenance-overview', handleOpenMaintenanceOverview);
    
    return () => {
      console.log('🧹 FinancialPage cleaning up open-maintenance-overview event listener');
      window.removeEventListener('open-maintenance-overview', handleOpenMaintenanceOverview);
    };
  }, []);
  
  // Auto-refresh financial data when expenses change
  useFinancialAutoRefresh(
    {
      loadSummary: () => buildingOverviewRef.current?.refresh(),
      loadExpenses: () => expenseListRef.current?.refresh(),
    },
    {
      buildingId: activeBuildingId,
      selectedMonth,
    },
    {
      enableAutoRefresh: false, // Απενεργοποιημένο auto-refresh
      refreshInterval: 15000, // 15 seconds
      componentName: 'FinancialPage'
    }
  );
  
  // Force refresh when building changes
  useEffect(() => {
    // Trigger refresh of all data when activeBuildingId changes
    if (buildingOverviewRef.current) {
      buildingOverviewRef.current.refresh();
    }
    
    // Load apartments for the new building
    const loadApartments = async () => {
      try {
        const apartmentsData = await fetchApartments(activeBuildingId);
        setApartments(apartmentsData);
      } catch (error) {
        console.error('Error loading apartments:', error);
        setApartments([]);
      }
    };
    
    loadApartments();
  }, [activeBuildingId]);

  // Simplified auto-refresh system - removed complex event handling
  // The selectedMonth useEffect below will handle all refreshes



  // Monitor selectedMonth changes and refresh components
  useEffect(() => {
    console.log('Selected month changed to:', selectedMonth);
    
    // Αφαιρέθηκε το notification για αλλαγή μήνα
    // Show a brief notification for month change
    // const showNotification = () => {
    //   const notification = document.createElement('div');
    //   notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full';
    //   notification.innerHTML = `
    //     <div class="flex items-center gap-2">
    //       <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
    //       <span>Ενημέρωση δεδομένων για ${new Date(selectedMonth + '-01').toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}</span>
    //     </div>
    //   `;
    //   document.body.appendChild(notification);
    //   
    //   // Animate in
    //   requestAnimationFrame(() => {
    //     notification.classList.remove('translate-x-full');
    //   });
    //   
    //   // Remove after 3 seconds
    //   setTimeout(() => {
    //     notification.classList.add('translate-x-full');
    //     setTimeout(() => {
    //       if (document.body.contains(notification)) {
    //         document.body.removeChild(notification);
    //       }
    //     }, 300);
    //   }, 3000);
    // };

    // Only show notification if month actually changed (not on initial load)
    // if (selectedMonth) {
    //   showNotification();
    // }
  }, [selectedMonth]);
  
  // Handle URL parameters (initial load and browser navigation)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const monthParam = searchParams.get('month');
    
    console.log('🔍 FinancialPage URL params:', {
      tabParam,
      monthParam,
      currentSelectedMonth: selectedMonth,
      willOverride: !!monthParam
    });
    
    if (tabParam) {
      setActiveTab(tabParam);
    }
    
    if (monthParam) {
      console.log('🔄 FinancialPage: URL overriding selectedMonth from', selectedMonth, 'to', monthParam);
      setSelectedMonth(monthParam);
    }
  }, [searchParams]);
  
  // Scroll to tab content when page loads with a specific tab
  useEffect(() => {
    if (activeTab && activeTab !== 'calculator') {
      // Small delay to ensure DOM is fully rendered
      setTimeout(() => {
        const tabContent = document.querySelector(`[data-tab="${activeTab}"]`);
        if (tabContent) {
          // Scroll to just before the tab content, keeping tabs visible
          const elementTop = tabContent.getBoundingClientRect().top + window.pageYOffset;
          const offsetPosition = elementTop - 200; // Keep tabs visible with some padding (header + tabs + extra)
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 200);
    }
  }, [activeTab]);
  
  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    // Remove modal parameter when changing tabs
    params.delete('modal');
    // Preserve building parameter
    if (!params.has('building')) {
      params.set('building', activeBuildingId.toString());
    }
    router.push(`/financial?${params.toString()}`);
    
    // Scroll to the tab content after a short delay to ensure DOM is updated
    setTimeout(() => {
      const tabContent = document.querySelector(`[data-tab="${value}"]`);
      if (tabContent) {
        // Scroll to just before the tab content, keeping tabs visible
        const elementTop = tabContent.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementTop - 200; // Keep tabs visible with some padding (header + tabs + extra)
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, 100);
  };
  
  // Update URL when month changes
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', month);
    // Preserve existing parameters
    if (!params.has('building')) {
      params.set('building', activeBuildingId.toString());
    }
    if (!params.has('tab')) {
      params.set('tab', activeTab);
    }
    router.push(`/financial?${params.toString()}`);
  };
  
  const handleExpenseSuccess = () => {
    expenseModal.closeModal();
    // Refresh expense list data
    if (expenseListRef.current) {
      expenseListRef.current.refresh();
    }
    // Refresh building overview section data
    if (buildingOverviewRef.current) {
      buildingOverviewRef.current.refresh();
    }
  };
  
  const handleExpenseCancel = () => {
    expenseModal.closeModal();
  };



  useEffect(() => {
    fetchApartments(activeBuildingId).then(setApartments).catch(() => setApartments([]));
  }, [activeBuildingId]);
  
  // Get current building name
  const currentBuildingName = (selectedBuilding || currentBuilding)?.name || 'Άγνωστο Κτίριο';
  
  return (
    <div className="space-y-6" key={`financial-${activeBuildingId}`}>
      {/* Enhanced Header with Building & Month Context */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-condensed">Οικονομική Διαχείριση</h1>
          </div>
          <Button
            onClick={async () => {
              // ✅ Clear API cache FIRST, then React Query cache
              invalidateApiCache(/\/financial\//);
              
              // Cache invalidation AND explicit refetch - Clear and reload all financial-related queries
              await queryClient.invalidateQueries({ 
                queryKey: ['financial'] 
              });
              await queryClient.invalidateQueries({ 
                queryKey: ['apartment-balances'] 
              });
              await queryClient.invalidateQueries({ 
                queryKey: ['expenses'] 
              });
              await queryClient.invalidateQueries({ 
                queryKey: ['transactions'] 
              });
              await queryClient.refetchQueries({ 
                queryKey: ['financial'] 
              });
              await queryClient.refetchQueries({ 
                queryKey: ['apartment-balances'] 
              });
              await queryClient.refetchQueries({ 
                queryKey: ['expenses'] 
              });
              await queryClient.refetchQueries({ 
                queryKey: ['transactions'] 
              });
              
              console.log(`🧹 FinancialPage: API cache and React Query cache cleared, data refetched`);
              
              // Refresh components
              if (buildingOverviewRef.current) buildingOverviewRef.current.refresh();
              if (expenseListRef.current) expenseListRef.current.refresh();
              
              // Show success message
              toast.success('Ενημερώθηκαν όλα τα οικονομικά δεδομένα', {
                description: 'Το cache καθαρίστηκε και τα δεδομένα ανανεώθηκαν'
              });
            }}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Ενημέρωση Δεδομένων
          </Button>
        </div>
        
        {/* Context Banner - Building & Month */}
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-indigo-50 rounded-lg shadow-md">
          {/* Building Info */}
          <div className="flex-1 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-md shadow-sm">
              <Building2 className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-blue-700 font-condensed">
                {currentBuildingName}
              </p>
            </div>
          </div>
          
          {/* Month Selector */}
          <div className="flex-1 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-md shadow-sm">
              <Calendar className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <MonthSelector
                  selectedMonth={selectedMonth}
                  onMonthChange={handleMonthChange}
                />
                <Button
                  onClick={() => {
                    const now = new Date();
                    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                    handleMonthChange(currentMonth);
                  }}
                  variant="outline"
                  size="sm"
                  className="bg-white hover:bg-indigo-50 border-0 shadow-sm text-indigo-600 hover:text-indigo-700 transition-colors rounded-md"
                >
                  Τρέχων
                </Button>
              </div>
            </div>
          </div>
          
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            {(() => {
              const now = new Date();
              const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
              const isCurrentMonth = selectedMonth === currentMonth;

              if (isCurrentMonth) {
                return (
                  <>
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-700">
                      Δεδομένα ενημερωμένα
                    </span>
                  </>
                );
              } else {
                const selectedDate = new Date(selectedMonth + '-01');
                const monthName = selectedDate.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });

                return (
                  <>
                    <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
                    <span className="text-sm font-medium text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" /> Προβολή ιστορικών δεδομένων ({monthName})
                    </span>
                  </>
                );
              }
            })()}
          </div>
        </div>
      </div>
      

      

      
      {/* Main Content - Bento Grid Layout */}
      <BentoGrid className="max-w-[1920px] auto-rows-auto gap-6">
        
        {/* Left Column - Main Tabs Content */}
        <BentoGridItem
          className="md:col-span-2 md:row-span-2 order-2 md:order-1"
          header={
            <div className="space-y-6">
              <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6" data-tabs-container>
                {/* Navigation Tabs - Modern Style */}
                <div className="w-full sticky top-[10px] z-10 pb-4 bg-background/80 backdrop-blur-sm pt-2 -mt-2">
                  {/* Mobile: Scrollable horizontal menu */}
                  <div className="block lg:hidden">
                    <div className="flex overflow-x-auto scrollbar-hide gap-2 pb-2">
                      {FINANCIAL_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.value;

                        return (
                          <ConditionalRender key={tab.value} permission={tab.permission}>
                            <button
                              onClick={() => handleTabChange(tab.value)}
                              className={cn(
                                MOBILE_TAB_BASE_CLASSES,
                                isActive
                                  ? [TAB_ACTIVE_SHARED_CLASSES, tab.theme.cardActive]
                                  : [MOBILE_TAB_INACTIVE_CLASSES, tab.theme.cardHover]
                              )}
                            >
                              <div
                                className={cn(
                                  MOBILE_ICON_BASE_CLASSES,
                                  tab.theme.iconHover,
                                  isActive && tab.theme.iconActive
                                )}
                              >
                                <Icon className="h-4 w-4" />
                              </div>
                              <span
                                className={cn(
                                  MOBILE_LABEL_BASE_CLASSES,
                                  isActive ? tab.theme.labelActive : 'text-slate-900',
                                  tab.theme.labelHover
                                )}
                              >
                                {tab.mobileLabel ?? tab.label}
                              </span>
                            </button>
                          </ConditionalRender>
                        );
                      })}
                    </div>
                  </div>

                  {/* Desktop: Card Grid Layout */}
                  <div className="hidden lg:grid lg:grid-cols-3 xl:grid-cols-6 gap-3">
                    {FINANCIAL_TABS.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.value;

                      return (
                        <ConditionalRender key={tab.value} permission={tab.permission}>
                          <button
                            onClick={() => handleTabChange(tab.value)}
                            className={cn(
                              DESKTOP_TAB_BASE_CLASSES,
                              isActive
                                ? [TAB_ACTIVE_SHARED_CLASSES, tab.theme.cardActive]
                                : [DESKTOP_TAB_INACTIVE_CLASSES, tab.theme.cardHover]
                            )}
                          >
                            <div
                                              className={cn(
                                                DESKTOP_ICON_BASE_CLASSES,
                                                tab.theme.iconHover,
                                                isActive && tab.theme.iconActive
                                              )}
                                            >
                                              <Icon className="h-4 w-4" />
                                            </div>
                            <h3
                              className={cn(
                                DESKTOP_LABEL_BASE_CLASSES,
                                isActive ? tab.theme.labelActive : 'text-foreground',
                                tab.theme.labelHover
                              )}
                            >
                              {tab.label}
                            </h3>
                            <p
                              className={cn(
                                DESCRIPTION_BASE_CLASSES,
                                isActive && tab.theme.descriptionActive
                              )}
                            >
                              {tab.description}
                            </p>
                          </button>
                        </ConditionalRender>
                      );
                    })}
                  </div>
                </div>
              </Tabs>
            </div>
          }
        />

        {/* Right Column - Building Overview */}
        <BentoGridItem
          className="md:col-span-1 md:row-span-2 h-fit sticky top-4 order-1 md:order-2"
          title={
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-600" />
              <span className="text-lg font-bold text-slate-900">Επισκόπηση</span>
            </div>
          }
          description="Συνολική οικονομική εικόνα του κτιρίου"
          header={
            <BuildingOverviewSection 
              ref={buildingOverviewRef}
              buildingId={activeBuildingId}
              selectedMonth={selectedMonth}
              onReserveFundAmountChange={setReserveFundMonthlyAmount}
            />
          }
        />
      </BentoGrid>
      
      {/* Expense Form Modal */}
      <ConditionalRender permission="expense_manage">
        {expenseModal.isOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={handleExpenseCancel}
          >
            <div 
              className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Νέα Δαπάνη</h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleExpenseCancel}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <ExpenseForm 
                selectedMonth={selectedMonth}
                onSuccess={handleExpenseSuccess}
                onCancel={handleExpenseCancel}
              />
            </div>
          </div>
        )}
      </ConditionalRender>
      
      {/* Maintenance Overview Modal - TODO: Uncomment when ScheduledMaintenanceOverviewModal is created */}
      {/* <ScheduledMaintenanceOverviewModal
        open={maintenanceOverviewOpen}
        onOpenChange={setMaintenanceOverviewOpen}
        maintenanceId={selectedMaintenanceId}
      /> */}

    </div>
  );
};