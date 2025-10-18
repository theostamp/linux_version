import React, { useState } from 'react';

const OAuthButtons = ({ mode = 'register' }) => {
  const [loading, setLoading] = useState(null);

  const handleGoogleAuth = async () => {
    setLoading('google');
    try {
      // Google OAuth requires localhost (not demo.localhost) for development
      // Replace demo.localhost with localhost for OAuth compliance
      const origin = window.location.origin.replace('demo.localhost', 'localhost');
      const redirectUri = encodeURIComponent(`${origin}/auth/callback`);
      const state = encodeURIComponent(JSON.stringify({
        mode,
        redirectTo: '/dashboard',
        provider: 'google'
      }));

      // Use the API URL from environment or fallback to localhost:18000
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:18000';
      window.location.href = `${apiUrl}/api/users/auth/google/?redirect_uri=${redirectUri}&state=${state}`;
    } catch (error) {
      console.error('Google OAuth error:', error);
      setLoading(null);
    }
  };

  const handleMicrosoftAuth = async () => {
    setLoading('microsoft');
    try {
      // Replace demo.localhost with localhost for OAuth compliance
      const origin = window.location.origin.replace('demo.localhost', 'localhost');
      const redirectUri = encodeURIComponent(`${origin}/auth/callback`);
      const state = encodeURIComponent(JSON.stringify({
        mode,
        redirectTo: '/dashboard',
        provider: 'microsoft'
      }));

      // Use the API URL from environment or fallback to localhost:18000
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:18000';
      window.location.href = `${apiUrl}/api/users/auth/microsoft/?redirect_uri=${redirectUri}&state=${state}`;
    } catch (error) {
      console.error('Microsoft OAuth error:', error);
      setLoading(null);
    }
  };

  return (
    <div className="mt-6 space-y-3">
      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">ή συνέχισε με</span>
        </div>
      </div>

      {/* OAuth Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading !== null}
          className="w-full inline-flex justify-center items-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading === 'google' ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          <span className="ml-2">Google</span>
        </button>

        <button
          type="button"
          onClick={handleMicrosoftAuth}
          disabled={loading !== null}
          className="w-full inline-flex justify-center items-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading === 'microsoft' ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#f25022" d="M1 1h10v10H1z" />
              <path fill="#00a4ef" d="M13 1h10v10H13z" />
              <path fill="#7fba00" d="M1 13h10v10H1z" />
              <path fill="#ffb900" d="M13 13h10v10H13z" />
            </svg>
          )}
          <span className="ml-2">Microsoft</span>
        </button>
      </div>
    </div>
  );
};

export default OAuthButtons;
