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
import { formatAmount } from './formatters';
import { getPeriodInfo, getPaymentDueDate } from './periodHelpers';

interface JpgGeneratorParams {
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

export const exportToJPG = async (params: JpgGeneratorParams) => {
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
    selectedMonth,
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
    toast.error('Η εξαγωγή JPG δεν είναι διαθέσιμη στον server');
    return;
  }

  try {
    const period = getPeriodInfo(state);
    const paymentDueDate = getPaymentDueDate(state);
    const selectedMonthDisplay = selectedMonth || period;

    const htmlContent = `
        <div style="
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 10px;
          line-height: 1.2;
          margin: 0;
          padding: 20px;
          color: #333;
          background: white;
          width: 1083px;
          min-height: 754px;
          box-sizing: border-box;
        ">
          <!-- Traditional View Grid Layout -->
          <div style="
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 16px;
            margin-bottom: 16px;
          ">
            <!-- Left Column -->
            <div>
              <div style="
                padding: 12px;
                border-radius: 6px;
                border: 1px solid #3b82f6;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                margin-bottom: 8px;
                background: linear-gradient(135deg, #eff6ff, #dbeafe);
              ">
                <div style="
                  font-size: 10px;
                  font-weight: bold;
                  margin-bottom: 6px;
                  color: #1d4ed8;
                ">
                  🏢 ΠΟΛΥΚΑΤΟΙΚΙΑ
                </div>
                <div style="
                  font-size: 11px;
                  font-weight: 600;
                  margin: 2px 0;
                  color: #1e3a8a;
                ">${buildingName}</div>
                ${(buildingAddress || buildingCity || buildingPostalCode) ? `<div style="font-size: 9px; margin: 2px 0; color: #1d4ed8;">${buildingAddress || ''}${buildingCity ? `, ${buildingCity}` : ''}${buildingPostalCode ? ` ${buildingPostalCode}` : ''}</div>` : ''}
              </div>

              <div style="
                padding: 12px;
                border-radius: 6px;
                border: 1px solid #8b5cf6;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                margin-bottom: 8px;
                background: linear-gradient(135deg, #faf5ff, #f3e8ff);
              ">
                <div style="
                  font-size: 10px;
                  font-weight: bold;
                  margin-bottom: 6px;
                  color: #7c3aed;
                ">
                  👤 ΔΙΑΧΕΙΡΙΣΤΗΣ
                </div>
                <div style="
                  font-size: 11px;
                  font-weight: 600;
                  margin: 2px 0;
                  color: #6b21a8;
                ">${managerName || ''}${managerApartment ? ` (Διαμ. ${managerApartment})` : ''}</div>
                ${managerPhone ? `<div style="font-size: 9px; margin: 2px 0; color: #7c3aed;">${managerPhone}</div>` : ''}
                ${managerCollectionSchedule ? `<div style="font-size: 9px; margin: 2px 0; color: #7c3aed;">${managerCollectionSchedule}</div>` : ''}
              </div>

              <div style="
                padding: 12px;
                border-radius: 6px;
                border: 1px solid #f97316;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                margin-bottom: 8px;
                background: linear-gradient(135deg, #fff7ed, #fed7aa);
              ">
                <div style="
                  font-size: 10px;
                  font-weight: bold;
                  margin-bottom: 6px;
                  color: #ea580c;
                ">
                  📅 ΛΗΞΗ ΠΛΗΡΩΜΗΣ
                </div>
                <div style="
                  font-size: 11px;
                  font-weight: 600;
                  margin: 2px 0;
                  color: #9a3412;
                ">${paymentDueDate}</div>
              </div>

              <div style="
                padding: 12px;
                border-radius: 6px;
                border: 1px solid #22c55e;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                margin-bottom: 8px;
                background: linear-gradient(135deg, #f0fdf4, #dcfce7);
              ">
                <div style="
                  font-size: 10px;
                  font-weight: bold;
                  margin-bottom: 6px;
                  color: #16a34a;
                ">
                  💳 ΤΡΑΠΕΖΙΚΑ ΣΤΟΙΧΕΙΑ
                </div>
                <div style="font-size: 9px; margin: 2px 0; color: #15803d;">Εθνική Τράπεζα</div>
                <div style="
                  font-size: 9px;
                  margin: 2px 0;
                  color: #15803d;
                  font-family: monospace;
                  background: #f0fdf4;
                  padding: 8px;
                  border-radius: 4px;
                ">IBAN: GR16 0110 1250 0000 1234 5678 901</div>
                <div style="font-size: 9px; margin: 2px 0; color: #15803d;">Δικαιούχος: Πολυκατοικία ${buildingName}</div>
              </div>
            </div>

            <!-- Middle Column -->
            <div style="
              background: linear-gradient(135deg, #f9fafb, #f3f4f6);
              border: 1px solid #d1d5db;
              border-radius: 6px;
              padding: 12px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            ">
              <div style="
                font-size: 11px;
                font-weight: bold;
                text-align: center;
                margin-bottom: 8px;
                color: #374151;
              ">
                🧮 ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ ΠΟΛΥΚΑΤΟΙΚΙΑΣ
              </div>

              <div style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 6px 8px;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 3px;
                margin-bottom: 4px;
              ">
                <span style="font-weight: 500; color: #6b7280; font-size: 11px;">1</span>
                <span style="font-weight: 600; color: #374151; font-size: 11px; flex: 1; margin-left: 6px;">Λειτουργικές Δαπάνες</span>
                <span style="font-weight: bold; color: #2563eb; font-size: 11px;">${formatAmount(expenseBreakdown.common || 0)}€</span>
              </div>

              <div style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 6px 8px;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 3px;
                margin-bottom: 4px;
              ">
                <span style="font-weight: 500; color: #6b7280; font-size: 11px;">2</span>
                <span style="font-weight: 600; color: #374151; font-size: 11px; flex: 1; margin-left: 6px;">Κόστος διαχείρισης</span>
                <span style="font-weight: bold; color: #2563eb; font-size: 11px;">${formatAmount(managementFeeInfo.totalFee || 0)}€</span>
              </div>

              <div style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 6px 8px;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 3px;
                margin-bottom: 4px;
              ">
                <span style="font-weight: 500; color: #6b7280; font-size: 11px;">3</span>
                <span style="font-weight: 600; color: #374151; font-size: 11px; flex: 1; margin-left: 6px;">Αποθεματικό Ταμείο</span>
                <span style="font-weight: bold; color: #2563eb; font-size: 11px;">${formatAmount(reserveFundInfo.monthlyAmount || 0)}€</span>
              </div>

              <div style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 6px 8px;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 3px;
                margin-bottom: 4px;
              ">
                <span style="font-weight: 500; color: #6b7280; font-size: 11px;">4</span>
                <span style="font-weight: 600; color: #374151; font-size: 11px; flex: 1; margin-left: 6px;">Παλαιότερες οφειλές</span>
                <span style="font-weight: bold; color: #2563eb; font-size: 11px;">${formatAmount(getTotalPreviousBalance() || 0)}€</span>
              </div>

              <div style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px;
                background: #dbeafe;
                border: 1px solid #3b82f6;
                border-radius: 3px;
                margin-bottom: 4px;
              ">
                <span style="font-weight: bold; color: #1d4ed8; font-size: 11px;">Σ</span>
                <span style="font-weight: bold; color: #1e40af; font-size: 11px; flex: 1; margin-left: 6px;">ΣΥΝΟΛΟ</span>
                <span style="font-weight: bold; color: #1d4ed8; font-size: 13px;">${formatAmount(getFinalTotalExpenses() || 0)}€</span>
              </div>
            </div>

            <!-- Right Column -->
            <div style="
              background: linear-gradient(135deg, #fffbeb, #fef3c7);
              border: 1px solid #f59e0b;
              border-radius: 6px;
              padding: 12px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            ">
              <div style="
                font-size: 11px;
                font-weight: bold;
                text-align: center;
                margin-bottom: 8px;
                color: #92400e;
              ">
                📝 ΠΑΡΑΤΗΡΗΣΕΙΣ
              </div>
              <div style="
                background: white;
                border: 1px solid #fbbf24;
                border-radius: 3px;
                padding: 8px;
                text-align: center;
              ">
                <p style="font-size: 11px; font-weight: 500; color: #92400e; margin: 0;">ΕΙΣΠΡΑΞΗ ΚΟΙΝΟΧΡΗΣΤΩΝ</p>
                <p style="font-size: 9px; color: #a16207; margin: 2px 0 0 0;">ΔΕΥΤΕΡΑ & ΤΕΤΑΡΤΗ ΑΠΟΓΕΥΜΑ</p>
              </div>
            </div>
          </div>

          <!-- Table Section -->
          <div style="
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            margin-top: 16px;
          ">
            <div style="
              background: #f3f4f6;
              padding: 10px 12px;
              border-bottom: 1px solid #d1d5db;
            ">
              <h3 style="
                font-weight: bold;
                color: #374151;
                margin: 0;
                font-size: 13px;
              ">ΑΝΑΛΥΣΗ ΚΑΤΑ ΔΙΑΜΕΡΙΣΜΑΤΑ</h3>
              <p style="
                font-size: 9px;
                color: #6b7280;
                margin: 2px 0 0 0;
              ">Πληρωτέο ποσό για ${selectedMonth ? new Date(selectedMonth + '-01').toLocaleDateString('el-GR', { month: 'long', year: 'numeric' }) : period}</p>
            </div>

            <table style="
              width: 100%;
              border-collapse: collapse;
              font-size: 8px;
            ">
              <thead>
                <tr style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);">
                  <th style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 6px 4px; text-align: center; border: 1px solid #e5e7eb;">Α/Δ</th>
                  <th style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 6px 4px; text-align: center; border: 1px solid #e5e7eb;">ΟΝΟΜΑΤΕΠΩΝΥΜΟ</th>
                  <th style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 6px 4px; text-align: center; border: 1px solid #e5e7eb;">ΟΦΕΙΛΕΣ</th>
                  <th style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 6px 4px; text-align: center; border: 1px solid #e5e7eb;">Κ/ΧΡΗΣΤΑ</th>
                  <th style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 6px 4px; text-align: center; border: 1px solid #e5e7eb;">ΑΝΕΛ/ΡΑΣ</th>
                  <th style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 6px 4px; text-align: center; border: 1px solid #e5e7eb;">ΘΕΡΜ/ΣΗ</th>
                  <th style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color: white; padding: 6px 4px; text-align: center; border: 1px solid #e5e7eb;">Κ/ΧΡΗΣΤΑ</th>
                  <th style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color: white; padding: 6px 4px; text-align: center; border: 1px solid #e5e7eb;">ΑΝΕΛ/ΡΑΣ</th>
                  <th style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color: white; padding: 6px 4px; text-align: center; border: 1px solid #e5e7eb;">ΘΕΡΜ/ΣΗ</th>
                  <th style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color: white; padding: 6px 4px; text-align: center; border: 1px solid #e5e7eb;">ΔΙΑΧΕΙΡΙΣΗ</th>
                  <th style="background: linear-gradient(135deg, #7e22ce 0%, #6d28d9 100%); color: white; padding: 6px 4px; text-align: center; border: 1px solid #e5e7eb;">ΑΠΟΘΕΜΑΤΙΚΟ</th>
                  <th style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 6px 4px; text-align: center; border: 1px solid #e5e7eb;">ΠΛΗΡΩΤΕΟ ΠΟΣΟ</th>
                </tr>
              </thead>
              <tbody>
                ${aptWithFinancial.map((apt, index) => {
                  const aptAmount = perApartmentAmounts[apt.id] || {};
                  const previousBalance = Math.abs(apt.previous_balance || 0);
                  const commonMills = apt.participation_mills || 0;
                  const elevatorMills = apt.participation_mills || 0;
                  const heatingMills = apt.heating_mills || apt.participation_mills || 0;
                  const apartmentReserveFund = (reserveFundInfo.monthlyAmount > 0) ? (reserveFundInfo.monthlyAmount * (commonMills / 1000)) : 0;
                  const totalAmount = (aptAmount.common || 0) + (aptAmount.elevator || 0) + (aptAmount.heating || 0) + (managementFeeInfo.perApartment || 0) + apartmentReserveFund + previousBalance;

                  return `
                    <tr style="${index % 2 === 0 ? 'background: #f9fafb;' : 'background: white;'}">
                      <td style="padding: 4px 3px; text-align: left; border: 1px solid #e5e7eb; font-weight: bold;">${apt.apartment_number || apt.number || 'N/A'}</td>
                      <td style="padding: 4px 3px; text-align: left; border: 1px solid #e5e7eb;">${apt.owner_name || 'Άγνωστος'}</td>
                      <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb;">${formatAmount(previousBalance)}€</td>
                      <td style="padding: 4px 3px; text-align: center; border: 1px solid #e5e7eb;">${Math.round(commonMills)}</td>
                      <td style="padding: 4px 3px; text-align: center; border: 1px solid #e5e7eb;">${Math.round(elevatorMills)}</td>
                      <td style="padding: 4px 3px; text-align: center; border: 1px solid #e5e7eb;">${Math.round(heatingMills)}</td>
                      <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb;">${formatAmount((aptAmount.common || 0) + apartmentReserveFund)}€</td>
                      <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb;">${formatAmount(aptAmount.elevator || 0)}€</td>
                      <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb;">${formatAmount(aptAmount.heating || 0)}€</td>
                      <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb;">${formatAmount(managementFeeInfo.perApartment || 0)}€</td>
                      <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb;">${formatAmount(apartmentReserveFund)}€</td>
                      <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold; color: #2563eb;">${formatAmount(totalAmount)}€</td>
                    </tr>
                  `;
                }).join('')}

                <!-- Totals Row -->
                <tr style="background: #f3f4f6; font-weight: bold;">
                  <td colspan="2" style="padding: 4px 3px; text-align: left; border: 1px solid #e5e7eb; font-weight: bold;">ΣΥΝΟΛΑ</td>
                  <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">${formatAmount(aptWithFinancial.reduce((sum, apt) => sum + Math.abs(apt.previous_balance || 0), 0))}€</td>
                  <td style="padding: 4px 3px; text-align: center; border: 1px solid #e5e7eb; font-weight: bold;">${Math.round(aptWithFinancial.reduce((sum, apt) => sum + (apt.participation_mills || 0), 0))}</td>
                  <td style="padding: 4px 3px; text-align: center; border: 1px solid #e5e7eb; font-weight: bold;">${Math.round(aptWithFinancial.reduce((sum, apt) => sum + (apt.participation_mills || 0), 0))}</td>
                  <td style="padding: 4px 3px; text-align: center; border: 1px solid #e5e7eb; font-weight: bold;">${Math.round(aptWithFinancial.reduce((sum, apt) => sum + (apt.heating_mills || apt.participation_mills || 0), 0))}</td>
                  <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">${formatAmount(aptWithFinancial.reduce((sum, apt) => {
                    const aptAmount = perApartmentAmounts[apt.id] || {};
                    const apartmentReserveFund = (reserveFundInfo.monthlyAmount > 0) ? (reserveFundInfo.monthlyAmount * ((apt.participation_mills || 0) / 1000)) : 0;
                    return sum + (aptAmount.common || 0) + apartmentReserveFund;
                  }, 0))}€</td>
                  <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">${formatAmount(expenseBreakdown.elevator || 0)}€</td>
                  <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">${formatAmount(expenseBreakdown.heating || 0)}€</td>
                  <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">${formatAmount(managementFeeInfo.totalFee || 0)}€</td>
                  <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">${formatAmount(reserveFundInfo.monthlyAmount || 0)}€</td>
                  <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold; color: #2563eb;">${formatAmount(getFinalTotalExpenses())}€</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Create temporary element
      const element = document.createElement('div');
      element.innerHTML = htmlContent;
      element.style.position = 'fixed';
      element.style.top = '-10000px';
      element.style.left = '-10000px';
      element.style.width = '1123px';
      element.style.height = '794px';
      element.style.visibility = 'hidden';
      document.body.appendChild(element);

      try {
        // Wait for rendering
        await new Promise(resolve => setTimeout(resolve, 500));

        // Generate screenshot
        const canvas = await html2canvas(element, {
          scale: 1.5,
          width: 1123,
          height: 794,
          backgroundColor: '#ffffff',
          useCORS: true,
          allowTaint: false,
          foreignObjectRendering: true
        });

        // Create and download JPG
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `Κοινοχρηστα-${buildingName.replace(/[^a-zA-Z0-9]/g, '_')}-${selectedMonthDisplay.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

      } catch (error) {
        console.error('Error generating JPG:', error);
        throw new Error('Failed to generate JPG file');
      } finally {
        // Clean up
        document.body.removeChild(element);
      }
    } catch (error) {
      console.error('Error in JPG export:', error);
      throw error;
    }
  };

  export default exportToJPG;
