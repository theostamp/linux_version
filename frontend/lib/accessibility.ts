// Accessibility utilities for kiosk application

export interface AccessibilityConfig {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
}

export const defaultAccessibilityConfig: AccessibilityConfig = {
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  screenReader: false,
  keyboardNavigation: true
};

// Check for user's accessibility preferences
export function getUserAccessibilityPreferences(): AccessibilityConfig {
  if (typeof window === 'undefined') {
    return defaultAccessibilityConfig;
  }

  const mediaQueries = {
    highContrast: window.matchMedia('(prefers-contrast: high)'),
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
    colorScheme: window.matchMedia('(prefers-color-scheme: dark)')
  };

  return {
    highContrast: mediaQueries.highContrast.matches,
    largeText: false, // This would need to be detected differently
    reducedMotion: mediaQueries.reducedMotion.matches,
    screenReader: detectScreenReader(),
    keyboardNavigation: true // Always enabled for kiosk
  };
}

// Detect if screen reader is active
function detectScreenReader(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for common screen reader indicators
  const indicators = [
    'speechSynthesis' in window,
    'webkitSpeechSynthesis' in window,
    navigator.userAgent.includes('NVDA'),
    navigator.userAgent.includes('JAWS'),
    navigator.userAgent.includes('VoiceOver'),
    navigator.userAgent.includes('TalkBack')
  ];

  return indicators.some(Boolean);
}

// Generate ARIA labels for kiosk widgets
export function generateAriaLabels(widgetType: string, data?: any): Record<string, string> {
  const baseLabels = {
    'dashboard-overview': {
      label: 'Building Overview Dashboard',
      description: 'Displays key building statistics and information'
    },
    'announcements': {
      label: 'Announcements',
      description: `Shows ${data?.length || 0} announcements for the building`
    },
    'votes': {
      label: 'Voting Information',
      description: `Displays voting information and results`
    },
    'financial-overview': {
      label: 'Financial Overview',
      description: 'Shows building financial status and expenses'
    },
    'emergency-contacts': {
      label: 'Emergency Contacts',
      description: 'Important emergency phone numbers and contacts'
    },
    'building-statistics': {
      label: 'Building Statistics',
      description: 'Detailed building information and occupancy data'
    },
    'maintenance-overview': {
      label: 'Maintenance Information',
      description: 'Current maintenance status and upcoming work'
    },
    'projects-overview': {
      label: 'Projects and Offers',
      description: 'Building projects and contractor information'
    },
    'weather-widget': {
      label: 'Weather Information',
      description: `Current weather: ${data?.description || 'Loading weather data'}`
    },
    'time-widget': {
      label: 'Current Time and Date',
      description: 'Real-time clock and calendar information'
    }
  };

  return baseLabels[widgetType as keyof typeof baseLabels] || {
    label: 'Kiosk Widget',
    description: 'Building information widget'
  };
}

// Generate keyboard navigation instructions
export function getKeyboardInstructions(): string[] {
  return [
    'Use arrow keys to navigate between slides',
    'Press Space or Enter to toggle auto-slide',
    'Press Escape to access settings',
    'Press Tab to navigate between interactive elements',
    'Press Enter to activate buttons and links'
  ];
}

// Focus management utilities
export class FocusManager {
  private focusableElements: HTMLElement[] = [];
  private currentIndex = 0;

  constructor(private container: HTMLElement) {
    this.updateFocusableElements();
  }

  updateFocusableElements() {
    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    this.focusableElements = Array.from(
      this.container.querySelectorAll(selector)
    ) as HTMLElement[];

    this.currentIndex = 0;
  }

  focusNext() {
    if (this.focusableElements.length === 0) return;

    this.currentIndex = (this.currentIndex + 1) % this.focusableElements.length;
    this.focusableElements[this.currentIndex]?.focus();
  }

  focusPrevious() {
    if (this.focusableElements.length === 0) return;

    this.currentIndex = this.currentIndex === 0 
      ? this.focusableElements.length - 1 
      : this.currentIndex - 1;
    this.focusableElements[this.currentIndex]?.focus();
  }

  focusFirst() {
    if (this.focusableElements.length > 0) {
      this.currentIndex = 0;
      this.focusableElements[0]?.focus();
    }
  }

