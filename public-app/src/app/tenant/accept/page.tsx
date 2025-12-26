'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';

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
          // Store tokens
          if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', response.access);
            localStorage.setItem('refresh_token', response.refresh);
            localStorage.setItem('access', response.access);
            localStorage.setItem('refresh', response.refresh);
            console.log('[TenantAccept] Tokens saved to localStorage');
          }

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Επεξεργασία πρόσκλησης...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="text-red-600 text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Σφάλμα</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Μετάβαση στη Σύνδεση
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Δοκιμή Ξανά
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Ανακατεύθυνση...</p>
      </div>
    </div>
  );
}

export default function TenantAcceptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Φόρτωση...</p>
        </div>
      </div>
    }>
      <TenantAcceptContent />
    </Suspense>
  );
}

