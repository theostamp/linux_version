// frontend/lib/apiUtils.ts
import { AxiosError } from 'axios';
import { toast } from 'react-hot-toast';

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: any;
}

export function handleApiError(error: AxiosError): ApiError {
  const status = error.response?.status || 0;
  const data = error.response?.data as any;
  
  let message = 'Συνέβη ένα σφάλμα';
  let code = 'UNKNOWN_ERROR';
  
  switch (status) {
    case 400:
      message = data?.detail || 'Λάθος αίτημα';
      code = 'BAD_REQUEST';
      break;
    case 401:
      message = 'Δεν έχετε πρόσβαση. Παρακαλώ συνδεθείτε ξανά.';
      code = 'UNAUTHORIZED';
      break;
    case 403:
      message = 'Δεν έχετε δικαίωμα πρόσβασης σε αυτόν τον πόρο.';
      code = 'FORBIDDEN';
      break;
    case 404:
      message = 'Ο πόρος που ζητήσατε δεν βρέθηκε.';
      code = 'NOT_FOUND';
      break;
    case 409:
      message = data?.detail || 'Υπάρχει ήδη ένας πόρος με αυτά τα δεδομένα.';
      code = 'CONFLICT';
      break;
    case 422:
      message = data?.detail || 'Τα δεδομένα που στείλατε δεν είναι έγκυρα.';
      code = 'VALIDATION_ERROR';
      break;
    case 429:
      message = 'Πάρα πολλά αιτήματα. Παρακαλώ περιμένετε λίγο.';
      code = 'RATE_LIMITED';
      break;
    case 500:
      message = 'Σφάλμα διακομιστή. Παρακαλώ δοκιμάστε ξανά αργότερα.';
      code = 'SERVER_ERROR';
      break;
    case 502:
    case 503:
    case 504:
      message = 'Η υπηρεσία δεν είναι διαθέσιμη αυτή τη στιγμή.';
      code = 'SERVICE_UNAVAILABLE';
      break;
    default:
      if (error.code === 'NETWORK_ERROR') {
        message = 'Δεν μπορείτε να συνδεθείτε στο διαδίκτυο.';
        code = 'NETWORK_ERROR';
      } else if (error.code === 'TIMEOUT') {
        message = 'Η αίτηση έληξε. Παρακαλώ δοκιμάστε ξανά.';
        code = 'TIMEOUT';
      }
  }
  
  return {
    status,
    message,
    code,
    details: data
  };
}

export function showApiErrorToast(error: AxiosError, customMessage?: string) {
  const apiError = handleApiError(error);
  const message = customMessage || apiError.message;
  
  // Don't show toast for 404 errors as they're handled specifically
  if (apiError.status !== 404) {
    toast.error(message);
  }
  
  return apiError;
}

export function isNetworkError(error: AxiosError): boolean {
  return !error.response && error.request;
}

export function isServerError(error: AxiosError): boolean {
  return error.response?.status ? error.response.status >= 500 : false;
}

export function isClientError(error: AxiosError): boolean {
  return error.response?.status ? error.response.status >= 400 && error.response.status < 500 : false;
}

export function shouldRetry(error: AxiosError): boolean {
  // Retry on network errors and 5xx server errors
  return isNetworkError(error) || isServerError(error);
}

export function getRetryDelay(attempt: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s
  return Math.min(1000 * Math.pow(2, attempt), 16000);
}

// Utility για validation errors
export function extractValidationErrors(error: AxiosError): Record<string, string[]> {
  const data = error.response?.data as any;
  
  if (data?.errors && typeof data.errors === 'object') {
    return data.errors;
  }
  
  if (data?.detail && Array.isArray(data.detail)) {
    // Django REST framework validation errors
    const errors: Record<string, string[]> = {};
    data.detail.forEach((item: any) => {
      if (item.loc && item.msg) {
        const field = item.loc[item.loc.length - 1];
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(item.msg);
      }
    });
    return errors;
  }
  
  return {};
} 