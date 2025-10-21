'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/contexts/AuthContext';

export default function VerifyTokenPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loginWithToken } = useAuth();
  const token = searchParams.get('token');

  useEffect(() => {
    const handleTokenVerification = async () => {
      if (token) {
        try {
          // Use the token to authenticate the user
          await loginWithToken(token);
          
          // Redirect to dashboard after successful authentication
          router.replace('/dashboard');
        } catch (error) {
          console.error('Token verification failed:', error);
          // Redirect to login page if token verification fails
          router.replace('/login');
        }
      } else {
        // If no token is present, redirect to login
        router.replace('/login');
      }
    };

    handleTokenVerification();
  }, [token, loginWithToken, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-6 w-6 text-blue-600 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Verifying your session...
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please wait while we set up your workspace.
          </p>
        </div>
      </div>
    </div>
  );
}



