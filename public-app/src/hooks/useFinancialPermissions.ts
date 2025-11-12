import { useAuth } from '@/components/contexts/AuthContext';

export type FinancialPermission = 
  | 'financial_read'
  | 'financial_write' 
  | 'financial_admin'
  | 'expense_manage'
  | 'payment_manage'
  | 'transaction_manage'
  | 'report_access';

export function useFinancialPermissions() {
  const { user, isAuthReady } = useAuth();

  const hasPermission = (permission: FinancialPermission): boolean => {
    if (!user || !isAuthReady) return false;

    // Superusers έχουν πλήρη πρόσβαση
    if (user.is_superuser) return true;

    // Staff users έχουν πρόσβαση σε όλες τις λειτουργίες
    if (user.is_staff) return true;

    const role = user.profile?.role;

    switch (permission) {
      case 'financial_read':
        // Όλοι οι αυθεντικοποιημένοι χρήστες μπορούν να διαβάζουν
        return true;

      case 'financial_write':
        // Managers και admins μπορούν να γράφουν
        return role === 'manager' || role === 'admin';

      case 'financial_admin':
        // Μόνο admins μπορούν να κάνουν διαχειριστικές λειτουργίες
        return role === 'admin';

      case 'expense_manage':
        // Managers και admins μπορούν να διαχειρίζονται δαπάνες
        return role === 'manager' || role === 'admin';

      case 'payment_manage':
        // Managers και admins μπορούν να διαχειρίζονται πληρωμές
        return role === 'manager' || role === 'admin';

      case 'transaction_manage':
        // Μόνο admins μπορούν να διαχειρίζονται κινήσεις
        return role === 'admin';

      case 'report_access':
        // Managers και admins μπορούν να δουν αναφορές
        return role === 'manager' || role === 'admin';

      default:
        return false;
    }
  };

  const canCreateExpense = () => hasPermission('expense_manage');
  const canEditExpense = () => hasPermission('expense_manage');
  const canDeleteExpense = () => hasPermission('financial_admin');
  
  const canCreatePayment = () => hasPermission('payment_manage');
  const canEditPayment = () => hasPermission('payment_manage');
  const canDeletePayment = () => hasPermission('financial_admin');
  
  const canViewTransactions = () => hasPermission('financial_read');
  const canEditTransaction = () => hasPermission('transaction_manage');
  const canDeleteTransaction = () => hasPermission('transaction_manage');
  
  const canAccessReports = () => hasPermission('report_access');
  const canExportData = () => hasPermission('report_access');
  
  const canCalculateCommonExpenses = () => hasPermission('financial_write');
  const canIssueCommonExpenses = () => hasPermission('financial_write');

  return {
    // Γενικά permissions
    hasPermission,
    isAuthReady,
    
    // Ειδικά permissions για δαπάνες
    canCreateExpense,
    canEditExpense,
    canDeleteExpense,
    
    // Ειδικά permissions για πληρωμές
    canCreatePayment,
    canEditPayment,
    canDeletePayment,
    
    // Ειδικά permissions για κινήσεις
    canViewTransactions,
    canEditTransaction,
    canDeleteTransaction,
    
    // Ειδικά permissions για αναφορές
    canAccessReports,
    canExportData,
    
    // Ειδικά permissions για κοινοχρήστους
    canCalculateCommonExpenses,
    canIssueCommonExpenses,
    
    // Χρήσιμες συναρτήσεις
    isManager: () => user?.is_staff || user?.profile?.role === 'manager',
    isAdmin: () => user?.is_superuser || user?.profile?.role === 'admin',
    isSuperUser: () => user?.is_superuser || user?.is_staff,
  };
} 