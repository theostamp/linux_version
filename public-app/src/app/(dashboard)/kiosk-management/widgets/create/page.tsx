'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function CreateWidgetPage() {
  return (
    <AuthGate role="any">
      <CreateWidgetContent />
    </AuthGate>
  );
}

function CreateWidgetContent() {
  const router = useRouter();
  const { currentBuilding, selectedBuilding } = useBuilding();
  const building = selectedBuilding || currentBuilding;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    greekName: '',
    description: '',
    greekDescription: '',
    category: 'main_slides',
    icon: 'Settings',
    component: 'CustomWidget',
    order: 100,
    enabled: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!building?.id) {
      toast.error('Παρακαλώ επιλέξτε ένα κτίριο');
      return;
    }

    if (!formData.id || !formData.greekName) {
      toast.error('Παρακαλώ συμπληρώστε τα υποχρεωτικά πεδία');
      return;
    }

    try {
      setIsSubmitting(true);

      await api.post('/api/kiosk/configs/', {
        ...formData,
        buildingId: building.id,
        isCustom: true,
      });

      toast.success('Widget δημιουργήθηκε επιτυχώς');
      router.push('/kiosk-management/widgets');
    } catch (err: any) {
      console.error('Failed to create widget:', err);
      toast.error(err.response?.data?.detail || 'Αποτυχία δημιουργίας widget');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/kiosk-management/widgets">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Πίσω
          </Button>
        </Link>
        <div>
          <h1 className="page-title-sm">Δημιουργία Custom Widget</h1>
          <p className="text-sm text-gray-600">
            Δημιουργήστε ένα νέο προσαρμοσμένο widget για το kiosk
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card className="p-6">
          <div className="space-y-6">
            {/* Widget ID */}
            <div>
              <Label htmlFor="id">Widget ID *</Label>
              <Input
                id="id"
                value={formData.id}
                onChange={(e) => updateField('id', e.target.value)}
                placeholder="custom_widget_id"
                required
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Μοναδικό αναγνωριστικό (χρησιμοποιήστε snake_case)
              </p>
            </div>

            {/* Greek Name */}
            <div>
              <Label htmlFor="greekName">Ελληνικό Όνομα *</Label>
              <Input
                id="greekName"
                value={formData.greekName}
                onChange={(e) => updateField('greekName', e.target.value)}
                placeholder="Όνομα Widget"
                required
                className="mt-1"
              />
            </div>

            {/* English Name */}
            <div>
              <Label htmlFor="name">Αγγλικό Όνομα</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Widget Name"
                className="mt-1"
              />
            </div>

            {/* Greek Description */}
            <div>
              <Label htmlFor="greekDescription">Ελληνική Περιγραφή</Label>
              <Textarea
                id="greekDescription"
                value={formData.greekDescription}
                onChange={(e) => updateField('greekDescription', e.target.value)}
                placeholder="Περιγραφή του widget στα ελληνικά"
                rows={3}
                className="mt-1"
              />
            </div>

            {/* English Description */}
            <div>
              <Label htmlFor="description">Αγγλική Περιγραφή</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Widget description in English"
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">Κατηγορία *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => updateField('category', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main_slides">Κύριες Οθόνες</SelectItem>
                  <SelectItem value="sidebar_widgets">Πλαϊνή Μπάρα</SelectItem>
                  <SelectItem value="top_bar_widgets">Άνω Μπάρα</SelectItem>
                  <SelectItem value="special_widgets">Ειδικά</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Component */}
            <div>
              <Label htmlFor="component">Component Name *</Label>
              <Input
                id="component"
                value={formData.component}
                onChange={(e) => updateField('component', e.target.value)}
                placeholder="CustomWidget"
                required
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Το όνομα του React component που θα εμφανίζει το widget
              </p>
            </div>

            {/* Icon */}
            <div>
              <Label htmlFor="icon">Icon</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => updateField('icon', e.target.value)}
                placeholder="Settings"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Όνομα icon από το lucide-react (π.χ. Settings, Home, Clock)
              </p>
            </div>

            {/* Order */}
            <div>
              <Label htmlFor="order">Σειρά Εμφάνισης</Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) => updateField('order', parseInt(e.target.value))}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Χαμηλότερος αριθμός = εμφανίζεται πρώτο
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-8 pt-6 border-t">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Δημιουργία...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Δημιουργία Widget
                </>
              )}
            </Button>
            <Link href="/kiosk-management/widgets">
              <Button type="button" variant="outline">
                Ακύρωση
              </Button>
            </Link>
          </div>
        </Card>
      </form>
    </div>
  );
}
