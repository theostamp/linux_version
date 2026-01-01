'use client';

import type { ReactNode } from 'react';
import { Loader2, Settings } from 'lucide-react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import PremiumFeatureInfo from '@/components/premium/PremiumFeatureInfo';

export default function KioskManagementLayout({ children }: { children: ReactNode }) {
  const { buildingContext, isLoadingContext } = useBuilding();
  const premiumAccess = Boolean(
    buildingContext?.billing?.premium_access ?? buildingContext?.billing?.kiosk_enabled ?? false
  );
  const upgradeHref = buildingContext?.id ? `/upgrade?building_id=${buildingContext.id}` : '/upgrade';

  if (isLoadingContext && !buildingContext) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p>Έλεγχος Premium...</p>
        </div>
      </div>
    );
  }

  if (!premiumAccess) {
    return (
      <PremiumFeatureInfo
        title="Διαχείριση info point"
        description="Ρύθμισε scenes, widgets και πρόγραμμα προβολής για την οθόνη εισόδου με απόλυτο έλεγχο ανά κτίριο."
        note="Απαιτείται ενεργή Premium συνδρομή για το επιλεγμένο κτίριο."
        bullets={[
          'Δημιουργία scenes με έτοιμα templates και custom διατάξεις.',
          'Ενεργοποίηση/απενεργοποίηση widgets ανά κτίριο.',
          'Προγραμματισμός εναλλαγών και ροής περιεχομένου.',
          'Live preview πριν τη δημοσίευση.',
        ]}
        highlights={[
          {
            title: 'Scenes & layouts',
            description: 'Οργάνωσε το περιεχόμενο σε σκηνές με ευέλικτη διάταξη.',
          },
          {
            title: 'Widgets & περιεχόμενο',
            description: 'Διαχειρίσου announcements, οικονομικά, καιρούς και QR συνδέσεις.',
          },
          {
            title: 'Live preview',
            description: 'Δες ακριβώς τι θα εμφανιστεί στην οθόνη πριν το ενεργοποιήσεις.',
          },
        ]}
        tags={['Scenes', 'Widgets', 'Scheduling', 'Live Preview']}
        ctaHref={upgradeHref}
        ctaLabel="Αναβάθμιση Premium"
        icon={<Settings className="h-5 w-5" />}
      />
    );
  }

  return <>{children}</>;
}
