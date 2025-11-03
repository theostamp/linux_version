// frontend/app/login/page.tsx
'use client';
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import LoginPageInner from '@/components/LoginPageInner';

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="p-4">Φόρτωση...</p>}>
      <LoginPageInner />
    </Suspense>
  );
}
