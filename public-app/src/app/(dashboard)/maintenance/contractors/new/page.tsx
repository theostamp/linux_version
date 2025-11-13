'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createContractor, type Contractor } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { BackButton } from '@/components/ui/BackButton';

type NewContractor = Partial<Omit<Contractor, 'id' | 'created_at'>>;

export default function NewContractorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const SERVICE_TYPES: Array<{ value: string; label: string }> = [
    { value: 'repair', label: 'Επισκευές' },
    { value: 'cleaning', label: 'Καθαριότητα' },
    { value: 'security', label: 'Ασφάλεια' },
    { value: 'electrical', label: 'Ηλεκτρολογικά' },
    { value: 'plumbing', label: 'Υδραυλικά' },
    { value: 'heating', label: 'Θέρμανση/Κλιματισμός' },
    { value: 'elevator', label: 'Ανελκυστήρες' },
    { value: 'landscaping', label: 'Κηπουρική' },
    { value: 'painting', label: 'Βαψίματα' },
    { value: 'carpentry', label: 'Ξυλουργική' },
    { value: 'masonry', label: 'Κατασκευές' },
    { value: 'technical', label: 'Τεχνικές Υπηρεσίες' },
    { value: 'maintenance', label: 'Συντήρηση' },
    { value: 'emergency', label: 'Επείγοντα' },
    { value: 'other', label: 'Άλλο' },
  ];

  const [form, setForm] = useState<NewContractor>({
    name: '',
    service_type: 'repair',
    contact_person: '',
    phone: '',
    email: '',
    status: 'active',
    is_active: true,
  });
  const [customService, setCustomService] = useState('');
  const [nameEdited, setNameEdited] = useState(false);

  // Auto-fill name based on service type selection unless user edited
  React.useEffect(() => {
    if (nameEdited) return;
    let suggested = '';
    if (form.service_type === 'custom') {
      suggested = customService.trim() ? `Συνεργείο ${customService.trim()}` : '';
    } else {
      const match = SERVICE_TYPES.find((opt) => opt.value === form.service_type);
      suggested = match?.label ? `Συνεργείο ${match.label}` : '';
    }
    if (suggested && form.name !== suggested) {
      setForm((prev) => ({ ...prev, name: suggested }));
    }
  }, [form.service_type, customService, nameEdited]);

  async function handleSave() {
    setSaving(true);
    try {
      // Basic validation
      const finalServiceType = form.service_type === 'custom' ? 'other' : form.service_type;
      if (!form.name || !finalServiceType) {
        toast({ title: 'Σφάλμα', description: 'Συμπληρώστε Όνομα και Τύπο Υπηρεσίας.', variant: 'destructive' as any });
        return;
      }
      const payload: any = {
        ...form,
        service_type: finalServiceType,
      };
      if (form.service_type === 'custom' && customService.trim().length > 0) {
        payload.service_type = 'other';
        payload.specializations = [customService.trim()];
      }
      await createContractor(payload);
      toast({ title: 'Αποθηκεύτηκε', description: 'Το συνεργείο δημιουργήθηκε.' });
      router.push('/maintenance/contractors');
    } catch (e) {
      toast({ title: 'Σφάλμα', description: 'Αποτυχία δημιουργίας συνεργείου.', variant: 'destructive' as any });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Νέο Συνεργείο</h1>
        <BackButton href="/maintenance/contractors" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Στοιχεία</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="type">Τύπος Υπηρεσίας</Label>
            <select
              id="type"
              className="w-full border rounded h-9 px-2"
              value={form.service_type as string}
              onChange={(e) => setForm({ ...form, service_type: e.target.value as any })}
            >
              {SERVICE_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
              <option value="custom">Προσθήκη νέας υπηρεσίας…</option>
            </select>
            {form.service_type === 'custom' && (
              <div className="mt-2">
                <Label htmlFor="custom_service">Νέα Υπηρεσία</Label>
                <Input id="custom_service" value={customService} onChange={(e) => setCustomService(e.target.value)} placeholder="π.χ. Πυρασφάλεια" />
                <p className="text-xs text-muted-foreground mt-1">Θα αποθηκευτεί ως "Άλλο" και θα προστεθεί στις εξειδικεύσεις.</p>
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="name">Ονομασία</Label>
            <Input id="name" value={form.name || ''} onChange={(e) => { setForm({ ...form, name: e.target.value }); setNameEdited(true); }} />
            <p className="text-xs text-muted-foreground mt-1">Μπορείτε να αλλάξετε την ονομασία.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="person">Υπεύθυνος</Label>
              <Input id="person" value={form.contact_person || ''} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Τηλέφωνο</Label>
                <Input id="phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="phone2">Τηλέφωνο (2)</Label>
                <Input id="phone2" value={(form as any).emergency_phone || ''} onChange={(e) => setForm({ ...form, emergency_phone: e.target.value } as any)} />
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Κατάσταση</Label>
              <select className="w-full border rounded h-9 px-2" value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
                <option value="active">Ενεργό</option>
                <option value="inactive">Ανενεργό</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Ενεργό
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Αποθήκευση…' : 'Αποθήκευση'}</Button>
            <Button asChild variant="outline">
              <Link href="/maintenance/contractors">Άκυρο</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


