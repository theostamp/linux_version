'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, FileText, TrendingUp, AlertTriangle, CheckCircle, Wrench } from 'lucide-react';
import { fetchServiceReceipts, fetchScheduledMaintenances, type ServiceReceipt, type ScheduledMaintenance } from '@/lib/api';
import { useBuilding } from '@/components/contexts/BuildingContext';

export default function MaintenanceReportsPage() {
  const { selectedBuilding, currentBuilding } = useBuilding();
  const buildingId = selectedBuilding?.id || currentBuilding?.id;

  const { data: receipts = [], isLoading: loadingReceipts } = useQuery<ServiceReceipt[]>({
    queryKey: ['maintenance', 'reports', 'receipts', { buildingId }],
    queryFn: () => fetchServiceReceipts({ buildingId: buildingId ?? undefined }),
    staleTime: 30_000,
  });

  const { data: scheduled = [], isLoading: loadingScheduled } = useQuery<ScheduledMaintenance[]>({
    queryKey: ['maintenance', 'reports', 'scheduled', { buildingId }],
    queryFn: () => fetchScheduledMaintenances({ buildingId: buildingId ?? undefined, ordering: 'scheduled_date' }),
    staleTime: 30_000,
  });

  const kpis = useMemo(() => {
    const totalExpense = receipts.reduce((sum, r) => {
      const val = typeof r.amount === 'string' ? parseFloat(r.amount) : (r.amount || 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    const pendingReceipts = receipts.filter(r => r.payment_status === 'pending').length;
    const overdueReceipts = receipts.filter(r => r.payment_status === 'overdue').length;
    const scheduledActive = scheduled.filter(m => m.status === 'scheduled' || m.status === 'in_progress');
    const scheduledCount = scheduledActive.length;
    const urgentCount = scheduledActive.filter(m => m.priority === 'urgent').length;
    const completedMaint = scheduled.filter(m => m.status === 'completed').length;
    return { totalExpense, pendingReceipts, overdueReceipts, scheduledCount, urgentCount, completedMaint };
  }, [receipts, scheduled]);

  const loading = loadingReceipts || loadingScheduled;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Συντηρήσεις • Reports</h1>
          <p className="text-muted-foreground">Σύνοψη δαπανών και προγραμματισμένων εργασιών</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/maintenance">
            <ArrowLeft className="w-4 h-4 mr-2" /> Πίσω
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  Συνολικές Δαπάνες
                  <TrendingUp className="w-4 h-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{kpis.totalExpense.toLocaleString('el-GR')}</div>
                <p className="text-xs text-muted-foreground">Από αποδείξεις υπηρεσιών</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  Εκκρεμείς Αποδείξεις
                  <FileText className="w-4 h-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.pendingReceipts}</div>
                <p className="text-xs text-muted-foreground">Προς εξόφληση</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  Ληγμένες Αποδείξεις
                  <AlertTriangle className="w-4 h-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.overdueReceipts}</div>
                <p className="text-xs text-muted-foreground">Απαιτείται ενέργεια</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  Ενεργά Έργα
                  <Wrench className="w-4 h-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.scheduledCount}</div>
                <p className="text-xs text-muted-foreground">Προγραμματισμένα/Σε εξέλιξη</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  Επείγοντα
                  <AlertTriangle className="w-4 h-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.urgentCount}</div>
                <p className="text-xs text-muted-foreground">Χρειάζονται άμεση προσοχή</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  Ολοκληρωμένα Έργα
                  <CheckCircle className="w-4 h-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.completedMaint}</div>
                <p className="text-xs text-muted-foreground">Συνολικά</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent lists */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Πρόσφατες Αποδείξεις</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {receipts.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">Απόδειξη #{r.id}</div>
                      <div className="text-xs text-muted-foreground">{new Date(r.service_date).toLocaleDateString('el-GR')}</div>
                    </div>
                    <div className="text-right">
                      <div>€{(typeof r.amount === 'string' ? parseFloat(r.amount) : r.amount).toLocaleString('el-GR')}</div>
                      <Badge variant={r.payment_status === 'paid' ? 'secondary' : 'outline'}>
                        {r.payment_status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {receipts.length === 0 && (
                  <div className="text-sm text-muted-foreground">Δεν υπάρχουν στοιχεία</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Προγραμματισμένες Συντηρήσεις</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {scheduled.slice(0, 5).map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{m.title}</div>
                      <div className="text-xs text-muted-foreground">{new Date(m.scheduled_date).toLocaleDateString('el-GR')}</div>
                    </div>
                    <Badge variant="outline">{m.status}</Badge>
                  </div>
                ))}
                {scheduled.length === 0 && (
                  <div className="text-sm text-muted-foreground">Δεν υπάρχουν στοιχεία</div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}


