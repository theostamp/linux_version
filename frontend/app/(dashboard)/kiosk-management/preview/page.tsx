// frontend/app/(dashboard)/kiosk-management/preview/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Monitor, Settings, RotateCcw, ExternalLink, Smartphone, Tablet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { KioskWidget } from '@/types/kiosk';
import { getSystemWidgets } from '@/lib/kiosk/widgets/registry';
import WidgetWrapper from '@/components/kiosk/widgets/base/WidgetWrapper';

export default function KioskPreviewPage() {
  const { currentBuilding, selectedBuilding } = useBuilding();
  const building = selectedBuilding || currentBuilding;

  const [widgets, setWidgets] = useState<KioskWidget[]>([]);
  const [previewSettings, setPreviewSettings] = useState({
    showManagementOverlay: true,
    simulateKioskMode: false,
    deviceType: 'desktop' as 'desktop' | 'tablet' | 'mobile',
    autoRotateSlides: true,
    slideInterval: 10000,
  });

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    // Load widgets - in real implementation, this would come from API
    const systemWidgets = getSystemWidgets(building?.id || 1);
    const mockCustomWidgets: KioskWidget[] = [
      {
        id: 'custom_news_feed',
        name: 'Neighborhood News',
        description: 'Local neighborhood news and updates',
        type: 'custom',
        category: 'main_slides',
        component: 'CustomNewsWidget',
        enabled: true,
        order: 10,
        settings: {
          title: 'Ειδήσεις Συνοικίας',
          showTitle: true,
          gridSize: 'medium',
          backgroundColor: '#f0f9ff',
        },
        dataSource: '/api/custom/news',
        refreshInterval: 900,
        createdAt: new Date('2025-09-20'),
        updatedAt: new Date('2025-09-25'),
        createdBy: 1,
      },
    ];
    setWidgets([...systemWidgets, ...mockCustomWidgets].filter(w => w.enabled));
  }, [building]);

  useEffect(() => {
    if (!previewSettings.autoRotateSlides) return;

    const mainSlides = widgets.filter(w => w.category === 'main_slides');
    if (mainSlides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % mainSlides.length);
    }, previewSettings.slideInterval);

    return () => clearInterval(interval);
  }, [widgets, previewSettings.autoRotateSlides, previewSettings.slideInterval]);

  const mainSlides = widgets.filter(w => w.category === 'main_slides').sort((a, b) => a.order - b.order);
  const sidebarWidgets = widgets.filter(w => w.category === 'sidebar_widgets').sort((a, b) => a.order - b.order);
  const topBarWidgets = widgets.filter(w => w.category === 'top_bar_widgets').sort((a, b) => a.order - b.order);

  const currentSlide = mainSlides[currentSlideIndex];

  const getDeviceClasses = () => {
    switch (previewSettings.deviceType) {
      case 'mobile':
        return 'max-w-sm mx-auto';
      case 'tablet':
        return 'max-w-4xl mx-auto';
      default:
        return 'max-w-7xl mx-auto';
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kiosk Preview</h1>
          <p className="text-gray-600 mt-1">
            Προεπισκόπηση του kiosk display για το κτίριο {building?.name || 'Όλα τα κτίρια'}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Ανανέωση
          </Button>
          <Link href="/kiosk" target="_blank">
            <Button>
              <ExternalLink className="w-4 h-4 mr-2" />
              Άνοιγμα Kiosk
            </Button>
          </Link>
        </div>
      </div>

      {/* Preview Settings */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Ρυθμίσεις Προεπισκόπησης
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="managementOverlay">Management Overlay</Label>
            <Switch
              id="managementOverlay"
              checked={previewSettings.showManagementOverlay}
              onCheckedChange={(checked) => setPreviewSettings(prev => ({ ...prev, showManagementOverlay: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="kioskMode">Κατάσταση Kiosk</Label>
            <Switch
              id="kioskMode"
              checked={previewSettings.simulateKioskMode}
              onCheckedChange={(checked) => setPreviewSettings(prev => ({ ...prev, simulateKioskMode: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="autoRotate">Αυτόματη Εναλλαγή</Label>
            <Switch
              id="autoRotate"
              checked={previewSettings.autoRotateSlides}
              onCheckedChange={(checked) => setPreviewSettings(prev => ({ ...prev, autoRotateSlides: checked }))}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant={previewSettings.deviceType === 'desktop' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreviewSettings(prev => ({ ...prev, deviceType: 'desktop' }))}
            >
              <Monitor className="w-4 h-4" />
            </Button>
            <Button
              variant={previewSettings.deviceType === 'tablet' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreviewSettings(prev => ({ ...prev, deviceType: 'tablet' }))}
            >
              <Tablet className="w-4 h-4" />
            </Button>
            <Button
              variant={previewSettings.deviceType === 'mobile' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreviewSettings(prev => ({ ...prev, deviceType: 'mobile' }))}
            >
              <Smartphone className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Preview Container */}
      <div className={`${getDeviceClasses()} ${previewSettings.simulateKioskMode ? 'bg-black p-4' : ''}`}>
        <div className={`bg-white rounded-lg overflow-hidden ${previewSettings.simulateKioskMode ? 'shadow-2xl' : 'border'}`}>
          {/* Top Bar */}
          {topBarWidgets.length > 0 && (
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h1 className="text-xl font-bold">
                    {building?.name || 'Κτίριο'}
                  </h1>
                </div>
                <div className="flex items-center space-x-4">
                  {topBarWidgets.map((widget) => (
                    <div key={widget.id} className="text-sm">
                      <WidgetWrapper
                        widget={widget}
                        className="bg-transparent"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex">
            {/* Main Slides Area */}
            <div className="flex-1 p-6">
              {currentSlide ? (
                <div className="relative">
                  <WidgetWrapper
                    widget={currentSlide}
                    className="w-full"
                  />

                  {/* Slide Navigation */}
                  {mainSlides.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                      {mainSlides.map((_, index) => (
                        <button
                          key={index}
                          className={`w-3 h-3 rounded-full transition-all duration-200 ${
                            index === currentSlideIndex
                              ? 'bg-blue-600'
                              : 'bg-gray-300 hover:bg-gray-400'
                          }`}
                          onClick={() => setCurrentSlideIndex(index)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Slide Counter */}
                  {previewSettings.showManagementOverlay && mainSlides.length > 1 && (
                    <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs">
                      {currentSlideIndex + 1} / {mainSlides.length}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-20 text-gray-400">
                  <Monitor className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-lg">Δεν υπάρχουν ενεργά main slides</p>
                  <p className="text-sm mt-2">
                    Ενεργοποιήστε κάποια widgets στη διαχείριση
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            {sidebarWidgets.length > 0 && (
              <div className="w-80 bg-gray-50 p-4 space-y-4">
                {sidebarWidgets.map((widget) => (
                  <WidgetWrapper
                    key={widget.id}
                    widget={widget}
                    className="w-full"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Management Overlay */}
          {previewSettings.showManagementOverlay && (
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
              <div className="text-xs text-gray-600 space-y-1">
                <div>Mode: {previewSettings.simulateKioskMode ? 'Kiosk' : 'Preview'}</div>
                <div>Widgets: {widgets.length} ενεργά</div>
                <div>Slides: {mainSlides.length}</div>
                <div>Auto-rotate: {previewSettings.autoRotateSlides ? 'ON' : 'OFF'}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Widget Status */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Κατάσταση Widgets
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Main Slides</h3>
            <div className="space-y-1">
              {mainSlides.map((widget, index) => (
                <div
                  key={widget.id}
                  className={`text-sm p-2 rounded ${
                    index === currentSlideIndex
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {widget.name}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-700 mb-2">Sidebar Widgets</h3>
            <div className="space-y-1">
              {sidebarWidgets.map((widget) => (
                <div key={widget.id} className="text-sm p-2 rounded bg-green-100 text-green-800">
                  {widget.name}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-700 mb-2">Top Bar Widgets</h3>
            <div className="space-y-1">
              {topBarWidgets.map((widget) => (
                <div key={widget.id} className="text-sm p-2 rounded bg-purple-100 text-purple-800">
                  {widget.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-sm text-gray-600">
          Τελευταία ενημέρωση: {new Date().toLocaleTimeString('el-GR')}
        </p>
        <div className="flex space-x-2">
          <Link href="/kiosk-management/widgets">
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Διαχείριση Widgets
            </Button>
          </Link>
          <Link href="/kiosk-management">
            <Button variant="outline">
              Επιστροφή στο Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}