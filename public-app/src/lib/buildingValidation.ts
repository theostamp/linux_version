/**
 * Building Validation Helpers
 *
 * Utility functions για validation του building context και permissions.
 * Χρησιμοποιείται σε components για να ελέγχουν αν ο user έχει τα απαραίτητα
 * permissions για μια συγκεκριμένη ενέργεια.
 */

import type { Building } from '@/lib/api';
import type { BuildingPermissions } from '@/components/contexts/BuildingContext';
import { toast } from 'sonner';

/**
 * Custom error για building validation failures
 */
export class BuildingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BuildingValidationError';
  }
}

/**
 * Actions που μπορεί να κάνει ένας user σε ένα building
 */
export type BuildingAction = 'view' | 'edit' | 'delete' | 'manage_financials';

/**
 * Validates αν ο user έχει access στο building για συγκεκριμένη action.
 *
 * @param building - To building (μπορεί να είναι null)
 * @param action - Η action που θέλει να κάνει ο user
 * @param permissions - Τα permissions του user (optional)
 * @throws {BuildingValidationError} - Αν η validation αποτύχει
 */
export const validateBuildingAccess = (
  building: Building | null,
  action: BuildingAction,
  permissions?: BuildingPermissions | null
): void => {
  // Check 1: Building must exist
  if (!building) {
    throw new BuildingValidationError(
      'Δεν έχει επιλεγεί κτίριο. Παρακαλώ επιλέξτε ένα κτίριο.'
    );
  }

  // Check 2: Permissions must exist (unless just viewing)
  if (!permissions && action !== 'view') {
    throw new BuildingValidationError(
      'Δεν έχετε δικαίωμα για αυτή την ενέργεια.'
    );
  }

  // Check 3: Specific permission checks
  if (permissions) {
    switch (action) {
      case 'edit':
        if (!permissions.can_edit) {
          throw new BuildingValidationError(
            'Δεν έχετε δικαίωμα επεξεργασίας αυτού του κτιρίου.'
          );
        }
        break;

      case 'delete':
        if (!permissions.can_delete) {
          throw new BuildingValidationError(
            'Δεν έχετε δικαίωμα διαγραφής αυτού του κτιρίου.'
          );
        }
        break;

      case 'manage_financials':
        if (!permissions.can_manage_financials) {
          throw new BuildingValidationError(
            'Δεν έχετε δικαίωμα διαχείρισης των οικονομικών του κτιρίου.'
          );
        }
        break;

      case 'view':
        if (!permissions.can_view) {
          throw new BuildingValidationError(
            'Δεν έχετε δικαίωμα προβολής αυτού του κτιρίου.'
          );
        }
        break;
    }
  }
};

/**
 * Safe version που επιστρέφει boolean αντί να κάνει throw.
 * Χρήσιμο για conditional rendering.
 *
 * @param building - To building
 * @param action - Η action
 * @param permissions - Τα permissions
 * @returns true αν έχει access, false διαφορετικά
 */
export const checkBuildingAccess = (
  building: Building | null,
  action: BuildingAction,
  permissions?: BuildingPermissions | null
): boolean => {
  try {
    validateBuildingAccess(building, action, permissions);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validates building access και δείχνει toast αν αποτύχει.
 *
 * @param building - To building
 * @param action - Η action
 * @param permissions - Τα permissions
 * @returns true αν έχει access, false διαφορετικά
 */
export const validateBuildingAccessWithToast = (
  building: Building | null,
  action: BuildingAction,
  permissions?: BuildingPermissions | null
): boolean => {
  try {
    validateBuildingAccess(building, action, permissions);
    return true;
  } catch (error) {
    if (error instanceof BuildingValidationError) {
      toast.error(error.message);
    }
    return false;
  }
};

/**
 * React hook για building validation.
 * Provides helpers που αυτόματα χρησιμοποιούν το τρέχον building context.
 *
 * Usage:
 * ```tsx
 * const { validateAction, checkAction } = useBuildingValidation();
 *
 * const handleEdit = () => {
 *   if (!validateAction('edit')) return;
 *   // Proceed with edit
 * };
 *
 * return (
 *   <>
 *     {checkAction('edit') && (
 *       <button onClick={handleEdit}>Edit</button>
 *     )}
 *   </>
 * );
 * ```
 */
export const useBuildingValidation = () => {
  // This will be used in components with useBuilding() hook
  // Placeholder implementation - components will import useBuilding separately

  const validateAction = (
    action: BuildingAction,
    building: Building | null,
    permissions: BuildingPermissions | null
  ): boolean => {
    return validateBuildingAccessWithToast(building, action, permissions);
  };

  const checkAction = (
    action: BuildingAction,
    building: Building | null,
    permissions: BuildingPermissions | null
  ): boolean => {
    return checkBuildingAccess(building, action, permissions);
  };

  return {
    validateAction,
    checkAction,
  };
};
