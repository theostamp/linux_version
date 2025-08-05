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

/**
 * Formats a number as currency in EUR
 * @param amount - The amount to format
 * @param locale - The locale to use (default: 'el-GR')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | string | null | undefined, locale: string = 'el-GR'): string {
  if (amount === null || amount === undefined) {
    return '€0,00';
  }
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '€0,00';
  }
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);
  } catch (error) {
    console.warn('Error formatting currency:', error);
    return `€${numAmount.toFixed(2)}`;
  }
}

/**
 * Formats a date string using date-fns
 * @param dateString - The date string to format
 * @param formatString - The format string for date-fns
 * @returns Formatted date string
 */
export function formatDate(dateString: string | null | undefined, formatString: string = 'dd/MM/yyyy'): string {
  return safeFormatDate(dateString, formatString);
}
