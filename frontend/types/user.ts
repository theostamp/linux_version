// frontend/types/user.ts
export type User = {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  groups?: { id: number; name: string }[];
  is_staff?: boolean;
  is_superuser?: boolean;
  role?: string;

  // ✅ Προσθήκη profile αν το API το επιστρέφει
  profile?: {
    role?: 'resident' | 'manager' | 'superuser';
    [key: string]: any;
  };
};
