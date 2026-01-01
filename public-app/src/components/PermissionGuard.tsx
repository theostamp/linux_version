/**
 * PermissionGuard Component
 *
 * Declarative permission checking for UI components.
 *
 * Αντί να γράφεις permission checks παντού:
 *   {permissions?.can_edit && <Button>Edit</Button>}
 *
 * Χρησιμοποιείς το PermissionGuard:
 *   <PermissionGuard action="edit">
 *     <Button>Edit</Button>
 *   </PermissionGuard>
 *
 * Benefits:
 * - Declarative (easier to read)
 * - Consistent (same pattern everywhere)
 * - Maintainable (easy to update logic)
 * - Type-safe (TypeScript support)
 */

'use client';

import React, { ReactNode } from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { checkBuildingAccess, BuildingAction } from '@/lib/buildingValidation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Lock, AlertCircle } from 'lucide-react';

// ========================================================================
// Types
// ========================================================================

export interface PermissionGuardProps {
  /**
   * The action που χρειάζεται permission check.
   * Πρέπει να match με το BuildingAction type.
   */
  action: BuildingAction;

  /**
   * Children που θα rendered αν έχει permission.
   */
  children: ReactNode;

  /**
   * Fallback που θα rendered αν ΔΕΝ έχει permission.
   * - null/undefined: Render nothing (default)
   * - ReactNode: Custom fallback component
   * - 'disabled': Render children με disabled state
   * - 'tooltip': Render children με tooltip explaining why disabled
   */
  fallback?: ReactNode | 'disabled' | 'tooltip';

  /**
   * Αν true, δείχνει tooltip με explanation όταν δεν έχει permission.
   * Works μόνο με fallback='tooltip' ή όταν children είναι button-like.
   */
  showReason?: boolean;

  /**
   * Custom message για το tooltip.
   * Default: Auto-generated based on action.
   */
  customMessage?: string;

  /**
   * Αν true, render children αλλά με disabled/grayed out state.
   */
  disableInsteadOfHide?: boolean;
}

// ========================================================================
// Helper Functions
// ========================================================================

/**
 * Gets human-readable action label σε Ελληνικά
 */
const getActionLabel = (action: BuildingAction): string => {
  const labels: Record<BuildingAction, string> = {
    'view': 'Προβολή',
    'edit': 'Επεξεργασία',
    'delete': 'Διαγραφή',
    'manage_financials': 'Διαχείριση Οικονομικών',
  };
  return labels[action] || action;
};

/**
 * Gets explanation message για το permission
 */
const getPermissionMessage = (action: BuildingAction): string => {
  const messages: Record<BuildingAction, string> = {
    'view': 'Δεν έχετε δικαίωμα προβολής αυτού του κτιρίου.',
    'edit': 'Δεν έχετε δικαίωμα επεξεργασίας. Απαιτείται ρόλος Διαχειριστή.',
    'delete': 'Δεν έχετε δικαίωμα διαγραφής. Απαιτείται ρόλος Superuser.',
    'manage_financials': 'Δεν έχετε δικαίωμα διαχείρισης οικονομικών. Απαιτείται ρόλος Διαχειριστή.',
  };
  return messages[action] || `Δεν έχετε δικαίωμα: ${getActionLabel(action)}`;
};

// ========================================================================
// Main Component
// ========================================================================

