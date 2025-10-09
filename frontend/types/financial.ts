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
  created_at: string;
  updated_at: string;
  // Explicit links (optional; require backend support)
  linked_service_receipt?: number | null;
  linked_scheduled_maintenance?: number | null;
  // Maintenance payment integration
  maintenance_payment_receipts?: Array<{
    id: number;
    scheduled_maintenance: {
      id: number;
      title: string;
    };
    installment?: {
      id: number;
      installment_type: string;
      installment_number: number;
    };
    receipt_type: string;
    amount: number;
  }>;
  
  // Installment information
  has_installments?: boolean;
  linked_maintenance_projects?: Array<{
    id: number;
    title: string;
    description: string;
    scheduled_date: string;
    status: string;
    priority: string;
    payment_schedule?: {
      id: number;
      total_amount: number;
      installment_count: number;
    };
  }>;
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
  reserve_fund_amount?: number;
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
  value: number | string; // Can be string from DecimalField serialization
  meter_type: string;
  meter_type_display?: string;
  previous_value?: number | string;
  consumption?: number | string;
  consumption_period?: {
    start_date: string;
    end_date: string;
  };
  notes?: string;
  created_at: string;
}

// Dashboard types
export interface FinancialSummary {
  current_reserve: number;
  total_obligations: number;
  previous_obligations?: number;
  current_obligations?: number;
  current_month_expenses?: number;  // Νέο πεδίο: Δαπάνες μόνο του τρέχοντος μήνα
  total_expenses_this_month: number;
  total_payments_this_month: number;
  recent_transactions: Transaction[];
  average_monthly_expenses?: number;
  reserve_fund_monthly_target?: number;
  reserve_fund_contribution?: number;
  total_management_cost?: number;
  management_fee_per_apartment?: number;
  apartments_count?: number;
  reserve_fund_goal?: number;
  reserve_fund_duration_months?: number;
  reserve_fund_start_date?: string;
  reserve_fund_target_date?: string;
  reserve_fund_priority?: string;
  has_monthly_activity?: boolean;
  total_expenses_month?: number;
}

export interface ApartmentBalance {
  apartment_id: number;
  apartment_number: string;
  owner_name: string;
  building_name?: string;
  current_balance: number;
  participation_mills: number;
  last_payment_date?: string;
  last_payment_amount?: number;
  total_payments?: number;
  total_expenses?: number;
  recent_payments?: Array<{
    amount: number;
    payment_date: string;
  }>;
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
  identifier: string;
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
  due_date?: string; // Ημερομηνία πληρωμής
  add_to_calendar?: boolean; // Προσθήκη στο ημερολόγιο
}

export interface PaymentFormData {
  apartment_id: number;
  amount: number;
  date: string;
  method: string;
  payment_type: string;
  payer_type: string;
  payer_name?: string;
  reference_number?: string;
  notes?: string;
  receipt?: File;
  reserve_fund_amount?: number;
  previous_obligations_amount?: number;
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
  // Πάγιες Δαπάνες Κοινοχρήστων
  CLEANING: 'cleaning',
  ELECTRICITY_COMMON: 'electricity_common',
  WATER_COMMON: 'water_common',
  GARBAGE_COLLECTION: 'garbage_collection',
  SECURITY: 'security',
  CONCIERGE: 'concierge',
  
  // Δαπάνες Ανελκυστήρα
  ELEVATOR_MAINTENANCE: 'elevator_maintenance',
  ELEVATOR_REPAIR: 'elevator_repair',
  ELEVATOR_INSPECTION: 'elevator_inspection',
  ELEVATOR_MODERNIZATION: 'elevator_modernization',
  
  // Δαπάνες Θέρμανσης
  HEATING_FUEL: 'heating_fuel',
  HEATING_GAS: 'heating_gas',
  HEATING_MAINTENANCE: 'heating_maintenance',
  HEATING_REPAIR: 'heating_repair',
  HEATING_INSPECTION: 'heating_inspection',
  HEATING_MODERNIZATION: 'heating_modernization',
  
