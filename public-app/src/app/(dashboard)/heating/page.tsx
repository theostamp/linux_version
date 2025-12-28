'use client';

import { Flame, Loader2 } from 'lucide-react';
import { HeatingControlDashboard } from '@/components/iot/HeatingControlDashboard';
import { useBuilding } from '@/components/contexts/BuildingContext';
import PremiumFeatureInfo from '@/components/premium/PremiumFeatureInfo';

export default function IotHeatingPage() {
  const { buildingContext, isLoadingContext } = useBuilding();
  const premiumEnabled = Boolean(
    buildingContext?.billing?.kiosk_enabled ?? buildingContext?.premium_enabled ?? false
  );

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

  if (!premiumEnabled) {
    return (
      <PremiumFeatureInfo
        title="Smart Heating"
        description="Έλεγχος κεντρικής θέρμανσης με ωράρια, θερμοκρασίες και αυτοματισμούς IoT για κάθε κτίριο."
        note="Απαιτείται ενεργή Premium συνδρομή για το επιλεγμένο κτίριο."
        bullets={[
          'Χρονοπρογραμματισμός λειτουργίας ανά ημέρα και ζώνη.',
          'Ρύθμιση θερμοκρασιών και κανόνων λειτουργίας.',
          'Απομακρυσμένος έλεγχος και άμεση ενεργοποίηση.',
          'Ειδοποιήσεις για κατανάλωση και εξοικονόμηση.',
        ]}
        highlights={[
          {
            title: 'Ζώνες & ωράρια',
            description: 'Ορισμός προφίλ λειτουργίας για διαφορετικές ανάγκες.',
          },
          {
            title: 'IoT αυτοματισμοί',
            description: 'Σύνδεση με αισθητήρες για πιο έξυπνη λειτουργία.',
          },
          {
            title: 'Έλεγχος κόστους',
            description: 'Παρακολούθηση και βελτιστοποίηση κατανάλωσης.',
          },
        ]}
        tags={['IoT', 'Ωράρια', 'Ζώνες', 'Ειδοποιήσεις']}
        ctaHref="https://newconcierge.app/pricing"
        ctaLabel="Premium συνδρομή"
        ctaExternal
        icon={<Flame className="h-5 w-5" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      <HeatingControlDashboard />
    </div>
  );
}
