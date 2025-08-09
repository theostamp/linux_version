// Frontend types για το οικονομικό σύστημα

// Βασικοί τύποι
export interface Supplier {
  id: number;
  building: number;
  building_name?: string;
  name: string;
  category: string;
  category_display?: string;
  account_number?: string;
  phone?: string;
  email?: string;
  address?: string;
  vat_number?: string;
  contract_number?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: number;
  building: number;
  building_name?: string;
  title: string;
  amount: number;
  date: string;
  category: string;
  category_display?: string;
  distribution_type: string;
  distribution_type_display?: string;
  supplier?: number;
  supplier_name?: string;
  supplier_details?: Supplier;
  attachment?: string;
  attachment_url?: string;
  notes?: string;
  is_issued: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  building: number;
  building_name?: string;
  date: string;
  type: string;
  type_display?: string;
  description: string;
  apartment_number?: string;
  amount: number;
  balance_after: number;
  receipt?: string;
  created_at: string;
}

export interface Payment {
  id: number;
  apartment: number;
  apartment_number?: string;
  building_name?: string;
  owner_name?: string;
  tenant_name?: string;
  current_balance?: number;
  monthly_due?: number;
  amount: number;
  date: string;
  method: string;
  method_display?: string;
  payment_type: string;
  payment_type_display?: string;
  reference_number?: string;
  notes?: string;
  receipt?: string;
  created_at: string;
}

export interface ExpenseApartment {
  id: number;
  expense: number;
  expense_title?: string;
  apartment: number;
  apartment_number?: string;
  created_at: string;
}

export interface MeterReading {
  id: number;
  apartment: number;
  apartment_number?: string;
  building_name?: string;
  reading_date: string;
  value: number;
  meter_type: string;
  meter_type_display?: string;
  notes?: string;
  created_at: string;
}

// Dashboard types
export interface FinancialSummary {
  current_reserve: number;
  total_obligations: number;
  total_expenses_this_month: number;
  total_payments_this_month: number;
  recent_transactions: Transaction[];
}

export interface ApartmentBalance {
  id: number;
  number: string;
  owner_name: string;
  building_name?: string;
  current_balance: number;
  participation_mills: number;
  last_payment_date?: string;
  last_payment_amount?: number;
}

// Common Expense types
export interface ExpenseBreakdown {
  expense_id: number;
  expense_title: string;
  expense_amount: number;
  apartment_share: number;
  distribution_type: string;
  distribution_type_display: string;
}

export interface CommonExpenseShare {
  apartment_id: number;
  apartment_number: string;
  owner_name: string;
  participation_mills: number;
  current_balance: number;
  total_amount: number;
  previous_balance: number;
  total_due: number;
  breakdown: ExpenseBreakdown[];
}

export interface CommonExpenseCalculation {
  building_id: number;
  period: string;
  shares: CommonExpenseShare[];
  total_expenses: number;
  apartments_count: number;
  pending_expenses: Expense[];
}

// Form types
export interface ExpenseFormData {
  building: number;
  title: string;
  amount: number;
  date: string;
  category: string;
  distribution_type: string;
  supplier?: number;
  notes?: string;
  attachment?: File;
}

export interface PaymentFormData {
  apartment_id: number;
  amount: number;
  date: string;
  method: string;
  payment_type: string;
  reference_number?: string;
  notes?: string;
  receipt?: File;
}

export interface MeterReadingFormData {
  apartment: number;
  reading_date: string;
  value: number;
  meter_type: string;
  notes?: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

// Filter types
export interface ExpenseFilters {
  building_id?: number;
  category?: string;
  is_issued?: boolean;
  date_from?: string;
  date_to?: string;
  distribution_type?: string;
}

export interface TransactionFilters {
  building_id?: number;
  type?: string;
  date_from?: string;
  date_to?: string;
  apartment_number?: string;
}

export interface PaymentFilters {
  building_id?: number;
  apartment_id?: number;
  method?: string;
  date_from?: string;
  date_to?: string;
}

// ---------------------------------------------
// NEW: Union-like constant objects for categories
// and distribution types to allow value & type
// usage (enum-style) while keeping string unions.
// ---------------------------------------------

/**
 * Core expense categories used across the UI.
 * Keys are semantic names used in code, values
 * are the exact strings expected by the backend.
 */
export const ExpenseCategory = {
  ELECTRICITY: 'electricity_common',
  WATER: 'water_common',
  HEATING: 'heating_fuel',
  CLEANING: 'cleaning',
  MAINTENANCE: 'building_maintenance',
  INSURANCE: 'building_insurance',
  ADMINISTRATION: 'management_fees',
  OTHER: 'miscellaneous',
} as const;

export type ExpenseCategory = typeof ExpenseCategory[keyof typeof ExpenseCategory];

/**
 * Supported distribution strategies.
 */
export const DistributionType = {
  EQUAL: 'equal_share',
  MILLS: 'by_participation_mills',
  METERS: 'by_meters',
  SPECIFIC: 'specific_apartments',
} as const;

export type DistributionType = typeof DistributionType[keyof typeof DistributionType];

// ---------------------------------------------
// Remaining enum & util definitions
// ---------------------------------------------

export enum TransactionType {
  COMMON_EXPENSE_PAYMENT = 'common_expense_payment',
  EXPENSE_PAYMENT = 'expense_payment',
  REFUND = 'refund',
  COMMON_EXPENSE_CHARGE = 'common_expense_charge',
}

export enum PaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  CHECK = 'check',
  CARD = 'card',
}

export enum PaymentType {
  COMMON_EXPENSE = 'common_expense',
  RESERVE_FUND = 'reserve_fund',
  SPECIAL_EXPENSE = 'special_expense',
  ADVANCE = 'advance',
  OTHER = 'other',
}

export enum MeterType {
  HEATING = 'heating',
  WATER = 'water',
  ELECTRICITY = 'electricity',
}

// Utility types
export interface SelectOption {
  value: string;
  label: string;
}

export interface CategoryGroup {
  label: string;
  options: SelectOption[];
}

// Chart types
export interface CashFlowData {
  date: string;
  income: number;
  expenses: number;
  balance: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
  }[];
}

// Common Expense Period types
export interface CommonExpensePeriod {
  id: number;
  building: number;
  building_name?: string;
  period_name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApartmentShare {
  apartment_id: number;
  apartment_number: string;
  owner_name: string;
  participation_mills: number;
  current_balance: number;
  total_amount: number;
  previous_balance: number;
  total_due: number;
  breakdown: Array<{
    expense_id: number;
    expense_title: string;
    expense_amount: number;
    apartment_share: number;
    distribution_type: string;
    distribution_type_display?: string;
  }>;
}

export interface CommonExpenseCalculationRequest {
  building_id: number;
}

export interface CommonExpenseCalculationResult {
  building_id: number;
  shares: Record<string, ApartmentShare>;
  total_expenses: number;
  apartments_count: number;
}

export interface CommonExpenseIssueRequest {
  building_id: number;
  period_data: {
    name: string;
    start_date: string;
    end_date: string;
  };
  shares: Record<string, {
    total_amount: number;
    breakdown: Record<string, any>;
  }>;
  expense_ids?: number[];
}
