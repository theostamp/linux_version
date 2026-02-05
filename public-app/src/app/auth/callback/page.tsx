'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/contexts/AuthContext';
import BuildingRevealBackground from '@/components/BuildingRevealBackground';
import { storeAuthTokens } from '@/lib/authTokens';

interface StateData {
  provider?: string;
  action?: string;
  redirect?: string;
  originUrl?: string;
  plan?: string;
  apartments?: number;
  billingInterval?: string;
  tenantSubdomain?: string;
}

function OAuthCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loginWithToken } = useAuth();
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Check for cross-subdomain token transfer (via URL hash)
  const hashTokens = searchParams.get('tokens');
  const hashRedirect = searchParams.get('redirect_path');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Επεξεργασία...');

  useEffect(() => {
    // Handle cross-subdomain token transfer (tokens passed via URL hash after main callback)
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash && hash.includes('access=')) {
        const handleHashTokens = async () => {
          try {
            const hashParams = new URLSearchParams(hash.substring(1));
            const access = hashParams.get('access');
            const refresh = hashParams.get('refresh');
            const refreshCookieSet =
              hashParams.get('rc') === '1' || hashParams.get('refresh_cookie_set') === '1';
            const redirectPath = hashParams.get('redirect') || '/dashboard';
            const buildingId = hashParams.get('building');

            if (access) {
              // Store building context if provided (from QR scan)
              if (buildingId) {
                localStorage.setItem('selectedBuildingId', buildingId);
                localStorage.setItem('activeBuildingId', buildingId);
                console.log(`[AuthCallback] Set building context from redirect: ${buildingId}`);
              }

              storeAuthTokens({
                access,
                refresh,
                refreshCookieSet,
              });

              // Use loginWithToken to properly set auth state
              await loginWithToken(access);

              // Clear hash and redirect
              window.location.hash = '';
              setStatus('success');
              setMessage('Σύνδεση επιτυχής!');
              router.push(redirectPath);
              return;
            }
          } catch (e) {
            console.error('Failed to parse hash tokens:', e);
            setStatus('error');
            setMessage('Αποτυχία επεξεργασίας tokens');
          }
        };
        handleHashTokens();
        return;
      }
    }

    if (error) {
      setStatus('error');
      setMessage('Η σύνδεση με Google απέτυχε');
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('Μη έγκυρος κωδικός επιστροφής');
      return;
    }

    const handleCallback = async () => {
      try {
        let coreApiUrl = process.env.NEXT_PUBLIC_CORE_API_URL;
        if (!coreApiUrl) {
          throw new Error('Backend API not configured. Please set NEXT_PUBLIC_CORE_API_URL environment variable.');
        }

        // Ensure URL has protocol
        if (!coreApiUrl.startsWith('http://') && !coreApiUrl.startsWith('https://')) {
          coreApiUrl = `https://${coreApiUrl}`;
        }

        // Remove trailing slash
        coreApiUrl = coreApiUrl.replace(/\/$/, '');

        // Parse state to get redirect info
        let stateData: StateData = {};
        try {
          if (state) {
            stateData = JSON.parse(decodeURIComponent(state));
          }
        } catch (e) {
          console.error('Failed to parse state:', e);
        }

        // Use the fixed redirect URI (main app URL) that was registered with Google
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        const redirectUri = `${appUrl}/auth/callback`;

        // Call backend OAuth callback (POST method)
        const response = await fetch(`${coreApiUrl}/api/users/auth/callback/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            code: code,
            state: state || '{}',
            redirect_uri: redirectUri
          }),
        });

        const data = await response.json();

        // DEBUG: Log backend response
        console.log('[OAuth Callback] Backend response:', {
          status: response.status,
          tenant_url: data.tenant_url,
          redirect_path: data.redirect_path,
          user_email: data.user?.email,
          user_role: data.user?.role,
          has_access: !!data.access,
          has_refresh: !!data.refresh
        });

        if (!response.ok) {
          throw new Error(data.error || 'OAuth callback failed');
        }

        storeAuthTokens({
          access: data.access,
          refresh: data.refresh,
          refreshCookieSet: Boolean(data.refresh_cookie_set),
        });

        // Use loginWithToken to properly set auth state (if not cross-domain redirect)
        if (data.access && !data.tenant_url) {
          try {
            await loginWithToken(data.access);
            console.log('[OAuth Callback] Auth state updated via loginWithToken');
          } catch (tokenError) {
            console.error('[OAuth Callback] loginWithToken failed:', tokenError);
            // Fall back to localStorage-only approach
            storeAuthTokens({ access: data.access });
          }
        } else if (data.access) {
          // For cross-domain redirect, just store the token (will be transferred via URL hash)
          storeAuthTokens({ access: data.access });
        }

        // Handle different flows based on state
        if (stateData.action === 'signup') {
          // For signup flow, redirect to payment
          if (stateData.tenantSubdomain && stateData.plan) {
            // Create checkout session with OAuth user data
            const checkoutResponse = await fetch('/api/create-checkout-session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                plan: stateData.plan,
                apartments: stateData.apartments || 15,
                billingInterval: stateData.billingInterval || 'month',
                userData: {
                  email: data.email,
                  firstName: data.first_name || '',
                  lastName: data.last_name || '',
                  password: '' // OAuth users don't need password - they use Google
                },
                tenantSubdomain: stateData.tenantSubdomain,
                oauth: true
              }),
            });

            const checkoutData = await checkoutResponse.json();
            if (checkoutData.error) {
              throw new Error(checkoutData.error);
            }
            if (checkoutData.url) {
              window.location.href = checkoutData.url;
              return;
            }
          }
        }

        // For login flow, redirect based on user role (from backend)
        // Backend returns redirect_path: '/my-apartment' for residents, '/dashboard' for managers
        // IMPORTANT: If backend says '/plans' (user has no tenant), ALWAYS follow that
        // Otherwise use the stateData redirect or backend default
        let redirectPath = data.redirect_path || stateData.redirect || '/dashboard';

        // If user has no tenant, backend says go to /plans - this takes priority
        if (data.redirect_path === '/plans') {
          redirectPath = '/plans';
        }

        if (data.tenant_url) {
          // Cross-subdomain redirect: pass tokens via URL hash (more secure than query params)
          // Hash fragment is not sent to server, reducing exposure
          const targetUrl = `https://${data.tenant_url}/auth/callback#access=${encodeURIComponent(data.access)}&refresh=${encodeURIComponent(data.refresh)}&redirect=${encodeURIComponent(redirectPath)}`;
          window.location.href = targetUrl;
        } else {
          router.push(redirectPath);
        }

        setStatus('success');
        setMessage('Σύνδεση επιτυχής!');
      } catch (err) {
        console.error('OAuth callback error:', err);
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Προέκυψε σφάλμα');
      }
    };

    handleCallback();
  }, [code, state, error, router, loginWithToken]);

  return (
    <div className="min-h-screen bg-bg-app-main text-text-primary flex items-center justify-center relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_15%,rgba(30,78,140,0.12),transparent_55%),radial-gradient(circle_at_85%_0%,rgba(46,124,144,0.12),transparent_50%)]" />
      <BuildingRevealBackground />
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card-soft p-12 max-w-md w-full relative z-10">
        <div className="flex flex-col items-center">
          {status === 'loading' && (
            <>
              <Loader2 className="h-16 w-16 text-accent-primary animate-spin mb-4" />
              <h1 className="page-title-sm mb-2">Επεξεργασία...</h1>
              <p className="text-text-secondary">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-emerald-600 mb-4" />
              <h1 className="page-title-sm mb-2">Επιτυχία!</h1>
              <p className="text-text-secondary">{message}</p>
              <p className="text-sm text-text-secondary mt-4">Ανακατεύθυνση...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-rose-600 mb-4" />
              <h1 className="page-title-sm mb-2">Σφάλμα</h1>
              <p className="text-text-secondary mb-6">{message}</p>
              <div className="flex space-x-4">
                <Link
                  href="/login"
                  className="bg-accent-primary text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-colors shadow-lg shadow-accent-primary/20"
                >
                  Δοκιμάστε Ξανά
                </Link>
                <Link
                  href="/"
                  className="border border-gray-200 text-text-primary px-6 py-3 rounded-lg font-semibold hover:bg-bg-app-main transition-colors"
                >
                  Αρχική
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-app-main flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">Φόρτωση...</div>
      </div>
    }>
      <OAuthCallback />
    </Suspense>
  );
}