/**
 * PermissionGuard - Declarative permission checking component
 *
 * @example
 * ```tsx
 * // Basic usage
 * <PermissionGuard action="edit">
 *   <Button>Edit Building</Button>
 * </PermissionGuard>
 *
 * // With custom fallback
 * <PermissionGuard
 *   action="delete"
 *   fallback={<Button disabled>Delete (No Permission)</Button>}
 * >
 *   <Button variant="destructive">Delete Building</Button>
 * </PermissionGuard>
 *
 * // With tooltip
 * <PermissionGuard action="edit" fallback="tooltip">
 *   <Button>Edit Building</Button>
 * </PermissionGuard>
 *
 * // Disable instead of hide
 * <PermissionGuard action="delete" disableInsteadOfHide>
 *   <Button>Delete</Button>
 * </PermissionGuard>
 * ```
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  action,
  children,
  fallback,
  showReason = false,
  customMessage,
  disableInsteadOfHide = false,
}) => {
  const { selectedBuilding, permissions } = useBuilding();

  // Check permission
  const hasPermission = checkBuildingAccess(selectedBuilding, action, permissions);

  // Case 1: Has permission - render children normally
  if (hasPermission) {
    return <>{children}</>;
  }

  // Case 2: No permission
  const message = customMessage || getPermissionMessage(action);

  // Option A: Custom fallback provided
  if (fallback && fallback !== 'disabled' && fallback !== 'tooltip') {
    return <>{fallback}</>;
  }

  // Option B: Disable instead of hide
  if (disableInsteadOfHide || fallback === 'disabled') {
    return (
      <div className="opacity-50 cursor-not-allowed pointer-events-none">
        {children}
      </div>
    );
  }

  // Option C: Show with tooltip
  if (fallback === 'tooltip' || showReason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="opacity-50 cursor-not-allowed">
              {children}
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="flex items-start gap-2">
              <Lock className="h-4 w-4 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Χωρίς δικαίωμα</p>
                <p className="text-xs mt-1">{message}</p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Option D: Hide completely (default)
  return null;
};

// ========================================================================
// Variants
// ========================================================================

/**
 * MultiPermissionGuard - Requires ALL specified permissions
 *
 * @example
 * ```tsx
 * <MultiPermissionGuard actions={['edit', 'manage_financials']}>
 *   <Button>Edit Financial Settings</Button>
 * </MultiPermissionGuard>
 * ```
 */
export interface MultiPermissionGuardProps {
  actions: BuildingAction[];
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean; // true = ALL permissions, false = ANY permission
}

export const MultiPermissionGuard: React.FC<MultiPermissionGuardProps> = ({
  actions,
  children,
  fallback,
  requireAll = true,
}) => {
  const { selectedBuilding, permissions } = useBuilding();

  const hasPermission = requireAll
    ? actions.every(action => checkBuildingAccess(selectedBuilding, action, permissions))
    : actions.some(action => checkBuildingAccess(selectedBuilding, action, permissions));

  if (hasPermission) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
};

/**
 * PermissionBadge - Shows visual indicator για permission status
 *
 * @example
 * ```tsx
 * <PermissionBadge action="edit" />
 * // Shows: "✓ Can Edit" or "✗ Cannot Edit"
 * ```
 */
export interface PermissionBadgeProps {
  action: BuildingAction;
  showLabel?: boolean;
  className?: string;
}

export const PermissionBadge: React.FC<PermissionBadgeProps> = ({
  action,
  showLabel = true,
  className = '',
}) => {
  const { selectedBuilding, permissions } = useBuilding();
  const hasPermission = checkBuildingAccess(selectedBuilding, action, permissions);

  const label = getActionLabel(action);

  if (hasPermission) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs text-green-700 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
        {showLabel && <span>Μπορείτε: {label}</span>}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 text-xs text-gray-500 ${className}`}>
      <Lock className="w-3 h-3" />
      {showLabel && <span>Χωρίς δικαίωμα: {label}</span>}
    </span>
  );
};

/**
 * PermissionAlert - Shows alert box όταν user δεν έχει permission
 *
 * @example
 * ```tsx
 * <PermissionAlert action="manage_financials">
 *   <FinancialSettings />
 * </PermissionAlert>
 * ```
 */
export interface PermissionAlertProps {
  action: BuildingAction;
  children: ReactNode;
}

export const PermissionAlert: React.FC<PermissionAlertProps> = ({
  action,
  children,
}) => {
  const { selectedBuilding, permissions } = useBuilding();
  const hasPermission = checkBuildingAccess(selectedBuilding, action, permissions);

  if (hasPermission) {
    return <>{children}</>;
  }

  const message = getPermissionMessage(action);

  return (
    <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
        <div>
          <h3 className="font-semibold text-yellow-900 mb-1">
            Περιορισμένη Πρόσβαση
          </h3>
          <p className="text-sm text-yellow-800">{message}</p>
          <p className="text-xs text-yellow-700 mt-2">
            Επικοινωνήστε με τον διαχειριστή για περισσότερα δικαιώματα.
          </p>
        </div>
      </div>
    </div>
  );
};

// ========================================================================
// Export All
// ========================================================================

export default PermissionGuard;
