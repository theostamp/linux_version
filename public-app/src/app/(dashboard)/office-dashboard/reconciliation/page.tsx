'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AuthGate from '@/components/AuthGate';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, RefreshCw } from 'lucide-react';

type TotalsByStatusRow = { status: string; total_amount: number };
type ReconciliationSummary = {
  building?: string | null;
  period?: string | null;
  totals_by_status: TotalsByStatusRow[];
  total_amount: number;
};

async function fetchSummary(buildingId?: number, period?: string): Promise<ReconciliationSummary> {
  const params: Record<string, string | number> = {};
  if (buildingId) params.building = buildingId;
  if (period) params.period = period;
  return apiGet<ReconciliationSummary>('/online-payments/reconciliation/summary/', params);
}

export default function ReconciliationPage() {
  const { selectedBuilding } = useBuilding();
  const buildingId = selectedBuilding?.id;
  const [period, setPeriod] = useState<string>('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['online-reconciliation', buildingId, period],
    queryFn: () => fetchSummary(buildingId, period || undefined),
    enabled: !!buildingId,
  });

  const rows = useMemo(() => data?.totals_by_status || [], [data]);

  const downloadCsv = () => {
    const params = new URLSearchParams();
    if (buildingId) params.set('building', String(buildingId));
    if (period) params.set('period', period);
    const url = `/api/online-payments/exports/reconciliation.csv?${params.toString()}`;
    window.location.href = url;
  };

  return (
    <AuthGate role="any">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Reconciliation (Online Payments)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Κτίριο</div>
                <div className="text-sm font-medium">{selectedBuilding?.name || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Περίοδος</div>
                <Input placeholder="YYYY-MM (π.χ. 2025-12)" value={period} onChange={(e) => setPeriod(e.target.value)} />
              </div>
              <div className="flex items-end gap-2">
                <Button variant="outline" onClick={() => refetch()} disabled={isLoading} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Ανανέωση
                </Button>
                <Button onClick={downloadCsv} disabled={!buildingId} className="gap-2">
                  <Download className="w-4 h-4" />
                  CSV
                </Button>
              </div>
            </div>

            <div className="text-sm">
              Σύνολο: <span className="font-semibold">{(data?.total_amount ?? 0).toFixed(2)}€</span>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3">Status</th>
                    <th className="text-right p-3">Σύνολο</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.status} className="border-t">
                      <td className="p-3">{r.status}</td>
                      <td className="p-3 text-right">{Number(r.total_amount || 0).toFixed(2)}€</td>
                    </tr>
                  ))}
                  {!rows.length ? (
                    <tr>
                      <td className="p-3 text-muted-foreground" colSpan={2}>
                        {isLoading ? 'Φόρτωση…' : 'Δεν υπάρχουν δεδομένα.'}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGate>
  );
}
