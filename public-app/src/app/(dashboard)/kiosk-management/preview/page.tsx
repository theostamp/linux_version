'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Monitor, ExternalLink, Maximize2 } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PreviewPage() {
  return (
    <AuthGate role="any">
      <PreviewContent />
    </AuthGate>
  );
}

function PreviewContent() {
  const { currentBuilding, selectedBuilding } = useBuilding();
  const building = selectedBuilding || currentBuilding;

  const kioskUrl = building?.id 
    ? `/kiosk?building_id=${building.id}`
    : '/kiosk';

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)]">
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
            <h1 className="text-2xl font-bold text-gray-900">Live Preview</h1>
            <p className="text-sm text-gray-600">
              Προεπισκόπηση του Kiosk Display
              {building && ` - ${building.name}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={kioskUrl} target="_blank">
            <Button>
              <ExternalLink className="w-4 h-4 mr-2" />
              Άνοιγμα σε Νέο Tab
            </Button>
          </Link>
        </div>
      </div>

      {/* Preview Frame */}
      <Card className="p-6 h-full">
        <div className="flex items-center justify-between mb-4 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Kiosk Display Preview</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Maximize2 className="w-4 h-4" />
            Recommended: 1920x1080 (Full HD)
          </div>
        </div>

        {/* iFrame Container */}
        <div className="relative w-full bg-gray-900 rounded-lg overflow-hidden shadow-2xl" style={{ height: 'calc(100% - 5rem)' }}>
          <iframe
            src={kioskUrl}
            className="w-full h-full border-0"
            title="Kiosk Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </Card>

      {/* Info Card */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Monitor className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 text-sm">
            <p className="text-gray-700 mb-2">
              <strong>Συμβουλή:</strong> Το preview εμφανίζει το kiosk όπως ακριβώς θα φαίνεται στους κατοίκους.
            </p>
            <p className="text-gray-600 text-xs">
              • Οι αλλαγές στα scenes και widgets εμφανίζονται αυτόματα<br />
              • Για πλήρη προεπισκόπηση ανοίξτε σε νέο tab<br />
              • Βεβαιωθείτε ότι έχετε ενεργοποιήσει τουλάχιστον ένα scene
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

