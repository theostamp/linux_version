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
  };
}

export interface ExpenseBreakdown {
  common: number;
  elevator: number;
  heating: number;
  other: number;
  coownership: number;
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
  state: any; // CalculatorState - should be properly typed
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
