'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BackButton } from '@/components/ui/BackButton';
import { useRole } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export default function EditOfferPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { isAdmin, isManager, isLoading } = useRole();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [deliveryTime, setDeliveryTime] = useState<string>('');
  const [warrantyPeriod, setWarrantyPeriod] = useState<string>('');
  const [status, setStatus] = useState<string>('pending');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: o } = await api.get(`/projects/offers/${id}/`);
        setAmount(String(o.amount ?? ''));
        setDescription(String(o.description ?? ''));
        setDeliveryTime(String(o.delivery_time ?? ''));
        setWarrantyPeriod(String(o.warranty_period ?? ''));
        setStatus(String(o.status ?? 'pending'));
      } catch (e: any) {
        setError(e?.message ?? 'Σφάλμα φόρτωσης');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  if (isLoading) return null;
  if (!(isAdmin || isManager)) {
    if (typeof window !== 'undefined') router.push('/projects/offers');
    return null;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload: any = {
        amount: parseFloat(amount),
        description,
        delivery_time: parseInt(deliveryTime),
        warranty_period: parseInt(warrantyPeriod),
        status,
      };
      await api.patch(`/projects/offers/${id}/`, payload);
      toast({ title: 'Επιτυχία', description: 'Η προσφορά ενημερώθηκε.' });
      router.push('/projects/offers');
    } catch (e: any) {
      setError(e?.message ?? 'Σφάλμα ενημέρωσης');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Επεξεργασία Προσφοράς #{id}</CardTitle>
            <BackButton />
          </div>
        </CardHeader>
        <CardContent>
          {loading && <div className="text-sm">Φόρτωση...</div>}
          {error && <div className="text-sm text-red-600 mb-4">{error}</div>}
          {!loading && (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ποσό (€)</label>
                  <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Χρόνος Παράδοσης (ημέρες)</label>
                  <Input type="number" value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Περίοδος Εγγύησης (μήνες)</label>
                  <Input type="number" value={warrantyPeriod} onChange={(e) => setWarrantyPeriod(e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Περιγραφή</label>
                <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Κατάσταση</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded px-3 py-2 text-sm w-full">
                  <option value="pending">Εκκρεμεί</option>
                  <option value="under_review">Υπό Αξιολόγηση</option>
                  <option value="accepted">Αποδεκτή</option>
                  <option value="rejected">Απορριφθείσα</option>
                  <option value="withdrawn">Αποσυρθείσα</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button asChild variant="outline"><Link href="/projects/offers">Άκυρο</Link></Button>
                <Button type="submit" disabled={saving}>{saving ? 'Αποθήκευση…' : 'Αποθήκευση'}</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


