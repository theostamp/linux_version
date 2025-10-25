// frontend/app/(dashboard)/kiosk-management/widgets/create/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Eye,
  Settings,
  Type,
  Database,
  Image,
  Clock,
  Users,
  Monitor
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
import { KioskWidget, WidgetTemplate } from '@/types/kiosk';
import { getWidgetTemplate, WIDGET_TEMPLATES, validateWidgetSettings } from '@/lib/kiosk/widgets/registry';

export default function WidgetCreatePage() {
  const router = useRouter();
  const { currentBuilding, selectedBuilding } = useBuilding();
  const building = selectedBuilding || currentBuilding;

  const [selectedTemplate, setSelectedTemplate] = useState<WidgetTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'main_slides' as const,
    dataSource: '',
    refreshInterval: 300,
  });

  const [settings, setSettings] = useState({
    title: '',
    showTitle: true,
    gridSize: 'medium' as const,
    backgroundColor: '#ffffff',
    textColor: '#1e293b',
    borderRadius: 8,
    displayLimit: 10,
    animationType: 'fade' as const,
    animationDuration: 3000,
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    if (selectedTemplate) {
      setFormData(prev => ({
        ...prev,
        category: selectedTemplate.category as "main_slides",
      }));
      setSettings({
        ...settings,
        ...selectedTemplate.defaultSettings,
      });
    }
  }, [selectedTemplate]);

  const handleTemplateSelect = (template: WidgetTemplate) => {
    setSelectedTemplate(template);
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const validateForm = () => {
    const formErrors: string[] = [];

    if (!formData.name.trim()) {
      formErrors.push('Το όνομα του widget είναι υποχρεωτικό');
    }

    if (!formData.description.trim()) {
      formErrors.push('Η περιγραφή του widget είναι υποχρεωτική');
    }

    if (!selectedTemplate) {
      formErrors.push('Επιλέξτε ένα template για το widget');
    }

    const settingsErrors = validateWidgetSettings(settings);
    formErrors.push(...settingsErrors);

    setErrors(formErrors);
    return formErrors.length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    // Create new widget object
    const newWidget: Omit<KioskWidget, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
      name: formData.name,
      description: formData.description,
      type: 'custom',
      category: formData.category,
      component: `Custom${selectedTemplate?.id.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join('')}Widget`,
      enabled: false,
      order: 100, // Custom widgets start at order 100
      settings,
      dataSource: formData.dataSource || undefined,
      refreshInterval: formData.refreshInterval > 0 ? formData.refreshInterval : undefined,
    };

    // In a real implementation, this would make an API call
    console.log('Creating new widget:', newWidget);

    // Navigate back to widget management
    router.push('/kiosk-management/widgets');
  };

  const getTemplateIcon = (templateId: string) => {
    const icons = {
      'data-display': Database,
      'text-announcement': Type,
      'image-gallery': Image,
      'clock-timer': Clock,
      'contact-info': Users,
    };
    return icons[templateId as keyof typeof icons] || Monitor;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/kiosk-management/widgets">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Επιστροφή
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Δημιουργία Widget</h1>
            <p className="text-gray-600 mt-1">
              Δημιουργία νέου custom widget για το κτίριο {building?.name || 'Όλα τα κτίρια'}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {isPreviewMode ? 'Επεξεργασία' : 'Προεπισκόπηση'}
          </Button>
          <Button onClick={handleSave} disabled={!selectedTemplate}>
            <Save className="w-4 h-4 mr-2" />
            Αποθήκευση
          </Button>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <Card className="p-4 border-red-200 bg-red-50">
          <h3 className="font-medium text-red-900 mb-2">Σφάλματα φόρμας:</h3>
          <ul className="list-disc list-inside space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="text-sm text-red-700">{error}</li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Configuration */}
        <div className="space-y-6">
          {/* Template Selection */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Επιλογή Template
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {WIDGET_TEMPLATES.map((template) => {
                const Icon = getTemplateIcon(template.id);
                return (
                  <div
                    key={template.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedTemplate?.id === template.id ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          selectedTemplate?.id === template.id ? 'text-blue-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-900">{template.name}</h3>
                          <Badge className={getCategoryColor(template.category)}>
                            {getCategoryLabel(template.category)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {template.tags?.map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Basic Information */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Βασικές Πληροφορίες
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Όνομα Widget</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="π.χ. Νέα Συνοικίας"
                />
              </div>
              <div>
                <Label htmlFor="description">Περιγραφή</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Περιγράψτε τη λειτουργία του widget..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="category">Κατηγορία</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="main_slides">Κύρια Slides</option>
                  <option value="sidebar_widgets">Sidebar</option>
                  <option value="top_bar_widgets">Top Bar</option>
                  <option value="special_widgets">Ειδικά</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Data Source Configuration */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Πηγή Δεδομένων
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="dataSource">API Endpoint (προαιρετικό)</Label>
                <Input
                  id="dataSource"
                  value={formData.dataSource}
                  onChange={(e) => setFormData(prev => ({ ...prev, dataSource: e.target.value }))}
                  placeholder="/api/custom/data"
                />
              </div>
              <div>
                <Label htmlFor="refreshInterval">Συχνότητα Ανανέωσης (δευτερόλεπτα)</Label>
                <Input
                  id="refreshInterval"
                  type="number"
                  value={formData.refreshInterval}
                  onChange={(e) => setFormData(prev => ({ ...prev, refreshInterval: parseInt(e.target.value) || 300 }))}
                  min="0"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Settings & Preview */}
        <div className="space-y-6">
          {/* Widget Settings */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Ρυθμίσεις Εμφάνισης
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Τίτλος Widget</Label>
                <Input
                  id="title"
                  value={settings.title}
                  onChange={(e) => handleSettingChange('title', e.target.value)}
                  placeholder="Τίτλος που θα εμφανίζεται στο widget"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="showTitle">Εμφάνιση Τίτλου</Label>
                <Switch
                  id="showTitle"
                  checked={settings.showTitle}
                  onCheckedChange={(checked) => handleSettingChange('showTitle', checked)}
                />
              </div>

              <div>
                <Label htmlFor="gridSize">Μέγεθος</Label>
                <select
                  id="gridSize"
                  value={settings.gridSize}
                  onChange={(e) => handleSettingChange('gridSize', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="small">Μικρό</option>
                  <option value="medium">Μεσαίο</option>
                  <option value="large">Μεγάλο</option>
                  <option value="full">Πλήρες</option>
                </select>
              </div>

              <div>
                <Label htmlFor="backgroundColor">Χρώμα Φόντου</Label>
                <div className="flex space-x-2">
                  <Input
                    id="backgroundColor"
                    type="color"
                    value={settings.backgroundColor}
                    onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={settings.backgroundColor}
                    onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                    placeholder="#ffffff"
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="textColor">Χρώμα Κειμένου</Label>
                <div className="flex space-x-2">
                  <Input
                    id="textColor"
                    type="color"
                    value={settings.textColor}
                    onChange={(e) => handleSettingChange('textColor', e.target.value)}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={settings.textColor}
                    onChange={(e) => handleSettingChange('textColor', e.target.value)}
                    placeholder="#1e293b"
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="borderRadius">Στρογγυλοποίηση Γωνιών (px)</Label>
                <Input
                  id="borderRadius"
                  type="number"
                  value={settings.borderRadius}
                  onChange={(e) => handleSettingChange('borderRadius', parseInt(e.target.value) || 0)}
                  min="0"
                  max="50"
                />
              </div>

              {selectedTemplate?.tags?.includes('data') && (
                <div>
                  <Label htmlFor="displayLimit">Όριο Εμφάνισης</Label>
                  <Input
                    id="displayLimit"
                    type="number"
                    value={settings.displayLimit}
                    onChange={(e) => handleSettingChange('displayLimit', parseInt(e.target.value) || 10)}
                    min="1"
                    max="100"
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Widget Preview */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Προεπισκόπηση
            </h2>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
              {selectedTemplate ? (
                <div
                  className="min-h-[200px] rounded-lg p-4 transition-all duration-200"
                  style={{
                    backgroundColor: settings.backgroundColor,
                    color: settings.textColor,
                    borderRadius: `${settings.borderRadius}px`,
                  }}
                >
                  {settings.showTitle && settings.title && (
                    <div className="border-b border-black/10 pb-3 mb-4">
                      <h3 className="font-semibold text-lg">{settings.title}</h3>
                    </div>
                  )}
                  <div className="text-center text-gray-500">
                    <Monitor className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Προεπισκόπηση {selectedTemplate.name}</p>
                    <p className="text-xs mt-1">
                      Το περιεχόμενο θα εμφανιστεί εδώ
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400 py-12">
                  <Settings className="w-12 h-12 mx-auto mb-2" />
                  <p>Επιλέξτε ένα template για προεπισκόπηση</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}