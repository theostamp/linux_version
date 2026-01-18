// Type definitions for the Common Expense Calculator

// Interfaces for apartment shares and breakdown
export interface Share {
  apartment_id: number;
  apartment_number: string;
  identifier: string;
  owner_name: string;
  participation_mills: number;
  current_balance: number;
  total_amount: number;
  previous_balance: number;
  total_due: number;
  breakdown?: {
    general_expenses?: number;
    elevator_expenses?: number;
    heating_expenses?: number;
    equal_share_expenses?: number;
    individual_expenses?: number;
    reserve_fund_contribution?: number;
    management_fee?: number;
    owner_expenses?: number;
    resident_expenses?: number;
  };
}

export type PeriodMode = 'quick' | 'custom' | 'advanced' | string;

export interface QuickOptions {
  currentMonth: boolean;
  previousMonth: boolean;
  customRange: boolean;
}

export interface CustomPeriod {
  startDate: string;
  endDate: string;
  periodName: string;
}

export interface AdvancedOptions {
  includeReserveFund: boolean;
  reserveFundMonthlyAmount: number;
  heatingFixedPercentage: number;
  elevatorMills: boolean;
}

export interface AdvancedExpenseTotals {
  general?: number;
  elevator?: number;
  heating?: number;
  equal_share?: number;
  individual?: number;
}

export interface AdvancedShares {
  shares?: Record<string, Share>;
  expense_totals?: AdvancedExpenseTotals;
  expense_breakdown?: Array<Record<string, any>>;
  management_fee_per_apartment?: number;
  reserve_contribution?: number;
  reserve_fund_goal?: number;
  reserve_fund_duration?: number;
  reserve_fund_start_date?: string;
  reserve_fund_target_date?: string;
  actual_reserve_collected?: number;
  heating_costs?:
    | {
        total?: number;
        fixed?: number;
        variable?: number;
        [key: string]: any;
      }
    | number;
  elevator_costs?: number;
  elevator_shares?: Record<string, Share>;
  [key: string]: any;
}

export interface CalculatorState {
  periodMode: PeriodMode;
  quickOptions: QuickOptions;
  customPeriod: CustomPeriod;
  advancedOptions: AdvancedOptions;
  shares: Record<string, Share>;
  totalExpenses: number;
  advancedShares: any;
  isIssuing: boolean;
}

export interface ExpenseBreakdown {
  common: number;
  elevator: number;
  heating: number;
  other: number;
  coownership: number;
}

export interface ExpenseSplitRatios {
  elevator: number;
  heating: number;
}

export interface PerApartmentAmounts {
  [apartment_id: number]: {
    common: number;
    elevator: number;
    heating: number;
    other: number;
    coowner: number;
    reserve: number;
    total_due: number;
  };
}

export interface ManagementFeeInfo {
  feePerApartment: number;
  totalFee: number;
  apartmentsCount: number;
  hasFee: boolean;
}

export interface ReserveFundInfo {
  monthlyAmount: number;
  totalContribution: number;
  displayText: string;
  goal: number;
  duration: number;
  monthsRemaining: number;
  actualReserveCollected: number;
  progressPercentage: number;
}

export interface ExpenseItem {
  id: number;
  title: string;
  amount: number;
  category: string;
  category_display?: string;
  distribution_type: string;
  payer_responsibility?: 'owner' | 'resident' | 'shared';
  date: string;
  apartment_ids?: number[];
}

export interface GroupedExpenses {
  [categoryName: string]: {
    categories: Array<{
      category: string;
      items: ExpenseItem[];
      total: number;
    }>;
    total: number;
  };
}

export interface OccupantsMap {
  [apartment_id: number]: {
    owner_name: string;
    tenant_name?: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
  message?: string;
}

export interface CommonExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: CalculatorState;
  buildingId?: number;
  selectedMonth?: string; // Format: "YYYY-MM"
  buildingName?: string;
  buildingAddress?: string;
  buildingCity?: string;
  buildingPostalCode?: string;
  managerName?: string;
  managerApartment?: string;
  managerPhone?: string;
  managerCollectionSchedule?: string;
  managementFeePerApartment?: number;
  managementOfficeName?: string;
  managementOfficePhone?: string;
  managementOfficeAddress?: string;
  managementOfficeLogo?: string;
}
