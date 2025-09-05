'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { fetchScheduledMaintenance, updateScheduledMaintenance, deleteScheduledMaintenance, type ScheduledMaintenance } from '@/lib/api';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { BackButton } from '@/components/ui/BackButton';

export default function EditScheduledMaintenancePage() {
  const params = useParams();
  const id = Number(params?.id);
  const router = useRouter();

  const [item, setItem] = useState<ScheduledMaintenance | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await fetchScheduledMaintenance(id);
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
      await updateScheduledMaintenance(id, {
        title: item.title,
        description: item.description,
        scheduled_date: item.scheduled_date,
        priority: item.priority,
        status: item.status,
        contractor: item.contractor ?? undefined,
        building: item.building,
      });
      toast({ title: 'Αποθηκεύτηκε', description: 'Η εργασία ενημερώθηκε.' });
      router.push(`/maintenance/scheduled/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await deleteScheduledMaintenance(id);
    toast({ title: 'Διαγράφηκε', description: 'Η εργασία διαγράφηκε.' });
    router.push('/maintenance/scheduled');
  };

  if (loading) {
    return <div className="p-6">Φόρτωση…</div>;
  }

  if (!item) {
    return <div className="p-6">Δεν βρέθηκαν δεδομένα.</div>;
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Επεξεργασία Προγραμματισμένου Έργου</h1>
        <BackButton href={`/maintenance/scheduled/${id}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Στοιχεία</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Τίτλος</Label>
            <Input id="title" value={item.title} onChange={(e) => setItem({ ...item, title: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="description">Περιγραφή</Label>
            <Input id="description" value={item.description ?? ''} onChange={(e) => setItem({ ...item, description: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="date">Ημ/νία</Label>
            <Input id="date" type="date" value={item.scheduled_date ? item.scheduled_date.substring(0, 10) : ''} onChange={(e) => setItem({ ...item, scheduled_date: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Προτεραιότητα</Label>
              <select className="w-full border rounded h-9 px-2" value={item.priority} onChange={(e) => setItem({ ...item, priority: e.target.value as any })}>
                <option value="low">Χαμηλή</option>
                <option value="medium">Μεσαία</option>
                <option value="high">Υψηλή</option>
                <option value="urgent">Επείγον</option>
              </select>
            </div>
            <div>
              <Label>Κατάσταση</Label>
              <select className="w-full border rounded h-9 px-2" value={item.status} onChange={(e) => setItem({ ...item, status: e.target.value as any })}>
                <option value="scheduled">Προγραμματισμένο</option>
                <option value="in_progress">Σε εξέλιξη</option>
                <option value="completed">Ολοκληρώθηκε</option>
                <option value="cancelled">Ακυρώθηκε</option>
              </select>
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
          <p className="text-sm text-muted-foreground">Θέλετε σίγουρα να διαγράψετε το έργο;</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Άκυρο</Button>
            <Button variant="destructive" onClick={handleDelete}>Διαγραφή</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


