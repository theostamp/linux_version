'use client';

import Link from 'next/link';
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchScheduledMaintenances, type ScheduledMaintenance } from '@/lib/api';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertTriangle, CheckCircle, Clock, Plus } from 'lucide-react';

type Priority = 'low' | 'medium' | 'high' | 'urgent';
type Status = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

type ScheduledMaintenanceItem = ScheduledMaintenance;

function PriorityBadge({ priority }: { priority: Priority }) {
  const colorMap: Record<Priority, string> = {
    low: 'bg-green-50 text-green-700',
    medium: 'bg-yellow-50 text-yellow-700',
    high: 'bg-orange-50 text-orange-700',
    urgent: 'bg-red-50 text-red-700',
  };
  const labelMap: Record<Priority, string> = {
    low: 'Χαμηλή',
    medium: 'Μεσαία',
    high: 'Υψηλή',
    urgent: 'Επείγον',
  };
  return <span className={`px-2 py-1 text-xs rounded ${colorMap[priority]}`}>{labelMap[priority]}</span>;
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; icon: React.ReactNode; classes: string }> = {
    planned: { label: 'Προγραμματισμένο', icon: <Calendar className="w-3 h-3" />, classes: 'bg-blue-50 text-blue-700' },
    in_progress: { label: 'Σε εξέλιξη', icon: <Clock className="w-3 h-3" />, classes: 'bg-yellow-50 text-yellow-700' },
    completed: { label: 'Ολοκληρώθηκε', icon: <CheckCircle className="w-3 h-3" />, classes: 'bg-green-50 text-green-700' },
    on_hold: { label: 'Σε αναμονή', icon: <AlertTriangle className="w-3 h-3" />, classes: 'bg-orange-50 text-orange-700' },
  };
  const { label, icon, classes } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded ${classes}`}>
      {icon}
      {label}
    </span>
  );
}

export default function ScheduledMaintenancePage({ searchParams }: { searchParams?: Promise<{ priority?: string }> | { priority?: string } }) {
  // Next.js 15: searchParams may be a Promise; unwrap with React.use when needed
  // @ts-expect-error next 15 searchParams can be promise-like
  const sp = (typeof (searchParams as any)?.then === 'function' ? React.use(searchParams as Promise<{ priority?: string }>) : (searchParams as { priority?: string } | undefined));
  const priorityFilter = (sp?.priority || '').toLowerCase() as Priority | '';
  const { selectedBuilding, currentBuilding } = useBuilding();
  const buildingId = selectedBuilding?.id || currentBuilding?.id;

  const { data: items = [], isLoading } = useQuery<ScheduledMaintenanceItem[]>({
    queryKey: ['maintenance', 'scheduled', { buildingId, priorityFilter }],
    queryFn: () => fetchScheduledMaintenances({ buildingId: buildingId ?? undefined, priority: priorityFilter || undefined, ordering: 'scheduled_date' }),
    enabled: true,
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    if (!priorityFilter) return items;
    return items.filter((i) => i.priority === priorityFilter);
  }, [items, priorityFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Προγραμματισμένα Έργα</h1>
          <p className="text-muted-foreground">Λίστα εργασιών συντήρησης ανά προτεραιότητα</p>
        </div>
        <Button asChild>
          <Link href="/maintenance/scheduled/new">
            <Plus className="w-4 h-4 mr-2" />
            Νέο Έργο
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <div className="col-span-full flex items-center justify-center py-12 text-sm text-muted-foreground">Φόρτωση…</div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="col-span-full text-sm text-muted-foreground">Δεν βρέθηκαν έργα.</div>
        )}
        {!isLoading && filtered.map((item) => (
          <Card key={item.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>
                  {item.contractor_name ? `Συνεργείο: ${item.contractor_name}` : 'Χωρίς συνεργείο'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <PriorityBadge priority={item.priority as Priority} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Ημ/νία: {item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString('el-GR') : '—'}
              </div>
              <div>
                <StatusBadge status={item.status as Status} />
              </div>
              <div className="pt-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/maintenance/scheduled/${item.id}`}>Προβολή</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


