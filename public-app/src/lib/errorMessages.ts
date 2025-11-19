/**
 * Smart Error Messages System
 * 
 * Provides actionable, context-aware error messages for better UX.
 * Instead of generic "Error occurred", gives users specific guidance.
 * 
 * Usage:
 *   import { showBuildingError, BuildingErrorType } from '@/lib/errorMessages';
 *   
 *   showBuildingError('NO_BUILDINGS');
 *   showBuildingError('PERMISSION_DENIED', 'Edit access required');
 */

import { toast } from 'sonner';
import { AlertCircle, Lock, WifiOff, XCircle, Info } from 'lucide-react';

// ========================================================================
// Error Type Definitions
// ========================================================================

export type BuildingErrorType =
  | 'NO_BUILDINGS'
  | 'BUILDING_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'VALIDATION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNAUTHORIZED'
  | 'SESSION_EXPIRED';

export interface ErrorMessage {
  title: string;
  message: string;
  action: string;
  icon: 'info' | 'lock' | 'wifi-off' | 'alert-circle' | 'x-circle';
  severity: 'info' | 'warning' | 'error';
}

// ========================================================================
// Error Message Catalog
// ========================================================================

export const BuildingErrorMessages: Record<BuildingErrorType, ErrorMessage> = {
  NO_BUILDINGS: {
    title: 'Δεν βρέθηκαν κτίρια',
    message: 'Δεν έχετε πρόσβαση σε κανένα κτίριο.',
    action: 'Επικοινωνήστε με τον διαχειριστή σας για να σας εκχωρήσει πρόσβαση σε κτίριο.',
    icon: 'info',
    severity: 'info',
  },
  
  BUILDING_NOT_FOUND: {
    title: 'Το κτίριο δεν βρέθηκε',
    message: 'Το κτίριο που αναζητάτε δεν υπάρχει ή έχει διαγραφεί.',
    action: 'Επιλέξτε ένα άλλο κτίριο από τη λίστα ή ανανεώστε τη σελίδα.',
    icon: 'alert-circle',
    severity: 'error',
  },
  
  PERMISSION_DENIED: {
    title: 'Δεν έχετε δικαίωμα',
    message: 'Δεν μπορείτε να εκτελέσετε αυτή την ενέργεια.',
    action: 'Ζητήστε δικαιώματα από τον διαχειριστή του κτιρίου ή επικοινωνήστε με την υποστήριξη.',
    icon: 'lock',
    severity: 'warning',
  },
  
  NETWORK_ERROR: {
    title: 'Πρόβλημα σύνδεσης',
    message: 'Δεν ήταν δυνατή η σύνδεση με τον διακομιστή.',
    action: 'Ελέγξτε τη σύνδεσή σας στο διαδίκτυο και δοκιμάστε ξανά.',
    icon: 'wifi-off',
    severity: 'error',
  },
  
  SERVER_ERROR: {
    title: 'Σφάλμα διακομιστή',
    message: 'Κάτι πήγε στραβά στον διακομιστή.',
    action: 'Δοκιμάστε ξανά σε λίγο ή επικοινωνήστε με την υποστήριξη αν το πρόβλημα επιμένει.',
    icon: 'x-circle',
    severity: 'error',
  },
  
  VALIDATION_ERROR: {
    title: 'Μη έγκυρα δεδομένα',
    message: 'Τα δεδομένα που υποβάλατε δεν είναι έγκυρα.',
    action: 'Ελέγξτε τα πεδία της φόρμας και διορθώστε τυχόν λάθη.',
    icon: 'alert-circle',
    severity: 'warning',
  },
  
  TIMEOUT_ERROR: {
    title: 'Λήξη χρονικού ορίου',
    message: 'Το αίτημα διήρκεσε πολύ και ματαιώθηκε.',
    action: 'Δοκιμάστε ξανά. Αν το πρόβλημα επιμένει, επικοινωνήστε με την υποστήριξη.',
    icon: 'alert-circle',
    severity: 'warning',
  },
  
  RATE_LIMIT_EXCEEDED: {
    title: 'Πάρα πολλά αιτήματα',
    message: 'Έχετε υπερβεί το όριο αιτημάτων.',
    action: 'Περιμένετε λίγα λεπτά και δοκιμάστε ξανά.',
    icon: 'alert-circle',
    severity: 'warning',
  },
  
  UNAUTHORIZED: {
    title: 'Μη εξουσιοδοτημένη πρόσβαση',
    message: 'Πρέπει να συνδεθείτε για να συνεχίσετε.',
    action: 'Συνδεθείτε στον λογαριασμό σας ή δημιουργήστε έναν νέο.',
    icon: 'lock',
    severity: 'warning',
  },
  
  SESSION_EXPIRED: {
    title: 'Η συνεδρία έληξε',
    message: 'Η συνεδρία σας έχει λήξει για λόγους ασφαλείας.',
    action: 'Παρακαλώ συνδεθείτε ξανά για να συνεχίσετε.',
    icon: 'lock',
    severity: 'warning',
  },
};