  // Δαπάνες Ηλεκτρικών
  ELECTRICAL_MAINTENANCE: 'electrical_maintenance',
  ELECTRICAL_REPAIR: 'electrical_repair',
  ELECTRICAL_UPGRADE: 'electrical_upgrade',
  LIGHTING_COMMON: 'lighting_common',
  INTERCOM_SYSTEM: 'intercom_system',
  
  // Δαπάνες Υδραυλικών
  PLUMBING_MAINTENANCE: 'plumbing_maintenance',
  PLUMBING_REPAIR: 'plumbing_repair',
  WATER_TANK_CLEANING: 'water_tank_cleaning',
  WATER_TANK_MAINTENANCE: 'water_tank_maintenance',
  SEWAGE_SYSTEM: 'sewage_system',
  
  // Δαπάνες Κτιρίου
  BUILDING_INSURANCE: 'building_insurance',
  BUILDING_MAINTENANCE: 'building_maintenance',
  ROOF_MAINTENANCE: 'roof_maintenance',
  ROOF_REPAIR: 'roof_repair',
  FACADE_MAINTENANCE: 'facade_maintenance',
  FACADE_REPAIR: 'facade_repair',
  PAINTING_EXTERIOR: 'painting_exterior',
  PAINTING_INTERIOR: 'painting_interior',
  GARDEN_MAINTENANCE: 'garden_maintenance',
  PARKING_MAINTENANCE: 'parking_maintenance',
  ENTRANCE_MAINTENANCE: 'entrance_maintenance',
  
  // Έκτακτες Δαπάνες
  EMERGENCY_REPAIR: 'emergency_repair',
  STORM_DAMAGE: 'storm_damage',
  FLOOD_DAMAGE: 'flood_damage',
  FIRE_DAMAGE: 'fire_damage',
  EARTHQUAKE_DAMAGE: 'earthquake_damage',
  VANDALISM_REPAIR: 'vandalism_repair',
  
  // Ειδικές Επισκευές
  LOCKSMITH: 'locksmith',
  GLASS_REPAIR: 'glass_repair',
  DOOR_REPAIR: 'door_repair',
  WINDOW_REPAIR: 'window_repair',
  BALCONY_REPAIR: 'balcony_repair',
  STAIRCASE_REPAIR: 'staircase_repair',
  
  // Ασφάλεια & Πρόσβαση
  SECURITY_SYSTEM: 'security_system',
  CCTV_INSTALLATION: 'cctv_installation',
  ACCESS_CONTROL: 'access_control',
  FIRE_ALARM: 'fire_alarm',
  FIRE_EXTINGUISHERS: 'fire_extinguishers',
  
  // Διοικητικές & Νομικές
  LEGAL_FEES: 'legal_fees',
  NOTARY_FEES: 'notary_fees',
  SURVEYOR_FEES: 'surveyor_fees',
  ARCHITECT_FEES: 'architect_fees',
  ENGINEER_FEES: 'engineer_fees',
  ACCOUNTING_FEES: 'accounting_fees',
  MANAGEMENT_FEES: 'management_fees',
  
  // Ειδικές Εργασίες
  ASBESTOS_REMOVAL: 'asbestos_removal',
  LEAD_PAINT_REMOVAL: 'lead_paint_removal',
  MOLD_REMOVAL: 'mold_removal',
  PEST_CONTROL: 'pest_control',
  TREE_TRIMMING: 'tree_trimming',
  SNOW_REMOVAL: 'snow_removal',
  
  // Ενεργειακή Απόδοση
  ENERGY_UPGRADE: 'energy_upgrade',
  INSULATION_WORK: 'insulation_work',
  SOLAR_PANEL_INSTALLATION: 'solar_panel_installation',
  LED_LIGHTING: 'led_lighting',
  SMART_SYSTEMS: 'smart_systems',
  
