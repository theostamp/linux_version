// app/tenant/dashboard/page.tsx
// Tenant subdomain routing: Redirects to main dashboard
// This page is served when accessing tenant subdomains (e.g., alpha.newconcierge.app/dashboard)
// The middleware rewrites the URL to /tenant/dashboard, and this component serves the dashboard

'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DashboardPage from '@/app/(dashboard)/dashboard/page';

export default function TenantDashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tenant = searchParams.get('tenant');

  useEffect(() => {
    if (tenant) {
      console.log(`[TenantDashboard] Serving dashboard for tenant: ${tenant}`);
    }
  }, [tenant]);

  // Serve the same dashboard component
  // The X-Tenant-Schema header is automatically added by the API interceptor
  // and the SessionTenantMiddleware will handle the tenant switch
  return <DashboardPage />;
}

