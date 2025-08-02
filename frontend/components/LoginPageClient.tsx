// frontend/components/LoginPageClient.tsx
'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import LoginForm from '@/components/LoginForm';

export default function LoginPageClient() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4 text-center">Σύνδεση</h1>
        <LoginForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}
