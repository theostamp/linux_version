'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, getActiveBuildingId } from '@/lib/api';
import { MonthSelector } from '@/components/financial/MonthSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, Wrench, TrendingUp } from 'lucide-react';
import Link from 'next/link';

type ServiceReceipt = {
  id: number;
  building: number;
  contractor?: number | null;
  contractor_name?: string;
  service_date: string;
  amount: number | string;
  description: string;
  payment_status?: string;
};

type ScheduledMaintenance = {
  id: number;
  title: string;
  description?: string;
  building: number;
  contractor?: number | null;
  contractor_name?: string;
  scheduled_date?: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
};

type Expense = {
  id: number;
  building: number;
  title: string;
  amount: number | string;
  date: string;
  category: string;
  distribution_type: string;
};

function getMonthBounds(month: string): { from: string; to: string } {
  // month format: YYYY-MM
  const [y, m] = month.split('-').map((v) => parseInt(v, 10));
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  const from = start.toISOString().slice(0, 10);
  const to = end.toISOString().slice(0, 10);
  return { from, to };
}

function toNumber(n: number | string | undefined): number {
  if (typeof n === 'number') return n;
  if (typeof n === 'string') {
    const v = parseFloat(n);
    return isNaN(v) ? 0 : v;
  }
  return 0;
}

export default function MaintenanceReportsPage() {
  const buildingId = getActiveBuildingId();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = React.useState<string>(currentMonth);
  const { from, to } = React.useMemo(() => getMonthBounds(selectedMonth), [selectedMonth]);

  const receiptsQ = useQuery<ServiceReceipt[]>({
    queryKey: ['maintenance-reports', 'receipts', { buildingId, selectedMonth }],
    queryFn: async () => {
      try {
        const resp = await api.get('/maintenance/receipts/', { params: { building: buildingId, limit: 500 } });
        const data = Array.isArray(resp.data) ? resp.data : resp.data?.results ?? [];
        return data.filter((r: any) => r.service_date && r.service_date >= from && r.service_date <= to);
      } catch (e) {
        return [];
      }
    },
    staleTime: 30_000,
  });

  const scheduledQ = useQuery<ScheduledMaintenance[]>({
    queryKey: ['maintenance-reports', 'scheduled', { buildingId, selectedMonth }],
    queryFn: async () => {
      try {
        const resp = await api.get('/maintenance/scheduled/', { params: { building: buildingId, limit: 1000 } });
        const data = Array.isArray(resp.data) ? resp.data : resp.data?.results ?? [];
        return data.filter((i: any) => i.scheduled_date && i.scheduled_date >= from && i.scheduled_date <= to);
      } catch (e) {
        return [];
      }
    },
    staleTime: 30_000,
  });

  const expensesQ = useQuery<Expense[]>({
    queryKey: ['maintenance-reports', 'expenses', { buildingId, selectedMonth }],
    queryFn: async () => {
      // Try server-side date filters; if 400, fallback to client-side filtering
      try {
        const resp = await api.get('/financial/expenses/', { params: { building_id: buildingId, date__gte: from, date__lte: to, limit: 1000 } });
        const data = Array.isArray(resp.data) ? resp.data : resp.data?.results ?? [];
        return data;
      } catch (e) {
        try {
          const resp = await api.get('/financial/expenses/', { params: { building_id: buildingId, limit: 1000 } });
          const data = Array.isArray(resp.data) ? resp.data : resp.data?.results ?? [];
          return data.filter((e: any) => e.date && e.date >= from && e.date <= to);
        } catch (err) {
          return [];
        }
      }
    },
    staleTime: 30_000,
  });

  const totalReceipts = React.useMemo(() => receiptsQ.data?.reduce((s, r) => s + toNumber(r.amount), 0) ?? 0, [receiptsQ.data]);
  const totalExpenses = React.useMemo(() => expensesQ.data?.reduce((s, e) => s + toNumber(e.amount), 0) ?? 0, [expensesQ.data]);
  const scheduledCount = scheduledQ.data?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reports Συντήρησης</h1>
          <p className="text-muted-foreground">Συγκεντρωτικά στοιχεία για τον επιλεγμένο μήνα</p>
        </div>
        <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="overview">Επισκόπηση</TabsTrigger>
          <TabsTrigger value="receipts">Αποδείξεις</TabsTrigger>
          <TabsTrigger value="scheduled">Έργα</TabsTrigger>
          <TabsTrigger value="expenses">Δαπάνες</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="w-4 h-4" /> Σύνολο Αποδείξεων</CardTitle>
                <CardDescription>Για τον μήνα</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{totalReceipts.toFixed(2)}</div>
                <Button asChild variant="link" className="px-0">
                  <Link href="#receipts">Δείτε λεπτομέρειες</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Σύνολο Δαπανών</CardTitle>
                <CardDescription>Για τον μήνα</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{totalExpenses.toFixed(2)}</div>
                <Button asChild variant="link" className="px-0">
                  <Link href="#expenses">Δείτε λεπτομέρειες</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Προγραμματισμένα Έργα</CardTitle>
                <CardDescription>Για τον μήνα</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{scheduledCount}</div>
                <Button asChild variant="link" className="px-0">
                  <Link href="#scheduled">Δείτε λεπτομέρειες</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="receipts" className="space-y-4" id="receipts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="w-4 h-4" /> Αποδείξεις ({receiptsQ.data?.length ?? 0})</CardTitle>
              <CardDescription>Αποδείξεις υπηρεσιών για {selectedMonth}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(receiptsQ.data ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground">Δεν βρέθηκαν αποδείξεις.</div>
              ) : (
                <div className="space-y-2">
                  {(receiptsQ.data ?? []).map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <Wrench className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="text-sm font-medium">{r.description || `Απόδειξη #${r.id}`}</div>
                          <div className="text-xs text-muted-foreground">{new Date(r.service_date).toLocaleDateString('el-GR')}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">€{toNumber(r.amount).toFixed(2)}</div>
                        {r.payment_status && <Badge variant="outline" className="text-xs">{r.payment_status}</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4" id="scheduled">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Έργα ({scheduledQ.data?.length ?? 0})</CardTitle>
              <CardDescription>Προγραμματισμένα έργα για {selectedMonth}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(scheduledQ.data ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground">Δεν βρέθηκαν έργα.</div>
              ) : (
                <div className="space-y-2">
                  {(scheduledQ.data ?? []).map((i) => (
                    <div key={i.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="text-sm font-medium">{i.title}</div>
                        <div className="text-xs text-muted-foreground">{i.scheduled_date ? new Date(i.scheduled_date).toLocaleDateString('el-GR') : '—'}</div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">{i.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4" id="expenses">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Δαπάνες ({expensesQ.data?.length ?? 0})</CardTitle>
              <CardDescription>Δαπάνες του {selectedMonth}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(expensesQ.data ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground">Δεν βρέθηκαν δαπάνες.</div>
              ) : (
                <div className="space-y-2">
                  {(expensesQ.data ?? []).map((e) => (
                    <div key={e.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="text-sm font-medium">{e.title}</div>
                        <div className="text-xs text-muted-foreground">{new Date(e.date).toLocaleDateString('el-GR')} • {e.category}</div>
                      </div>
                      <div className="text-right font-semibold">€{toNumber(e.amount).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

