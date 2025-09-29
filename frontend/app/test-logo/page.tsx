'use client';

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api';

export default function TestLogoPage() {
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [loadStatus, setLoadStatus] = useState<string>('Loading...');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Simulate user data with office logo
    const mockUser = {
      office_logo: '/media/office_logos/logo.jpg'
    };
    setUser(mockUser);

    // Construct logo URL
    const office_logo = mockUser.office_logo;
    const fullUrl = office_logo.startsWith('http') ? office_logo : `${API_BASE_URL}${office_logo.startsWith('/') ? office_logo : `/${office_logo}`}`;
    setLogoUrl(fullUrl);
  }, []);

  const handleImageLoad = () => {
    setLoadStatus('✅ Logo loaded successfully');
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setLoadStatus(`❌ Failed to load logo: ${e.currentTarget.src}`);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Logo Test Page</h1>
      
      <div className="space-y-6">
        <div className="p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Debug Information</h2>
          <div className="space-y-2 text-sm">
            <p><strong>API_BASE_URL:</strong> <code>{API_BASE_URL}</code></p>
            <p><strong>User office_logo:</strong> <code>{user?.office_logo}</code></p>
            <p><strong>Constructed URL:</strong> <code>{logoUrl}</code></p>
            <p><strong>Status:</strong> <span className={loadStatus.includes('✅') ? 'text-green-600' : 'text-red-600'}>{loadStatus}</span></p>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Logo Display</h2>
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Office Logo"
              className="max-w-xs border rounded"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}
        </div>

        <div className="p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Direct URL Test</h2>
          <p className="text-sm mb-2">Testing direct access to: <code>http://localhost:8000/media/office_logos/logo.jpg</code></p>
          <img
            src="http://localhost:8000/media/office_logos/logo.jpg"
            alt="Direct Logo Test"
            className="max-w-xs border rounded"
            onLoad={() => console.log('✅ Direct logo loaded')}
            onError={(e) => console.error('❌ Direct logo failed:', e.currentTarget.src)}
          />
        </div>
      </div>
    </div>
  );
}

