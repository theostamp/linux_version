'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown,
  Save,
  RefreshCw,
  Settings,
  Monitor
} from 'lucide-react';
import { getAllWidgets, toggleWidget, updateWidgetOrder } from '@/lib/widget-library';
import { saveKioskConfig } from '@/lib/kiosk-api';

interface KioskWidget {
  id: string;
  name: string;
  greekName: string;
  description: string;
  greekDescription: string;
  category: string;
  icon: string;
  enabled: boolean;
  order: number;
  settings: any;
  component: string;
  dataSource?: string;
  isCustom: boolean;
}

interface KioskWidgetManagementProps {
  buildingId?: number;
  compact?: boolean;
}

export default function KioskWidgetManagement({ buildingId, compact = false }: KioskWidgetManagementProps) {
  const [widgets, setWidgets] = useState<KioskWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadWidgets();
  }, []);

  const loadWidgets = () => {
    const allWidgets = getAllWidgets();
    setWidgets(allWidgets);
    setLoading(false);
  };

  const handleToggleWidget = (widgetId: string, enabled: boolean) => {
    const updatedWidgets = toggleWidget(widgetId, enabled);
    setWidgets(updatedWidgets);
  };

  const handleMoveWidget = (widgetId: string, direction: 'up' | 'down') => {
    const currentWidget = widgets.find(w => w.id === widgetId);
    if (!currentWidget) return;

    const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);
    const currentIndex = sortedWidgets.findIndex(w => w.id === widgetId);
    
    if (direction === 'up' && currentIndex > 0) {
      const temp = sortedWidgets[currentIndex].order;
      sortedWidgets[currentIndex].order = sortedWidgets[currentIndex - 1].order;
      sortedWidgets[currentIndex - 1].order = temp;
    } else if (direction === 'down' && currentIndex < sortedWidgets.length - 1) {
      const temp = sortedWidgets[currentIndex].order;
      sortedWidgets[currentIndex].order = sortedWidgets[currentIndex + 1].order;
      sortedWidgets[currentIndex + 1].order = temp;
    }

    const updatedWidgets = updateWidgetOrder(widgetId, sortedWidgets[currentIndex].order);
    setWidgets(updatedWidgets);
  };

  const handleSaveConfiguration = async () => {
    setSaving(true);
    try {
      // Get the current building ID (default to 1 for now)
      const currentBuildingId = buildingId || 1;
      
      // Prepare widgets data for API
      const widgetsData = widgets.map(widget => ({
        id: widget.id,
        name: widget.name,
        greekName: widget.greekName,
        description: widget.description,
        greekDescription: widget.greekDescription,
        category: widget.category,
        icon: widget.icon,
        enabled: widget.enabled,
        order: widget.order,
        settings: widget.settings,
        component: widget.component,
        dataSource: widget.dataSource,
        isCustom: widget.isCustom
      }));
      
      // Save to backend
      await saveKioskConfig(currentBuildingId, {
        widgets: widgetsData as any,
        settings: {
          slideDuration: 10,
          autoRefresh: true,
          refreshInterval: 30
        }
      });
      
      console.log('Configuration saved successfully');
      // You could add a toast notification here
    } catch (error) {
      console.error('Error saving configuration:', error);
      // You could add error toast notification here
    } finally {
      setSaving(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'main_slides': return 'bg-blue-100 text-blue-800';
      case 'sidebar_widgets': return 'bg-green-100 text-green-800';
      case 'top_bar_widgets': return 'bg-purple-100 text-purple-800';
      case 'special_widgets': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'main_slides': return 'Κύρια Slides';
      case 'sidebar_widgets': return 'Sidebar Widgets';
      case 'top_bar_widgets': return 'Top Bar Widgets';
      case 'special_widgets': return 'Ειδικά Widgets';
      default: return category;
    }
  };

  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600">Φόρτωση widgets...</p>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Settings className="w-5 h-5 mr-2 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Kiosk Widgets</h3>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const currentHost = window.location.hostname;
                const previewUrl = currentHost.includes('demo.localhost') 
                  ? 'http://demo.localhost:3000/kiosk' 
                  : 'http://localhost:3000/kiosk';
                window.open(previewUrl, '_blank');
              }}
            >
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>

        {/* Compact Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{widgets.length}</p>
            <p className="text-xs text-gray-600">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{widgets.filter(w => w.enabled).length}</p>
            <p className="text-xs text-gray-600">Enabled</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{widgets.filter(w => w.isCustom).length}</p>
            <p className="text-xs text-gray-600">Custom</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-2">
          <Button
            size="sm"
            onClick={handleSaveConfiguration}
            disabled={saving}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-1" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="flex-1"
          >
            <Settings className="w-4 h-4 mr-1" />
            {expanded ? 'Less Options' : 'More Options'}
          </Button>
        </div>

        {/* Expanded View */}
        {expanded && (
          <div className="mt-4 space-y-3">
            {sortedWidgets
              .slice(0, 5)
              .map((widget) => (
                <div
                  key={widget.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    widget.enabled
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Badge className={getCategoryColor(widget.category)}>
                      {getCategoryName(widget.category)}
                    </Badge>
                    <div>
                      <h4 className="font-medium text-gray-900">{widget.greekName}</h4>
                      <p className="text-xs text-gray-600">{widget.greekDescription}</p>
                    </div>
                    {widget.isCustom && (
                      <Badge variant="outline" className="text-purple-600 border-purple-600">
                        Custom
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={widget.enabled}
                      onCheckedChange={(checked) => handleToggleWidget(widget.id, checked)}
                    />
                  </div>
                </div>
              ))}

            {widgets.length > 5 && (
              <p className="text-center text-sm text-gray-500">
                +{widgets.length - 5} more widgets
              </p>
            )}
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Settings className="w-6 h-6 mr-2" />
            Kiosk Widget Management
          </h2>
          <p className="text-gray-600 mt-1">Διαχείριση widgets για το kiosk display</p>
        </div>
        <div className="flex space-x-4">
          <Button
            variant="outline"
            onClick={() => {
              const currentHost = window.location.hostname;
              const previewUrl = currentHost.includes('demo.localhost') 
                ? 'http://demo.localhost:3000/kiosk' 
                : 'http://localhost:3000/kiosk';
              window.open(previewUrl, '_blank');
            }}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button
            onClick={handleSaveConfiguration}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{widgets.length}</p>
            <p className="text-sm text-gray-600">Total Widgets</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{widgets.filter(w => w.enabled).length}</p>
            <p className="text-sm text-gray-600">Enabled</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{widgets.filter(w => w.isCustom).length}</p>
            <p className="text-sm text-gray-600">Custom</p>
          </div>
        </Card>
      </div>

      {/* All Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedWidgets.map((widget) => (
          <Card
            key={widget.id}
            className={`p-4 transition-all duration-200 hover:shadow-md ${
              widget.enabled
                ? 'border-green-200 bg-green-50/50'
                : 'border-gray-200 bg-gray-50/50'
            }`}
          >
            <div className="flex flex-col space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge className={getCategoryColor(widget.category)}>
                      {getCategoryName(widget.category)}
                    </Badge>
                    {widget.isCustom && (
                      <Badge variant="outline" className="text-purple-600 border-purple-600">
                        Custom
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                    {widget.greekName}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    {widget.greekDescription}
                  </p>
                </div>
                <div className="flex flex-col items-center space-y-2 ml-3">
                  <Switch
                    checked={widget.enabled}
                    onCheckedChange={(checked) => handleToggleWidget(widget.id, checked)}
                  />
                  <span className={`text-xs font-medium ${
                    widget.enabled ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {widget.enabled ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>

              {/* Order Controls */}
              {widget.enabled && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-500">
                    Σειρά: {widget.order}
                  </span>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMoveWidget(widget.id, 'up')}
                      className="h-6 w-6 p-0"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMoveWidget(widget.id, 'down')}
                      className="h-6 w-6 p-0"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