  // Δαπάνες Συντήρησης (Legacy)
  MAINTENANCE_GENERAL: 'maintenance_general',
  MAINTENANCE_PLUMBING: 'maintenance_plumbing',
  MAINTENANCE_ELECTRICAL: 'maintenance_electrical',
  MAINTENANCE_STRUCTURAL: 'maintenance_structural',
  MAINTENANCE_ROOF: 'maintenance_roof',
  MAINTENANCE_FACADE: 'maintenance_facade',
  MAINTENANCE_GARDEN: 'maintenance_garden',
  MAINTENANCE_PARKING: 'maintenance_parking',
  
  // Δαπάνες Ασφάλειας (Legacy)
  INSURANCE_BUILDING: 'insurance_building',
  INSURANCE_LIABILITY: 'insurance_liability',
  INSURANCE_EQUIPMENT: 'insurance_equipment',
  
  // Δαπάνες Διοίκησης (Legacy)
  MEETING_EXPENSES: 'meeting_expenses',
  
  // Δαπάνες Τηλεπικοινωνιών
  INTERNET_COMMON: 'internet_common',
  PHONE_COMMON: 'phone_common',
  TV_ANTENNA: 'tv_antenna',
  
  // Δαπάνες Εξοπλισμού
  EQUIPMENT_PURCHASE: 'equipment_purchase',
  EQUIPMENT_REPAIR: 'equipment_repair',
  EQUIPMENT_MAINTENANCE: 'equipment_maintenance',
  
  // Δαπάνες Καθαρισμού
  CLEANING_SUPPLIES: 'cleaning_supplies',
  CLEANING_EQUIPMENT: 'cleaning_equipment',
  CLEANING_SERVICES: 'cleaning_services',
  
  // Δαπάνες Ασφάλειας & Πυρασφάλειας (Legacy)
  FIRE_SAFETY: 'fire_safety',
  SECURITY_SYSTEMS: 'security_systems',
  CCTV: 'cctv',
  
  // Δαπάνες Ενέργειας (Legacy)
  ENERGY_AUDIT: 'energy_audit',
  ENERGY_UPGRADES: 'energy_upgrades',
  SOLAR_PANELS: 'solar_panels',
  
  // Δαπάνες Περιβάλλοντος
  WASTE_MANAGEMENT: 'waste_management',
  RECYCLING: 'recycling',
  GREEN_SPACES: 'green_spaces',
  
  // Δαπάνες Τεχνολογίας (Legacy)
  SMART_HOME: 'smart_home',
  AUTOMATION: 'automation',
  
  // Δαπάνες Ιδιοκτητών
  SPECIAL_CONTRIBUTION: 'special_contribution',
  RESERVE_FUND: 'reserve_fund',
  EMERGENCY_FUND: 'emergency_fund',
  RENOVATION_FUND: 'renovation_fund',
  
  // Άλλες Δαπάνες
  MISCELLANEOUS: 'miscellaneous',
  CONSULTING_FEES: 'consulting_fees',
  PERMITS_LICENSES: 'permits_licenses',
  TAXES_FEES: 'taxes_fees',
  UTILITIES_OTHER: 'utilities_other',
  OTHER: 'other',
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

export enum PayerType {
  OWNER = 'owner',
  TENANT = 'tenant',
  OTHER = 'other',
}

export enum MeterType {
  WATER = 'water',
  ELECTRICITY = 'electricity',
  HEATING_HOURS = 'heating_hours',     // Ωρομετρητές θέρμανσης
  HEATING_ENERGY = 'heating_energy',   // Θερμιδομετρητές (kWh/MWh)
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
  identifier: string;
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
  month_filter?: string; // "YYYY-MM" format για φιλτράρισμα δαπανών συγκεκριμένου μήνα
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
