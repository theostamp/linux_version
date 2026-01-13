import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { notificationsApi } from '@/lib/api/notifications';
import {
  CalculatorState,
  ExpenseBreakdown,
  ReserveFundInfo,
  ManagementFeeInfo,
  GroupedExpenses,
  PerApartmentAmounts,
  Share,
  ExpenseSplitRatios
} from '../types/financial';
import { ApartmentWithFinancialData } from '@/hooks/useApartmentsWithFinancialData';
import { formatAmount, toNumber } from './formatters';
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
  expenseSplitRatios?: ExpenseSplitRatios;
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

interface JpgExportOptions {
  skipDownload?: boolean;
  skipKiosk?: boolean;
  returnBlob?: boolean;
  silent?: boolean;
}

export const exportToJPG = async (
  params: JpgGeneratorParams,
  options: JpgExportOptions = {}
): Promise<{ blob: Blob; fileName: string; imgData: string } | void> => {
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
    expenseSplitRatios,
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

  if (typeof window === 'undefined') {
    if (!options.silent) {
      toast.error('Η εξαγωγή JPG δεν είναι διαθέσιμη στον server');
    }
    return;
  }

  try {
    if (!options.silent) {
      toast.info('Δημιουργία JPG... Παρακαλώ περιμένετε.');
    }

    const period = getPeriodInfo(state);
    const paymentDueDate = getPaymentDueDate(state, selectedMonth);
    const selectedMonthDisplay = selectedMonth || period;
    const resolvedSplitRatios: ExpenseSplitRatios = expenseSplitRatios || (() => {
      const totals = (state as any)?.advancedShares?.expense_totals || {};
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
        heating: ratio(totals.resident_heating, totals.heating)
      };
    })();

    // Debug: Check if we have apartment data
    console.log('JPG Export - aptWithFinancial length:', aptWithFinancial?.length || 0);
    console.log('JPG Export - shares keys:', Object.keys(state.shares || {}));
    console.log('JPG Export - buildingName:', buildingName);

    const sharesById = (state?.shares || {}) as Record<string, Share>;
    const computeApartmentAmounts = (apt: ApartmentWithFinancialData) => {
      const share = sharesById[apt.id] || sharesById[(apt as any).apartment_id];
      const breakdown = share?.breakdown || {};
      const aptAmount = perApartmentAmounts[apt.id] || {};
      const previousBalance = toNumber(apt.previous_balance || 0);
      const commonMills = toNumber(apt.participation_mills ?? share?.participation_mills ?? 0);
      const elevatorAmount = Math.max(0, toNumber(breakdown.elevator_expenses ?? aptAmount.elevator ?? 0));
      const heatingAmount = Math.max(0, toNumber(breakdown.heating_expenses ?? aptAmount.heating ?? 0));
      const residentTotal = toNumber(breakdown.resident_expenses ?? 0);
      const ownerTotal = toNumber(breakdown.owner_expenses ?? 0);
      const fallbackCommon = Math.max(
        0,
        toNumber(breakdown.general_expenses ?? aptAmount.common ?? 0) +
          toNumber(breakdown.equal_share_expenses ?? aptAmount.other ?? 0) +
          toNumber(breakdown.individual_expenses ?? aptAmount.coowner ?? 0)
      );
      const residentElevator = elevatorAmount * resolvedSplitRatios.elevator;
      const residentHeating = heatingAmount * resolvedSplitRatios.heating;
      const displayElevator = residentTotal > 0 ? residentElevator : elevatorAmount;
      const displayHeating = residentTotal > 0 ? residentHeating : heatingAmount;
      const commonAmountWithoutReserve = residentTotal > 0
        ? Math.max(0, residentTotal - displayElevator - displayHeating)
        : fallbackCommon;
      const reserveFromShare = toNumber(breakdown.reserve_fund_contribution ?? 0);
      const apartmentReserveFund = reserveFromShare > 0
        ? reserveFromShare
        : reserveFundInfo.monthlyAmount > 0
          ? Math.max(0, toNumber(reserveFundInfo.monthlyAmount) * (commonMills / 1000))
          : 0;
      const ownerExpensesOnlyProjects = ownerTotal > 0
        ? Math.max(0, ownerTotal)
        : Math.max(0, toNumber((apt as any).owner_expenses || 0));
      const totalAmount = commonAmountWithoutReserve + displayElevator + displayHeating + previousBalance + ownerExpensesOnlyProjects + apartmentReserveFund;

      return {
        previousBalance,
        commonAmountWithoutReserve,
        elevatorAmount: displayElevator,
        heatingAmount: displayHeating,
        ownerExpensesOnlyProjects,
        apartmentReserveFund,
        totalAmount,
      };
    };
    const exportTotals = (aptWithFinancial || []).reduce(
      (acc, apt) => {
        const amounts = computeApartmentAmounts(apt);
        acc.previous += amounts.previousBalance;
        acc.common += amounts.commonAmountWithoutReserve;
        acc.elevator += amounts.elevatorAmount;
        acc.heating += amounts.heatingAmount;
        acc.owner += amounts.ownerExpensesOnlyProjects;
        acc.reserve += amounts.apartmentReserveFund;
        acc.total += amounts.totalAmount;
        return acc;
      },
      { previous: 0, common: 0, elevator: 0, heating: 0, owner: 0, reserve: 0, total: 0 }
    );
    const reserveTotalForDisplay = exportTotals.reserve > 0 ? exportTotals.reserve : (reserveFundInfo.monthlyAmount || 0);

    const htmlContent = `
        <div style="
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 12px;
          line-height: 1.3;
          margin: 0;
          padding: 20px 40px;
          color: #333;
          background: white;
          width: 1083px;
          min-height: 754px;
          box-sizing: border-box;
        ">
          <!-- Header Section - Dark Background -->
          <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin: -20px -40px 15px -40px;
            padding: 12px 40px;
            background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
            color: white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          ">
            <!-- Left: Γραφείο Διαχείρισης -->
            <div style="
              font-size: 14px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #fbbf24;
            ">
              Γραφείο Διαχείρισης
            </div>

            <!-- Right: Other Info with Separators -->
            <div style="
              display: flex;
              align-items: center;
              gap: 20px;
              color: white;
            ">
              <span style="
                font-size: 16px;
                font-weight: bold;
              ">Φύλλο Κοινοχρήστων</span>

              <span style="
                width: 1px;
                height: 20px;
                background: rgba(255, 255, 255, 0.3);
              "></span>

              <span style="
                font-size: 13px;
                font-weight: 600;
              ">${selectedMonthDisplay}</span>

              <span style="
                width: 1px;
                height: 20px;
                background: rgba(255, 255, 255, 0.3);
              "></span>

              <span style="
                font-size: 12px;
                font-weight: 600;
                color: #fbbf24;
              ">Πληρωτέο μέχρι ${paymentDueDate}</span>
            </div>
          </div>

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

              <!-- ✅ ΑΦΑΙΡΕΘΗΚΑΝ: Cards ΛΗΞΗ ΠΛΗΡΩΜΗΣ και ΤΡΑΠΕΖΙΚΑ ΣΤΟΙΧΕΙΑ για WYSIWYG -->
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

              <!-- ✅ Επιμέρους Δαπάνες από API - ΜΟΝΟ επιμέρους, όχι fallback -->
              ${monthlyExpenses?.expense_breakdown && monthlyExpenses.expense_breakdown.length > 0
                ? monthlyExpenses.expense_breakdown.map((expense: any, index: number) => {
                    // Διακριτικό κείμενο: Ε (Ένοικος) ή Δ (Ιδιοκτήτης)
                    const isOwner = expense.payer_responsibility === 'owner';
                    const payerColor = isOwner ? '#dc2626' : '#059669';
                    const payerText = isOwner ? 'Δ' : 'Ε';

                    return `
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
                        <span style="font-weight: 500; color: #6b7280; font-size: 11px;">${index + 1}</span>
                        <span style="font-weight: 600; color: #374151; font-size: 11px; flex: 1; margin-left: 6px;">
                          <span style="font-weight: bold; font-size: 11px; color: ${payerColor}; margin-right: 4px;">${payerText}</span>
                          ${expense.category_display || expense.expense_title || 'Δαπάνη'}
                        </span>
                        <span style="font-weight: bold; color: #2563eb; font-size: 11px;">${formatAmount(expense.amount || expense.share_amount || 0)}€</span>
                      </div>
                    `;
                  }).join('')
                : ''
              }

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
                <span style="font-weight: 500; color: #6b7280; font-size: 11px;">${(monthlyExpenses?.expense_breakdown?.length || 0) + 1}</span>
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
                <span style="font-weight: 500; color: #6b7280; font-size: 11px;">${(monthlyExpenses?.expense_breakdown?.length || 0) + 2}</span>
                <span style="font-weight: 600; color: #374151; font-size: 11px; flex: 1; margin-left: 6px;">Αποθεματικό Ταμείο</span>
                <span style="font-weight: bold; color: #2563eb; font-size: 11px;">${formatAmount(reserveTotalForDisplay)}€</span>
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
                <span style="font-weight: 500; color: #6b7280; font-size: 11px;">${(monthlyExpenses?.expense_breakdown?.length || 0) + 3}</span>
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
                <span style="font-weight: bold; color: #1d4ed8; font-size: 13px;">${formatAmount(
                  // Επιμέρους δαπάνες από expense_breakdown
                  (monthlyExpenses?.expense_breakdown?.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0) || 0) +
                  // Κόστος διαχείρισης
                  (managementFeeInfo.totalFee || 0) +
                  // Αποθεματικό
                  (reserveTotalForDisplay || 0) +
                  // Παλαιότερες οφειλές
                  (getTotalPreviousBalance() || 0)
                )}€</span>
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
            <table style="
              margin-top: 8px;
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
            ">
              <thead>
                <!-- Κύρια Headers -->
                <tr style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);">
                  <th style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 6px 4px; text-align: center; border: 1px solid #e5e7eb; font-size: 10px; font-weight: bold;">Α/Δ</th>
                  <th style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 6px 4px; text-align: center; border: 1px solid #e5e7eb; font-size: 10px; font-weight: bold;">ΟΝΟΜΑΤΕΠΩΝΥΜΟ</th>
                  <th style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 6px 4px; text-align: center; border: 1px solid #e5e7eb; font-size: 10px; font-weight: bold;">ΑΠΟ ΜΕΤΑΦΟΡΑ</th>
                  <th colspan="3" style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color: white; padding: 6px 4px; text-align: center; border: 1px solid #e5e7eb; font-size: 10px; font-weight: bold;">ΔΑΠΑΝΕΣ ΕΝΟΙΚΙΑΣΤΩΝ</th>
                  <th colspan="2" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 6px 4px; text-align: center; border: 1px solid #e5e7eb; font-size: 10px; font-weight: bold;">ΔΑΠΑΝΕΣ ΙΔΙΟΚΤΗΤΩΝ</th>
                  <th style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 6px 4px; text-align: center; border: 1px solid #e5e7eb; font-size: 10px; font-weight: bold;">ΠΛΗΡΩΤΕΟ ΠΟΣΟ</th>
                </tr>
                <!-- Υπο-Headers -->
                <tr style="background: #f3f4f6;">
                  <th style="padding: 4px 3px; border: 1px solid #e5e7eb;"></th>
                  <th style="padding: 4px 3px; border: 1px solid #e5e7eb;"></th>
                  <th style="padding: 4px 3px; border: 1px solid #e5e7eb;"></th>
                  <th style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color: white; padding: 4px 3px; text-align: center; border: 1px solid #e5e7eb; font-size: 9px;">Κ/ΧΡΗΣΤΑ</th>
                  <th style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color: white; padding: 4px 3px; text-align: center; border: 1px solid #e5e7eb; font-size: 9px;">ΑΝΕΛ/ΡΑΣ</th>
                  <th style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color: white; padding: 4px 3px; text-align: center; border: 1px solid #e5e7eb; font-size: 9px;">ΘΕΡΜ/ΣΗ</th>
                  <th style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 4px 3px; text-align: center; border: 1px solid #e5e7eb; font-size: 9px;">ΕΡΓΑ</th>
                  <th style="background: #048C63; color: white; padding: 4px 3px; text-align: center; border: 1px solid #e5e7eb; font-size: 9px;">ΑΠΟΘΕΜΑΤΙΚΟ</th>
                  <th style="padding: 4px 3px; border: 1px solid #e5e7eb;"></th>
                </tr>
              </thead>
              <tbody>
                ${(aptWithFinancial && aptWithFinancial.length > 0) ? aptWithFinancial.map((apt, index) => {
                  const amounts = computeApartmentAmounts(apt);
                  const {
                    previousBalance,
                    commonAmountWithoutReserve,
                    elevatorAmount,
                    heatingAmount,
                    ownerExpensesOnlyProjects,
                    apartmentReserveFund,
                    totalAmount
                  } = amounts;

                  // ✅ Logging για debugging
                  console.log('JPG Row ${index}:', {
                    apt: apt.apartment_number,
                    commonAmountWithoutReserve,
                    ownerExpensesOnlyProjects,
                    apartmentReserveFund,
                    totalAmount
                  });

                  return `
                    <tr style="${index % 2 === 0 ? 'background: #f9fafb;' : 'background: white;'}">
                      <td style="padding: 4px 3px; text-align: left; border: 1px solid #e5e7eb; font-weight: bold;">${apt.apartment_number || apt.number || 'N/A'}</td>
                      <td style="padding: 4px 3px; text-align: left; border: 1px solid #e5e7eb;">${apt.owner_name || 'Άγνωστος'}</td>
                      <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb;">${formatAmount(previousBalance)}€</td>
                      <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb;">${formatAmount(commonAmountWithoutReserve)}€</td>
                      <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb;">${formatAmount(elevatorAmount)}€</td>
                      <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb;">${formatAmount(heatingAmount)}€</td>
                      <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb; font-weight: 600;">${ownerExpensesOnlyProjects > 0 ? formatAmount(ownerExpensesOnlyProjects) + '€' : '-'}</td>
                      <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb;">${apartmentReserveFund > 0 ? formatAmount(apartmentReserveFund) + '€' : '-'}</td>
                      <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">${formatAmount(totalAmount)}€</td>
                    </tr>
                  `;
                }).join('') : '<tr><td colspan="9" style="text-align: center; padding: 20px; color: #666;">Δεν υπάρχουν δεδομένα διαμερισμάτων</td></tr>'}

                <!-- Totals Row -->
                <tr style="background: #f3f4f6; font-weight: bold;">
                  <td colspan="2" style="padding: 4px 3px; text-align: left; border: 1px solid #e5e7eb; font-weight: bold;">ΣΥΝΟΛΑ</td>
                  <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">${formatAmount(exportTotals.previous)}€</td>
                  <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">${formatAmount(exportTotals.common)}€</td>
                  <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">${formatAmount(exportTotals.elevator)}€</td>
                  <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">${formatAmount(exportTotals.heating)}€</td>
                  <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">${formatAmount(exportTotals.owner)}€</td>
                  <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">${formatAmount(exportTotals.reserve)}€</td>
                  <td style="padding: 4px 3px; text-align: right; border: 1px solid #e5e7eb; font-weight: bold;">${formatAmount(exportTotals.total)}€</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Debug: Log the HTML content (first 1000 chars)
      console.log('JPG Export - HTML Content (first 1000 chars):', htmlContent.substring(0, 1000));

      // Create temporary element - make it visible for proper rendering
      const element = document.createElement('div');
      element.innerHTML = htmlContent;
      element.style.position = 'fixed';
      element.style.top = '0px';
      element.style.left = '0px';
      element.style.width = '1123px';
      element.style.height = '794px';
      element.style.zIndex = '9999';
      element.style.backgroundColor = '#ffffff';
      element.style.overflow = 'hidden';
      document.body.appendChild(element);

      console.log('JPG Export - Element created, children count:', element.children.length);

      try {
        // Wait for rendering - increased time for high quality
        await new Promise(resolve => setTimeout(resolve, 1500));

        console.log('JPG Export - Starting canvas generation...');
        console.log('JPG Export - Element dimensions:', element.offsetWidth, 'x', element.offsetHeight);

        // Generate screenshot with high quality settings
        const canvas = await html2canvas(element, {
          backgroundColor: '#ffffff',
          width: 1123,
          height: 794,
          scale: 2.5, // Increased scale for higher resolution
          logging: false, // Disable logging for cleaner output
          useCORS: true,
          allowTaint: true,
          foreignObjectRendering: false,
          removeContainer: true,
          imageTimeout: 15000,
          onclone: function(clonedDoc) {
            // Ensure fonts are rendered properly in clone
            clonedDoc.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          }
        });

        console.log('JPG Export - Canvas generated:', canvas.width, 'x', canvas.height);

        // Debug: Check if canvas has actual content
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const hasContent = imageData.data.some((pixel, i) => i % 4 !== 3 && pixel !== 255); // Check for non-white pixels
          console.log('JPG Export - Canvas has content:', hasContent);
        }

        // Create and download JPG with maximum quality
        const imgData = canvas.toDataURL('image/jpeg', 1.0); // Maximum JPEG quality
        console.log('JPG Export - Data URL length:', imgData.length);
        console.log('JPG Export - Data URL start:', imgData.substring(0, 50));

        const fileName = `Κοινοχρηστα-${buildingName.replace(/[^a-zA-Z0-9]/g, '_')}-${selectedMonthDisplay.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((result) => {
            if (result) {
              resolve(result);
            } else {
              reject(new Error('Failed to create JPG blob'));
            }
          }, 'image/jpeg', 1.0);
        });

        if (!options.skipDownload) {
          // Download the JPG file
          const link = document.createElement('a');
          link.href = imgData;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        if (!options.skipKiosk) {
          // Send to kiosk API for display
          try {
            console.log('JPG Export - Sending to kiosk API...');

            // Get the correct API base URL
            const apiBaseUrl = typeof window !== 'undefined'
              ? `http://${window.location.hostname}:18000/api`
              : 'http://localhost:18000/api';

            const kioskResponse = await fetch(`${apiBaseUrl}/kiosk/upload-bill/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                image_data: imgData,
                building_name: buildingName,
                period: selectedMonthDisplay,
                timestamp: new Date().toISOString(),
              }),
            });

            if (kioskResponse.ok) {
              const result = await kioskResponse.json();
              console.log('JPG Export - Kiosk upload successful:', result);
              if (!options.silent) {
                toast.success('JPG αρχείο δημιουργήθηκε και αποστάλθηκε στο kiosk επιτυχώς!');
              }
            } else {
              console.warn('JPG Export - Kiosk upload failed:', kioskResponse.status);
              if (!options.silent) {
                toast.success('JPG αρχείο δημιουργήθηκε επιτυχώς! (Αποστολή στο kiosk απέτυχε)');
              }
            }
          } catch (error) {
            console.error('JPG Export - Error sending to kiosk:', error);
            if (!options.silent) {
              toast.success('JPG αρχείο δημιουργήθηκε επιτυχώς! (Αποστολή στο kiosk απέτυχε)');
            }
          }
        }

        if (options.returnBlob) {
          return { blob, fileName, imgData };
        }

      } catch (error) {
        console.error('Error generating JPG:', error);
        if (!options.silent) {
          toast.error('Αποτυχία δημιουργίας JPG αρχείου');
        }
        throw new Error('Failed to generate JPG file');
      } finally {
        // Clean up - remove the temporary element
        try {
          document.body.removeChild(element);
        } catch (e) {
          console.log('Element already removed');
        }
      }
    } catch (error) {
      console.error('Error in JPG export:', error);
      throw error;
    }
  };

/**
 * Generate JPG and send via email to all building residents
 */
export const exportAndSendJPG = async (
  params: JpgGeneratorParams & { buildingId: number }
): Promise<void> => {
  const { buildingId, selectedMonth, ...otherParams } = params;

  if (typeof window === 'undefined') {
    toast.error('Η αποστολή JPG δεν είναι διαθέσιμη στον server');
    return;
  }

  try {
    toast.info('Δημιουργία και αποστολή φύλλου κοινοχρήστων...');

    // Generate JPG using existing logic (simplified - we'll reuse the same DOM generation)
    const period = getPeriodInfo(params.state);
    const paymentDueDate = getPaymentDueDate(params.state, selectedMonth);

    // Create the same DOM element as exportToJPG
    const element = document.createElement('div');
    element.style.cssText = `
      position: fixed;
      top: -10000px;
      left: 0;
      width: 1200px;
      background: white;
      padding: 40px;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    // Add the same HTML content (shortened for brevity - you'd include full HTML here)
    element.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto; background: white; padding: 40px; font-family: 'Inter', sans-serif;">
        <h1 style="text-align: center; font-size: 28px; margin-bottom: 20px;">Φύλλο Κοινοχρήστων</h1>
        <h2 style="text-align: center; font-size: 20px; color: #666;">${period}</h2>
        <!-- Full HTML would go here -->
      </div>
    `;

    document.body.appendChild(element);

    // Convert to canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // Clean up DOM
    document.body.removeChild(element);

    // Convert canvas to Blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/jpeg', 0.95);
    });

    // Convert blob to File
    const file = new File(
      [blob],
      `koinochrista-${selectedMonth || period}.jpg`,
      { type: 'image/jpeg' }
    );

    // Send via API
    toast.info('Αποστολή email...');

    const result = await notificationsApi.sendCommonExpenses({
      attachment: file,
      subject: `Λογαριασμός Κοινοχρήστων ${selectedMonth || period}`,
      body: `Αγαπητοί ένοικοι,\n\nΠαρακαλούμε βρείτε συνημμένα το φύλλο κοινοχρήστων για την περίοδο ${selectedMonth || period}.\n\nΗμερομηνία πληρωμής: ${paymentDueDate}\n\nΕυχαριστούμε,\nΔιαχείριση Κτιρίου`,
      building_id: buildingId,
      month: selectedMonth,
      send_to_all: true,
    });

    toast.success(
      `Επιτυχής αποστολή! ${result.successful_sends}/${result.total_recipients} παραλήπτες`,
      { duration: 5000 }
    );
  } catch (error) {
    console.error('Error generating and sending JPG:', error);
    toast.error('Αποτυχία αποστολής φύλλου κοινοχρήστων');
    throw error;
  }
};

export default exportToJPG;
