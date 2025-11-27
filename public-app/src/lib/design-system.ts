/**
 * NewConcierge Design System
 * 
 * Unified design tokens for consistent UI/UX across the application
 * UPDATED: Refactored to match Slate 900 / Indigo Theme
 */

// ============================================================================
// COLORS
// ============================================================================

export const colors = {
  // Primary Brand Colors - INDIGO (was Blue)
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',  // Main Indigo
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  
  // Semantic Colors - Success - TEAL (was Green)
  success: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',  // Main Teal
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
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
  
  // Neutral/Gray Scale - SLATE (Cool Gray)
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a', // The requested Slate 900
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
// EXPORT ALL
// ============================================================================

export const designSystem = {
  colors,
  typography,
  spacing,
  shadows,
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
} as const;

export default designSystem;
