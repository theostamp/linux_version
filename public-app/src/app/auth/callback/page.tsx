'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Building, Loader2, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

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
        try {
          const hashParams = new URLSearchParams(hash.substring(1));
          const access = hashParams.get('access');
          const refresh = hashParams.get('refresh');
          const redirectPath = hashParams.get('redirect') || '/dashboard';
          
          if (access) {
            localStorage.setItem('access_token', access);
          }
          if (refresh) {
            localStorage.setItem('refresh_token', refresh);
          }
          
          // Clear hash and redirect
          window.location.hash = '';
          setStatus('success');
          setMessage('Σύνδεση επιτυχής!');
          router.push(redirectPath);
          return;
        } catch (e) {
          console.error('Failed to parse hash tokens:', e);
        }
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

        if (!response.ok) {
          throw new Error(data.error || 'OAuth callback failed');
        }

        // Store tokens locally (will be transferred cross-domain if needed)
        if (data.access) {
          localStorage.setItem('access_token', data.access);
        }
        if (data.refresh) {
          localStorage.setItem('refresh_token', data.refresh);
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
                userData: {
                  email: data.email,
                  firstName: data.first_name || '',
                  lastName: data.last_name || '',
                  password: '' // OAuth users don't need password
                },
                tenantSubdomain: stateData.tenantSubdomain,
                oauth: true
              }),
            });

            const checkoutData = await checkoutResponse.json();
            if (checkoutData.url) {
              window.location.href = checkoutData.url;
              return;
            }
          }
        }

        // For login flow, redirect based on user role (from backend)
        // Backend returns redirect_path: '/my-apartment' for residents, '/dashboard' for managers
        const redirectPath = stateData.redirect || data.redirect_path || '/dashboard';
        
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
  }, [code, state, error, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-12 max-w-md w-full">
        <div className="flex flex-col items-center">
          {status === 'loading' && (
            <>
              <Loader2 className="h-16 w-16 text-blue-600 animate-spin mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Επεξεργασία...</h1>
              <p className="text-gray-600">{message}</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Επιτυχία!</h1>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500 mt-4">Ανακατεύθυνση...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-red-600 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Σφάλμα</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="flex space-x-4">
                <Link
                  href="/login"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Δοκιμάστε Ξανά
                </Link>
                <Link
                  href="/"
                  className="border border-slate-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-600">Φόρτωση...</div>
      </div>
    }>
      <OAuthCallback />
    </Suspense>
  );
}

