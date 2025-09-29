'use client';

import { useState, useEffect } from 'react';

export default function TestKioskPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Test backend API
        const response = await fetch('http://demo.localhost:18000/api/kiosk/public/configs/?building_id=1');
        if (response.ok) {
          const result = await response.json();
          setData(result);
        } else {
          setError(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading kiosk data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-800 mb-2">Error</h1>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          🏢 Kiosk Test Page
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📊 Kiosk Configuration</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Building ID:</strong> {data?.building}
            </div>
            <div>
              <strong>Widgets Count:</strong> {data?.widgets?.length || 0}
            </div>
          </div>
          
          <div className="mt-4">
            <strong>Settings:</strong>
            <pre className="bg-gray-100 p-2 rounded mt-2 text-sm">
              {JSON.stringify(data?.settings, null, 2)}
            </pre>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">🧩 Widgets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.widgets?.map((widget: any, index: number) => (
              <div key={index} className="border rounded p-3">
                <div className="font-semibold">{widget.name}</div>
                <div className="text-sm text-gray-600">{widget.description}</div>
                <div className="text-xs mt-1">
                  <span className={`px-2 py-1 rounded ${
                    widget.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {widget.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-8">
          <div className="text-green-600 text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-800">Kiosk Backend Working!</h2>
          <p className="text-gray-600 mt-2">
            Backend API is responding correctly with {data?.widgets?.length || 0} widgets
          </p>
        </div>
      </div>
    </div>
  );
}
