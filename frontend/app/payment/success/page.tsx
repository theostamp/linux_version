'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const POLLING_INTERVAL = 3000; // 3 seconds
const MAX_ATTEMPTS = 20; // Poll for 60 seconds max

export default function SubscriptionSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setError('Missing payment session information.');
      return;
    }

    let attempts = 0;
    const intervalId = setInterval(async () => {
      attempts++;
      try {
        // New API endpoint that checks the tenant creation status
        const response = await api.get(`/api/billing/subscription-status/${sessionId}/`);
        const data = response.data;

        if (data.status === 'completed') {
          clearInterval(intervalId);
          setStatus('completed');
          toast.success('Your workspace is ready! Redirecting...');

          // We received the subdomain and the one-time token
          const { subdomain, token } = data;
          
          // Construct the new URL. Handles localhost with ports and production domains.
          const protocol = window.location.protocol;
          const host = window.location.host.split('.').slice(-2).join('.'); // e.g., 'localhost:8080' or 'example.com'
          
          // Redirect to the new subdomain with the one-time token
          window.location.href = `${protocol}//${subdomain}.${host}/auth/verify?token=${token}`;
          
        } else if (data.status === 'failed') {
          clearInterval(intervalId);
          setStatus('error');
          setError(data.message || 'An error occurred during setup.');
          toast.error(data.message || 'An error occurred during setup.');
        }
        // If status is 'processing' or 'pending', we continue polling
        
      } catch (err) {
        // The API might return 404 initially, which is expected. We ignore it.
        console.log('Polling for subscription status...');
      }

      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(intervalId);
        setStatus('error');
        setError('Workspace setup is taking longer than expected. Please check your email or contact support.');
        toast.warning('Setup is taking a while. We will notify you by email when it is ready.');
      }
    }, POLLING_INTERVAL);

    return () => clearInterval(intervalId);
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-center">
      <div>
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
            <h1 className="text-2xl font-bold text-gray-800">Finalizing Your Workspace</h1>
            <p className="text-gray-600 mt-2">Please wait a moment, we're setting things up for you...</p>
          </>
        )}
        {status === 'error' && (
          <div className="text-red-600">Error: {error}</div>
        )}
      </div>
    </div>
  );
}