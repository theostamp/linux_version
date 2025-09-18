'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CommonExpenseCalculatorNew, 
  ExpenseForm, 
  TransactionHistory,
  ChartsContainer,
  BulkImportWizard,
  ExpenseList,
  BuildingOverviewSection
} from './index';
import ScheduledMaintenanceOverviewModal from '../maintenance/ScheduledMaintenanceOverviewModal';
import { ApartmentBalancesTab } from './ApartmentBalancesTab';

import { MeterReadingList } from './MeterReadingList';
import { MonthSelector } from './MonthSelector';
import { 
  Calculator, 
  Plus, 
  History,
  TrendingUp,
  PieChart,
  Calendar,
  Building2,
  RefreshCw,

  DollarSign
} from 'lucide-react';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { ProtectedFinancialRoute, ConditionalRender, PermissionButton } from './ProtectedFinancialRoute';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchApartments, ApartmentList, api } from '@/lib/api';
import { toast } from 'sonner';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useModalState } from '@/hooks/useModalState';
import useFinancialAutoRefresh from '@/hooks/useFinancialAutoRefresh';
import { useQueryClient } from '@tanstack/react-query';

interface FinancialPageProps {
  buildingId: number;
}

export const FinancialPage: React.FC<FinancialPageProps> = ({ buildingId }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentBuilding, selectedBuilding } = useBuilding();
  const queryClient = useQueryClient();
  
  // Use selectedBuilding ID if available, otherwise use the passed buildingId
  const activeBuildingId = selectedBuilding?.id || buildingId;
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
              // 🧹 Cache invalidation - Clear all financial-related queries
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
              
              console.log(`🧹 FinancialPage: Cache invalidated for financial data`);
              
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
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl border border-blue-200">
          {/* Building Info */}
          <div className="flex-1 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-blue-700 font-condensed">
                {currentBuildingName}
              </p>
            </div>
          </div>
          
          {/* Month Selector */}
          <div className="flex-1 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
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
                  className="bg-white hover:bg-indigo-50 border-indigo-300 text-indigo-700 hover:text-indigo-800 transition-colors"
                >
                  Τρέχων
                </Button>
              </div>
            </div>
          </div>
          
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-700">
              Δεδομένα ενημερωμένα
            </span>
          </div>
        </div>
      </div>
      

      

      
      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Column - Main Tabs Content */}
        <div className="xl:col-span-3">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6" data-tabs-container>
        {/* Enhanced Navigation with Cards - Sticky */}
        <div className="w-full sticky top-[10px] bg-white z-10 pb-4 shadow-md border-b border-gray-100">
          {/* Mobile: Scrollable horizontal menu */}
          <div className="block lg:hidden">
            <div className="flex overflow-x-auto scrollbar-hide gap-2 pb-2">
              <ConditionalRender permission="financial_write">
                <button
                  onClick={() => handleTabChange('calculator')}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-lg border transition-all duration-200 ${
                    activeTab === 'calculator' 
                      ? 'bg-blue-100 border-blue-300 text-blue-700 shadow-sm' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <Calculator className="h-4 w-4" />
                  <span className="text-sm font-medium whitespace-nowrap">Κοινοχρήστων</span>
                </button>
              </ConditionalRender>
              <ConditionalRender permission="financial_read">
                <button
                  onClick={() => handleTabChange('balances')}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-lg border transition-all duration-200 ${
                    activeTab === 'balances' 
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-700 shadow-sm' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm font-medium whitespace-nowrap">Εισπράξεις</span>
                </button>
              </ConditionalRender>
              <ConditionalRender permission="expense_manage">
                <button
                  onClick={() => handleTabChange('expenses')}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-lg border transition-all duration-200 ${
                    activeTab === 'expenses' 
                      ? 'bg-green-100 border-green-300 text-green-700 shadow-sm' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm font-medium whitespace-nowrap">Δαπάνες</span>
                </button>
              </ConditionalRender>
              <ConditionalRender permission="financial_write">
                <button
                  onClick={() => handleTabChange('meters')}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-lg border transition-all duration-200 ${
                    activeTab === 'meters' 
                      ? 'bg-orange-100 border-orange-300 text-orange-700 shadow-sm' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium whitespace-nowrap">Μετρητές</span>
                </button>
              </ConditionalRender>
              <ConditionalRender permission="financial_read">
                <button
                  onClick={() => handleTabChange('history')}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-lg border transition-all duration-200 ${
                    activeTab === 'history' 
                      ? 'bg-indigo-100 border-indigo-300 text-indigo-700 shadow-sm' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <History className="h-4 w-4" />
                  <span className="text-sm font-medium whitespace-nowrap">Ιστορικό</span>
                </button>
              </ConditionalRender>
              <ConditionalRender permission="financial_read">
                <button
                  onClick={() => handleTabChange('charts')}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-lg border transition-all duration-200 ${
                    activeTab === 'charts' 
                      ? 'bg-purple-100 border-purple-300 text-purple-700 shadow-sm' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <PieChart className="h-4 w-4" />
                  <span className="text-sm font-medium whitespace-nowrap">Γραφήματα</span>
                </button>
              </ConditionalRender>
            </div>
          </div>

          {/* Desktop: Card Grid Layout */}
          <div className="hidden lg:grid lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <ConditionalRender permission="financial_write">
              <button
                onClick={() => handleTabChange('calculator')}
                className={`group flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                  activeTab === 'calculator' 
                    ? 'bg-blue-50 border-blue-200 shadow-sm' 
                    : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50/30'
                }`}
              >
                <div className={`mb-3 p-3 rounded-full transition-colors ${
                  activeTab === 'calculator' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600'
                }`}>
                  <Calculator className="h-6 w-6" />
                </div>
                <h3 className={`font-semibold text-sm font-condensed ${
                  activeTab === 'calculator' ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  Κοινόχρηστα
                </h3>
                <p className="text-xs text-gray-500 text-center mt-1">
                  Υπολογισμός & Έκδοση
                </p>
              </button>
            </ConditionalRender>
            <ConditionalRender permission="financial_read">
              <button
                onClick={() => handleTabChange('balances')}
                className={`group flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                  activeTab === 'balances' 
                    ? 'bg-emerald-50 border-emerald-200 shadow-sm' 
                    : 'bg-white border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/30'
                }`}
              >
                <div className={`mb-3 p-3 rounded-full transition-colors ${
                  activeTab === 'balances' 
                    ? 'bg-emerald-100 text-emerald-600' 
                    : 'bg-gray-100 text-gray-500 group-hover:bg-emerald-100 group-hover:text-emerald-600'
                }`}>
                  <DollarSign className="h-6 w-6" />
                </div>
                <h3 className={`font-semibold text-sm font-condensed ${
                  activeTab === 'balances' ? 'text-emerald-700' : 'text-gray-700'
                }`}>
                  Εισπράξεις
                </h3>
                <p className="text-xs text-gray-500 text-center mt-1">
                  Κατάσταση Διαμερισμάτων
                </p>
              </button>
            </ConditionalRender>
            <ConditionalRender permission="expense_manage">
              <button
                onClick={() => handleTabChange('expenses')}
                className={`group flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                  activeTab === 'expenses' 
                    ? 'bg-green-50 border-green-200 shadow-sm' 
                    : 'bg-white border-gray-200 hover:border-green-200 hover:bg-green-50/30'
                }`}
              >
                <div className={`mb-3 p-3 rounded-full transition-colors ${
                  activeTab === 'expenses' 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-500 group-hover:bg-green-100 group-hover:text-green-600'
                }`}>
                  <Plus className="h-6 w-6" />
                </div>
                <h3 className={`font-semibold text-sm font-condensed ${
                  activeTab === 'expenses' ? 'text-green-700' : 'text-gray-700'
                }`}>
                  Δαπάνες
                </h3>
                <p className="text-xs text-gray-500 text-center mt-1">
                  Διαχείριση Εξόδων
                </p>
              </button>
            </ConditionalRender>
            <ConditionalRender permission="financial_write">
              <button
                onClick={() => handleTabChange('meters')}
                className={`group flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                  activeTab === 'meters' 
                    ? 'bg-orange-50 border-orange-200 shadow-sm' 
                    : 'bg-white border-gray-200 hover:border-orange-200 hover:bg-orange-50/30'
                }`}
              >
                <div className={`mb-3 p-3 rounded-full transition-colors ${
                  activeTab === 'meters' 
                    ? 'bg-orange-100 text-orange-600' 
                    : 'bg-gray-100 text-gray-500 group-hover:bg-orange-100 group-hover:text-orange-600'
                }`}>
                  <TrendingUp className="h-6 w-6" />
                </div>
                <h3 className={`font-semibold text-sm font-condensed ${
                  activeTab === 'meters' ? 'text-orange-700' : 'text-gray-700'
                }`}>
                  Μετρητές
                </h3>
                <p className="text-xs text-gray-500 text-center mt-1">
                  Καταγραφή Μετρήσεων
                </p>
              </button>
            </ConditionalRender>
            <ConditionalRender permission="financial_read">
              <button
                onClick={() => handleTabChange('history')}
                className={`group flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                  activeTab === 'history' 
                    ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                    : 'bg-white border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/30'
                }`}
              >
                <div className={`mb-3 p-3 rounded-full transition-colors ${
                  activeTab === 'history' 
                    ? 'bg-indigo-100 text-indigo-600' 
                    : 'bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                }`}>
                  <History className="h-6 w-6" />
                </div>
                <h3 className={`font-semibold text-sm font-condensed ${
                  activeTab === 'history' ? 'text-indigo-700' : 'text-gray-700'
                }`}>
                  Ιστορικό
                </h3>
                <p className="text-xs text-gray-500 text-center mt-1">
                  Αρχείο Συναλλαγών
                </p>
              </button>
            </ConditionalRender>
            <ConditionalRender permission="financial_read">
              <button
                onClick={() => handleTabChange('charts')}
                className={`group flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                  activeTab === 'charts' 
                    ? 'bg-purple-50 border-purple-200 shadow-sm' 
                    : 'bg-white border-gray-200 hover:border-purple-200 hover:bg-purple-50/30'
                }`}
              >
                <div className={`mb-3 p-3 rounded-full transition-colors ${
                  activeTab === 'charts' 
                    ? 'bg-purple-100 text-purple-600' 
                    : 'bg-gray-100 text-gray-500 group-hover:bg-purple-100 group-hover:text-purple-600'
                }`}>
                  <PieChart className="h-6 w-6" />
                </div>
                <h3 className={`font-semibold text-sm font-condensed ${
                  activeTab === 'charts' ? 'text-purple-700' : 'text-gray-700'
                }`}>
                  Γραφήματα
                </h3>
                <p className="text-xs text-gray-500 text-center mt-1">
                  Οπτικοποίηση Δεδομένων
                </p>
              </button>
            </ConditionalRender>
          </div>
        </div>
        

        
        
        <TabsContent value="calculator" className="space-y-4" data-tab="calculator">
          <ProtectedFinancialRoute requiredPermission="financial_write">
            <CommonExpenseCalculatorNew 
              buildingId={activeBuildingId} 
              selectedMonth={selectedMonth} 
              reserveFundMonthlyAmount={reserveFundMonthlyAmount}
            />
          </ProtectedFinancialRoute>
        </TabsContent>
        
        <TabsContent value="expenses" className="space-y-4" data-tab="expenses">
          <ProtectedFinancialRoute requiredPermission="expense_manage">
            <ExpenseList 
              ref={expenseListRef}
              buildingId={activeBuildingId}
              buildingName={currentBuildingName}
              selectedMonth={selectedMonth}
              onMonthChange={handleMonthChange}
              onExpenseSelect={(expense) => {
                console.log('Selected expense:', expense);
                // Here you could open an expense detail modal or navigate to expense details
              }}
              showActions={true}
              onAddExpense={expenseModal.openModal}
            />
          </ProtectedFinancialRoute>
        </TabsContent>
        

        
        <TabsContent value="meters" className="space-y-4" data-tab="meters">
          <ProtectedFinancialRoute requiredPermission="financial_write">
            <div className="space-y-6">
              <MeterReadingList buildingId={activeBuildingId} selectedMonth={selectedMonth} />
              <BulkImportWizard />
            </div>
          </ProtectedFinancialRoute>
        </TabsContent>
        
        <TabsContent value="charts" className="space-y-4" data-tab="charts">
          <ProtectedFinancialRoute requiredPermission="financial_read">
            <ChartsContainer buildingId={activeBuildingId} selectedMonth={selectedMonth} />
          </ProtectedFinancialRoute>
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4" data-tab="history">
          <ProtectedFinancialRoute requiredPermission="financial_read">
            <TransactionHistory buildingId={activeBuildingId} limit={20} selectedMonth={selectedMonth} />
          </ProtectedFinancialRoute>
        </TabsContent>
        

        
        <TabsContent value="balances" className="space-y-4" data-tab="balances">
          <ProtectedFinancialRoute requiredPermission="financial_read">
            <ApartmentBalancesTab 
              buildingId={activeBuildingId} 
              selectedMonth={selectedMonth}
            />
          </ProtectedFinancialRoute>
        </TabsContent>
        
        

          </Tabs>
        </div>

        {/* Right Column - Building Overview Section Only */}
        <div className="xl:col-span-1 space-y-6 sticky top-4 h-fit">
          {/* Building Overview Section - Moved to Right Column */}
          <BuildingOverviewSection 
            ref={buildingOverviewRef}
            buildingId={activeBuildingId}
            selectedMonth={selectedMonth}
            onReserveFundAmountChange={setReserveFundMonthlyAmount}
          />
        </div>
      </div>
      
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
                  ✕
                </Button>
              </div>
              <ExpenseForm 
                buildingId={activeBuildingId}
                selectedMonth={selectedMonth}
                onSuccess={handleExpenseSuccess}
                onCancel={handleExpenseCancel}
              />
            </div>
          </div>
        )}
      </ConditionalRender>
      
      {/* Maintenance Overview Modal */}
      <ScheduledMaintenanceOverviewModal
        open={maintenanceOverviewOpen}
        onOpenChange={setMaintenanceOverviewOpen}
        maintenanceId={selectedMaintenanceId}
      />

    </div>
  );
}; 