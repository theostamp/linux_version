/**
 * Centralized Date Validation System for Financial Components
 * Ensures consistency across all financial data displays
 */

export interface DateValidationResult {
  isValid: boolean;
  actualMonth: string | null;
  expectedMonth: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  shouldShowWarning: boolean;
}

export interface FinancialDataResponse {
  apartments?: Array<{
    expense_breakdown?: Array<{
      month?: string;
      date?: string;
    }>;
  }>;
  summary?: {
    last_calculation_date?: string;
    data_month?: string;
  };
  // Add other possible response structures
}

/**
 * Validates if the financial data matches the expected month
 */
export function validateFinancialDataMonth(
  data: FinancialDataResponse,
  expectedMonth: string
): DateValidationResult {
  // Extract actual month from the data
  let actualMonth: string | null = null;

  // Try to get month from summary
  if (data.summary?.data_month) {
    actualMonth = data.summary.data_month;
  } else if (data.summary?.last_calculation_date) {
    const date = new Date(data.summary.last_calculation_date);
    actualMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  // Try to get month from expense breakdown
  if (!actualMonth && data.apartments?.length) {
    const firstApartment = data.apartments[0];
    if (firstApartment.expense_breakdown?.length) {
      const firstExpense = firstApartment.expense_breakdown[0];
      if (firstExpense.month) {
        actualMonth = firstExpense.month;
      } else if (firstExpense.date) {
        const date = new Date(firstExpense.date);
        actualMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
    }
  }

  const isValid = actualMonth === expectedMonth;

  // Generate appropriate message
  let message = '';
  let severity: 'info' | 'warning' | 'error' = 'info';
  let shouldShowWarning = false;

  if (!actualMonth) {
    message = `Δεν βρέθηκαν δεδομένα για τον επιλεγμένο μήνα (${formatMonthDisplay(expectedMonth)})`;
    severity = 'info';
    shouldShowWarning = true;
  } else if (!isValid) {
    message = `Τα δεδομένα είναι από ${formatMonthDisplay(actualMonth)} αντί για ${formatMonthDisplay(expectedMonth)}. Πιθανώς δεν έχουν εκδοθεί ακόμη κοινόχρηστα για τον επιλεγμένο μήνα.`;
    severity = 'warning';
    shouldShowWarning = true;
  } else {
    message = `Τα δεδομένα αντιστοιχούν στον επιλεγμένο μήνα (${formatMonthDisplay(expectedMonth)})`;
    severity = 'info';
    shouldShowWarning = false;
  }

  return {
    isValid,
    actualMonth,
    expectedMonth,
    message,
    severity,
    shouldShowWarning
  };
}

/**
 * Formats month string (YYYY-MM) to Greek display format
 */
export function formatMonthDisplay(monthString: string): string {
  const monthNames = [
    'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
    'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
  ];

  const [year, month] = monthString.split('-');
  const monthIndex = parseInt(month, 10) - 1;

  if (monthIndex >= 0 && monthIndex < 12) {
    return `${monthNames[monthIndex]} ${year}`;
  }

  return monthString;
}

/**
 * Gets the current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Checks if the selected month is the current month
 */
export function isCurrentMonth(monthString: string): boolean {
  return monthString === getCurrentMonth();
}

/**
 * Checks if the selected month is in the future
 */
export function isFutureMonth(monthString: string): boolean {
  const selected = new Date(monthString + '-01');
  const current = new Date(getCurrentMonth() + '-01');
  return selected > current;
}

/**
 * Gets validation message for UI display
 */
export function getValidationMessage(validation: DateValidationResult): {
  title: string;
  description: string;
  action?: string;
} {
  if (!validation.shouldShowWarning) {
    return {
      title: 'Δεδομένα Ενημερωμένα',
      description: validation.message
    };
  }

  if (validation.severity === 'warning') {
    return {
      title: 'Προσοχή: Δεδομένα από Διαφορετικό Μήνα',
      description: validation.message,
      action: 'Εκδώστε πρώτα κοινόχρηστα για τον επιλεγμένο μήνα'
    };
  }

  return {
    title: 'Δεν Βρέθηκαν Δεδομένα',
    description: validation.message,
    action: 'Δημιουργήστε και εκδώστε κοινόχρηστα για τον επιλεγμένο μήνα'
  };
}
