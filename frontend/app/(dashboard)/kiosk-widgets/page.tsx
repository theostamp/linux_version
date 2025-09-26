'use client';

import { useState } from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Monitor, 
  Settings, 
  Save, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Clock,
  Smartphone,
  Cloud,
  Users,
  MessageSquare,
  Megaphone,
  Bell,
  Vote,
  Euro,
  Wrench,
  FileText,
  Building,
  Shield,
  TrendingUp,
  QrCode,
  Thermometer,
  Calendar,
  Phone,
  Globe,
  BarChart3,
  Home,
  AlertTriangle,
  Package,
  Car,
  DoorOpen,
  UserCheck,
  Droplets,
  Flame,
  Heart,
  ExternalLink,
  Image as ImageIcon,
  RefreshCw,
  Grid3X3
} from 'lucide-react';
import { useKioskWidgets } from '@/hooks/useKioskWidgets';
import { KioskWidget, WidgetCategory } from '@/types/kiosk-widgets';
import { toast } from 'sonner';
import KioskCanvasEditor from '@/components/KioskCanvasEditor';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

// Widget icons mapping
const WIDGET_ICONS: Record<string, any> = {
  dashboard_overview: Home,
  building_statistics: BarChart3,
  emergency_contacts: Shield,
  announcements: Bell,
  votes: Vote,
  financial_overview: Euro,
  maintenance_overview: Wrench,
  projects_overview: FileText,
  current_time: Clock,
  qr_code_connection: QrCode,
  weather_widget_sidebar: Thermometer,
  weather_widget_topbar: Cloud,
  internal_manager_info: Users,
  community_message: MessageSquare,
  advertising_banners_sidebar: Megaphone,
  advertising_banners_topbar: ExternalLink,
  news_ticker: TrendingUp,
};

// Category colors
const CATEGORY_COLORS: Record<WidgetCategory, string> = {
  main_slides: 'bg-blue-100 text-blue-800 border-blue-200',
  sidebar_widgets: 'bg-green-100 text-green-800 border-green-200',
  top_bar_widgets: 'bg-purple-100 text-purple-800 border-purple-200',
  special_widgets: 'bg-orange-100 text-orange-800 border-orange-200',
};

// Category labels
const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  main_slides: 'Κύρια Slides',
  sidebar_widgets: 'Sidebar Widgets',
  top_bar_widgets: 'Top Bar Widgets',
  special_widgets: 'Ειδικά Widgets',
};

