'use client';

import { Monitor } from 'lucide-react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import PremiumFeatureInfo from '@/components/premium/PremiumFeatureInfo';

export default function KioskDisplayPromoPage() {
  const { buildingContext } = useBuilding();
  const upgradeHref = buildingContext?.id ? `/upgrade?building_id=${buildingContext.id}` : '/upgrade';

  return (
    <PremiumFeatureInfo
      title="Display kiosk info point"
      description="Η οθόνη εισόδου που ενημερώνει όλους χωρίς login, με δυναμικό περιεχόμενο και μοντέρνα παρουσία."
      note="Απαιτείται ενεργή Premium συνδρομή για το επιλεγμένο κτίριο."
      bullets={[
        'Πλήρης οθόνη ενημέρωσης με αυτόματη εναλλαγή scenes.',
        'Εμφάνιση ανακοινώσεων, ψηφοφοριών, οικονομικών και καιρού.',
        'QR σύνδεση για onboarding κατοίκων χωρίς αναμονή.',
        'Branding και προσαρμογή θεμάτων ανά κτίριο.',
      ]}
      highlights={[
        {
          title: 'Always-on ενημέρωση',
          description: 'Μόνιμη προβολή πληροφοριών στην είσοδο της πολυκατοικίας.',
        },
        {
          title: 'Dynamic περιεχόμενο',
          description: 'Αλλαγές σε πραγματικό χρόνο, χωρίς manual updates στην οθόνη.',
        },
        {
          title: 'Εύκολη εγκατάσταση',
          description: 'Απλό setup σε TV/monitor με ασφαλές public link.',
        },
      ]}
      tags={['Fullscreen', 'Scenes', 'QR Connect', 'Branding']}
      ctaHref={upgradeHref}
      ctaLabel="Αναβάθμιση Premium"
      icon={<Monitor className="h-5 w-5" />}
    />
  );
}
