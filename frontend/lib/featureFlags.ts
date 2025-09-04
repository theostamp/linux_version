export function isUnifiedProjectsEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_FEATURE_PROJECTS_UNIFIED || '';
  return ['1', 'true', 'on', 'enabled', 'yes'].includes(raw.toLowerCase());
}

export function featureFlagDescription(): string {
  return 'Ενοποιημένη ροή Έργων/Συντήρησης';
}


