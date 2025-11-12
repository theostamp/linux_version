'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useFinancialPermissions, FinancialPermission } from '@/hooks/useFinancialPermissions';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Lock } from 'lucide-react';

interface ProtectedFinancialRouteProps {
  children: ReactNode;
  requiredPermission: FinancialPermission;
  fallback?: ReactNode;
  showUnauthorizedMessage?: boolean;
}

export function ProtectedFinancialRoute({
  children,
  requiredPermission,
  fallback,
  showUnauthorizedMessage = true,
}: ProtectedFinancialRouteProps) {
  const { hasPermission, isAuthReady } = useFinancialPermissions();
  const router = useRouter();

  // Αν δεν έχει φορτώσει ακόμα η αυθεντικοποίηση, εμφάνισε loading
  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Έλεγχος αν ο χρήστης έχει το απαιτούμενο δικαίωμα
  if (!hasPermission(requiredPermission)) {
    // Αν δόθηκε custom fallback, εμφάνισέ το
    if (fallback) {
      return <>{fallback}</>;
    }

    // Αν δεν πρέπει να εμφανιστεί μήνυμα, επιστρέψε null
    if (!showUnauthorizedMessage) {
      return null;
    }

    // Εμφάνισε μήνυμα μη εξουσιοδοτημένης πρόσβασης
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <Lock className="h-8 w-8 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">
                Μη Εξουσιοδοτημένη Πρόσβαση
              </h3>
              <p className="text-red-600 mt-1">
                Δεν έχετε τα απαραίτητα δικαιώματα για να δείτε αυτή τη σελίδα.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Αν έχει δικαίωμα, εμφάνισε τα children
  return <>{children}</>;
}

interface ConditionalRenderProps {
  children: ReactNode;
  permission: FinancialPermission;
  fallback?: ReactNode;
}

export function ConditionalRender({ children, permission, fallback }: ConditionalRenderProps) {
  const { hasPermission } = useFinancialPermissions();

  if (!hasPermission(permission)) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

interface PermissionButtonProps {
  children: ReactNode;
  permission: FinancialPermission;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function PermissionButton({
  children,
  permission,
  onClick,
  disabled = false,
  variant = 'default',
  size = 'default',
  className = '',
}: PermissionButtonProps) {
  const { hasPermission } = useFinancialPermissions();

  if (!hasPermission(permission)) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant} btn-${size} ${className}`}
    >
      {children}
    </button>
  );
}

interface PermissionIconProps {
  permission: FinancialPermission;
  icon: ReactNode;
  tooltip?: string;
  className?: string;
}

export function PermissionIcon({ permission, icon, tooltip, className = '' }: PermissionIconProps) {
  const { hasPermission } = useFinancialPermissions();

  if (!hasPermission(permission)) {
    return null;
  }

  return (
    <div className={`inline-block ${className}`} title={tooltip}>
      {icon}
    </div>
  );
} 