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
  badgeWarning: 'text-xs font-medium px-2 py-1 rounded-full bg-warning/10 text-warning dark:bg-warning/20',
  badgeDanger: 'text-xs font-medium px-2 py-1 rounded-full bg-destructive/10 text-destructive dark:bg-destructive/20',
  badgeInfo: 'text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary dark:bg-primary/20',

  // Special Cases
  loading: 'text-sm text-gray-500 dark:text-gray-400 animate-pulse',
  emptyState: 'text-lg text-gray-400 dark:text-gray-500 text-center',
  errorState: 'text-lg text-red-600 dark:text-red-400 text-center',
} as const;

// 📱 Responsive Typography Utilities
export const responsiveTypography = {
  // Responsive page titles
  pageTitle: 'text-2xl lg:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50',
  sectionHeader: 'text-xl lg:text-2xl font-semibold tracking-tight text-gray-800 dark:text-gray-100',

  // Mobile-friendly body text
  body: 'text-sm lg:text-base text-gray-600 dark:text-gray-300 leading-relaxed',
  cardTitle: 'text-base lg:text-lg font-semibold text-gray-900 dark:text-gray-50',
} as const;

// 🎨 Typography with Color Emphasis
export const coloredTypography = {
  // Primary colored text
  primaryText: 'text-primary dark:text-primary-light font-medium',
  primaryHeading: 'text-primary dark:text-primary-light font-bold tracking-tight',

  // Secondary colored text
  secondaryText: 'text-secondary dark:text-secondary-light font-medium',

  // Accent text for highlights
  accentText: 'text-accent dark:text-accent font-medium',

  // Gradient text for special occasions
  gradientHeading: 'bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-bold tracking-tight',
} as const;

// 📏 Line Height Utilities
export const lineHeight = {
  tight: 'leading-tight',      // 1.25
  snug: 'leading-snug',        // 1.375
  normal: 'leading-normal',    // 1.5
  relaxed: 'leading-relaxed',  // 1.625
  loose: 'leading-loose',      // 2
} as const;

// 📝 Text Alignment Utilities
export const textAlign = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
} as const;

// 🔤 Font Weight Utilities
export const fontWeight = {
  light: 'font-light',      // 300
  normal: 'font-normal',    // 400
  medium: 'font-medium',    // 500
  semibold: 'font-semibold', // 600
  bold: 'font-bold',        // 700
} as const;

// 📐 Tracking (Letter Spacing) Utilities
export const tracking = {
  tight: 'tracking-tight',   // -0.025em
  normal: 'tracking-normal', // 0em
  wide: 'tracking-wide',     // 0.025em
  wider: 'tracking-wider',   // 0.05em
  widest: 'tracking-widest', // 0.1em
} as const;

// 🎯 Component-Specific Typography Presets
export const componentTypography = {
  // Dashboard Cards
  dashboardCardTitle: 'text-2xl font-bold text-gray-900 dark:text-gray-50',
  dashboardCardValue: 'text-3xl font-bold text-primary dark:text-primary-light',
  dashboardCardLabel: 'text-sm font-medium text-gray-500 dark:text-gray-400',

  // Data Tables
  tableTitle: 'text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4',
  tableDescription: 'text-sm text-gray-500 dark:text-gray-400 mb-6',

  // Modal Dialogs
  modalHeader: 'text-xl font-semibold text-gray-900 dark:text-gray-50',
  modalDescription: 'text-sm text-gray-500 dark:text-gray-400 mt-2',

  // Form Sections
  formSectionTitle: 'text-lg font-medium text-gray-900 dark:text-gray-50 mb-4',
  formSectionDescription: 'text-sm text-gray-500 dark:text-gray-400 mb-6',

  // Page Headers
  pageHeaderTitle: 'text-3xl font-bold text-gray-900 dark:text-gray-50',
  pageHeaderDescription: 'text-lg text-gray-600 dark:text-gray-300 mt-2',

  // Announcement Components
  announcementTitle: 'text-lg font-semibold text-gray-900 dark:text-gray-50',
  announcementPreview: 'text-sm text-gray-600 dark:text-gray-300 line-clamp-2',
  announcementMeta: 'text-xs text-gray-500 dark:text-gray-400',
} as const;

// 🔧 Helper Functions
export const combineTypography = (...classes: string[]) => {
  return classes.filter(Boolean).join(' ');
};

export const getResponsiveTypography = (base: string, lg?: string) => {
  if (!lg) return base;
  return `${base} lg:${lg}`;
};

// 📋 Usage Examples (for documentation)
export const typographyExamples = {
  pageTitle: `<h1 className="${typography.pageTitle}">Dashboard</h1>`,
  sectionHeader: `<h2 className="${typography.sectionHeader}">Οικονομικά</h2>`,
  cardTitle: `<h3 className="${typography.cardTitle}">Κοινόχρηστα</h3>`,
  body: `<p className="${typography.body}">Περιγραφή κειμένου</p>`,
  badge: `<span className="${typography.badgeSuccess}">Ενεργό</span>`,
  button: `<button className="${typography.buttonText}">Αποθήκευση</button>`,
} as const;