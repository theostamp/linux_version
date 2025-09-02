import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { 
  CalculatorState, 
  ExpenseBreakdown, 
  ReserveFundInfo, 
  ManagementFeeInfo, 
  GroupedExpenses, 
  PerApartmentAmounts,
  Share
} from '../types/financial';
import { formatAmount, toNumber } from './formatters';
import { getPeriodInfo, getPeriodInfoWithBillingCycle, getPaymentDueDate } from './periodHelpers';

interface PdfGeneratorParams {
  state: CalculatorState;
  buildingName: string;
  buildingAddress?: string;
  buildingCity?: string;
  buildingPostalCode?: string;
  managerName?: string;
  managerApartment?: string;
  managerPhone?: string;
  managerCollectionSchedule?: string;
  expenseBreakdown: ExpenseBreakdown;
  reserveFundInfo: ReserveFundInfo;
  managementFeeInfo: ManagementFeeInfo;
  groupedExpenses: GroupedExpenses;
  perApartmentAmounts: PerApartmentAmounts;
  aptWithFinancial: any[];
  totalExpenses: number;
  getFinalTotalExpenses: () => number;
  getTotalPreviousBalance: () => number;
}

export const exportToPDF = async (params: PdfGeneratorParams) => {
  const {
    state,
    buildingName,
    buildingAddress,
    buildingCity,
    buildingPostalCode,
    managerName,
    managerApartment,
    managerPhone,
    managerCollectionSchedule,
    expenseBreakdown,
    reserveFundInfo,
    managementFeeInfo,
    groupedExpenses,
    perApartmentAmounts,
    aptWithFinancial,
    totalExpenses,
    getFinalTotalExpenses,
    getTotalPreviousBalance
  } = params;

  if (typeof window === 'undefined') {
    toast.error('Η εξαγωγή PDF δεν είναι διαθέσιμη στον server');
    return;
  }

  try {
    const period = getPeriodInfo(state);
    const periodWithCycle = getPeriodInfoWithBillingCycle(state);
    const paymentDueDate = getPaymentDueDate(state);

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="el">
        <head>
          <meta charset="UTF-8">
          <title>Φύλλο Κοινοχρήστων - ${period}</title>
          <style>
            /* ... CSS styles ... */
          </style>
        </head>
        <body>
          /* ... HTML content ... */
        </body>
        </html>
      `;

    const element = document.createElement('div');
    element.innerHTML = htmlContent;
    document.body.appendChild(element);

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`κοινοχρήστα_${period}.pdf`);

    document.body.removeChild(element);

    toast.success('✅ Το PDF εξήχθη επιτυχώς!');

  } catch (error) {
    console.error('PDF Export Error Details:', error);
    toast.error('❌ Σφάλμα κατά την εξαγωγή PDF');
  }
};