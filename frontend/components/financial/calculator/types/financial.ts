export interface CalculatorState {
  // Step 1: Period Selection
  periodMode: 'quick' | 'custom' | 'advanced';
  quickOptions: {
    currentMonth: boolean;
    previousMonth: boolean;
    customRange: boolean;
  };
  customPeriod: {
    startDate: string;
    endDate: string;
    periodName: string;
  };
  advancedOptions: {
    includeReserveFund: boolean;
    reserveFundMonthlyAmount: number;
    heatingFixedPercentage: number;
    elevatorMills: boolean;
  };
  
  // Step 2: Results
  shares: Record<string, any>;
  totalExpenses: number;
  advancedShares: any;
  isIssuing: boolean;
}

// A single share object
export interface Share {
  apartment_id: number;
  participation_mills: number;
  identifier?: string;
  apartment_number?: string;
  owner_name?: string;
  breakdown?: any; // Can be more specific if breakdown structure is known
  total_due?: number;
  heating_breakdown?: any;
}

// Main props for the modal
export interface CommonExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: CalculatorState;
  buildingId: number;
  buildingName?: string;
  selectedMonth?: string; // Month for expense sheet (e.g., "2025-08" for August)
  managementFeePerApartment?: number;
  reserveContributionPerApartment?: number;
  managerName?: string;
  managerPhone?: string;
  managerApartment?: string;
  managerCollectionSchedule?: string;
  buildingAddress?: string;
  buildingCity?: string;
  buildingPostalCode?: string;
  // Management office details
  managementOfficeName?: string;
  managementOfficePhone?: string;
  managementOfficeAddress?: string;
  managementOfficeLogo?: string;
}

// Type for the result of the data validation
export interface ValidationResult {
  isValid: boolean;
  message: string;
  details: {
    totalExpenses: number;
    tenantExpensesTotal: number;
    ownerExpensesTotal: number;
    reserveFundTotal: number;
    payableTotal: number;
    differences: string[];
  };
}

// Type for pre-computed amounts per apartment
export interface PerApartmentAmounts {
  [key: number]: {
    common: number;
    elevator: number;
    heating: number;
    other: number;
    coowner: number;
    reserve: number;
    total_due: number;
  };
}

// Type for occupants map
export interface OccupantsMap {
  [key: number]: {
    owner_name?: string;
    tenant_name?: string;
  };
}

// Type for a single expense item
export interface ExpenseItem {
  category?: string;
  amount: number;
  description?: string;
}

// Type for grouped expenses
export interface GroupedExpenses {
  [key: string]: {
    expenses: Array<{
      category: string;
      displayName: string;
      expenses: ExpenseItem[];
      total: number;
    }>;
    total: number;
  };
}

// Type for expense breakdown
export interface ExpenseBreakdown {
  common: number;
  elevator: number;
  heating: number;
  other: number;
  coownership: number;
}

// Type for reserve fund information
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

// Type for management fee information
export interface ManagementFeeInfo {
  feePerApartment: number;
  totalFee: number;
  apartmentsCount: number;
  hasFee: boolean;
}
