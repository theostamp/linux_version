'use client';

import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  RefreshCw
} from 'lucide-react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

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
  reserve_fund_debt: number; // Χρέος από εισφορά αποθεματικού
  reserve_fund_goal: number;
  current_reserve: number;
  apartments_count: number;
  pending_payments: number;
  last_calculation_date?: string;
  average_monthly_expenses: number;
  // Reserve Fund Period Tracking
  reserve_fund_start_date?: string;
  reserve_fund_target_date?: string;
  reserve_fund_monthly_target?: number;
  reserve_fund_duration_months?: number;
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
  const [editingTimeline, setEditingTimeline] = useState(false);
  const [newStartMonth, setNewStartMonth] = useState('');
  const [newDurationMonths, setNewDurationMonths] = useState('');

  const currentBuilding = buildings.find(b => b.id === buildingId);

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

  const getDurationOptions = () => {
    const durations = [];
    for (let i = 3; i <= 24; i++) {
      durations.push({ value: i.toString(), label: `${i} μήνες` });
    }
    return durations;
  };

  const calculateNewDates = (startMonth: string, durationMonths: number) => {
    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, parseInt(startMonth) - 1, 1);
    const endDate = new Date(currentYear, parseInt(startMonth) - 1 + durationMonths, 0); // Last day of end month
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  // Helper functions for localStorage persistence
  const getStorageKey = (key: string) => `reserve_fund_${buildingId}_${key}`;
  
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
        setNewStartMonth(month);
      }
      if (financialSummary.reserve_fund_duration_months) {
        setNewDurationMonths(financialSummary.reserve_fund_duration_months.toString());
      }
    }
  }, [financialSummary, editingTimeline]);

  // Notify parent component when reserve fund monthly target changes
  // Calculate correct monthly target from goal and duration
  useEffect(() => {
    if (financialSummary && onReserveFundAmountChange) {
      const goal = financialSummary.reserve_fund_goal || 0;
      const duration = financialSummary.reserve_fund_duration_months || 1;
      
      let correctMonthlyTarget = 0;
      if (goal > 0 && duration > 0) {
        correctMonthlyTarget = goal / duration;
      }
      
      onReserveFundAmountChange(correctMonthlyTarget);
    }
  }, [financialSummary?.reserve_fund_goal, financialSummary?.reserve_fund_duration_months, onReserveFundAmountChange]);

  // Fetch financial summary data
  const fetchFinancialSummary = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
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
      console.log('🌐 BuildingOverviewSection: Calling API:', apiUrl);
      console.log('🌐 BuildingOverviewSection: selectedMonth parameter:', selectedMonth);
      
      const response = await api.get(apiUrl);
      const apiData = response.data;
      console.log('📊 BuildingOverviewSection: API response data:', apiData);
      console.log('📊 BuildingOverviewSection: API response status:', response.status);
      console.log('📊 BuildingOverviewSection: API total_expenses_month:', apiData.total_expenses_month);
      console.log('📊 BuildingOverviewSection: API average_monthly_expenses:', apiData.average_monthly_expenses);
      
      // Load saved data from localStorage for reserve fund settings
      const savedGoal = loadFromLocalStorage('goal', 3000); // Updated default to match actual goal
      const savedStartDate = loadFromLocalStorage('start_date', '2025-07-31');
      const savedTargetDate = loadFromLocalStorage('target_date', '2026-01-30');
      const savedDurationMonths = loadFromLocalStorage('duration_months', 6);
      const savedMonthlyTarget = loadFromLocalStorage('monthly_target', savedGoal / savedDurationMonths);
      
      console.log('BuildingOverviewSection: localStorage data:', {
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
        reserve_fund_debt: -calculatedReserveFundDebt, // Χρέος από εισφορά αποθεματικού - DYNAMIC
        reserve_fund_goal: savedGoal,
        current_reserve: apiData.current_reserve || 0,
        apartments_count: apiData.apartments_count || currentBuilding?.apartments_count || 0,
        pending_payments: apiData.pending_payments || 0,
        last_calculation_date: apiData.last_calculation_date || new Date().toISOString().split('T')[0],
        average_monthly_expenses: apiData.average_monthly_expenses || 0, // ALWAYS use API data for month-specific values
        // Reserve Fund Period Tracking - Use saved values
        reserve_fund_start_date: savedStartDate,
        reserve_fund_target_date: savedTargetDate,
        reserve_fund_monthly_target: apiData.reserve_fund_contribution !== undefined ? apiData.reserve_fund_contribution : savedMonthlyTarget, // Use API value with priority logic
        reserve_fund_duration_months: savedDurationMonths
      };
      
      console.log('🔄 BuildingOverviewSection: Transformed financial data:', financialData);
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
      
      if (isRefresh) {
        toast.success('Οικονομικά στοιχεία ανανεώθηκαν');
      }
    } catch (error) {
      console.error('Error fetching financial summary:', error);
      toast.error('Αποτυχία φόρτωσης οικονομικών στοιχείων');
      
      // Fallback to empty data for new buildings
      const emptyData: FinancialSummary = {
        total_balance: 0,
        current_obligations: 0,
        reserve_fund_debt: 0,
        reserve_fund_goal: 15000,
        current_reserve: 0,
        apartments_count: currentBuilding?.apartments_count || 0,
        pending_payments: 0,
        last_calculation_date: new Date().toISOString().split('T')[0],
        average_monthly_expenses: 0,
        reserve_fund_start_date: '2024-01-01',
        reserve_fund_target_date: '2024-12-31',
        reserve_fund_monthly_target: 1250,
        reserve_fund_duration_months: 12
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
    console.log('🔄 BuildingOverviewSection: useEffect triggered with dependencies:', dependencies);
    console.log('🔄 BuildingOverviewSection: selectedMonth changed to:', selectedMonth);
    console.log('🔄 BuildingOverviewSection: Current financial summary before update:', financialSummary?.last_calculation_date);
    
    // Single unified effect that handles all dependency changes
    fetchFinancialSummary(true); // Always force refresh for consistency
  }, dependencies);

  // Expose refresh function via ref
  useImperativeHandle(ref, () => ({
    refresh: () => fetchFinancialSummary(true)
  }));

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
      
      toast.success('Δεδομένα αποθεματικού ενημερώθηκαν');
    } catch (error) {
      console.error('Error refreshing reserve fund data:', error);
      toast.error('Αποτυχία ενημέρωσης δεδομένων αποθεματικού');
    } finally {
      setRefreshingReserve(false);
    }
  };

  const handleSaveGoal = async () => {
    try {
      const goalValue = parseFloat(newGoal);
      if (isNaN(goalValue) || goalValue < 0) {
        toast.error('Παρακαλώ εισάγετε έγκυρο ποσό');
        return;
      }

      // Save to localStorage for persistence
      saveToLocalStorage('goal', goalValue);
      
      // Recalculate monthly target if duration exists
      const currentDuration = financialSummary?.reserve_fund_duration_months || 12;
      const newMonthlyTarget = goalValue / currentDuration;
      saveToLocalStorage('monthly_target', newMonthlyTarget);
      
      // Recalculate reserve fund debt with new goal
      const today = new Date();
      const startDate = new Date(financialSummary?.reserve_fund_start_date || '2024-01-01');
      const monthsPassed = Math.max(0, 
        (today.getFullYear() - startDate.getFullYear()) * 12 + 
        (today.getMonth() - startDate.getMonth())
      );
      const expectedSoFar = monthsPassed * newMonthlyTarget;
      const currentReserve = financialSummary?.current_reserve || 0;
      const newReserveFundDebt = Math.max(0, expectedSoFar - currentReserve);

      // TODO: Implement API call to save new goal
      // await api.patch(`/buildings/${buildingId}/`, { reserve_fund_goal: goalValue });
      
      setFinancialSummary(prev => prev ? { 
        ...prev, 
        reserve_fund_goal: goalValue,
        reserve_fund_monthly_target: newMonthlyTarget,
        reserve_fund_debt: -newReserveFundDebt,
        total_balance: (prev.current_reserve || 0) // Current reserve already reflects the true balance
      } : null);
      setEditingGoal(false);
      toast.success('Ο στόχος αποθεματικού ενημερώθηκε και αποθηκεύτηκε επιτυχώς');
    } catch (error) {
      console.error('Error updating reserve fund goal:', error);
      toast.error('Αποτυχία ενημέρωσης στόχου');
    }
  };

  const handleSaveTimeline = async () => {
    try {
      if (!newStartMonth || !newDurationMonths) {
        toast.error('Παρακαλώ συμπληρώστε όλα τα πεδία');
        return;
      }

      const durationValue = parseInt(newDurationMonths);
      if (isNaN(durationValue) || durationValue < 3 || durationValue > 24) {
        toast.error('Η διάρκεια πρέπει να είναι μεταξύ 3 και 24 μηνών');
        return;
      }

      const { startDate, endDate } = calculateNewDates(newStartMonth, durationValue);
      
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

      // TODO: Implement API call to save timeline
      // await api.patch(`/buildings/${buildingId}/reserve-fund-timeline/`, { ... });
      
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
      toast.success('Το πρόγραμμα συλλογής ενημερώθηκε και αποθηκεύτηκε επιτυχώς');
    } catch (error) {
      console.error('Error updating timeline:', error);
      toast.error('Αποτυχία ενημέρωσης προγράμματος');
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

  // Dynamic financial health colors based on balance
  const getFinancialHealthColors = (balance: number) => {
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
      if (absBalance >= 5000) {
        // High debt - Red
        return {
          amount: 'text-red-700',
          title: 'text-red-900',
          icon: 'text-red-600',
          cardBg: 'border-red-200 bg-red-50/50'
        };
      } else if (absBalance >= 2000) {
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
    if (!selectedMonth || !financialSummary?.reserve_fund_start_date || !financialSummary?.reserve_fund_target_date) {
      return true; // Show reserve fund by default when no month is selected
    }

    try {
      const selectedDate = new Date(selectedMonth + '-01');
      const startDate = new Date(financialSummary.reserve_fund_start_date);
      const targetDate = new Date(financialSummary.reserve_fund_target_date);
      
      // Check if selected month is within the collection period
      const isWithinPeriod = selectedDate >= startDate && selectedDate <= targetDate;
      
      console.log('🔄 Reserve Fund Period Check:', {
        selectedMonth,
        selectedDate: selectedDate.toLocaleDateString('el-GR'),
        startDate: startDate.toLocaleDateString('el-GR'),
        targetDate: targetDate.toLocaleDateString('el-GR'),
        isWithinPeriod
      });
      
      return isWithinPeriod;
    } catch (error) {
      console.error('Error checking reserve fund period:', error);
      return true; // Safe fallback - show reserve fund
    }
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

  // Debug render data
  console.log('🎨 BuildingOverviewSection: RENDER - financialSummary:', financialSummary);
  console.log('🎨 BuildingOverviewSection: RENDER - current_obligations:', financialSummary?.current_obligations);
  console.log('🎨 BuildingOverviewSection: RENDER - selectedMonth:', selectedMonth);
  console.log('🎨 BuildingOverviewSection: RENDER - average_monthly_expenses:', financialSummary?.average_monthly_expenses);

  if (!financialSummary) {
    return null;
  }

  const isPositiveBalance = (financialSummary?.total_balance || 0) >= 0;
  const reserveProgress = ((financialSummary?.current_reserve || 0) / (financialSummary?.reserve_fund_goal || 1)) * 100;
  const reserveAnalytics = getReserveFundAnalytics();

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg">
          <Building2 className="h-6 w-6 text-blue-600" />
          <span>
            Βρίσκεστε στο κτίριο <span className="font-bold text-blue-700">{currentBuilding?.name || 'Άγνωστο Κτίριο'}</span>
          </span>
        </CardTitle>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {currentBuilding?.address}
          </p>
          {selectedMonth && (
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-blue-600 font-medium">
                Δεδομένα για: {new Date(selectedMonth + '-01').toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main Financial Overview Cards */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 ${isMonthWithinReserveFundPeriod() ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
          
          {/* Current Obligations Card */}
          <Card className={`border-2 ${financialSummary.current_obligations > 0 ? 'border-red-200 bg-red-50/30' : 'border-green-200 bg-green-50/30'}`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className={`h-5 w-5 ${financialSummary.current_obligations > 0 ? 'text-red-600' : 'text-green-600'}`} />
                <h3 className={`font-semibold text-sm ${financialSummary.current_obligations > 0 ? 'text-red-900' : 'text-green-900'}`}>
                  Συνολικές Υποχρεώσεις
                </h3>
              </div>
              
              <div className="space-y-2">
                <div className={`text-2xl font-bold ${financialSummary.current_obligations > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {formatCurrency(financialSummary.current_obligations || 0)}
                </div>
                
                <Badge 
                  variant={financialSummary.current_obligations > 0 ? "destructive" : "default"}
                  className="text-xs"
                >
                  {financialSummary.current_obligations > 0 ? 'Εκκρεμείς Δαπάνες' : 'Καμία Εκκρεμότητα'}
                </Badge>
                
                <div className="text-xs text-gray-600 mt-2">
                  <strong>Σημείωση:</strong> Συνολικές υποχρεώσεις κτιρίου (όλοι οι μήνες)
                </div>
                
                {financialSummary.current_obligations > 0 && (
                  <div className="text-xs text-red-700 mt-2">
                    <strong>Προτεραιότητα:</strong> Κάλυψη δαπανών πριν το αποθεματικό
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Month-Specific Data Card */}
          <Card className="border-2 border-blue-200 bg-blue-50/30">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <Receipt className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-sm text-blue-900">
                  Δεδομένα Μήνα
                </h3>
              </div>
              
              <div className="space-y-2">
                <div className="text-lg font-bold text-blue-700">
                  {formatCurrency(financialSummary.average_monthly_expenses || 0)}
                </div>
                
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                  Έξοδα Μήνα
                </Badge>
                
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
          <Card className={`border-2 ${getFinancialHealthColors(financialSummary?.total_balance || 0).cardBg}`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                {isPositiveBalance ? (
                  <TrendingUp className={`h-5 w-5 ${getFinancialHealthColors(financialSummary?.total_balance || 0).icon}`} />
                ) : (
                  <TrendingDown className={`h-5 w-5 ${getFinancialHealthColors(financialSummary?.total_balance || 0).icon}`} />
                )}
                <h3 className={`font-semibold text-sm ${getFinancialHealthColors(financialSummary?.total_balance || 0).title}`}>
                  {selectedMonth ? `Υπόλοιπο (${selectedMonth})` : 'Τρέχον Υπόλοιπο'}
                </h3>
              </div>
              
              <div className="space-y-3">
                {/* Συνολικό υπόλοιπο */}
                <div className="space-y-1">
                  <div className={`text-xl font-bold ${getFinancialHealthColors(financialSummary?.total_balance || 0).amount}`}>
                    {formatCurrency(Math.abs(financialSummary?.total_balance || 0))}
                  </div>
                  
                  <Badge 
                    variant={isPositiveBalance ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {isPositiveBalance ? 'Πιστωτικό' : 'Χρεωστικό'} Υπόλοιπο
                  </Badge>
                  
                  <div className="text-xs text-gray-600 mt-2">
                    <strong>Τύπος:</strong> {selectedMonth ? 'Snapshot view μέχρι τέλος μήνα' : 'Τρέχουσα κατάσταση'}
                  </div>
                </div>

                {/* Διαχωρισμός χρεών - μόνο αν υπάρχει χρέος */}
                {!isPositiveBalance && (
                  <div className="pt-2 border-t border-gray-200 space-y-2">
                    <div className="text-xs font-medium text-gray-700 mb-2">Ανάλυση Χρέους:</div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-red-700">Τρέχουσες υποχρεώσεις:</span>
                      <span className="font-semibold text-xs text-red-800">
                        {formatCurrency(Math.abs(financialSummary.current_obligations || 0))}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-orange-700">Εισφορά αποθεματικού:</span>
                      <span className="font-semibold text-xs text-orange-800">
                        {formatCurrency(financialSummary.reserve_fund_monthly_target || 0)}
                      </span>
                    </div>
                    
                    <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                      <div className="text-xs text-yellow-800">
                        <strong>Προτεραιότητα:</strong> Τρέχουσες υποχρεώσεις
                      </div>
                      <div className="text-xs text-yellow-700 mt-1">
                        Το κτίριο χρωστάει χρήματα
                      </div>
                    </div>
                  </div>
                )}
                
                {isPositiveBalance && (
                  <div className="text-xs text-green-700 bg-green-50 p-2 rounded">
                    <strong>Εξαιρετικά!</strong> Το κτίριο έχει πιστωτικό υπόλοιπο
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Reserve Fund Goal Card - Only show if month is within collection period */}
          {isMonthWithinReserveFundPeriod() && (
            <Card className={`${getReserveFundCardColors(reserveProgress)} relative ${refreshingReserve ? 'opacity-75' : ''} lg:col-span-1`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className={`h-5 w-5 ${getProgressColors(reserveProgress).text}`} />
                  <h3 className={`font-semibold text-sm ${getProgressColors(reserveProgress).text}`}>Στόχος Αποθεματικού</h3>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshReserve}
                    disabled={refreshingReserve}
                    className="h-9 w-9 sm:h-8 sm:w-8 p-0 text-orange-600 hover:text-orange-700"
                    title="Ανανέωση δεδομένων αποθεματικού"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshingReserve ? 'animate-spin' : ''}`} />
                  </Button>
                  {!editingGoal && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingGoal(true)}
                      className="h-9 w-9 sm:h-8 sm:w-8 p-0 text-orange-600 hover:text-orange-700"
                      title="Επεξεργασία στόχου"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {editingGoal ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="new-goal" className="text-xs">Νέος στόχος (€)</Label>
                    <Input
                      id="new-goal"
                      type="number"
                      value={newGoal}
                      onChange={(e) => setNewGoal(e.target.value)}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveGoal}
                      className="flex-1"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Αποθήκευση
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingGoal(false);
                        setNewGoal((financialSummary?.reserve_fund_goal || 0).toString());
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Goal and Current Amount */}
                  <div className="space-y-1">
                    <div className={`text-xl font-bold ${getProgressColors(reserveProgress).text}`}>
                      {formatCurrency(financialSummary?.reserve_fund_goal || 0)}
                    </div>
                    <div className={`text-xs ${getProgressColors(reserveProgress).text} opacity-80`}>
                      Τρέχον: {formatCurrency(financialSummary?.current_reserve || 0)}
                    </div>
                    <div className={`text-xs font-semibold mt-1 ${getProgressColors(reserveProgress).text}`}>
                      {reserveProgress.toFixed(1)}% του στόχου
                    </div>
                  </div>

                  {/* Timeline Information */}
                  {reserveAnalytics && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-orange-700 font-medium">
                          Περίοδος Συλλογής:
                        </div>
                        {!editingTimeline && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingTimeline(true)}
                            className="h-6 w-6 p-0 text-orange-600 hover:text-orange-700"
                            title="Επεξεργασία προγράμματος"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      
                      {editingTimeline ? (
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="start-month" className="text-xs text-orange-700">
                              Πρώτος μήνας συγκέντρωσης αποθεματικού:
                            </Label>
                            <Select value={newStartMonth} onValueChange={setNewStartMonth}>
                              <SelectTrigger className="mt-1 h-8 text-xs">
                                <SelectValue placeholder="Επιλέξτε μήνα" />
                              </SelectTrigger>
                              <SelectContent>
                                {getMonthOptions().map((month) => (
                                  <SelectItem key={month.value} value={month.value} className="text-xs">
                                    {month.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="duration" className="text-xs text-orange-700">
                              Σε πόσους μήνες θα συγκεντρωθεί;
                            </Label>
                            <Select value={newDurationMonths} onValueChange={setNewDurationMonths}>
                              <SelectTrigger className="mt-1 h-8 text-xs">
                                <SelectValue placeholder="Επιλέξτε διάρκεια" />
                              </SelectTrigger>
                              <SelectContent>
                                {getDurationOptions().map((duration) => (
                                  <SelectItem key={duration.value} value={duration.value} className="text-xs">
                                    {duration.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleSaveTimeline}
                              className="flex-1 h-7 text-xs"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Αποθήκευση
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingTimeline(false);
                                // Reset to original values
                                if (financialSummary?.reserve_fund_start_date) {
                                  const startDate = new Date(financialSummary.reserve_fund_start_date);
                                  const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
                                  setNewStartMonth(month);
                                }
                                if (financialSummary?.reserve_fund_duration_months) {
                                  setNewDurationMonths(financialSummary.reserve_fund_duration_months.toString());
                                }
                              }}
                              className="h-7 text-xs"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs text-orange-600">
                          <span>{reserveAnalytics.startDate.toLocaleDateString('el-GR')}</span>
                          <span className="text-orange-500">→</span>
                          <span>{reserveAnalytics.targetDate.toLocaleDateString('el-GR')}</span>
                        </div>
                      )}
                      
                      {/* Dual Progress Bars */}
                      <div className="space-y-2">
                        {/* Amount Progress */}
                        <div>
                          <div className={`flex justify-between text-xs mb-1 ${getProgressColors(reserveAnalytics.amountProgress).text}`}>
                            <span>Ποσό:</span>
                            <span>{reserveAnalytics.amountProgress.toFixed(1)}%</span>
                          </div>
                          <div className={`w-full rounded-full h-2 ${getProgressColors(reserveAnalytics.amountProgress).bg}`}>
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${getProgressColors(reserveAnalytics.amountProgress).fill}`}
                              style={{ width: `${Math.min(100, Math.max(0, reserveAnalytics.amountProgress))}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        {/* Time Progress */}
                        <div>
                          <div className={`flex justify-between text-xs mb-1 ${getProgressColors(reserveAnalytics.timeProgress).text}`}>
                            <span>Χρόνος:</span>
                            <span>{reserveAnalytics.timeProgress.toFixed(1)}%</span>
                          </div>
                          <div className={`w-full rounded-full h-2 ${getProgressColors(reserveAnalytics.timeProgress).bg}`}>
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${getProgressColors(reserveAnalytics.timeProgress).fill}`}
                              style={{ width: `${Math.min(100, Math.max(0, reserveAnalytics.timeProgress))}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Status Indicator */}
                      <div className={`text-xs px-2 py-1 rounded-full text-center ${
                        reserveAnalytics.isOnTrack 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {reserveAnalytics.isOnTrack 
                          ? `✓ Εντός προγράμματος (+${formatCurrency(Math.abs(reserveAnalytics.variance))})` 
                          : `⚠ Καθυστέρηση (${formatCurrency(Math.abs(reserveAnalytics.variance))})`
                        }
                      </div>

                      {/* Monthly Rate & Projection */}
                      <div className="space-y-1 pt-1 border-t border-orange-200">
                        <div className="flex justify-between text-xs text-orange-600">
                          <span>Μηνιαίος ρυθμός:</span>
                          <span className="font-medium">{formatCurrency(reserveAnalytics.monthlyRate)}</span>
                        </div>
                        {reserveAnalytics.projectedCompletionDate && reserveAnalytics.amountProgress < 100 && (
                          <div className="flex justify-between text-xs text-orange-600">
                            <span>Εκτίμηση ολοκλήρωσης:</span>
                            <span className="font-medium">
                              {reserveAnalytics.projectedCompletionDate.toLocaleDateString('el-GR', { 
                                month: 'short', 
                                year: 'numeric' 
                              })}
                            </span>
                          </div>
                        )}
                        {reserveAnalytics.remainingMonths > 0 && (
                          <div className="flex justify-between text-xs text-orange-600">
                            <span>Χρόνος που απομένει:</span>
                            <span className="font-medium">
                              {reserveAnalytics.remainingMonths} μήνες
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Context Information */}
                      {selectedMonth && (
                        <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                          <div className="text-xs text-blue-700">
                            <strong>📊 Υπολογισμός βάσει επιλεγμένου μήνα:</strong> Τα στοιχεία αντιστοιχούν στην κατάσταση στο τέλος του {new Date(selectedMonth + '-01').toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {refreshingReserve && (
                    <div className="mt-2 text-xs text-orange-500 italic">
                      Ενημέρωση δεδομένων...
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Info message when reserve fund is not within selected period */}
          {!isMonthWithinReserveFundPeriod() && selectedMonth && (
            <Card className="border-blue-200 bg-blue-50/30 lg:col-span-1">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-sm text-blue-900">Στόχος Αποθεματικού</h3>
                </div>
                <div className="text-sm text-blue-700">
                  <p className="mb-2">
                    <strong>Περίοδος συλλογής:</strong><br />
                    {financialSummary?.reserve_fund_start_date && financialSummary?.reserve_fund_target_date && (
                      <>
                        {new Date(financialSummary.reserve_fund_start_date).toLocaleDateString('el-GR')} → {new Date(financialSummary.reserve_fund_target_date).toLocaleDateString('el-GR')}
                      </>
                    )}
                  </p>
                  <p className="text-blue-600 text-xs bg-blue-100 p-2 rounded">
                    📅 Ο επιλεγμένος μήνας <strong>{new Date(selectedMonth + '-01').toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}</strong> είναι εκτός της περιόδου συλλογής αποθεματικού.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

        </div>

        {/* Additional Info Banner */}
        {(financialSummary?.pending_payments || 0) > 0 && (
          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-xs font-medium text-yellow-900">
                    Υπάρχουν {financialSummary?.pending_payments || 0} εκκρεμείς πληρωμές
                  </p>
                  <p className="text-xs text-yellow-700">
                    Παρακαλώ ελέγξτε τα οικονομικά στοιχεία για περισσότερες λεπτομέρειες
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
});

BuildingOverviewSection.displayName = 'BuildingOverviewSection';
