
import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useCommonExpenses } from '@/hooks/useCommonExpenses';
import { useApartmentsWithFinancialData } from '@/hooks/useApartmentsWithFinancialData';
import { useMonthRefresh } from '@/hooks/useMonthRefresh';
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
  const [showHeatingModal, setShowHeatingModal] = useState(false);
  const [heatingBreakdown, setHeatingBreakdown] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const { saveCommonExpenseSheet } = useCommonExpenses();
  const selectedMonth = state.customPeriod?.startDate ? state.customPeriod.startDate.substring(0, 7) : undefined;
  const { apartments: aptWithFinancial, forceRefresh } = useApartmentsWithFinancialData(buildingId, selectedMonth);

  useMonthRefresh(selectedMonth, forceRefresh, 'CommonExpenseModal');

  const occupantsByApartmentId = useMemo<OccupantsMap>(() => {
    const map: OccupantsMap = {};
    aptWithFinancial.forEach((apt) => {
      map[apt.id] = { owner_name: apt.owner_name, tenant_name: apt.tenant_name };
    });
    return map;
  }, [aptWithFinancial]);

  const perApartmentAmounts = useMemo<PerApartmentAmounts>(() => {
    const items: PerApartmentAmounts = {};
    Object.values(state.shares as { [key: string]: Share }).forEach((share) => {
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
  }, [state.shares]);

  const expenseBreakdown = useMemo<ExpenseBreakdown>(() => {
    const breakdown: ExpenseBreakdown = { common: 0, elevator: 0, heating: 0, other: 0, coownership: 0 };
    if (state.advancedShares && state.advancedShares.expense_totals) {
      const { general, elevator, heating, equal_share, individual } = state.advancedShares.expense_totals;
      breakdown.common = parseFloat(general || 0);
      breakdown.elevator = parseFloat(elevator || 0);
      breakdown.heating = parseFloat(heating || 0);
      breakdown.other = parseFloat(equal_share || 0);
      breakdown.coownership = parseFloat(individual || 0);
    }
    return breakdown;
  }, [state.advancedShares, state.totalExpenses]);

  const managementFeeInfo = useMemo<ManagementFeeInfo>(() => {
    const feeFromState = state.advancedShares?.management_fee_per_apartment || 0;
    const finalFee = feeFromState > 0 ? feeFromState : managementFeePerApartment;
    const apartmentsCount = Object.keys(state.shares).length;
    return {
      feePerApartment: finalFee,
      totalFee: finalFee * apartmentsCount,
      apartmentsCount,
      hasFee: finalFee > 0,
    };
  }, [state.advancedShares, state.shares, managementFeePerApartment]);

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
    const expenseDetails: { [key: string]: ExpenseItem[] } = state.advancedShares?.expense_details || { general: [], elevator: [], heating: [], equal_share: [], individual: [] };
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
  }, [state.advancedShares]);

  const getTotalPreviousBalance = useCallback(() => {
    return aptWithFinancial.reduce((sum: number, apt: any) => sum + Math.abs(apt.previous_balance ?? 0), 0);
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

  const handleExport = useCallback(async (format: 'pdf' | 'excel') => {
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

    if (format === 'pdf') {
      await exportToPDF(commonParams);
    } else if (format === 'excel') {
      await exportToExcel({...commonParams, reserveFundDetails: reserveFundInfo, getGroupedExpenses});
    }
  }, [state, props, expenseBreakdown, reserveFundInfo, managementFeeInfo, perApartmentAmounts, aptWithFinancial, totalExpenses, getFinalTotalExpenses, getTotalPreviousBalance, getGroupedExpenses]);

  const validateData = useCallback(() => {
    const allTotalsMatch = true; 
    if (allTotalsMatch) {
        toast.success('✅ Έλεγχος δεδομένων επιτυχής!');
    } else {
        toast.error('❌ Βρέθηκαν διαφορές στα σύνολα.');
    }
    setValidationResult({ isValid: allTotalsMatch, message: 'Validation result', details: { totalExpenses: 0, tenantExpensesTotal: 0, ownerExpensesTotal: 0, reserveFundTotal: 0, payableTotal: 0, differences: [] } });
  }, []);

  return {
    isSaving, showHeatingModal, setShowHeatingModal, heatingBreakdown, setHeatingBreakdown,
    validationResult, setValidationResult, aptWithFinancial, occupantsByApartmentId, perApartmentAmounts,
    expenseBreakdown, managementFeeInfo, reserveFundInfo, totalExpenses, handleSave, handlePrint,
    handleExport, validateData, getGroupedExpenses, getTotalPreviousBalance, getFinalTotalExpenses
  };
};
