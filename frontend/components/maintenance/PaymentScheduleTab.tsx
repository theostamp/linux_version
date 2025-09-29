'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function PaymentScheduleTab({ maintenanceId }: { maintenanceId: number }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['maintenance-payment-schedule', maintenanceId],
    queryFn: async () => {
      const { data } = await api.get(`/maintenance/scheduled/${maintenanceId}/`);
      const scheduleId = data?.payment_schedule?.id;
      if (!scheduleId) return { schedule: null, installments: [] };
      const instRes = await api.get(`/maintenance/payment-installments/`, { params: { payment_schedule: scheduleId } });
      return { schedule: data.payment_schedule, installments: instRes.data };
    }
  });

  const markPaid = useMutation({
    mutationFn: async (installmentId: number) => {
      return api.post(`/maintenance/payment-installments/${installmentId}/mark_paid/`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance-payment-schedule', maintenanceId] });
      qc.invalidateQueries({ queryKey: ['maintenance-payment-history', maintenanceId] });
    }
  });

  if (isLoading) return null;
  const schedule = data?.schedule;
  const installments = data?.installments ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Χρονοδιάγραμμα Πληρωμών</h3>
        {!schedule && <div className="text-sm text-muted-foreground">Δεν έχει οριστεί χρονοδιάγραμμα.</div>}
      </div>
      {schedule && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="text-sm">
              <span className="font-medium">Τύπος:</span> {schedule.payment_type}
            </div>
            <div className="text-sm">
              <span className="font-medium">Σύνολο:</span> €{schedule.total_amount}
            </div>
            <div className="space-y-2">
              {installments.map((i: any) => (
                <div key={i.id} className="flex items-center justify-between text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium">Δόση {i.installment_number} — €{i.amount}</span>
                    <span className="text-muted-foreground">Λήξη: {i.due_date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{i.status}</span>
                    {i.status !== 'paid' && (
                      <Button size="sm" onClick={() => markPaid.mutate(i.id)} disabled={markPaid.isPending}>
                        Εξόφληση
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {installments.length === 0 && <div className="text-sm text-muted-foreground">Δεν υπάρχουν δόσεις.</div>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


