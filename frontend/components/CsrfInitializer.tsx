// frontend/components/CsrfInitializer.tsx
'use client';

import useCsrf from '@/hooks/useCsrf';

export default function CsrfInitializer() {
  // TEMPORARILY DISABLED - might be causing hanging issues
  // useCsrf();
  console.log('[CsrfInitializer] CSRF initialization disabled to debug hanging issue');
  return null;
}
