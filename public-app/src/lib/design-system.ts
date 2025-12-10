/**
 * NewConcierge Design System
 * 
 * Unified design tokens for consistent UI/UX across the application
 * UPDATED: Refactored to match Slate 900 / Indigo Theme
 */

// ============================================================================
// COLORS (Landing-aligned · Teal/Navy)
// ============================================================================

export const colors = {
  // Primary Brand Colors - TEAL (#00BC7D)
  primary: {
    50: '#e6fff5',
    100: '#c0ffe6',
    200: '#8effd4',
    300: '#52f5be',
    400: '#1fdea4',
    500: '#00bc7d',  // Main Brand Teal
    600: '#009a6b',
    700: '#007f55',
    800: '#005f40',
    900: '#014b32',
  },
  
  // Semantic Colors - Success (alias to brand hue)
  success: {
    50: '#e6fff5',
    100: '#c0ffe6',
    200: '#8effd4',
    300: '#52f5be',
    400: '#1fdea4',
    500: '#00bc7d',
    600: '#009a6b',
    700: '#007f55',
    800: '#005f40',
    900: '#014b32',
  },
  
  // Semantic Colors - Warning - AMBER (unchanged)
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  
  // Semantic Colors - Danger/Error - ROSE (unchanged)
  danger: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337',
  },
  
  // Semantic Colors - Info - SKY (unchanged but mapped to match Slate)
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  
  // Special - Violet (for accents)
  purple: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },
  
  // Special - Orange (unchanged)
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
  },
  
  // Neutral/Gray Scale - Navy/Slate inspired
  gray: {
    50: '#f5f6f9',   // landing bg
    100: '#e8ebf2',
    200: '#d6dce8',
    300: '#c1c9da',
    400: '#9aa5bf',
    500: '#7884a0',
    600: '#596481',
    700: '#3e4a68',
    800: '#1d293d',   // landing navy
    900: '#0b1225',   // deep navy
  },
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  fontFamily: {
    sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
    mono: ['var(--font-fira-code)', 'monospace'],
  },
  
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
    '6xl': '3.75rem',   // 60px
  },
  
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  32: '8rem',     // 128px
} as const;

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(15 23 42 / 0.05)',
  base: '0 1px 3px 0 rgb(15 23 42 / 0.1), 0 1px 2px 0 rgb(15 23 42 / 0.06)',
  md: '0 4px 6px -1px rgb(15 23 42 / 0.1), 0 2px 4px -1px rgb(15 23 42 / 0.06)',
  lg: '0 10px 15px -3px rgb(15 23 42 / 0.1), 0 4px 6px -2px rgb(15 23 42 / 0.05)',
  xl: '0 20px 25px -5px rgb(15 23 42 / 0.1), 0 10px 10px -5px rgb(15 23 42 / 0.04)',
  '2xl': '0 25px 50px -12px rgb(15 23 42 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(15 23 42 / 0.06)',
} as const;

// ============================================================================
// BORDERS
// ============================================================================

export const borders = {
  // Border colors - Gray scale
  color: {
    default: '#cbd5e1',      // gray-300 - Standard border
    light: '#e2e8f0',        // gray-200 - Light border
    medium: '#94a3b8',       // gray-400 - Medium border
    dark: '#64748b',         // gray-500 - Dark border
    muted: 'rgba(203, 213, 225, 0.5)', // gray-300 with opacity
  },
  // Border widths
  width: {
    none: '0',
    thin: '1px',
    base: '1px',
    medium: '2px',
    thick: '3px',
  },
  // Border styles
  style: {
    solid: 'solid',
    dashed: 'dashed',
    dotted: 'dotted',
  },
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.125rem',    // 2px
  base: '0.25rem',   // 4px
  md: '0.375rem',    // 6px
  lg: '0.5rem',      // 8px
  xl: '0.75rem',     // 12px
  '2xl': '1rem',     // 16px
  '3xl': '1.5rem',   // 24px
  full: '9999px',
} as const;

// ============================================================================
// TRANSITIONS
// ============================================================================

export const transitions = {
  fast: '150ms ease-in-out',
  base: '200ms ease-in-out',
  slow: '300ms ease-in-out',
  slower: '500ms ease-in-out',
} as const;

// ============================================================================
// Z-INDEX LAYERS
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
} as const;

// ============================================================================
// DASHBOARD-SPECIFIC TOKENS
// ============================================================================

