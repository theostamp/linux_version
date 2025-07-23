// frontend/components/CsrfInitializer.tsx
'use client';

import useCsrf from '@/hooks/useCsrf';

export default function CsrfInitializer() {
  useCsrf();
  return null;
}
