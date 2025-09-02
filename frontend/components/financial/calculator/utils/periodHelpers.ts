
import { CalculatorState } from '../types/financial';

// Gets the display name for the selected period
export const getPeriodInfo = (state: CalculatorState): string => {
  return state.customPeriod.periodName;
};

// Gets a detailed string for the billing cycle
export const getPeriodInfoWithBillingCycle = (state: CalculatorState): string => {
  const periodName = getPeriodInfo(state);
  const monthMatch = periodName.match(/(\w+)\s+(\d{4})/);
  if (!monthMatch) return periodName;

  const [, monthName, year] = monthMatch;
  const monthNames = [
    'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
    'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
  ];

  const currentMonthIndex = monthNames.indexOf(monthName);
  if (currentMonthIndex === -1) return periodName;

  let usageMonthIndex = currentMonthIndex - 1;
  let usageYear = parseInt(year);

  if (usageMonthIndex < 0) {
    usageMonthIndex = 11; // December
    usageYear -= 1;
  }

  const usageMonthName = monthNames[usageMonthIndex];
  return `${usageMonthName} ${usageYear} (Χρήση: ${usageMonthName} ${usageYear} → Χρέωση: ${monthName} ${year})`;
};

// Gets the name of the previous month for the expense title
export const getPreviousMonthName = (state: CalculatorState): string => {
  const periodName = getPeriodInfo(state);
  const monthMatch = periodName.match(/(\w+)\s+(\d{4})/);
  if (!monthMatch) return periodName;

  const [, monthName, year] = monthMatch;
  const monthNames = ['Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλios', 'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'];

  const currentMonthIndex = monthNames.indexOf(monthName);
  if (currentMonthIndex === -1) return periodName;

  let previousMonthIndex = currentMonthIndex - 1;
  let previousYear = parseInt(year);

  if (previousMonthIndex < 0) {
    previousMonthIndex = 11;
    previousYear -= 1;
  }

  return `Δαπάνες ${monthNames[previousMonthIndex]} ${previousYear}`;
};

// Calculates the payment due date (15th of the next month)
export const getPaymentDueDate = (state: CalculatorState): string => {
  const periodName = getPeriodInfo(state);
  const monthMatch = periodName.match(/(\w+)\s+(\d{4})/);

  if (!monthMatch) {
    const now = new Date();
    const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 15);
    return dueDate.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  const [, monthName, year] = monthMatch;
  const monthNames = [
    'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
    'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
  ];

  const currentMonthIndex = monthNames.indexOf(monthName);
  if (currentMonthIndex === -1) {
    const now = new Date();
    const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 15);
    return dueDate.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  let dueDateMonthIndex = currentMonthIndex + 1;
  let dueDateYear = parseInt(year);

  if (dueDateMonthIndex > 11) {
    dueDateMonthIndex = 0; // January
    dueDateYear += 1;
  }

  const dueDate = new Date(dueDateYear, dueDateMonthIndex, 15);
  return dueDate.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
