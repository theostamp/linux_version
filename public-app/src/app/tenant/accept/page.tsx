'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense, type ReactNode } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiPost } from '@/lib/api';
import BuildingRevealBackground from '@/components/BuildingRevealBackground';
import { storeAuthTokens } from '@/lib/authTokens';

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-app-main text-text-primary relative overflow-hidden flex items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_15%_10%,rgba(30,78,140,0.12),transparent_55%),radial-gradient(circle_at_85%_0%,rgba(46,124,144,0.12),transparent_50%)]" />
      <BuildingRevealBackground />
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}

function TenantAcceptContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const acceptTenantInvite = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Token is missing. Please use the link from your invitation email.');
        return;
      }

      try {
        console.log('[TenantAccept] Processing invitation token...');

        // Call backend API to accept invitation
        const response = await apiPost<{
          status: string;
          access: string;
          refresh: string;
          refresh_cookie_set?: boolean;
          tenant: {
            schema_name: string;
            name: string;
            domain: string;
          };
          user: {
            email: string;
            first_name: string;
            last_name: string;
            role: string;
          };
        }>('/tenants/accept-invite/', { token });

        if (response.status === 'success') {
          storeAuthTokens({
            access: response.access,
            refresh: response.refresh,
            refreshCookieSet: Boolean(response.refresh_cookie_set),
          });
          console.log('[TenantAccept] Tokens stored');

          // Redirect to tenant domain
          const tenantDomain = response.tenant.domain;
          const tenantUrl = tenantDomain.startsWith('http')
            ? tenantDomain
            : `https://${tenantDomain}`;

          console.log('[TenantAccept] Redirecting to tenant domain:', tenantUrl);

          // Small delay to ensure tokens are saved
          setTimeout(() => {
            window.location.href = `${tenantUrl}/dashboard`;
          }, 500);
        } else {
          setStatus('error');
          setMessage('Failed to accept invitation. Please try again.');
        }
      } catch (error: unknown) {
        console.error('[TenantAccept] Error accepting invitation:', error);

        const err = error as { response?: { data?: { error?: string } }; message?: string };
        const errorMessage = err?.response?.data?.error ||
                           error?.message ||
                           'Failed to accept invitation. The link may have expired.';

        setStatus('error');
        setMessage(errorMessage);
      }
    };

    acceptTenantInvite();
  }, [searchParams, router]);

  if (status === 'loading') {
    return (
      <PageShell>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card-soft p-8 text-center">
          <Loader2 className="h-10 w-10 text-accent-primary animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Επεξεργασία πρόσκλησης...</p>
        </div>
      </PageShell>
    );
  }

  if (status === 'error') {
    return (
      <PageShell>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card-soft p-8">
          <div className="text-center">
            <div className="text-rose-600 text-4xl mb-4">⚠️</div>
            <h1 className="page-title-sm mb-4">Σφάλμα</h1>
            <p className="text-text-secondary mb-6">{message}</p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-accent-primary text-white py-2.5 px-4 rounded-xl font-semibold hover:opacity-90 transition-colors shadow-lg shadow-accent-primary/20"
              >
                Μετάβαση στη Σύνδεση
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-bg-app-main text-text-primary py-2.5 px-4 rounded-xl border border-gray-200 hover:bg-white transition-colors"
              >
                Δοκιμή Ξανά
              </button>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card-soft p-8 text-center">
        <Loader2 className="h-10 w-10 text-accent-primary animate-spin mx-auto mb-4" />
        <p className="text-text-secondary">Ανακατεύθυνση...</p>
      </div>
    </PageShell>
  );
}

export default function TenantAcceptPage() {
  return (
    <Suspense fallback={
      <PageShell>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card-soft p-8 text-center">
          <Loader2 className="h-10 w-10 text-accent-primary animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Φόρτωση...</p>
        </div>
      </PageShell>
    }>
      <TenantAcceptContent />
    </Suspense>
  );
}
