'use client';

export default function DebugEnvPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Environment Variables Debug - Updated</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">API URLs:</h2>
          <p><strong>NEXT_PUBLIC_API_URL:</strong> {process.env.NEXT_PUBLIC_API_URL || '🚫 Undefined'}</p>
          <p><strong>NEXT_PUBLIC_DEFAULT_API_URL:</strong> {process.env.NEXT_PUBLIC_DEFAULT_API_URL || '🚫 Undefined'}</p>
          <p><strong>NEXT_PUBLIC_DJANGO_API_URL:</strong> {process.env.NEXT_PUBLIC_DJANGO_API_URL || '🚫 Undefined'}</p>
          <p><strong>API_URL:</strong> {process.env.API_URL || '🚫 Undefined'}</p>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">App URLs:</h2>
          <p><strong>NEXT_PUBLIC_APP_URL:</strong> {process.env.NEXT_PUBLIC_APP_URL || '🚫 Undefined'}</p>
          <p><strong>NEXT_PUBLIC_APP_URL_CUSTOM:</strong> {process.env.NEXT_PUBLIC_APP_URL_CUSTOM || '🚫 Undefined'}</p>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Google OAuth:</h2>
          <p><strong>NEXT_PUBLIC_GOOGLE_CLIENT_ID:</strong> {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '🚫 Undefined'}</p>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Environment:</h2>
          <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV || '🚫 Undefined'}</p>
          <p><strong>NEXT_PUBLIC_ENV:</strong> {process.env.NEXT_PUBLIC_ENV || '🚫 Undefined'}</p>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Client-side Info:</h2>
          <p><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'Server-side'}</p>
          <p><strong>Hostname:</strong> {typeof window !== 'undefined' ? window.location.hostname : 'Server-side'}</p>
        </div>
      </div>
    </div>
  );
}
