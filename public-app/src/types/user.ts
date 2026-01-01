// frontend/types/user.ts

// Staff permissions για υπαλλήλους γραφείου
export type StaffPermissions = {
  job_title?: string;
  can_view_financials: boolean;
  can_access_office_finance: boolean;  // Νέο: πρόσβαση σε Οικονομικά Γραφείου
  can_record_payments: boolean;
  can_create_expenses: boolean;
  can_edit_expenses: boolean;
  can_create_announcements: boolean;
  can_send_notifications: boolean;
  can_manage_requests: boolean;
  can_manage_maintenance: boolean;
  can_view_apartments: boolean;
  can_edit_apartments: boolean;
  can_view_residents: boolean;
  can_invite_residents: boolean;
  can_upload_documents: boolean;
  can_delete_documents: boolean;
  is_active: boolean;
};

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
  is_active?: boolean; // Whether the user can log in
  role?: string;

  // Staff permissions (μόνο για staff role)
  staff_permissions?: StaffPermissions;

  // Office Management Details
  office_name?: string;
  office_phone?: string;
  office_phone_emergency?: string; // Τηλέφωνο ανάγκης
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
