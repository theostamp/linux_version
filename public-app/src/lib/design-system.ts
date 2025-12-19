/**
 * NewConcierge Design System
 * 
 * Unified design tokens for consistent UI/UX across the application
 * UPDATED: Kaspersky-inspired soft pastel theme with teal accents
 */

// ============================================================================
// COLORS - Kaspersky-Inspired Soft Palette
// ============================================================================

export const colors = {
  // Primary Brand Colors - TEAL (Kaspersky mint/teal)
  primary: {
    50: '#e0f2f1',
    100: '#b2dfdb',
    200: '#80cbc4',
    300: '#4db6ac',
    400: '#26a69a',   // Main accent
    500: '#009688',   // Primary teal
    600: '#00897b',
    700: '#00796b',
    800: '#00695c',
    900: '#004d40',
  },
  
  // Semantic Colors - Success (Green)
  success: {
    50: '#e8f5e9',
    100: '#c8e6c9',
    200: '#a5d6a7',
    300: '#81c784',
    400: '#66bb6a',
    500: '#4caf50',   // Main success green
    600: '#43a047',
    700: '#388e3c',
    800: '#2e7d32',
    900: '#1b5e20',
  },
  
  // Semantic Colors - Warning (Orange/Amber)
  warning: {
    50: '#fff8e1',
    100: '#ffecb3',
    200: '#ffe082',
    300: '#ffd54f',
    400: '#ffca28',
    500: '#f5a623',   // Main warning orange (Kaspersky)
    600: '#ffb300',
    700: '#ffa000',
    800: '#ff8f00',
    900: '#ff6f00',
  },
  
  // Semantic Colors - Danger/Error (Rose/Red)
  danger: {
    50: '#ffebee',
    100: '#ffcdd2',
    200: '#ef9a9a',
    300: '#e57373',
    400: '#ef5350',
    500: '#f44336',   // Main danger red
    600: '#e53935',
    700: '#d32f2f',
    800: '#c62828',
    900: '#b71c1c',
  },
  
  // Semantic Colors - Info (Blue/Sky)
  info: {
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#2196f3',   // Main info blue
    600: '#1e88e5',
    700: '#1976d2',
    800: '#1565c0',
    900: '#0d47a1',
  },
  
  // Special - Purple (Lavender tones)
  purple: {
    50: '#f3e5f5',
    100: '#e1bee7',
    200: '#ce93d8',
    300: '#ba68c8',
    400: '#ab47bc',
    500: '#9c27b0',
    600: '#8e24aa',
    700: '#7b1fa2',
    800: '#6a1b9a',
    900: '#4a148c',
  },
  
  // Special - Orange (Coral tones)
  orange: {
    50: '#fbe9e7',
    100: '#ffccbc',
    200: '#ffab91',
    300: '#ff8a65',
    400: '#ff7043',
    500: '#ff5722',
    600: '#f4511e',
    700: '#e64a19',
    800: '#d84315',
    900: '#bf360c',
  },

  // Special - Cyan (Security card color)
  cyan: {
    50: '#e3f2fd',
    100: '#b3e5fc',
    200: '#81d4fa',
    300: '#4fc3f7',
    400: '#29b6f6',
    500: '#03a9f4',
    600: '#039be5',
    700: '#0288d1',
    800: '#0277bd',
    900: '#01579b',
  },
  
  // Neutral/Gray Scale - Soft grays (NO dark grays for borders)
  gray: {
    50: '#f5f7fa',    // Background
    100: '#eef1f5',   // Light background
    200: '#e0e4e8',   // Border color (soft)
    300: '#d1d5db',   // Border color
    400: '#9ca3af',   // Muted text
    500: '#6b7280',   // Secondary text
    600: '#4b5563',   // Primary text (dark)
    700: '#374151',   // Headings
    800: '#1f2937',   // Dark text
    900: '#111827',   // Darkest text
  },

  // Category Colors - Kaspersky-style card backgrounds
  category: {
    security: {
      bg: '#e3f2fd',      // Soft cyan
      border: '#90caf9',
      text: '#1565c0',
      icon: '#1976d2',
    },
    performance: {
      bg: '#f3e5f5',      // Soft lavender
      border: '#ce93d8',
      text: '#7b1fa2',
      icon: '#8e24aa',
    },
    privacy: {
      bg: '#fbe9e7',      // Soft coral
      border: '#ffab91',
      text: '#d84315',
      icon: '#e64a19',
    },
    warning: {
      bg: '#fff8e1',      // Soft amber
      border: '#ffe082',
      text: '#f57c00',
      icon: '#ff8f00',
    },
    info: {
      bg: '#e0f7fa',      // Soft cyan-teal
      border: '#80deea',
      text: '#00838f',
      icon: '#0097a7',
    },
    success: {
      bg: '#e8f5e9',      // Soft green
      border: '#a5d6a7',
      text: '#2e7d32',
      icon: '#388e3c',
    },
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
// SHADOWS - Soft, subtle (Kaspersky-style)
// ============================================================================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
  base: '0 2px 8px 0 rgb(0 0 0 / 0.04)',
  md: '0 4px 12px 0 rgb(0 0 0 / 0.06)',
  lg: '0 8px 24px 0 rgb(0 0 0 / 0.08)',
  xl: '0 16px 32px 0 rgb(0 0 0 / 0.10)',
  '2xl': '0 24px 48px 0 rgb(0 0 0 / 0.12)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.04)',
  card: '0 2px 8px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.02)',
  cardHover: '0 4px 16px rgba(0, 0, 0, 0.08)',
} as const;

// ============================================================================
// BORDERS - Soft only, no dark borders
// ============================================================================

export const borders = {
  color: {
    default: '#e0e4e8',      // Soft gray - primary border color
    light: '#eef1f5',        // Very light border
    medium: '#d1d5db',       // Medium border
    // NO dark borders - removed intentionally
    muted: 'rgba(224, 228, 232, 0.5)', // Transparent soft
    accent: '#80cbc4',       // Teal accent border
  },
  width: {
    none: '0',
    thin: '1px',
    base: '1px',
    medium: '2px',
    thick: '3px',
  },
  style: {
    solid: 'solid',
    dashed: 'dashed',
    dotted: 'dotted',
  },
} as const;

// ============================================================================
// BORDER RADIUS - Larger for Kaspersky-style rounded look
// ============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.375rem',    // 6px
  base: '0.5rem',    // 8px
  md: '0.75rem',     // 12px
  lg: '1rem',        // 16px
  xl: '1.25rem',     // 20px
  '2xl': '1.5rem',   // 24px
  '3xl': '2rem',     // 32px
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
// SIDEBAR - Kaspersky-style mint sidebar
// ============================================================================

export const sidebar = {
  bg: '#e8f5f3',           // Soft mint background
  bgDark: '#1e293b',       // Dark mode sidebar
  border: '#d1e7e4',       // Subtle mint border
  borderDark: '#334155',   // Dark mode border
  text: '#374151',
  textDark: '#e2e8f0',
  activeItem: {
    bg: '#d1fae5',
    text: '#065f46',
  },
  hoverItem: {
    bg: '#f0fdf4',
    text: '#166534',
  },
} as const;

// ============================================================================
// DASHBOARD-SPECIFIC TOKENS
// ============================================================================

export const dashboard = {
  // Card variants
  card: {
    default: {
      bg: '#ffffff',
      border: borders.color.default,
      shadow: shadows.card,
      hover: {
        shadow: shadows.cardHover,
        scale: 1.01,
      },
    },
    elevated: {
      bg: '#ffffff',
      border: 'transparent',
      shadow: shadows.md,
      hover: {
        shadow: shadows.lg,
        scale: 1.01,
      },
    },
  },
  
  // Metric cards color schemes (Kaspersky-style categories)
  metrics: {
    buildings: {
      bg: colors.category.security.bg,
      icon: colors.category.security.icon,
      text: colors.category.security.text,
      border: colors.category.security.border,
    },
    apartments: {
      bg: colors.category.success.bg,
      icon: colors.category.success.icon,
      text: colors.category.success.text,
      border: colors.category.success.border,
    },
    financial: {
      bg: colors.category.performance.bg,
      icon: colors.category.performance.icon,
      text: colors.category.performance.text,
      border: colors.category.performance.border,
    },
    alerts: {
      bg: colors.category.privacy.bg,
      icon: colors.category.privacy.icon,
      text: colors.category.privacy.text,
      border: colors.category.privacy.border,
    },
    pending: {
      bg: colors.category.warning.bg,
      icon: colors.category.warning.icon,
      text: colors.category.warning.text,
      border: colors.category.warning.border,
    },
    info: {
      bg: colors.category.info.bg,
      icon: colors.category.info.icon,
      text: colors.category.info.text,
      border: colors.category.info.border,
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
    excellent: colors.success[500],
    good: colors.info[500],
    fair: colors.warning[500],
    poor: colors.orange[500],
    critical: colors.danger[500],
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
// SEMANTIC COLOR HELPERS - Updated for Kaspersky theme
// ============================================================================

/**
 * Get semantic background color classes (teal-based primary)
 */
export function getSemanticBgClasses(variant: 'success' | 'warning' | 'danger' | 'info' | 'primary'): {
  bg: string;
  text: string;
  border: string;
} {
  const variants = {
    success: {
      bg: 'bg-green-50 dark:bg-green-500/10',
      text: 'text-green-700 dark:text-green-400',
      border: 'border-green-200 dark:border-green-500/20',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-500/20',
    },
    danger: {
      bg: 'bg-red-50 dark:bg-red-500/10',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-200 dark:border-red-500/20',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-500/20',
    },
    primary: {
      bg: 'bg-teal-50 dark:bg-teal-500/10',
      text: 'text-teal-700 dark:text-teal-400',
      border: 'border-teal-200 dark:border-teal-500/20',
    },
  };
  return variants[variant];
}

/**
 * Get category card classes (Kaspersky-style colored cards)
 */
export type CategoryType = 'security' | 'performance' | 'privacy' | 'warning' | 'info' | 'success';

export function getCategoryCardClasses(category: CategoryType): {
  bg: string;
  border: string;
  text: string;
  icon: string;
} {
  const categoryMap: Record<CategoryType, { bg: string; border: string; text: string; icon: string }> = {
    security: {
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      border: 'border-blue-200 dark:border-blue-500/20',
      text: 'text-blue-700 dark:text-blue-400',
      icon: 'text-blue-600 dark:text-blue-400',
    },
    performance: {
      bg: 'bg-purple-50 dark:bg-purple-500/10',
      border: 'border-purple-200 dark:border-purple-500/20',
      text: 'text-purple-700 dark:text-purple-400',
      icon: 'text-purple-600 dark:text-purple-400',
    },
    privacy: {
      bg: 'bg-orange-50 dark:bg-orange-500/10',
      border: 'border-orange-200 dark:border-orange-500/20',
      text: 'text-orange-700 dark:text-orange-400',
      icon: 'text-orange-600 dark:text-orange-400',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      border: 'border-amber-200 dark:border-amber-500/20',
      text: 'text-amber-700 dark:text-amber-400',
      icon: 'text-amber-600 dark:text-amber-400',
    },
    info: {
      bg: 'bg-cyan-50 dark:bg-cyan-500/10',
      border: 'border-cyan-200 dark:border-cyan-500/20',
      text: 'text-cyan-700 dark:text-cyan-400',
      icon: 'text-cyan-600 dark:text-cyan-400',
    },
    success: {
      bg: 'bg-green-50 dark:bg-green-500/10',
      border: 'border-green-200 dark:border-green-500/20',
      text: 'text-green-700 dark:text-green-400',
      icon: 'text-green-600 dark:text-green-400',
    },
  };
  
  return categoryMap[category];
}

/**
 * Get status badge classes (for request status, vote status, etc.)
 */
export function getStatusBadgeClasses(status: string): string {
  const statusMap: Record<string, string> = {
    // Request statuses
    pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    approved: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
    scheduled: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20',
    completed: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
    cancelled: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20',
    rejected: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
    // Vote statuses
    active: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
    closed: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20',
    // Default
    default: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20',
  };
  
  return statusMap[status] || statusMap.default;
}

/**
 * Get soft border class (no dark borders)
 */
export function getBorderClass(variant: 'default' | 'light' | 'medium' | 'dashed' | 'accent' = 'default'): string {
  const variants = {
    default: 'border-gray-200',     // Soft gray
    light: 'border-gray-100',       // Very light
    medium: 'border-gray-300',      // Medium gray
    dashed: 'border-dashed border-gray-200',
    accent: 'border-teal-200',      // Teal accent
  };
  return variants[variant];
}

/**
 * Get soft container classes (shadow instead of hard border)
 */
export function getSoftContainerClass(): string {
  return 'bg-white dark:bg-gray-800 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.25)]';
}

/**
 * Get sidebar classes (Kaspersky mint style)
 */
export function getSidebarClasses(): {
  container: string;
  item: string;
  activeItem: string;
} {
  return {
    container: 'bg-[#e8f5f3] dark:bg-slate-900',
    item: 'text-gray-700 dark:text-gray-300 hover:bg-[#d1fae5] dark:hover:bg-slate-800',
    activeItem: 'bg-[#d1fae5] dark:bg-teal-900/30 text-teal-800 dark:text-teal-400',
  };
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
  sidebar,
  dashboard,
  // Helper functions
  getHealthColor,
  getStatusColor,
  formatCurrency,
  formatPercentage,
  getTrendDirection,
  getSemanticBgClasses,
  getCategoryCardClasses,
  getStatusBadgeClasses,
  getBorderClass,
  getSoftContainerClass,
  getSidebarClasses,
} as const;

export default designSystem;
