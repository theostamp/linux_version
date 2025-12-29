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
  // Headings - Main content hierarchy (Play)
  pageTitle: 'text-3xl font-semibold tracking-tight text-left text-emerald-600 dark:text-emerald-500',
  sectionHeader: 'text-2xl font-semibold tracking-tight text-foreground font-[var(--font-play)]',
  subsectionHeader: 'text-xl font-semibold text-foreground font-[var(--font-play)]',
  cardTitle: 'text-lg font-semibold text-foreground font-[var(--font-play)]',
  modalTitle: 'text-lg font-semibold text-foreground font-[var(--font-play)]',
  smallHeader: 'text-base font-medium text-foreground font-[var(--font-play)]',

  // Body Text
  bodyLarge: 'text-lg text-muted-foreground leading-relaxed',
  body: 'text-base text-muted-foreground leading-relaxed',
  bodySmall: 'text-sm text-muted-foreground',
  caption: 'text-sm text-muted-foreground',
  small: 'text-xs text-muted-foreground uppercase tracking-wide',

  // Interactive Elements
  buttonText: 'text-sm font-medium',
  linkText: 'text-sm text-primary hover:text-primary/80 underline-offset-4 hover:underline',

  // Navigation
  navItem: 'text-sm font-medium text-muted-foreground hover:text-foreground',
  navItemActive: 'text-sm font-medium text-primary',
  sidebarHeader: 'text-xs font-semibold text-muted-foreground uppercase tracking-wider',

  // Forms
  formLabel: 'text-sm font-medium text-foreground',
  formHelp: 'text-xs text-muted-foreground',
  formError: 'text-xs text-destructive',

  // Tables
  tableHeader: 'text-xs font-medium text-muted-foreground uppercase tracking-wider',
  tableCell: 'text-sm text-foreground',
  tableCellSecondary: 'text-sm text-muted-foreground',

  // Status & Badges
  badge: 'text-xs font-medium px-2 py-1 rounded-none',
  badgeSuccess: 'text-xs font-medium px-2 py-1 rounded-none bg-success/10 text-success',
  badgeInfo: 'text-xs font-medium px-2 py-1 rounded-none bg-primary/10 text-primary',
  badgeWarning: 'text-xs font-medium px-2 py-1 rounded-none bg-warning/10 text-warning',
  badgeError: 'text-xs font-medium px-2 py-1 rounded-none bg-destructive/10 text-destructive',

  // Modal
  modalDescription: 'text-sm text-muted-foreground',
};
