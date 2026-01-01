import { useMemo } from 'react';
import { ExpenseCategory, Supplier } from '@/types/financial';

// Expense templates configuration
const EXPENSE_TEMPLATES = {
  // ΔΕΗ templates
  'electricity_common': {
    prefix: 'ΔΕΗ Κοινοχρήστων',
    suffix: 'YYYY',
    supplier: 'ΔΕΗ',
    distribution: 'by_participation_mills' as const,
    isMonthly: true
  },

  // ΕΥΔΑΠ templates
  'water_common': {
    prefix: 'ΕΥΔΑΠ Κοινοχρήστων',
    suffix: 'YYYY',
    supplier: 'ΕΥΔΑΠ',
    distribution: 'by_participation_mills' as const,
    isMonthly: true
  },

  // Καθαρισμός templates
  'cleaning': {
    prefix: 'Καθαρισμός Κοινοχρήστων',
    suffix: 'YYYY',
    supplier: 'Εταιρεία Καθαρισμού',
    distribution: 'equal_share' as const,
    isMonthly: true
  },

  // Ανελκυστήρας templates
  'elevator_maintenance': {
    prefix: 'Συντήρηση Ανελκυστήρα',
    suffix: 'YYYY',
    supplier: 'Εταιρεία Ανελκυστήρων',
    distribution: 'by_participation_mills' as const,
    isMonthly: false
  },
  'elevator_repair': {
    prefix: 'Επισκευή Ανελκυστήρα',
    suffix: 'YYYY',
    supplier: 'Εταιρεία Ανελκυστήρων',
    distribution: 'by_participation_mills' as const,
    isMonthly: false
  },

  // Θέρμανση templates
  'heating_fuel': {
    prefix: 'Πετρέλαιο Θέρμανσης',
    suffix: 'YYYY',
    supplier: 'Εταιρεία Πετρελαίου',
    distribution: 'by_meters' as const,
    isMonthly: true
  },
  'heating_gas': {
    prefix: 'Φυσικό Αέριο Θέρμανσης',
    suffix: 'YYYY',
    supplier: 'Εταιρεία Φυσικού Αερίου',
    distribution: 'by_meters' as const,
    isMonthly: true
  },

  // Ασφάλεια templates
  'security': {
    prefix: 'Ασφάλεια Κτιρίου',
    suffix: 'YYYY',
    supplier: 'Ασφαλιστική Εταιρεία',
    distribution: 'by_participation_mills' as const,
    isMonthly: true
  },

  // Συλλογή απορριμμάτων
  'garbage_collection': {
    prefix: 'Συλλογή Απορριμμάτων',
    suffix: 'YYYY',
    supplier: 'Δήμος',
    distribution: 'equal_share' as const,
    isMonthly: true
  },

  // Συνεργείο Καθαρισμού
  'concierge': {
    prefix: 'Συνεργείο Καθαρισμού',
    suffix: 'YYYY',
    supplier: 'Καθαριστής',
    distribution: 'equal_share' as const,
    isMonthly: true
  }
};

// Month names in Greek
const MONTHS_GREEK = [
  'Ιανουαρίου', 'Φεβρουαρίου', 'Μαρτίου', 'Απριλίου',
  'Μαΐου', 'Ιουνίου', 'Ιουλίου', 'Αυγούστου',
  'Σεπτεμβρίου', 'Οκτωβρίου', 'Νοεμβρίου', 'Δεκεμβρίου'
];

// Get current month and year
const getCurrentMonthYear = () => {
  const now = new Date();
  return {
    month: MONTHS_GREEK[now.getMonth()],
    year: now.getFullYear().toString()
  };
};

// Get last day of month
const getLastDayOfMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

