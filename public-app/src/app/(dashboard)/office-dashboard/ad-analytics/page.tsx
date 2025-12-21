'use client';

import { useEffect, useMemo, useState } from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useAuth } from '@/components/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { getEffectiveRole } from '@/lib/roleUtils';

type SummaryResponse = {
  tenant_schema: string;
  building_id: number | null;
  days: number;
  counts: Record<string, number>;
  placement_breakdown: Record<string, Record<string, number>>;
};

export default function AdAnalyticsPage() {
  const { user } = useAuth();
  const role = getEffectiveRole(user);
  const isUltraAdmin = Boolean(user?.role?.toLowerCase() === 'admin' && user?.is_superuser && user?.is_staff);

  const { selectedBuilding } = useBuilding();
  const buildingId = selectedBuilding?.id ?? null;

  const [data, setData] = useState<SummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    if (!buildingId) return;
    if (!isUltraAdmin) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<SummaryResponse>(`/ad-portal/analytics/summary/`, {
        params: { building_id: buildingId, days: 30 },
      });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Σφάλμα φόρτωσης');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId]);

  const counts = data?.counts ?? {};
  const placement = data?.placement_breakdown ?? {};

  const orderedKeys = useMemo(
    () => ['landing_view', 'trial_started', 'manage_view', 'creative_updated', 'checkout_started', 'payment_success', 'payment_failed'],
    []
  );

  if (!isUltraAdmin) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Μη εξουσιοδοτημένη πρόσβαση</CardTitle>
            <CardDescription>
              Αυτό το section είναι διαθέσιμο μόνο για Ultra Admin.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ad Portal Analytics</CardTitle>
          <CardDescription>
            Σύνοψη funnel για το επιλεγμένο κτίριο (τελευταίες 30 ημέρες).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Κτίριο: <span className="font-medium">{selectedBuilding?.name ?? '—'}</span>
            </div>
            <Button onClick={fetchSummary} disabled={isLoading || !buildingId}>
              {isLoading ? 'Φόρτωση…' : 'Ανανέωση'}
            </Button>
          </div>

          {error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : null}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {orderedKeys.map((k) => (
              <div key={k} className="rounded-md border p-3">
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{k}</div>
                <div className="text-2xl font-semibold">{counts[k] ?? 0}</div>
              </div>
            ))}
          </div>

          <div className="rounded-md border p-4">
            <div className="text-sm font-medium mb-2">Breakdown ανά placement</div>
            <div className="space-y-2 text-sm">
              {Object.keys(placement).length === 0 ? (
                <div className="text-muted-foreground">Δεν υπάρχουν δεδομένα ανά placement ακόμη.</div>
              ) : (
                Object.entries(placement).map(([eventType, byPlacement]) => (
                  <div key={eventType} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="font-medium">{eventType}</div>
                    <div className="text-muted-foreground">
                      {Object.entries(byPlacement)
                        .map(([p, v]) => `${p}: ${v}`)
                        .join(' • ')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


