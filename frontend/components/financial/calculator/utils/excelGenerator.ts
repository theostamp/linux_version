
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { 
  CalculatorState, 
  ExpenseBreakdown, 
  ReserveFundInfo, 
  ManagementFeeInfo, 
  PerApartmentAmounts,
  GroupedExpenses,
  Share
} from '../types/financial';
import { ApartmentWithFinancialData } from '@/hooks/useApartmentsWithFinancialData';
import { formatAmount, toNumber } from './formatters';
import { getPeriodInfo } from './periodHelpers';

interface ExcelGeneratorParams {
  state: CalculatorState;
  aptWithFinancial: ApartmentWithFinancialData[];
  perApartmentAmounts: PerApartmentAmounts;
  managementFeeInfo: ManagementFeeInfo;
  expenseBreakdown: ExpenseBreakdown;
  reserveFundDetails: any;
  totalExpenses: number;
  getGroupedExpenses: () => GroupedExpenses;
}

export const exportToExcel = async (params: ExcelGeneratorParams) => {
  const {
    state,
    aptWithFinancial,
    perApartmentAmounts,
    managementFeeInfo,
    expenseBreakdown,
    reserveFundDetails,
    totalExpenses,
    getGroupedExpenses
  } = params;

  if (typeof window === 'undefined') {
    toast.error('Η εξαγωγή Excel δεν είναι διαθέσιμη στον server');
    return;
  }

  try {
    const workbook = XLSX.utils.book_new();
    const mainData = Object.values(state.shares as { [key: string]: Share }).map((share, index) => {
      // ... (Excel data mapping logic) ...
    });
    
    const mainWorksheet = XLSX.utils.json_to_sheet(mainData);
    XLSX.utils.book_append_sheet(workbook, mainWorksheet, 'Κοινοχρήστα');

    // ... (add stats worksheet) ...

    const fileName = `κοινοχρηστα_${getPeriodInfo(state).replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, fileName);
    
    toast.success('Εξαγωγή Excel ολοκληρώθηκε επιτυχώς!');
  } catch (error) {
    console.error('Excel Export Error:', error);
    toast.error('Σφάλμα κατά την εξαγωγή Excel');
  }
};
