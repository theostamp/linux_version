'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { 
  X, 
  Plus, 
  Save,
  Eye,
  Settings
} from 'lucide-react';

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (widget: any) => void;
}

const WIDGET_CATEGORIES = [
  { value: 'main_slides', label: 'Κύρια Slides' },
  { value: 'sidebar_widgets', label: 'Sidebar Widgets' },
  { value: 'top_bar_widgets', label: 'Top Bar Widgets' },
  { value: 'special_widgets', label: 'Ειδικά Widgets' },
];

const WIDGET_ICONS = [
  'Building2', 'Users', 'Phone', 'Bell', 'Vote', 'Euro', 'Wrench', 'FolderOpen',
  'Receipt', 'Thermometer', 'Home', 'Zap', 'Shield', 'Car', 'Calendar', 'Recycle',
  'Clock', 'QrCode', 'Cloud', 'User', 'MessageCircle', 'Megaphone', 'Settings', 'Monitor'
];

export default function AddWidgetModal({ isOpen, onClose, onSave }: AddWidgetModalProps) {
  const [widget, setWidget] = useState({
    id: '',
    name: '',
    greekName: '',
    description: '',
    greekDescription: '',
    category: 'main_slides',
    icon: 'Settings',
    enabled: true,
    order: 100,
    settings: {},
    component: '',
    dataSource: '',
    isCustom: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateWidget = () => {
    const newErrors: Record<string, string> = {};

    if (!widget.id.trim()) {
      newErrors.id = 'Widget ID is required';
    } else if (!/^[a-z_]+$/.test(widget.id)) {
      newErrors.id = 'Widget ID must contain only lowercase letters and underscores';
    }

    if (!widget.name.trim()) {
      newErrors.name = 'Widget name is required';
    }

    if (!widget.greekName.trim()) {
      newErrors.greekName = 'Greek name is required';
    }

    if (!widget.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!widget.greekDescription.trim()) {
      newErrors.greekDescription = 'Greek description is required';
    }

    if (!widget.component.trim()) {
      newErrors.component = 'Component name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateWidget()) {
      onSave({
        ...widget,
        id: widget.id.trim().toLowerCase(),
        order: Math.floor(Math.random() * 1000) + 100 // Random order for new widgets
      });
      onClose();
      // Reset form
      setWidget({
        id: '',
        name: '',
        greekName: '',
        description: '',
        greekDescription: '',
        category: 'main_slides',
        icon: 'Settings',
        enabled: true,
        order: 100,
        settings: {},
        component: '',
        dataSource: '',
        isCustom: true
      });
      setErrors({});
    }
  };

  const generateId = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Plus className="w-6 h-6 mr-2 text-blue-600" />
              Add New Widget
            </h2>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-gray-600" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="id">Widget ID *</Label>
                  <Input
                    id="id"
                    value={widget.id}
                    onChange={(e) => setWidget({ ...widget, id: e.target.value })}
                    placeholder="e.g., my_custom_widget"
                    className={errors.id ? 'border-red-500' : ''}
                  />
                  {errors.id && <p className="text-red-500 text-sm mt-1">{errors.id}</p>}
                </div>

                <div>
                  <Label htmlFor="component">Component Name *</Label>
                  <Input
                    id="component"
                    value={widget.component}
                    onChange={(e) => setWidget({ ...widget, component: e.target.value })}
                    placeholder="e.g., MyCustomWidget"
                    className={errors.component ? 'border-red-500' : ''}
                  />
                  {errors.component && <p className="text-red-500 text-sm mt-1">{errors.component}</p>}
                </div>

                <div>
                  <Label htmlFor="name">Widget Name (English) *</Label>
                  <Input
                    id="name"
                    value={widget.name}
                    onChange={(e) => {
                      setWidget({ 
                        ...widget, 
                        name: e.target.value,
                        id: generateId(e.target.value)
                      });
                    }}
                    placeholder="e.g., My Custom Widget"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <Label htmlFor="greekName">Widget Name (Greek) *</Label>
                  <Input
                    id="greekName"
                    value={widget.greekName}
                    onChange={(e) => setWidget({ ...widget, greekName: e.target.value })}
                    placeholder="e.g., Το Δικό Μου Widget"
                    className={errors.greekName ? 'border-red-500' : ''}
                  />
                  {errors.greekName && <p className="text-red-500 text-sm mt-1">{errors.greekName}</p>}
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={widget.category} onValueChange={(value) => setWidget({ ...widget, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WIDGET_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="icon">Icon</Label>
                  <Select value={widget.icon} onValueChange={(value) => setWidget({ ...widget, icon: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WIDGET_ICONS.map((icon) => (
                        <SelectItem key={icon} value={icon}>
                          {icon}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Descriptions */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Descriptions</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="description">Description (English) *</Label>
                  <Textarea
                    id="description"
                    value={widget.description}
                    onChange={(e) => setWidget({ ...widget, description: e.target.value })}
                    placeholder="Brief description of what this widget does"
                    rows={3}
                    className={errors.description ? 'border-red-500' : ''}
                  />
                  {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                </div>

                <div>
                  <Label htmlFor="greekDescription">Description (Greek) *</Label>
                  <Textarea
                    id="greekDescription"
                    value={widget.greekDescription}
                    onChange={(e) => setWidget({ ...widget, greekDescription: e.target.value })}
                    placeholder="Σύντομη περιγραφή του τι κάνει αυτό το widget"
                    rows={3}
                    className={errors.greekDescription ? 'border-red-500' : ''}
                  />
                  {errors.greekDescription && <p className="text-red-500 text-sm mt-1">{errors.greekDescription}</p>}
                </div>
              </div>
            </div>

            {/* Data Source */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Data Configuration</h3>
              <div>
                <Label htmlFor="dataSource">Data Source (Optional)</Label>
                <Input
                  id="dataSource"
                  value={widget.dataSource}
                  onChange={(e) => setWidget({ ...widget, dataSource: e.target.value })}
                  placeholder="e.g., /api/my-widget-data"
                />
                <p className="text-sm text-gray-500 mt-1">
                  API endpoint to fetch data for this widget
                </p>
              </div>
            </div>

            {/* Settings */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Initial Settings</h3>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={widget.enabled}
                  onCheckedChange={(checked) => setWidget({ ...widget, enabled: checked })}
                />
                <Label>Enable widget by default</Label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 mt-8 pt-6 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex items-center">
              <Save className="w-4 h-4 mr-2" />
              Add Widget
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
