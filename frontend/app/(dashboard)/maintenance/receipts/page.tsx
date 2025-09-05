'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { fetchServiceReceipts, type ServiceReceipt, deleteServiceReceipt } from '@/lib/api';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useRole } from '@/lib/auth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { BackButton } from '@/components/ui/BackButton';

export default function ReceiptsPage() {
  const { selectedBuilding, currentBuilding } = useBuilding();
  const router = useRouter();
  const qc = useQueryClient();
  const { isAdmin, isManager } = useRole();
  const { toast } = useToast();
  const [toDeleteId, setToDeleteId] = React.useState<number | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const buildingId = selectedBuilding?.id || currentBuilding?.id;
  const { data: receipts = [], isLoading } = useQuery<ServiceReceipt[]>({
    queryKey: ['maintenance', 'receipts', { buildingId }],
    queryFn: () => fetchServiceReceipts({ buildingId: buildingId ?? undefined }),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Αποδείξεις Υπηρεσιών</h1>
          <p className="text-muted-foreground">Τιμολόγια/αποδείξεις συνεργείων</p>
        </div>
        <BackButton href="/maintenance" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <div className="col-span-full flex items-center justify-center py-12 text-sm text-muted-foreground">Φόρτωση…</div>
        )}
        {!isLoading && receipts.length === 0 && (
          <div className="col-span-full text-sm text-muted-foreground">Δεν βρέθηκαν αποδείξεις.</div>
        )}
        {!isLoading && receipts.map((r) => (
          <Card key={r.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Απόδειξη #{r.id}
                </CardTitle>
                <div className="text-xs text-muted-foreground">{new Date(r.service_date).toLocaleDateString('el-GR')}</div>
              </div>
              <Badge variant={r.payment_status === 'paid' ? 'secondary' : 'outline'}>
                {r.payment_status === 'paid' ? 'Εξοφλήθηκε' : r.payment_status === 'overdue' ? 'Ληγμένο' : 'Εκκρεμεί'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div>Ποσό: €{(typeof r.amount === 'string' ? parseFloat(r.amount) : r.amount).toLocaleString('el-GR')}</div>
              <div>{r.description}</div>
              <div className="pt-2 flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/maintenance/receipts/${r.id}`}>Προβολή</Link>
                </Button>
                {(isAdmin || isManager) && (
                  <>
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/maintenance/receipts/${r.id}/edit`}>Επεξεργασία</Link>
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setToDeleteId(r.id)}>Διαγραφή</Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={toDeleteId !== null}
        onOpenChange={(open) => !open && setToDeleteId(null)}
        title="Επιβεβαίωση Διαγραφής"
        description="Θέλετε σίγουρα να διαγράψετε την απόδειξη;"
        confirmText="Διαγραφή"
        confirmVariant="destructive"
        isConfirmLoading={deleting}
        onConfirm={async () => {
          if (toDeleteId === null) return;
          try {
            setDeleting(true);
            await deleteServiceReceipt(toDeleteId);
            qc.invalidateQueries({ queryKey: ['maintenance', 'receipts'] });
            toast({ title: 'Διαγράφηκε', description: 'Η απόδειξη διαγράφηκε.' });
          } catch (e) {
            toast({ title: 'Σφάλμα', description: 'Αποτυχία διαγραφής.', variant: 'destructive' as any });
          } finally {
            setDeleting(false);
            setToDeleteId(null);
          }
        }}
      />
    </div>
  );
}


