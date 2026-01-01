'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Settings as SettingsIcon } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function SettingsPage() {
  return (
    <AuthGate role="any">
      <SettingsContent />
    </AuthGate>
  );
}

interface KioskSettings {
  slideDuration: number;
  autoSlide: boolean;
  showNavigation: boolean;
  theme: string;
}

function SettingsContent() {
  const { currentBuilding, selectedBuilding, isLoading: isBuildingLoading } = useBuilding();
  const building = selectedBuilding || currentBuilding;

  const [settings, setSettings] = useState<KioskSettings>({
    slideDuration: 10000,
    autoSlide: true,
    showNavigation: true,
    theme: 'default',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch settings
  const fetchSettings = async () => {
    if (!building?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.get(`/api/kiosk/display-configs/?building_id=${building.id}`);

      if (response.data && response.data.length > 0) {
        const config = response.data[0];
        setSettings({
          slideDuration: config.slideDuration || 10000,
          autoSlide: config.autoSlide ?? true,
          showNavigation: config.showNavigation ?? true,
          theme: config.theme || 'default',
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch settings:', err);
      // If 404, it means no settings exist yet, which is fine
      if (err.response?.status !== 404) {
        toast.error('Αποτυχία φόρτωσης ρυθμίσεων');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Save settings
  const saveSettings = async () => {
    if (!building?.id) {
      toast.error('Παρακαλώ επιλέξτε ένα κτίριο');
      return;
    }

    try {
      setIsSaving(true);

      await api.post('/api/kiosk/display-configs/', {
        buildingId: building.id,
        ...settings,
      });

      toast.success('Οι ρυθμίσεις αποθηκεύτηκαν επιτυχώς');
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      toast.error('Αποτυχία αποθήκευσης ρυθμίσεων');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!isBuildingLoading && building?.id) {
      fetchSettings();
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

  return (
    <div className="space-y-6 max-w-2xl">
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
            <h1 className="text-2xl font-bold text-gray-900">Ρυθμίσεις Kiosk</h1>
            <p className="text-sm text-gray-600">{building.name}</p>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <Card className="p-6">
        <div className="space-y-6">
          {/* Slide Duration */}
          <div>
            <Label htmlFor="slideDuration">Διάρκεια Slide (milliseconds)</Label>
            <Input
              id="slideDuration"
              type="number"
              value={settings.slideDuration}
              onChange={(e) => setSettings({ ...settings, slideDuration: parseInt(e.target.value) })}
              min={1000}
              step={1000}
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Πόσο καιρό θα εμφανίζεται κάθε scene (1000ms = 1 δευτερόλεπτο)
            </p>
          </div>

          {/* Auto Slide */}
          <div className="flex items-center justify-between py-4 border-y">
            <div className="space-y-0.5">
              <Label htmlFor="autoSlide">Αυτόματη Εναλλαγή Slides</Label>
              <p className="text-xs text-gray-500">
                Αυτόματη μετάβαση στο επόμενο scene μετά τη διάρκεια slide
              </p>
            </div>
            <Switch
              id="autoSlide"
              checked={settings.autoSlide}
              onCheckedChange={(checked) => setSettings({ ...settings, autoSlide: checked })}
            />
          </div>

          {/* Show Navigation */}
          <div className="flex items-center justify-between py-4 border-b">
            <div className="space-y-0.5">
              <Label htmlFor="showNavigation">Εμφάνιση Πλοήγησης</Label>
              <p className="text-xs text-gray-500">
                Εμφάνιση των κουμπιών πλοήγησης στο kiosk
              </p>
            </div>
            <Switch
              id="showNavigation"
              checked={settings.showNavigation}
              onCheckedChange={(checked) => setSettings({ ...settings, showNavigation: checked })}
            />
          </div>

          {/* Theme (placeholder) */}
          <div>
            <Label htmlFor="theme">Θέμα</Label>
            <Input
              id="theme"
              value={settings.theme}
              onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
              placeholder="default"
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Το θέμα εμφάνισης του kiosk (default ή custom theme name)
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-8 pt-6 border-t">
          <Button onClick={saveSettings} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Αποθήκευση...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Αποθήκευση Ρυθμίσεων
              </>
            )}
          </Button>
          <Button variant="outline" onClick={fetchSettings}>
            Επαναφορά
          </Button>
        </div>
      </Card>

      {/* Info */}
      <Card className="p-4 bg-purple-50 border-purple-200">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <SettingsIcon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 text-sm">
            <p className="text-gray-700 mb-2">
              <strong>Σημείωση:</strong> Οι ρυθμίσεις ισχύουν για όλα τα scenes του κτιρίου.
            </p>
            <p className="text-gray-600 text-xs">
              • Οι αλλαγές εφαρμόζονται άμεσα στο public kiosk<br />
              • Συνιστάται διάρκεια 10-30 δευτερόλεπτα ανά scene<br />
              • Δοκιμάστε τις αλλαγές στο Preview πριν τις εφαρμόσετε
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
