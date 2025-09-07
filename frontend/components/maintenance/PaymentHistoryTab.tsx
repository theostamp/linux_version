'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function PaymentHistoryTab({ maintenanceId }: { maintenanceId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['maintenance-payment-history', maintenanceId],
    queryFn: async () => {
      const { data } = await api.get(`/maintenance/scheduled/${maintenanceId}/payment_history/`);
      return data;
    }
  });

  if (isLoading) return null;
  const receipts = data?.receipts ?? [];
  const installments = data?.installments ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Ιστορικό Πληρωμών</h3>
        <div className="flex gap-2">
          <Button variant="outline">Νέα Απόδειξη</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 divide-y">
          <div className="p-4">
            <h4 className="font-medium mb-2">Αποδείξεις</h4>
            <div className="space-y-2">
              {receipts.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium">#{r.receipt_number} — €{r.amount}</span>
                    <span className="text-muted-foreground">{r.description}</span>
                  </div>
                  <div className="text-muted-foreground">{r.payment_date}</div>
                </div>
              ))}
              {receipts.length === 0 && <div className="text-sm text-muted-foreground">Δεν υπάρχουν αποδείξεις.</div>}
            </div>
          </div>
          <Separator />
          <div className="p-4">
            <h4 className="font-medium mb-2">Δόσεις</h4>
            <div className="space-y-2">
              {installments.map((i: any) => (
                <div key={i.id} className="flex items-center justify-between text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium">Δόση {i.installment_number} — €{i.amount}</span>
                    <span className="text-muted-foreground">Λήξη: {i.due_date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{i.status}</span>
                  </div>
                </div>
              ))}
              {installments.length === 0 && <div className="text-sm text-muted-foreground">Δεν υπάρχουν δόσεις.</div>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


