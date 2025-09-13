'use client';

import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Building2, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Euro, 
  Users, 
  AlertTriangle,
  Edit3,
  Check,
  X,
  Receipt,
  RefreshCw,
  Building,
  Package,
  BarChart3,
  // ChevronDown,
  // ChevronUp,
  Info,
  PieChart,
  Eye
} from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { api, makeRequestWithRetry } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { ServicePackageModal } from '../ServicePackageModal';
import { AmountDetailsModal } from '../AmountDetailsModal';
import { PreviousObligationsModal } from '../PreviousObligationsModal';


interface BuildingOverviewSectionProps {
  buildingId: number;
  selectedMonth?: string; // Add selectedMonth prop
  onReserveFundAmountChange?: (amount: number) => void;
}

interface BuildingOverviewSectionRef {
  refresh: () => void;
}

interface FinancialSummary {
  total_balance: number;
  current_obligations: number; // Τρέχουσες υποχρεώσεις (κύριο χρέος)
  previous_obligations: number; // ← ΝΕΟ FIELD - Οφειλές προηγούμενων μηνών
  reserve_fund_debt: number; // Χρέος από εισφορά αποθεματικού
  reserve_fund_goal: number;
  current_reserve: number;
  apartments_count: number;
  pending_payments: number;
  last_calculation_date?: string;
  average_monthly_expenses: number;
  // Monthly Activity Flag
  has_monthly_activity?: boolean; // ← ΝΕΟ FIELD
  // Reserve Fund Period Tracking
  reserve_fund_start_date?: string;
  reserve_fund_target_date?: string;
  reserve_fund_monthly_target?: number;
  reserve_fund_duration_months?: number;
  // Reserve Fund Contribution (from API)
  reserve_fund_contribution?: number; // ← ΝΕΟ FIELD
  // Management Expenses
  management_fee_per_apartment: number;
  total_management_cost: number;
  // Monthly Payment and Expense Data
  total_payments_month?: number; // ← ΝΕΟ FIELD - Συνολικές εισπράξεις του μήνα
  total_expenses_month?: number; // ← ΝΕΟ FIELD - Συνολικές δαπάνες του μήνα
}

