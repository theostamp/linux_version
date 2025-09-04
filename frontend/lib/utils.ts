import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns'

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
    return format(new Date(dateString!), formatString, options);
  } catch (error) {
    console.warn('Error formatting date:', error);
    return 'N/A';
  }
}

/**
 * Formats a number to 2 decimal places without currency symbol
 * @param amount - The amount to format
 * @returns Formatted number string with 2 decimal places
 */
export function formatAmount(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '0,00';
  }
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '0,00';
  }
  
  return numAmount.toFixed(2).replace('.', ',');
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

/**
 * Parses an amount that may be a number or a localized currency string (e.g. "1.225,50", "1225.50", "€1.225,50")
 * into a JavaScript number.
 * - Handles Greek/Euro formats with comma decimal separators and optional thousand separators
 * - Removes currency symbols and spaces
 * - Falls back to 0 for invalid inputs
 */
export function parseAmount(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }

  let str = String(value).trim();
  if (!str) return 0;

  // Remove currency symbols and non-numeric separators except comma/dot and minus
  str = str.replace(/[€\s]/g, '');

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  if (hasComma && hasDot) {
    // Decide decimal separator as the last occurring symbol among comma or dot
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Comma is decimal -> remove dots (thousands), replace comma with dot
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Dot is decimal -> remove commas (thousands)
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Only comma present -> treat as decimal separator
    str = str.replace(/\./g, ''); // just in case
    str = str.replace(',', '.');
  } else {
    // Only dot or none -> remove stray commas
    str = str.replace(/,/g, '');
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}
