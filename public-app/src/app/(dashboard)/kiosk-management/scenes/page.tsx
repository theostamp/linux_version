'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Monitor, Eye, Loader2, PlayCircle, PauseCircle, Sparkles } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function ScenesPage() {
  return (
    <AuthGate role="any">
      <ScenesContent />
    </AuthGate>
  );
}

interface Scene {
  id: number;
  name: string;
  order: number;
  durationSeconds: number;
  transition: string;
  isEnabled: boolean;
  placements: any[];
  createdAt: string;
  updatedAt: string;
}

function ScenesContent() {
  const { currentBuilding, selectedBuilding, isLoading: isBuildingLoading } = useBuilding();
  const building = selectedBuilding || currentBuilding;

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingDefault, setIsCreatingDefault] = useState(false);

  // Fetch scenes
  const fetchScenes = async () => {
    if (!building?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      const response = await api.get(`/api/kiosk/scenes/?building_id=${building.id}`);
      const data = response.data.scenes || [];

      setScenes(data);
    } catch (err: any) {
      console.error('Failed to fetch scenes:', err);
      setError(err.response?.data?.detail || 'Αποτυχία φόρτωσης scenes');
    } finally {
      setIsLoading(false);
    }
  };

  // Create default "Πρωινή Επισκόπηση" scene
  const createDefaultScene = async () => {
    if (!building?.id) {
      toast.error('Παρακαλώ επιλέξτε ένα κτίριο');
      return;
    }

    try {
      setIsCreatingDefault(true);

      const response = await api.post('/api/kiosk/scenes/create_default_scene/', {
        buildingId: building.id,
      });

      toast.success('Το default scene "Πρωινή Επισκόπηση" δημιουργήθηκε επιτυχώς');
      fetchScenes();
    } catch (err: any) {
      console.error('Failed to create default scene:', err);
      const errorMsg = err.response?.data?.error || 'Αποτυχία δημιουργίας default scene';
      toast.error(errorMsg);
    } finally {
      setIsCreatingDefault(false);
    }
  };

  // Toggle scene enabled/disabled
  const toggleScene = async (sceneId: number, currentEnabled: boolean) => {
    try {
      await api.patch(`/api/kiosk/scenes/${sceneId}/`, {
        isEnabled: !currentEnabled
      });

      toast.success(`Scene ${!currentEnabled ? 'ενεργοποιήθηκε' : 'απενεργοποιήθηκε'}`);
      fetchScenes();
    } catch (err: any) {
      console.error('Failed to toggle scene:', err);
      toast.error('Αποτυχία ενημέρωσης scene');
    }
  };

  useEffect(() => {
    if (!isBuildingLoading && building?.id) {
      fetchScenes();
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
            <h1 className="page-title-sm">Διαχείριση Scenes</h1>
            <p className="text-sm text-gray-600">{building.name}</p>
          </div>
        </div>
        <Link href="/kiosk-management/preview">
          <Button variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
        </Link>
      </div>

      {/* Quick Info */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Τι είναι τα Scenes;</h3>
            <p className="text-sm text-gray-700 mb-3">
              Τα <strong>Scenes</strong> είναι προκαθορισμένες διατάξεις widgets που εμφανίζονται στο kiosk.
              Κάθε scene μπορεί να περιλαμβάνει πολλαπλά widgets σε συγκεκριμένες θέσεις και μέγεθος.
            </p>
            <p className="text-xs text-gray-600">
              💡 <strong>Συμβουλή:</strong> Ξεκινήστε με το default scene "Πρωινή Επισκόπηση" για άμεση εμφάνιση!
            </p>
          </div>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Σύνολο Scenes</div>
          <div className="text-2xl font-bold text-gray-900">{scenes.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Ενεργά Scenes</div>
          <div className="text-2xl font-bold text-green-600">
            {scenes.filter(s => s.isEnabled).length}
          </div>
        </Card>
      </div>

      {/* Scenes List or Empty State */}
      {scenes.length === 0 ? (
        <Card className="p-12 text-center">
          <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Δεν υπάρχουν scenes</h3>
          <p className="text-gray-600 mb-6">
            Δημιουργήστε το default scene "Πρωινή Επισκόπηση" για να ξεκινήσετε
          </p>
          <Button onClick={createDefaultScene} disabled={isCreatingDefault}>
            {isCreatingDefault ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Δημιουργία...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Δημιουργία Default Scene
              </>
            )}
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {scenes.map((scene) => (
            <Card key={scene.id} className={`p-6 ${!scene.isEnabled ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{scene.name}</h3>
                    <Badge variant={scene.isEnabled ? 'default' : 'outline'}>
                      {scene.isEnabled ? 'Ενεργό' : 'Ανενεργό'}
                    </Badge>
                    {scene.name === 'Πρωινή Επισκόπηση' && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                    <div>
                      <span className="font-medium">Διάρκεια:</span> {scene.durationSeconds}s
                    </div>
                    <div>
                      <span className="font-medium">Widgets:</span> {scene.placements?.length || 0}
                    </div>
                    <div>
                      <span className="font-medium">Σειρά:</span> {scene.order}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Ενημερώθηκε: {new Date(scene.updatedAt).toLocaleString('el-GR')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleScene(scene.id, scene.isEnabled)}
                  >
                    {scene.isEnabled ? (
                      <><PauseCircle className="w-4 h-4 mr-1" /> Απενεργοποίηση</>
                    ) : (
                      <><PlayCircle className="w-4 h-4 mr-1" /> Ενεργοποίηση</>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