export const BuildingOverviewSection = forwardRef<BuildingOverviewSectionRef, BuildingOverviewSectionProps>(({ 
  buildingId,
  selectedMonth,
  onReserveFundAmountChange 
}, ref) => {
  const { buildings } = useBuilding();
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingReserve, setRefreshingReserve] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState('');
  const [newInstallments, setNewInstallments] = useState('12'); // Προεπιλογή 12 μήνες
  const [editingTimeline, setEditingTimeline] = useState(false);
  const [newStartMonth, setNewStartMonth] = useState('');
  const [newStartYear, setNewStartYear] = useState('');
  const [newDurationMonths, setNewDurationMonths] = useState('');
  const [editingManagementFee, setEditingManagementFee] = useState(false);
  const [newManagementFee, setNewManagementFee] = useState('');
  const [showServicePackageModal, setShowServicePackageModal] = useState(false);
  const [applyingServicePackage, setApplyingServicePackage] = useState(false);
  const [showAmountDetailsModal, setShowAmountDetailsModal] = useState(false);
  const [selectedAmountType, setSelectedAmountType] = useState<'current_reserve' | 'total_balance' | 'current_obligations' | 'reserve_fund_contribution'>('current_reserve');
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [selectedAmountTitle, setSelectedAmountTitle] = useState('');
  const [showPreviousObligationsModal, setShowPreviousObligationsModal] = useState(false);
  const [showReserveFundInfoModal, setShowReserveFundInfoModal] = useState(false);


  // Memoize currentBuilding to prevent unnecessary re-renders
  const currentBuilding = useMemo(() => 
    buildings.find(b => b.id === buildingId), 
    [buildings, buildingId]
  );

  // Helper functions for timeline editing
  const getMonthOptions = () => {
    const months = [
      { value: '01', label: 'Ιανουάριος' },
      { value: '02', label: 'Φεβρουάριος' },
      { value: '03', label: 'Μάρτιος' },
      { value: '04', label: 'Απρίλιος' },
      { value: '05', label: 'Μάιος' },
      { value: '06', label: 'Ιούνιος' },
      { value: '07', label: 'Ιούλιος' },
      { value: '08', label: 'Αύγουστος' },
      { value: '09', label: 'Σεπτέμβριος' },
      { value: '10', label: 'Οκτώβριος' },
      { value: '11', label: 'Νοέμβριος' },
      { value: '12', label: 'Δεκέμβριος' }
    ];
    return months;
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 1; i <= currentYear + 3; i++) {
      years.push({ value: i.toString(), label: i.toString() });
    }
    return years;
  };

  const getDurationOptions = () => {
    const durations = [];
    for (let i = 3; i <= 24; i++) {
      durations.push({ value: i.toString(), label: `${i} μήνες` });
    }
    return durations;
  };

  const calculateNewDates = (startMonth: string, startYear: string, durationMonths: number) => {
    const year = parseInt(startYear) || new Date().getFullYear();
    const month = parseInt(startMonth) || 1;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month - 1 + durationMonths, 0); // Last day of end month
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  // Helper functions for localStorage persistence
  const getStorageKey = (key: string) => `reserve_fund_${buildingId}_${key}`;
  
  // Clean old localStorage data and reset to new defaults if needed
  const cleanOldReserveFundData = () => {
    const storageKeys = ['goal', 'start_date', 'target_date', 'duration_months', 'monthly_target'];
    let hasOldData = false;
    
    storageKeys.forEach(key => {
      const storageKey = getStorageKey(key);
      const value = localStorage.getItem(storageKey);
      if (value && key === 'start_date' && value.includes('2024')) {
        hasOldData = true;
      }
    });
    
    if (hasOldData) {
      console.log('🧹 Clearing old reserve fund data from localStorage (2024 dates detected)');
      storageKeys.forEach(key => {
        localStorage.removeItem(getStorageKey(key));
      });
      return true;
    }
    return false;
  };
  
  const saveToLocalStorage = (key: string, value: any) => {
    try {
      localStorage.setItem(getStorageKey(key), JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };
  
  const loadFromLocalStorage = (key: string, defaultValue: any = null) => {
    try {
      const stored = localStorage.getItem(getStorageKey(key));
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return defaultValue;
    }
  };

  // Initialize editing states when financial summary changes
  useEffect(() => {
    if (financialSummary && !editingTimeline) {
      if (financialSummary.reserve_fund_start_date) {
        const startDate = new Date(financialSummary.reserve_fund_start_date);
        const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
        const year = startDate.getFullYear().toString();
        setNewStartMonth(month);
        setNewStartYear(year);
      } else {
        // Default to current month/year if no start date is set
        const now = new Date();
        setNewStartMonth((now.getMonth() + 1).toString().padStart(2, '0'));
        setNewStartYear(now.getFullYear().toString());
      }
      if (financialSummary.reserve_fund_duration_months) {
        setNewDurationMonths(financialSummary.reserve_fund_duration_months.toString());
        // Αρχικοποίηση δόσεων από τη διάρκεια σε μήνες
        setNewInstallments((financialSummary.reserve_fund_duration_months || 0).toString());
      } else {
        // Default to 12 months if no duration is set
        setNewDurationMonths('12');
        setNewInstallments('12');
      }
    }
    
    // Initialize management fee
    if (financialSummary) {
      setNewManagementFee((financialSummary.management_fee_per_apartment || 0).toString());
    }
  }, [financialSummary, editingTimeline, currentBuilding]);

  // Function to handle showing amount details modal
  const handleShowAmountDetails = (
    amountType: 'current_reserve' | 'total_balance' | 'current_obligations' | 'previous_obligations' | 'reserve_fund_contribution' | 'reserve_fund_goal',
    amount: number,
    title: string
  ) => {
    if (amountType === 'previous_obligations') {
      setShowPreviousObligationsModal(true);
    } else if (amountType === 'reserve_fund_goal') {
      // Handle reserve fund goal separately since it's not supported by AmountDetailsModal
      // For now, we'll show a simple alert or could create a separate modal
      console.log('Reserve fund goal details:', { amount, title });
      // You could implement a specific modal for reserve fund goal details here
      return;
    } else {
      setSelectedAmountType(amountType as 'current_reserve' | 'total_balance' | 'current_obligations' | 'reserve_fund_contribution');
      setSelectedAmount(amount);
      setSelectedAmountTitle(title);
      setShowAmountDetailsModal(true);
    }
  };

  // Notify parent component when reserve fund monthly target changes
  // Calculate correct monthly target from goal and duration
  useEffect(() => {
    if (financialSummary && onReserveFundAmountChange) {
      const goal = financialSummary.reserve_fund_goal || 0;
      const duration = financialSummary.reserve_fund_duration_months || 1;
      
      let correctMonthlyTarget = 0;
      
      // Calculate reserve fund amount if there's a goal and duration
      if (goal > 0 && duration > 0) {
        correctMonthlyTarget = goal / duration;
      }
      
      console.log('🔄 BuildingOverviewSection: Reserve fund calculation:', {
        goal,
        duration,
        correctMonthlyTarget
      });
      
      onReserveFundAmountChange(correctMonthlyTarget);
    }
  }, [financialSummary?.reserve_fund_goal, financialSummary?.reserve_fund_duration_months, onReserveFundAmountChange]);

  // Fetch financial summary data
  const fetchFinancialSummary = async (isRefresh = false) => {
    // Initialize buildingData outside try block so it's available in catch
    let buildingData = currentBuilding;
    
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Fetch building data if not complete
      if (!currentBuilding?.management_fee_per_apartment) {
        try {
          const buildingResponse = await makeRequestWithRetry({
            method: 'get',
            url: `/buildings/list/${buildingId}/`
          });
          buildingData = buildingResponse.data;
          console.log('🏢 BuildingOverviewSection: Fetched building data:', buildingData);
        } catch (buildingError) {
          console.warn('⚠️ BuildingOverviewSection: Could not fetch building data:', buildingError);
        }
      }
      
      // Call the real API instead of using mock data
      const params = new URLSearchParams({
        building_id: buildingId.toString()
      });
      
      // Add month parameter if provided (handle null/undefined)
      if (selectedMonth && selectedMonth !== 'null' && selectedMonth !== '') {
        params.append('month', selectedMonth);
      }
      
      const apiUrl = `/financial/dashboard/summary/?${params}`;
      // console.log('🌐 BuildingOverviewSection: Calling API:', apiUrl);
      // console.log('🌐 BuildingOverviewSection: selectedMonth parameter:', selectedMonth);
      
      const response = await makeRequestWithRetry({
        method: 'get',
        url: apiUrl
      });
      const apiData = response.data;
      // console.log('📊 BuildingOverviewSection: API response data:', apiData);
      // console.log('📊 BuildingOverviewSection: API response status:', response.status);
      // console.log('📊 BuildingOverviewSection: API total_expenses_month:', apiData.total_expenses_month);
      // console.log('📊 BuildingOverviewSection: API average_monthly_expenses:', apiData.average_monthly_expenses);
      // console.log('📊 BuildingOverviewSection: API has_monthly_activity:', apiData.has_monthly_activity);
      
      // Clean old data before loading
      const wasOldDataCleared = cleanOldReserveFundData();
      if (wasOldDataCleared) {
        console.log('✅ Old reserve fund data from 2024 has been cleared. Using new defaults.');
      }
      
      // Load reserve fund data from API (primary) with localStorage fallback
      const apiGoal = apiData.reserve_fund_goal || 0;
      const apiDurationMonths = apiData.reserve_fund_duration_months || 0;
      const apiMonthlyTarget = apiData.reserve_fund_monthly_target || 0;
      
      // Use API data only - no localStorage fallback to prevent hardcoded values
      const savedGoal = apiGoal;
      const savedStartDate = apiData.reserve_fund_start_date || null;
      const savedTargetDate = apiData.reserve_fund_target_date || null;
      const savedDurationMonths = apiDurationMonths;
      const savedMonthlyTarget = apiMonthlyTarget;
      
      console.log('BuildingOverviewSection: Reserve fund data:', {
        apiGoal,
        apiDurationMonths,
        apiMonthlyTarget,
        savedGoal,
        savedStartDate,
        savedTargetDate,
        savedDurationMonths,
        savedMonthlyTarget
      });
      
      // Calculate dynamic reserve fund debt based on timeline progress
      // If there are pending obligations, reserve fund collection is paused
      const calculateReserveFundDebt = () => {
        // If API indicates no reserve fund contribution (due to pending obligations), debt is only for current expenses
        if (apiData.reserve_fund_contribution === 0) {
          return 0; // No reserve fund debt when expenses take priority
        }
        
        const today = new Date();
        
        // If no start date is set, return 0 debt
        if (!savedStartDate) {
          return 0;
        }
        
        const startDate = new Date(savedStartDate);
        
        // Calculate months that have passed since start
        const monthsPassed = Math.max(0, 
          (today.getFullYear() - startDate.getFullYear()) * 12 + 
          (today.getMonth() - startDate.getMonth())
        );
        
        // Calculate expected contributions so far
        const monthlyContributionPerBuilding = savedMonthlyTarget;
        const expectedContributionsSoFar = monthsPassed * monthlyContributionPerBuilding;
        
        // Current reserve amount from API
        const currentReserve = apiData.current_reserve || 0;
        
        // Debt = Expected contributions - Current reserve (if negative, means we're behind)
        const deficit = expectedContributionsSoFar - currentReserve;
        
        // Return the debt (positive number represents amount owed)
        return Math.max(0, deficit);
      };
      
      const calculatedReserveFundDebt = calculateReserveFundDebt();
      
      // Transform API data to match our interface
      const financialData: FinancialSummary = {
        total_balance: apiData.total_balance || 0,
        current_obligations: apiData.current_obligations || 0,
        previous_obligations: apiData.previous_obligations || 0, // ← ΝΕΟ FIELD
        reserve_fund_debt: -calculatedReserveFundDebt, // Χρέος από εισφορά αποθεματικού - DYNAMIC
        reserve_fund_goal: savedGoal,
        current_reserve: apiData.current_reserve || 0,
        apartments_count: apiData.apartments_count || buildingData?.apartments_count || 0,
        pending_payments: apiData.pending_payments || 0,
        last_calculation_date: apiData.last_calculation_date || new Date().toISOString().split('T')[0],
        average_monthly_expenses: apiData.average_monthly_expenses || 0, // ALWAYS use API data for month-specific values
        // Monthly Activity Flag
        has_monthly_activity: apiData.has_monthly_activity, // ← ΝΕΟ FIELD
        // Reserve Fund Period Tracking - Use saved values with fallbacks
        reserve_fund_start_date: savedStartDate,
        reserve_fund_target_date: savedTargetDate,
        reserve_fund_monthly_target: apiMonthlyTarget, // Use API value directly (already calculated based on period)
        reserve_fund_duration_months: savedDurationMonths,
        // Reserve Fund Contribution (from API)
        reserve_fund_contribution: apiData.reserve_fund_contribution || 0, // ← ΝΕΟ FIELD
        // Management Expenses
        management_fee_per_apartment: buildingData?.management_fee_per_apartment || 0,
        total_management_cost: (buildingData?.management_fee_per_apartment || 0) * (buildingData?.apartments_count || 0),
        // Monthly Payment and Expense Data
        total_payments_month: apiData.total_payments_month || 0,
        total_expenses_month: apiData.total_expenses_month || 0
      };
      
      console.log('🔄 BuildingOverviewSection: Transformed financial data:', financialData);
      console.log('🔄 BuildingOverviewSection: buildingData:', buildingData);
      console.log('🔄 BuildingOverviewSection: has_monthly_activity from API:', apiData.has_monthly_activity);
      console.log('🔄 BuildingOverviewSection: has_monthly_activity in financialData:', financialData.has_monthly_activity);
      console.log('🔄 BuildingOverviewSection: management_fee_per_apartment:', buildingData?.management_fee_per_apartment);
      console.log('🔄 BuildingOverviewSection: API average_monthly_expenses:', apiData.average_monthly_expenses);
      console.log('🔄 BuildingOverviewSection: Final average_monthly_expenses:', financialData.average_monthly_expenses);
      
      console.log('BuildingOverviewSection: Setting financial data:', financialData);
      
      // Add visual indicator for month-specific data
      const monthDisplayName = selectedMonth ? 
        new Date(selectedMonth + '-01').toLocaleDateString('el-GR', { month: 'long', year: 'numeric' }) : 
        'Τρέχων Μήνας';
      
      console.log('📅 BuildingOverviewSection: Month display name:', monthDisplayName);
      
      const finalData = {
        ...financialData,
        // Add month indicator to the data
        last_calculation_date: `${monthDisplayName} (${selectedMonth || 'current'})`
      };
      
      console.log('💾 BuildingOverviewSection: Setting final financial data:', finalData);
      console.log('💾 BuildingOverviewSection: Final current_obligations:', finalData.current_obligations);
      console.log('💾 BuildingOverviewSection: Final average_monthly_expenses:', finalData.average_monthly_expenses);
      
      setFinancialSummary(finalData);
      setNewGoal(financialData.reserve_fund_goal.toString());
      
      // Αφαιρέθηκε το notification για auto-refresh
      // if (isRefresh) {
      //   toast.success('Οικονομικά στοιχεία ανανεώθηκαν');
      // }
    } catch (error: any) {
      console.error('Error fetching financial summary:', error);
      
      // Αφαιρέθηκαν τα error notifications
      // Provide specific error messages for rate limiting
      // if (error.response?.status === 429) {
      //   toast.error('Πάρα πολλά αιτήματα. Παρακαλώ περιμένετε λίγο και δοκιμάστε ξανά.');
      // } else {
      //   toast.error('Αποτυχία φόρτωσης οικονομικών στοιχείων');
      // }
      
      // Fallback to empty data for new buildings
      const emptyData: FinancialSummary = {
        total_balance: 0,
        current_obligations: 0,
        previous_obligations: 0, // Add missing property
        reserve_fund_debt: 0,
        reserve_fund_goal: 0, // No hardcoded value - will be set by user
        current_reserve: 0,
        apartments_count: buildingData?.apartments_count || 0,
        pending_payments: 0,
        last_calculation_date: new Date().toISOString().split('T')[0],
        average_monthly_expenses: 0,
        has_monthly_activity: false, // Add missing property
        reserve_fund_start_date: '', // No hardcoded date - will be set by user
        reserve_fund_target_date: '', // No hardcoded date - will be set by user
        reserve_fund_monthly_target: 0, // No hardcoded value - calculated from goal/duration
        reserve_fund_duration_months: 0, // No hardcoded value - will be set by user
        reserve_fund_contribution: 0, // No hardcoded value - from API
        management_fee_per_apartment: buildingData?.management_fee_per_apartment || 0,
        total_management_cost: (buildingData?.management_fee_per_apartment || 0) * (buildingData?.apartments_count || 0),
        // Monthly Payment and Expense Data
        total_payments_month: 0,
        total_expenses_month: 0
      };
      
      setFinancialSummary(emptyData);
      setNewGoal(emptyData.reserve_fund_goal.toString());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Memoize the dependency array to ensure consistent size
  const dependencies = useMemo(() => [
    buildingId, 
    currentBuilding?.id, // Use only the ID to avoid object reference issues
    selectedMonth || null // Use null instead of empty string for consistency
  ], [buildingId, currentBuilding?.id, selectedMonth]);

  useEffect(() => {
    // console.log('🔄 BuildingOverviewSection: useEffect triggered with dependencies:', dependencies);
    // console.log('🔄 BuildingOverviewSection: selectedMonth changed to:', selectedMonth);
    // console.log('🔄 BuildingOverviewSection: Current financial summary before update:', financialSummary?.last_calculation_date);
    
    // Single unified effect that handles all dependency changes
    fetchFinancialSummary(true); // Always force refresh for consistency
  }, dependencies);

  // Expose refresh function via ref
  useImperativeHandle(ref, () => ({
    refresh: () => fetchFinancialSummary(true)
  }));

  // Αφαιρέθηκε το auto-refresh hook - μόνο χειροκίνητο refresh

  // Handle refresh button click for all data
  const handleRefresh = () => {
    fetchFinancialSummary(true);
  };

  // Handle refresh button click for reserve fund only
  const handleRefreshReserve = async () => {
    try {
      setRefreshingReserve(true);
      
      // Call the real API to refresh financial data
      const params = new URLSearchParams({
        building_id: buildingId.toString()
      });
      
      // Add month parameter if provided (handle null/undefined)
      if (selectedMonth && selectedMonth !== 'null' && selectedMonth !== '') {
        params.append('month', selectedMonth);
      }
      
      const response = await api.get(`/financial/dashboard/summary/?${params}`);
      const apiData = response.data;
      
      // Update the financial summary with fresh data
      setFinancialSummary(prev => prev ? {
        ...prev,
        current_reserve: apiData.current_reserve || 0,
        total_balance: apiData.total_balance || 0,
        current_obligations: apiData.current_obligations || 0,
        apartments_count: apiData.apartments_count || prev.apartments_count,
        pending_payments: apiData.pending_payments || 0,
        average_monthly_expenses: apiData.average_monthly_expenses || 0,
        last_calculation_date: apiData.last_calculation_date || new Date().toISOString().split('T')[0],
        // Keep reserve fund settings unchanged
        reserve_fund_goal: prev.reserve_fund_goal,
        reserve_fund_start_date: prev.reserve_fund_start_date,
        reserve_fund_target_date: prev.reserve_fund_target_date,
        reserve_fund_monthly_target: prev.reserve_fund_monthly_target,
        reserve_fund_duration_months: prev.reserve_fund_duration_months
      } : null);
      
      // Αφαιρέθηκε το notification
      // toast.success('Δεδομένα αποθεματικού ενημερώθηκαν');
    } catch (error) {
      console.error('Error refreshing reserve fund data:', error);
      // Αφαιρέθηκε το error notification
      // toast.error('Αποτυχία ενημέρωσης δεδομένων αποθεματικού');
    } finally {
      setRefreshingReserve(false);
    }
  };

  const handleSaveGoal = async () => {
    try {
      const goalValue = parseFloat(newGoal);
      const installmentsValue = parseInt(newInstallments);
      
      if (isNaN(goalValue) || goalValue < 0) {
        // Αφαιρέθηκε το error notification
        // toast.error('Παρακαλώ εισάγετε έγκυρο ποσό');
        return;
      }

      if (isNaN(installmentsValue) || installmentsValue < 1 || installmentsValue > 60) {
        // Αφαιρέθηκε το error notification
        // toast.error('Ο αριθμός δόσεων πρέπει να είναι μεταξύ 1 και 60');
        return;
      }

      // Save goal and installments to localStorage for persistence
      saveToLocalStorage('goal', goalValue);
      saveToLocalStorage('duration_months', installmentsValue);
      
      // Calculate monthly target based on goal and installments
      const newMonthlyTarget = goalValue / installmentsValue;
      saveToLocalStorage('monthly_target', newMonthlyTarget);
      
      // Calculate new target date based on installments
      const today = new Date();
      const targetDate = new Date(today.getFullYear(), today.getMonth() + installmentsValue, 1);
      const targetDateString = targetDate.toISOString().split('T')[0];
      saveToLocalStorage('target_date', targetDateString);
      
      // Calculate start and end dates based on timeline configuration
      const newStartDate = newStartMonth && newStartYear ? 
        calculateNewDates(newStartMonth, newStartYear, installmentsValue).startDate :
        new Date().toISOString().split('T')[0];
      const newEndDate = newStartMonth && newStartYear ? 
        calculateNewDates(newStartMonth, newStartYear, installmentsValue).endDate :
        new Date(new Date().getFullYear(), new Date().getMonth() + installmentsValue, 0).toISOString().split('T')[0];
      
      // Recalculate reserve fund debt with new goal and installments
      const existingStartDate = new Date(financialSummary?.reserve_fund_start_date || newStartDate);
      const monthsPassed = Math.max(0, 
        (today.getFullYear() - existingStartDate.getFullYear()) * 12 + 
        (today.getMonth() - existingStartDate.getMonth())
      );
      const expectedSoFar = monthsPassed * newMonthlyTarget;
      const currentReserve = financialSummary?.current_reserve || 0;
      const newReserveFundDebt = Math.max(0, expectedSoFar - currentReserve);
      
      // Save to API with complete timeline data
      await api.patch(`/buildings/list/${buildingId}/`, { 
        reserve_fund_goal: goalValue,
        reserve_fund_duration_months: installmentsValue,
        reserve_fund_start_date: newStartDate,
        reserve_fund_target_date: newEndDate
      });
      
      setFinancialSummary(prev => prev ? { 
        ...prev, 
        reserve_fund_goal: goalValue,
        reserve_fund_duration_months: installmentsValue,
        reserve_fund_monthly_target: newMonthlyTarget,
        reserve_fund_start_date: newStartDate,
        reserve_fund_target_date: newEndDate,
        reserve_fund_debt: -newReserveFundDebt,
        total_balance: (prev.current_reserve || 0) // Current reserve already reflects the true balance
      } : null);
      setEditingGoal(false);
      // Αφαιρέθηκε το notification
      // toast.success('Ο στόχος αποθεματικού ενημερώθηκε και αποθηκεύτηκε επιτυχώς');
    } catch (error) {
      console.error('Error updating reserve fund goal:', error);
      // Αφαιρέθηκε το error notification
      // toast.error('Αποτυχία ενημέρωσης στόχου αποθεματικού');
    }
  };

  const handleSaveTimeline = async () => {
    try {
      if (!newStartMonth || !newStartYear || !newDurationMonths) {
        console.error('Missing required fields for timeline update');
        return;
      }

      const durationValue = parseInt(newDurationMonths);
      if (isNaN(durationValue) || durationValue < 3 || durationValue > 60) {
        console.error('Duration must be between 3 and 60 months');
        return;
      }

      const { startDate, endDate } = calculateNewDates(newStartMonth, newStartYear, durationValue);
      
      // Calculate monthly target based on goal and duration
      const monthlyTarget = financialSummary?.reserve_fund_goal ? 
                           financialSummary.reserve_fund_goal / durationValue : 0;

      // Save to localStorage for persistence
      saveToLocalStorage('start_date', startDate);
      saveToLocalStorage('target_date', endDate);
      saveToLocalStorage('duration_months', durationValue);
      saveToLocalStorage('monthly_target', monthlyTarget);
      
      // Recalculate reserve fund debt with new timeline
      const today = new Date();
      const newStartDate = new Date(startDate);
      const monthsPassed = Math.max(0, 
        (today.getFullYear() - newStartDate.getFullYear()) * 12 + 
        (today.getMonth() - newStartDate.getMonth())
      );
      const expectedSoFar = monthsPassed * monthlyTarget;
      const currentReserve = financialSummary?.current_reserve || 0;
      const newReserveFundDebt = Math.max(0, expectedSoFar - currentReserve);

      // Save to API
      await api.patch(`/buildings/list/${buildingId}/`, { 
        reserve_fund_start_date: startDate,
        reserve_fund_target_date: endDate,
        reserve_fund_duration_months: durationValue
      });
      
      setFinancialSummary(prev => prev ? {
        ...prev,
        reserve_fund_start_date: startDate,
        reserve_fund_target_date: endDate,
        reserve_fund_duration_months: durationValue,
        reserve_fund_monthly_target: monthlyTarget,
        reserve_fund_debt: -newReserveFundDebt,
        total_balance: (prev.current_reserve || 0) // Current reserve already reflects the true balance
      } : null);
      
      setEditingTimeline(false);
      // Αφαιρέθηκε το notification
      // toast.success('Το πρόγραμμα συλλογής ενημερώθηκε και αποθηκεύτηκε επιτυχώς');
          } catch (error) {
        console.error('Error updating timeline:', error);
        // Αφαιρέθηκε το error notification
        // toast.error('Αποτυχία ενημέρωσης προγράμματος');
      }
  };

  const handleSaveManagementFee = async () => {
    try {
      const feeValue = parseFloat(newManagementFee);
      if (isNaN(feeValue) || feeValue < 0) {
        // Αφαιρέθηκε το error notification
        // toast.error('Παρακαλώ εισάγετε έγκυρο ποσό');
        return;
      }

      // Save to localStorage for persistence
      saveToLocalStorage('management_fee', feeValue);
      
      // Recalculate total management cost
      const totalManagementCost = feeValue * (currentBuilding?.apartments_count || 0);
      saveToLocalStorage('total_management_cost', totalManagementCost);

      // Save to API
      await api.patch(`/buildings/list/${buildingId}/`, { 
        management_fee_per_apartment: feeValue 
      });
      
      setFinancialSummary(prev => prev ? {
        ...prev,
        management_fee_per_apartment: feeValue,
        total_management_cost: totalManagementCost
      } : null);
      setEditingManagementFee(false);
      // Αφαιρέθηκε το notification
      // toast.success('Η αμοιβή διαχείρισης ενημερώθηκε και αποθηκεύτηκε επιτυχώς');
    } catch (error) {
      console.error('Error updating management fee:', error);
      // Αφαιρέθηκε το error notification
      // toast.error('Αποτυχία ενημέρωσης αμοιβής διαχείρισης');
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '0,00 €';
    }
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Dynamic progress bar colors based on percentage
  const getProgressColors = (percentage: number) => {
    if (percentage >= 100) {
      return {
        bg: 'bg-green-200',
        fill: 'bg-green-600',
        text: 'text-green-700'
      };
    } else if (percentage >= 90) {
      return {
        bg: 'bg-green-100',
        fill: 'bg-green-500',
        text: 'text-green-600'
      };
    } else if (percentage >= 70) {
      return {
        bg: 'bg-yellow-100',
        fill: 'bg-yellow-500',
        text: 'text-yellow-600'
      };
    } else if (percentage >= 40) {
      return {
        bg: 'bg-orange-100',
        fill: 'bg-orange-500',
        text: 'text-orange-600'
      };
    } else {
      return {
        bg: 'bg-red-100',
        fill: 'bg-red-500',
        text: 'text-red-600'
      };
    }
  };

  // Balance color thresholds - configurable
  const BALANCE_THRESHOLDS = {
    HIGH_DEBT: 5000,
    MEDIUM_DEBT: 2000
  };

  // Dynamic card colors for Total Balance based on amount
  const getBalanceCardColors = (balance: number) => {
    if (balance >= 0) {
      // Positive balance - Green shades
      return {
        amount: 'text-green-700',
        title: 'text-green-900',
        icon: 'text-green-600',
        cardBg: 'border-green-200 bg-green-50/50'
      };
    } else {
      // Negative balance - Red to Orange based on severity
      const absBalance = Math.abs(balance);
      if (absBalance >= BALANCE_THRESHOLDS.HIGH_DEBT) {
        // High debt - Red
        return {
          amount: 'text-red-700',
          title: 'text-red-900',
          icon: 'text-red-600',
          cardBg: 'border-red-200 bg-red-50/50'
        };
      } else if (absBalance >= BALANCE_THRESHOLDS.MEDIUM_DEBT) {
        // Medium debt - Orange/Red
        return {
          amount: 'text-red-600',
          title: 'text-red-800',
          icon: 'text-red-500',
          cardBg: 'border-red-200 bg-red-50/30'
        };
      } else {
        // Low debt - Orange
        return {
          amount: 'text-orange-600',
          title: 'text-orange-800',
          icon: 'text-orange-500',
          cardBg: 'border-orange-200 bg-orange-50/30'
        };
      }
    }
  };

  // Dynamic card colors for Reserve Fund based on progress
  const getReserveFundCardColors = (percentage: number) => {
    if (percentage >= 100) {
      return 'border-green-200 bg-green-50/50';
    } else if (percentage >= 90) {
      return 'border-green-200 bg-green-50/30';
    } else if (percentage >= 70) {
      return 'border-yellow-200 bg-yellow-50/30';
    } else if (percentage >= 40) {
      return 'border-orange-200 bg-orange-50/30';
    } else {
      return 'border-red-200 bg-red-50/30';
    }
  };

  // Helper function to check if selectedMonth is within reserve fund collection period
  const isMonthWithinReserveFundPeriod = () => {
    if (!selectedMonth || !financialSummary?.reserve_fund_start_date) {
      return false; // Don't show reserve fund if no timeline is configured
    }

    try {
      const selectedDate = new Date(selectedMonth + '-01');
      const startDate = new Date(financialSummary.reserve_fund_start_date);
      const targetDate = financialSummary.reserve_fund_target_date ? 
        new Date(financialSummary.reserve_fund_target_date) : null;
      
      // Check if selected month is within the collection period
      const isAfterStart = selectedDate >= startDate;
      const isBeforeEnd = !targetDate || selectedDate <= targetDate;
      const isWithinPeriod = isAfterStart && isBeforeEnd;
      
      console.log('🔄 Reserve Fund Period Check:', {
        selectedMonth,
        selectedDate: selectedDate.toLocaleDateString('el-GR'),
        startDate: startDate.toLocaleDateString('el-GR'),
        targetDate: targetDate?.toLocaleDateString('el-GR') || 'No end date',
        isAfterStart,
        isBeforeEnd,
        isWithinPeriod,
        reserve_fund_monthly_target: financialSummary?.reserve_fund_monthly_target,
        condition1: (financialSummary.reserve_fund_monthly_target || 0) > 0,
        condition2: isWithinPeriod
      });
      
      return isWithinPeriod;
    } catch (error) {
      console.error('Error checking reserve fund period:', error);
      return false; // Safe fallback - don't show reserve fund if error
    }
  };

  // Generate installment months with current month highlighting
  const getReserveFundInstallmentMonths = () => {
    const duration = Number(financialSummary?.reserve_fund_duration_months || 0);
    if (duration <= 0) return [];
    // Default start to current month if missing
    const start = financialSummary?.reserve_fund_start_date
      ? new Date(financialSummary.reserve_fund_start_date)
      : new Date();
    const scheduleStart = new Date(start.getFullYear(), start.getMonth(), 1);
    const currentDate = selectedMonth ? new Date(selectedMonth + '-01') : new Date();

    const greekMonths = ['Ιαν','Φεβ','Μαρ','Απρ','Μαϊ','Ιουν','Ιουλ','Αυγ','Σεπ','Οκτ','Νοε','Δεκ'];
    const installments: Array<{ installmentNumber: number; monthNumber: number; monthName: string; year: number; isCurrent: boolean; isFuture: boolean; displayText: string }> = [];
    for (let i = 0; i < duration; i++) {
      const d = new Date(scheduleStart.getFullYear(), scheduleStart.getMonth() + i, 1);
      const isCurrent = d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth();
      const isFuture = d > currentDate;
      installments.push({
        installmentNumber: i + 1,
        monthNumber: d.getMonth() + 1,
        monthName: greekMonths[d.getMonth()],
        year: d.getFullYear(),
        isCurrent,
        isFuture,
        displayText: `${i + 1}η: ${greekMonths[d.getMonth()]} ${d.getFullYear()}`
      });
    }
    return installments;
  };

  const getReserveFundAnalytics = () => {
    if (!financialSummary?.reserve_fund_start_date || !financialSummary?.reserve_fund_target_date) {
      return null;
    }

    const startDate = new Date(financialSummary.reserve_fund_start_date);
    const targetDate = new Date(financialSummary.reserve_fund_target_date);
    
    // Use selectedMonth if provided, otherwise use current date
    const currentDate = selectedMonth ? 
      new Date(selectedMonth + '-01') : // Convert "2025-03" to Date object
      new Date();
    
    console.log('🔄 ReserveFundAnalytics: Using date for calculations:', 
      selectedMonth ? `${selectedMonth} (selected)` : 'current date', 
      currentDate.toLocaleDateString('el-GR')
    );

    // Calculate time periods
    const totalMonths = financialSummary.reserve_fund_duration_months || 
                       ((targetDate.getFullYear() - startDate.getFullYear()) * 12 + 
                        (targetDate.getMonth() - startDate.getMonth()));
    
    const elapsedMonths = Math.max(0, (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                                    (currentDate.getMonth() - startDate.getMonth()));
    
    const remainingMonths = Math.max(0, totalMonths - elapsedMonths);

    // Calculate progress
    const timeProgress = totalMonths > 0 ? (elapsedMonths / totalMonths) * 100 : 0;
    const amountProgress = financialSummary.reserve_fund_goal > 0 ? 
                          (financialSummary.current_reserve / financialSummary.reserve_fund_goal) * 100 : 0;

    // Calculate if on track
    const expectedAmountByNow = timeProgress > 0 ? 
                               (timeProgress / 100) * financialSummary.reserve_fund_goal : 0;
    const isOnTrack = financialSummary.current_reserve >= expectedAmountByNow;
    const variance = financialSummary.current_reserve - expectedAmountByNow;

    // Calculate projected completion
    const monthlyRate = elapsedMonths > 0 ? 
                       financialSummary.current_reserve / elapsedMonths : 
                       financialSummary.reserve_fund_monthly_target || 0;
    
    const remainingAmount = Math.max(0, financialSummary.reserve_fund_goal - financialSummary.current_reserve);
    const projectedMonthsToCompletion = monthlyRate > 0 ? Math.ceil(remainingAmount / monthlyRate) : null;

    return {
      startDate,
      targetDate,
      totalMonths,
      elapsedMonths,
      remainingMonths,
      timeProgress,
      amountProgress,
      isOnTrack,
      variance,
      expectedAmountByNow,
      monthlyRate,
      projectedMonthsToCompletion,
      projectedCompletionDate: projectedMonthsToCompletion ? 
        new Date(currentDate.getFullYear(), currentDate.getMonth() + projectedMonthsToCompletion, 1) : null,
      // Add info about calculation context
      calculationContext: selectedMonth ? 'monthly_snapshot' : 'current_state'
    };
  };

  // Calculate progress strictly by actual reserve vs goal
  const calculateReserveFundProgress = () => {
    if (!financialSummary?.reserve_fund_goal || financialSummary.reserve_fund_goal === 0) {
      return 0;
    }
    const current = Math.max(0, Number(financialSummary.current_reserve || 0));
    const goal = Math.max(0, Number(financialSummary.reserve_fund_goal || 0));
    const progress = (current / goal) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  const reserveProgress = calculateReserveFundProgress();

  if (loading) {
    return (
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-4">
          <div className="animate-pulse">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-6 w-6 bg-gray-300 rounded"></div>
              <div className="h-6 bg-gray-300 rounded w-2/3"></div>
            </div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enhanced loading animation with staggered effect */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-2 animate-pulse" style={{animationDelay: `${i * 0.1}s`}}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-5 w-5 bg-gray-300 rounded"></div>
                    <div className="h-4 bg-gray-300 rounded w-24"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-8 bg-gray-300 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                    {i === 3 && (
                      <div className="space-y-2 pt-2 border-t border-gray-200">
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-6 bg-gray-300 rounded w-full"></div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Loading indicator */}
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-2 text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm">Φόρτωση οικονομικών δεδομένων...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Debug render data (commented out to reduce console spam)
  // console.log('🎨 BuildingOverviewSection: RENDER - financialSummary:', financialSummary);
  // console.log('🎨 BuildingOverviewSection: RENDER - current_obligations:', financialSummary?.current_obligations);
  // console.log('🎨 BuildingOverviewSection: RENDER - selectedMonth:', selectedMonth);
  // console.log('🎨 BuildingOverviewSection: RENDER - average_monthly_expenses:', financialSummary?.average_monthly_expenses);

  if (!financialSummary) {
    return null;
  }

  const isPositiveBalance = (financialSummary?.total_balance || 0) >= 0;
  const reserveAnalytics = getReserveFundAnalytics();

  return (
    <Card className="border-none shadow-none"> {/* Removed border and shadow to blend in */}
      <CardContent className="space-y-8 pt-0"> {/* Removed top padding */}
        {/* Section 1: Period Overview */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Month-Specific Data Card */}
            <Card className="border-2 border-blue-200 bg-blue-50/30">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-sm text-blue-900">
                    Οικονομικές Υποχρεώσεις Περιόδου
                  </h3>
                </div>
                
                <div className="space-y-3">
                  {/* Πραγματικά έξοδα */}
                  <div className="space-y-1">
                    <div className="text-xs text-red-600 font-medium"> Δαπάνες</div>
                    <div className="text-lg font-bold text-red-700">
                    {formatCurrency(financialSummary.average_monthly_expenses || 0)}
                    </div>
                    {(financialSummary.average_monthly_expenses || 0) === 0 && (
                      <div className="text-xs text-gray-500 italic">Δεν υπάρχουν δαπάνες</div>
                    )}
                  </div>
                  
                  {/* Κόστος διαχείρισης */}
                  {(financialSummary.total_management_cost || 0) > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs text-blue-600 font-medium">Κόστος διαχείρισης/μήνα:</div>
                      <div className="text-lg font-bold text-blue-700">
                        {formatCurrency(financialSummary.total_management_cost || 0)}/μήνα
                      </div>
                      <div className="text-xs text-blue-600 italic">
                        {financialSummary.apartments_count || 0} διαμερίσματα × {formatCurrency(financialSummary.management_fee_per_apartment || 0)}/μήνα
                      </div>
                    </div>
                  )}
                  
                  {/* Εισφορά αποθεματικού - εμφανίζεται αν είμαστε στην περίοδο συλλογής */}
                  {(financialSummary.reserve_fund_monthly_target || 0) > 0 && isMonthWithinReserveFundPeriod() && (
                    <div className="space-y-1">
                      <div className="text-xs text-green-600 font-medium">Εισφορά αποθεματικού:</div>
                      <div className={`text-lg font-bold ${(financialSummary.reserve_fund_contribution || 0) === 0 ? 'text-gray-500' : 'text-green-700'}`}>
                        {formatCurrency(financialSummary.reserve_fund_monthly_target || 0)}
                        {(financialSummary.reserve_fund_contribution || 0) === 0 && (
                          <span className="text-xs text-red-600 ml-2">(Αναστολή)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={`text-xs italic ${(financialSummary.reserve_fund_contribution || 0) === 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {(financialSummary.reserve_fund_contribution || 0) === 0 ? 'Θα αρχίσει να συλλέγεται μόλις εκπληρωθούν οι λειτουργικές δαπάνες' : 'Συσσώρευση κεφαλαίων'}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowReserveFundInfoModal(true)}
                          className="h-4 w-4 p-0 text-green-600 hover:text-green-700"
                          title="Πληροφορίες για την εισφορά αποθεματικού"
                        >
                          <Info className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                                      {/* Μηνιαίες Υποχρεώσεις (αν υπάρχουν πραγματικές δαπάνες, κόστος διαχείρισης ή αποθεματικό στην περίοδο) */}
                  {((financialSummary.average_monthly_expenses || 0) > 0 || (financialSummary.total_management_cost || 0) > 0 || ((financialSummary.reserve_fund_monthly_target || 0) > 0 && isMonthWithinReserveFundPeriod())) && (
                    <div className="space-y-1 pt-2 border-t border-gray-200">
                      <div className="text-xs text-gray-700 font-medium">Μηνιαίες υποχρεώσεις (τρέχοντος μήνα):</div>
                      <div className="text-xl font-bold text-gray-800">
                        {formatCurrency((financialSummary.average_monthly_expenses || 0) + (financialSummary.total_management_cost || 0) + (isMonthWithinReserveFundPeriod() ? (financialSummary.reserve_fund_monthly_target || 0) : 0))}
                      </div>
                      <Badge variant="outline" className="text-xs border-gray-300 text-gray-700">
                        {(() => {
                          const hasExpenses = (financialSummary.average_monthly_expenses || 0) > 0;
                          const hasManagement = (financialSummary.total_management_cost || 0) > 0;
                          const hasReserve = (financialSummary.reserve_fund_monthly_target || 0) > 0 && isMonthWithinReserveFundPeriod();
                          
                          if (hasExpenses && hasManagement && hasReserve) return 'Έξοδα + Διαχείριση + Εισφορά';
                          if (hasExpenses && hasManagement) return 'Έξοδα + Διαχείριση';
                          if (hasExpenses && hasReserve) return 'Έξοδα + Εισφορά';
                          if (hasManagement && hasReserve) return 'Διαχείριση + Εισφορά';
                          if (hasExpenses) return 'Μόνο έξοδα';
                          if (hasManagement) return 'Μόνο διαχείριση';
                          if (hasReserve) return 'Μόνο εισφορά';
                          return 'Δεν υπάρχουν υποχρεώσεις';
                        })()}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="text-xs text-blue-600 mt-2">
                    <strong>Περίοδος:</strong> {selectedMonth ? 
                      new Date(selectedMonth + '-01').toLocaleDateString('el-GR', { month: 'long', year: 'numeric' }) : 
                      'Τρέχων Μήνας'
                    }
                  </div>
                </div>
              </CardContent>
            </Card>



            {/* Total Balance Card */}
            <Card className={`border-2 ${getBalanceCardColors(financialSummary?.total_balance || 0).cardBg}`}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-3">
                  {isPositiveBalance ? (
                    <TrendingUp className={`h-5 w-5 ${getBalanceCardColors(financialSummary?.total_balance || 0).icon}`} />
                  ) : (
                    <TrendingDown className={`h-5 w-5 ${getBalanceCardColors(financialSummary?.total_balance || 0).icon}`} />
                  )}
                  <h3 className={`font-semibold text-sm ${getBalanceCardColors(financialSummary?.total_balance || 0).title}`}>
                    {selectedMonth ? `Οικονομική Κατάσταση Μήνα` : 'Τρέχον Υπόλοιπο'}
                  </h3>
                </div>
                
                <div className="space-y-3">
                  {/* Συνολικό υπόλοιπο */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className={`text-xl font-bold ${getBalanceCardColors(financialSummary?.total_balance || 0).amount}`}>
                        {formatCurrency(Math.abs((financialSummary.average_monthly_expenses || 0) + (financialSummary.total_management_cost || 0) + (financialSummary.reserve_fund_monthly_target || 0) + (financialSummary.previous_obligations || 0)))}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleShowAmountDetails('total_balance', financialSummary?.total_balance || 0, 'Συνολικό Υπόλοιπο')}
                        className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                        title="Δείτε λεπτομέρειες"
                      >
                        Λεπτομέρειες
                      </Button>
                    </div>
                    
                    <Badge 
                      variant={isPositiveBalance ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {isPositiveBalance ? 'Θετικό Υπόλοιπο' : 'Αρνητικό Υπόλοιπο'}
                    </Badge>
                    
                    <div className="text-xs text-gray-600 mt-2">
                      <strong>Τύπος:</strong> {selectedMonth ? 'Προβολή για τον επιλεγμένο μήνα' : 'Τρέχουσα κατάσταση'}
                    </div>
                  </div>

                  {/* Ανάλυση κάλυψης υποχρεώσεων */}
                  <div className="pt-2 border-t border-gray-200 space-y-3">
                    <div className="text-xs font-medium text-gray-700 mb-2">Τι πρέπει να πληρωθεί αυτόν τον μήνα:</div>
                    
                    {/* Τρέχουσες υποχρεώσεις */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-red-700 font-medium">Οικονομικές Υποχρεώσεις Περιόδου:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-red-800">
                            {formatCurrency(Math.abs(financialSummary.current_obligations || 0))}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShowAmountDetails('current_obligations', financialSummary?.average_monthly_expenses || 0, 'Οικονομικές Υποχρεώσεις Περιόδου')}
                            className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                            title="Δείτε λεπτομέρειες"
                          >
                            Λεπτομέρειες
                          </Button>
                        </div>
                      </div>
                    </div>
                      


                    {/* Παλαιότερες οφειλές */}
                    {(financialSummary?.previous_obligations || 0) > 0 && (
                      <div className="space-y-1 pt-2 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-purple-700 font-medium">Παλαιότερες οφειλές:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-purple-800">
                              {formatCurrency(financialSummary?.previous_obligations || 0)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShowAmountDetails('previous_obligations', financialSummary?.previous_obligations || 0, 'Παλαιότερες Οφειλές')}
                              className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700"
                              title="Δείτε λεπτομέρειες"
                            >
                              Λεπτομέρειες
                            </Button>
                          </div>
                        </div>

                      </div>
                    )}


                      
                    {/* Συνολική κάλυψη */}
                    <div className="space-y-1 pt-2 border-t-2 border-gray-300 bg-gray-50 p-2 rounded">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-800">Μηνιαίο σύνολο:</span>
                        <span className="text-lg font-bold text-gray-900">
                          {formatCurrency((financialSummary.average_monthly_expenses || 0) + (financialSummary.total_management_cost || 0) + (isMonthWithinReserveFundPeriod() ? (financialSummary.reserve_fund_monthly_target || 0) : 0) + (financialSummary.previous_obligations || 0))}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 text-[10px]">
                        {(() => {
                          const hasExpenses = (financialSummary.average_monthly_expenses || 0) > 0;
                          const hasManagement = (financialSummary.total_management_cost || 0) > 0;
                          const hasReserve = (financialSummary.reserve_fund_monthly_target || 0) > 0 && isMonthWithinReserveFundPeriod();
                          const hasPreviousObligations = (financialSummary.previous_obligations || 0) > 0;
                          
                          let description = '';
                          const parts = [];
                          
                          // Προσθήκη "Οικονομικές Υποχρεώσεις Περιόδου" αν υπάρχουν τρέχουσες υποχρεώσεις
                          if (hasExpenses || hasManagement || hasReserve) {
                            parts.push('Οικονομικές Υποχρεώσεις Περιόδου');
                          }
                          
                          // Προσθήκη "παλαιότερες οφειλές" αν υπάρχουν
                          if (hasPreviousObligations) {
                            parts.push('παλαιότερες οφειλές');
                          }
                          
                          if (parts.length > 0) {
                            description = parts.join(' + ');
                          } else {
                            description = 'Δεν υπάρχουν υποχρεώσεις';
                          }
                          
                          return description;
                        })()}
                      </div>
                    </div>
                    
                    {/* Προειδοποιήσεις */}
                    {!isPositiveBalance && (
                      <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <div className="text-sm text-red-800 font-semibold">
                            Προσοχή: Αρνητικό Υπόλοιπο
                          </div>
                        </div>
                        <div className="text-xs text-red-700">
                          Το κτίριο έχει αρνητικό υπόλοιπο. Χρειάζεται να πληρωθούν οι τρέχουσες υποχρεώσεις πρώτα.
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {isPositiveBalance && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <div className="text-sm text-green-800 font-semibold">
                          Καλή Κατάσταση
                        </div>
                      </div>
                      <div className="text-xs text-green-700">
                        Το κτίριο δεν έχει αρνητικό υπόλοιπο.
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Section 1.5: Με μια ματιά - Progress Bar */}
        <div className="space-y-4">
          <Card className="border-2 border-green-200 bg-green-50/30">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-sm text-green-900">
                    Με μια ματιά
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-green-700">
                    Προβολή κάλυψης υποχρεώσεων με progress bar
                  </div>
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    Progress Bar
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              
              {(() => {
                // Υπολογισμός συνολικού ποσού που οφείλεται (τρέχοντες + προηγούμενες οφειλές)
                const currentMonthObligations = (financialSummary.total_expenses_month || 0) + 
                                               (financialSummary.total_management_cost || 0) + 
                                               (financialSummary.reserve_fund_monthly_target || 0);
                
                // Προηγούμενες οφειλές (συμπεριλαμβανομένων εκ των υστέρων δαπανών)
                const previousObligations = financialSummary.previous_obligations || 0;
                
                // Συνολικές υποχρεώσεις = τρέχοντες + προηγούμενες
                const totalObligations = currentMonthObligations + previousObligations;
                
                // Πληρωμές που έχουν γίνει για τον τρέχοντα μήνα
                const actualPayments = financialSummary.total_payments_month || 0;
                
                // Υπολογισμός ποσοστού κάλυψης
                const coveragePercentage = totalObligations > 0 ? Math.min(100, (actualPayments / totalObligations * 100)) : 0;
                
                // Υπολογισμός εκκρεμών πληρωμών
                const pendingPayments = Math.max(0, totalObligations - actualPayments);
                
                return (
                  <div className="space-y-6">
                    {/* Progress Bar */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">
                            Κάλυψη Υποχρεώσεων
                            {previousObligations > 0 && (
                              <span className="text-xs text-gray-500 ml-1">(συμπεριλαμβανομένων προηγούμενων)</span>
                            )}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700"
                            title="Ανανέωση δεδομένων (χειροκίνητο)"
                          >
                            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>
                        <span className="text-sm font-bold text-green-600">
                          {coveragePercentage.toFixed(1)}%
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${coveragePercentage}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-bold text-white drop-shadow-sm">
                            {formatCurrency(actualPayments)} / {formatCurrency(totalObligations)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>0€</span>
                        <span>{formatCurrency(totalObligations)}</span>
                      </div>
                    </div>
                    
                    {/* Στατιστικά */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-lg font-bold text-green-700">
                          {formatCurrency(actualPayments)}
                        </div>
                        <div className="text-xs text-green-600">Πληρωμένες</div>
                      </div>
                      
                      <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="text-lg font-bold text-red-700">
                          {formatCurrency(pendingPayments)}
                        </div>
                        <div className="text-xs text-red-600">Εκκρεμείς</div>
                      </div>
                      
                      <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-lg font-bold text-blue-700">
                          {formatCurrency(totalObligations)}
                        </div>
                        <div className="text-xs text-blue-600">Σύνολο</div>
                      </div>
                    </div>
                    
                    {/* Status Message */}
                    <div className={`p-4 rounded-lg text-sm ${
                      coveragePercentage >= 100 
                        ? 'bg-green-50 text-green-800 border border-green-200' 
                        : coveragePercentage >= 80 
                          ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                          : coveragePercentage >= 50
                            ? 'bg-orange-50 text-orange-800 border border-orange-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      {coveragePercentage >= 100 ? (
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4" />
                          <span className="font-medium">Όλες οι υποχρεώσεις έχουν καλυφθεί!</span>
                        </div>
                      ) : coveragePercentage >= 80 ? (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">Καλή κάλυψη - χρειάζεται επιπλέον εισπράξεις</span>
                        </div>
                      ) : coveragePercentage >= 50 ? (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">Μέτρια κάλυψη - απαιτούνται εισπράξεις</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">Χαμηλή κάλυψη - απαιτούνται άμεσες εισπράξεις</span>
                        </div>
                      )}
                      <div className="mt-2 text-xs opacity-75">
                        Εισπράξεις: {formatCurrency(actualPayments)} | Συνολικές Υποχρεώσεις: {formatCurrency(totalObligations)}
                        {previousObligations > 0 && (
                          <div className="mt-1 text-xs">
                            (Τρέχοντες: {formatCurrency(currentMonthObligations)} + Προηγούμενες: {formatCurrency(previousObligations)})
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Section 2: Overall Financial Health */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
            Ρύθμιση Αποθεματικού & Εξοδα Διαχείρησης    </h3>
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-3 sm:gap-4">
            {/* Reserve Fund Goal Card - 70% width */}
            <Card className={`col-span-1 lg:col-span-7 ${getReserveFundCardColors(reserveProgress)} relative ${refreshingReserve ? 'opacity-75' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target className={`h-5 w-5 ${getProgressColors(reserveProgress).text}`} />
                    <h3 className={`font-semibold text-base ${getProgressColors(reserveProgress).text}`}>Στόχος Αποθεματικού</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRefreshReserve}
                      disabled={refreshingReserve}
                      className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700"
                      title="Ανανέωση δεδομένων"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshingReserve ? 'animate-spin' : ''}`} />
                    </Button>
                    {!editingGoal && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingGoal(true)}
                        className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700"
                        title="Επεξεργασία στόχου"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {editingGoal ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="new-goal" className="text-sm font-medium">Νέος στόχος (€)</Label>
                        <Input
                          id="new-goal"
                          type="number"
                          value={newGoal}
                          onChange={(e) => setNewGoal(e.target.value)}
                          placeholder="0.00"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-installments" className="text-sm font-medium">Δόσεις (μήνες)</Label>
                        <Input
                          id="new-installments"
                          type="number"
                          value={newInstallments}
                          onChange={(e) => setNewInstallments(e.target.value)}
                          placeholder="12"
                          min="1"
                          max="60"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    {/* Preview */}
                    {newGoal && newInstallments && parseFloat(newGoal) > 0 && parseInt(newInstallments) > 0 && (
                      <div className="p-3 bg-blue-50 rounded border border-blue-200">
                        <div className="text-sm text-blue-700 font-medium mb-1">
                          Προεπισκόπηση:
                        </div>
                        <div className="text-xs text-blue-600 space-y-1">
                          <div>• Μηνιαία εισφορά: {(parseFloat(newGoal) / parseInt(newInstallments)).toFixed(2)}€</div>
                          <div>• Συνολικό ποσό: {parseFloat(newGoal).toFixed(2)}€</div>
                          <div>• Διάρκεια: {newInstallments} μήνες</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Timeline Configuration */}
                    <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                      <div className="text-sm font-medium text-gray-700 mb-3">Πρόγραμμα Συλλογής</div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor="start-month" className="text-xs font-medium">Μήνας Έναρξης</Label>
                          <Select value={newStartMonth} onValueChange={setNewStartMonth}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Επιλογή μήνα" />
                            </SelectTrigger>
                            <SelectContent>
                              {getMonthOptions().map((month) => (
                                <SelectItem key={month.value} value={month.value}>
                                  {month.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="start-year" className="text-xs font-medium">Έτος Έναρξης</Label>
                          <Select value={newStartYear} onValueChange={setNewStartYear}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Επιλογή έτους" />
                            </SelectTrigger>
                            <SelectContent>
                              {getYearOptions().map((year) => (
                                <SelectItem key={year.value} value={year.value}>
                                  {year.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="duration" className="text-xs font-medium">Διάρκεια</Label>
                          <Select value={newDurationMonths} onValueChange={setNewDurationMonths}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Επιλογή διάρκειας" />
                            </SelectTrigger>
                            <SelectContent>
                              {getDurationOptions().map((duration) => (
                                <SelectItem key={duration.value} value={duration.value}>
                                  {duration.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {/* Timeline Preview */}
                      {newStartMonth && newStartYear && newDurationMonths && (
                        <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                          <div className="text-xs text-blue-700 font-medium mb-1">Προεπισκόπηση Προγράμματος:</div>
                          <div className="text-xs text-blue-600">
                            • Έναρξη: {getMonthOptions().find(m => m.value === newStartMonth)?.label} {newStartYear}
                            • Διάρκεια: {newDurationMonths} μήνες
                            • Ολοκλήρωση: {(() => {
                              const startDate = new Date(parseInt(newStartYear), parseInt(newStartMonth) - 1, 1);
                              const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + parseInt(newDurationMonths), 0);
                              return `${getMonthOptions().find(m => m.value === (endDate.getMonth() + 1).toString().padStart(2, '0'))?.label} ${endDate.getFullYear()}`;
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={handleSaveGoal} className="flex-1 bg-orange-600 hover:bg-orange-700">
                        <Check className="h-4 w-4 mr-1" />
                        Αποθήκευση
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingGoal(false);
                          setNewGoal((financialSummary?.reserve_fund_goal || 0).toString());
                          setNewInstallments((financialSummary?.reserve_fund_duration_months || 0).toString());
                        }}
                        className="border-orange-200 text-orange-600 hover:bg-orange-50"
                      >
                        <X className="h-4 w-4" />
                        Ακύρωση
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Column 1: Goal and Installments */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="text-xs text-orange-700 font-medium">Στόχος:</div>
                        <div className={`text-lg font-bold ${getProgressColors(reserveProgress).text}`}>
                          {formatCurrency(financialSummary?.reserve_fund_goal || 0)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-orange-700 font-medium">Μηνιαία Δόση:</div>
                        <div className={`text-sm font-bold ${getProgressColors(reserveProgress).text}`}>
                          {formatCurrency(financialSummary?.reserve_fund_monthly_target || 0)}
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Progress */}
                    <div className="space-y-2 p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                      <div className="flex justify-between text-xs text-orange-600">
                        <span>Πρόοδος</span>
                        <span>{Math.round(reserveProgress)}%</span>
                      </div>
                      <div className={`w-full rounded-full h-2 ${getProgressColors(reserveProgress).bg}`}>
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${getProgressColors(reserveProgress).fill}`}
                          style={{ width: `${Math.min(100, Math.max(0, reserveProgress))}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span>{`${formatCurrency(financialSummary?.current_reserve || 0)} / ${formatCurrency(financialSummary?.reserve_fund_goal || 0)}`}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShowAmountDetails('current_reserve', financialSummary?.current_reserve || 0, 'Τρέχον Ισοζύγιο')}
                            className="h-4 px-1 text-xs text-orange-600 hover:text-orange-700"
                            title="Δείτε λεπτομέρειες ισοζυγίου"
                          >
                            Λεπτομέρειες
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Column 3: Installment Schedule */}
                    <div className="space-y-1">
                      {financialSummary?.reserve_fund_duration_months && (
                        <div className="text-xs text-orange-600 space-y-2">
                          <div className="font-medium">Πρόγραμμα {financialSummary.reserve_fund_duration_months} δόσεων:</div>
                          {(() => {
                            const installments = getReserveFundInstallmentMonths();
                            const hasStarted = installments.length > 0 && !installments[0]?.isFuture;
                            
                            if (installments.length === 0) {
                              return (
                                <div className="text-xs text-gray-500 italic bg-gray-50 px-2 py-1 rounded">
                                  Δεν έχει οριστεί πρόγραμμα.
                                </div>
                              );
                            }

                            return (
                              <>
                                {!hasStarted && (
                                  <div className="text-xs text-blue-600 italic bg-blue-50 px-2 py-1 rounded">
                                    ⏳ Η συλλογή ξεκινάει {installments[0]?.displayText?.split(': ')[1]}
                                  </div>
                                )}
                                <div className="space-y-1 max-h-24 overflow-y-auto">
                                  {installments.map((installment, index) => (
                                    <div 
                                      key={index}
                                      className={`text-xs px-2 py-1 rounded ${
                                        installment.isCurrent 
                                          ? 'font-bold text-orange-800 bg-orange-100 border border-orange-200' 
                                          : installment.isFuture 
                                            ? 'text-gray-500 italic bg-gray-50' 
                                            : 'text-orange-600 bg-orange-50'
                                      }`}
                                      title={installment.isCurrent ? 'Τρέχουσα δόση' : installment.isFuture ? 'Μελλοντική δόση' : 'Παρελθούσα δόση'}
                                    >
                                      {installment.displayText}
                                    </div>
                                  ))}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {refreshingReserve && (
                  <div className="mt-3 p-2 bg-orange-50 rounded border border-orange-200">
                    <div className="text-xs text-orange-600 text-center flex items-center justify-center gap-2">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Ενημέρωση δεδομένων...
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Management & Services Card - 30% width */}
            <Card className={`col-span-1 lg:col-span-3 border-purple-200 bg-purple-50/30 relative ${applyingServicePackage ? 'opacity-75' : ''}`}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-purple-900">Δαπάνες Διαχείρισης</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowServicePackageModal(true)}
                      className="h-8 px-2 text-purple-600 hover:text-purple-700"
                      title="Επιλογή πακέτου υπηρεσιών"
                    >
                      <Package className="h-4 w-4 mr-1" />
                      Πακέτα
                    </Button>
                    {!editingManagementFee && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingManagementFee(true)}
                        className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700"
                        title="Επεξεργασία αμοιβής διαχείρισης"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {editingManagementFee ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="management-fee" className="text-xs">Αμοιβή ανά διαμέρισμα (€)</Label>
                      <Input
                        id="management-fee"
                        type="number"
                        value={newManagementFee}
                        onChange={(e) => setNewManagementFee(e.target.value)}
                        placeholder="0.00"
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveManagementFee} className="flex-1">
                        <Check className="h-4 w-4 mr-1" />
                        Αποθήκευση
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingManagementFee(false);
                          setNewManagementFee((financialSummary?.management_fee_per_apartment || 0).toString());
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Column 1: Management Fee per Apartment */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="text-xs text-purple-700 font-medium">Αμοιβή ανά διαμέρισμα/μήνα:</div>
                        <div className="text-sm font-bold text-purple-700">
                          {formatCurrency(financialSummary?.management_fee_per_apartment || 0)}/μήνα
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Total Management Cost */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="text-xs text-purple-700 font-medium">Συνολικό κόστος διαχείρισης/μήνα:</div>
                        <div className="text-sm font-bold text-purple-700">
                          {formatCurrency((financialSummary?.management_fee_per_apartment || 0) * (financialSummary?.apartments_count || 0))}/μήνα
                        </div>
                        <div className="text-xs text-purple-600">
                          {financialSummary?.apartments_count || 0} διαμερίσματα × {formatCurrency(financialSummary?.management_fee_per_apartment || 0)}/μήνα
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Loading overlay for service package application */}
                {applyingServicePackage && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                    <div className="flex items-center gap-2 text-purple-600">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span className="text-sm font-medium">Ενημέρωση δαπανών διαχείρισης...</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Pending Payments Section */}
        {(financialSummary?.pending_payments || 0) > 0 && (
          <div className="space-y-4">
            <Card className="border-yellow-200 bg-yellow-50/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <h3 className="text-sm font-semibold text-yellow-900">
                      Εκκρεμείς Πληρωμές
                    </h3>
                    <p className="text-xs text-yellow-800 mt-1">
                      Υπάρχουν <span className="font-bold">{financialSummary?.pending_payments || 0}</span> πληρωμές που δεν έχουν επιβεβαιωθεί.
                    </p>
                    <p className="text-xs text-yellow-700 mt-2">
                      Ελέγξτε τα οικονομικά στοιχεία για λεπτομέρειες.
                    </p>
          </div>
        </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>

      {/* Service Package Modal */}
      <ServicePackageModal
        isOpen={showServicePackageModal}
        onClose={() => setShowServicePackageModal(false)}
        buildingId={buildingId}
        apartmentsCount={financialSummary?.apartments_count || 0}
        currentFee={financialSummary?.management_fee_per_apartment || 0}
        onPackageApplied={async (result) => {
          try {
            setApplyingServicePackage(true);
            
            // Immediately update the financial summary with new management fee
            setFinancialSummary(prev => prev ? {
              ...prev,
              management_fee_per_apartment: result.new_fee || result.fee_per_apartment,
              total_management_cost: (result.new_fee || result.fee_per_apartment) * (prev.apartments_count || 0)
            } : null);
            
            // Αφαιρέθηκε το notification
            // Show success with detailed info
            // toast.success(
            //   `✅ Πακέτο εφαρμόστηκε!\n💰 Νέα αμοιβή: ${result.new_fee || result.fee_per_apartment}€/διαμέρισμα\n🏢 Συνολικό κόστος: ${((result.new_fee || result.fee_per_apartment) * (financialSummary?.apartments_count || 0)).toFixed(2)}€`,
            //   { duration: 4000 }
            // );
            
            // Refresh financial data after immediate update for consistency
            await fetchFinancialSummary(true);
          } catch (error) {
            console.error('Error updating dashboard after package application:', error);
            // Αφαιρέθηκε το error notification
            // toast.error('Το πακέτο εφαρμόστηκε, αλλά προκλήθηκε σφάλμα στην ενημέρωση του dashboard');
            // Fallback: force refresh anyway
            fetchFinancialSummary(true);
          } finally {
            setApplyingServicePackage(false);
          }
        }}
      />

      {/* Amount Details Modal */}
      <AmountDetailsModal
        isOpen={showAmountDetailsModal}
        onClose={() => setShowAmountDetailsModal(false)}
        buildingId={buildingId}
        amountType={selectedAmountType}
        amount={selectedAmount}
        title={selectedAmountTitle}
        selectedMonth={selectedMonth}
      />

      {/* Previous Obligations Modal */}
      <PreviousObligationsModal
        isOpen={showPreviousObligationsModal}
        onClose={() => setShowPreviousObligationsModal(false)}
        buildingId={buildingId}
        selectedMonth={selectedMonth}
      />

      {/* Reserve Fund Info Modal */}
      {showReserveFundInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-green-800 flex items-center gap-2">
                <Info className="h-5 w-5" />
                Εισφορά Αποθεματικού
              </h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowReserveFundInfoModal(false)}
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="text-sm text-gray-700 leading-relaxed">
                {financialSummary?.reserve_fund_contribution === 0 ? (
                  <>
                    <p className="mb-3">
                      <strong>Δεν συλλέγεται εισφορά αποθεματικού</strong> επειδή υπάρχουν εκκρεμείς υποχρεώσεις.
                    </p>
                    <p className="mb-3">
                      Η εισφορά αποθεματικού θα αρχίσει να συλλέγεται μόλις μηδενιστούν οι τρέχουσες υποχρεώσεις των διαμερισμάτων.
                    </p>
                    <p>
                      Αυτό εξασφαλίζει ότι <strong>πρώτα καλύπτονται τα άμεσα έξοδα</strong> και μετά συσσωρεύεται το αποθεματικό ταμείο για μελλοντικές ανάγκες.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mb-3">
                      <strong>Η εισφορά αποθεματικού συλλέγεται κανονικά</strong> καθώς δεν υπάρχουν εκκρεμείς υποχρεώσεις.
                    </p>
                    <p>
                      Το αποθεματικό ταμείο συσσωρεύεται για την κάλυψη μελλοντικών έκτακτων εξόδων και συντήρησης του κτιρίου.
                    </p>
                  </>
                )}
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-green-800 mb-2">Πληροφορίες:</h4>
                <ul className="text-xs text-green-700 space-y-1">
                  <li>• Μηνιαία εισφορά: {formatCurrency(financialSummary?.reserve_fund_monthly_target || 0)}</li>
                  <li>• Τρέχον αποθεματικό: {formatCurrency(financialSummary?.current_reserve || 0)}</li>
                  <li>• Στόχος αποθεματικού: {formatCurrency(financialSummary?.reserve_fund_goal || 0)}</li>
                </ul>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <Button 
                onClick={() => setShowReserveFundInfoModal(false)}
                className="bg-green-600 hover:bg-green-700"
              >
                Κατάλαβα
              </Button>
            </div>
          </div>
        </div>
      )}


    </Card>
  );
});

BuildingOverviewSection.displayName = 'BuildingOverviewSection';