// Calculate suggested date based on expense type
const calculateSuggestedDate = (category: ExpenseCategory, isMonthly: boolean, selectedMonth?: string) => {
  const now = new Date();

  if (isMonthly && selectedMonth) {
    // For monthly expenses with selected month, use the selected month
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const lastDay = new Date(year, month, 0); // Last day of the selected month
      return lastDay.toISOString().split('T')[0];
    } catch (error) {
      console.warn('Invalid selectedMonth format:', selectedMonth);
      // Fallback to current month
      const lastDay = getLastDayOfMonth(now);
      return lastDay.toISOString().split('T')[0];
    }
  } else if (isMonthly) {
    // For monthly expenses without selected month, suggest last day of current month
    const lastDay = getLastDayOfMonth(now);
    return lastDay.toISOString().split('T')[0];
  } else {
    // For non-monthly expenses, suggest current date
    return now.toISOString().split('T')[0];
  }
};

// Generate title suggestions
const generateTitleSuggestions = (
  category: ExpenseCategory,
  supplier?: Supplier,
  customPrefix?: string
): string[] => {
  const template = EXPENSE_TEMPLATES[category as keyof typeof EXPENSE_TEMPLATES];
  if (!template) return [];

  const { month, year } = getCurrentMonthYear();
  const suggestions: string[] = [];

  // Base suggestion with current month/year
  const baseSuggestion = `${template.prefix} - ${month} ${year}`;
  suggestions.push(baseSuggestion);

  // Previous month suggestion
  const prevMonth = new Date();
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const prevMonthName = MONTHS_GREEK[prevMonth.getMonth()];
  const prevMonthYear = prevMonth.getFullYear().toString();
  suggestions.push(`${template.prefix} - ${prevMonthName} ${prevMonthYear}`);

  // Next month suggestion
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextMonthName = MONTHS_GREEK[nextMonth.getMonth()];
  const nextMonthYear = nextMonth.getFullYear().toString();
  suggestions.push(`${template.prefix} - ${nextMonthName} ${nextMonthYear}`);

  // Custom prefix suggestion if provided
  if (customPrefix) {
    suggestions.push(`${customPrefix} - ${month} ${year}`);
  }

  // Supplier-specific suggestion if supplier is provided
  if (supplier) {
    suggestions.push(`${supplier.name} - ${month} ${year}`);
  }

  return suggestions;
};

interface UseExpenseTemplatesReturn {
  getTitleSuggestions: (category: ExpenseCategory, supplier?: Supplier, customPrefix?: string) => string[];
  getSuggestedDate: (category: ExpenseCategory, selectedMonth?: string) => string;
  getSuggestedDistribution: (category: ExpenseCategory) => string;
  getTemplate: (category: ExpenseCategory) => typeof EXPENSE_TEMPLATES[keyof typeof EXPENSE_TEMPLATES] | null;
  isMonthlyExpense: (category: ExpenseCategory) => boolean;
}

export const useExpenseTemplates = (): UseExpenseTemplatesReturn => {
  const getTitleSuggestions = useMemo(() =>
    (category: ExpenseCategory, supplier?: Supplier, customPrefix?: string) =>
      generateTitleSuggestions(category, supplier, customPrefix),
    []
  );

  const getSuggestedDate = useMemo(() =>
    (category: ExpenseCategory, selectedMonth?: string) => {
      const template = EXPENSE_TEMPLATES[category as keyof typeof EXPENSE_TEMPLATES];
      return calculateSuggestedDate(category, template?.isMonthly || false, selectedMonth);
    },
    []
  );

  const getSuggestedDistribution = useMemo(() =>
    (category: ExpenseCategory) => {
      const template = EXPENSE_TEMPLATES[category as keyof typeof EXPENSE_TEMPLATES];
      return template?.distribution || 'by_participation_mills';
    },
    []
  );

  const getTemplate = useMemo(() =>
    (category: ExpenseCategory) =>
      EXPENSE_TEMPLATES[category as keyof typeof EXPENSE_TEMPLATES] || null,
    []
  );

  const isMonthlyExpense = useMemo(() =>
    (category: ExpenseCategory) => {
      const template = EXPENSE_TEMPLATES[category as keyof typeof EXPENSE_TEMPLATES];
      return template?.isMonthly || false;
    },
    []
  );

  return {
    getTitleSuggestions,
    getSuggestedDate,
    getSuggestedDistribution,
    getTemplate,
    isMonthlyExpense,
  };
};
