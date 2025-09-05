'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, ArrowLeft } from 'lucide-react';
import { fetchContractors, type Contractor, deleteContractor } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useRole } from '@/lib/auth';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';

export default function ContractorsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { isAdmin, isManager } = useRole();
  const { toast } = useToast();
  const [toDeleteId, setToDeleteId] = React.useState<number | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const { data: contractors = [], isLoading } = useQuery<Contractor[]>({
    queryKey: ['maintenance', 'contractors'],
    queryFn: fetchContractors,
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Συνεργεία</h1>
          <p className="text-muted-foreground">Λίστα συνεργείων συντήρησης</p>
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
        {!isLoading && contractors.length === 0 && (
          <div className="col-span-full text-sm text-muted-foreground">Δεν βρέθηκαν συνεργεία.</div>
        )}
        {!isLoading && contractors.map((c) => (
          <Card key={c.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {c.name}
                </CardTitle>
                <div className="text-xs text-muted-foreground">{c.contact_person} • {c.phone}</div>
              </div>
              <Badge variant={c.is_active ? 'secondary' : 'outline'}>{c.status || (c.is_active ? 'active' : 'inactive')}</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div>Τύπος: {c.service_type}</div>
              {c.email && <div>Email: {c.email}</div>}
              {(c as any).hourly_rate && <div>Ωριαία χρέωση: €{Number((c as any).hourly_rate).toLocaleString('el-GR')}</div>}
              <div className="pt-2 flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/maintenance/contractors/${c.id}`}>Προβολή</Link>
                </Button>
                {(isAdmin || isManager) && (
                  <>
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/maintenance/contractors/${c.id}/edit`}>Επεξεργασία</Link>
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setToDeleteId(c.id)}>Διαγραφή</Button>
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
        description="Θέλετε σίγουρα να διαγράψετε το συνεργείο;"
        confirmText="Διαγραφή"
        confirmVariant="destructive"
        isConfirmLoading={deleting}
        onConfirm={async () => {
          if (toDeleteId === null) return;
          try {
            setDeleting(true);
            await deleteContractor(toDeleteId);
            qc.invalidateQueries({ queryKey: ['maintenance', 'contractors'] });
            toast({ title: 'Διαγράφηκε', description: 'Το συνεργείο διαγράφηκε.' });
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


