// frontend/app/(dashboard)/kiosk-management/widgets/page.tsx

'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Eye, EyeOff, Settings, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { KioskWidget } from '@/types/kiosk';
import { getSystemWidgets, getWidgetIcon } from '@/lib/kiosk/widgets/registry';

export default function WidgetManagementPage() {
  const { currentBuilding, selectedBuilding } = useBuilding();
  const building = selectedBuilding || currentBuilding;

  // Mock data - in real implementation, this would come from API
  const [widgets, setWidgets] = useState<KioskWidget[]>(() => {
    const systemWidgets = getSystemWidgets(building?.id || 1);
    // Add some mock custom widgets
    const customWidgets: KioskWidget[] = [
      {
        id: 'custom_news_feed',
        name: 'Neighborhood News',
        description: 'Local neighborhood news and updates',
        type: 'custom',
        category: 'main_slides',
        component: 'CustomNewsWidget',
        enabled: false,
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
      {
        id: 'custom_events_calendar',
        name: 'Events Calendar',
        description: 'Upcoming building and community events',
        type: 'custom',
        category: 'sidebar_widgets',
        component: 'CustomEventsWidget',
        enabled: true,
        order: 10,
        settings: {
          title: 'Προσεχή Γεγονότα',
          showTitle: true,
          gridSize: 'small',
          backgroundColor: '#fef3c7',
        },
        createdAt: new Date('2025-09-22'),
        updatedAt: new Date('2025-09-27'),
        createdBy: 1,
      },
    ];
    return [...systemWidgets, ...customWidgets];
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Filter and search widgets
  const filteredWidgets = useMemo(() => {
    return widgets.filter(widget => {
      const matchesSearch = widget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          widget.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || widget.category === categoryFilter;
      const matchesType = typeFilter === 'all' || widget.type === typeFilter;

      return matchesSearch && matchesCategory && matchesType;
    });
  }, [widgets, searchTerm, categoryFilter, typeFilter]);

  const handleToggleWidget = (widgetId: string, enabled: boolean) => {
    setWidgets(prev => prev.map(widget =>
      widget.id === widgetId ? { ...widget, enabled } : widget
    ));
  };

  const handleDeleteWidget = (widgetId: string) => {
    if (confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το widget;')) {
      setWidgets(prev => prev.filter(widget => widget.id !== widgetId));
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      'main_slides': 'Κύρια Slides',
      'sidebar_widgets': 'Sidebar',
      'top_bar_widgets': 'Top Bar',
      'special_widgets': 'Ειδικά',
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'main_slides': 'bg-blue-100 text-blue-800',
      'sidebar_widgets': 'bg-green-100 text-green-800',
      'top_bar_widgets': 'bg-purple-100 text-purple-800',
      'special_widgets': 'bg-orange-100 text-orange-800',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const stats = {
    total: widgets.length,
    enabled: widgets.filter(w => w.enabled).length,
    disabled: widgets.filter(w => !w.enabled).length,
    custom: widgets.filter(w => w.type === 'custom').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Widget Management</h1>
          <p className="text-gray-600 mt-1">
            Διαχείριση όλων των widgets για το κτίριο {building?.name || 'Όλα τα κτίρια'}
          </p>
        </div>
        <Link href="/kiosk-management/widgets/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Δημιουργία Widget
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Σύνολο</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ενεργά</p>
              <p className="text-2xl font-bold text-green-600">{stats.enabled}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ανενεργά</p>
              <p className="text-2xl font-bold text-gray-600">{stats.disabled}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <EyeOff className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Custom</p>
              <p className="text-2xl font-bold text-purple-600">{stats.custom}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Plus className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Αναζήτηση widgets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Όλες οι κατηγορίες</option>
            <option value="main_slides">Κύρια Slides</option>
            <option value="sidebar_widgets">Sidebar</option>
            <option value="top_bar_widgets">Top Bar</option>
            <option value="special_widgets">Ειδικά</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Όλοι οι τύποι</option>
            <option value="system">System</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </Card>

      {/* Widget List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredWidgets.length === 0 ? (
          <Card className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Δεν βρέθηκαν widgets</h3>
            <p className="text-gray-600 mb-4">
              Δοκιμάστε να αλλάξετε τα φίλτρα αναζήτησης ή δημιουργήστε ένα νέο widget.
            </p>
            <Link href="/kiosk-management/widgets/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Δημιουργία Widget
              </Button>
            </Link>
          </Card>
        ) : (
          filteredWidgets.map((widget) => (
            <Card key={widget.id} className={`p-4 transition-all duration-200 hover:shadow-md ${
              widget.enabled ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  {/* Widget Icon */}
                  <div className="flex-shrink-0">
                    {(() => {
                      const IconComponent = getWidgetIcon(widget);
                      const iconBgColor = widget.enabled 
                        ? 'bg-green-100' 
                        : 'bg-gray-100';
                      const iconTextColor = widget.enabled 
                        ? 'text-green-600' 
                        : 'text-gray-600';
                      
                      return (
                        <div className={`w-12 h-12 ${iconBgColor} rounded-lg flex items-center justify-center transition-colors duration-200`}>
                          <IconComponent className={`w-6 h-6 ${iconTextColor}`} />
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{widget.name}</h3>
                      <Badge className={getCategoryColor(widget.category)}>
                        {getCategoryLabel(widget.category)}
                      </Badge>
                      {widget.type === 'custom' && (
                        <Badge variant="outline" className="border-purple-600 text-purple-600">
                          Custom
                        </Badge>
                      )}
                      {widget.type === 'system' && (
                        <Badge variant="outline" className="border-blue-600 text-blue-600">
                          System
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{widget.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Component: {widget.component}</span>
                      <span>Order: {widget.order}</span>
                      {widget.refreshInterval && (
                        <span>Refresh: {widget.refreshInterval}s</span>
                      )}
                      <span>
                        Updated: {widget.updatedAt.toLocaleDateString('el-GR')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Enable/Disable Toggle */}
                  <div className="flex items-center space-x-2">
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

                  {/* Edit Button */}
                  <Link href={`/kiosk-management/widgets/${widget.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>

                  {/* Delete Button (only for custom widgets) */}
                  {widget.type === 'custom' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteWidget(widget.id)}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-sm text-gray-600">
          Εμφάνιση {filteredWidgets.length} από {widgets.length} widgets
        </p>
        <div className="flex space-x-2">
          <Link href="/kiosk-management/preview">
            <Button variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              Preview Kiosk
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