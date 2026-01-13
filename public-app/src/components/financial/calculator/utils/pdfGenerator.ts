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
import { ApartmentWithFinancialData } from '@/hooks/useApartmentsWithFinancialData';
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
  // Management office details
  managementOfficeName?: string;
  managementOfficePhone?: string;
  managementOfficeAddress?: string;
  managementOfficeLogo?: string;
  selectedMonth?: string;
  expenseBreakdown: ExpenseBreakdown;
  reserveFundInfo: ReserveFundInfo;
  managementFeeInfo: ManagementFeeInfo;
  groupedExpenses: GroupedExpenses;
  perApartmentAmounts: PerApartmentAmounts;
  aptWithFinancial: ApartmentWithFinancialData[];
  totalExpenses: number;
  getFinalTotalExpenses: () => number;
  getTotalPreviousBalance: () => number;
  monthlyExpenses?: any; // ✅ ΝΕΟ: Για τις επιμέρους δαπάνες
  buildingId?: number; // ✅ ΝΕΟ: Για να φέρνουμε τα δεδομένα
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
    managementOfficeName,
    managementOfficePhone,
    managementOfficeAddress,
    managementOfficeLogo,
    expenseBreakdown,
    reserveFundInfo,
    managementFeeInfo,
    groupedExpenses,
    perApartmentAmounts,
    aptWithFinancial,
    totalExpenses,
    getFinalTotalExpenses,
    getTotalPreviousBalance,
    monthlyExpenses,
    buildingId
  } = params;

  const reserveTotalFromShares = Object.values(perApartmentAmounts || {}).reduce(
    (sum, amount) => sum + toNumber((amount as any)?.reserve || 0),
    0
  );
  const reserveTotalForDisplay = reserveTotalFromShares > 0
    ? reserveTotalFromShares
    : (reserveFundInfo.monthlyAmount || 0);
  const expenseItemsTotal = monthlyExpenses?.expense_breakdown
    ? monthlyExpenses.expense_breakdown.reduce((sum: number, exp: any) => sum + toNumber(exp.amount || 0), 0)
    : 0;
  const totalForDisplay = expenseItemsTotal
    + (managementFeeInfo.totalFee || 0)
    + reserveTotalForDisplay
    + (getTotalPreviousBalance() || 0);

  if (typeof window === 'undefined') {
    toast.error('Η εξαγωγή PDF δεν είναι διαθέσιμη στον server');
    return;
  }

  try {
    const period = getPeriodInfo(state);
    const periodWithCycle = getPeriodInfoWithBillingCycle(state);
    const paymentDueDate = getPaymentDueDate(state, selectedMonth);
    const selectedMonth = params.selectedMonth || period;

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="el">
        <head>
          <meta charset="UTF-8">
          <title>Φύλλο Κοινοχρήστων - ${selectedMonth}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 8mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 11px;
              line-height: 1.3;
              margin: 0;
              padding: 0;
              color: #333;
            }
            .container { max-width: 100%; padding: 24px; }

            /* Exact match of TraditionalViewTab grid layout */
            .traditional-view-grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 24px;
              margin-bottom: 24px;
            }

            /* Card styles matching TraditionalViewTab exactly */
            .info-card {
              padding: 16px;
              border-radius: 8px;
              border: 1px solid;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              margin-bottom: 12px;
            }

            .card-building {
              background: linear-gradient(135deg, #eff6ff, #dbeafe);
              border-color: #3b82f6;
            }

            .card-manager {
              background: linear-gradient(135deg, #faf5ff, #f3e8ff);
              border-color: #8b5cf6;
            }

            .card-payment {
              background: linear-gradient(135deg, #fff7ed, #fed7aa);
              border-color: #f97316;
            }

            .card-bank {
              background: linear-gradient(135deg, #f0fdf4, #dcfce7);
              border-color: #22c55e;
            }

            .card-title {
              font-size: 12px;
              font-weight: bold;
              margin-bottom: 8px;
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .card-content {
              font-size: 14px;
              font-weight: 600;
              margin: 4px 0;
            }

            .card-subtitle {
              font-size: 12px;
              margin: 4px 0;
            }

            /* Analysis section (middle column) */
            .analysis-section {
              background: linear-gradient(135deg, #f9fafb, #f3f4f6);
              border: 1px solid #d1d5db;
              border-radius: 8px;
              padding: 16px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }

            .analysis-title {
              font-size: 14px;
              font-weight: bold;
              text-align: center;
              margin-bottom: 12px;
              color: #374151;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
            }

            .expense-item {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 8px 12px;
              background: white;
              border: 1px solid #e5e7eb;
              border-radius: 4px;
              margin-bottom: 8px;
            }

            .expense-item .number {
              font-weight: 500;
              color: #6b7280;
              font-size: 14px;
              margin-right: 8px;
            }

            .expense-item .label {
              font-weight: 600;
              color: #374151;
              font-size: 14px;
              flex: 1;
            }

            .expense-item .amount {
              font-weight: bold;
              color: #2563eb;
              font-size: 14px;
            }

            .total-item {
              background: #dbeafe !important;
              border-color: #3b82f6 !important;
              padding: 12px !important;
            }

            .total-item .number {
              font-weight: bold;
              color: #1d4ed8;
            }

            .total-item .label {
              font-weight: bold;
              color: #1e40af;
            }

            .total-item .amount {
              font-size: 18px;
              color: #1d4ed8;
            }

            /* Notes section (right column) */
            .notes-section {
              background: linear-gradient(135deg, #fffbeb, #fef3c7);
              border: 1px solid #f59e0b;
              border-radius: 8px;
              padding: 16px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }

            .notes-title {
              font-size: 14px;
              font-weight: bold;
              text-align: center;
              margin-bottom: 12px;
              color: #92400e;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
            }

            .notes-content {
              background: white;
              border: 1px solid #fbbf24;
              border-radius: 4px;
              padding: 12px;
              text-align: center;
            }

            .notes-main {
              font-size: 14px;
              font-weight: 500;
              color: #92400e;
              margin: 0;
            }

            .notes-sub {
              font-size: 12px;
              color: #a16207;
              margin: 4px 0 0 0;
            }

            /* Table section */
            .table-section {
              background: white;
              border: 1px solid #d1d5db;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              margin-top: 24px;
            }

            .table-header {
              background: #f3f4f6;
              padding: 16px;
              border-bottom: 1px solid #d1d5db;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }

            .table-header h3 {
              font-weight: bold;
              color: #374151;
              margin: 0;
              font-size: 18px;
            }

            .table-header p {
              font-size: 12px;
              color: #6b7280;
              margin: 4px 0 0 0;
            }

            /* Simple table for PDF */
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
            }

            th {
              background: #f9fafb;
              padding: 8px 6px;
              text-align: center;
              font-weight: bold;
              color: #374151;
              border: 1px solid #e5e7eb;
              font-size: 10px;
            }

            td {
              padding: 6px;
              text-align: center;
              border: 1px solid #e5e7eb;
              font-size: 10px;
            }

            tr:nth-child(even) {
              background: #f9fafb;
            }

            .text-left {
              text-align: left !important;
            }

            .text-right {
              text-align: right !important;
            }

            .font-bold {
              font-weight: bold;
            }

            .text-blue-600 {
              color: #2563eb;
            }

            .bg-blue-50 {
              background-color: #eff6ff;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Traditional View Grid Layout (exactly like the modal) -->
            <div class="traditional-view-grid">
              <!-- Left Column: Building & Manager Info -->
              <div>
                <div class="info-card card-building">
                  <div class="card-title" style="color: #1d4ed8;">
                    🏢 ΠΟΛΥΚΑΤΟΙΚΙΑ
                  </div>
                  <div class="card-content" style="color: #1e3a8a;">${buildingName}</div>
                  ${(buildingAddress || buildingCity || buildingPostalCode) ? `<div class="card-subtitle" style="color: #1d4ed8;">${buildingAddress || ''}${buildingCity ? `, ${buildingCity}` : ''}${buildingPostalCode ? ` ${buildingPostalCode}` : ''}</div>` : ''}
                </div>

                <div class="info-card card-manager">
                  <div class="card-title" style="color: #7c3aed;">
                    👤 ΔΙΑΧΕΙΡΙΣΤΗΣ
                  </div>
                  <div class="card-content" style="color: #6b21a8;">${managerName || ''}${managerApartment ? ` (Διαμ. ${managerApartment})` : ''}</div>
                  ${managerPhone ? `<div class="card-subtitle" style="color: #7c3aed;">${managerPhone}</div>` : ''}
                  ${managerCollectionSchedule ? `<div class="card-subtitle" style="color: #7c3aed;">${managerCollectionSchedule}</div>` : ''}
                </div>

                <div class="info-card card-payment">
                  <div class="card-title" style="color: #ea580c;">
                    📅 ΛΗΞΗ ΠΛΗΡΩΜΗΣ
                  </div>
                  <div class="card-content" style="color: #9a3412;">${paymentDueDate}</div>
                </div>

                <div class="info-card card-bank">
                  <div class="card-title" style="color: #16a34a;">
                    💳 ΤΡΑΠΕΖΙΚΑ ΣΤΟΙΧΕΙΑ
                  </div>
                  <div class="card-subtitle" style="color: #15803d;">Εθνική Τράπεζα</div>
                  <div class="card-subtitle" style="color: #15803d; font-family: monospace; background: #f0fdf4; padding: 8px; border-radius: 4px; margin: 4px 0;">IBAN: GR16 0110 1250 0000 1234 5678 901</div>
                  <div class="card-subtitle" style="color: #15803d;">Δικαιούχος: Πολυκατοικία ${buildingName}</div>
                </div>

                ${managementOfficeName || managementOfficePhone || managementOfficeAddress || managementOfficeLogo ? `
                <div class="info-card" style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-color: #f59e0b;">
                  ${managementOfficeLogo ? `<div style="text-align: center; margin-bottom: 8px;"><img src="${managementOfficeLogo}" alt="Office Logo" style="max-width: 60px; max-height: 60px; object-fit: contain;" /></div>` : ''}
                  <div class="card-title" style="color: #92400e;">
                    🏢 ΓΡΑΦΕΙΟ ΔΙΑΧΕΙΡΙΣΗΣ
                  </div>
                  ${managementOfficeName ? `<div class="card-content" style="color: #78350f; font-weight: bold;">${managementOfficeName}</div>` : ''}
                  ${managementOfficeAddress ? `<div class="card-subtitle" style="color: #92400e;">📍 ${managementOfficeAddress}</div>` : ''}
                  ${managementOfficePhone ? `<div class="card-subtitle" style="color: #92400e;">📞 ${managementOfficePhone}</div>` : ''}
                </div>
                ` : ''}
              </div>

              <!-- Middle Column: Expense Analysis -->
              <div class="analysis-section">
                <div class="analysis-title">
                  🧮 ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ ΠΟΛΥΚΑΤΟΙΚΙΑΣ
                </div>

                <!-- ✅ Επιμέρους Δαπάνες από API (αντί για συγκεντρωτικές "Λειτουργικές Δαπάνες") -->
                ${monthlyExpenses?.expense_breakdown && monthlyExpenses.expense_breakdown.length > 0
                  ? monthlyExpenses.expense_breakdown.map((expense: any, index: number) => {
                      // Διακριτικό κείμενο: Ε (Ένοικος) ή Δ (Ιδιοκτήτης)
                      const isOwner = expense.payer_responsibility === 'owner';
                      const payerColor = isOwner ? '#dc2626' : '#059669';
                      const payerText = isOwner ? 'Δ' : 'Ε';

                      return `
                        <div class="expense-item">
                          <span class="number">${index + 1}</span>
                          <div>
                            <span style="font-weight: bold; font-size: 11px; color: ${payerColor}; margin-right: 4px;">${payerText}</span><span class="label">${expense.category_display}</span>
                          </div>
                          <span class="amount">${formatAmount(expense.amount)}€</span>
                        </div>
                      `;
                    }).join('')
                  : ''
                }

                <div class="expense-item">
                  <span class="number">${(monthlyExpenses?.expense_breakdown?.length || 0) + 1}</span>
                  <div>
                    <span style="font-weight: bold; font-size: 11px; color: #059669; margin-right: 4px;">Ε</span>
                    <span class="label">Κόστος διαχείρισης</span>
                  </div>
                  <span class="amount">${formatAmount(managementFeeInfo.totalFee || 0)}€</span>
                </div>

                <div class="expense-item">
                  <span class="number">${(monthlyExpenses?.expense_breakdown?.length || 0) + 2}</span>
                  <div>
                    <span style="font-weight: bold; font-size: 11px; color: #dc2626; margin-right: 4px;">Δ</span>
                    <span class="label">Αποθεματικό Ταμείο</span>
                  </div>
                  <span class="amount">${formatAmount(reserveTotalForDisplay)}€</span>
                </div>

                <div class="expense-item">
                  <span class="number">${(monthlyExpenses?.expense_breakdown?.length || 0) + 3}</span>
                  <div>
                    <span class="label">Παλαιότερες οφειλές</span>
                  </div>
                  <span class="amount">${formatAmount(getTotalPreviousBalance() || 0)}€</span>
                </div>

                <div class="expense-item total-item">
                  <span class="number">Σ</span>
                  <div>
                    <span class="label">ΣΥΝΟΛΟ</span>
                  </div>
                  <span class="amount">${formatAmount(totalForDisplay)}€</span>
                </div>
              </div>

              <!-- Right Column: Notes -->
              <div class="notes-section">
                <div class="notes-title">
                  📝 ΠΑΡΑΤΗΡΗΣΕΙΣ
                </div>
                <div class="notes-content">
                  <p class="notes-main">ΕΙΣΠΡΑΞΗ ΚΟΙΝΟΧΡΗΣΤΩΝ</p>
                  <p class="notes-sub">ΔΕΥΤΕΡΑ & ΤΕΤΑΡΤΗ ΑΠΟΓΕΥΜΑ</p>
                </div>
              </div>
            </div>

            <!-- Apartment Table -->
            <div class="table-section">
              <div class="table-header">
                <div>
                  <h3>ΑΝΑΛΥΣΗ ΚΑΤΑ ΔΙΑΜΕΡΙΣΜΑΤΑ</h3>
                  <p>Πληρωτέο ποσό για ${selectedMonth ? new Date(selectedMonth + '-01').toLocaleDateString('el-GR', { month: 'long', year: 'numeric' }) : period}</p>
                </div>
              </div>

              <table>
                <thead>
                  <tr style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);">
                    <th style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white;">Α/Δ</th>
                    <th style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white;">ΟΝΟΜΑΤΕΠΩΝΥΜΟ</th>
                    <th style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white;">ΟΦΕΙΛΕΣ</th>
                    <th style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white;" colspan="3">ΧΙΛΙΟΣΤΑ ΣΥΜΜΕΤΟΧΗΣ</th>
                    <th style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color: white;" colspan="4">ΔΑΠΑΝΕΣ ΕΝΟΙΚΙΑΣΤΩΝ</th>
                    <th style="background: linear-gradient(135deg, #7e22ce 0%, #6d28d9 100%); color: white;">ΑΠΟΘΕΜΑΤΙΚΟ</th>
                    <th style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white;">ΠΛΗΡΩΤΕΟ ΠΟΣΟ</th>
                  </tr>
                  <tr style="background: #f3f4f6;">
                    <th style="background: #f3f4f6; font-size: 5px;"></th>
                    <th style="background: #f3f4f6; font-size: 5px;"></th>
                    <th style="background: #f3f4f6; font-size: 5px;"></th>
                    <th style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; font-size: 5px;">Κ/ΧΡΗΣΤΑ</th>
                    <th style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; font-size: 5px;">ΑΝΕΛ/ΡΑΣ</th>
                    <th style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; font-size: 5px;">ΘΕΡΜ/ΣΗ</th>
                    <th style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color: white; font-size: 5px;">Κ/ΧΡΗΣΤΑ</th>
                    <th style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color: white; font-size: 5px;">ΑΝΕΛ/ΡΑΣ</th>
                    <th style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color: white; font-size: 5px;">ΘΕΡΜ/ΣΗ</th>
                    <th style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color: white; font-size: 5px;">ΔΙΑΧΕΙΡΙΣΗ</th>
                    <th style="background: #f3f4f6; font-size: 5px;"></th>
                    <th style="background: #f3f4f6; font-size: 5px;"></th>
                  </tr>
                </thead>
                <tbody>
                  ${aptWithFinancial.map(apt => {
                    const aptAmount = perApartmentAmounts[apt.id] || {};
                    const previousBalance = toNumber(apt.previous_balance || 0);
                    const commonMills = apt.participation_mills || 0;
                    const elevatorMills = apt.participation_mills || 0;
                    const heatingMills = apt.heating_mills || apt.participation_mills || 0;
                    const apartmentReserveFund = (reserveFundInfo.monthlyAmount > 0) ? (reserveFundInfo.monthlyAmount * (commonMills / 1000)) : 0;
                    const totalAmount = (aptAmount.common || 0) + (aptAmount.elevator || 0) + (aptAmount.heating || 0) + (managementFeeInfo.feePerApartment || 0) + apartmentReserveFund + previousBalance;

                    return `
                      <tr>
                        <td class="text-left font-bold">${apt.apartment_number || apt.number || 'N/A'}</td>
                        <td class="text-left">${apt.owner_name || 'Άγνωστος'}</td>
                        <td class="text-right">${formatAmount(previousBalance)}€</td>
                        <td>${Math.round(commonMills)}</td>
                        <td>${Math.round(elevatorMills)}</td>
                        <td>${Math.round(heatingMills)}</td>
                        <td class="text-right">${formatAmount((aptAmount.common || 0) + apartmentReserveFund)}€</td>
                        <td class="text-right">${formatAmount(aptAmount.elevator || 0)}€</td>
                        <td class="text-right">${formatAmount(aptAmount.heating || 0)}€</td>
                        <td class="text-right">${formatAmount(managementFeeInfo.feePerApartment || 0)}€</td>
                        <td class="text-right">${formatAmount(apartmentReserveFund)}€</td>
                        <td class="text-right font-bold text-blue-600">${formatAmount(totalAmount)}€</td>
                      </tr>
                    `;
                  }).join('')}

                  <!-- Totals Row -->
                  <tr style="background: #f3f4f6; font-weight: bold;">
                    <td colspan="2" class="text-left font-bold">ΣΥΝΟΛΑ</td>
                    <td class="text-right font-bold">${formatAmount(aptWithFinancial.reduce((sum, apt) => sum + toNumber(apt.previous_balance || 0), 0))}€</td>
                    <td class="font-bold">${Math.round(aptWithFinancial.reduce((sum, apt) => sum + (apt.participation_mills || 0), 0))}</td>
                    <td class="font-bold">${Math.round(aptWithFinancial.reduce((sum, apt) => sum + (apt.participation_mills || 0), 0))}</td>
                    <td class="font-bold">${Math.round(aptWithFinancial.reduce((sum, apt) => sum + (apt.heating_mills || apt.participation_mills || 0), 0))}</td>
                    <td class="text-right font-bold">${formatAmount(aptWithFinancial.reduce((sum, apt) => {
                      const aptAmount = perApartmentAmounts[apt.id] || {};
                      const apartmentReserveFund = (reserveFundInfo.monthlyAmount > 0) ? (reserveFundInfo.monthlyAmount * ((apt.participation_mills || 0) / 1000)) : 0;
                      return sum + (aptAmount.common || 0) + apartmentReserveFund;
                    }, 0))}€</td>
                    <td class="text-right font-bold">${formatAmount(expenseBreakdown.elevator || 0)}€</td>
                    <td class="text-right font-bold">${formatAmount(expenseBreakdown.heating || 0)}€</td>
                    <td class="text-right font-bold">${formatAmount(managementFeeInfo.totalFee || 0)}€</td>
                    <td class="text-right font-bold">${formatAmount(reserveFundInfo.monthlyAmount || 0)}€</td>
                    <td class="text-right font-bold text-blue-600">${formatAmount(getFinalTotalExpenses())}€</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </body>
        </html>
      `;

    const element = document.createElement('div');
    element.innerHTML = htmlContent;
    document.body.appendChild(element);

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('l', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // If the content is too tall for one page, scale it down
    const maxPdfHeight = pdf.internal.pageSize.getHeight();
    const scale = pdfHeight > maxPdfHeight ? maxPdfHeight / pdfHeight : 1;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth * scale, pdfHeight * scale);
    pdf.save(`κοινοχρήστα_${selectedMonth || period.replace(/\s+/g, '_')}.pdf`);

    document.body.removeChild(element);

    toast.success('✅ Το PDF εξήχθη επιτυχώς!');

  } catch (error) {
    console.error('PDF Export Error Details:', error);
    toast.error('❌ Σφάλμα κατά την εξαγωγή PDF');
  }
};
