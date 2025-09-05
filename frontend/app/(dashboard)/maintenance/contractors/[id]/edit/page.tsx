'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchContractor, updateContractor, deleteContractor, type Contractor } from '@/lib/api';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { BackButton } from '@/components/ui/BackButton';

export default function EditContractorPage() {
  const params = useParams();
  const id = Number(params?.id);
  const router = useRouter();

  const [item, setItem] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await fetchContractor(id);
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
      await updateContractor(id, {
        name: item.name,
        service_type: item.service_type,
        contact_person: item.contact_person,
        phone: item.phone,
        email: item.email,
        status: item.status,
        is_active: item.is_active,
      } as any);
      toast({ title: 'Αποθηκεύτηκε', description: 'Το συνεργείο ενημερώθηκε.' });
      router.push(`/maintenance/contractors`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await deleteContractor(id);
    toast({ title: 'Διαγράφηκε', description: 'Το συνεργείο διαγράφηκε.' });
    router.push('/maintenance/contractors');
  };

  if (loading) return <div className="p-6">Φόρτωση…</div>;
  if (!item) return <div className="p-6">Δεν βρέθηκαν δεδομένα.</div>;

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Επεξεργασία Συνεργείου</h1>
        <BackButton href="/maintenance/contractors" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Στοιχεία</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Όνομα</Label>
            <Input id="name" value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="type">Τύπος Υπηρεσίας</Label>
            <Input id="type" value={item.service_type} onChange={(e) => setItem({ ...item, service_type: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="person">Υπεύθυνος</Label>
              <Input id="person" value={item.contact_person} onChange={(e) => setItem({ ...item, contact_person: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="phone">Τηλέφωνο</Label>
              <Input id="phone" value={item.phone} onChange={(e) => setItem({ ...item, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={item.email} onChange={(e) => setItem({ ...item, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Κατάσταση</Label>
              <select className="w-full border rounded h-9 px-2" value={item.status} onChange={(e) => setItem({ ...item, status: e.target.value as any })}>
                <option value="active">Ενεργό</option>
                <option value="inactive">Ανενεργό</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={item.is_active} onChange={(e) => setItem({ ...item, is_active: e.target.checked })} />
                Ενεργό
              </label>
            </div>
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
          <p className="text-sm text-muted-foreground">Θέλετε σίγουρα να διαγράψετε το συνεργείο;</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Άκυρο</Button>
            <Button variant="destructive" onClick={handleDelete}>Διαγραφή</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


