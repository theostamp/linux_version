import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  X, 
  Download, 
  Printer, 
  FileText,
  Building,
  Calendar,
  User,
  Euro,
  Save,
  PieChart,
  Receipt,
  CheckCircle,
  AlertCircle,
  Calculator,
  PiggyBank,
  Thermometer
} from 'lucide-react';
import { CalculatorState } from './CalculatorWizard';
import { ExpenseBreakdownSection } from './ExpenseBreakdownSection';
import { HeatingAnalysisModal } from './HeatingAnalysisModal';
import { toast } from 'sonner';
import { useCommonExpenses } from '@/hooks/useCommonExpenses';
import { useApartmentsWithFinancialData } from '@/hooks/useApartmentsWithFinancialData';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Print styles
const printStyles = `
  @media print {
    body * {
      visibility: hidden;
    }
    .print-content, .print-content * {
      visibility: visible;
    }
    .print-content {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
    }
    .no-print {
      display: none !important;
    }
  }
`;

interface CommonExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: CalculatorState;
  buildingId: number;
  buildingName?: string;
  managementFeePerApartment?: number;
  reserveContributionPerApartment?: number;
}

export const CommonExpenseModal: React.FC<CommonExpenseModalProps> = ({
  isOpen,
  onClose,
  state,
  buildingId,
  buildingName = 'Άγνωστο Κτίριο',
  managementFeePerApartment = 0,
  reserveContributionPerApartment = 0
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showHeatingModal, setShowHeatingModal] = useState(false);
  const [heatingBreakdown, setHeatingBreakdown] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
    details: {
      totalExpenses: number;
      tenantExpensesTotal: number;
      ownerExpensesTotal: number;
      reserveFundTotal: number;
      payableTotal: number;
      differences: string[];
    };
  } | null>(null);
  const { saveCommonExpenseSheet } = useCommonExpenses();
  const { apartments: aptWithFinancial } = useApartmentsWithFinancialData(buildingId);

  // Occupants map (owner & tenant) by apartment id
  const occupantsByApartmentId = useMemo(() => {
    const map: Record<number, { owner_name?: string; tenant_name?: string }> = {};
    aptWithFinancial.forEach((apt) => {
      map[apt.id] = { owner_name: apt.owner_name, tenant_name: apt.tenant_name };
    });
    return map;
  }, [aptWithFinancial]);

  // Helpers to read numeric values safely
  const toNumber = (v: any) => {
    const n = typeof v === 'string' ? parseFloat(v) : Number(v || 0);
    const result = isNaN(n) ? 0 : n;
    // Debug για την πρώτη κλήση
    if (v !== undefined && v !== null) {
      console.log('toNumber debug:', { input: v, inputType: typeof v, result });
    }
    return result;
  };
  
  // Pre-compute per-apartment advanced amounts using share.breakdown when available
  const perApartmentAmounts = useMemo(() => {
    const items: Record<number, { common: number; elevator: number; heating: number; other: number; coowner: number; reserve: number; total_due: number } > = {};
    Object.values(state.shares).forEach((share: any) => {
      const bd = share.breakdown || {};
      const common = toNumber(bd.general_expenses);
      const elevator = toNumber(bd.elevator_expenses);
      const heating = toNumber(bd.heating_expenses);
      const other = toNumber(bd.equal_share_expenses);
      const coowner = toNumber(bd.individual_expenses);
      const reserve = toNumber(bd.reserve_fund_contribution);
      items[share.apartment_id] = {
        common,
        elevator,
        heating,
        other,
        coowner,
        reserve,
        total_due: toNumber(share.total_due)
      };
    });
    return items;
  }, [state.shares]);

  // Totals per category computed from per-apartment values to validate final sums
  const totalsFromRows = useMemo(() => {
    let common = 0, elevator = 0, heating = 0, other = 0, coowner = 0, reserve = 0, grand = 0;
    Object.values(state.shares).forEach((share: any) => {
      const row = perApartmentAmounts[share.apartment_id] || { common:0, elevator:0, heating:0, other:0, coowner:0, reserve:0, total_due:0 };
      common += row.common;
      elevator += row.elevator;
      heating += row.heating;
      other += row.other;
      coowner += row.coowner;
      reserve += row.reserve;
      grand += (row.common + row.elevator + row.heating + row.other + row.coowner + row.reserve);
    });
    return { common, elevator, heating, other, coowner, reserve, grand };
  }, [state.shares, perApartmentAmounts]);

  const renderOccupants = (apartmentId: number, fallbackOwner?: string) => {
    const info = occupantsByApartmentId[apartmentId] || {};
    const owner = info.owner_name || fallbackOwner;
    const tenant = info.tenant_name;
    return (
      <div className="flex flex-col gap-0.5">
        {owner && (
          <div className="text-xs">
            <span className="inline-block px-1 mr-1 rounded bg-green-50 text-green-700 border border-green-200">Ιδιοκτήτης</span>
            <span className="text-gray-800">{owner}</span>
          </div>
        )}
        {tenant && (
          <div className="text-xs">
            <span className="inline-block px-1 mr-1 rounded bg-blue-50 text-blue-700 border border-blue-200">Ενοικιαστής</span>
            <span className="text-gray-800">{tenant}</span>
          </div>
        )}
        {!owner && !tenant && (
          <span className="text-xs text-gray-400 italic">Μη καταχωρημένοι</span>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  const formatAmount = (amount: number) => {
    // Handle NaN and invalid values
    if (isNaN(amount) || !isFinite(amount)) {
      return '0,00';
    }
    return new Intl.NumberFormat('el-GR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getPeriodInfo = () => {
    if (state.periodMode === 'quick') {
      if (state.quickOptions.currentMonth) {
        const now = new Date();
        return now.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
      } else if (state.quickOptions.previousMonth) {
        const now = new Date();
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return prevMonth.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
      }
    }
    return state.customPeriod.periodName;
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getPaymentDueDate = () => {
    const now = new Date();
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 15);
    return dueDate.toLocaleDateString('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getExpenseDetails = () => {
    // Use real expense details from advanced shares if available
    if (state.advancedShares && state.advancedShares.expense_details) {
      return state.advancedShares.expense_details;
    }
    
    return {
      general: [],
      elevator: [],
      heating: [],
      equal_share: [],
      individual: []
    };
  };

  // Map expense categories to display names for the analysis section
  const getCategoryDisplayName = (category: string) => {
    const categoryMap: Record<string, string> = {
      // General expenses
      'cleaning': 'ΚΑΘΑΡΙΟΤΗΤΑ',
      'cleaning_supplies': 'ΕΙΔΗ ΚΑΘΑΡΙΟΤΗΤΑΣ',
      'electricity_common': 'Δ.Ε.Η.',
      'water_common': 'ΝΕΡΟ ΚΟΙΝΟΧΡΗΣΤΩΝ',
      'garbage_collection': 'ΣΥΛΛΟΓΗ ΑΠΟΡΡΙΜΜΑΤΩΝ',
      'security': 'ΑΣΦΑΛΕΙΑ',
      'concierge': 'ΚΑΘΑΡΙΣΤΗΣ/ΠΥΛΩΡΟΣ',
      'electrical_maintenance': 'ΣΥΝΤΗΡΗΣΗ ΗΛΕΚΤΡΙΚΩΝ',
      'electrical_repair': 'ΕΠΙΣΚΕΥΗ ΗΛΕΚΤΡΙΚΩΝ',
      'lighting_common': 'ΦΩΤΙΣΜΟΣ ΚΟΙΝΟΧΡΗΣΤΩΝ',
      'plumbing_maintenance': 'ΣΥΝΤΗΡΗΣΗ ΥΔΡΑΥΛΙΚΩΝ',
      'plumbing_repair': 'ΕΠΙΣΚΕΥΗ ΥΔΡΑΥΛΙΚΩΝ',
      'building_maintenance': 'ΣΥΝΤΗΡΗΣΗ ΚΤΙΡΙΟΥ',
      'building_insurance': 'ΑΣΦΑΛΕΙΑ ΚΤΙΡΙΟΥ',
      'roof_maintenance': 'ΣΥΝΤΗΡΗΣΗ ΣΤΕΓΗΣ',
      'facade_maintenance': 'ΣΥΝΤΗΡΗΣΗ ΠΡΟΣΩΠΙΔΑΣ',
      'garden_maintenance': 'ΣΥΝΤΗΡΗΣΗ ΚΗΠΟΥ',
      'parking_maintenance': 'ΣΥΝΤΗΡΗΣΗ ΠΑΡΚΙΝΓΚ',
      'legal_fees': 'ΝΟΜΙΚΑ ΕΞΟΔΑ',
      'accounting_fees': 'ΛΟΓΙΣΤΙΚΑ ΕΞΟΔΑ',
      'management_fees': 'ΔΑΠΑΝΕΣ ΔΙΑΧΕΙΡΙΣΗΣ',
      'miscellaneous': 'ΔΙΑΦΟΡΑ',
      
      // Elevator expenses
      'elevator_maintenance': 'ΣΥΝΤΗΡΗΣΗ',
      'elevator_repair': 'ΕΠΙΣΚΕΥΗ',
      'elevator_inspection': 'ΕΠΙΘΕΩΡΗΣΗ',
      'elevator_modernization': 'ΜΟΝΤΕΡΝΙΣΗ',
      
      // Heating expenses
      'heating_fuel': 'ΚΑΥΣΙΜΑ',
      'heating_gas': 'ΦΥΣΙΚΟ ΑΕΡΙΟ',
      'heating_maintenance': 'ΣΥΝΤΗΡΗΣΗ',
      'heating_repair': 'ΕΠΙΣΚΕΥΗ',
      'heating_inspection': 'ΕΠΙΘΕΩΡΗΣΗ',
      'heating_modernization': 'ΜΟΝΤΕΡΝΙΣΗ',
      
      // Equal share expenses
      'special_contribution': 'ΕΙΔΙΚΗ ΕΙΣΦΟΡΑ',
      'reserve_fund': 'ΑΠΟΘΕΜΑΤΙΚΟ',
      'emergency_fund': 'ΕΠΕΙΓΟΝ ΑΠΟΘΕΜΑΤΙΚΟ',
      'renovation_fund': 'ΑΠΟΘΕΜΑΤΙΚΟ ΑΝΑΝΕΩΣΗΣ',
      
      // Individual expenses
      'individual_charge': 'ΑΤΟΜΙΚΗ ΧΡΕΩΣΗ'
    };
    
    return categoryMap[category] || category.toUpperCase();
  };

  // Group expenses by category for dynamic display
  const getGroupedExpenses = () => {
    const expenseDetails = getExpenseDetails();
    const grouped: Record<string, { expenses: any[], total: number }> = {};
    
    // Define expense type interface
    interface ExpenseItem {
      category?: string;
      amount: number;
    }
    
    // Process general expenses
    if (expenseDetails.general.length > 0) {
      const generalGrouped: Record<string, typeof expenseDetails.general> = {};
      expenseDetails.general.forEach((expense: ExpenseItem) => {
        const category = expense.category || 'miscellaneous';
        if (!generalGrouped[category]) {
          generalGrouped[category] = [];
        }
        generalGrouped[category].push(expense);
      });
      
      grouped['general'] = {
        expenses: Object.entries(generalGrouped).map(([category, expenses]) => ({
          category,
          displayName: getCategoryDisplayName(category),
          expenses,
          total: expenses.reduce((sum: number, exp: ExpenseItem) => sum + exp.amount, 0)
        })),
        total: expenseDetails.general.reduce((sum: number, exp: ExpenseItem) => sum + exp.amount, 0)
      };
    }
    
    // Process elevator expenses
    if (expenseDetails.elevator.length > 0) {
      const elevatorGrouped: Record<string, ExpenseItem[]> = {};
      expenseDetails.elevator.forEach((expense: ExpenseItem) => {
        const category = expense.category || 'elevator_maintenance';
        if (!elevatorGrouped[category]) {
          elevatorGrouped[category] = [];
        }
        elevatorGrouped[category].push(expense);
      });
      
      grouped['elevator'] = {
        expenses: Object.entries(elevatorGrouped).map(([category, expenses]) => ({
          category,
          displayName: getCategoryDisplayName(category),
          expenses,
          total: expenses.reduce((sum: number, exp: ExpenseItem) => sum + exp.amount, 0)
        })),
        total: expenseDetails.elevator.reduce((sum: number, exp: ExpenseItem) => sum + exp.amount, 0)
      };
    }
    
    // Process heating expenses
    if (expenseDetails.heating.length > 0) {
      const heatingGrouped: Record<string, ExpenseItem[]> = {};
      expenseDetails.heating.forEach((expense: ExpenseItem) => {
        const category = expense.category || 'heating_fuel';
        if (!heatingGrouped[category]) {
          heatingGrouped[category] = [];
        }
        heatingGrouped[category].push(expense);
      });
      
      grouped['heating'] = {
        expenses: Object.entries(heatingGrouped).map(([category, expenses]) => ({
          category,
          displayName: getCategoryDisplayName(category),
          expenses,
          total: expenses.reduce((sum: number, exp: ExpenseItem) => sum + exp.amount, 0)
        })),
        total: expenseDetails.heating.reduce((sum: number, exp: ExpenseItem) => sum + exp.amount, 0)
      };
    }
    
    // Process equal share expenses
    if (expenseDetails.equal_share.length > 0) {
      const equalShareGrouped: Record<string, ExpenseItem[]> = {};
      expenseDetails.equal_share.forEach((expense: ExpenseItem) => {
        const category = expense.category || 'special_contribution';
        if (!equalShareGrouped[category]) {
          equalShareGrouped[category] = [];
        }
        equalShareGrouped[category].push(expense);
      });
      
      grouped['equal_share'] = {
        expenses: Object.entries(equalShareGrouped).map(([category, expenses]) => ({
          category,
          displayName: getCategoryDisplayName(category),
          expenses,
          total: expenses.reduce((sum: number, exp: ExpenseItem) => sum + exp.amount, 0)
        })),
        total: expenseDetails.equal_share.reduce((sum: number, exp: ExpenseItem) => sum + exp.amount, 0)
      };
    }
    
    // Process individual expenses
    if (expenseDetails.individual.length > 0) {
      grouped['individual'] = {
        expenses: expenseDetails.individual.map((expense: ExpenseItem) => ({
          category: expense.category || 'individual_charge',
          displayName: getCategoryDisplayName(expense.category || 'individual_charge'),
          expenses: [expense],
          total: expense.amount
        })),
        total: expenseDetails.individual.reduce((sum: number, exp: ExpenseItem) => sum + exp.amount, 0)
      };
    }
    
    return grouped;
  };

  // Get building management fee information
  const getManagementFeeInfo = () => {
    // Get management fee from props or state
    const stateManagementFee = state.advancedShares?.management_fee_per_apartment || 0;
    const finalManagementFee = stateManagementFee > 0 ? stateManagementFee : managementFeePerApartment;
    const apartmentsCount = Object.keys(state.shares).length;
    const totalManagementFee = finalManagementFee * apartmentsCount;
    
    return {
      feePerApartment: finalManagementFee,
      totalFee: totalManagementFee,
      apartmentsCount: apartmentsCount,
      hasFee: finalManagementFee > 0
    };
  };

  // Get reserve fund information
  const getReserveFundDetails = () => {
    const reserveFundInfo = getReserveFundInfo();
    const apartmentsCount = Object.keys(state.shares).length;
    
    return {
      monthlyAmount: Number(reserveFundInfo.monthlyAmount || 0),
      totalContribution: Number(reserveFundInfo.totalContribution || 0),
      displayText: reserveFundInfo.displayText,
      goal: Number(reserveFundInfo.goal || 0),
      duration: Number(reserveFundInfo.duration || 0),
      apartmentsCount: apartmentsCount,
      hasReserve: reserveFundInfo.totalContribution > 0
    };
  };

  const calculateExpenseBreakdown = () => {
    const breakdown = {
      common: 0,
      elevator: 0,
      heating: 0,
      other: 0,
      coownership: 0
    };

    // Use real expense data from advanced shares if available
    if (state.advancedShares && state.advancedShares.expense_totals) {
      const expenseTotals = state.advancedShares.expense_totals;
      
      // Map backend categories to our display categories
      // Note: Backend includes management fees in general expenses, so we need to separate them
      const managementFeeInfo = getManagementFeeInfo();
      const totalManagementFees = managementFeeInfo.totalFee;
      
      // Subtract management fees from general expenses to get pure common expenses
      breakdown.common = parseFloat(expenseTotals.general || 0) - totalManagementFees;
      breakdown.elevator = parseFloat(expenseTotals.elevator || 0);
      breakdown.heating = parseFloat(expenseTotals.heating || 0);
      breakdown.other = parseFloat(expenseTotals.equal_share || 0);
      breakdown.coownership = parseFloat(expenseTotals.individual || 0);
      
      return breakdown;
    }

    // Calculate totals from shares breakdown (fallback)
    Object.values(state.shares).forEach((share: any) => {
      if (share.breakdown && typeof share.breakdown === 'object') {
        // Handle new breakdown format from advanced calculator
        if (share.breakdown.general_expenses !== undefined) {
          breakdown.common += parseFloat(share.breakdown.general_expenses || 0);
          breakdown.elevator += parseFloat(share.breakdown.elevator_expenses || 0);
          breakdown.heating += parseFloat(share.breakdown.heating_expenses || 0);
          breakdown.other += parseFloat(share.breakdown.equal_share_expenses || 0);
          breakdown.coownership += parseFloat(share.breakdown.individual_expenses || 0);
        } else if (Array.isArray(share.breakdown)) {
          // Handle legacy array format
          share.breakdown.forEach((item: any) => {
            const category = item.expense_category?.toLowerCase() || 'other';
            if (category.includes('καθαριότητα') || category.includes('κοινοχρήστα')) {
              breakdown.common += item.apartment_share || 0;
            } else if (category.includes('ανελκυστήρα') || category.includes('ανελκυστήρας')) {
              breakdown.elevator += item.apartment_share || 0;
            } else if (category.includes('θέρμανση') || category.includes('θερμάνση')) {
              breakdown.heating += item.apartment_share || 0;
            } else if (category.includes('συνιδιοκτησία')) {
              breakdown.coownership += item.apartment_share || 0;
            } else {
              breakdown.other += item.apartment_share || 0;
            }
          });
        }
      }
    });

    // Last resort fallback to proportional split only if no real data exists
    if (Object.values(breakdown).every(val => val === 0) && state.totalExpenses > 0) {
      const totalExpenses = state.totalExpenses;
      
      breakdown.common = totalExpenses * 0.3; // 30% for common expenses
      breakdown.elevator = totalExpenses * 0.2; // 20% for elevator
      breakdown.heating = totalExpenses * 0.3; // 30% for heating
      breakdown.other = totalExpenses * 0.2; // 20% for other expenses
      breakdown.coownership = 0; // 0% for co-ownership
    }

    return breakdown;
  };

  const getReserveFundInfo = () => {
    // Prefer backend-provided goal/duration; fallback to localStorage (from BuildingOverviewSection)
    const goalFromState = Number(state.advancedShares?.reserve_fund_goal || 0);
    const durationFromState = Number(state.advancedShares?.reserve_fund_duration || 0);
    const perApartmentContribution = Number(state.advancedShares?.reserve_contribution || reserveContributionPerApartment || 0);
    const apartmentsCount = Object.keys(state.shares).length;

    const getStorageKey = (key: string) => `reserve_fund_${buildingId}_${key}`;
    const getFromStorage = (key: string, defaultValue: any = null) => {
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem(getStorageKey(key)) : null;
        return raw ? JSON.parse(raw) : defaultValue;
      } catch {
        return defaultValue;
      }
    };

    const savedGoal = Number(getFromStorage('goal', 0));
    const savedDuration = Number(getFromStorage('duration_months', 0));
    const savedMonthlyTarget = Number(getFromStorage('monthly_target', 0));
    const savedStartDate = getFromStorage('start_date', null);

    const reserveFundGoal = goalFromState > 0 ? goalFromState : savedGoal;
    const reserveFundDuration = durationFromState > 0 ? durationFromState : (savedDuration > 0 ? savedDuration : 0);

    let monthlyAmount = 0;
    let totalContribution = 0;
    let displayText = '';

    if (reserveFundGoal > 0 && reserveFundDuration > 0) {
      monthlyAmount = reserveFundGoal / reserveFundDuration;
      totalContribution = reserveFundGoal; // συνολικός στόχος κτιρίου
      displayText = `Στόχος ${formatAmount(reserveFundGoal)}€ σε ${reserveFundDuration} δόσεις = ${formatAmount(monthlyAmount)}€`;
    } else if (savedMonthlyTarget > 0 && savedDuration > 0) {
      // Χρήση αποθηκευμένου monthly target (goal/duration από Overview)
      monthlyAmount = savedMonthlyTarget;
      totalContribution = savedMonthlyTarget * savedDuration;
      displayText = `Μηνιαία δόση ${formatAmount(monthlyAmount)}€ για ${savedDuration} μήνες`;
    } else if (perApartmentContribution > 0) {
      // Fallback: per-apartment contribution → συνολική μηνιαία δόση κτιρίου
      monthlyAmount = perApartmentContribution * apartmentsCount;
      totalContribution = monthlyAmount * (reserveFundDuration > 0 ? reserveFundDuration : 1);
      displayText = `Μηνιαία εισφορά αποθεματικού`;
    }

    // Progress / months remaining based on timeline
    const now = new Date();
    const startDate = savedStartDate ? new Date(savedStartDate) : now;
    const monthsElapsed = Math.max(0, (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth()));
    const monthsRemaining = Math.max(0, (reserveFundDuration > 0 ? reserveFundDuration : savedDuration) - monthsElapsed);

    // Actual reserve collected (separate from current balance)
    const actualReserveCollected = Number(state.advancedShares?.actual_reserve_collected || 0);
    const progressPercentage = reserveFundGoal > 0 ? Math.min(100, Math.max(0, (actualReserveCollected / reserveFundGoal) * 100)) : 0;

    return {
      monthlyAmount,
      totalContribution,
      displayText,
      goal: reserveFundGoal,
      duration: (reserveFundDuration > 0 ? reserveFundDuration : savedDuration),
      monthsRemaining,
      actualReserveCollected,
      progressPercentage
    };
  };

  const expenseBreakdown = calculateExpenseBreakdown();
  const expenseDetails = getExpenseDetails();
  const reserveFundInfo = getReserveFundInfo();
  const managementFeeInfo = getManagementFeeInfo();
  const reserveFundDetails = getReserveFundDetails();

  // Owner expenses (equal share + coownership) total used to decide visibility of owner columns/section
  const ownerExpensesTotalDisplay = toNumber(expenseBreakdown.other || 0) + toNumber(expenseBreakdown.coownership || 0);
  const showOwnerExpenses = ownerExpensesTotalDisplay > 0;


  

  
  // Calculate total expenses - εμφανιστικό σύνολο modal
  const basicExpenses = Number(expenseBreakdown.common || 0) + Number(expenseBreakdown.elevator || 0) + Number(expenseBreakdown.heating || 0) + Number(expenseBreakdown.other || 0) + Number(expenseBreakdown.coownership || 0);
  const hasOtherExpenses = expenseBreakdown.heating > 0 || expenseBreakdown.elevator > 0 || expenseBreakdown.other > 0 || expenseBreakdown.coownership > 0;
  // Το σύνολο δαπανών = βασικές + διαχείριση + (αποθεματικό αν ισχύει)
  const totalExpenses = Number(basicExpenses) + Number(managementFeeInfo.totalFee || 0) + (hasOtherExpenses ? Number(reserveFundDetails.monthlyAmount || 0) : 0);

  const handlePrint = () => {
    window.print();
  };



  const handleExport = async (format: 'pdf' | 'excel') => {
    
    try {
      if (format === 'pdf') {
        exportToPDF();
      } else if (format === 'excel') {
        exportToExcel();
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Σφάλμα κατά την εξαγωγή');
    }
  };

  const exportToPDF = async () => {
    if (typeof window === 'undefined') {
      toast.error('Η εξαγωγή PDF δεν είναι διαθέσιμη στον server');
      return;
    }

    try {
      // Use existing jsPDF with html2canvas for better compatibility
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      // Force recalculation of all derived values to ensure fresh data
      const currentState = state; // Get current state
      const currentExpenseBreakdown = calculateExpenseBreakdown();
      const currentReserveFundInfo = getReserveFundInfo();
      const currentManagementFeeInfo = getManagementFeeInfo();
      const currentTotalsFromRows = totalsFromRows;
      const currentPerApartmentAmounts = perApartmentAmounts;
      

      
      // Prepare data for rendering with fresh calculations
      const currentDate = getCurrentDate();
      const paymentDueDate = getPaymentDueDate();
      const period = getPeriodInfo();
      const groupedExpenses = getGroupedExpenses();
      const apartmentCount = Object.keys(currentState.shares).length;
      
      // Calculate total expenses with fresh data
      // Οι δαπάνες διαχείρισης είναι ξεχωριστές από τις γενικές δαπάνες
      
      // Όταν υπάρχουν μόνο δαπάνες διαχείρισης, δεν προσθέτουμε ξανά το managementFeeInfo.totalFee
      const currentHasOtherExpenses = currentExpenseBreakdown.heating > 0 || currentExpenseBreakdown.elevator > 0 || currentExpenseBreakdown.other > 0 || currentExpenseBreakdown.coownership > 0;
      
      const currentTotalExpenses = Object.values(currentExpenseBreakdown).reduce((sum, val) => sum + val, 0) + 
                                  currentReserveFundInfo.totalContribution + 
                                  (currentHasOtherExpenses ? currentManagementFeeInfo.totalFee : 0);
      
      // Fallback: use state.totalExpenses if calculated total is 0
      const finalTotalExpenses = currentTotalExpenses > 0 ? currentTotalExpenses : state.totalExpenses;
      

      
      // Enhanced HTML content with better styling and structure
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="el">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Φύλλο Κοινοχρήστων - ${period}</title>
          <style>
            @page { 
              size: A4 landscape; 
              margin: 0.3in; 
            }
            
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              font-size: 11pt; 
              line-height: 1.4;
              color: #2d3748; 
              background: white;
            }
            
            /* Header Section - Compact Single Line */
            .header { 
              margin-bottom: 10px; 
              padding: 8px 15px;
              border-bottom: 2px solid #2563eb; 
              background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
              border-radius: 6px;
            }
            
            .brand { 
              font-size: 11pt; 
              font-weight: 700; 
              color: #2563eb; 
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .main-title { 
              font-size: 18px; 
              font-weight: 700; 
              color: #1e293b; 
            }
            
            .period { 
              font-size: 18px; 
              font-weight: 600; 
              color: #0f172a; 
              background: #e0e7ff;
              padding: 4px 10px;
              border-radius: 12px;
            }
            
            .timestamp {
              font-size: 9pt;
              color: #475569;
              font-style: italic;
              background: #f1f5f9;
              padding: 3px 8px;
              border-radius: 10px;
              border: 1px solid #e2e8f0;
            }
            
            /* Information Table - Compact */
            .info-section {
              margin: 15px 0;
            }
            
            .info-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 8px 0;
              box-shadow: 0 1px 4px rgba(0,0,0,0.1);
              border-radius: 6px;
              overflow: hidden;
            }
            
            .info-table th, .info-table td { 
              border: 1px solid #e2e8f0; 
              padding: 6px 10px; 
              text-align: left; 
            }
            
            .info-table th { 
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              color: white; 
              font-weight: 600; 
              width: 30%;
              font-size: 8pt;
            }
            
            .info-table td {
              background: #ffffff;
              font-weight: 500;
              font-size: 8pt;
            }
            
            /* Section Titles - Compact */
            .section-title { 
              font-size: 11pt; 
              font-weight: 700; 
              color: #1e293b; 
              margin: 12px 0 8px 0; 
              padding: 4px 0 3px 10px;
              border-bottom: 2px solid #3b82f6; 
              background: linear-gradient(90deg, #f1f5f9 0%, transparent 100%);
            }
            
            /* Expenses Section */
            .expense-container {
              background: #f8fafc;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              border-left: 5px solid #f59e0b;
            }
            
            .no-expenses { 
              font-style: italic; 
              color: #64748b; 
              text-align: center; 
              padding: 30px;
              background: #fef3c7;
              border-radius: 8px;
              border: 2px dashed #f59e0b;
            }
            
            .expense-item {
              margin: 12px 0;
              padding: 8px 12px;
              background: white;
              border-radius: 6px;
              border-left: 3px solid #3b82f6;
            }
            
            .expense-item strong {
              color: #1e293b;
              font-size: 11pt;
            }
            
            .expense-subitem {
              margin-left: 25px;
              font-size: 9pt;
              color: #475569;
              padding: 4px 0;
            }
            
            /* Total Amount Highlight */
            .total-highlight { 
              margin: 25px 0; 
              padding: 15px; 
              background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
              color: white; 
              text-align: center;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
            }
            
            .total-highlight strong {
              font-size: 14pt;
              text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
            }
            
            /* Analysis Table - Optimized */
            .analysis-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 8px 0; 
              font-size: 6pt;
              background: white;
              box-shadow: 0 1px 4px rgba(0,0,0,0.1);
            }
            
            .analysis-table th, .analysis-table td { 
              border: 1px solid #cbd5e1; 
              text-align: center; 
              vertical-align: middle;
            }
            
            .analysis-table th { 
              background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
              color: white; 
              font-weight: 600;
              font-size: 7pt;
              padding: 6px 3px;
              height: 25px;
            }
            
            .analysis-table td {
              padding: 4px 2px;
              height: 20px;
              font-size: 6pt;
            }
            
            .analysis-table .amount-cell {
              font-weight: 600;
              font-size: 6.5pt;
            }
            
            .analysis-table .total-amount-cell {
              font-weight: 700;
              font-size: 7pt;
              background: #f0f9ff !important;
              color: #2563eb;
            }
            
            .analysis-table .name-cell {
              text-align: left !important;
              padding-left: 6px !important;
            }
            
            .analysis-table tr:nth-child(even) {
              background: #f8fafc;
            }
            
            .analysis-table tr:hover {
              background: #e0e7ff;
            }
            
            .totals-row { 
              background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%) !important;
              font-weight: 700;
              border-top: 2px solid #3b82f6;
            }
            
            .totals-row td {
              font-weight: 700;
              color: #1e293b;
              padding: 5px 2px;
              height: 22px;
              font-size: 7pt;
            }
            
            /* Footer */
            .footer { 
              margin-top: 20px; 
              padding-top: 15px; 
              border-top: 2px solid #e2e8f0;
              background: #f8fafc;
              border-radius: 8px;
              padding: 15px;
            }
            
            .footer .info-table th {
              background: linear-gradient(135deg, #64748b 0%, #475569 100%);
            }
            
            /* Utility Classes */
            .text-left { text-align: left !important; }
            .text-right { text-align: right !important; }
            .font-bold { font-weight: 700; }
            .text-primary { color: #2563eb; }
            
            /* Print Optimizations */
            @media print {
              body { font-size: 10pt; }
              .header { break-inside: avoid; }
              .section-title { break-after: avoid; }
              .analysis-table { font-size: 6pt; }
            }
            
            /* Ensure single page layout */
            body {
              max-height: 210mm; /* A4 landscape height */
              overflow: hidden;
            }
            
            .analysis-table {
              page-break-inside: avoid;
            }
            
            .info-section {
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>
          <!-- Header Section - Single Line -->
          <div class="header">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 15px;">
                <div class="brand">Digital Concierge App</div>
            <div class="main-title">Φύλλο Κοινοχρήστων</div>
            <div class="period">${period}</div>
              </div>
              <div class="timestamp">
                ⏰ ${new Date().toLocaleString('el-GR', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
          
          <!-- Building Information and Expenses Side by Side -->
          <div class="info-section" style="display: flex; gap: 15px; margin: 8px 0;">
            <!-- Left Column - Building Info -->
            <div style="flex: 1;">
            <table class="info-table">
              <tr><th>🏢 ΠΟΛΥΚΑΤΟΙΚΙΑ</th><td>${buildingName}</td></tr>
              <tr><th>📅 ΜΗΝΑΣ</th><td>${period}</td></tr>
              <tr><th>👤 ΔΙΑΧΕΙΡΙΣΤΗΣ</th><td>Διαχειριστής Κτιρίου</td></tr>
              <tr><th>⏰ ΛΗΞΗ ΠΛΗΡΩΜΗΣ</th><td>${paymentDueDate}</td></tr>
              <tr><th>📝 ΠΑΡΑΤΗΡΗΣΕΙΣ</th><td>ΕΙΣΠΡΑΞΗ ΚΟΙΝΟΧΡΗΣΤΩΝ: ΔΕΥΤΕΡΑ & ΤΕΤΑΡΤΗ ΑΠΟΓΕΥΜΑ</td></tr>
            </table>
          </div>
          
            <!-- Right Column - Expenses Summary -->
            <div style="flex: 1;">
              <div style="background: #f8fafc; border-radius: 6px; padding: 8px; border-left: 3px solid #f59e0b;">
                <h3 style="font-size: 9pt; font-weight: 700; color: #1e293b; margin-bottom: 8px; text-align: center;">📊 ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ</h3>
                
            ${(() => {
              let expenseHtml = '';
              
              // Existing grouped expenses
              if (Object.keys(groupedExpenses).length === 0) {
                expenseHtml = '<div style="font-style: italic; color: #64748b; text-align: center; padding: 20px;">❌ Δεν βρέθηκαν δαπάνες</div>';
              } else {
                Object.entries(groupedExpenses).map(([groupKey, groupData]: [string, any]) => {
                  const groupLabels: Record<string, string> = {
                    'general': 'Α. ΚΟΙΝΟΧΡΗΣΤΑ',
                    'elevator': 'Β.  ΑΝΕΛΚΥΣΤΗΡΑΣ', 
                    'heating': 'Γ. ΘΕΡΜΑΝΣΗ',
                    'equal_share': 'Δ. ΛΟΙΠΑ ΕΞΟΔΑ',
                    'individual': 'Ε. ΕΞΟΔΑ ΣΥΝΙΔΙΟΚΤΗΣΙΑΣ'
                  };
                  
                  expenseHtml += `<div style="margin: 4px 0; padding: 3px 6px; background: white; border-radius: 4px; border-left: 2px solid #3b82f6;">
                    <strong style="color: #1e293b; font-size: 7pt;">${groupLabels[groupKey]}: ${formatAmount(groupData.total)}€</strong>`;
                  
                  if (groupData.expenses && groupData.expenses.length > 0) {
                    groupData.expenses.forEach((category: any, index: number) => {
                      expenseHtml += `<div style="margin-left: 10px; font-size: 6pt; color: #475569; padding: 1px 0;">
                        ${index + 1}. ${category.displayName}: ${formatAmount(category.total)}€</div>`;
                    });
                  }
                  expenseHtml += `</div>`;
                });
              }
              
              // Add management fees
              if (currentManagementFeeInfo.hasFee) {
                expenseHtml += `<div style="margin: 4px 0; padding: 3px 6px; background: white; border-radius: 4px; border-left: 2px solid #10b981;">
                  <strong style="color: #1e293b; font-size: 7pt;">ΣΤ. ΔΑΠΑΝΕΣ ΔΙΑΧΕΙΡΙΣΗΣ: ${formatAmount(currentManagementFeeInfo.totalFee)}€</strong>
                </div>`;
              }
              

              
              return expenseHtml;
            })()}
                
                <!-- Total Amount Highlight -->
                <div style="margin: 8px 0; padding: 6px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; text-align: center; border-radius: 4px;">
                  <strong style="font-size: 8pt;">💰 ΣΥΝΟΛΟ: ${formatAmount(finalTotalExpenses)}€</strong>
                </div>
              </div>
            </div>
          </div>

          
          <!-- Apartments Analysis -->
          <div class="section-title">🏠 ΑΝΑΛΥΣΗ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ <span style="font-size: 9pt; font-style: italic; color: #666;"> </span></div>
          
          <table class="analysis-table">
            <thead>
              <tr>
                <th rowspan="2" style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);">Α/Δ</th>
                <th rowspan="2" style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);">ΟΝΟΜΑΤΕΠΩΝΥΜΟ</th>
                <th colspan="3" style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);">ΧΙΛΙΟΣΤΑ ΣΥΜΜΕΤΟΧΗΣ</th>
                <th colspan="3" style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);">ΔΑΠΑΝΕΣ ΕΝΟΙΚΙΑΣΤΩΝ</th>
                <th colspan="3" style="background: linear-gradient(135deg, #059669 0%, #047857 100%);">ΔΑΠΑΝΕΣ ΙΔΙΟΚΤΗΤΩΝ</th>
                <th rowspan="2" style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);">ΠΛΗΡΩΤΕΟ<br/>ΠΟΣΟ</th>
                <th rowspan="2" style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);">A/A</th>
              </tr>
              <tr>
                <th style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); font-size: 10px; width: 80px;">ΚΟΙΝΟΧΡΗΣΤΑ</th>
                <th style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); font-size: 10px; width: 80px;">ΑΝΕΛΚ/ΡΑΣ</th>
                <th style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); font-size: 10px; width: 80px;">ΘΕΡΜΑΝΣΗ</th>
                <th style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); font-size: 10px; width: 80px;">ΚΟΙΝΟΧΡΗΣΤΑ</th>
                <th style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); font-size: 10px; width: 80px;">ΑΝΕΛΚ/ΡΑΣ</th>
                <th style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); font-size: 10px; width: 80px;">ΘΕΡΜΑΝΣΗ</th>
                <th style="background: linear-gradient(135deg, #059669 0%, #047857 100%); font-size: 10px; width: 80px;">ΚΟΙΝΟΧΡΗΣΤΑ</th>
                <th style="background: linear-gradient(135deg, #059669 0%, #047857 100%); font-size: 10px; width: 80px;">ΑΝΕΛΚ/ΡΑΣ</th>
                <th style="background: linear-gradient(135deg, #059669 0%, #047857 100%); font-size: 10px; width: 80px;">ΘΕΡΜΑΝΣΗ</th>
              </tr>
            </thead>
            <tbody>
              ${Object.values(currentState.shares).map((share: any, index: number) => {
                const participationMills = toNumber(share.participation_mills);
                const row = currentPerApartmentAmounts[share.apartment_id] || { common:0, elevator:0, heating:0, other:0, coowner:0, reserve:0, total_due:0 };
                
                const expenseBreakdownValues = {
                  common: toNumber(currentExpenseBreakdown.common),
                  elevator: toNumber(currentExpenseBreakdown.elevator),
                  heating: toNumber(currentExpenseBreakdown.heating),
                  other: toNumber(currentExpenseBreakdown.other),
                  coownership: toNumber(currentExpenseBreakdown.coownership)
                };
                
                const apartmentData = aptWithFinancial.find(apt => apt.id === share.apartment_id);
                const commonMills = apartmentData?.participation_mills ?? participationMills;
                const elevatorMills = apartmentData?.participation_mills ?? participationMills;
                const heatingMills = apartmentData?.heating_mills ?? participationMills;
                
                const managementFee = toNumber(currentManagementFeeInfo.feePerApartment);
                const currentReserveFundDetails = getReserveFundDetails();
                const apartmentReserveFund = toNumber(currentReserveFundDetails.monthlyAmount) * (toNumber(participationMills) / 1000);
                
                // Χρήση πραγματικών δεδομένων από το backend breakdown
                const breakdown = share.breakdown || {};
                const commonAmount = toNumber(breakdown.general_expenses || 0);
                const elevatorAmount = toNumber(breakdown.elevator_expenses || 0);
                const heatingAmount = toNumber(breakdown.heating_expenses || 0);
                const equalShareAmount = toNumber(breakdown.equal_share_expenses || 0);
                const reserveFundAmount = toNumber(breakdown.reserve_fund_contribution || 0);
                
                const totalAmount = commonAmount + elevatorAmount + heatingAmount + equalShareAmount + reserveFundAmount;
                const totalWithFees = totalAmount + managementFee;
                const finalTotalWithFees = isNaN(totalWithFees) ? 0 : totalWithFees;
                const heatingBreakdown = share.heating_breakdown || { ei: 0, fi: 0, calories: 0 };
                const otherMills = participationMills * (expenseBreakdownValues.other / finalTotalExpenses || 0);
                const coownerMills = participationMills * (expenseBreakdownValues.coownership / finalTotalExpenses || 0);
                
                return `<tr>
                  <td class="font-bold text-primary">${share.identifier || share.apartment_number}</td>
                  <td class="name-cell">${share.owner_name || 'Μη καταχωρημένος'}</td>
                                      <td>${toNumber(commonMills).toFixed(2)}</td>
                    <td>${toNumber(elevatorMills).toFixed(2)}</td>
                    <td>${toNumber(heatingMills).toFixed(2)}</td>
                  <td class="amount-cell">${formatAmount(commonAmount)}</td>
                  <td class="amount-cell">${formatAmount(elevatorAmount)}</td>
                  <td class="amount-cell">${formatAmount(heatingAmount)}</td>
                  <td class="amount-cell">${formatAmount(equalShareAmount)}</td>
                  <td class="amount-cell">${formatAmount(0)}</td>
                  <td class="amount-cell">${formatAmount(reserveFundAmount)}</td>
                  <td class="total-amount-cell">${formatAmount(finalTotalWithFees)}</td>
                  <td>${index + 1}</td>
                </tr>`;
              }).join('')}
              
              <tr class="totals-row">
                <td class="font-bold">ΣΥΝΟΛΑ</td>
                <td class="name-cell" style="font-weight: 600;"></td>
                <td>${Object.values(currentState.shares).reduce((sum: number, s: any) => {
                  const apartmentData = aptWithFinancial.find(apt => apt.id === s.apartment_id);
                  const commonMills = apartmentData?.participation_mills ?? toNumber(s.participation_mills);
                  return sum + commonMills;
                }, 0).toFixed(2)}</td>
                <td>${Object.values(currentState.shares).reduce((sum: number, s: any) => {
                  const apartmentData = aptWithFinancial.find(apt => apt.id === s.apartment_id);
                  const elevatorMills = apartmentData?.participation_mills ?? toNumber(s.participation_mills);
                  return sum + elevatorMills;
                }, 0).toFixed(2)}</td>
                <td>${Object.values(currentState.shares).reduce((sum: number, s: any) => {
                  const apartmentData = aptWithFinancial.find(apt => apt.id === s.apartment_id);
                  const heatingMills = apartmentData?.heating_mills ?? toNumber(s.participation_mills);
                  return sum + heatingMills;
                }, 0).toFixed(2)}</td>
                <td class="amount-cell">${formatAmount(currentExpenseBreakdown.common)}</td>
                <td class="amount-cell">${formatAmount(currentExpenseBreakdown.elevator)}</td>
                <td class="amount-cell">${formatAmount(currentExpenseBreakdown.heating)}</td>
                <td class="amount-cell">${formatAmount(currentExpenseBreakdown.other)}</td>
                <td class="amount-cell">${formatAmount(currentExpenseBreakdown.coownership)}</td>
                <td class="amount-cell">${formatAmount(currentReserveFundInfo.totalContribution)}</td>
                <td class="total-amount-cell">${formatAmount(finalTotalExpenses)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
          
        </body>
        </html>
      `;
      
      // Create temporary element for rendering
      console.log('Creating temporary DOM element...');
      const element = document.createElement('div');
      element.innerHTML = htmlContent;
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.top = '0';
      element.style.width = '350mm'; // A4 landscape width with extra space for new columns
      element.style.backgroundColor = 'white';
      element.style.fontFamily = 'Arial, sans-serif';
      element.style.fontSize = '11pt';
      element.style.lineHeight = '1.4';
      document.body.appendChild(element);
      console.log('Element added to DOM. Content length:', htmlContent.length, 'characters');
      
      // Wait a moment for DOM to settle
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Configure html2canvas options for better Greek text rendering
      const canvasOptions = {
        scale: 1.5, // Reduced scale for better performance
        useCORS: true,
        letterRendering: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: true, // Enable logging to debug
        width: 1400, // A4 landscape width in pixels at 96 DPI
        height: element.scrollHeight,
        removeContainer: true,
        imageTimeout: 30000, // 30 second timeout
        ignoreElements: (element: any) => {
          // Skip elements that cause document.write warnings
          return element.tagName === 'SCRIPT' || element.tagName === 'NOSCRIPT';
        }
      };
      
      // Convert HTML to canvas
      console.log('Starting html2canvas conversion...');
      const canvas = await html2canvas(element, canvasOptions);
      console.log('html2canvas completed. Canvas dimensions:', canvas.width, 'x', canvas.height);
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      console.log('Canvas converted to image data. Size:', imgData.length, 'characters');
      
      // Create PDF in landscape format
      console.log('Creating PDF...');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      console.log('PDF instance created');
      
      // Calculate dimensions for landscape A4
      const imgWidth = 350; // A4 landscape width in mm with extra space for new columns
      const pageHeight = 210; // A4 landscape height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add image to PDF (handle multiple pages if needed)
      console.log('Adding image to PDF. Dimensions:', imgWidth, 'x', imgHeight, 'mm');
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      let pageCount = 1;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pageCount++;
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      console.log('PDF created with', pageCount, 'pages');
      
      // Save PDF with timestamp - use safe filename without Greek characters
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      const safePeriod = period.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
      const fileName = `common_expenses_sheet_${safePeriod}_${dateStr}_${timeStr}.pdf`;
      console.log('Saving PDF as:', fileName);
      pdf.save(fileName);
      console.log('PDF save command executed');
      
      // Cleanup
      document.body.removeChild(element);
      
      toast.success('✅ Το PDF εξήχθη επιτυχώς!', {
        description: `Αρχείο: ${fileName}`
      });
      
    } catch (error) {
      console.error('PDF Export Error Details:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Cleanup element if it exists
      try {
        const existingElement = document.querySelector('[style*="-9999px"]');
        if (existingElement) {
          document.body.removeChild(existingElement);
        }
      } catch (cleanupError) {
        console.warn('Cleanup error:', cleanupError);
      }
      
      toast.error('❌ Σφάλμα κατά την εξαγωγή PDF', {
        description: `Σφάλμα: ${error instanceof Error ? error.message : 'Άγνωστο σφάλμα'}`
      });
    }
  };

  const exportToExcel = async () => {
    // Ensure we're running on the client side
    if (typeof window === 'undefined') {
      toast.error('Η εξαγωγή Excel δεν είναι διαθέσιμη στον server');
      return;
    }

    try {
      // Dynamic import of xlsx and file-saver to avoid SSR issues
      const XLSX = await import('xlsx');
      const fileSaver = await import('file-saver');
      const { saveAs } = fileSaver;
      
      // Προετοιμασία δεδομένων
      const workbook = XLSX.utils.book_new();
    
    // Κύριο φύλλο με τα δεδομένα
    const mainData = Object.values(state.shares).map((share: any, index: number) => {
      const participationMills = toNumber(share.participation_mills);
      const totalMills = Object.values(state.shares).reduce((sum: number, s: any) => sum + toNumber(s.participation_mills), 0);
      const participationPercentage = totalMills > 0 ? (participationMills / totalMills) * 1000 : 0;
      const row = perApartmentAmounts[share.apartment_id] || { common:0, elevator:0, heating:0, other:0, coowner:0, total_due:0 };
      
      // Χιλιοστά συμμετοχής από τα δεδομένα του κτιρίου
      const apartmentData = aptWithFinancial.find(apt => apt.id === share.apartment_id);
      const commonMills = apartmentData?.participation_mills ?? participationMills;
      const elevatorMills = apartmentData?.participation_mills ?? participationMills;
      const heatingMills = apartmentData?.heating_mills ?? participationMills;
      
      // Προσθήκη δαπανών διαχείρισης και αποθεματικού
      const managementFee = toNumber(managementFeeInfo.feePerApartment);
      const apartmentReserveFund = (expenseBreakdown.heating > 0 || expenseBreakdown.elevator > 0 || expenseBreakdown.other > 0 || expenseBreakdown.coownership > 0)
        ? toNumber(reserveFundDetails.monthlyAmount) * (toNumber(participationMills) / 1000)
        : 0;
      // Χρήση πραγματικών δεδομένων από το backend breakdown
      const breakdown = share.breakdown || {};
      const commonAmount = toNumber(breakdown.general_expenses || 0);
      const elevatorAmount = toNumber(breakdown.elevator_expenses || 0);
      const heatingAmount = toNumber(breakdown.heating_expenses || 0);
      const totalAmount = commonAmount + elevatorAmount + heatingAmount;
      const totalWithFees = totalAmount + managementFee + apartmentReserveFund;
      const finalTotalWithFees = isNaN(totalWithFees) ? 0 : totalWithFees;
      
      // Θέρμανση breakdown (ei, fi, θερμίδες)
      const heatingBreakdown = share.heating_breakdown || { ei: 0, fi: 0, calories: 0 };
      const otherMills = participationMills * (expenseBreakdown.other / totalExpenses || 0);
      const coownerMills = participationMills * (expenseBreakdown.coownership / totalExpenses || 0);
      
      return {
        'Α/Δ': share.identifier || share.apartment_number,
        'ΟΝΟΜΑΤΕΠΩΝΥΜΟ': share.owner_name || 'Μη καταχωρημένος',
        'ΧΙΛΙΟΣΤΑ_ΚΟΙΝΟΧΡΗΣΤΑ': toNumber(commonMills).toFixed(2),
        'ΧΙΛΙΟΣΤΑ_ΑΝΕΛΚ/ΡΑΣ': toNumber(elevatorMills).toFixed(2),
        'ΧΙΛΙΟΣΤΑ_ΘΕΡΜΑΝΣΗ': toNumber(heatingMills).toFixed(2),
        'ΠΟΣΟ_ΚΟΙΝΟΧΡΗΣΤΑ_ΕΝΟΙΚΙΑΣΤΩΝ': commonAmount,
        'ΠΟΣΟ_ΑΝΕΛΚ/ΡΑΣ_ΕΝΟΙΚΙΑΣΤΩΝ': elevatorAmount,
        'ΠΟΣΟ_ΘΕΡΜΑΝΣΗ_ΕΝΟΙΚΙΑΣΤΩΝ': heatingAmount,
        'ΠΟΣΟ_ΔΙΑΧΕΙΡΙΣΗ_ΕΝΟΙΚΙΑΣΤΩΝ': managementFee,
        'ΠΟΣΟ_ΚΟΙΝΟΧΡΗΣΤΑ_ΙΔΙΟΚΤΗΤΩΝ': 0,
        'ΠΟΣΟ_ΑΝΕΛΚ/ΡΑΣ_ΙΔΙΟΚΤΗΤΩΝ': 0,
        'ΠΟΣΟ_ΘΕΡΜΑΝΣΗ_ΙΔΙΟΚΤΗΤΩΝ': 0,
        'ΑΠΟΘΕΜΑΤΙΚΟ': apartmentReserveFund,
        'ΠΛΗΡΩΤΕΟ_ΠΟΣΟ': finalTotalWithFees,
        'A/A': index + 1
      };
    });
    
    const mainWorksheet = XLSX.utils.json_to_sheet(mainData);
    
    // Προσθήκη στατιστικών στο τέλος
    const statsData = [
      { 'ΣΤΑΤΙΣΤΙΚΑ': 'Συνολικές Δαπάνες', 'ΤΙΜΗ': `${formatAmount(totalExpenses)}€` },
      { 'ΣΤΑΤΙΣΤΙΚΑ': 'Αριθμός Διαμερισμάτων', 'ΤΙΜΗ': Object.keys(state.shares).length },
      { 'ΣΤΑΤΙΣΤΙΚΑ': 'Περίοδος', 'ΤΙΜΗ': getPeriodInfo() },
      { 'ΣΤΑΤΙΣΤΙΚΑ': 'Ημερομηνία Έκδοσης', 'ΤΙΜΗ': getCurrentDate() },
    ];
    
    // Προσθήκη δυναμικής ανάλυσης δαπανών
    const groupedExpenses = getGroupedExpenses();
    Object.entries(groupedExpenses).forEach(([groupKey, groupData]) => {
      const groupLabels = {
        'general': 'Α. ΚΟΙΝΟΧΡΗΣΤΑ',
        'elevator': 'Β.  ΑΝΕΛΚΥΣΤΗΡΑΣ',
        'heating': 'Γ. ΘΕΡΜΑΝΣΗ',
        'equal_share': 'Δ. ΛΟΙΠΑ ΕΞΟΔΑ',
        'individual': 'Ε. ΕΞΟΔΑ ΣΥΝΙΔΙΟΚΤΗΣΙΑΣ'
      };
      
      statsData.push({ 'ΣΤΑΤΙΣΤΙΚΑ': groupLabels[groupKey as keyof typeof groupLabels], 'ΤΙΜΗ': `${formatAmount(groupData.total)}€` });
      
      // Προσθήκη υποκατηγοριών
      groupData.expenses.forEach((category, index) => {
        statsData.push({ 
          'ΣΤΑΤΙΣΤΙΚΑ': `  ${index + 1}. ${category.displayName}`, 
          'ΤΙΜΗ': `${formatAmount(category.total)}€` 
        });
      });
    });
    
    // Προσθήκη δαπανών διαχείρισης
    if (managementFeeInfo.hasFee) {
      statsData.push({ 'ΣΤΑΤΙΣΤΙΚΑ': 'ΣΤ. ΔΑΠΑΝΕΣ ΔΙΑΧΕΙΡΙΣΗΣ', 'ΤΙΜΗ': `${formatAmount(managementFeeInfo.totalFee)}€` });
    }
    
    const statsWorksheet = XLSX.utils.json_to_sheet(statsData);
    
    // Προσθήκη φύλλων στο βιβλίο
    XLSX.utils.book_append_sheet(workbook, mainWorksheet, 'Κοινοχρήστα');
    XLSX.utils.book_append_sheet(workbook, statsWorksheet, 'Στατιστικά');
    
      // Αποθήκευση αρχείου
      const fileName = `κοινοχρηστα_${getPeriodInfo().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, fileName);
      
      toast.success('Εξαγωγή Excel ολοκληρώθηκε επιτυχώς!');
    } catch (error) {
      console.error('Excel Export Error:', error);
      toast.error('Σφάλμα κατά την εξαγωγή Excel');
    }
  };

  const validateData = () => {
    // Συγκεντρωτικά αθροίσματα ανά κατηγορία από τα rows (με σωστό χειρισμό διαχείρισης)
    let sumCommonPure = 0; // Γενικά χωρίς διαχείριση
    let sumElevator = 0;
    let sumHeating = 0;
    let sumOther = 0; // Ισόποσες/λοιπές
    let sumCoowner = 0; // Συνιδιοκτησίας/ατομικές
    let sumManagement = 0; // Διαχείριση (ισόποσα)
    let sumReserve = 0; // Αποθεματικό (όπως εμφανίζεται στις σειρές)
    
    Object.values(state.shares).forEach((share: any) => {
      const breakdown = share.breakdown || {};
      const mgmt = toNumber(breakdown.management_fee || 0);
      const general = toNumber(breakdown.general_expenses || 0);
      const commonPure = Math.max(0, general - mgmt);
      const elevator = toNumber(breakdown.elevator_expenses || 0);
      const heating = toNumber(breakdown.heating_expenses || 0);
      const other = toNumber(breakdown.equal_share_expenses || 0);
      const coowner = toNumber(breakdown.individual_expenses || 0);
      // Υπολογίζουμε το αποθεματικό όπως εμφανίζεται στον πίνακα (με βάση τα χιλιοστά),
      // όχι από το breakdown, καθώς συχνά δεν υφίσταται εκεί ως πεδίο.
      const participation = toNumber(share.participation_mills || 0);
      const reserve = hasOtherExpenses ? toNumber(reserveFundDetails.monthlyAmount || 0) * (participation / 1000) : 0;
      
      sumManagement += mgmt;
      sumCommonPure += commonPure;
      sumElevator += elevator;
      sumHeating += heating;
      sumOther += other;
      sumCoowner += coowner;
      sumReserve += reserve;
    });
    
    // Βασικές δαπάνες (όπως εμφανίζονται στο modal χωρίς αποθεματικό): κοινόχρηστα καθαρά + ανελκυστήρας + θέρμανση + λοιπά + συνιδιοκτησίας
    const basicFromRows = sumCommonPure + sumElevator + sumHeating + sumOther + sumCoowner;
    const basicFromBackend = expenseBreakdown.common + expenseBreakdown.elevator + expenseBreakdown.heating + expenseBreakdown.other + expenseBreakdown.coownership;
    
    // Δαπάνες ενοικιαστών (για εμφάνιση): κοινόχρηστα καθαρά + ανελκυστήρας + θέρμανση + διαχείριση
    const tenantExpensesTotal = sumCommonPure + sumElevator + sumHeating + sumManagement;
    // Δαπάνες ιδιοκτητών (για εμφάνιση): ισόποσες + συνιδιοκτησίας
    const ownerExpensesTotal = sumOther + sumCoowner;
    // Πληρωτέο (με αποθεματικό): ίσο με το σύνολο που εμφανίζεται στο modal
    const monthlyReserveTarget = hasOtherExpenses ? reserveFundDetails.monthlyAmount : 0;
    const effectiveReserve = (sumReserve && sumReserve > 0) ? sumReserve : monthlyReserveTarget;
    const payableTotal = tenantExpensesTotal + ownerExpensesTotal + effectiveReserve;
    
    // Σύνολο δαπανών στο modal: βασικές + διαχείριση + (αποθεματικό αν υπάρχει)
    const totalExpenses = Number(basicExpenses) + Number(managementFeeInfo.totalFee || 0) + Number(effectiveReserve || 0);
    
    // Έλεγχοι συνέπειας
    const differences: string[] = [];
    const tolerance = 0.01;
    
    // 1) Βασικές δαπάνες: backend vs rows
    if (Math.abs(basicFromRows - basicFromBackend) > tolerance) {
      differences.push(`Βασικές Δαπάνες (rows: ${formatAmount(basicFromRows)}€) ≠ Backend (${formatAmount(basicFromBackend)}€)`);
    }
    
    // 2) Διαχείριση: άθροισμα ανά διαμέρισμα vs συνολικό
    if (Math.abs(sumManagement - managementFeeInfo.totalFee) > tolerance) {
      differences.push(`Δαπάνες Διαχείρισης (rows: ${formatAmount(sumManagement)}€) ≠ Αναμενόμενες (${formatAmount(managementFeeInfo.totalFee)}€)`);
    }
    
    // 3) Σύνολο δαπανών modal: rows vs display (βασικές + διαχείριση + αποθεματικό αν εμφανίζεται)
    const totalFromRows = basicFromRows + sumManagement + (hasOtherExpenses ? toNumber(reserveFundDetails.monthlyAmount || 0) : 0);
    if (Math.abs(totalFromRows - totalExpenses) > tolerance) {
      differences.push(`Σύνολο Δαπανών (rows: ${formatAmount(totalFromRows)}€) ≠ Εμφανιζόμενο (${formatAmount(totalExpenses)}€)`);
    }
    
    // 4) Αποθεματικό: έλεγχος όταν έχει κατανεμηθεί στα rows ή όταν υπάρχει θεωρητικός μηνιαίος στόχος
    if (sumReserve > 0 && monthlyReserveTarget > 0 && Math.abs(sumReserve - monthlyReserveTarget) > tolerance) {
      differences.push(`Αποθεματικό (rows: ${formatAmount(sumReserve)}€) ≠ Υπολογισμένος στόχος (${formatAmount(monthlyReserveTarget)}€)`);
    }
    
    const isValid = differences.length === 0;
    const message = isValid
      ? '✅ Όλα τα ποσά είναι σωστά!'
      : `❌ Βρέθηκαν ${differences.length} διαφοροποιήσεις`;
    
    const result = {
      isValid,
      message,
      details: {
        totalExpenses,
        tenantExpensesTotal,
        ownerExpensesTotal,
        reserveFundTotal: monthlyReserveTarget,
        payableTotal,
        differences
      }
    };
    
    setValidationResult(result);
    
    if (isValid) {
      toast.success('✅ Έλεγχος δεδομένων επιτυχής! Όλα τα ποσά είναι σωστά.');
    } else {
      toast.error(`❌ Έλεγχος δεδομένων απέτυχε! Βρέθηκαν ${differences.length} διαφοροποιήσεις.`);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Προετοιμασία δεδομένων για αποθήκευση
      const periodData = {
        name: getPeriodInfo(),
        start_date: state.customPeriod.startDate,
        end_date: state.customPeriod.endDate
      };

      const saveData = {
        building_id: buildingId,
        period_data: periodData,
        shares: state.shares,
        total_expenses: state.totalExpenses,
        advanced: state.advancedShares !== null,
        advanced_options: state.advancedOptions
      };

      await saveCommonExpenseSheet(saveData);
      
      toast.success('Το φύλλο κοινοχρήστων αποθηκεύθηκε επιτυχώς!');
      onClose();
    } catch (error: any) {
      toast.error('Σφάλμα κατά την αποθήκευση: ' + (error.message || 'Άγνωστο σφάλμα'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div className="bg-white rounded-lg max-w-[95vw] w-full max-h-[85vh] overflow-y-auto print-content">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between no-print">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="text-left">
                <h2 className="text-lg font-bold text-blue-600">Digital Concierge App</h2>
                <p className="text-sm text-gray-600">online έκδοση κοινοχρήστων</p>
              </div>
              <div className="flex items-center gap-2">
                <Building className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-800" style={{ fontSize: '18px' }}>Φύλλο Κοινοχρήστων</h2>
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700" style={{ fontSize: '18px' }}>
              {getPeriodInfo()}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleExport('pdf')}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4" />
              Εξαγωγή PDF
            </Button>
            <Button
              onClick={() => handleExport('excel')}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Excel
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Εκτύπωση
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block p-4 border-b">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="text-left">
                <h2 className="text-lg font-bold text-blue-600">Digital Concierge App</h2>
                <p className="text-sm text-gray-600">online έκδοση κοινοχρήστων</p>
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-800" style={{ fontSize: '18px' }}>Φύλλο Κοινοχρήστων</h1>
                <p className="text-lg text-gray-600" style={{ fontSize: '18px' }}>{getPeriodInfo()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <Tabs defaultValue="traditional" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="traditional" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Παραδοσιακή Προβολή
              </TabsTrigger>
              <TabsTrigger value="analysis" className="flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Ανάλυση Δαπανών
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Εξαγωγή & Εκτύπωση
              </TabsTrigger>
            </TabsList>

            {/* Traditional View Tab */}
            <TabsContent value="traditional" className="space-y-6 mt-6">
          {/* Header Information */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Building Info */}
            <div className="space-y-2">
              <div className="bg-blue-50 p-3 rounded border">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-blue-600" />
                  <h3 className="font-semibold text-blue-800 text-sm">ΠΟΛΥΚΑΤΟΙΚΙΑ</h3>
                </div>
                <p className="text-sm font-medium text-blue-900 mt-1">{buildingName}</p>
              </div>
              
              <div className="bg-purple-50 p-3 rounded border">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-purple-600" />
                  <h3 className="font-semibold text-purple-800 text-sm">ΔΙΑΧΕΙΡΙΣΤΗΣ</h3>
                </div>
                <p className="text-sm font-medium text-purple-900 mt-1">Διαχειριστής Κτιρίου</p>
              </div>
              
              <div className="bg-orange-50 p-3 rounded border">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <h3 className="font-semibold text-orange-800 text-sm">ΛΗΞΗ ΠΛΗΡΩΜΗΣ</h3>
                </div>
                <p className="text-sm font-medium text-orange-900 mt-1">{getPaymentDueDate()}</p>
              </div>
              
              {/* Ζ. ΑΠΟΘΕΜΑΤΙΚΟ Banner */}
              <div className="bg-blue-50 p-3 rounded border">
                <div className="flex items-center gap-2">
                  <PiggyBank className="h-4 w-4 text-blue-600" />
                  <h3 className="font-semibold text-blue-800 text-sm">Ζ. ΑΠΟΘΕΜΑΤΙΚΟ</h3>
                </div>
                <div className="space-y-1 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-900">Μηνιαία Εισφορά:</span>
                    <span className="text-lg font-bold text-blue-900">{formatAmount(reserveFundInfo.monthlyAmount)}€</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-900">Στόχος:</span>
                    <span className="text-sm font-medium text-blue-900">{formatAmount(reserveFundInfo.goal)}€</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-900">Διάρκεια:</span>
                    <span className="text-sm font-medium text-blue-900">{reserveFundInfo.duration} μήνες</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-900">Συνολική Εισφορά:</span>
                    <span className="text-sm font-medium text-blue-900">{formatAmount(reserveFundInfo.totalContribution)}€</span>
                  </div>
                  
                  {/* Progress Information */}
                  {reserveFundInfo.goal > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-blue-900">Μήνες Απομένουν:</span>
                        <span className="text-sm font-medium text-blue-900">{reserveFundInfo.monthsRemaining}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-blue-900">Μαζεμένα Χρήματα:</span>
                        <span className="text-sm font-medium text-blue-900">
                          {formatAmount(reserveFundInfo.actualReserveCollected)}€
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-blue-900">Πρόοδος:</span>
                        <span className="text-sm font-medium text-blue-900">
                          {reserveFundInfo.progressPercentage.toFixed(1)}%
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            reserveFundInfo.progressPercentage >= 0 ? 'bg-blue-600' : 'bg-red-500'
                          }`}
                          style={{ 
                            width: `${Math.min(Math.abs(reserveFundInfo.progressPercentage), 100)}%`,
                            marginLeft: reserveFundInfo.progressPercentage < 0 ? 'auto' : '0'
                          }}
                        ></div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Middle Column - Building Expenses Analysis */}
            <div className="bg-gray-50 p-3 rounded border">
              <h3 className="font-bold text-gray-800 mb-3 text-center text-sm">ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ ΠΟΛΥΚΑΤΟΙΚΙΑΣ</h3>
              
              <div className="space-y-2">
                {(() => {
                  const groupedExpenses = getGroupedExpenses();
                  const sections = [];
                  
                  // A. ΚΟΙΝΟΧΡΗΣΤΑ
                  if (groupedExpenses.general) {
                    sections.push(
                      <div key="general" className="bg-blue-50 p-2 rounded border">
                        <h4 className="font-semibold text-gray-800 mb-1 text-xs">Α. ΚΟΙΝΟΧΡΗΣΤΑ</h4>
                        <div className="space-y-0.5 text-xs">
                          {groupedExpenses.general.expenses.map((category, index) => (
                            <div key={category.category} className="flex justify-between">
                              <span>{index + 1}. {category.displayName}</span>
                              <span className="font-medium">{formatAmount(category.total)}€</span>
                            </div>
                          ))}
                          <div className="flex justify-between font-semibold border-t pt-1">
                            <span>ΣΥΝΟΛΟ</span>
                            <span>{formatAmount(groupedExpenses.general.total)}€</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // B.  ΑΝΕΛΚΥΣΤΗΡΑΣ
                  if (groupedExpenses.elevator) {
                    sections.push(
                      <div key="elevator" className="bg-blue-50 p-2 rounded border">
                        <h4 className="font-semibold text-gray-800 mb-1 text-xs">Β.  ΑΝΕΛΚΥΣΤΗΡΑΣ</h4>
                        <div className="space-y-0.5 text-xs">
                          {groupedExpenses.elevator.expenses.map((category, index) => (
                            <div key={category.category} className="flex justify-between">
                              <span>{index + 1}. {category.displayName}</span>
                              <span className="font-medium">{formatAmount(category.total)}€</span>
                            </div>
                          ))}
                          <div className="flex justify-between font-semibold border-t pt-1">
                            <span>ΣΥΝΟΛΟ</span>
                            <span>{formatAmount(groupedExpenses.elevator.total)}€</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // Γ. ΘΕΡΜΑΝΣΗ
                  if (groupedExpenses.heating) {
                    sections.push(
                      <div key="heating" className="bg-blue-50 p-2 rounded border">
                        <h4 className="font-semibold text-gray-800 mb-1 text-xs">Γ. ΘΕΡΜΑΝΣΗ</h4>
                        <div className="space-y-0.5 text-xs">
                          {groupedExpenses.heating.expenses.map((category, index) => (
                            <div key={category.category} className="flex justify-between">
                              <span>{index + 1}. {category.displayName}</span>
                              <span className="font-medium">{formatAmount(category.total)}€</span>
                            </div>
                          ))}
                          <div className="flex justify-between font-semibold border-t pt-1">
                            <span>ΣΥΝΟΛΟ</span>
                            <span>{formatAmount(groupedExpenses.heating.total)}€</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // Δ. ΛΟΙΠΑ ΕΞΟΔΑ (Equal Share)
                  if (groupedExpenses.equal_share) {
                    sections.push(
                      <div key="equal_share" className="bg-blue-50 p-2 rounded border">
                        <h4 className="font-semibold text-gray-800 mb-1 text-xs">Δ. ΛΟΙΠΑ ΕΞΟΔΑ</h4>
                        <div className="space-y-0.5 text-xs">
                          {groupedExpenses.equal_share.expenses.map((category, index) => (
                            <div key={category.category} className="flex justify-between">
                              <span>{index + 1}. {category.displayName}</span>
                              <span className="font-medium">{formatAmount(category.total)}€</span>
                            </div>
                          ))}
                          <div className="flex justify-between font-semibold border-t pt-1">
                            <span>ΣΥΝΟΛΟ</span>
                            <span>{formatAmount(groupedExpenses.equal_share.total)}€</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // Ε. ΕΞΟΔΑ ΣΥΝΙΔΙΟΚΤΗΣΙΑΣ (Individual)
                  if (groupedExpenses.individual) {
                    sections.push(
                      <div key="individual" className="bg-blue-50 p-2 rounded border">
                        <h4 className="font-semibold text-gray-800 mb-1 text-xs">Ε. ΕΞΟΔΑ ΣΥΝΙΔΙΟΚΤΗΣΙΑΣ</h4>
                        <div className="space-y-0.5 text-xs">
                          {groupedExpenses.individual.expenses.map((category, index) => (
                            <div key={category.category} className="flex justify-between">
                              <span>{index + 1}. {category.displayName}</span>
                              <span className="font-medium">{formatAmount(category.total)}€</span>
                            </div>
                          ))}
                          <div className="flex justify-between font-semibold border-t pt-1">
                            <span>ΣΥΝΟΛΟ</span>
                            <span>{formatAmount(groupedExpenses.individual.total)}€</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // ΣΤ. ΔΑΠΑΝΕΣ ΔΙΑΧΕΙΡΙΣΗΣ (Management Fees)
                  const managementFeeInfo = getManagementFeeInfo();
                  if (managementFeeInfo.hasFee) {
                    sections.push(
                      <div key="management" className="bg-green-50 p-2 rounded border">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold text-gray-800 text-xs">ΣΤ. ΔΑΠΑΝΕΣ ΔΙΑΧΕΙΡΙΣΗΣ</h4>
                          <span className="font-semibold text-gray-700">{formatAmount(managementFeeInfo.totalFee)}€</span>
                        </div>
                      </div>
                    );
                  }
                  

                  
                  // If no expenses found, show a message
                  if (sections.length === 0) {
                    sections.push(
                      <div key="no-expenses" className="bg-blue-50 p-2 rounded border">
                        <p className="text-xs text-gray-600 text-center">Δεν βρέθηκαν δαπάνες για αυτή την περίοδο</p>
                      </div>
                    );
                  }
                  
                  return sections;
                })()}

                {/* Grand Total with Breakdown */}
                <div className="space-y-1">
                  {/* Current Expenses Total */}
                  <div className="bg-blue-100 text-blue-800 p-2 rounded border">
                    <div className="flex justify-between font-medium text-xs">
                      <span>ΣΥΝΟΛΟ ΤΡΕΧΟΥΣΩΝ ΔΑΠΑΝΩΝ</span>
                      <span>{formatAmount(Number(basicExpenses) + Number(managementFeeInfo.totalFee || 0))}€</span>
                    </div>
                  </div>
                  
                  {/* Reserve Fund (if applicable) */}
                  {hasOtherExpenses && Number(reserveFundDetails.monthlyAmount || 0) > 0 && (
                    <div className="bg-green-100 text-green-800 p-2 rounded border">
                      <div className="flex justify-between font-medium text-xs">
                        <span>ΑΠΟΘΕΜΑΤΙΚΟ ΤΑΜΕΙΟ</span>
                        <span>{formatAmount(Number(reserveFundDetails.monthlyAmount || 0))}€</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Final Total */}
                  <div className="bg-blue-600 text-white p-2 rounded border">
                    <div className="flex justify-between font-bold text-sm">
                      <span>ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ</span>
                      <span>{formatAmount(totalExpenses)}€</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Owner Expenses Analysis */}
            {showOwnerExpenses && (
            <div className="bg-green-50 p-3 rounded border">
              <h3 className="font-bold text-gray-800 mb-3 text-center text-sm">ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ ΙΔΙΟΚΤΗΤΩΝ</h3>
              
              {/* Explanatory Banner */}
              <div className="bg-green-100 border-l-4 border-green-500 p-3 mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-green-800 mb-1">
                      Δαπάνες Ιδιοκτητών
                    </h4>
                    <div className="text-sm text-green-700">
                      <p className="mb-2">
                        <strong>Δαπάνες = Δαπάνες Πολυκατοικίας + Δαπάνες Ιδιοκτητών</strong>
                      </p>
                      <p className="text-xs">
                        Οι δαπάνες ιδιοκτητών αφορούν κυρίως δομικές επισκευές, αντικατάσταση εξοπλισμού θέρμανσης, 
                        ανακαινίσεις κοινοχρήστων χώρων και άλλες επενδύσεις που αποτελούν ευθύνη των ιδιοκτητών.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Placeholder for future owner expenses data */}
              <div className="bg-white border-2 border-dashed border-green-300 rounded-lg p-6 text-center">
                <div className="flex flex-col items-center">
                  <svg className="h-12 w-12 text-green-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h4 className="text-lg font-medium text-green-800 mb-2">
                    Δαπάνες Ιδιοκτητών
                  </h4>
                  <p className="text-sm text-green-600 mb-3">
                    Εδώ θα εμφανίζονται οι δομικές δαπάνες και επενδύσεις των ιδιοκτητών
                  </p>
                  <div className="text-xs text-green-500 bg-green-50 px-3 py-1 rounded-full">
                    Προσεχώς διαθέσιμο
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>

          {/* Detailed Results Table */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="bg-gray-100 p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800">
                  ΑΝΑΛΥΣΗ ΚΑΤΑ ΔΙΑΜΕΡΙΣΜΑΤΑ 
                  <span className="text-sm font-normal text-gray-600 italic ml-2"> </span>
                </h3>
                <Button
                  onClick={validateData}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                >
                  <Calculator className="h-4 w-4" />
                  Έλεγχος Δεδομένων
                </Button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <Table className="min-w-full common-expense-table" style={{ minWidth: '1400px' }}>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-center border font-bold text-xs" style={{background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)", color: "white"}}>Α/Δ</TableHead>
                    <TableHead className="text-center border font-bold text-xs" style={{background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)", color: "white"}}>ΟΝΟΜΑΤΕΠΩΝΥΜΟ</TableHead>
                    
                    {/* ΧΙΛΙΟΣΤΑ ΣΥΜΜΕΤΟΧΗΣ Section - Κόκκινη κεφαλίδα */}
                    <TableHead className="text-center border font-bold text-xs text-white" colSpan={3} style={{background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"}}>
                      ΧΙΛΙΟΣΤΑ ΣΥΜΜΕΤΟΧΗΣ
                    </TableHead>
                    
                    {/* ΔΑΠΑΝΕΣ ΕΝΟΙΚΙΑΣΤΩΝ Section - Πορτοκαλί επικεφαλίδα */}
                    <TableHead className="text-center border font-bold text-xs text-white" colSpan={4} style={{background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)"}}>
                      ΔΑΠΑΝΕΣ ΕΝΟΙΚΙΑΣΤΩΝ
                    </TableHead>
                    
                    {/* ΔΑΠΑΝΕΣ ΙΔΙΟΚΤΗΤΩΝ Section - Πράσινη επικεφαλίδα */}
                    {showOwnerExpenses && (
                      <TableHead className="text-center border font-bold text-xs text-white" colSpan={3} style={{background: "linear-gradient(135deg, #059669 0%, #047857 100%)"}}>
                        ΔΑΠΑΝΕΣ ΙΔΙΟΚΤΗΤΩΝ
                      </TableHead>
                    )}
                    
                    <TableHead className="text-center border font-bold text-xs" style={{background: "linear-gradient(135deg, #7e22ce 0%, #6d28d9 100%)", color: "white"}}>ΑΠΟΘΕΜΑΤΙΚΟ</TableHead>
                    <TableHead className="text-center border font-bold text-xs" style={{background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)", color: "white"}}>ΠΛΗΡΩΤΕΟ ΠΟΣΟ</TableHead>
                    <TableHead className="text-center border font-bold text-xs" style={{background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)", color: "white"}}>A/A</TableHead>
                  </TableRow>
                  
                  {/* Sub-headers Row */}
                  <TableRow className="bg-gray-100">
                    <TableHead className="text-center border"></TableHead>
                    <TableHead className="text-center border"></TableHead>
                    
                    {/* ΧΙΛΙΟΣΤΑ ΣΥΜΜΕΤΟΧΗΣ Sub-headers - Κόκκινο φόντο */}
                    <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)", fontSize: "10px", width: "80px"}}>ΚΟΙΝΟΧΡΗΣΤΑ</TableHead>
                    <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)", fontSize: "10px", width: "80px"}}>ΑΝΕΛΚ/ΡΑΣ</TableHead>
                    <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)", fontSize: "10px", width: "80px"}}>ΘΕΡΜΑΝΣΗ</TableHead>
                    
                    {/* ΔΑΠΑΝΕΣ ΕΝΟΙΚΙΑΣΤΩΝ Sub-headers - Πορτοκαλί φόντο */}
                    <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)", fontSize: "10px", width: "80px"}}>ΚΟΙΝΟΧΡΗΣΤΑ</TableHead>
                    <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)", fontSize: "10px", width: "80px"}}>ΑΝΕΛΚ/ΡΑΣ</TableHead>
                    <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)", fontSize: "10px", width: "80px"}}>ΘΕΡΜΑΝΣΗ</TableHead>
                    <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)", fontSize: "10px", width: "80px"}}>ΔΙΑΧΕΙΡΙΣΗ</TableHead>
                    
                    {/* ΔΑΠΑΝΕΣ ΙΔΙΟΚΤΗΤΩΝ Sub-headers - Πράσινο φόντο */}
                    {showOwnerExpenses && (
                      <>
                        <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #059669 0%, #047857 100%)", fontSize: "10px", width: "80px"}}>ΚΟΙΝΟΧΡΗΣΤΑ</TableHead>
                        <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #059669 0%, #047857 100%)", fontSize: "10px", width: "80px"}}>ΑΝΕΛΚ/ΡΑΣ</TableHead>
                        <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #059669 0%, #047857 100%)", fontSize: "10px", width: "80px"}}>ΘΕΡΜΑΝΣΗ</TableHead>
                      </>
                    )}
                    
                    <TableHead className="text-center border"></TableHead>
                    <TableHead className="text-center border"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(state.shares).map((share: any, index: number) => {
                    const participationMills = toNumber(share.participation_mills);
                    const totalMills = Object.values(state.shares).reduce((sum: number, s: any) => sum + toNumber(s.participation_mills), 0);
                    const participationPercentage = totalMills > 0 ? (participationMills / totalMills) * 1000 : 0;
                    const row = perApartmentAmounts[share.apartment_id] || { common:0, elevator:0, heating:0, other:0, coowner:0, reserve:0, total_due:0 };
                    
                    // Χιλιοστά συμμετοχής από τα δεδομένα του κτιρίου
                    const apartmentData = aptWithFinancial.find(apt => apt.id === share.apartment_id);
                    const commonMills = apartmentData?.participation_mills ?? participationMills;
                    const elevatorMills = apartmentData?.participation_mills ?? participationMills;
                    const heatingMills = apartmentData?.heating_mills ?? participationMills;
                    
                    // Debug για τις τιμές των mills
                    if (index === 0) {
                      console.log('Mills values for Α1:', {
                        share,
                        share_participation_mills: share.participation_mills,
                        share_participation_mills_type: typeof share.participation_mills,
                        apartmentData,
                        apartmentData_participation_mills: apartmentData?.participation_mills,
                        apartmentData_participation_mills_type: typeof apartmentData?.participation_mills,
                        participationMills,
                        participationMills_type: typeof participationMills,
                        commonMills,
                        elevatorMills,
                        heatingMills,
                        commonMills_toNumber: toNumber(commonMills),
                        elevatorMills_toNumber: toNumber(elevatorMills),
                        heatingMills_toNumber: toNumber(heatingMills)
                      });
                    }
                    
                    // Debug για όλα τα shares
                    if (index === 0) {
                      console.log('All shares:', Object.values(state.shares));
                      console.log('State shares keys:', Object.keys(state.shares));
                      console.log('First share:', Object.values(state.shares)[0]);
                      console.log('First share properties:', Object.keys(Object.values(state.shares)[0]));
                      console.log('First share participation_mills:', Object.values(state.shares)[0]?.participation_mills);
                      console.log('First share participation_mills type:', typeof Object.values(state.shares)[0]?.participation_mills);
                    }
                    
                    // Χρήση πραγματικών δεδομένων από το backend breakdown
                    const breakdown = share.breakdown || {};
                    // Υπολογίζουμε τα καθαρά κοινόχρηστα από το συνολικό common breakdown, βάσει χιλιοστών
                    const commonShareRatio = (toNumber(commonMills) || 0) / ((toNumber(totalMills) || 1));
                    const commonAmount = commonShareRatio * toNumber(expenseBreakdown.common || 0);
                    const elevatorAmount = toNumber(breakdown.elevator_expenses || 0);
                    const heatingAmount = toNumber(breakdown.heating_expenses || 0);
                    
                    // Debug για το πρώτο διαμέρισμα
                    if (index === 0) {
                      console.log('toNumber debug για Α1:', {
                        commonMills_raw: commonMills,
                        commonMills_toNumber: toNumber(commonMills),
                        commonAmount_calc: toNumber(commonMills) / 1000 * expenseBreakdown.common,
                        commonAmount_final: commonAmount,
                        heatingMills_raw: heatingMills,
                        heatingMills_toNumber: toNumber(heatingMills),
                        heatingAmount_calc: toNumber(heatingMills) / 1000 * expenseBreakdown.heating,
                        heatingAmount_final: heatingAmount
                      });
                    }
                    const totalAmount = commonAmount + elevatorAmount + heatingAmount;
                    
                    // Προσθήκη δαπανών διαχείρισης και αποθεματικού
                    // Χρησιμοποιούμε ρητά το management_fee από το breakdown όταν υπάρχει
                    const managementFee = toNumber((breakdown as any).management_fee ?? managementFeeInfo.feePerApartment);
                    
                    // Αποθεματικό μόνο αν υπάρχουν άλλες δαπάνες (όχι μόνο διαχείριση)
                    const hasOtherExpenses = expenseBreakdown.heating > 0 || expenseBreakdown.elevator > 0 || expenseBreakdown.other > 0 || expenseBreakdown.coownership > 0;
                    const apartmentReserveFund = hasOtherExpenses ? toNumber(reserveFundDetails.monthlyAmount) * (toNumber(participationMills) / 1000) : 0;
                    
                    const totalWithFees = totalAmount + managementFee + apartmentReserveFund;
                    
                    // Ensure totalWithFees is not NaN
                    const finalTotalWithFees = isNaN(totalWithFees) ? 0 : totalWithFees;
                    
                    // Debug logging για το πρώτο διαμέρισμα
                    if (index === 0) {
                      console.log('Debug για Α1:', {
                        commonMills,
                        commonAmount,
                        heatingAmount,
                        totalAmount,
                        managementFee,
                        apartmentReserveFund,
                        totalWithFees,
                        finalTotalWithFees,
                        managementFeeInfo,
                        reserveFundDetails
                      });
                    }
                    
                    // Debug logging για όλα τα διαμερίσματα
                    console.log(`Διαμέρισμα ${share.identifier || share.apartment_number}:`, {
                      commonAmount,
                      heatingAmount,
                      managementFee,
                      totalAmount,
                      finalTotalWithFees
                    });
                    

                    
                    return (
                      <TableRow key={share.apartment_id} className="hover:bg-gray-50">
                        <TableCell className="text-center border font-medium text-xs">{share.identifier || share.apartment_number}</TableCell>
                        <TableCell className="border font-medium text-xs">{share.owner_name || 'Μη καταχωρημένος'}</TableCell>
                        
                        {/* ΧΙΛΙΟΣΤΑ ΣΥΜΜΕΤΟΧΗΣ */}
                        <TableCell className="text-center border" style={{fontSize: "10px", width: "80px"}}>{toNumber(commonMills).toFixed(2)}</TableCell>
                        <TableCell className="text-center border" style={{fontSize: "10px", width: "80px"}}>{toNumber(elevatorMills).toFixed(2)}</TableCell>
                        <TableCell className="text-center border" style={{fontSize: "10px", width: "80px"}}>{toNumber(heatingMills).toFixed(2)}</TableCell>
                        
                        {/* ΔΑΠΑΝΕΣ ΕΝΟΙΚΙΑΣΤΩΝ - ΠΟΣΟ ΠΟΥ ΑΝΑΛΟΓΕΙ */}
                        <TableCell className="text-center border font-medium" style={{fontSize: "10px", width: "80px"}}>{formatAmount(commonAmount)}</TableCell>
                        <TableCell className="text-center border font-medium" style={{fontSize: "10px", width: "80px"}}>{formatAmount(elevatorAmount)}</TableCell>
                        <TableCell className="text-center border font-medium" style={{fontSize: "10px", width: "80px"}}>{formatAmount(heatingAmount)}</TableCell>
                        <TableCell className="text-center border font-medium" style={{fontSize: "10px", width: "80px"}}>{formatAmount(managementFee)}</TableCell>
                        
                        {/* ΔΑΠΑΝΕΣ ΙΔΙΟΚΤΗΤΩΝ - ΠΟΣΟ ΠΟΥ ΑΝΑΛΟΓΕΙ */}
                        {showOwnerExpenses && (
                          <>
                            <TableCell className="text-center border font-medium" style={{fontSize: "10px", width: "80px"}}>-</TableCell>
                            <TableCell className="text-center border font-medium" style={{fontSize: "10px", width: "80px"}}>-</TableCell>
                            <TableCell className="text-center border font-medium" style={{fontSize: "10px", width: "80px"}}>-</TableCell>
                          </>
                        )}
                        {/* ΑΠΟΘΕΜΑΤΙΚΟ ανά διαμέρισμα */}
                        <TableCell className="text-center border font-medium text-xs">{formatAmount(apartmentReserveFund)}</TableCell>
                        <TableCell className="text-center border font-bold text-xs">{formatAmount(finalTotalWithFees)}</TableCell>
                        <TableCell className="text-center border text-xs">{index + 1}</TableCell>
                      </TableRow>
                    );
                  })}
                  
                  {/* Totals Row */}
                  <TableRow className="bg-gray-100 font-bold">
                    <TableCell className="text-center border">ΣΥΝΟΛΑ</TableCell>
                    <TableCell className="border"></TableCell>
                    
                    {/* ΧΙΛΙΟΣΤΑ ΣΥΜΜΕΤΟΧΗΣ Totals */}
                    <TableCell className="text-center border" style={{fontSize: "10px", width: "80px"}}>
                      {Object.values(state.shares).reduce((sum: number, s: any) => {
                        const apartmentData = aptWithFinancial.find(apt => apt.id === s.apartment_id);
                        const commonMills = apartmentData?.participation_mills ?? toNumber(s.participation_mills);
                        return sum + commonMills;
                      }, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center border" style={{fontSize: "10px", width: "80px"}}>
                      {Object.values(state.shares).reduce((sum: number, s: any) => {
                        const apartmentData = aptWithFinancial.find(apt => apt.id === s.apartment_id);
                        const elevatorMills = apartmentData?.participation_mills ?? toNumber(s.participation_mills);
                        return sum + elevatorMills;
                      }, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center border" style={{fontSize: "10px", width: "80px"}}>
                      {Object.values(state.shares).reduce((sum: number, s: any) => {
                        const apartmentData = aptWithFinancial.find(apt => apt.id === s.apartment_id);
                        const heatingMills = apartmentData?.heating_mills ?? toNumber(s.participation_mills);
                        return sum + heatingMills;
                      }, 0).toFixed(2)}
                    </TableCell>
                    {/* ΔΑΠΑΝΕΣ ΕΝΟΙΚΙΑΣΤΩΝ Totals */}
                    <TableCell className="text-center border" style={{fontSize: "10px", width: "80px"}}>{formatAmount(expenseBreakdown.common)}</TableCell>
                    <TableCell className="text-center border" style={{fontSize: "10px", width: "80px"}}>{formatAmount(expenseBreakdown.elevator)}</TableCell>
                    <TableCell className="text-center border" style={{fontSize: "10px", width: "80px"}}>{formatAmount(expenseBreakdown.heating)}</TableCell>
                    <TableCell className="text-center border" style={{fontSize: "10px", width: "80px"}}>{formatAmount(managementFeeInfo.totalFee)}</TableCell>
                    
                    {/* ΔΑΠΑΝΕΣ ΙΔΙΟΚΤΗΤΩΝ Totals */}
                    {showOwnerExpenses && (
                      <>
                        <TableCell className="text-center border" style={{fontSize: "10px", width: "80px"}}>-</TableCell>
                        <TableCell className="text-center border" style={{fontSize: "10px", width: "80px"}}>-</TableCell>
                        <TableCell className="text-center border" style={{fontSize: "10px", width: "80px"}}>-</TableCell>
                      </>
                    )}

                    {/* ΑΠΟΘΕΜΑΤΙΚΟ Totals */}
                    <TableCell className="text-center border" style={{fontSize: "10px", width: "80px"}}>{formatAmount(hasOtherExpenses ? reserveFundDetails.monthlyAmount : 0)}</TableCell>

                    <TableCell className="text-center border">{formatAmount(totalExpenses)}</TableCell>
                    <TableCell className="text-center border"></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Validation Results */}
          {validationResult && (
            <div className={`border rounded-lg p-4 ${validationResult.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {validationResult.isValid ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className={`font-semibold mb-2 ${validationResult.isValid ? 'text-green-800' : 'text-red-800'}`}>
                    {validationResult.message}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                    <div className="bg-white p-3 rounded border">
                      <div className="text-sm font-medium text-gray-600">Σύνολο Δαπανών</div>
                      <div className="text-lg font-bold text-blue-600">{formatAmount(validationResult.details.totalExpenses)}€</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-sm font-medium text-gray-600">Δαπάνες Ενοικιαστών</div>
                      <div className="text-lg font-bold text-orange-600">{formatAmount(validationResult.details.tenantExpensesTotal)}€</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-sm font-medium text-gray-600">Δαπάνες Ιδιοκτητών</div>
                      <div className="text-lg font-bold text-green-600">{formatAmount(validationResult.details.ownerExpensesTotal)}€</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-sm font-medium text-gray-600">Αποθεματικό</div>
                      <div className="text-lg font-bold text-teal-600">{formatAmount(validationResult.details.reserveFundTotal)}€</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-sm font-medium text-gray-600">Πληρωτέο Ποσό</div>
                      <div className="text-lg font-bold text-purple-600">{formatAmount(validationResult.details.payableTotal)}€</div>
                    </div>
                  </div>
                  
                  {!validationResult.isValid && validationResult.details.differences.length > 0 && (
                    <div className="bg-white border border-red-200 rounded-lg p-3">
                      <h5 className="font-medium text-red-800 mb-2">Διαφοροποιήσεις που βρέθηκαν:</h5>
                      <ul className="space-y-1">
                        {validationResult.details.differences.map((difference, index) => (
                          <li key={index} className="text-sm text-red-700 flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">•</span>
                            {difference}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            {/* Παρατηρήσεις στην αρχή του footer */}
            <div className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-yellow-600" />
                <h3 className="font-semibold text-yellow-800 text-sm">ΠΑΡΑΤΗΡΗΣΕΙΣ</h3>
              </div>
              <p className="text-sm font-medium text-yellow-900">ΕΙΣΠΡΑΞΗ ΚΟΙΝΟΧΡΗΣΤΩΝ: ΔΕΥΤΕΡΑ & ΤΕΤΑΡΤΗ ΑΠΟΓΕΥΜΑ</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>ΗΜΕΡΟΜΗΝΙΑ ΕΚΔΟΣΗΣ:</strong> {getCurrentDate()}
              </div>
              <div>
                <strong>ΣΥΝΟΛΟ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:</strong> {Object.keys(state.shares).length}
              </div>
              <div>
                <strong>ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ:</strong> {formatAmount(totalExpenses)}€
              </div>
            </div>
          </div>
            </TabsContent>

            {/* Analysis Tab */}
            <TabsContent value="analysis" className="mt-6">
              <ExpenseBreakdownSection
                state={state}
                buildingName={buildingName}
                apartmentsCount={Object.keys(state.shares).length}
                onViewDetails={(categoryId) => {
                  toast.info(`Προβολή λεπτομερειών για κατηγορία: ${categoryId}`);
                }}
              />
            </TabsContent>

            {/* Export Tab */}
            <TabsContent value="export" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Εξαγωγή και Εκτύπωση
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Export Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-blue-200 bg-blue-50/30">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <FileText className="h-6 w-6 text-blue-600" />
                          <h3 className="font-semibold text-blue-800">Εξαγωγή PDF</h3>
                        </div>
                        <p className="text-sm text-blue-700 mb-4">
                          Δημιουργία PDF αρχείου με το φύλλο κοινοχρήστων
                        </p>
                        <Button
                          onClick={() => handleExport('pdf')}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Λήψη PDF
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border-green-200 bg-green-50/30">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <FileText className="h-6 w-6 text-green-600" />
                          <h3 className="font-semibold text-green-800">Εξαγωγή Excel</h3>
                        </div>
                        <p className="text-sm text-green-700 mb-4">
                          Δημιουργία Excel αρχείου για περαιτέρω επεξεργασία
                        </p>
                        <Button
                          onClick={() => handleExport('excel')}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Λήψη Excel
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border-purple-200 bg-purple-50/30">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Printer className="h-6 w-6 text-purple-600" />
                          <h3 className="font-semibold text-purple-800">Εκτύπωση</h3>
                        </div>
                        <p className="text-sm text-purple-700 mb-4">
                          Άμεση εκτύπωση του φύλλου κοινοχρήστων
                        </p>
                        <Button
                          onClick={handlePrint}
                          className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                          <Printer className="h-4 w-4 mr-2" />
                          Εκτύπωση
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border-orange-200 bg-orange-50/30">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Save className="h-6 w-6 text-orange-600" />
                          <h3 className="font-semibold text-orange-800">Αποθήκευση</h3>
                        </div>
                        <p className="text-sm text-orange-700 mb-4">
                          Αποθήκευση φύλλου στη βάση δεδομένων
                        </p>
                        <Button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="w-full bg-orange-600 hover:bg-orange-700"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {isSaving ? 'Αποθήκευση...' : 'Αποθήκευση'}
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border-red-200 bg-red-50/30">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Thermometer className="h-6 w-6 text-red-600" />
                          <h3 className="font-semibold text-red-800">Ανάλυση Θέρμανσης</h3>
                        </div>
                        <p className="text-sm text-red-700 mb-4">
                          Προηγμένοι υπολογισμοί θέρμανσης με αυτονομία/κεντρική
                        </p>
                        <Button
                          onClick={() => setShowHeatingModal(true)}
                          className="w-full bg-red-600 hover:bg-red-700"
                        >
                          <Thermometer className="h-4 w-4 mr-2" />
                          Ανάλυση Θέρμανσης
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Summary Information */}
                  <Card className="border-gray-200 bg-gray-50/30">
                    <CardHeader>
                      <CardTitle className="text-base">Περίληψη Εξαγωγής</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-600">Κτίριο</p>
                          <p className="font-bold">{buildingName}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600">Περίοδος</p>
                          <p className="font-bold">{getPeriodInfo()}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600">Διαμερίσματα</p>
                          <p className="font-bold">{Object.keys(state.shares).length}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600">Σύνολο Δαπανών</p>
                          <p className="font-bold text-blue-700">{formatAmount(totalExpenses)}€</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Heating Analysis Modal */}
      <HeatingAnalysisModal
        isOpen={showHeatingModal}
        onClose={() => setShowHeatingModal(false)}
        buildingId={buildingId}
        totalHeatingCost={expenseBreakdown.heating}
        apartments={aptWithFinancial.map(apt => ({
          id: apt.id,
          number: apt.number,
          owner_name: apt.owner_name,
          heating_mills: apt.heating_mills || 0,
          participation_mills: apt.participation_mills || 0
        }))}
        onHeatingCalculated={(breakdown) => {
          setHeatingBreakdown(breakdown);
          toast.success('✅ Υπολογισμοί θέρμανσης εφαρμόστηκαν!');
        }}
      />
    </div>
  );
};
