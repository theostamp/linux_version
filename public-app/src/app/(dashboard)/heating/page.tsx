'use client';

import { Loader2 } from 'lucide-react';
import { HeatingControlDashboard } from '@/components/iot/HeatingControlDashboard';
import { HeatingDemoDashboard } from '@/components/iot/HeatingDemoDashboard';
import { useBuilding } from '@/components/contexts/BuildingContext';

export default function IotHeatingPage() {
  const { buildingContext, isLoadingContext } = useBuilding();
  const iotAccess = Boolean(
    buildingContext?.billing?.iot_access ?? buildingContext?.billing?.iot_enabled ?? false
  );
  const upgradeHref = buildingContext?.id ? `/upgrade?building_id=${buildingContext.id}` : '/upgrade';

  if (isLoadingContext && !buildingContext) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p>Έλεγχος Premium + IoT...</p>
        </div>
      </div>
    );
  }

  if (!iotAccess) {
    return (
      <HeatingDemoDashboard
        buildingName={buildingContext?.name}
        upgradeHref={upgradeHref}
      />
    );
  }

  return (
    <div className="space-y-6">
      <HeatingControlDashboard
        buildingName={buildingContext?.name}
        buildingId={buildingContext?.id}
      />
    </div>
  );
}
