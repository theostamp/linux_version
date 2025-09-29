// Improved Financial Dashboard Types
export interface MonthlyInvoiceData {
  // Έξοδα προηγούμενου μήνα (π.χ. Ιούλιος)
  previous_month_expenses: {
    operational_expenses: number;
    month_name: string;
  };
  // Χρεώσεις τρέχοντος μήνα (π.χ. Αύγουστος)
  current_month_charges: {
    management_fees: number;
    reserve_fund_contribution: number;
    month_name: string;
  };
  // Σύνολο τιμολογίου
  invoice_total: number;
}

export interface TotalObligationsData {
  current_invoice: number;
  previous_balances: number;
  grand_total: number;
}

export interface ObligationCoverageData {
  current_invoice_coverage: {
    paid: number;
    total: number;
    percentage: number;
  };
  total_obligations_coverage: {
    paid: number;
    total: number;
    percentage: number;
  };
}

export interface ReserveFundData {
  current_amount: number;
  target_amount: number;
  monthly_contribution: number;
  progress_percentage: number;
}

export interface ImprovedFinancialData {
  monthly_invoice: MonthlyInvoiceData;
  total_obligations: TotalObligationsData;
  obligation_coverage: ObligationCoverageData;
  reserve_fund: ReserveFundData;
  apartment_count: number;
  has_monthly_activity: boolean;
}

// Βελτιωμένη ορολογία mapping
export const TERMINOLOGY_MAPPING = {
  // Παλιά → Νέα ορολογία
  'Πραγματικά έξοδα': 'Λειτουργικές δαπάνες',
  'Οικονομικές Υποχρεώσεις Περιόδου': 'Τιμολόγιο Μήνα',
  'Παλαιότερες οφειλές': 'Προηγούμενα υπόλοιπα',
  'Μηνιαίες υποχρεώσεις': 'Σύνολο τιμολογίου',
  'Κόστος διαχείρισης': 'Αμοιβή διαχείρισης',
  'Εισφορά αποθεματικού': 'Μηνιαία εισφορά αποθεματικού'
} as const;

export type TerminologyKey = keyof typeof TERMINOLOGY_MAPPING;
