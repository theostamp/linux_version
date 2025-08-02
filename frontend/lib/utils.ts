import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Validates if a date string can be converted to a valid Date object
 * @param dateString - The date string to validate
 * @returns true if the date string is valid, false otherwise
 */
export function isValidDate(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Safely formats a date string using date-fns format function
 * @param dateString - The date string to format
 * @param formatString - The format string for date-fns
 * @param options - Additional options for date-fns format
 * @returns Formatted date string or 'N/A' if invalid
 */
export function safeFormatDate(
  dateString: string | null | undefined,
  formatString: string,
  options?: any
): string {
  if (!isValidDate(dateString)) {
    return 'N/A';
  }
  
  try {
    const { format } = require('date-fns');
    return format(new Date(dateString!), formatString, options);
  } catch (error) {
    console.warn('Error formatting date:', error);
    return 'N/A';
  }
}