// ========================================================================
// Helper Functions
// ========================================================================

/**
 * Maps HTTP status codes to error types
 */
export const getErrorTypeFromStatus = (status: number): BuildingErrorType => {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'PERMISSION_DENIED';
    case 404:
      return 'BUILDING_NOT_FOUND';
    case 408:
      return 'TIMEOUT_ERROR';
    case 429:
      return 'RATE_LIMIT_EXCEEDED';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'SERVER_ERROR';
    default:
      return 'SERVER_ERROR';
  }
};

/**
 * Maps error codes (from API) to error types
 */
export const getErrorTypeFromCode = (code: string): BuildingErrorType | null => {
  const codeMap: Record<string, BuildingErrorType> = {
    'NO_BUILDING_FOUND': 'NO_BUILDINGS',
    'BUILDING_NOT_FOUND': 'BUILDING_NOT_FOUND',
    'PERMISSION_DENIED': 'PERMISSION_DENIED',
    'NO_BUILDINGS': 'NO_BUILDINGS',
    'UNAUTHORIZED': 'UNAUTHORIZED',
    'SESSION_EXPIRED': 'SESSION_EXPIRED',
    'RATE_LIMIT_EXCEEDED': 'RATE_LIMIT_EXCEEDED',
    'VALIDATION_ERROR': 'VALIDATION_ERROR',
  };
  
  return codeMap[code] || null;
};

/**
 * Extracts error information from various error formats
 */
export const parseError = (error: any): { type: BuildingErrorType; additionalInfo?: string } => {
  // Case 1: Network error
  if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
    return { type: 'NETWORK_ERROR' };
  }
  
  // Case 2: Timeout error
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return { type: 'TIMEOUT_ERROR' };
  }
  
  // Case 3: API error with code
  if (error.response?.data?.code) {
    const type = getErrorTypeFromCode(error.response.data.code);
    if (type) {
      return { 
        type, 
        additionalInfo: error.response.data.message || error.response.data.detail 
      };
    }
  }
  
  // Case 4: HTTP status error
  if (error.response?.status) {
    const type = getErrorTypeFromStatus(error.response.status);
    return { 
      type, 
      additionalInfo: error.response.data?.detail || error.response.data?.message 
    };
  }
  
  // Case 5: Generic error
  return { type: 'SERVER_ERROR', additionalInfo: error.message };
};

// ========================================================================
// Main Function: Show Error
// ========================================================================

/**
 * Shows a smart, actionable error message as a toast.
 * 
 * @param errorType - The type of error (from BuildingErrorType)
 * @param additionalInfo - Optional additional information to display
 * @param duration - Toast duration in milliseconds (default: 5000)
 * 
 * @example
 * ```tsx
 * // Basic usage
 * showBuildingError('NO_BUILDINGS');
 * 
 * // With additional info
 * showBuildingError('PERMISSION_DENIED', 'Edit access required');
 * 
 * // Custom duration
 * showBuildingError('SERVER_ERROR', undefined, 10000);
 * ```
 */
