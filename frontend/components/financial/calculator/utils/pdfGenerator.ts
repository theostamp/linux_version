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
              font-size: 10px;
              line-height: 1.2;
              margin: 0;
              padding: 0;
              color: #333;
            }
            .container { max-width: 100%; }
            .header { margin-bottom: 8px; }
            .management-info {
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 4px;
              padding: 4px 6px;
              background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
              border: 1px solid #0284c7;
              border-radius: 3px;
            }
            .management-info h2 {
              color: #0284c7;
              font-size: 12px;
              font-weight: bold;
              margin: 0;
            }
            .management-info .contact {
              font-size: 8px;
              color: #475569;
              margin: 0;
            }
            .title-section {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin: 6px 0;
            }
            .title {
              font-size: 14px;
              font-weight: bold;
              color: #1f2937;
            }
            .badge {
              background: #dbeafe;
              color: #1d4ed8;
              padding: 3px 6px;
              border-radius: 3px;
              font-size: 10px;
              font-weight: bold;
              border: 1px solid #3b82f6;
            }
            .content-grid {
              display: grid;
              grid-template-columns: 260px 1fr 200px;
              gap: 12px;
              margin-bottom: 8px;
            }
            .info-card {
              padding: 6px;
              border-radius: 3px;
              border: 1px solid;
              margin-bottom: 4px;
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
              font-size: 8px;
              font-weight: bold;
              margin-bottom: 1px;
              display: flex;
              align-items: center;
              gap: 2px;
            }
            .card-content {
              font-size: 9px;
              font-weight: 600;
              margin: 1px 0;
            }
            .card-subtitle {
              font-size: 7px;
              margin: 1px 0;
            }
            .analysis-section {
              background: linear-gradient(135deg, #f9fafb, #f3f4f6);
              border: 1px solid #d1d5db;
              border-radius: 3px;
              padding: 6px;
            }
            .analysis-title {
              font-size: 9px;
              font-weight: bold;
              text-align: center;
              margin-bottom: 4px;
              color: #374151;
            }
            .expense-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 3px 4px;
              background: white;
              border: 1px solid #e5e7eb;
              border-radius: 2px;
              margin-bottom: 1px;
            }
            .expense-item .number {
              font-weight: 500;
              color: #6b7280;
              font-size: 8px;
              width: 8px;
            }
            .expense-item .label {
              font-weight: 600;
              color: #374151;
              font-size: 8px;
              flex: 1;
              margin-left: 4px;
            }
            .expense-item .amount {
              font-weight: bold;
              color: #2563eb;
              font-size: 8px;
            }
            .total-item {
              background: #dbeafe !important;
              border-color: #3b82f6 !important;
              padding: 4px !important;
            }
            .total-item .number { font-weight: bold; color: #1d4ed8; }
            .total-item .label { font-weight: bold; color: #1e40af; }
            .total-item .amount { font-size: 9px; color: #1d4ed8; }
            .notes-section {
              background: linear-gradient(135deg, #fffbeb, #fef3c7);
              border: 1px solid #f59e0b;
              border-radius: 3px;
              padding: 6px;
            }
            .notes-title {
              font-size: 8px;
              font-weight: bold;
              text-align: center;
              margin-bottom: 3px;
              color: #92400e;
            }
            .notes-content {
              background: white;
              border: 1px solid #fbbf24;
              border-radius: 2px;
              padding: 4px;
              text-align: center;
            }
            .notes-main {
              font-size: 8px;
              font-weight: 500;
              color: #92400e;
              margin: 0;
            }
            .notes-sub {
              font-size: 7px;
              color: #a16207;
              margin: 1px 0 0 0;
            }
            .table-section {
              margin-top: 6px;
              border: 1px solid #d1d5db;
              border-radius: 3px;
              overflow: hidden;
            }
            .table-header {
              background: #f3f4f6;
              padding: 4px 6px;
              border-bottom: 1px solid #d1d5db;
            }
            .table-header h3 {
              font-weight: bold;
              color: #374151;
              margin: 0;
              font-size: 9px;
            }
            .table-header p {
              font-size: 7px;
              color: #6b7280;
              margin: 1px 0 0 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 7px;
            }
            th {
              background: #f9fafb;
              padding: 3px 2px;
              text-align: center;
              font-weight: bold;
              color: #374151;
              border: 1px solid #e5e7eb;
              font-size: 6px;
            }
            td {
              padding: 2px 3px;
              text-align: center;
              border: 1px solid #e5e7eb;
              font-size: 6px;
            }
            tr:nth-child(even) { background: #f9fafb; }
            .text-left { text-align: left !important; }
            .text-right { text-align: right !important; }
            .font-bold { font-weight: bold; }
            .text-blue-600 { color: #2563eb; }
            .bg-blue-50 { background-color: #eff6ff; }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              ${managementOfficeName || managementOfficePhone || managementOfficeAddress ? `
                <div class="management-info">
                  <div>
                    <h2>${managementOfficeName || 'Γραφείο Διαχείρισης'}</h2>
                    ${managementOfficePhone ? `<p class="contact">📞 ${managementOfficePhone}</p>` : ''}
                    ${managementOfficeAddress ? `<p class="contact">📍 ${managementOfficeAddress}</p>` : ''}
                  </div>
                </div>
              ` : ''}

              <div class="title-section">
                <h1 class="title">Φύλλο Κοινοχρήστων</h1>
                <div class="badge">${selectedMonth ? new Date(selectedMonth + '-01').toLocaleDateString('el-GR', { month: 'long', year: 'numeric' }) : period}</div>
              </div>
            </div>

            <!-- Main Content Grid -->
            <div class="content-grid">
              <!-- Left Column: Building & Manager Info -->
              <div>
                <div class="info-card card-building">
                  <div class="card-title" style="color: #1d4ed8;">🏢 ΠΟΛΥΚΑΤΟΙΚΙΑ</div>
                  <div class="card-content" style="color: #1e3a8a;">${buildingName}</div>
                  ${(buildingAddress || buildingCity || buildingPostalCode) ? `<div class="card-subtitle" style="color: #1d4ed8;">${buildingAddress || ''}${buildingCity ? `, ${buildingCity}` : ''}${buildingPostalCode ? ` ${buildingPostalCode}` : ''}</div>` : ''}
                </div>

                <div class="info-card card-manager">
                  <div class="card-title" style="color: #7c3aed;">👤 ΔΙΑΧΕΙΡΙΣΤΗΣ</div>
                  <div class="card-content" style="color: #6b21a8;">${managerName || ''}${managerApartment ? ` (Διαμ. ${managerApartment})` : ''}</div>
                  ${managerPhone ? `<div class="card-subtitle" style="color: #7c3aed;">${managerPhone}</div>` : ''}
                  ${managerCollectionSchedule ? `<div class="card-subtitle" style="color: #7c3aed;">${managerCollectionSchedule}</div>` : ''}
                </div>

                <div class="info-card card-payment">
                  <div class="card-title" style="color: #ea580c;">📅 ΛΗΞΗ ΠΛΗΡΩΜΗΣ</div>
                  <div class="card-content" style="color: #9a3412;">${paymentDueDate}</div>
                </div>

                <div class="info-card card-bank">
                  <div class="card-title" style="color: #16a34a;">💳 ΤΡΑΠΕΖΙΚΑ ΣΤΟΙΧΕΙΑ</div>
                  <div class="card-subtitle" style="color: #15803d;">Εθνική Τράπεζα</div>
                  <div class="card-subtitle" style="color: #15803d; font-family: monospace; background: #f0fdf4; padding: 2px; border-radius: 2px;">IBAN: GR16 0110 1250 0000 1234 5678 901</div>
                  <div class="card-subtitle" style="color: #15803d;">Δικαιούχος: Πολυκατοικία ${buildingName}</div>
                </div>
              </div>

              <!-- Middle Column: Expense Analysis -->
              <div class="analysis-section">
                <div class="analysis-title">📊 ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ ΠΟΛΥΚΑΤΟΙΚΙΑΣ</div>

                <div class="expense-item">
                  <span class="number">1</span>
                  <span class="label">Λειτουργικές Δαπάνες</span>
                  <span class="amount">${formatAmount(expenseBreakdown.common || 0)}€</span>
                </div>

                <div class="expense-item">
                  <span class="number">2</span>
                  <span class="label">Κόστος διαχείρισης</span>
                  <span class="amount">${formatAmount(managementFeeInfo.totalFee || 0)}€</span>
                </div>

                <div class="expense-item">
                  <span class="number">3</span>
                  <span class="label">Αποθεματικό Ταμείο</span>
                  <span class="amount">${formatAmount(reserveFundInfo.monthlyAmount || 0)}€</span>
                </div>

                <div class="expense-item">
                  <span class="number">4</span>
                  <span class="label">Παλαιότερες οφειλές</span>
                  <span class="amount">${formatAmount(getTotalPreviousBalance() || 0)}€</span>
                </div>

                <div class="expense-item total-item">
                  <span class="number">Σ</span>
                  <span class="label">ΣΥΝΟΛΟ</span>
                  <span class="amount">${formatAmount(getFinalTotalExpenses() || 0)}€</span>
                </div>
              </div>

              <!-- Right Column: Notes -->
              <div class="notes-section">
                <div class="notes-title">📝 ΠΑΡΑΤΗΡΗΣΕΙΣ</div>
                <div class="notes-content">
                  <p class="notes-main">ΕΙΣΠΡΑΞΗ ΚΟΙΝΟΧΡΗΣΤΩΝ</p>
                  <p class="notes-sub">ΔΕΥΤΕΡΑ & ΤΕΤΑΡΤΗ ΑΠΟΓΕΥΜΑ</p>
                </div>
              </div>
            </div>

            <!-- Apartment Table -->
            <div class="table-section">
              <div class="table-header">
                <h3>ΑΝΑΛΥΣΗ ΚΑΤΑ ΔΙΑΜΕΡΙΣΜΑΤΑ</h3>
                <p>Πληρωτέο ποσό για ${selectedMonth ? new Date(selectedMonth + '-01').toLocaleDateString('el-GR', { month: 'long', year: 'numeric' }) : period}</p>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Διαμ.</th>
                    <th>Κάτοικος/Ιδιοκτήτης</th>
                    <th>Χιλ.</th>
                    <th>Λειτουργικές</th>
                    <th>Διαχείριση</th>
                    <th>Αποθεματικό</th>
                    <th>Προηγ. Υπόλ.</th>
                    <th>ΣΥΝΟΛΟ</th>
                  </tr>
                </thead>
                <tbody>
                  ${aptWithFinancial.map(apt => {
                    const aptAmount = perApartmentAmounts[apt.id] || {};
                    const previousBalance = Math.abs(apt.previous_balance || 0);
                    const totalAmount = (aptAmount.common || 0) + (managementFeeInfo.perApartment || 0) + (aptAmount.reserve || 0) + previousBalance;

                    return `
                      <tr>
                        <td class="text-left font-bold">${apt.apartment_number || apt.number || 'N/A'}</td>
                        <td class="text-left">${apt.owner_name || 'Άγνωστος'}</td>
                        <td>${apt.participation_mills || 0}</td>
                        <td class="text-right">${formatAmount(aptAmount.common || 0)}€</td>
                        <td class="text-right">${formatAmount(managementFeeInfo.perApartment || 0)}€</td>
                        <td class="text-right">${formatAmount(aptAmount.reserve || 0)}€</td>
                        <td class="text-right">${formatAmount(previousBalance)}€</td>
                        <td class="text-right font-bold text-blue-600">${formatAmount(totalAmount)}€</td>
                      </tr>
                    `;
                  }).join('')}
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