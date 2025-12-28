'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Lock, Building2, Mail } from 'lucide-react';

const premiumFeatures = [
  'Kiosk Display (οθόνη πολυκατοικίας)',
  'Kiosk Management (widgets/scenes/ρυθμίσεις)',
  'AI λειτουργίες (Premium)',
  'Smart Heating / IoT λειτουργίες (όπου υποστηρίζονται)',
];

export default function UpgradePage() {
  const searchParams = useSearchParams();
  const buildingIdParam = searchParams.get('building_id');

  const { selectedBuilding, buildingContext } = useBuilding();
  const billing = buildingContext?.billing;

  const resolvedBuildingId =
    selectedBuilding?.id ?? (buildingIdParam ? Number(buildingIdParam) : undefined);
  const resolvedBuildingName = selectedBuilding?.name ?? buildingContext?.name ?? '—';

  const accountType = billing?.account_type ?? null;
  const isOfficeAccount = accountType === 'office';

  const premiumEnabled =
    billing?.premium_enabled ?? buildingContext?.premium_enabled ?? false;
  const kioskEnabled = billing?.kiosk_enabled ?? false;

  const mailtoHref = React.useMemo(() => {
    const subject = 'Αναβάθμιση σε Premium (Kiosk + AI)';
    const bodyLines = [
      'Γεια σας,',
      '',
      'Θέλω αναβάθμιση σε Premium (Kiosk + AI) για το παρακάτω:',
      `- Κτίριο: ${resolvedBuildingName}`,
      resolvedBuildingId ? `- Building ID: ${resolvedBuildingId}` : null,
      '',
      'Παρακαλώ στείλτε μου τα επόμενα βήματα.',
      '',
      'Ευχαριστώ,',
    ].filter(Boolean) as string[];

    const body = encodeURIComponent(bodyLines.join('\n'));
    return `mailto:sales@newconcierge.app?subject=${encodeURIComponent(subject)}&body=${body}`;
  }, [resolvedBuildingId, resolvedBuildingName]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Αναβάθμιση</h1>
          <p className="text-muted-foreground">
            Ξεκλείδωσε Premium λειτουργίες (Kiosk + AI) ανά πολυκατοικία.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/my-subscription">Μετάβαση στη Συνδρομή</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-xl">Κτίριο</CardTitle>
          </div>
          <CardDescription>
            {resolvedBuildingName}{' '}
            {resolvedBuildingId ? (
              <span className="text-muted-foreground">(ID: {resolvedBuildingId})</span>
            ) : null}
          </CardDescription>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Account: {accountType ?? '—'}</Badge>
            <Badge variant={premiumEnabled ? 'default' : 'secondary'}>
              Premium: {premiumEnabled ? 'Ενεργό' : 'Ανενεργό'}
            </Badge>
            <Badge variant={kioskEnabled ? 'default' : 'secondary'}>
              Kiosk: {kioskEnabled ? 'Ενεργό' : 'Κλειδωμένο'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isOfficeAccount && (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <Lock className="h-4 w-4" />
                Premium μόνο για γραφεία διαχείρισης
              </div>
              <p className="mt-1 text-muted-foreground">
                Το Premium (Kiosk + AI) δεν είναι διαθέσιμο για μεμονωμένους διαχειριστές.
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">Premium (Kiosk + AI)</CardTitle>
                <CardDescription>
                  Ενεργοποιείται ανά κτίριο. Η χρέωση γίνεται ανά διαμέρισμα (volume discounts σε
                  μεγάλες κλίμακες).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {premiumFeatures.map((feature) => (
                  <div key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <span>{feature}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">Τι πρέπει να κάνω τώρα;</CardTitle>
                <CardDescription>
                  Μέχρι να γίνει πλήρως self-serve η αναβάθμιση, η ενεργοποίηση γίνεται από την ομάδα
                  μας.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button asChild>
                  <a href={mailtoHref}>
                    <Mail className="mr-2 h-4 w-4" />
                    Ζήτησε αναβάθμιση
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/my-subscription">Δες τη συνδρομή σου</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


