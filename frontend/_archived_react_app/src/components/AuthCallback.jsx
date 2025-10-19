import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function AuthCallback() {
  const [status, setStatus] = useState("Επεξεργασία...");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code || !state) {
          throw new Error('Missing OAuth parameters');
        }

        setStatus("Ολοκλήρωση σύνδεσης...");

        // Parse state to get redirect info
        const stateData = JSON.parse(decodeURIComponent(state));
        const { redirectTo = '/dashboard' } = stateData;

        // Exchange code for tokens
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:18000'}/api/users/auth/callback/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            state: stateData,
            redirect_uri: `http://localhost:8080/auth/callback`
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Authentication failed');
        }

        const data = await response.json();
        
        // Store tokens and user data
        localStorage.setItem('access', data.access);
        localStorage.setItem('refresh', data.refresh);
        localStorage.setItem('user', JSON.stringify(data.user));

        setStatus("Επιτυχής σύνδεση!");
        toast.success("Επιτυχής σύνδεση!");

        // Redirect to intended destination
        setTimeout(() => {
          navigate(redirectTo);
        }, 1000);

      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus("Σφάλμα σύνδεσης");
        toast.error(error.message || "Σφάλμα κατά την σύνδεση");
        
        setTimeout(() => {
          navigate('/register');
        }, 2000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Σύνδεση
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {status}
          </p>
        </div>
      </div>
    </div>
  );
}
