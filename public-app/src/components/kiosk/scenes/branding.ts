import type { KioskData } from '@/hooks/useKioskData';

export type AmbientBackgroundConfig = {
  type: 'image' | 'video' | 'gradient';
  src?: string;
  poster?: string;
  overlayColor?: string;
  gradient?: string;
  blur?: number;
};

export type AmbientHighlight = {
  title: string;
  description: string;
  icon?: string;
};

export type AmbientQuote = {
  text: string;
  author?: string;
};

export type AmbientCTA = {
  label: string;
  sublabel?: string;
  url?: string;
};

export interface AmbientBrandingConfig {
  background: AmbientBackgroundConfig;
  tagline: string;
  subline?: string;
  highlight?: AmbientHighlight;
  quote?: AmbientQuote;
  cta?: AmbientCTA;
}

export const defaultAmbientBranding: AmbientBrandingConfig = {
  background: {
    type: 'image',
    src: '/kiosk/assets/ambient-default.png',
    overlayColor: 'rgba(8, 5, 20, 0.5)',
    blur: 8,
  },
  tagline: 'Αναπνέουμε πιο ήρεμα στα κοινόχρηστα',
  subline: 'Έξυπνη ενημέρωση, ζεστή ατμόσφαιρα, 24/7 για τους ενοίκους σας.',
  highlight: {
    title: 'Σημερινό highlight',
    description: 'Εγχρωμο dashboard με τις βασικές υποχρεώσεις και ειδοποιήσεις.',
    icon: '✨',
  },
  quote: {
    text: 'Η καθημερινή ενημέρωση γίνεται εμπειρία όταν παρουσιάζεται όμορφα.',
    author: 'New Concierge',
  },
  cta: {
    label: 'Σαρώστε για demo',
    sublabel: 'New Concierge Kiosk',
  },
};

export const resolveAmbientBranding = (
  data?: KioskData | null,
  overrides?: Partial<AmbientBrandingConfig>
): AmbientBrandingConfig => {
  const buildingName = data?.building_info?.name;
  const fallbackTagline = buildingName
    ? `Η ήρεμη πλευρά του ${buildingName}`
    : defaultAmbientBranding.tagline;

  const highlightDescription =
    data?.announcements && data.announcements.length > 0
      ? data.announcements[0].description || data.announcements[0].content
      : defaultAmbientBranding.highlight?.description;

  return {
    ...defaultAmbientBranding,
    tagline: overrides?.tagline || fallbackTagline,
    subline:
      overrides?.subline ||
      data?.building_info?.management_office_name ||
      defaultAmbientBranding.subline,
    highlight: overrides?.highlight || {
      title: data?.announcements && data.announcements.length > 0
        ? data.announcements[0].title
        : defaultAmbientBranding.highlight?.title || 'Σημερινό highlight',
      description: highlightDescription || 'Οι τελευταίες ενημερώσεις της κοινότητας σε μία ματιά.',
      icon: defaultAmbientBranding.highlight?.icon || '✨',
    },
    quote: overrides?.quote || defaultAmbientBranding.quote,
    cta: {
      ...defaultAmbientBranding.cta,
      ...overrides?.cta,
    },
    background: {
      ...defaultAmbientBranding.background,
      ...overrides?.background,
    },
  };
};

export const extractAmbientBrandingFromSettings = (settings?: unknown): AmbientBrandingConfig | null => {
  if (!settings || typeof settings !== 'object') {
    return null;
  }
  const config = settings as Record<string, unknown>;
  if (!config.ambientBranding || typeof config.ambientBranding !== 'object') {
    return null;
  }

  return resolveAmbientBranding(undefined, config.ambientBranding as Partial<AmbientBrandingConfig>);
};