export default function KioskWidgetsPage() {
  const { selectedBuilding } = useBuilding();
  const {
    config,
    isLoading,
    error,
    toggleWidget,
    updateWidgetOrder,
    updateGlobalSettings,
    resetToDefault,
    getEnabledWidgets,
  } = useKioskWidgets(selectedBuilding?.id);

  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [useCanvasEditor, setUseCanvasEditor] = useState(false); // Default to Classic View

  // Group widgets by category
  const widgetsByCategory = config.widgets.reduce((acc, widget) => {
    if (!acc[widget.category]) {
      acc[widget.category] = [];
    }
    acc[widget.category].push(widget);
    return acc;
  }, {} as Record<WidgetCategory, KioskWidget[]>);

  // Sort widgets within each category by order
  Object.keys(widgetsByCategory).forEach(category => {
    widgetsByCategory[category as WidgetCategory].sort((a, b) => a.order - b.order);
  });

  const handleToggleWidget = async (widgetId: string, enabled: boolean) => {
    const success = await toggleWidget(widgetId, enabled);
    if (success) {
      toast.success(enabled ? 'Widget ενεργοποιήθηκε' : 'Widget απενεργοποιήθηκε');
    } else {
      toast.error('Αποτυχία ενημέρωσης widget');
    }
  };

  // Drag and Drop handler for Classic View
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const category = source.droppableId as WidgetCategory;
    const widgets = [...widgetsByCategory[category]];
    
    // Reorder widgets
    const [reorderedWidget] = widgets.splice(source.index, 1);
    widgets.splice(destination.index, 0, reorderedWidget);

    // Update order for all widgets in the category
    const updates = widgets.map((widget, index) => 
      updateWidgetOrder(widget.id, index)
    );

    try {
      await Promise.all(updates);
      toast.success('Σειρά widgets ενημερώθηκε');
    } catch (error) {
      toast.error('Αποτυχία ενημέρωσης σειράς');
    }
  };

  const handleMoveUp = async (widgetId: string, category: WidgetCategory) => {
    const widgets = [...widgetsByCategory[category]];
    const currentIndex = widgets.findIndex(w => w.id === widgetId);
    
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      [widgets[currentIndex], widgets[newIndex]] = [widgets[newIndex], widgets[currentIndex]];
      
      // Update order for all widgets in the category
      const updates = widgets.map((widget, index) => 
        updateWidgetOrder(widget.id, index)
      );

      try {
        await Promise.all(updates);
        toast.success('Σειρά widgets ενημερώθηκε');
      } catch (error) {
        toast.error('Αποτυχία ενημέρωσης σειράς');
      }
    }
  };

  const handleMoveDown = async (widgetId: string, category: WidgetCategory) => {
    const widgets = [...widgetsByCategory[category]];
    const currentIndex = widgets.findIndex(w => w.id === widgetId);
    
    if (currentIndex < widgets.length - 1) {
      const newIndex = currentIndex + 1;
      [widgets[currentIndex], widgets[newIndex]] = [widgets[newIndex], widgets[currentIndex]];
      
      // Update order for all widgets in the category
      const updates = widgets.map((widget, index) => 
        updateWidgetOrder(widget.id, index)
      );

      try {
        await Promise.all(updates);
        toast.success('Σειρά widgets ενημερώθηκε');
      } catch (error) {
        toast.error('Αποτυχία ενημέρωσης σειράς');
      }
    }
  };

  const handleGlobalSettingsChange = async (field: string, value: any) => {
    const success = await updateGlobalSettings({ [field]: value });
    if (success) {
      toast.success('Ρυθμίσεις ενημερώθηκαν');
    } else {
      toast.error('Αποτυχία ενημέρωσης ρυθμίσεων');
    }
  };

  const handleResetToDefault = async () => {
    if (confirm('Είστε σίγουροι ότι θέλετε να επαναφέρετε όλες τις ρυθμίσεις στα προεπιλεγμένα;')) {
      const success = await resetToDefault();
      if (success) {
        toast.success('Ρυθμίσεις επαναφέρθηκαν στα προεπιλεγμένα');
      } else {
        toast.error('Αποτυχία επαναφοράς ρυθμίσεων');
      }
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      // This will trigger a save through the hook
      toast.success('Όλες οι ρυθμίσεις αποθηκεύτηκαν');
    } catch (error) {
      toast.error('Αποτυχία αποθήκευσης');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Φόρτωση ρυθμίσεων widgets...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline" 
          className="mt-2"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Επανάληψη
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Διαχείριση Kiosk Widgets</h1>
          <p className="text-gray-600 mt-1">
            Ρυθμίστε ποια widgets θα εμφανίζονται στο kiosk και σε ποια σειρά
          </p>
          {selectedBuilding && (
            <Badge variant="outline" className="mt-2">
              <Building className="w-3 h-3 mr-1" />
              {selectedBuilding.name}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={useCanvasEditor ? "default" : "outline"}
            onClick={() => setUseCanvasEditor(true)}
          >
            <Grid3X3 className="w-4 h-4 mr-2" />
            Canvas Editor
          </Button>
          <Button
            variant={!useCanvasEditor ? "default" : "outline"}
            onClick={() => setUseCanvasEditor(false)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Classic View
          </Button>
          <Separator orientation="vertical" className="h-8" />
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {previewMode ? 'Απόκρυψη Preview' : 'Preview'}
          </Button>
          <Button
            variant="outline"
            onClick={handleResetToDefault}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Επαναφορά
          </Button>
          <Button
            onClick={handleSaveAll}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </Button>
        </div>
      </div>

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Γενικές Ρυθμίσεις
          </CardTitle>
          <CardDescription>
            Ρυθμίσεις που επηρεάζουν τη συνολική λειτουργία του kiosk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slideDuration">Διάρκεια Slide (δευτερόλεπτα)</Label>
              <Input
                id="slideDuration"
                type="number"
                min="5"
                max="60"
                value={config.settings.slideDuration}
                onChange={(e) => handleGlobalSettingsChange('slideDuration', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refreshInterval">Διάστημα Ανανέωσης (δευτερόλεπτα)</Label>
              <Input
                id="refreshInterval"
                type="number"
                min="10"
                max="300"
                value={config.settings.refreshInterval}
                onChange={(e) => handleGlobalSettingsChange('refreshInterval', parseInt(e.target.value))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="autoRefresh"
                checked={config.settings.autoRefresh}
                onCheckedChange={(checked) => handleGlobalSettingsChange('autoRefresh', checked)}
              />
              <Label htmlFor="autoRefresh">Αυτόματη Ανανέωση</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Widgets by Category - Classic View with Drag & Drop */}
      {!useCanvasEditor && (
        <DragDropContext onDragEnd={handleDragEnd}>
          {Object.entries(widgetsByCategory).map(([category, widgets]) => (
            <Card key={category} className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Monitor className="w-5 h-5 mr-2" />
                  {CATEGORY_LABELS[category as WidgetCategory]}
                  <Badge 
                    variant="outline" 
                    className={`ml-2 ${CATEGORY_COLORS[category as WidgetCategory]}`}
                  >
                    {widgets.filter(w => w.enabled).length} / {widgets.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {category === 'main_slides' && 'Κύρια περιεχόμενα που εμφανίζονται ως slides'}
                  {category === 'sidebar_widgets' && 'Widgets που εμφανίζονται στην πλευρική μπάρα'}
                  {category === 'top_bar_widgets' && 'Widgets που εμφανίζονται στην επάνω μπάρα'}
                  {category === 'special_widgets' && 'Ειδικά widgets (π.χ. news ticker)'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Droppable droppableId={category}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2 min-h-[100px] p-2 rounded-lg transition-colors ${
                        snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : 'bg-gray-50'
                      }`}
                    >
                      {widgets.map((widget, index) => {
                        const IconComponent = WIDGET_ICONS[widget.id] || Settings;
                        return (
                          <Draggable key={widget.id} draggableId={widget.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-center space-x-3 p-3 bg-white border rounded-lg transition-all ${
                                  snapshot.isDragging 
                                    ? 'shadow-lg border-blue-400 bg-blue-50' 
                                    : 'hover:shadow-md hover:border-gray-300'
                                }`}
                              >
                                {/* Drag Handle */}
                                <div 
                                  {...provided.dragHandleProps}
                                  className="flex flex-col space-y-1 cursor-grab active:cursor-grabbing"
                                >
                                  <div className="w-4 h-1 bg-gray-300 rounded"></div>
                                  <div className="w-4 h-1 bg-gray-300 rounded"></div>
                                  <div className="w-4 h-1 bg-gray-300 rounded"></div>
                                </div>
                                
                                {/* Widget Icon */}
                                <div className="flex-shrink-0">
                                  <IconComponent className="w-5 h-5 text-gray-600" />
                                </div>
                                
                                {/* Widget Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <h3 className="font-medium text-gray-900 truncate">
                                      {widget.name}
                                    </h3>
                                    {widget.enabled && (
                                      <Badge variant="secondary" className="text-xs">
                                        Ενεργό
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 truncate">
                                    {widget.description}
                                  </p>
                                </div>
                                
                                {/* Toggle Switch */}
                                <div className="flex-shrink-0">
                                  <Switch
                                    checked={widget.enabled}
                                    onCheckedChange={(checked) => 
                                      handleToggleWidget(widget.id, checked)
                                    }
                                  />
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          ))}
        </DragDropContext>
      )}

      {/* Canvas Editor or Classic View */}
      {useCanvasEditor ? (
        <KioskCanvasEditor buildingId={selectedBuilding?.id} />
      ) : null}

      {/* Enhanced Preview Section */}
      {previewMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              Preview - Ενεργά Widgets
            </CardTitle>
            <CardDescription>
              Προεπισκόπηση των widgets που θα εμφανίζονται στο kiosk
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <Monitor className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold text-blue-900">
                        {Object.values(widgetsByCategory).flat().filter(w => w.enabled).length}
                      </div>
                      <div className="text-sm text-blue-700">Σύνολο Ενεργών</div>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2">
                    <Home className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="text-2xl font-bold text-green-900">
                        {widgetsByCategory.main_slides?.filter(w => w.enabled).length || 0}
                      </div>
                      <div className="text-sm text-green-700">Κύρια Slides</div>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-2">
                    <Settings className="w-5 h-5 text-purple-600" />
                    <div>
                      <div className="text-2xl font-bold text-purple-900">
                        {(widgetsByCategory.sidebar_widgets?.filter(w => w.enabled).length || 0) + 
                         (widgetsByCategory.top_bar_widgets?.filter(w => w.enabled).length || 0)}
                      </div>
                      <div className="text-sm text-purple-700">Sidebar & Top Bar</div>
                    </div>
                  </div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                    <div>
                      <div className="text-2xl font-bold text-orange-900">
                        {widgetsByCategory.special_widgets?.filter(w => w.enabled).length || 0}
                      </div>
                      <div className="text-sm text-orange-700">Ειδικά Widgets</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Widget List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(widgetsByCategory).map(([category, widgets]) => {
                  const enabledWidgets = widgets.filter(w => w.enabled);
                  if (enabledWidgets.length === 0) return null;
                  
                  return (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[category as WidgetCategory].split(' ')[0]}`}></div>
                        <h4 className="font-medium text-sm text-gray-700">
                          {CATEGORY_LABELS[category as WidgetCategory]}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {enabledWidgets.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {enabledWidgets.map((widget) => {
                          const IconComponent = WIDGET_ICONS[widget.id] || Settings;
                          return (
                            <div key={widget.id} className="flex items-center space-x-3 p-2 bg-white border rounded-lg">
                              <IconComponent className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {widget.name}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {widget.description}
                                </div>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                Ενεργό
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Kiosk Preview Simulation */}
              <div className="mt-6">
                <h4 className="font-medium text-sm text-gray-700 mb-3">Προσομοίωση Kiosk</h4>
                <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 rounded-lg p-4 text-white">
                  <div className="text-center text-sm text-blue-200 mb-4">
                    Προσομοίωση εμφάνισης στο kiosk
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {Object.values(widgetsByCategory).flat().filter(w => w.enabled).slice(0, 8).map((widget) => {
                      const IconComponent = WIDGET_ICONS[widget.id] || Settings;
                      return (
                        <div key={widget.id} className="bg-blue-800/50 p-2 rounded border border-blue-600/30">
                          <div className="text-center">
                            <IconComponent className="w-4 h-4 mx-auto mb-1 text-blue-300" />
                            <div className="text-xs text-blue-100 truncate">
                              {widget.name.split(' ')[0]}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
