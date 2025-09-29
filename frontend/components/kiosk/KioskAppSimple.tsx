'use client';

import { useState, useEffect } from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BuildingSelector from '@/components/BuildingSelector';

export default function KioskAppSimple({ 
  buildingId: initialBuildingId, 
  onBuildingChange 
}: {
  buildingId?: number;
  onBuildingChange?: (buildingId: number | null) => void;
}) {
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(initialBuildingId || null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBuildingSelector, setShowBuildingSelector] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedBuildingId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`http://demo.localhost:18000/api/kiosk/public/configs/?building_id=${selectedBuildingId}`);
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
  }, [selectedBuildingId]);

  // Keyboard shortcuts
  const { toggleFullscreen, refreshPage } = useKeyboardShortcuts({
    onBuildingSelector: () => setShowBuildingSelector(true),
    onSettings: () => console.log('Settings shortcut pressed'),
  });

  const handleBuildingChange = (buildingId: number | null) => {
    setSelectedBuildingId(buildingId);
    onBuildingChange?.(buildingId);
    setShowBuildingSelector(false);
  };

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
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
          🏢 Kiosk Display System
        </h1>
        
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-2xl font-semibold mb-4">📊 Building Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Building ID:</strong> {data.building}
                  </div>
                  <div>
                    <strong>Widgets Count:</strong> {data.widgets?.length || 0}
                  </div>
                  <div>
                    <strong>Auto Refresh:</strong> {data.settings?.autoRefresh ? 'Yes' : 'No'}
                  </div>
                  <div>
                    <strong>Slide Duration:</strong> {data.settings?.slideDuration}s
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-semibold mb-4">🧩 Widgets Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.widgets?.slice(0, 8).map((widget: any, index: number) => (
                    <div key={index} className="border rounded p-4 hover:shadow-md transition-shadow">
                      <div className="font-semibold text-lg">{widget.name}</div>
                      <div className="text-sm text-gray-600 mb-2">{widget.description}</div>
                      <div className="text-xs">
                        <span className={`px-2 py-1 rounded ${
                          widget.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {widget.enabled ? '✅ Enabled' : '❌ Disabled'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-semibold mb-4">⚙️ Settings</h3>
                <div className="space-y-2">
                  <div><strong>Refresh Interval:</strong> {data.settings?.refreshInterval}s</div>
                  <div><strong>Auto Refresh:</strong> {data.settings?.autoRefresh ? 'On' : 'Off'}</div>
                  <div><strong>Slide Duration:</strong> {data.settings?.slideDuration}s</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-semibold mb-4">📈 Statistics</h3>
                <div className="space-y-2">
                  <div><strong>Total Widgets:</strong> {data.widgets?.length || 0}</div>
                  <div><strong>Enabled Widgets:</strong> {data.widgets?.filter((w: any) => w.enabled).length || 0}</div>
                  <div><strong>Disabled Widgets:</strong> {data.widgets?.filter((w: any) => !w.enabled).length || 0}</div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg shadow-lg p-6">
                <div className="text-center">
                  <div className="text-green-600 text-4xl mb-2">✅</div>
                  <h3 className="text-lg font-semibold text-green-800">System Status</h3>
                  <p className="text-green-600">All systems operational</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mt-8">
          <div className="text-blue-600 text-6xl mb-4">🚀</div>
          <h2 className="text-2xl font-bold text-blue-800">Kiosk System Ready!</h2>
          <p className="text-gray-600 mt-2">
            Backend API responding with {data?.widgets?.length || 0} widgets for building {data?.building}
          </p>
          <div className="mt-4 text-sm text-gray-500">
            <p>Press <kbd className="px-2 py-1 bg-gray-200 rounded">Ctrl+Alt+B</kbd> to change building</p>
            <p>Press <kbd className="px-2 py-1 bg-gray-200 rounded">F11</kbd> for fullscreen</p>
          </div>
        </div>
      </div>

      {/* Building Selector Modal */}
      <BuildingSelector
        isOpen={showBuildingSelector}
        onClose={() => setShowBuildingSelector(false)}
        onBuildingSelect={(building) => handleBuildingChange(building?.id || null)}
        selectedBuilding={selectedBuildingId ? { id: selectedBuildingId, name: `Building ${selectedBuildingId}`, address: '', city: '' } : null}
        currentBuilding={selectedBuildingId ? { id: selectedBuildingId, name: `Building ${selectedBuildingId}`, address: '', city: '' } : null}
      />
    </div>
  );
}