export const dashboard = {
  // Card variants
  card: {
    default: {
      bg: colors.gray[50],
      border: colors.gray[200],
      shadow: shadows.sm,
      hover: {
        shadow: shadows.md,
        scale: 1.02,
      },
    },
    elevated: {
      bg: 'white',
      border: 'transparent',
      shadow: shadows.base,
      hover: {
        shadow: shadows.lg,
        scale: 1.01,
      },
    },
  },
  
  // Metric cards color schemes
  metrics: {
    buildings: {
      bg: colors.primary[50],
      icon: colors.primary[600],
      text: colors.primary[900],
      border: colors.primary[200],
    },
    apartments: {
      bg: colors.success[50],
      icon: colors.success[600],
      text: colors.success[900],
      border: colors.success[200],
    },
    financial: {
      bg: colors.purple[50],
      icon: colors.purple[600],
      text: colors.purple[900],
      border: colors.purple[200],
    },
    alerts: {
      bg: colors.danger[50],
      icon: colors.danger[600],
      text: colors.danger[900],
      border: colors.danger[200],
    },
    pending: {
      bg: colors.orange[50],
      icon: colors.orange[600],
      text: colors.orange[900],
      border: colors.orange[200],
    },
  },
  
  // Status colors
  status: {
    active: colors.success[500],
    pending: colors.warning[500],
    overdue: colors.danger[500],
    inactive: colors.gray[400],
  },
  
  // Health score colors
  health: {
    excellent: colors.success[500],  // 80-100
    good: colors.info[500],          // 60-79
    fair: colors.warning[500],       // 40-59
    poor: colors.orange[500],        // 20-39
    critical: colors.danger[500],    // 0-19
  },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get health color based on score (0-100)
 */
export function getHealthColor(score: number): string {
  if (score >= 80) return dashboard.health.excellent;
  if (score >= 60) return dashboard.health.good;
  if (score >= 40) return dashboard.health.fair;
  if (score >= 20) return dashboard.health.poor;
  return dashboard.health.critical;
}

/**
 * Get status color
 */
export function getStatusColor(status: 'active' | 'pending' | 'overdue' | 'inactive'): string {
  return dashboard.status[status];
}

/**
 * Format currency value
 */
export function formatCurrency(value: number, locale: string = 'el-GR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Get trend icon based on value change
 */
export function getTrendDirection(current: number, previous: number): 'up' | 'down' | 'neutral' {
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'neutral';
}

// ============================================================================
// SEMANTIC COLOR HELPERS
// ============================================================================

/**
 * Get semantic background color classes
 */
export function getSemanticBgClasses(variant: 'success' | 'warning' | 'danger' | 'info' | 'primary'): {
  bg: string;
  text: string;
  border: string;
} {
  const variants = {
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-500/20',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-500/20',
    },
    danger: {
      bg: 'bg-rose-50 dark:bg-rose-500/10',
      text: 'text-rose-700 dark:text-rose-400',
      border: 'border-rose-200 dark:border-rose-500/20',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-500/20',
    },
    primary: {
      bg: 'bg-indigo-50 dark:bg-indigo-500/10',
      text: 'text-indigo-700 dark:text-indigo-400',
      border: 'border-indigo-200 dark:border-indigo-500/20',
    },
  };
  return variants[variant];
}

/**
 * Get status badge classes (for request status, vote status, etc.)
 */
export function getStatusBadgeClasses(status: string): string {
  const statusMap: Record<string, string> = {
    // Request statuses
    pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    scheduled: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
    completed: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
    cancelled: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20',
    rejected: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
    // Vote statuses
    active: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
    closed: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20',
    // Default
    default: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
  };
  
  return statusMap[status] || statusMap.default;
}

/**
 * Get standard border class (replaces border-border, border-gray-300, etc.)
 */
export function getBorderClass(variant: 'default' | 'light' | 'medium' | 'dashed' = 'default'): string {
  const variants = {
    default: 'border-gray-300',
    light: 'border-gray-200',
    medium: 'border-gray-400',
    dashed: 'border-dashed border-gray-300',
  };
  return variants[variant];
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export const designSystem = {
  colors,
  typography,
  spacing,
  shadows,
  borders,
  borderRadius,
  transitions,
  zIndex,
  dashboard,
  // Helper functions
  getHealthColor,
  getStatusColor,
  formatCurrency,
  formatPercentage,
  getTrendDirection,
  getSemanticBgClasses,
  getStatusBadgeClasses,
  getBorderClass,
} as const;

export default designSystem;
