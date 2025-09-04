'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getActiveBuildingId } from '@/lib/api';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, FileText, CheckCircle, AlertTriangle, Download } from 'lucide-react';

type DashboardSummary = {
  totals?: {
    projects?: number;
    active?: number;
    completed?: number;
    offers_pending?: number;
    contracts_active?: number;
    total_budget?: number;
    total_spent?: number;
    completion_rate?: number;
  };
  recent?: Array<{ id: number; title: string; type: string; when: string; status?: string; amount?: number }>;
  aggregates?: {
    by_status?: Array<{ status: string; count: number }>;
    by_month?: Array<{ month: string; count: number }>;
  };
};

async function fetchProjectsDashboardSummary(buildingId: number, filters: { status?: string; from?: string; to?: string } = {}): Promise<DashboardSummary> {
  const url = new URL('/api/projects/dashboard', window.location.origin);
  url.searchParams.set('buildingId', String(buildingId));
  if (filters.status) url.searchParams.set('status', filters.status);
  if (filters.from) url.searchParams.set('from', filters.from);
  if (filters.to) url.searchParams.set('to', filters.to);
  url.searchParams.set('aggregate', 'true');
  const res = await fetch(url.toString(), { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch projects dashboard summary');
  const json = await res.json();
  return json.data as DashboardSummary;
}

export default function ProjectsReportsPage(): JSX.Element {
  const buildingId = getActiveBuildingId();
  const [status, setStatus] = React.useState<string>('');
  const [from, setFrom] = React.useState<string>('');
  const [to, setTo] = React.useState<string>('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['projectsDashboardSummary', buildingId, { status, from, to }],
    queryFn: () => fetchProjectsDashboardSummary(buildingId, { status: status || undefined, from: from || undefined, to: to || undefined }),
  });

  const totals = data?.totals ?? {};
  const completion = typeof totals.completion_rate === 'number' ? totals.completion_rate : 0;
  const totalBudget = typeof totals.total_budget === 'number' ? totals.total_budget : 0;
  const totalSpent = typeof totals.total_spent === 'number' ? totals.total_spent : 0;
  const byStatus = data?.aggregates?.by_status ?? [];
  const byMonth = data?.aggregates?.by_month ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600">Αποτυχία φόρτωσης αναφορών έργων</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Αναφορές Έργων</h1>
          <p className="text-muted-foreground">Συγκεντρωτική εικόνα έργων, προσφορών και συμβολαίων</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/projects">Επιστροφή στα Έργα</Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Φίλτρα</CardTitle>
          <CardDescription>Φιλτράρισε τις αναφορές με βάση κατάσταση και ημερομηνίες</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="flex flex-col">
              <label className="text-sm mb-1">Κατάσταση</label>
              <select
                className="border rounded px-3 py-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Όλες</option>
                <option value="planned">Προγραμματισμένα</option>
                <option value="in_progress">Σε εξέλιξη</option>
                <option value="on_hold">Σε αναμονή</option>
                <option value="completed">Ολοκληρωμένα</option>
                <option value="cancelled">Ακυρωμένα</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm mb-1">Από</label>
              <input
                type="date"
                className="border rounded px-3 py-2 text-sm"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm mb-1">Έως</label>
              <input
                type="date"
                className="border rounded px-3 py-2 text-sm"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button variant="secondary" onClick={() => { setStatus(''); setFrom(''); setTo(''); }}>Καθαρισμός</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Κατανομή ανά Κατάσταση</CardTitle>
            <CardDescription>Σύνολα έργων ανά status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {byStatus.map((s) => (
                <div key={s.status} className="flex items-center justify-between text-sm">
                  <Link href={`/projects?status=${encodeURIComponent(s.status)}`} className="text-blue-600 hover:underline">
                    {s.status}
                  </Link>
                  <span className="font-semibold">{s.count}</span>
                </div>
              ))}
              {byStatus.length === 0 && (
                <div className="text-sm text-muted-foreground">Δεν υπάρχουν δεδομένα</div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Κατανομή ανά Μήνα</CardTitle>
            <CardDescription>Πλήθος νέων/ενεργών ανά μήνα</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {byMonth.map((m) => (
                <Link key={m.month} href={`/projects?month=${encodeURIComponent(m.month)}`} className="flex items-center justify-between text-sm text-blue-600 hover:underline">
                  <span>{m.month}</span>
                  <span className="font-semibold">{m.count}</span>
                </Link>
              ))}
              {byMonth.length === 0 && (
                <div className="text-sm text-muted-foreground">Δεν υπάρχουν δεδομένα</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/projects" className="block hover:shadow-md rounded-lg transition-shadow">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Συνολικά Έργα
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.projects ?? 0}</div>
          </CardContent>
        </Card>
        </Link>
        <Link href="/projects?status=in_progress" className="block hover:shadow-md rounded-lg transition-shadow">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Ενεργά
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.active ?? 0}</div>
          </CardContent>
        </Card>
        </Link>
        <Link href="/projects?status=completed" className="block hover:shadow-md rounded-lg transition-shadow">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Ολοκληρωμένα
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.completed ?? 0}</div>
          </CardContent>
        </Card>
        </Link>
        <Link href="/projects" className="block hover:shadow-md rounded-lg transition-shadow">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Μέσος Όρος Ολοκλήρωσης
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{completion}%</span>
              </div>
              <Progress value={completion} className="h-2" />
            </div>
          </CardContent>
        </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Οικονομική Επισκόπηση</CardTitle>
          <CardDescription>Προϋπολογισμός και έξοδα έργων</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm">Συνολικός Προϋπολογισμός</span>
            <span className="font-semibold">€{totalBudget.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Συνολικά Έξοδα</span>
            <span className="font-semibold text-red-600">€{totalSpent.toLocaleString()}</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Ποσοστό Χρήσης</span>
              <span>{totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%</span>
            </div>
            <Progress value={totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Πρόσφατη Δραστηριότητα</CardTitle>
            <CardDescription>Τελευταίες ενημερώσεις</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportCsv(data)}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
            <Button onClick={() => exportPdf(data)}>
              <Download className="w-4 h-4 mr-2" /> Export PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(data?.recent ?? []).map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <Badge variant="secondary">{item.type}</Badge>
                <div className="flex-1">
                  <div className="text-sm font-medium">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.when}</div>
                </div>
                {typeof item.amount === 'number' && (
                  <div className="text-xs font-semibold">€{item.amount.toLocaleString()}</div>
                )}
                {item.status && <Badge variant="outline">{item.status}</Badge>}
              </div>
            ))}
            {(data?.recent ?? []).length === 0 && (
              <div className="text-sm text-muted-foreground">Δεν υπάρχουν πρόσφατες ενημερώσεις</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function exportCsv(data?: DashboardSummary) {
  const rows = [
    ['Type', 'Title', 'When', 'Status', 'Amount'],
    ...((data?.recent ?? []).map(i => [i.type, i.title, i.when, i.status ?? '', typeof i.amount === 'number' ? String(i.amount) : '']))
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'projects_report.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportPdf(data?: DashboardSummary) {
  const printable = window.open('', '_blank');
  if (!printable) return;
  const recent = data?.recent ?? [];
  printable.document.write(`
    <html>
      <head><title>Projects Report</title></head>
      <body>
        <h1>Projects Report</h1>
        <table border="1" cellspacing="0" cellpadding="6">
          <thead>
            <tr>
              <th>Type</th>
              <th>Title</th>
              <th>When</th>
              <th>Status</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${recent.map(i => `<tr>
              <td>${i.type}</td>
              <td>${i.title}</td>
              <td>${i.when}</td>
              <td>${i.status ?? ''}</td>
              <td>${typeof i.amount === 'number' ? i.amount : ''}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);
  printable.document.close();
}


