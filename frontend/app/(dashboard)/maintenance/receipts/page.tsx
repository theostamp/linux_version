'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, ArrowLeft } from 'lucide-react';
import { fetchServiceReceipts, type ServiceReceipt } from '@/lib/api';
import { useBuilding } from '@/components/contexts/BuildingContext';

export default function ReceiptsPage() {
  const { selectedBuilding, currentBuilding } = useBuilding();
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
        <Button asChild variant="outline">
          <Link href="/maintenance">
            <ArrowLeft className="w-4 h-4 mr-2" /> Πίσω
          </Link>
        </Button>
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


