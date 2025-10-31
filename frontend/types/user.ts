// frontend/types/user.ts
export type User = {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  name?: string; // Add missing name property for chat functionality
  groups?: { id: number; name: string }[];
  is_staff?: boolean;
  is_superuser?: boolean;
  is_active?: boolean;
  email_verified?: boolean;
  role?: string;  // Backward compat (same as system_role)
  system_role?: 'superuser' | 'admin' | 'manager' | null;  // CustomUser.SystemRole
  resident_role?: 'manager' | 'owner' | 'tenant' | null;  // Resident.Role (apartment level)
  resident_profile?: {
    apartment: string;
    building_id: number;
    building_name: string;
    phone?: string | null;
  } | null;

  // Office Management Details
  office_name?: string;
  office_phone?: string;
  office_address?: string;
  office_logo?: string; // URL to the office logo image
  
  // Bank Account Details
  office_bank_name?: string;
  office_bank_account?: string;
  office_bank_iban?: string;
  office_bank_beneficiary?: string;

  // ✅ Προσθήκη profile αν το API το επιστρέφει
  profile?: {
    role?: 'resident' | 'manager' | 'superuser';
    [key: string]: any;
  };

  // Tenant information
  tenant?: {
    id: number;
    name: string;
    schema_name: string;
  } | null;
};
