import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { getEffectiveRole, hasOfficeAdminAccess } from '@/lib/roleUtils';

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
  const { selectedBuilding } = useBuilding();

  const hasPermission = (permission: FinancialPermission): boolean => {
    if (!user || !isAuthReady) return false;

    const role = getEffectiveRole(user);
    const isOfficeAdmin = role ? ['manager', 'office_staff', 'staff', 'superuser'].includes(role) : false;
    const isSystemAdmin = role ? ['staff', 'superuser'].includes(role) : false;
    const isInternalManager = role === 'internal_manager';
    
    // Check if internal manager has payment recording permission for this building
    const internalManagerCanRecordPayments = isInternalManager && 
      selectedBuilding?.internal_manager_can_record_payments === true;

    switch (permission) {
      case 'financial_read':
        // Όλοι οι αυθεντικοποιημένοι χρήστες μπορούν να διαβάζουν
        // Internal managers μπορούν πάντα να βλέπουν τα οικονομικά
        return true;

      case 'financial_write':
        // Γραφεία, admins και internal managers με δικαίωμα
        return isOfficeAdmin || internalManagerCanRecordPayments;

      case 'financial_admin':
        // Μόνο συστημικοί admins (staff/superuser)
        return isSystemAdmin;

      case 'expense_manage':
        // Γραφεία/administrators (εσωτερικοί διαχειριστές δεν διαχειρίζονται δαπάνες)
        return isOfficeAdmin;

      case 'payment_manage':
        // Γραφεία/administrators ΚΑΙ internal managers με δικαίωμα
        return isOfficeAdmin || internalManagerCanRecordPayments;

      case 'transaction_manage':
        return isSystemAdmin;

      case 'report_access':
        // Internal managers μπορούν να βλέπουν αναφορές
        return isOfficeAdmin || isInternalManager;

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
    isManager: () => {
      const role = getEffectiveRole(user);
      return role === 'manager' || role === 'office_staff';
    },
    isAdmin: () => hasOfficeAdminAccess(user),
    isSuperUser: () => getEffectiveRole(user) === 'superuser',
  };
} 