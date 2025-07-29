// frontend/types/userRequests.ts

export interface UserRequest {
  id: number;
  title: string;
  description: string;
  type?: string;
  is_urgent: boolean;
  building: number;
  building_name?: string; // Building name for display
  created_by: number;
  created_by_username: string;
  status: string;
  created_at: string;
  updated_at?: string;
  supporter_count: number;
  supporter_usernames: string[];
  is_supported?: boolean;
  supporters?: number[]; // ✅ ΠΡΟΣΤΕΘΗΚΕ αυτό για να συμφωνεί με το backend
  
  // 🔧 Enhanced Maintenance Fields
  priority?: string; // 'low', 'medium', 'high', 'urgent'
  assigned_to?: number | null;
  assigned_to_username?: string;
  estimated_completion?: string;
  completed_at?: string;
  notes?: string; // Staff notes
  photos?: string[]; // Photo URLs
  location?: string; // Specific location in building
  apartment_number?: string; // If applicable
  cost_estimate?: number; // Estimated cost
  actual_cost?: number; // Actual cost after completion
  contractor_notes?: string; // Notes from contractor
  maintenance_category?: string; // Specific maintenance category
}

export interface UserRequestType {
  id: number;
  name: string;
  description: string;
  icon: string;
}

// 🔧 New: Maintenance Categories
export const MAINTENANCE_CATEGORIES = [
  { value: 'electrical', label: 'Ηλεκτρικά', icon: '⚡', color: 'text-yellow-600' },
  { value: 'plumbing', label: 'Υδραυλικά', icon: '🚰', color: 'text-blue-600' },
  { value: 'heating', label: 'Θέρμανση', icon: '🔥', color: 'text-red-600' },
  { value: 'elevator', label: 'Ανελκυστήρας', icon: '🛗', color: 'text-purple-600' },
  { value: 'cleaning', label: 'Καθαριότητα', icon: '🧹', color: 'text-green-600' },
  { value: 'security', label: 'Ασφάλεια', icon: '🔒', color: 'text-gray-600' },
  { value: 'structural', label: 'Δομικά', icon: '🏗️', color: 'text-orange-600' },
  { value: 'landscaping', label: 'Κηπουρική', icon: '🌳', color: 'text-emerald-600' },
  { value: 'pest_control', label: 'Απεντόμωση', icon: '🐜', color: 'text-brown-600' },
  { value: 'fire_safety', label: 'Πυρασφάλεια', icon: '🚨', color: 'text-red-500' },
  { value: 'noise', label: 'Θόρυβος', icon: '🔊', color: 'text-pink-600' },
  { value: 'other', label: 'Άλλο', icon: '📋', color: 'text-gray-500' },
];

// 🔧 New: Priority Levels
export const PRIORITY_LEVELS = [
  { value: 'low', label: 'Χαμηλή', icon: '🟢', color: 'text-green-600' },
  { value: 'medium', label: 'Μέτρια', icon: '🟡', color: 'text-yellow-600' },
  { value: 'high', label: 'Υψηλή', icon: '🟠', color: 'text-orange-600' },
  { value: 'urgent', label: 'Επείγουσα', icon: '🔴', color: 'text-red-600' },
];

// 🔧 New: Status Options
export const REQUEST_STATUSES = [
  { value: 'pending', label: 'Σε εκκρεμότητα', icon: '⏳', color: 'text-gray-600' },
  { value: 'in_progress', label: 'Σε εξέλιξη', icon: '🔄', color: 'text-blue-600' },
  { value: 'completed', label: 'Ολοκληρωμένο', icon: '✅', color: 'text-green-600' },
  { value: 'rejected', label: 'Απορρίφθηκε', icon: '❌', color: 'text-red-600' },
  { value: 'cancelled', label: 'Ακυρώθηκε', icon: '🚫', color: 'text-gray-500' },
];

// 🔧 New: Location Types
export const LOCATION_TYPES = [
  { value: 'common_area', label: 'Κοινόχρηστος χώρος' },
  { value: 'apartment', label: 'Διαμέρισμα' },
  { value: 'basement', label: 'Υπόγειο' },
  { value: 'roof', label: 'Στέγη' },
  { value: 'garden', label: 'Κήπος' },
  { value: 'parking', label: 'Χώρος στάθμευσης' },
  { value: 'elevator', label: 'Ανελκυστήρας' },
  { value: 'stairwell', label: 'Κλιμακοστάσιο' },
  { value: 'entrance', label: 'Είσοδος' },
  { value: 'other', label: 'Άλλο' },
];