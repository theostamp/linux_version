
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

  const shareExpenseTotals = useMemo<ExpenseBreakdown>(() => {
    const totals: ExpenseBreakdown = { common: 0, elevator: 0, heating: 0, other: 0, coownership: 0 };
    Object.values(effectiveShares as { [key: string]: Share }).forEach((share) => {
      const bd = share.breakdown || {};
      totals.common += toNumber(bd.general_expenses);
      totals.elevator += toNumber(bd.elevator_expenses);
      totals.heating += toNumber(bd.heating_expenses);
      totals.other += toNumber(bd.equal_share_expenses);
      totals.coownership += toNumber(bd.individual_expenses);
    });
    return totals;
  }, [effectiveShares]);

  const reserveFromShares = useMemo(() => {
    return Object.values(effectiveShares as { [key: string]: Share }).reduce(
      (sum, share) => sum + toNumber(share?.breakdown?.reserve_fund_contribution ?? 0),
      0
    );
  }, [effectiveShares]);

  const expenseSplitRatios = useMemo(() => {
    const totals = (effectiveAdvancedShares as any)?.expense_totals || {};
    const ratio = (residentValue: any, totalValue: any) => {
      const total = toNumber(totalValue);
      if (total <= 0) return 1;
      if (residentValue === null || residentValue === undefined || residentValue === '') return 1;
      const resident = toNumber(residentValue);
      if (resident <= 0) return 0;
      const computed = resident / total;
      return Math.min(1, Math.max(0, computed));
    };

    return {
      elevator: ratio(totals.resident_elevator, totals.elevator),
      heating: ratio(totals.resident_heating, totals.heating),
    };
  }, [effectiveAdvancedShares]);

  const expenseBreakdown = useMemo<ExpenseBreakdown>(() => {
    const breakdown: ExpenseBreakdown = { common: 0, elevator: 0, heating: 0, other: 0, coownership: 0 };
    const shareTotalsSum = Object.values(shareExpenseTotals).reduce((sum, value) => sum + value, 0);

    if (shareTotalsSum > 0) {
      return shareExpenseTotals;
    }

    if (effectiveAdvancedShares?.expense_totals) {
      const { general, elevator, heating, equal_share, individual } = effectiveAdvancedShares.expense_totals;
      breakdown.common = toNumber(general);
      breakdown.elevator = toNumber(elevator);
      breakdown.heating = toNumber(heating);
      breakdown.other = toNumber(equal_share);
      breakdown.coownership = toNumber(individual);
      return breakdown;
    }

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
    }

    return breakdown;
  }, [monthlyExpenses, effectiveAdvancedShares, shareExpenseTotals, state.totalExpenses, selectedMonth]);

  const managementFeeInfo = useMemo<ManagementFeeInfo>(() => {
    let finalFee = 0;
    const apartmentsCount = Object.keys((effectiveShares as Record<string, Share>) || {}).length;

    console.log('🔍 DEBUG managementFeeInfo: Starting calculation with:', {
      selectedMonth,
      monthlyExpenses: !!monthlyExpenses,
      monthlyExpensesKeys: monthlyExpenses ? Object.keys(monthlyExpenses) : 'No data',
      totalManagementCost: monthlyExpenses?.total_management_cost,
      managementFeePerApartment: monthlyExpenses?.management_fee_per_apartment,
      apartmentsCount,
      stateShares: Object.keys(state.shares),
      effectiveShares: Object.keys((effectiveShares as Record<string, Share>) || {}),
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
  }, [monthlyExpenses, state.advancedShares, state.shares, managementFeePerApartment, selectedMonth, effectiveShares]);

  const reserveFundInfo = useMemo<ReserveFundInfo>(() => {
    const advancedShares = effectiveAdvancedShares || {};
    const apiGoal = typeof monthlyExpenses?.reserve_fund_goal === 'number'
      ? toNumber(monthlyExpenses.reserve_fund_goal)
      : null;
    const apiDuration = typeof monthlyExpenses?.reserve_fund_duration_months === 'number'
      ? toNumber(monthlyExpenses.reserve_fund_duration_months)
      : null;

    const goal = apiGoal !== null
      ? apiGoal
      : Number((advancedShares as any)?.reserve_fund_goal || 0);
    const duration = apiDuration !== null
      ? apiDuration
      : Number((advancedShares as any)?.reserve_fund_duration || 0);
    const startDate = monthlyExpenses?.reserve_fund_start_date || (advancedShares as any)?.reserve_fund_start_date;
    const targetDate = monthlyExpenses?.reserve_fund_target_date || (advancedShares as any)?.reserve_fund_target_date;
    let showReserveFund = true;

    if (selectedMonth && startDate) {
      const selected = new Date(selectedMonth + '-01');
      if (selected < new Date(startDate)) showReserveFund = false;
      if (targetDate && selected > new Date(targetDate)) showReserveFund = false;
    }

    if (reserveFromShares > 0) {
      showReserveFund = true;
    }

    let monthlyAmount = 0;
    if (showReserveFund && goal > 0 && duration > 0) {
      monthlyAmount = goal / duration;
    }

    const actualReserveCollected = Number((advancedShares as any)?.actual_reserve_collected || 0);
    const progressPercentage = goal > 0 ? Math.min(100, (actualReserveCollected / goal) * 100) : 0;
    const displayText = goal > 0 && duration > 0
      ? `Στόχος ${formatAmount(goal)}€ σε ${duration} δόσεις`
      : 'Αποθεματικό Ταμείο';

    const baseInfo = {
      monthlyAmount,
      totalContribution: monthlyAmount,
      displayText,
      goal,
      duration,
      monthsRemaining: duration,
      actualReserveCollected,
      progressPercentage,
    };

    const apiMonthlyTarget = typeof monthlyExpenses?.reserve_fund_monthly_target === 'number'
      ? toNumber(monthlyExpenses.reserve_fund_monthly_target)
      : null;
    const apiReserve = typeof monthlyExpenses?.reserve_fund_contribution === 'number'
      ? toNumber(monthlyExpenses.reserve_fund_contribution)
      : null;
    const apiReserveFallback = typeof monthlyExpenses?.reserve_monthly_contribution === 'number'
      ? toNumber(monthlyExpenses.reserve_monthly_contribution)
      : null;

    let resolvedMonthlyAmount = reserveFromShares > 0 ? reserveFromShares : baseInfo.monthlyAmount;

    if (reserveFromShares <= 0) {
      if (apiMonthlyTarget !== null) {
        if (apiMonthlyTarget > 0) {
          resolvedMonthlyAmount = apiMonthlyTarget;
        } else if (baseInfo.monthlyAmount > 0 && showReserveFund) {
          resolvedMonthlyAmount = baseInfo.monthlyAmount;
        } else if (apiReserve !== null && apiReserve > 0) {
          resolvedMonthlyAmount = apiReserve;
        } else if (apiReserveFallback !== null && apiReserveFallback > 0) {
          resolvedMonthlyAmount = apiReserveFallback;
        } else {
          resolvedMonthlyAmount = 0;
        }
      } else if (apiReserve !== null) {
        resolvedMonthlyAmount = apiReserve;
      } else if (apiReserveFallback !== null) {
        resolvedMonthlyAmount = apiReserveFallback;
      }
    }

    const totalContribution = reserveFromShares > 0 ? reserveFromShares : resolvedMonthlyAmount;

    if (resolvedMonthlyAmount !== baseInfo.monthlyAmount || totalContribution !== baseInfo.totalContribution) {
      return {
        ...baseInfo,
        monthlyAmount: resolvedMonthlyAmount,
        totalContribution
      };
    }

    return baseInfo;
  }, [effectiveAdvancedShares, reserveFromShares, selectedMonth, monthlyExpenses]);

  const previousBalanceTotals = useMemo(() => {
    const signed = aptWithFinancial.reduce((sum: number, apt: any) => sum + toNumber(apt.previous_balance ?? 0), 0);
    const abs = aptWithFinancial.reduce((sum: number, apt: any) => sum + Math.abs(toNumber(apt.previous_balance ?? 0)), 0);
    return { signed, abs };
  }, [aptWithFinancial]);

  const resolvedTotals = useMemo(() => {
    const expenseBreakdownTotal = Object.values(expenseBreakdown).reduce((s, v) => s + v, 0);
    const expensesFromBreakdown = monthlyExpenses?.expense_breakdown
      ? monthlyExpenses.expense_breakdown.reduce((sum: number, exp: any) => sum + toNumber(exp.amount ?? exp.share_amount ?? 0), 0)
      : null;

    const totalExpensesMonth = typeof monthlyExpenses?.total_expenses_month === 'number'
      ? toNumber(monthlyExpenses.total_expenses_month)
      : expensesFromBreakdown !== null
        ? expensesFromBreakdown
        : expenseBreakdownTotal;

    const managementTotal = typeof monthlyExpenses?.total_management_cost === 'number'
      ? toNumber(monthlyExpenses.total_management_cost)
      : managementFeeInfo.totalFee;

    const previousFromApi = typeof monthlyExpenses?.previous_obligations === 'number'
      ? toNumber(monthlyExpenses.previous_obligations)
      : typeof monthlyExpenses?.previous_balances === 'number'
        ? toNumber(monthlyExpenses.previous_balances)
        : null;

    const monthlySubtotalFromSummary = typeof monthlyExpenses?.current_month_expenses === 'number'
      ? toNumber(monthlyExpenses.current_month_expenses)
      : null;
    const monthlySubtotalFromParts = totalExpensesMonth + managementTotal + reserveFundInfo.monthlyAmount;
    const monthlySubtotal = monthlySubtotalFromSummary !== null ? monthlySubtotalFromSummary : monthlySubtotalFromParts;

    const previousTotal = previousFromApi !== null ? previousFromApi : previousBalanceTotals.signed;
    const grandTotal = monthlySubtotal + previousTotal;

    return {
      expenseBreakdownTotal,
      expensesFromBreakdown,
      totalExpensesMonth,
      managementTotal,
      monthlySubtotalFromSummary,
      monthlySubtotalFromParts,
      monthlySubtotal,
      previousTotal,
      grandTotal,
    };
  }, [expenseBreakdown, managementFeeInfo.totalFee, monthlyExpenses, previousBalanceTotals.signed, reserveFundInfo.monthlyAmount]);

  const apartmentTotals = useMemo(() => {
    const totals = { signed: 0, abs: 0 };
    if (!aptWithFinancial.length) {
      return totals;
    }

    aptWithFinancial.forEach((apt: any) => {
      const share = (effectiveShares as Record<string, Share> | undefined)?.[apt.id]
        || (effectiveShares as Record<string, Share> | undefined)?.[(apt as any).apartment_id];
      const breakdown = share?.breakdown || {};
      const residentTotal = toNumber(breakdown.resident_expenses ?? 0);
      const ownerTotal = toNumber(breakdown.owner_expenses ?? 0);
      const elevatorAmount = Math.max(0, toNumber(breakdown.elevator_expenses || 0));
      const heatingAmount = Math.max(0, toNumber(breakdown.heating_expenses || 0));

      const fallbackCommon = Math.max(
        0,
        toNumber(breakdown.general_expenses || 0) +
          toNumber(breakdown.equal_share_expenses || 0) +
          toNumber(breakdown.individual_expenses || 0)
      );

      const residentElevator = elevatorAmount * expenseSplitRatios.elevator;
      const residentHeating = heatingAmount * expenseSplitRatios.heating;
      const displayElevator = residentTotal > 0 ? residentElevator : elevatorAmount;
      const displayHeating = residentTotal > 0 ? residentHeating : heatingAmount;

      const commonAmountWithoutReserve = residentTotal > 0
        ? Math.max(0, residentTotal - displayElevator - displayHeating)
        : fallbackCommon;

      const commonMills = toNumber(apt.participation_mills ?? share?.participation_mills ?? 0);
      const reserveFromShare = toNumber(breakdown.reserve_fund_contribution ?? 0);
      const apartmentReserveFund = reserveFromShare > 0
        ? reserveFromShare
        : reserveFundInfo.monthlyAmount > 0
          ? Math.max(0, toNumber(reserveFundInfo.monthlyAmount) * (commonMills / 1000))
          : 0;

      const ownerExpensesOnlyProjects = ownerTotal > 0
        ? ownerTotal
        : Math.max(0, toNumber((apt as any).owner_expenses || 0));

      const previousSigned = toNumber(apt.previous_balance ?? 0);
      const previousAbs = Math.abs(previousSigned);

      totals.signed += commonAmountWithoutReserve + displayElevator + displayHeating + previousSigned + ownerExpensesOnlyProjects + apartmentReserveFund;
      totals.abs += commonAmountWithoutReserve + displayElevator + displayHeating + previousAbs + ownerExpensesOnlyProjects + apartmentReserveFund;
    });

    return totals;
  }, [aptWithFinancial, effectiveShares, expenseSplitRatios, reserveFundInfo.monthlyAmount]);

  const totalExpenses = useMemo<number>(() => resolvedTotals.monthlySubtotal, [resolvedTotals]);

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

  const getTotalPreviousBalance = useCallback(() => resolvedTotals.previousTotal, [resolvedTotals.previousTotal]);

  const getFinalTotalExpenses = useCallback(() => {
      return resolvedTotals.grandTotal;
  }, [resolvedTotals.grandTotal]);

  const buildExportParams = useCallback(() => ({
    state: {
      ...state,
      shares: effectiveShares as any,
      advancedShares: effectiveAdvancedShares as any,
    },
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
    expenseSplitRatios,
    managementFeeInfo,
    groupedExpenses: getGroupedExpenses(),
    perApartmentAmounts,
    aptWithFinancial,
    totalExpenses,
    getFinalTotalExpenses,
    getTotalPreviousBalance,
    monthlyExpenses,
    buildingId,
  }), [
    state,
    effectiveShares,
    effectiveAdvancedShares,
    buildingName,
    props.buildingAddress,
    props.buildingCity,
    props.buildingPostalCode,
    props.managerName,
    props.managerApartment,
    props.managerPhone,
    props.managerCollectionSchedule,
    props.managementOfficeName,
    props.managementOfficePhone,
    props.managementOfficeAddress,
    props.managementOfficeLogo,
    selectedMonth,
    expenseBreakdown,
    reserveFundInfo,
    expenseSplitRatios,
    managementFeeInfo,
    getGroupedExpenses,
    perApartmentAmounts,
    aptWithFinancial,
    totalExpenses,
    getFinalTotalExpenses,
    getTotalPreviousBalance,
    monthlyExpenses,
    buildingId,
  ]);

  const computeValidation = useCallback((): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const tolerance = 0.5;

    const formatValue = (value: number) => formatAmount(toNumber(value));
    const hasSummary = !!monthlyExpenses;

    if (!hasSummary) {
      warnings.push('Δεν υπάρχουν δεδομένα σύνοψης από το API· χρησιμοποιούνται τοπικοί υπολογισμοί.');
    }

    if (!aptWithFinancial.length) {
      warnings.push('Δεν υπάρχουν δεδομένα διαμερισμάτων για δεύτερη επαλήθευση.');
    }

    if (hasSummary) {
      if (resolvedTotals.expensesFromBreakdown !== null && typeof monthlyExpenses?.total_expenses_month === 'number') {
        const diff = Math.abs(resolvedTotals.totalExpensesMonth - resolvedTotals.expensesFromBreakdown);
        if (diff > tolerance) {
          warnings.push(`Διαφορά στις δαπάνες μήνα: σύνοψη ${formatValue(resolvedTotals.totalExpensesMonth)}€ vs ανάλυση ${formatValue(resolvedTotals.expensesFromBreakdown)}€.`);
        }
      }

      if (typeof monthlyExpenses?.total_management_cost === 'number') {
        const diff = Math.abs(toNumber(monthlyExpenses.total_management_cost) - managementFeeInfo.totalFee);
        if (diff > tolerance) {
          warnings.push(`Διαφορά στο κόστος διαχείρισης: σύνοψη ${formatValue(monthlyExpenses.total_management_cost)}€ vs υπολογισμός ${formatValue(managementFeeInfo.totalFee)}€.`);
        }
      }

      const apiReserveTarget = typeof monthlyExpenses?.reserve_fund_monthly_target === 'number'
        ? toNumber(monthlyExpenses.reserve_fund_monthly_target)
        : null;
      const apiReserveContribution = typeof monthlyExpenses?.reserve_fund_contribution === 'number'
        ? toNumber(monthlyExpenses.reserve_fund_contribution)
        : null;
      const apiReserveLegacy = typeof monthlyExpenses?.reserve_monthly_contribution === 'number'
        ? toNumber(monthlyExpenses.reserve_monthly_contribution)
        : null;

      if (apiReserveTarget !== null) {
        const diff = Math.abs(apiReserveTarget - reserveFundInfo.monthlyAmount);
        if (diff > tolerance) {
          warnings.push(`Διαφορά στο αποθεματικό: στόχος ${formatValue(apiReserveTarget)}€ vs υπολογισμός ${formatValue(reserveFundInfo.monthlyAmount)}€.`);
        }
      } else if (apiReserveContribution !== null) {
        const diff = Math.abs(apiReserveContribution - reserveFundInfo.monthlyAmount);
        if (diff > tolerance) {
          warnings.push(`Διαφορά στο αποθεματικό: σύνοψη ${formatValue(apiReserveContribution)}€ vs υπολογισμός ${formatValue(reserveFundInfo.monthlyAmount)}€.`);
        }
      } else if (apiReserveLegacy !== null) {
        const diff = Math.abs(apiReserveLegacy - reserveFundInfo.monthlyAmount);
        if (diff > tolerance) {
          warnings.push(`Διαφορά στο αποθεματικό: σύνοψη ${formatValue(apiReserveLegacy)}€ vs υπολογισμός ${formatValue(reserveFundInfo.monthlyAmount)}€.`);
        }
      }

      if (apiReserveTarget !== null && apiReserveContribution !== null) {
        const diff = Math.abs(apiReserveTarget - apiReserveContribution);
        if (diff > tolerance) {
          warnings.push(`Διαφορά στόχου αποθεματικού vs είσπραξης: στόχος ${formatValue(apiReserveTarget)}€ vs είσπραξη ${formatValue(apiReserveContribution)}€.`);
        }
      }

      const previousFromApi = typeof monthlyExpenses?.previous_obligations === 'number'
        ? toNumber(monthlyExpenses.previous_obligations)
        : typeof monthlyExpenses?.previous_balances === 'number'
          ? toNumber(monthlyExpenses.previous_balances)
          : null;

      if (previousFromApi !== null) {
        const diff = Math.abs(previousFromApi - previousBalanceTotals.signed);
        if (diff > tolerance) {
          warnings.push(`Διαφορά στις παλαιότερες οφειλές: σύνοψη ${formatValue(previousFromApi)}€ vs διαμερίσματα ${formatValue(previousBalanceTotals.signed)}€.`);
        }
      }

      if (resolvedTotals.monthlySubtotalFromSummary !== null) {
        const diff = Math.abs(resolvedTotals.monthlySubtotalFromSummary - resolvedTotals.monthlySubtotalFromParts);
        if (diff > tolerance) {
          warnings.push(`Διαφορά στο μηνιαίο σύνολο: σύνοψη ${formatValue(resolvedTotals.monthlySubtotalFromSummary)}€ vs άθροισμα επιμέρους ${formatValue(resolvedTotals.monthlySubtotalFromParts)}€.`);
        }
      }
    }

    if (aptWithFinancial.length) {
      const diff = Math.abs(resolvedTotals.grandTotal - apartmentTotals.signed);
      if (diff > tolerance) {
        errors.push(`Διαφορά στο τελικό σύνολο: σύνοψη ${formatValue(resolvedTotals.grandTotal)}€ vs διαμερίσματα ${formatValue(apartmentTotals.signed)}€.`);
      }

      const creditDiff = Math.abs(apartmentTotals.signed - apartmentTotals.abs);
      if (creditDiff > tolerance) {
        warnings.push('Υπάρχουν πιστωτικά υπόλοιπα· το άθροισμα με πρόσημο διαφέρει από το απόλυτο.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length ? errors : undefined,
      warnings: warnings.length ? warnings : undefined,
      message: errors.length
        ? 'Βρέθηκαν αποκλίσεις στα σύνολα.'
        : warnings.length
          ? 'Βρέθηκαν μικρές αποκλίσεις στα σύνολα.'
          : 'Όλα τα σύνολα είναι συνεπή.'
    };
  }, [
    aptWithFinancial.length,
    apartmentTotals.abs,
    apartmentTotals.signed,
    managementFeeInfo.totalFee,
    monthlyExpenses,
    previousBalanceTotals.signed,
    reserveFundInfo.monthlyAmount,
    resolvedTotals,
  ]);

  const validateData = useCallback((options?: { notify?: boolean }) => {
    const result = computeValidation();
    setValidationResult(result);

    if (options?.notify !== false) {
      if (result.errors?.length) {
        toast.error(`❌ ${result.message}`);
      } else if (result.warnings?.length) {
        toast.warning(`⚠️ ${result.message}`);
      } else {
        toast.success(`✅ ${result.message}`);
      }
    }

    return result;
  }, [computeValidation]);

  useEffect(() => {
    if (!props.isOpen) return;
    setValidationResult(computeValidation());
  }, [props.isOpen, computeValidation]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      validateData({ notify: true });
      let sheetFile: File | null = null;
      try {
        const exportParams = buildExportParams();
        const jpgResult = await exportToJPG(exportParams, {
          skipDownload: true,
          skipKiosk: true,
          returnBlob: true,
          silent: true
        });
        if (jpgResult?.blob && jpgResult?.fileName) {
          sheetFile = new File([jpgResult.blob], jpgResult.fileName, { type: 'image/jpeg' });
        }
      } catch (error) {
        console.error('Failed to generate common expense sheet file:', error);
      }

      const saveData = {
        building_id: buildingId,
        period_data: { name: getPeriodInfo(state), start_date: state.customPeriod.startDate, end_date: state.customPeriod.endDate },
        shares: state.shares,
        total_expenses: totalExpenses,
        advanced: state.advancedShares !== null,
        advanced_options: state.advancedOptions,
        sheet_attachment: sheetFile
      };
      await saveCommonExpenseSheet(saveData);
      toast.success('Το φύλλο κοινοχρήστων αποθηκεύθηκε επιτυχώς!');
      onClose();
    } catch (error: any) {
      toast.error('Σφάλμα: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  }, [buildExportParams, state, buildingId, totalExpenses, saveCommonExpenseSheet, onClose, validateData]);

  const handlePrint = () => window.print();

  const handleExport = useCallback(async (format: 'pdf' | 'excel' | 'jpg') => {
    validateData({ notify: true });
    const commonParams = buildExportParams();

    if (format === 'pdf') {
      await exportToPDF(commonParams);
    } else if (format === 'excel') {
      await exportToExcel({...commonParams, reserveFundDetails: reserveFundInfo, getGroupedExpenses});
    } else if (format === 'jpg') {
      await exportToJPG(commonParams);
    }
  }, [buildExportParams, reserveFundInfo, getGroupedExpenses, validateData]);

  const handleSendToAll = useCallback(async () => {
    setIsSending(true);
    try {
      validateData({ notify: true });
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
    validateData,
  ]);

  return {
    isSaving, isSending, showHeatingModal, setShowHeatingModal, heatingBreakdown, setHeatingBreakdown,
    validationResult, setValidationResult, aptWithFinancial, occupantsByApartmentId, perApartmentAmounts,
    expenseBreakdown, managementFeeInfo, reserveFundInfo, expenseSplitRatios, totalExpenses, handleSave, handlePrint,
    handleExport, handleSendToAll, validateData, getGroupedExpenses, getTotalPreviousBalance, getFinalTotalExpenses,
    // Expose month-specific sources so the modal can render consistent tables for the selected month
    effectiveShares,
    effectiveAdvancedShares
  };
};