  focusLast() {
    if (this.focusableElements.length > 0) {
      this.currentIndex = this.focusableElements.length - 1;
      this.focusableElements[this.currentIndex]?.focus();
    }
  }
}

// Screen reader announcements
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  if (typeof window === 'undefined') return;

  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// High contrast mode utilities
export function applyHighContrastStyles(enabled: boolean) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  
  if (enabled) {
    root.classList.add('high-contrast');
    root.style.setProperty('--kiosk-bg-primary', '#000000');
    root.style.setProperty('--kiosk-bg-secondary', '#ffffff');
    root.style.setProperty('--kiosk-text-primary', '#ffffff');
    root.style.setProperty('--kiosk-text-secondary', '#000000');
    root.style.setProperty('--kiosk-border-color', '#ffffff');
  } else {
    root.classList.remove('high-contrast');
    root.style.removeProperty('--kiosk-bg-primary');
    root.style.removeProperty('--kiosk-bg-secondary');
    root.style.removeProperty('--kiosk-text-primary');
    root.style.removeProperty('--kiosk-text-secondary');
    root.style.removeProperty('--kiosk-border-color');
  }
}

// Large text mode utilities
export function applyLargeTextStyles(enabled: boolean) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  
  if (enabled) {
    root.classList.add('large-text');
    root.style.setProperty('--kiosk-font-size-base', '18px');
    root.style.setProperty('--kiosk-font-size-lg', '24px');
    root.style.setProperty('--kiosk-font-size-xl', '32px');
    root.style.setProperty('--kiosk-font-size-2xl', '48px');
  } else {
    root.classList.remove('large-text');
    root.style.removeProperty('--kiosk-font-size-base');
    root.style.removeProperty('--kiosk-font-size-lg');
    root.style.removeProperty('--kiosk-font-size-xl');
    root.style.removeProperty('--kiosk-font-size-2xl');
  }
}

// Reduced motion utilities
export function applyReducedMotionStyles(enabled: boolean) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  
  if (enabled) {
    root.classList.add('reduced-motion');
    root.style.setProperty('--kiosk-transition-duration', '0.01ms');
    root.style.setProperty('--kiosk-animation-duration', '0.01ms');
  } else {
    root.classList.remove('reduced-motion');
    root.style.removeProperty('--kiosk-transition-duration');
    root.style.removeProperty('--kiosk-animation-duration');
  }
}

// Accessibility testing utilities
export function runAccessibilityTests(): Promise<{
  score: number;
  issues: string[];
  recommendations: string[];
}> {
  return new Promise((resolve) => {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Test for missing alt text
    const images = document.querySelectorAll('img:not([alt])');
    if (images.length > 0) {
      issues.push(`${images.length} images are missing alt text`);
      recommendations.push('Add descriptive alt text to all images');
    }

    // Test for missing ARIA labels
    const interactiveElements = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
    if (interactiveElements.length > 0) {
      issues.push(`${interactiveElements.length} interactive elements are missing ARIA labels`);
      recommendations.push('Add ARIA labels to all interactive elements');
    }

    // Test for color contrast (simplified)
    const lowContrastElements = document.querySelectorAll('[style*="color"]');
    if (lowContrastElements.length > 0) {
      recommendations.push('Verify color contrast ratios meet WCAG guidelines');
    }

    // Test for keyboard navigation
    const focusableElements = document.querySelectorAll('a, button, input, select, textarea, [tabindex]');
    if (focusableElements.length === 0) {
      issues.push('No keyboard-navigable elements found');
      recommendations.push('Ensure all interactive elements are keyboard accessible');
    }

    // Calculate score
    const totalTests = 4;
    const passedTests = totalTests - issues.length;
    const score = Math.round((passedTests / totalTests) * 100);

    resolve({
      score,
      issues,
      recommendations
    });
  });
}

// Export accessibility hooks and utilities
export const accessibilityUtils = {
  getUserAccessibilityPreferences,
  generateAriaLabels,
  getKeyboardInstructions,
  FocusManager,
  announceToScreenReader,
  applyHighContrastStyles,
  applyLargeTextStyles,
  applyReducedMotionStyles,
  runAccessibilityTests
};
