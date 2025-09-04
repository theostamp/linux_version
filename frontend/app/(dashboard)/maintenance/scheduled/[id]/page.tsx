'use client';

import Link from 'next/link';
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Wrench } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchScheduledMaintenance, type ScheduledMaintenance } from '@/lib/api';

type Priority = 'low' | 'medium' | 'high' | 'urgent';
type Status = 'planned' | 'in_progress' | 'completed' | 'on_hold';

export default function ScheduledMaintenanceDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  // Next.js 15: params may be a Promise; unwrap safely with React.use
  // @ts-expect-error next 15 params can be promise-like
  const { id } = (typeof (params as any)?.then === 'function' ? React.use(params as Promise<{ id: string }>) : (params as { id: string }));
  const numericId = Number(id);
  const { data: item, isLoading } = useQuery<ScheduledMaintenance>({
    queryKey: ['maintenance', 'scheduled', numericId],
    queryFn: () => fetchScheduledMaintenance(numericId),
    enabled: Number.isFinite(numericId),
    staleTime: 30_000,
  });

  const priorityColor: Record<Priority, string> = {
    low: 'bg-green-50 text-green-700',
    medium: 'bg-yellow-50 text-yellow-700',
    high: 'bg-orange-50 text-orange-700',
    urgent: 'bg-red-50 text-red-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Λεπτομέρειες Έργου</h1>
          <p className="text-muted-foreground">Πληροφορίες για το προγραμματισμένο έργο συντήρησης</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/maintenance/scheduled">
            <ArrowLeft className="w-4 h-4 mr-2" /> Πίσω στη λίστα
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{item?.title || `Προγραμματισμένη εργασία #${id}`}</CardTitle>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Wrench className="w-4 h-4" />
                <span>Συνεργείο:</span>
                <span className="font-medium">{item?.contractor_name || '—'}</span>
              </div>
            </div>
            <span className={`px-2 py-1 rounded text-xs ${item ? priorityColor[item.priority as Priority] : ''}`}>Προτεραιότητα: {item?.priority || '—'}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Ημ/νία έναρξης:</span>
            <span className="font-medium">{item?.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString('el-GR') : '—'}</span>
          </div>

          <div>
            <h2 className="text-sm font-semibold mb-1">Κατάσταση</h2>
            <Badge variant="secondary">{item?.status || '—'}</Badge>
          </div>

          <div>
            <h2 className="text-sm font-semibold mb-1">Περιγραφή</h2>
            <p className="text-sm text-muted-foreground">{item?.description || '—'}</p>
          </div>

          <div className="pt-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/maintenance/scheduled">Επιστροφή</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


