'use client';

import { useBuilding } from '@/components/contexts/BuildingContext';
import GoogleMapsVisualization from '@/components/buildings/GoogleMapsVisualization';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import ErrorMessage from '@/components/ErrorMessage';
import { Loader2 } from 'lucide-react';

export default function MapVisualizationPage() {
  const { buildings, isLoading, error } = useBuilding();

  return (
    <AuthGate>
      <SubscriptionGate>
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="page-title">Οπτικοποίηση Χάρτη</h1>
            <p className="text-muted-foreground mt-2">
              Εμφάνιση όλων των κτιρίων σε διαδραστικό χάρτη Google Maps
            </p>
          </div>

          {error && (
            <div className="mb-6">
              <ErrorMessage message={error} />
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-sm text-muted-foreground">Φόρτωση δεδομένων...</p>
              </div>
            </div>
          ) : (
            <GoogleMapsVisualization buildings={buildings || []} />
          )}
        </div>
      </SubscriptionGate>
    </AuthGate>
  );
}
