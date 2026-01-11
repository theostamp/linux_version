'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Settings, Eye, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function WidgetsPage() {
  return (
    <AuthGate role="any">
      <WidgetsContent />
    </AuthGate>
  );
}

interface Widget {
  id: string;
  name: string;
  greekName: string;
  description: string;
  greekDescription: string;
  category: string;
  icon: string;
  enabled: boolean;
  order: number;
  component: string;
  isCustom: boolean;
  lastModified: string;
}

function WidgetsContent() {
  const { currentBuilding, selectedBuilding, isLoading: isBuildingLoading } = useBuilding();
  const building = selectedBuilding || currentBuilding;

  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch widgets
  const fetchWidgets = async () => {
    if (!building?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      const response = await api.get(`/api/kiosk/configs/?building_id=${building.id}`);
      const data = response.data.widgets || [];

      // Sort by order and name
      data.sort((a: Widget, b: Widget) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.greekName.localeCompare(b.greekName, 'el');
      });

      setWidgets(data);
    } catch (err: any) {
      console.error('Failed to fetch widgets:', err);
      setError(err.response?.data?.detail || 'Αποτυχία φόρτωσης widgets');
      toast.error('Αποτυχία φόρτωσης widgets');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle widget enabled/disabled
  const toggleWidget = async (widgetId: string, currentEnabled: boolean) => {
    try {
      await api.patch(`/api/kiosk/configs/${widgetId}/`, {
        enabled: !currentEnabled
      });

      toast.success(`Widget ${!currentEnabled ? 'ενεργοποιήθηκε' : 'απενεργοποιήθηκε'}`);
      fetchWidgets();
    } catch (err: any) {
      console.error('Failed to toggle widget:', err);
      toast.error('Αποτυχία ενημέρωσης widget');
    }
  };

  // Delete widget
  const deleteWidget = async (widgetId: string, widgetName: string) => {
    if (!confirm(`Είστε σίγουροι ότι θέλετε να διαγράψετε το widget "${widgetName}";`)) {
      return;
    }

    try {
      await api.delete(`/api/kiosk/configs/${widgetId}/`);
      toast.success('Widget διαγράφηκε');
      fetchWidgets();
    } catch (err: any) {
      console.error('Failed to delete widget:', err);
      toast.error('Αποτυχία διαγραφής widget');
    }
  };

  useEffect(() => {
    if (!isBuildingLoading && building?.id) {
      fetchWidgets();
    }
  }, [building?.id, isBuildingLoading]);

  if (isBuildingLoading || isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/kiosk-management">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Πίσω
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </div>
    );
  }

  if (!building) {
    return (
      <div className="space-y-4">
        <Link href="/kiosk-management">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Πίσω
          </Button>
        </Link>
        <div className="text-center py-20">
          <p className="text-gray-600">Παρακαλώ επιλέξτε ένα κτίριο</p>
        </div>
      </div>
    );
  }

  // Group widgets by category
  const groupedWidgets = widgets.reduce((acc, widget) => {
    if (!acc[widget.category]) {
      acc[widget.category] = [];
    }
    acc[widget.category].push(widget);
    return acc;
  }, {} as Record<string, Widget[]>);

  const categoryNames: Record<string, string> = {
    main_slides: 'Κύριες Οθόνες',
    sidebar_widgets: 'Widgets Πλαϊνής Μπάρας',
    top_bar_widgets: 'Widgets Άνω Μπάρας',
    special_widgets: 'Ειδικά Widgets',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/kiosk-management">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Πίσω
            </Button>
          </Link>
          <div>
            <h1 className="page-title-sm">Διαχείριση Widgets</h1>
            <p className="text-sm text-gray-600">{building.name}</p>
          </div>
        </div>
        <Link href="/kiosk-management/widgets/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Νέο Widget
          </Button>
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Σύνολο Widgets</div>
          <div className="text-2xl font-bold text-gray-900">{widgets.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Ενεργά</div>
          <div className="text-2xl font-bold text-green-600">
            {widgets.filter(w => w.enabled).length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Custom Widgets</div>
          <div className="text-2xl font-bold text-blue-600">
            {widgets.filter(w => w.isCustom).length}
          </div>
        </Card>
      </div>

      {/* Widgets by Category */}
      {error && !widgets.length ? (
        <Card className="p-6 text-center">
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchWidgets} className="mt-4">
            Δοκιμάστε Ξανά
          </Button>
        </Card>
      ) : widgets.length === 0 ? (
        <Card className="p-12 text-center">
          <Settings className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Δεν υπάρχουν widgets</h3>
          <p className="text-gray-600 mb-6">
            Δημιουργήστε το πρώτο σας widget για να ξεκινήσετε
          </p>
          <Link href="/kiosk-management/widgets/create">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Δημιουργία Widget
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedWidgets).map(([category, categoryWidgets]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {categoryNames[category] || category}
                <Badge variant="outline" className="ml-2">{categoryWidgets.length}</Badge>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryWidgets.map((widget) => (
                  <Card key={widget.id} className={`p-4 ${!widget.enabled ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{widget.greekName}</h3>
                          {widget.isCustom && (
                            <Badge variant="secondary" className="text-xs">Custom</Badge>
                          )}
                          <Badge variant={widget.enabled ? 'default' : 'outline'} className="text-xs">
                            {widget.enabled ? 'Ενεργό' : 'Ανενεργό'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{widget.greekDescription}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>Component: {widget.component}</span>
                          <span>•</span>
                          <span>Order: {widget.order}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleWidget(widget.id, widget.enabled)}
                      >
                        {widget.enabled ? (
                          <><ToggleRight className="w-4 h-4 mr-1" /> Απενεργοποίηση</>
                        ) : (
                          <><ToggleLeft className="w-4 h-4 mr-1" /> Ενεργοποίηση</>
                        )}
                      </Button>
                      {widget.isCustom && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => deleteWidget(widget.id, widget.greekName)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Διαγραφή
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
