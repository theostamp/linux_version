'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/BackButton';
import PaymentHistoryTab from '@/components/maintenance/PaymentHistoryTab';
import PaymentScheduleTab from '@/components/maintenance/PaymentScheduleTab';

export default function ScheduledMaintenanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = useMemo(() => Number(params?.id), [params]);
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await api.get(`/maintenance/scheduled/${id}/`);
        setItem(data);
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (!id || loading) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BackButton size="sm" />
          <h1 className="text-3xl font-bold tracking-tight">{item?.title ?? 'Προγραμματισμένο Έργο'}</h1>
        </div>
        <Button variant="outline" onClick={() => router.push(`/maintenance/scheduled/${id}/edit`)}>Επεξεργασία</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Πληρωμές</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="history">
            <TabsList>
              <TabsTrigger value="history">Ιστορικό</TabsTrigger>
              <TabsTrigger value="schedule">Χρονοδιάγραμμα</TabsTrigger>
            </TabsList>
            <TabsContent value="history">
              <PaymentHistoryTab maintenanceId={id} />
            </TabsContent>
            <TabsContent value="schedule">
              <PaymentScheduleTab maintenanceId={id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

