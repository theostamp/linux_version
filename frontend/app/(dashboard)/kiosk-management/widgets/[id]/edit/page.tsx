// frontend/app/(dashboard)/kiosk-management/widgets/[id]/edit/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Eye,
  Settings,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { KioskWidget } from '@/types/kiosk';
import { getSystemWidgets } from '@/lib/kiosk/widgets/registry';

export default function EditWidgetPage() {
  const router = useRouter();
  const params = useParams();
  const widgetId = params.id as string;
  const { currentBuilding, selectedBuilding } = useBuilding();
  const building = selectedBuilding || currentBuilding;

  const [widget, setWidget] = useState<KioskWidget | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // In real implementation, fetch widget from API
    // For now, simulate with mock data
    const allWidgets = getSystemWidgets(building?.id || 1);
    const foundWidget = allWidgets.find(w => w.id === widgetId);

    if (foundWidget) {
      setWidget(foundWidget);
    }
    setLoading(false);
  }, [widgetId, building?.id]);

  const handleSave = async () => {
    if (!widget) return;

    setSaving(true);

    // Simulate API save
    await new Promise(resolve => setTimeout(resolve, 1000));

    setSaving(false);
    router.push('/kiosk-management/widgets');
  };

  const handleDelete = async () => {
    if (!widget) return;

    if (confirm('Are you sure you want to delete this widget?')) {
      // Simulate API delete
      await new Promise(resolve => setTimeout(resolve, 500));
      router.push('/kiosk-management/widgets');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading widget...</p>
        </div>
      </div>
    );
  }

  if (!widget) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Widget Not Found</h1>
          <p className="text-gray-600 mb-6">The widget you're looking for doesn't exist.</p>
          <Link href="/kiosk-management/widgets">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Widgets
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isSystemWidget = widget.type === 'system';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/kiosk-management/widgets">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Widget</h1>
              <p className="text-gray-600">Modify widget settings and configuration</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant={widget.enabled ? "default" : "secondary"}>
              {widget.enabled ? "Enabled" : "Disabled"}
            </Badge>
            <Badge variant={isSystemWidget ? "outline" : "default"}>
              {isSystemWidget ? "System" : "Custom"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Settings */}
          <div className="lg:col-span-2">
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Basic Information</h2>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Widget Name</Label>
                  <Input
                    id="name"
                    value={widget.name}
                    onChange={(e) => setWidget({ ...widget, name: e.target.value })}
                    disabled={isSystemWidget}
                  />
                  {isSystemWidget && (
                    <p className="text-sm text-gray-500 mt-1">System widgets cannot be renamed</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={widget.description}
                    onChange={(e) => setWidget({ ...widget, description: e.target.value })}
                    disabled={isSystemWidget}
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enabled"
                    checked={widget.enabled}
                    onCheckedChange={(enabled) => setWidget({ ...widget, enabled })}
                  />
                  <Label htmlFor="enabled">Enable this widget</Label>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Display Settings</h2>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Display Title</Label>
                  <Input
                    id="title"
                    value={widget.settings.title || ''}
                    onChange={(e) => setWidget({
                      ...widget,
                      settings: { ...widget.settings, title: e.target.value }
                    })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="showTitle"
                    checked={widget.settings.showTitle ?? true}
                    onCheckedChange={(showTitle) => setWidget({
                      ...widget,
                      settings: { ...widget.settings, showTitle }
                    })}
                  />
                  <Label htmlFor="showTitle">Show title</Label>
                </div>

                <div>
                  <Label htmlFor="backgroundColor">Background Color</Label>
                  <Input
                    id="backgroundColor"
                    type="color"
                    value={widget.settings.backgroundColor || '#ffffff'}
                    onChange={(e) => setWidget({
                      ...widget,
                      settings: { ...widget.settings, backgroundColor: e.target.value }
                    })}
                  />
                </div>

                {widget.refreshInterval && (
                  <div>
                    <Label htmlFor="refreshInterval">Refresh Interval (seconds)</Label>
                    <Input
                      id="refreshInterval"
                      type="number"
                      value={widget.refreshInterval}
                      onChange={(e) => setWidget({
                        ...widget,
                        refreshInterval: parseInt(e.target.value)
                      })}
                      min="1"
                    />
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Actions</h3>

              <div className="space-y-3">
                <Button onClick={handleSave} className="w-full" disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>

                <Link href={`/kiosk-management/preview?highlight=${widget.id}`} className="block">
                  <Button variant="outline" className="w-full">
                    <Eye className="w-4 h-4 mr-2" />
                    Preview Widget
                  </Button>
                </Link>

                {!isSystemWidget && (
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Widget
                  </Button>
                )}
              </div>
            </Card>

            {/* Widget Info */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Widget Information</h3>

              <div className="space-y-3 text-sm">
                <div>
                  <strong>ID:</strong> {widget.id}
                </div>
                <div>
                  <strong>Type:</strong> {widget.type}
                </div>
                <div>
                  <strong>Category:</strong> {widget.category.replace('_', ' ')}
                </div>
                <div>
                  <strong>Component:</strong> {widget.component}
                </div>
                <div>
                  <strong>Order:</strong> {widget.order}
                </div>
                {widget.dataSource && (
                  <div>
                    <strong>Data Source:</strong> {widget.dataSource}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}