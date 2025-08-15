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
  Receipt
} from 'lucide-react';
import { CalculatorState } from './CalculatorWizard';
import { ExpenseBreakdownSection } from './ExpenseBreakdownSection';
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
    return isNaN(n) ? 0 : n;
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
      monthlyAmount: reserveFundInfo.monthlyAmount,
      totalContribution: reserveFundInfo.totalContribution,
      displayText: reserveFundInfo.displayText,
      goal: reserveFundInfo.goal,
      duration: reserveFundInfo.duration,
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
      breakdown.common = parseFloat(expenseTotals.general || 0);
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
    // Calculate monthly amount from reserve fund goal and duration
    const reserveFundGoal = state.advancedShares?.reserve_fund_goal || 0;
    const reserveFundDuration = state.advancedShares?.reserve_fund_duration || 1;
    const stateReserveContribution = state.advancedShares?.reserve_contribution || 0;
    const finalReserveContribution = stateReserveContribution > 0 ? stateReserveContribution : reserveContributionPerApartment;
    
    let monthlyAmount = 0;
    let totalContribution = 0;
    let displayText = '';
    
    if (reserveFundGoal > 0 && reserveFundDuration > 0) {
      monthlyAmount = reserveFundGoal / reserveFundDuration;
      totalContribution = monthlyAmount * Object.keys(state.shares).length; // Συνολική συνεισφορά όλων των διαμερισμάτων
      displayText = `Στόχος ${formatAmount(reserveFundGoal)}€ σε ${reserveFundDuration} δόσεις = ${formatAmount(monthlyAmount)}€`;
    } else if (finalReserveContribution > 0) {
      monthlyAmount = finalReserveContribution;
      totalContribution = finalReserveContribution * Object.keys(state.shares).length;
      displayText = `Μηνιαία εισφορά αποθεματικού`;
    }
    
    return {
      monthlyAmount,
      totalContribution,
      displayText,
      goal: reserveFundGoal,
      duration: reserveFundDuration
    };
  };

  const expenseBreakdown = calculateExpenseBreakdown();
  const expenseDetails = getExpenseDetails();
  const reserveFundInfo = getReserveFundInfo();
  const managementFeeInfo = getManagementFeeInfo();
  const reserveFundDetails = getReserveFundDetails();
  
  // Calculate total expenses including management fees and reserve fund
  const totalExpenses = Object.values(expenseBreakdown).reduce((sum, val) => sum + val, 0) + 
                       reserveFundInfo.totalContribution + 
                       managementFeeInfo.totalFee;

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
      
      // Debug logging to check if values are updating
      console.log('PDF Export Debug:', {
        stateShares: Object.keys(currentState.shares).length,
        totalExpenses: currentState.totalExpenses,
        expenseBreakdown: currentExpenseBreakdown,
        period: getPeriodInfo(),
        timestamp: new Date().toISOString()
      });
      
      // Prepare data for rendering with fresh calculations
      const currentDate = getCurrentDate();
      const paymentDueDate = getPaymentDueDate();
      const period = getPeriodInfo();
      const groupedExpenses = getGroupedExpenses();
      const apartmentCount = Object.keys(currentState.shares).length;
      
      // Calculate total expenses with fresh data
      console.log('Expense breakdown values:', currentExpenseBreakdown);
      console.log('Reserve fund info:', currentReserveFundInfo);
      console.log('Management fee info:', currentManagementFeeInfo);
      
      const currentTotalExpenses = Object.values(currentExpenseBreakdown).reduce((sum, val) => sum + val, 0) + 
                                  currentReserveFundInfo.totalContribution + 
                                  currentManagementFeeInfo.totalFee;
      
      // Fallback: use state.totalExpenses if calculated total is 0
      const finalTotalExpenses = currentTotalExpenses > 0 ? currentTotalExpenses : currentState.totalExpenses;
      
      console.log('Calculated total:', currentTotalExpenses, 'State total:', currentState.totalExpenses, 'Final total:', finalTotalExpenses);
      
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
            
            /* Header Section */
            .header { 
              text-align: center; 
              margin-bottom: 15px; 
              padding-bottom: 15px;
              border-bottom: 3px solid #2563eb; 
              background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
              padding: 15px;
              border-radius: 8px;
            }
            
            .brand { 
              font-size: 18pt; 
              font-weight: 700; 
              color: #2563eb; 
              margin-bottom: 6px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            
            .subtitle { 
              font-size: 10pt; 
              color: #64748b; 
              font-style: italic;
              margin-bottom: 10px;
            }
            
            .main-title { 
              font-size: 20pt; 
              font-weight: 700; 
              color: #1e293b; 
              margin: 10px 0;
              text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
            }
            
            .period { 
              font-size: 16pt; 
              font-weight: 600; 
              color: #0f172a; 
              background: #e0e7ff;
              padding: 8px 16px;
              border-radius: 20px;
              display: inline-block;
            }
            
            .timestamp {
              margin-top: 12px;
              font-size: 11pt;
              color: #475569;
              font-style: italic;
              background: #f1f5f9;
              padding: 6px 12px;
              border-radius: 15px;
              display: inline-block;
              border: 1px solid #e2e8f0;
            }
            
            /* Information Table */
            .info-section {
              margin: 25px 0;
            }
            
            .info-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 15px 0;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              border-radius: 8px;
              overflow: hidden;
            }
            
            .info-table th, .info-table td { 
              border: 1px solid #e2e8f0; 
              padding: 12px 16px; 
              text-align: left; 
            }
            
            .info-table th { 
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              color: white; 
              font-weight: 600; 
              width: 30%;
              font-size: 10pt;
            }
            
            .info-table td {
              background: #ffffff;
              font-weight: 500;
            }
            
            /* Section Titles */
            .section-title { 
              font-size: 14pt; 
              font-weight: 700; 
              color: #1e293b; 
              margin: 20px 0 15px 0; 
              padding: 8px 0 6px 0;
              border-bottom: 2px solid #3b82f6; 
              background: linear-gradient(90deg, #f1f5f9 0%, transparent 100%);
              padding-left: 15px;
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
            
            /* Analysis Table */
            .analysis-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 15px 0; 
              font-size: 6pt;
              background: white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .analysis-table th, .analysis-table td { 
              border: 1px solid #cbd5e1; 
              padding: 4px 2px; 
              text-align: center; 
            }
            
            .analysis-table th { 
              background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
              color: white; 
              font-weight: 600;
              font-size: 6pt;
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
              font-weight: 600;
              color: #1e293b;
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
          <!-- Header Section -->
          <div class="header">
            <div class="brand">Digital Concierge App</div>
            <div class="subtitle">online έκδοση κοινοχρήστων</div>
            <div class="main-title">Φύλλο Κοινοχρήστων</div>
            <div class="period">${period}</div>
            <div class="timestamp">
              ⏰ Εκδόθηκε: ${new Date().toLocaleString('el-GR', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
              })}
            </div>
          </div>
          
          <!-- Building Information and Expenses Side by Side -->
          <div class="info-section" style="display: flex; gap: 20px; margin: 20px 0;">
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
              <div style="background: #f8fafc; border-radius: 8px; padding: 15px; border-left: 5px solid #f59e0b;">
                <h3 style="font-size: 12pt; font-weight: 700; color: #1e293b; margin-bottom: 15px; text-align: center;">📊 ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ</h3>
                
                ${Object.keys(groupedExpenses).length === 0 ? 
                  '<div style="font-style: italic; color: #64748b; text-align: center; padding: 20px;">❌ Δεν βρέθηκαν δαπάνες</div>' : 
                  Object.entries(groupedExpenses).map(([groupKey, groupData]: [string, any]) => {
                    const groupLabels: Record<string, string> = {
                      'general': 'Α. ΚΟΙΝΟΧΡΗΣΤΑ',
                      'elevator': 'Β. ΑΝΕΛΚΗΣΤΗΡΑΣ', 
                      'heating': 'Γ. ΘΕΡΜΑΝΣΗ',
                      'equal_share': 'Δ. ΛΟΙΠΑ ΕΞΟΔΑ',
                      'individual': 'Ε. ΕΞΟΔΑ ΣΥΝΙΔΙΟΚΤΗΣΙΑΣ'
                    };
                    
                    let expenseHtml = `<div style="margin: 8px 0; padding: 6px 10px; background: white; border-radius: 6px; border-left: 3px solid #3b82f6;">
                      <strong style="color: #1e293b; font-size: 9pt;">${groupLabels[groupKey]}: ${formatAmount(groupData.total)}€</strong>`;
                    
                    if (groupData.expenses && groupData.expenses.length > 0) {
                      groupData.expenses.forEach((category: any, index: number) => {
                        expenseHtml += `<div style="margin-left: 15px; font-size: 8pt; color: #475569; padding: 2px 0;">
                          ${index + 1}. ${category.displayName}: ${formatAmount(category.total)}€</div>`;
                      });
                    }
                    expenseHtml += `</div>`;
                    return expenseHtml;
                  }).join('')
                }
                
                <!-- Total Amount Highlight -->
                <div style="margin: 15px 0; padding: 10px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; text-align: center; border-radius: 6px;">
                  <strong style="font-size: 11pt;">💰 ΣΥΝΟΛΟ: ${formatAmount(finalTotalExpenses)}€</strong>
                </div>
              </div>
            </div>
          </div>

          
          <!-- Apartments Analysis -->
          <div class="section-title">🏠 ΑΝΑΛΥΣΗ ΚΑΤΑ ΔΙΑΜΕΡΙΣΜΑΤΑ</div>
          
          <table class="analysis-table">
            <thead>
              <tr>
                <th rowspan="2">ΑΡΙΘΜΟΣ<br/>ΔΙΑΜΕΡΙΣΜΑΤΟΣ</th>
                <th rowspan="2">ΟΝΟΜΑΤΕΠΩΝΥΜΟ</th>
                <th colspan="3">ΘΕΡΜΑΝΣΗ</th>
                <th colspan="5">ΧΙΛΙΟΣΤΑ ΣΥΜΜΕΤΟΧΗΣ</th>
                <th colspan="5">ΠΟΣΟ ΠΟΥ ΑΝΑΛΟΓΕΙ</th>
                <th rowspan="2">ΣΤΡΟΓΓ.</th>
                <th rowspan="2">ΠΛΗΡΩΤΕΟ<br/>ΠΟΣΟ</th>
                <th rowspan="2">A/A</th>
              </tr>
              <tr>
                <th>ei</th><th>fi</th><th>ΘΕΡΜΙΔΕΣ</th>
                <th>ΚΟΙΝΟΧΡΗΣΤΑ</th><th>ΑΝΕΛΚΥΡΑΣ</th><th>ΘΕΡΜΑΝΣΗ</th><th>ΛΟΙΠΑ ΕΞΟΔΑ</th><th>ΕΞΟΔΑ ΣΥΝΙΔΙΟΚΤΗΣ</th>
                <th>ΚΟΙΝΟΧΡΗΣΤΑ</th><th>ΑΝΕΛΚΥΡΑΣ</th><th>ΘΕΡΜΑΝΣΗ</th><th>ΛΟΙΠΑ ΕΞΟΔΑ</th><th>ΕΞΟΔΑ ΣΥΝΙΔΙΟΚΤΗΣ</th>
              </tr>
            </thead>
            <tbody>
              ${Object.values(currentState.shares).map((share: any, index: number) => {
                const participationMills = toNumber(share.participation_mills);
                const row = currentPerApartmentAmounts[share.apartment_id] || { common:0, elevator:0, heating:0, other:0, coowner:0, reserve:0, total_due:0 };
                const managementFee = currentManagementFeeInfo.hasFee ? currentManagementFeeInfo.feePerApartment : 0;
                const currentReserveFundDetails = getReserveFundDetails();
                const apartmentReserveFund = currentReserveFundDetails.hasReserve ? (currentReserveFundDetails.monthlyAmount * (participationMills / 1000)) : 0;
                const totalWithFees = row.total_due + managementFee + apartmentReserveFund;
                const heatingBreakdown = share.heating_breakdown || { ei: 0, fi: 0, calories: 0 };
                
                const expenseBreakdownValues = {
                  common: toNumber(currentExpenseBreakdown.common),
                  elevator: toNumber(currentExpenseBreakdown.elevator),
                  heating: toNumber(currentExpenseBreakdown.heating),
                  other: toNumber(currentExpenseBreakdown.other),
                  coownership: toNumber(currentExpenseBreakdown.coownership)
                };
                
                const commonMills = participationMills * (expenseBreakdownValues.common / finalTotalExpenses || 0);
                const elevatorMills = participationMills * (expenseBreakdownValues.elevator / finalTotalExpenses || 0);
                const heatingMills = participationMills * (expenseBreakdownValues.heating / finalTotalExpenses || 0);
                const otherMills = participationMills * (expenseBreakdownValues.other / finalTotalExpenses || 0);
                const coownerMills = participationMills * (expenseBreakdownValues.coownership / finalTotalExpenses || 0);
                
                return `<tr>
                  <td class="font-bold text-primary">${share.identifier || share.apartment_number}</td>
                  <td class="text-left" style="padding-left: 8px;">${share.owner_name || 'Μη καταχωρημένος'}</td>
                  <td>${heatingBreakdown.ei?.toFixed(3) || '0.000'}</td>
                  <td>${heatingBreakdown.fi?.toFixed(2) || '0.00'}</td>
                  <td>${heatingBreakdown.calories?.toFixed(0) || '0'}</td>
                  <td>${commonMills.toFixed(2)}</td>
                  <td>${elevatorMills.toFixed(2)}</td>
                  <td>${heatingMills.toFixed(2)}</td>
                  <td>${otherMills.toFixed(2)}</td>
                  <td>${coownerMills.toFixed(2)}</td>
                  <td>${formatAmount(row.common)}</td>
                  <td>${formatAmount(row.elevator)}</td>
                  <td>${formatAmount(row.heating)}</td>
                  <td>${formatAmount(row.other)}</td>
                  <td>${formatAmount(row.coowner)}</td>
                  <td>0,00</td>
                  <td class="font-bold text-primary">${formatAmount(totalWithFees)}</td>
                  <td>${index + 1}</td>
                </tr>`;
              }).join('')}
              
              <tr class="totals-row">
                <td class="font-bold">ΣΥΝΟΛΑ</td>
                <td></td>
                <td>${Object.values(currentState.shares).reduce((sum: number, s: any) => sum + (s.heating_breakdown?.ei || 0), 0).toFixed(3)}</td>
                <td>${Object.values(currentState.shares).reduce((sum: number, s: any) => sum + (s.heating_breakdown?.fi || 0), 0).toFixed(2)}</td>
                <td>${Object.values(currentState.shares).reduce((sum: number, s: any) => sum + (s.heating_breakdown?.calories || 0), 0).toFixed(0)}</td>
                <td>${Object.values(currentState.shares).reduce((sum: number, s: any) => {
                  const participationMills = toNumber(s.participation_mills);
                  return sum + (participationMills * (toNumber(currentExpenseBreakdown.common) / finalTotalExpenses || 0));
                }, 0).toFixed(2)}</td>
                <td>${Object.values(currentState.shares).reduce((sum: number, s: any) => {
                  const participationMills = toNumber(s.participation_mills);
                  return sum + (participationMills * (toNumber(currentExpenseBreakdown.elevator) / finalTotalExpenses || 0));
                }, 0).toFixed(2)}</td>
                <td>${Object.values(currentState.shares).reduce((sum: number, s: any) => {
                  const participationMills = toNumber(s.participation_mills);
                  return sum + (participationMills * (toNumber(currentExpenseBreakdown.heating) / finalTotalExpenses || 0));
                }, 0).toFixed(2)}</td>
                <td>${Object.values(currentState.shares).reduce((sum: number, s: any) => {
                  const participationMills = toNumber(s.participation_mills);
                  return sum + (participationMills * (toNumber(currentExpenseBreakdown.other) / finalTotalExpenses || 0));
                }, 0).toFixed(2)}</td>
                <td>${Object.values(currentState.shares).reduce((sum: number, s: any) => {
                  const participationMills = toNumber(s.participation_mills);
                  return sum + (participationMills * (toNumber(currentExpenseBreakdown.coownership) / finalTotalExpenses || 0));
                }, 0).toFixed(2)}</td>
                <td class="font-bold">${formatAmount(currentTotalsFromRows.common)}</td>
                <td class="font-bold">${formatAmount(currentTotalsFromRows.elevator)}</td>
                <td class="font-bold">${formatAmount(currentTotalsFromRows.heating)}</td>
                <td class="font-bold">${formatAmount(currentTotalsFromRows.other)}</td>
                <td class="font-bold">${formatAmount(currentTotalsFromRows.coowner)}</td>
                <td>0,01</td>
                <td class="font-bold text-primary">${formatAmount(finalTotalExpenses)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
          
          <!-- Footer Information -->
          <div class="footer">
            <table class="info-table">
              <tr><th>📅 ΗΜΕΡΟΜΗΝΙΑ ΕΚΔΟΣΗΣ</th><td>${currentDate}</td></tr>
              <tr><th>🏠 ΣΥΝΟΛΟ ΔΙΑΜΕΡΙΣΜΑΤΩΝ</th><td>${apartmentCount}</td></tr>
              <tr><th>💰 ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ</th><td class="font-bold text-primary">${formatAmount(finalTotalExpenses)}€</td></tr>
            </table>
          </div>
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
      element.style.width = '297mm'; // A4 landscape width
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
        width: 1123, // A4 landscape width in pixels at 96 DPI
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
      const imgWidth = 297; // A4 landscape width in mm
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
      
      // Προσθήκη δαπανών διαχείρισης και αποθεματικού
      const managementFee = managementFeeInfo.hasFee ? managementFeeInfo.feePerApartment : 0;
      const apartmentReserveFund = reserveFundDetails.hasReserve ? 
        (reserveFundDetails.monthlyAmount * (participationMills / 1000)) : 0;
      const totalWithFees = row.total_due + managementFee + apartmentReserveFund;
      
      // Θέρμανση breakdown (ei, fi, θερμίδες)
      const heatingBreakdown = share.heating_breakdown || { ei: 0, fi: 0, calories: 0 };
      
      // Χιλιοστά συμμετοχής ανά κατηγορία
      const commonMills = participationMills * (expenseBreakdown.common / totalExpenses || 0);
      const elevatorMills = participationMills * (expenseBreakdown.elevator / totalExpenses || 0);
      const heatingMills = participationMills * (expenseBreakdown.heating / totalExpenses || 0);
      const otherMills = participationMills * (expenseBreakdown.other / totalExpenses || 0);
      const coownerMills = participationMills * (expenseBreakdown.coownership / totalExpenses || 0);
      
      return {
        'ΑΡΙΘΜΟΣ_ΔΙΑΜΕΡΙΣΜΑΤΟΣ': share.identifier || share.apartment_number,
        'ΟΝΟΜΑΤΕΠΩΝΥΜΟ': share.owner_name || 'Μη καταχωρημένος',
        'ΘΕΡΜΑΝΣΗ_ei': heatingBreakdown.ei?.toFixed(3) || '0.000',
        'ΘΕΡΜΑΝΣΗ_fi': heatingBreakdown.fi?.toFixed(2) || '0.00',
        'ΘΕΡΜΑΝΣΗ_ΘΕΡΜΙΔΕΣ': heatingBreakdown.calories?.toFixed(0) || '0',
        'ΧΙΛΙΟΣΤΑ_ΚΟΙΝΟΧΡΗΣΤΑ': commonMills.toFixed(2),
        'ΧΙΛΙΟΣΤΑ_ΑΝΕΛΚΥΡΑΣ': elevatorMills.toFixed(2),
        'ΧΙΛΙΟΣΤΑ_ΘΕΡΜΑΝΣΗ': heatingMills.toFixed(2),
        'ΧΙΛΙΟΣΤΑ_ΛΟΙΠΑ_ΕΞΟΔΑ': otherMills.toFixed(2),
        'ΧΙΛΙΟΣΤΑ_ΕΞΟΔΑ_ΣΥΝΙΔΙΟΚΤΗΣ': coownerMills.toFixed(2),
        'ΠΟΣΟ_ΚΟΙΝΟΧΡΗΣΤΑ': row.common,
        'ΠΟΣΟ_ΑΝΕΛΚΥΡΑΣ': row.elevator,
        'ΠΟΣΟ_ΘΕΡΜΑΝΣΗ': row.heating,
        'ΠΟΣΟ_ΛΟΙΠΑ_ΕΞΟΔΑ': row.other,
        'ΠΟΣΟ_ΕΞΟΔΑ_ΣΥΝΙΔΙΟΚΤΗΣ': row.coowner,
        'ΣΤΡΟΓΓ.': '0.00',
        'ΠΛΗΡΩΤΕΟ_ΠΟΣΟ': totalWithFees,
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
        'elevator': 'Β. ΑΝΕΛΚΗΣΤΗΡΑΣ',
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
    
    // Προσθήκη δαπανών διαχείρισης και αποθεματικού
    if (managementFeeInfo.hasFee) {
      statsData.push({ 'ΣΤΑΤΙΣΤΙΚΑ': 'Δαπάνες Διαχείρισης', 'ΤΙΜΗ': `${formatAmount(managementFeeInfo.totalFee)}€` });
    }
    if (reserveFundDetails.hasReserve) {
      statsData.push({ 'ΣΤΑΤΙΣΤΙΚΑ': 'Αποθεματικό', 'ΤΙΜΗ': `${formatAmount(reserveFundDetails.totalContribution)}€` });
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
                <h2 className="text-xl font-bold text-gray-800">Φύλλο Κοινοχρήστων</h2>
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
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
                <h1 className="text-2xl font-bold text-gray-800">Φύλλο Κοινοχρήστων</h1>
                <p className="text-lg text-gray-600">{getPeriodInfo()}</p>
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
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-800">ΠΟΛΥΚΑΤΟΙΚΙΑ</h3>
                </div>
                <p className="text-lg font-medium text-blue-900">{buildingName}</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-800">ΜΗΝΑΣ</h3>
                </div>
                <p className="text-lg font-medium text-green-900">{getPeriodInfo()}</p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-purple-800">ΔΙΑΧΕΙΡΙΣΤΗΣ</h3>
                </div>
                <p className="text-lg font-medium text-purple-900">Διαχειριστής Κτιρίου</p>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold text-orange-800">ΛΗΞΗ ΠΛΗΡΩΜΗΣ</h3>
                </div>
                <p className="text-lg font-medium text-orange-900">{getPaymentDueDate()}</p>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-yellow-600" />
                  <h3 className="font-semibold text-yellow-800">ΠΑΡΑΤΗΡΗΣΕΙΣ</h3>
                </div>
                <p className="text-sm font-medium text-yellow-900">ΕΙΣΠΡΑΞΗ ΚΟΙΝΟΧΡΗΣΤΩΝ: ΔΕΥΤΕΡΑ & ΤΕΤΑΡΤΗ ΑΠΟΓΕΥΜΑ</p>
              </div>
            </div>

            {/* Middle Column - Empty for spacing */}
            <div className="space-y-4">
            </div>

            {/* Right Column - Dynamic Expense Breakdown */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h3 className="font-bold text-gray-800 mb-4 text-center">ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ ΠΟΛΥΚΑΤΟΙΚΙΑΣ</h3>
              
              <div className="space-y-3">
                {(() => {
                  const groupedExpenses = getGroupedExpenses();
                  const sections = [];
                  
                  // A. ΚΟΙΝΟΧΡΗΣΤΑ
                  if (groupedExpenses.general) {
                    sections.push(
                      <div key="general" className="bg-blue-50 p-3 rounded border">
                        <h4 className="font-semibold text-gray-800 mb-2">Α. ΚΟΙΝΟΧΡΗΣΤΑ</h4>
                        <div className="space-y-1 text-sm">
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
                  
                  // B. ΑΝΕΛΚΗΣΤΗΡΑΣ
                  if (groupedExpenses.elevator) {
                    sections.push(
                      <div key="elevator" className="bg-blue-50 p-3 rounded border">
                        <h4 className="font-semibold text-gray-800 mb-2">Β. ΑΝΕΛΚΗΣΤΗΡΑΣ</h4>
                        <div className="space-y-1 text-sm">
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
                      <div key="heating" className="bg-blue-50 p-3 rounded border">
                        <h4 className="font-semibold text-gray-800 mb-2">Γ. ΘΕΡΜΑΝΣΗ</h4>
                        <div className="space-y-1 text-sm">
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
                      <div key="equal_share" className="bg-blue-50 p-3 rounded border">
                        <h4 className="font-semibold text-gray-800 mb-2">Δ. ΛΟΙΠΑ ΕΞΟΔΑ</h4>
                        <div className="space-y-1 text-sm">
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
                      <div key="individual" className="bg-blue-50 p-3 rounded border">
                        <h4 className="font-semibold text-gray-800 mb-2">Ε. ΕΞΟΔΑ ΣΥΝΙΔΙΟΚΤΗΣΙΑΣ</h4>
                        <div className="space-y-1 text-sm">
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
                  
                  // If no expenses found, show a message
                  if (sections.length === 0) {
                    sections.push(
                      <div key="no-expenses" className="bg-blue-50 p-3 rounded border">
                        <p className="text-sm text-gray-600 text-center">Δεν βρέθηκαν δαπάνες για αυτή την περίοδο</p>
                      </div>
                    );
                  }
                  
                  return sections;
                })()}

                {/* Grand Total */}
                <div className="bg-blue-600 text-white p-3 rounded border">
                  <div className="flex justify-between font-bold text-lg">
                    <span>ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ</span>
                    <span>{formatAmount(totalExpenses)}€</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Results Table */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="bg-gray-100 p-4 border-b">
              <h3 className="font-bold text-gray-800 text-center">ΑΝΑΛΥΣΗ ΚΑΤΑ ΔΙΑΜΕΡΙΣΜΑΤΑ</h3>
            </div>
            
            <div className="overflow-x-auto">
              <Table className="min-w-full common-expense-table" style={{ minWidth: '1100px' }}>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-center border font-bold text-xs">ΑΡΙΘΜΟΣ ΔΙΑΜΕΡΙΣΜΑΤΟΣ</TableHead>
                    <TableHead className="text-center border font-bold text-xs">ΟΝΟΜΑΤΕΠΩΝΥΜΟ</TableHead>
                    
                    {/* ΘΕΡΜΑΝΣΗ Section */}
                    <TableHead className="text-center border font-bold text-xs" colSpan={3}>
                      ΘΕΡΜΑΝΣΗ
                    </TableHead>
                    
                    {/* ΧΙΛΙΟΣΤΑ ΣΥΜΜΕΤΟΧΗΣ Section */}
                    <TableHead className="text-center border font-bold text-xs" colSpan={5}>
                      ΧΙΛΙΟΣΤΑ ΣΥΜΜΕΤΟΧΗΣ
                    </TableHead>
                    
                    {/* ΠΟΣΟ ΠΟΥ ΑΝΑΛΟΓΕΙ Section */}
                    <TableHead className="text-center border font-bold text-xs" colSpan={5}>
                      ΠΟΣΟ ΠΟΥ ΑΝΑΛΟΓΕΙ
                    </TableHead>
                    
                    <TableHead className="text-center border font-bold text-xs">ΣΤΡΟΓΓ.</TableHead>
                    <TableHead className="text-center border font-bold text-xs">ΠΛΗΡΩΤΕΟ ΠΟΣΟ</TableHead>
                    <TableHead className="text-center border font-bold text-xs">A/A</TableHead>
                  </TableRow>
                  
                  {/* Sub-headers Row */}
                  <TableRow className="bg-gray-100">
                    <TableHead className="text-center border"></TableHead>
                    <TableHead className="text-center border"></TableHead>
                    
                    {/* ΘΕΡΜΑΝΣΗ Sub-headers */}
                    <TableHead className="text-center border text-xs font-medium">ei</TableHead>
                    <TableHead className="text-center border text-xs font-medium">fi</TableHead>
                    <TableHead className="text-center border text-xs font-medium">ΘΕΡΜΙΔΕΣ</TableHead>
                    
                    {/* ΧΙΛΙΟΣΤΑ ΣΥΜΜΕΤΟΧΗΣ Sub-headers */}
                    <TableHead className="text-center border text-xs font-medium">ΚΟΙΝΟΧΡΗΣΤΑ</TableHead>
                    <TableHead className="text-center border text-xs font-medium">ΑΝΕΛΚΥΡΑΣ</TableHead>
                    <TableHead className="text-center border text-xs font-medium">ΘΕΡΜΑΝΣΗ</TableHead>
                    <TableHead className="text-center border text-xs font-medium">ΛΟΙΠΑ ΕΞΟΔΑ</TableHead>
                    <TableHead className="text-center border text-xs font-medium">ΕΞΟΔΑ ΣΥΝΙΔΙΟΚΤΗΣ</TableHead>
                    
                    {/* ΠΟΣΟ ΠΟΥ ΑΝΑΛΟΓΕΙ Sub-headers */}
                    <TableHead className="text-center border text-xs font-medium">ΚΟΙΝΟΧΡΗΣΤΑ</TableHead>
                    <TableHead className="text-center border text-xs font-medium">ΑΝΕΛΚΥΡΑΣ</TableHead>
                    <TableHead className="text-center border text-xs font-medium">ΘΕΡΜΑΝΣΗ</TableHead>
                    <TableHead className="text-center border text-xs font-medium">ΛΟΙΠΑ ΕΞΟΔΑ</TableHead>
                    <TableHead className="text-center border text-xs font-medium">ΕΞΟΔΑ ΣΥΝΙΔΙΟΚΤΗΣ</TableHead>
                    
                    <TableHead className="text-center border"></TableHead>
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
                    
                    // Προσθήκη δαπανών διαχείρισης και αποθεματικού
                    const managementFee = managementFeeInfo.hasFee ? managementFeeInfo.feePerApartment : 0;
                    const apartmentReserveFund = reserveFundDetails.hasReserve ? 
                      (reserveFundDetails.monthlyAmount * (participationMills / 1000)) : 0;
                    const totalWithFees = row.total_due + managementFee + apartmentReserveFund;
                    
                    // Θέρμανση breakdown (ei, fi, θερμίδες)
                    const heatingBreakdown = share.heating_breakdown || { ei: 0, fi: 0, calories: 0 };
                    
                    // Χιλιοστά συμμετοχής ανά κατηγορία
                    const commonMills = participationMills * (expenseBreakdown.common / totalExpenses || 0);
                    const elevatorMills = participationMills * (expenseBreakdown.elevator / totalExpenses || 0);
                    const heatingMills = participationMills * (expenseBreakdown.heating / totalExpenses || 0);
                    const otherMills = participationMills * (expenseBreakdown.other / totalExpenses || 0);
                    const coownerMills = participationMills * (expenseBreakdown.coownership / totalExpenses || 0);
                    
                    return (
                      <TableRow key={share.apartment_id} className="hover:bg-gray-50">
                        <TableCell className="text-center border font-medium text-xs">{share.identifier || share.apartment_number}</TableCell>
                        <TableCell className="border font-medium text-xs">{share.owner_name || 'Μη καταχωρημένος'}</TableCell>
                        
                        {/* ΘΕΡΜΑΝΣΗ */}
                        <TableCell className="text-center border text-xs">{heatingBreakdown.ei?.toFixed(3) || '0.000'}</TableCell>
                        <TableCell className="text-center border text-xs">{heatingBreakdown.fi?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell className="text-center border text-xs">{heatingBreakdown.calories?.toFixed(0) || '0'}</TableCell>
                        
                        {/* ΧΙΛΙΟΣΤΑ ΣΥΜΜΕΤΟΧΗΣ */}
                        <TableCell className="text-center border text-xs">{commonMills.toFixed(2)}</TableCell>
                        <TableCell className="text-center border text-xs">{elevatorMills.toFixed(2)}</TableCell>
                        <TableCell className="text-center border text-xs">{heatingMills.toFixed(2)}</TableCell>
                        <TableCell className="text-center border text-xs">{otherMills.toFixed(2)}</TableCell>
                        <TableCell className="text-center border text-xs">{coownerMills.toFixed(2)}</TableCell>
                        
                        {/* ΠΟΣΟ ΠΟΥ ΑΝΑΛΟΓΕΙ */}
                        <TableCell className="text-center border font-medium text-xs">{formatAmount(row.common)}</TableCell>
                        <TableCell className="text-center border font-medium text-xs">{formatAmount(row.elevator)}</TableCell>
                        <TableCell className="text-center border font-medium text-xs">{formatAmount(row.heating)}</TableCell>
                        <TableCell className="text-center border font-medium text-xs">{formatAmount(row.other)}</TableCell>
                        <TableCell className="text-center border font-medium text-xs">{formatAmount(row.coowner)}</TableCell>
                        
                        <TableCell className="text-center border text-xs">{formatAmount(0.00)}</TableCell>
                        <TableCell className="text-center border font-bold text-xs">{formatAmount(totalWithFees)}</TableCell>
                        <TableCell className="text-center border text-xs">{index + 1}</TableCell>
                      </TableRow>
                    );
                  })}
                  
                  {/* Totals Row */}
                  <TableRow className="bg-gray-100 font-bold">
                    <TableCell className="text-center border">ΣΥΝΟΛΑ</TableCell>
                    <TableCell className="border"></TableCell>
                    
                    {/* ΘΕΡΜΑΝΣΗ Totals */}
                    <TableCell className="text-center border"></TableCell>
                    <TableCell className="text-center border"></TableCell>
                    <TableCell className="text-center border">
                      {Object.values(state.shares).reduce((sum: number, s: any) => {
                        const heating = s.heating_breakdown?.calories || 0;
                        return sum + heating;
                      }, 0).toFixed(0)}
                    </TableCell>
                    
                    {/* ΧΙΛΙΟΣΤΑ ΣΥΜΜΕΤΟΧΗΣ Totals */}
                    <TableCell className="text-center border">
                      {Object.values(state.shares).reduce((sum: number, s: any) => {
                        const participationMills = toNumber(s.participation_mills);
                        const commonMills = participationMills * (expenseBreakdown.common / totalExpenses || 0);
                        return sum + commonMills;
                      }, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center border">
                      {Object.values(state.shares).reduce((sum: number, s: any) => {
                        const participationMills = toNumber(s.participation_mills);
                        const elevatorMills = participationMills * (expenseBreakdown.elevator / totalExpenses || 0);
                        return sum + elevatorMills;
                      }, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center border">
                      {Object.values(state.shares).reduce((sum: number, s: any) => {
                        const participationMills = toNumber(s.participation_mills);
                        const heatingMills = participationMills * (expenseBreakdown.heating / totalExpenses || 0);
                        return sum + heatingMills;
                      }, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center border">
                      {Object.values(state.shares).reduce((sum: number, s: any) => {
                        const participationMills = toNumber(s.participation_mills);
                        const otherMills = participationMills * (expenseBreakdown.other / totalExpenses || 0);
                        return sum + otherMills;
                      }, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center border">
                      {Object.values(state.shares).reduce((sum: number, s: any) => {
                        const participationMills = toNumber(s.participation_mills);
                        const coownerMills = participationMills * (expenseBreakdown.coownership / totalExpenses || 0);
                        return sum + coownerMills;
                      }, 0).toFixed(2)}
                    </TableCell>
                    
                    {/* ΠΟΣΟ ΠΟΥ ΑΝΑΛΟΓΕΙ Totals */}
                    <TableCell className="text-center border">{formatAmount(totalsFromRows.common)}</TableCell>
                    <TableCell className="text-center border">{formatAmount(totalsFromRows.elevator)}</TableCell>
                    <TableCell className="text-center border">{formatAmount(totalsFromRows.heating)}</TableCell>
                    <TableCell className="text-center border">{formatAmount(totalsFromRows.other)}</TableCell>
                    <TableCell className="text-center border">{formatAmount(totalsFromRows.coowner)}</TableCell>
                    
                    <TableCell className="text-center border">{formatAmount(0.01)}</TableCell>
                    <TableCell className="text-center border">{formatAmount(totalExpenses)}</TableCell>
                    <TableCell className="text-center border"></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 p-4 rounded-lg border">
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
    </div>
  );
};
