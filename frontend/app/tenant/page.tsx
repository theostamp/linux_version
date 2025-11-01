// app/tenant/page.tsx
// Tenant subdomain root page: Redirects to dashboard
// This page is served when accessing tenant subdomains (e.g., alpha.newconcierge.app/)

'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function TenantPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tenant = searchParams.get('tenant');

  useEffect(() => {
    if (tenant) {
      console.log(`[TenantPage] Redirecting to dashboard for tenant: ${tenant}`);
      // Redirect to dashboard with tenant param
      router.push(`/tenant/dashboard?tenant=${tenant}`);
    } else {
      // No tenant param, redirect to main page
      router.push('/');
    }
  }, [tenant, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Ανακατεύθυνση...</p>
      </div>
    </div>
  );
}

