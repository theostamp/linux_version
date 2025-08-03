// Frontend types για το οικονομικό σύστημα

// Βασικοί τύποι
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
  amount: number;
  date: string;
  method: string;
  method_display?: string;
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
  notes?: string;
  attachment?: File;
}

export interface PaymentFormData {
  apartment_id: number;
  amount: number;
  date: string;
  method: string;
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

// Enum types
export enum ExpenseCategory {
  // Πάγιες Δαπάνες Κοινοχρήστων
  CLEANING = 'cleaning',
  ELECTRICITY_COMMON = 'electricity_common',
  WATER_COMMON = 'water_common',
  GARBAGE_COLLECTION = 'garbage_collection',
  SECURITY = 'security',
  CONCIERGE = 'concierge',
  
  // Δαπάνες Ανελκυστήρα
  ELEVATOR_MAINTENANCE = 'elevator_maintenance',
  ELEVATOR_REPAIR = 'elevator_repair',
  ELEVATOR_INSPECTION = 'elevator_inspection',
  ELEVATOR_MODERNIZATION = 'elevator_modernization',
  
  // Δαπάνες Θέρμανσης
  HEATING_FUEL = 'heating_fuel',
  HEATING_GAS = 'heating_gas',
  HEATING_MAINTENANCE = 'heating_maintenance',
  HEATING_REPAIR = 'heating_repair',
  HEATING_INSPECTION = 'heating_inspection',
  HEATING_MODERNIZATION = 'heating_modernization',
  
  // Δαπάνες Ηλεκτρικών Εγκαταστάσεων
  ELECTRICAL_MAINTENANCE = 'electrical_maintenance',
  ELECTRICAL_REPAIR = 'electrical_repair',
  ELECTRICAL_UPGRADE = 'electrical_upgrade',
  LIGHTING_COMMON = 'lighting_common',
  INTERCOM_SYSTEM = 'intercom_system',
  
  // Δαπάνες Υδραυλικών Εγκαταστάσεων
  PLUMBING_MAINTENANCE = 'plumbing_maintenance',
  PLUMBING_REPAIR = 'plumbing_repair',
  WATER_TANK_CLEANING = 'water_tank_cleaning',
  WATER_TANK_MAINTENANCE = 'water_tank_maintenance',
  SEWAGE_SYSTEM = 'sewage_system',
  
  // Δαπάνες Κτιρίου & Εξωτερικών Χώρων
  BUILDING_INSURANCE = 'building_insurance',
  BUILDING_MAINTENANCE = 'building_maintenance',
  ROOF_MAINTENANCE = 'roof_maintenance',
  ROOF_REPAIR = 'roof_repair',
  FACADE_MAINTENANCE = 'facade_maintenance',
  FACADE_REPAIR = 'facade_repair',
  PAINTING_EXTERIOR = 'painting_exterior',
  PAINTING_INTERIOR = 'painting_interior',
  GARDEN_MAINTENANCE = 'garden_maintenance',
  PARKING_MAINTENANCE = 'parking_maintenance',
  ENTRANCE_MAINTENANCE = 'entrance_maintenance',
  
  // Έκτακτες Δαπάνες & Επισκευές
  EMERGENCY_REPAIR = 'emergency_repair',
  STORM_DAMAGE = 'storm_damage',
  FLOOD_DAMAGE = 'flood_damage',
  FIRE_DAMAGE = 'fire_damage',
  EARTHQUAKE_DAMAGE = 'earthquake_damage',
  VANDALISM_REPAIR = 'vandalism_repair',
  
  // Ειδικές Επισκευές
  LOCKSMITH = 'locksmith',
  GLASS_REPAIR = 'glass_repair',
  DOOR_REPAIR = 'door_repair',
  WINDOW_REPAIR = 'window_repair',
  BALCONY_REPAIR = 'balcony_repair',
  STAIRCASE_REPAIR = 'staircase_repair',
  
  // Δαπάνες Ασφάλειας & Πρόσβασης
  SECURITY_SYSTEM = 'security_system',
  CCTV_INSTALLATION = 'cctv_installation',
  ACCESS_CONTROL = 'access_control',
  FIRE_ALARM = 'fire_alarm',
  FIRE_EXTINGUISHERS = 'fire_extinguishers',
  
  // Δαπάνες Διοικητικές & Νομικές
  LEGAL_FEES = 'legal_fees',
  NOTARY_FEES = 'notary_fees',
  SURVEYOR_FEES = 'surveyor_fees',
  ARCHITECT_FEES = 'architect_fees',
  ENGINEER_FEES = 'engineer_fees',
  ACCOUNTING_FEES = 'accounting_fees',
  MANAGEMENT_FEES = 'management_fees',
  
  // Δαπάνες Ειδικών Εργασιών
  ASBESTOS_REMOVAL = 'asbestos_removal',
  LEAD_PAINT_REMOVAL = 'lead_paint_removal',
  MOLD_REMOVAL = 'mold_removal',
  PEST_CONTROL = 'pest_control',
  TREE_TRIMMING = 'tree_trimming',
  SNOW_REMOVAL = 'snow_removal',
  
  // Δαπάνες Ενεργειακής Απόδοσης
  ENERGY_UPGRADE = 'energy_upgrade',
  INSULATION_WORK = 'insulation_work',
  SOLAR_PANEL_INSTALLATION = 'solar_panel_installation',
  LED_LIGHTING = 'led_lighting',
  SMART_SYSTEMS = 'smart_systems',
  
  // Δαπάνες Ιδιοκτητών
  SPECIAL_CONTRIBUTION = 'special_contribution',
  RESERVE_FUND = 'reserve_fund',
  EMERGENCY_FUND = 'emergency_fund',
  RENOVATION_FUND = 'renovation_fund',
  
  // Άλλες Δαπάνες
  MISCELLANEOUS = 'miscellaneous',
  CONSULTING_FEES = 'consulting_fees',
  PERMITS_LICENSES = 'permits_licenses',
  TAXES_FEES = 'taxes_fees',
  UTILITIES_OTHER = 'utilities_other'
}

export enum DistributionType {
  BY_PARTICIPATION_MILLS = 'by_participation_mills',
  EQUAL_SHARE = 'equal_share',
  SPECIFIC_APARTMENTS = 'specific_apartments',
  BY_METERS = 'by_meters'
}

export enum TransactionType {
  COMMON_EXPENSE_PAYMENT = 'common_expense_payment',
  EXPENSE_PAYMENT = 'expense_payment',
  REFUND = 'refund',
  COMMON_EXPENSE_CHARGE = 'common_expense_charge'
}

export enum PaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  CHECK = 'check',
  CARD = 'card'
}

export enum MeterType {
  HEATING = 'heating',
  WATER = 'water',
  ELECTRICITY = 'electricity'
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