export const showBuildingError = (
  errorType: BuildingErrorType,
  additionalInfo?: string,
  duration: number = 5000
): void => {
  const error = BuildingErrorMessages[errorType];
  
  if (!error) {
    console.error(`Unknown error type: ${errorType}`);
    toast.error('Παρουσιάστηκε ένα σφάλμα');
    return;
  }
  
  // Create toast message με structured content
  toast.error(
    <div className="space-y-2">
      <div className="font-semibold">{error.title}</div>
      <div className="text-sm">{error.message}</div>
      {additionalInfo && (
        <div className="text-xs text-muted-foreground italic">
          {additionalInfo}
        </div>
      )}
      <div className="text-xs font-medium text-primary pt-1 border-t border-gray-200">
        💡 {error.action}
      </div>
    </div>,
    {
      duration,
      closeButton: true,
    }
  );
};

/**
 * Shows an error from a caught exception.
 * Automatically parses the error and shows appropriate message.
 * 
 * @param error - The caught error object
 * @param fallbackType - Fallback error type if parsing fails
 * 
 * @example
 * ```tsx
 * try {
 *   await fetchBuilding(id);
 * } catch (error) {
 *   showErrorFromException(error);
 * }
 * ```
 */
export const showErrorFromException = (
  error: any,
  fallbackType: BuildingErrorType = 'SERVER_ERROR'
): void => {
  const { type, additionalInfo } = parseError(error);
  showBuildingError(type || fallbackType, additionalInfo);
};

/**
 * Returns a user-friendly error message without showing a toast.
 * Useful for inline error display.
 * 
 * @param errorType - The type of error
 * @returns The error message object
 * 
 * @example
 * ```tsx
 * const error = getErrorMessage('NO_BUILDINGS');
 * return (
 *   <div className="text-red-600">
 *     <h3>{error.title}</h3>
 *     <p>{error.message}</p>
 *     <p className="text-sm">{error.action}</p>
 *   </div>
 * );
 * ```
 */
export const getErrorMessage = (errorType: BuildingErrorType): ErrorMessage => {
  return BuildingErrorMessages[errorType];
};

// ========================================================================
// React Component: ErrorDisplay
// ========================================================================

/**
 * React component for displaying errors inline.
 * 
 * @example
 * ```tsx
 * <ErrorDisplay 
 *   errorType="NO_BUILDINGS" 
 *   additionalInfo="Contact admin@example.com"
 * />
 * ```
 */
interface ErrorDisplayProps {
  errorType: BuildingErrorType;
  additionalInfo?: string;
  showAction?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  errorType,
  additionalInfo,
  showAction = true,
}) => {
  const error = BuildingErrorMessages[errorType];
  
  if (!error) {
    return null;
  }
  
  const IconComponent = {
    'info': Info,
    'lock': Lock,
    'wifi-off': WifiOff,
    'alert-circle': AlertCircle,
    'x-circle': XCircle,
  }[error.icon];
  
  const bgColor = {
    'info': 'bg-blue-50 border-blue-200',
    'warning': 'bg-yellow-50 border-yellow-200',
    'error': 'bg-red-50 border-red-200',
  }[error.severity];
  
  const textColor = {
    'info': 'text-blue-900',
    'warning': 'text-yellow-900',
    'error': 'text-red-900',
  }[error.severity];
  
  const iconColor = {
    'info': 'text-blue-600',
    'warning': 'text-yellow-600',
    'error': 'text-red-600',
  }[error.severity];
  
  return (
    <div className={`p-4 border rounded-lg ${bgColor}`}>
      <div className="flex items-start gap-3">
        <IconComponent className={`h-5 w-5 ${iconColor} mt-0.5`} />
        <div className="flex-1">
          <h3 className={`font-semibold ${textColor} mb-1`}>
            {error.title}
          </h3>
          <p className={`text-sm ${textColor}`}>
            {error.message}
          </p>
          {additionalInfo && (
            <p className={`text-xs ${textColor} mt-2 italic`}>
              {additionalInfo}
            </p>
          )}
          {showAction && (
            <div className={`text-xs font-medium ${textColor} mt-3 pt-3 border-t border-current opacity-50`}>
              💡 {error.action}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

