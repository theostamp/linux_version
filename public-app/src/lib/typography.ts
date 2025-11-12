/**
 * 📝 Typography System - New Concierge Design System
 *
 * Standardized typography classes for consistent text styling across the application.
 * This ensures uniform heading sizes, body text, and component-specific typography.
 *
 * Usage:
 * import { typography } from '@/lib/typography';
 * <h1 className={typography.pageTitle}>My Page Title</h1>
 */

// 🎯 Core Typography Scale
export const typography = {
  // Headings - Main content hierarchy
  pageTitle: 'text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50',
  sectionHeader: 'text-2xl font-semibold tracking-tight text-gray-800 dark:text-gray-100',
  subsectionHeader: 'text-xl font-semibold text-gray-800 dark:text-gray-100',
  cardTitle: 'text-lg font-semibold text-gray-900 dark:text-gray-50',
  modalTitle: 'text-lg font-semibold text-gray-900 dark:text-gray-50',
  smallHeader: 'text-base font-medium text-gray-700 dark:text-gray-200',

  // Body Text
  bodyLarge: 'text-lg text-gray-600 dark:text-gray-300 leading-relaxed',
  body: 'text-base text-gray-600 dark:text-gray-300 leading-relaxed',
  bodySmall: 'text-sm text-gray-500 dark:text-gray-400',
  caption: 'text-sm text-gray-500 dark:text-gray-400',
  small: 'text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide',

  // Interactive Elements
  buttonText: 'text-sm font-medium',
  linkText: 'text-sm text-primary hover:text-primary-hover underline-offset-4 hover:underline',

  // Navigation
  navItem: 'text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100',
  navItemActive: 'text-sm font-medium text-primary dark:text-primary-light',
  sidebarHeader: 'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider',

  // Forms
  formLabel: 'text-sm font-medium text-gray-700 dark:text-gray-200',
  formHelp: 'text-xs text-gray-500 dark:text-gray-400',
  formError: 'text-xs text-red-600 dark:text-red-400',

  // Tables
  tableHeader: 'text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
  tableCell: 'text-sm text-gray-900 dark:text-gray-100',
  tableCellSecondary: 'text-sm text-gray-500 dark:text-gray-400',

  // Status & Badges
  badge: 'text-xs font-medium px-2 py-1 rounded-full',
  badgeSuccess: 'text-xs font-medium px-2 py-1 rounded-full bg-success/10 text-success dark:bg-success/20',
  badgeInfo: 'text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  badgeWarning: 'text-xs font-medium px-2 py-1 rounded-full bg-warning/10 text-warning dark:bg-warning/20',
  badgeError: 'text-xs font-medium px-2 py-1 rounded-full bg-destructive/10 text-destructive dark:bg-destructive/20',

  // Modal
  modalDescription: 'text-sm text-gray-600 dark:text-gray-400',
};

