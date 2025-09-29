'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  RefreshCw, 
  Trash2,
  Database
} from 'lucide-react';
import { getAllWidgets, reloadWidgets, clearCustomWidgets } from '@/lib/widget-library';

export default function WidgetDebugInfo() {
  const [widgets, setWidgets] = useState<any[]>([]);
  const [localStorageData, setLocalStorageData] = useState<string>('');

  const loadData = () => {
    const allWidgets = getAllWidgets();
    setWidgets(allWidgets);
    
    // Get localStorage data
    const stored = localStorage.getItem('kiosk_custom_widgets');
    setLocalStorageData(stored || 'No data in localStorage');
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReload = () => {
    reloadWidgets();
    loadData();
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all custom widgets?')) {
      clearCustomWidgets();
      loadData();
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <Database className="w-5 h-5 mr-2" />
          Widget Debug Information
        </h3>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleReload}>
            <Eye className="w-4 h-4 mr-1" />
            Reload
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear} className="text-red-600">
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Widgets List */}
        <div>
          <h4 className="font-semibold mb-3">All Widgets ({widgets.length})</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {widgets.map((widget) => (
              <div key={widget.id} className="p-2 border rounded text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{widget.greekName}</span>
                    <span className="text-gray-500 ml-2">({widget.id})</span>
                  </div>
                  <div className="flex space-x-1">
                    {widget.isCustom && (
                      <Badge variant="outline" className="text-xs">Custom</Badge>
                    )}
                    <Badge 
                      variant={widget.enabled ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {widget.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* localStorage Data */}
        <div>
          <h4 className="font-semibold mb-3">localStorage Data</h4>
          <div className="bg-gray-100 p-3 rounded text-sm font-mono max-h-64 overflow-y-auto">
            {localStorageData}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{widgets.length}</p>
          <p className="text-sm text-gray-600">Total Widgets</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{widgets.filter(w => !w.isCustom).length}</p>
          <p className="text-sm text-gray-600">Built-in</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600">{widgets.filter(w => w.isCustom).length}</p>
          <p className="text-sm text-gray-600">Custom</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{widgets.filter(w => w.enabled).length}</p>
          <p className="text-sm text-gray-600">Enabled</p>
        </div>
      </div>
    </Card>
  );
}
