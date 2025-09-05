'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchServiceReceipt, updateServiceReceipt, deleteServiceReceipt, type ServiceReceipt } from '@/lib/api';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { BackButton } from '@/components/ui/BackButton';

export default function EditReceiptPage() {
  const params = useParams();
  const id = Number(params?.id);
  const router = useRouter();

  const [item, setItem] = useState<ServiceReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await fetchServiceReceipt(id);
        setItem(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    try {
      await updateServiceReceipt(id, {
        description: item.description,
        amount: item.amount,
        service_date: item.service_date,
        invoice_number: (item as any).invoice_number,
        payment_status: item.payment_status,
      } as any);
      toast({ title: 'Αποθηκεύτηκε', description: 'Η απόδειξη ενημερώθηκε.' });
      router.push(`/maintenance/receipts`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await deleteServiceReceipt(id);
    toast({ title: 'Διαγράφηκε', description: 'Η απόδειξη διαγράφηκε.' });
    router.push('/maintenance/receipts');
  };

  if (loading) return <div className="p-6">Φόρτωση…</div>;
  if (!item) return <div className="p-6">Δεν βρέθηκαν δεδομένα.</div>;

  const amountValue = typeof item.amount === 'string' ? item.amount : String(item.amount);

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Επεξεργασία Απόδειξης</h1>
        <BackButton href="/maintenance/receipts" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Στοιχεία</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="description">Περιγραφή</Label>
            <Input id="description" value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="amount">Ποσό</Label>
            <Input id="amount" type="number" step="0.01" value={amountValue} onChange={(e) => setItem({ ...item, amount: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="date">Ημ/νία</Label>
            <Input id="date" type="date" value={item.service_date.substring(0, 10)} onChange={(e) => setItem({ ...item, service_date: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="inv">Αρ. Τιμολογίου</Label>
            <Input id="inv" value={(item as any).invoice_number ?? ''} onChange={(e) => setItem({ ...item, invoice_number: e.target.value } as any)} />
          </div>
          <div>
            <Label>Κατάσταση Πληρωμής</Label>
            <select className="w-full border rounded h-9 px-2" value={item.payment_status} onChange={(e) => setItem({ ...item, payment_status: e.target.value as any })}>
              <option value="pending">Εκκρεμεί</option>
              <option value="paid">Εξοφλήθηκε</option>
              <option value="overdue">Ληγμένο</option>
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Αποθήκευση…' : 'Αποθήκευση'}</Button>
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>Διαγραφή</Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Επιβεβαίωση Διαγραφής</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Θέλετε σίγουρα να διαγράψετε την απόδειξη;</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Άκυρο</Button>
            <Button variant="destructive" onClick={handleDelete}>Διαγραφή</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


