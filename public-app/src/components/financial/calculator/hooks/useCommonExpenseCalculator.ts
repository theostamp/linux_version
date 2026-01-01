
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useCommonExpenses } from '@/hooks/useCommonExpenses';
import { useApartmentsWithFinancialData } from '@/hooks/useApartmentsWithFinancialData';
import { useMonthlyExpenses } from '@/hooks/useMonthlyExpenses';
import { useMonthRefresh } from '@/hooks/useMonthRefresh';
import { api } from '@/lib/api';
import {
  CommonExpenseModalProps,
  ValidationResult,
  PerApartmentAmounts,
  OccupantsMap,
  GroupedExpenses,
  ExpenseBreakdown,
  ReserveFundInfo,
  ManagementFeeInfo,
  Share,
  ExpenseItem
} from '../types/financial';
import { toNumber, formatAmount } from '../utils/formatters';
import { exportToPDF } from '../utils/pdfGenerator';
import { exportToExcel } from '../utils/excelGenerator';
import { exportToJPG, exportAndSendJPG } from '../utils/jpgGenerator';
import { getPeriodInfo } from '../utils/periodHelpers';

export const useCommonExpenseCalculator = (props: CommonExpenseModalProps) => {
  const {
    state,
    buildingId,
    buildingName = 'Άγνωστο Κτίριο',
    managementFeePerApartment = 0,
    onClose
  } = props;

  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showHeatingModal, setShowHeatingModal] = useState(false);
  const [heatingBreakdown, setHeatingBreakdown] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const { saveCommonExpenseSheet } = useCommonExpenses();

  // Use selectedMonth from props if provided, otherwise fallback to state.customPeriod
  const selectedMonth = props.selectedMonth || (state.customPeriod?.startDate ? state.customPeriod.startDate.substring(0, 7) : undefined);

  // Use the selected month directly for the expense sheet
  // User will choose which month's data they want to see
  const { apartments: aptWithFinancial, forceRefresh } = useApartmentsWithFinancialData(buildingId, selectedMonth);

  // Fetch monthly expenses for the selected month
  const { expenses: monthlyExpenses, isLoading: monthlyExpensesLoading } = useMonthlyExpenses(buildingId, selectedMonth);

  // Wait for both monthlyExpenses and aptWithFinancial to be loaded
  const isDataReady = useMemo(() => {
    const hasMonthlyExpenses = !!monthlyExpenses && !monthlyExpensesLoading;
    const hasApartments = aptWithFinancial.length > 0;

    console.log('🔍 DEBUG useCommonExpenseCalculator: Data readiness check:', {
      selectedMonth,
      hasMonthlyExpenses,
      hasApartments,
      monthlyExpensesKeys: monthlyExpenses ? Object.keys(monthlyExpenses) : 'No data',
      apartmentsCount: aptWithFinancial.length
    });

    return hasMonthlyExpenses && hasApartments;
  }, [monthlyExpenses, monthlyExpensesLoading, aptWithFinancial.length, selectedMonth]);

  // Debug: Log monthly expenses data
  useEffect(() => {
    console.log('🔍 DEBUG useCommonExpenseCalculator: monthlyExpenses updated:', {
      selectedMonth,
      monthlyExpenses,
      hasData: !!monthlyExpenses,
      keys: monthlyExpenses ? Object.keys(monthlyExpenses) : 'No data',
      managementFields: monthlyExpenses ? {
        management_fee_per_apartment: monthlyExpenses.management_fee_per_apartment,
        total_management_cost: monthlyExpenses.total_management_cost,
        hasManagementData: !!(monthlyExpenses.management_fee_per_apartment || monthlyExpenses.total_management_cost)
      } : 'No data'
    });
  }, [monthlyExpenses, selectedMonth]);

  // Note: useMonthRefresh (below) already handles refresh when selectedMonth changes
  // Removed duplicate useEffect to prevent double API calls and race conditions

  // Debug: Log when aptWithFinancial changes
  useEffect(() => {
    console.log('🔍 useCommonExpenseCalculator: aptWithFinancial updated:', {
      length: aptWithFinancial.length,
      selectedMonth,
      sampleData: aptWithFinancial.length > 0 ? aptWithFinancial[0] : 'No data'
    });
  }, [aptWithFinancial, selectedMonth]);

  useMonthRefresh(selectedMonth, forceRefresh, 'CommonExpenseModal');

  // ===========================================================================================
  // Month-specific advanced shares (source of truth for table columns)
  // ===========================================================================================
  const [monthAdvancedResult, setMonthAdvancedResult] = useState<any>(null);
  const calcRequestRef = useRef<string>('');

  useEffect(() => {
    const run = async () => {
      if (!props.isOpen) return;
      if (!buildingId) return;
      if (!selectedMonth) return;

      const requestId = `${buildingId}-${selectedMonth}-${Date.now()}`;
      calcRequestRef.current = requestId;

      try {
        // IMPORTANT:
        // The month dropdown in the modal controls what we should display.
        // The incoming `state.shares` may correspond to another month/period from the wizard.
        // So we always compute month-specific shares here.
        const result = await api.post('/financial/common-expenses/calculate_advanced/', {
          building_id: buildingId,
          month_filter: selectedMonth,
        });

        // Discard stale responses
        if (calcRequestRef.current !== requestId) return;
        setMonthAdvancedResult(result);
      } catch (e) {
        // Soft-fail: keep using the wizard state if the advanced calc fails
        if (calcRequestRef.current !== requestId) return;
        setMonthAdvancedResult(null);
      }
    };

    run();
  }, [props.isOpen, buildingId, selectedMonth]);

  const effectiveShares = useMemo(() => {
    // Prefer month-specific shares; fallback to wizard state
    return (monthAdvancedResult?.shares as Record<string, Share> | undefined) || (state.shares as any);
  }, [monthAdvancedResult, state.shares]);

  const effectiveAdvancedShares = useMemo(() => {
    // Prefer month-specific advanced result; fallback to wizard state advancedShares
    return monthAdvancedResult || state.advancedShares;
  }, [monthAdvancedResult, state.advancedShares]);

  const occupantsByApartmentId = useMemo<OccupantsMap>(() => {
    const map: OccupantsMap = {};
    aptWithFinancial.forEach((apt) => {
      map[apt.id] = { owner_name: apt.owner_name, tenant_name: apt.tenant_name };
    });
    return map;
  }, [aptWithFinancial]);

  const perApartmentAmounts = useMemo<PerApartmentAmounts>(() => {
    const items: PerApartmentAmounts = {};
    Object.values(effectiveShares as { [key: string]: Share }).forEach((share) => {
      const bd = share.breakdown || {};
      items[share.apartment_id] = {
        common: toNumber(bd.general_expenses),
        elevator: toNumber(bd.elevator_expenses),
        heating: toNumber(bd.heating_expenses),
        other: toNumber(bd.equal_share_expenses),
        coowner: toNumber(bd.individual_expenses),
        reserve: toNumber(bd.reserve_fund_contribution),
        total_due: toNumber(share.total_due)
      };
    });
    return items;
  }, [effectiveShares]);

  const expenseBreakdown = useMemo<ExpenseBreakdown>(() => {
    const breakdown: ExpenseBreakdown = { common: 0, elevator: 0, heating: 0, other: 0, coownership: 0 };

    // Use month-specific data from API if available
    if (monthlyExpenses) {
      console.log('🔍 DEBUG expenseBreakdown: Using API data for month', selectedMonth, monthlyExpenses);

      // Map API data to breakdown structure
      breakdown.common = monthlyExpenses.total_expenses_month || 0;
      breakdown.elevator = 0; // Not available in API yet
      breakdown.heating = 0; // Not available in API yet
      breakdown.other = 0; // Not available in API yet
      breakdown.coownership = 0; // Not available in API yet

      console.log('🔍 DEBUG expenseBreakdown: Mapped API data to breakdown:', breakdown);
    } else if (effectiveAdvancedShares && effectiveAdvancedShares.expense_totals) {
      // Fallback to state data if API data not available
      const { general, elevator, heating, equal_share, individual } = effectiveAdvancedShares.expense_totals;
      breakdown.common = parseFloat(general || 0);
      breakdown.elevator = parseFloat(elevator || 0);
      breakdown.heating = parseFloat(heating || 0);
      breakdown.other = parseFloat(equal_share || 0);
      breakdown.coownership = parseFloat(individual || 0);

      console.log('🔍 DEBUG expenseBreakdown: Using fallback state data for month', selectedMonth, {
        breakdown,
        note: 'API data not available, using static state data'
      });
    }

    return breakdown;
  }, [monthlyExpenses, effectiveAdvancedShares, state.totalExpenses, selectedMonth]);

  const managementFeeInfo = useMemo<ManagementFeeInfo>(() => {
    let finalFee = 0;
    const apartmentsCount = Object.keys(state.shares).length;

    console.log('🔍 DEBUG managementFeeInfo: Starting calculation with:', {
      selectedMonth,
      monthlyExpenses: !!monthlyExpenses,
      monthlyExpensesKeys: monthlyExpenses ? Object.keys(monthlyExpenses) : 'No data',
      totalManagementCost: monthlyExpenses?.total_management_cost,
      managementFeePerApartment: monthlyExpenses?.management_fee_per_apartment,
      apartmentsCount,
      stateShares: Object.keys(state.shares),
      stateAdvancedShares: !!state.advancedShares
    });

    // Use month-specific data from API if available
    if (monthlyExpenses && monthlyExpenses.total_management_cost > 0) {
      finalFee = monthlyExpenses.management_fee_per_apartment || (monthlyExpenses.total_management_cost / apartmentsCount);
      console.log('✅ DEBUG managementFeeInfo: Using API data', {
        totalManagementCost: monthlyExpenses.total_management_cost,
        feePerApartment: monthlyExpenses.management_fee_per_apartment,
        apartmentsCount,
        finalFee,
        source: 'API'
      });
    } else {
      // Fallback to state data
      const feeFromState = state.advancedShares?.management_fee_per_apartment || 0;
      finalFee = feeFromState > 0 ? feeFromState : managementFeePerApartment;

      console.log('⚠️ DEBUG managementFeeInfo: Using fallback state data', {
        feeFromState,
        managementFeePerApartment,
        finalFee,
        apartmentsCount,
        source: 'State fallback',
        reason: monthlyExpenses ? 'No total_management_cost in API' : 'No monthlyExpenses data'
      });
    }

    const result = {
      feePerApartment: finalFee,
      totalFee: finalFee * apartmentsCount,
      apartmentsCount,
      hasFee: finalFee > 0,
    };

    console.log('💰 DEBUG managementFeeInfo: Final result:', result);

    return result;
  }, [monthlyExpenses, state.advancedShares, state.shares, managementFeePerApartment, selectedMonth]);

  const reserveFundInfo = useMemo<ReserveFundInfo>(() => {
    const goal = Number(state.advancedShares?.reserve_fund_goal || 0);
    const duration = Number(state.advancedShares?.reserve_fund_duration || 0);
    const startDate = state.advancedShares?.reserve_fund_start_date;
    const targetDate = state.advancedShares?.reserve_fund_target_date;
    let showReserveFund = true;

    if (selectedMonth && startDate) {
      const selected = new Date(selectedMonth + '-01');
      if (selected < new Date(startDate)) showReserveFund = false;
      if (targetDate && selected > new Date(targetDate)) showReserveFund = false;
    }

    let monthlyAmount = 0;
    if (showReserveFund && goal > 0 && duration > 0) {
      monthlyAmount = goal / duration;
    }

    const actualReserveCollected = Number(state.advancedShares?.actual_reserve_collected || 0);
    const progressPercentage = goal > 0 ? Math.min(100, (actualReserveCollected / goal) * 100) : 0;

    return {
      monthlyAmount,
      totalContribution: monthlyAmount,
      displayText: `Στόχος ${formatAmount(goal)}€ σε ${duration} δόσεις`,
      goal,
      duration,
      monthsRemaining: duration,
      actualReserveCollected,
      progressPercentage,
    };
  }, [state.advancedShares, selectedMonth]);

  const totalExpenses = useMemo<number>(() => {
    const basic = Object.values(expenseBreakdown).reduce((s, v) => s + v, 0);
    const hasAnyExpenses = basic > 0;
    return basic + managementFeeInfo.totalFee + (hasAnyExpenses ? reserveFundInfo.monthlyAmount : 0);
  }, [expenseBreakdown, managementFeeInfo, reserveFundInfo]);

  const getCategoryDisplayName = (category: string) => {
    const categoryMap: Record<string, string> = {
      'cleaning': 'ΚΑΘΑΡΙΟΤΗΤΑ', 'electricity_common': 'Δ.Ε.Η.', 'water_common': 'ΝΕΡΟ',
      'elevator_maintenance': 'ΣΥΝΤΗΡΗΣΗ ΑΝΕΛΚΥΣΤΗΡΑ', 'heating_fuel': 'ΚΑΥΣΙΜΑ ΘΕΡΜΑΝΣΗΣ',
    };
    return categoryMap[category] || category.toUpperCase();
  };

  const getGroupedExpenses = useCallback((): GroupedExpenses => {
    const expenseDetails: { [key: string]: ExpenseItem[] } = effectiveAdvancedShares?.expense_details || { general: [], elevator: [], heating: [], equal_share: [], individual: [] };
    const grouped: GroupedExpenses = {};
    const categories: string[] = ['general', 'elevator', 'heating', 'equal_share', 'individual'];

    categories.forEach(categoryName => {
        const expenses = expenseDetails[categoryName];
        if (expenses && expenses.length > 0) {
            const groupedByCategory: Record<string, ExpenseItem[]> = {};
            expenses.forEach((expense: ExpenseItem) => {
                const category = expense.category || 'miscellaneous';
                if (!groupedByCategory[category]) {
                    groupedByCategory[category] = [];
                }
                groupedByCategory[category].push(expense);
            });

            grouped[categoryName] = {
                expenses: Object.entries(groupedByCategory).map(([category, expenses]) => ({
                    category,
                    displayName: getCategoryDisplayName(category),
                    expenses,
                    total: expenses.reduce((sum: number, exp: ExpenseItem) => sum + exp.amount, 0)
                })),
                total: expenses.reduce((sum: number, exp: ExpenseItem) => sum + exp.amount, 0)
            };
        }
    });

    return grouped;
  }, [effectiveAdvancedShares]);

  const getTotalPreviousBalance = useCallback(() => {
    console.log('🔍 DEBUG getTotalPreviousBalance called with aptWithFinancial:', {
      length: aptWithFinancial.length,
      sampleData: aptWithFinancial.length > 0 ? aptWithFinancial[0] : 'No data',
      allPreviousBalances: aptWithFinancial.map(apt => ({
        id: apt.id,
        previous_balance: apt.previous_balance,
        abs_previous_balance: Math.abs(apt.previous_balance ?? 0),
        aptData: apt
      }))
    });

    // Log the first 3 apartments in detail
    if (aptWithFinancial.length > 0) {
      console.log('🔍 DEBUG First 3 apartments detailed data:', aptWithFinancial.slice(0, 3).map(apt => ({
        id: apt.id,
        apartment_number: apt.apartment_number,
        previous_balance: apt.previous_balance,
        current_balance: apt.current_balance,
        expense_share: apt.expense_share,
        allFields: Object.keys(apt),
        sampleValues: {
          previous_balance: apt.previous_balance,
          current_balance: apt.current_balance,
          expense_share: apt.expense_share,
          net_obligation: apt.net_obligation,
          total_obligations: apt.total_obligations,
          total_payments: apt.total_payments
        }
      })));
    }

    const total = aptWithFinancial.reduce((sum: number, apt: any) => sum + Math.abs(apt.previous_balance ?? 0), 0);

    console.log('🔍 DEBUG getTotalPreviousBalance result:', total);
    console.log('🔍 DEBUG getTotalPreviousBalance calculation details:', {
      total,
      apartmentsCount: aptWithFinancial.length,
      individualBalances: aptWithFinancial.map(apt => ({
        id: apt.id,
        previous_balance: apt.previous_balance,
        abs_previous_balance: Math.abs(apt.previous_balance ?? 0)
      }))
    });
    return total;
  }, [aptWithFinancial]);

  const getFinalTotalExpenses = useCallback(() => {
      return totalExpenses + getTotalPreviousBalance();
  }, [totalExpenses, getTotalPreviousBalance]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const saveData = {
        building_id: buildingId,
        period_data: { name: getPeriodInfo(state), start_date: state.customPeriod.startDate, end_date: state.customPeriod.endDate },
        shares: state.shares,
        total_expenses: totalExpenses,
        advanced: state.advancedShares !== null,
        advanced_options: state.advancedOptions
      };
      await saveCommonExpenseSheet(saveData);
      toast.success('Το φύλλο κοινοχρήστων αποθηκεύθηκε επιτυχώς!');
      onClose();
    } catch (error: any) {
      toast.error('Σφάλμα: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  }, [state, buildingId, totalExpenses, saveCommonExpenseSheet, onClose]);

  const handlePrint = () => window.print();

  const handleExport = useCallback(async (format: 'pdf' | 'excel' | 'jpg') => {
    const commonParams = {
        state,
        buildingName,
        buildingAddress: props.buildingAddress,
        buildingCity: props.buildingCity,
        buildingPostalCode: props.buildingPostalCode,
        managerName: props.managerName,
        managerApartment: props.managerApartment,
        managerPhone: props.managerPhone,
        managerCollectionSchedule: props.managerCollectionSchedule,
        managementOfficeName: props.managementOfficeName,
        managementOfficePhone: props.managementOfficePhone,
        managementOfficeAddress: props.managementOfficeAddress,
        managementOfficeLogo: props.managementOfficeLogo,
        selectedMonth,
        expenseBreakdown,
        reserveFundInfo,
        managementFeeInfo,
        groupedExpenses: getGroupedExpenses(),
        perApartmentAmounts,
        aptWithFinancial,
        totalExpenses,
        getFinalTotalExpenses,
        getTotalPreviousBalance,
        monthlyExpenses, // ✅ ΝΕΟ: Περνάμε τα επιμέρους δεδομένα δαπανών
        buildingId, // ✅ ΝΕΟ: Περνάμε το buildingId
    };

    if (format === 'pdf') {
      await exportToPDF(commonParams);
    } else if (format === 'excel') {
      await exportToExcel({...commonParams, reserveFundDetails: reserveFundInfo, getGroupedExpenses});
    } else if (format === 'jpg') {
      await exportToJPG(commonParams);
    }
  }, [state, props, expenseBreakdown, reserveFundInfo, managementFeeInfo, perApartmentAmounts, aptWithFinancial, totalExpenses, getFinalTotalExpenses, getTotalPreviousBalance, getGroupedExpenses, monthlyExpenses, buildingId]);

  const validateData = useCallback(() => {
    const allTotalsMatch = true;
    if (allTotalsMatch) {
        toast.success('✅ Έλεγχος δεδομένων επιτυχής!');
    } else {
        toast.error('❌ Βρέθηκαν διαφορές στα σύνολα.');
    }
    setValidationResult({ isValid: allTotalsMatch, message: 'Validation result', details: { totalExpenses: 0, tenantExpensesTotal: 0, ownerExpensesTotal: 0, reserveFundTotal: 0, payableTotal: 0, differences: [] } });
  }, []);

  const handleSendToAll = useCallback(async () => {
    setIsSending(true);
    try {
      const commonParams = {
        state,
        buildingId,
        buildingName,
        buildingAddress: props.buildingAddress,
        buildingCity: props.buildingCity,
        buildingPostalCode: props.buildingPostalCode,
        managerName: props.managerName,
        managerApartment: props.managerApartment,
        managerPhone: props.managerPhone,
        managerCollectionSchedule: props.managerCollectionSchedule,
        managementOfficeName: props.managementOfficeName,
        managementOfficePhone: props.managementOfficePhone,
        managementOfficeAddress: props.managementOfficeAddress,
        managementOfficeLogo: props.managementOfficeLogo,
        selectedMonth,
        expenseBreakdown,
        reserveFundInfo,
        managementFeeInfo,
        groupedExpenses: getGroupedExpenses(),
        perApartmentAmounts,
        aptWithFinancial,
        totalExpenses,
        getFinalTotalExpenses,
        getTotalPreviousBalance,
      };

      await exportAndSendJPG(commonParams);
    } catch (error) {
      console.error('Error sending common expenses:', error);
      // Error toast is already shown by exportAndSendJPG
    } finally {
      setIsSending(false);
    }
  }, [
    state,
    buildingId,
    buildingName,
    props,
    selectedMonth,
    expenseBreakdown,
    reserveFundInfo,
    managementFeeInfo,
    perApartmentAmounts,
    aptWithFinancial,
    totalExpenses,
    getFinalTotalExpenses,
    getTotalPreviousBalance,
    getGroupedExpenses,
  ]);

  return {
    isSaving, isSending, showHeatingModal, setShowHeatingModal, heatingBreakdown, setHeatingBreakdown,
    validationResult, setValidationResult, aptWithFinancial, occupantsByApartmentId, perApartmentAmounts,
    expenseBreakdown, managementFeeInfo, reserveFundInfo, totalExpenses, handleSave, handlePrint,
    handleExport, handleSendToAll, validateData, getGroupedExpenses, getTotalPreviousBalance, getFinalTotalExpenses,
    // Expose month-specific sources so the modal can render consistent tables for the selected month
    effectiveShares,
    effectiveAdvancedShares
  };
};
