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
  role?: string;
  
  // Role system (backend/users/models.py - CustomUser.role)
  system_role?: 'superuser' | 'admin' | 'manager' | null;
  resident_role?: 'owner' | 'tenant' | null;
  resident_profile?: {
    id: number;
    apartment: string;
    phone: string;
    role: 'owner' | 'tenant';
    building: number;
    building_name?: string;
  } | null;

  // Email verification
  email_verified?: boolean;
  date_joined?: string;
  last_login?: string;

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
