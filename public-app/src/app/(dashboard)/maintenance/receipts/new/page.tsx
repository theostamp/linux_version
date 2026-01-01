'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createServiceReceipt, type ServiceReceipt } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { BackButton } from '@/components/ui/BackButton';
import { getActiveBuildingId } from '@/lib/api';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { useQueryClient } from '@tanstack/react-query';

export default function NewReceiptPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const buildingId = getActiveBuildingId();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contractor: '',
    service_date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    invoice_number: '',
    payment_status: 'pending' as 'pending' | 'paid' | 'overdue',
  });

  async function handleSave() {
    if (!form.contractor || !form.service_date || !form.amount || !form.description) {
      toast({
        title: 'Σφάλμα',
        description: 'Συμπληρώστε όλα τα υποχρεωτικά πεδία.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await createServiceReceipt({
        contractor: parseInt(form.contractor),
        building: buildingId,
        service_date: form.service_date,
        amount: parseFloat(form.amount),
        description: form.description,
        invoice_number: form.invoice_number || undefined,
        payment_status: form.payment_status,
      });
      // ✅ Invalidate AND explicitly refetch for immediate UI update
      await queryClient.invalidateQueries({ queryKey: ['service-receipts'] });
      await queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      await queryClient.invalidateQueries({ queryKey: ['financial'] });
      await queryClient.refetchQueries({ queryKey: ['service-receipts'] });
      await queryClient.refetchQueries({ queryKey: ['maintenance'] });
      await queryClient.refetchQueries({ queryKey: ['financial'] });
      toast({ title: 'Αποθηκεύτηκε', description: 'Η απόδειξη δημιουργήθηκε.' });
      router.push('/maintenance/receipts');
    } catch (error) {
      console.error('Error creating receipt:', error);
      toast({
        title: 'Σφάλμα',
        description: 'Αποτυχία δημιουργίας απόδειξης.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGate>
      <SubscriptionGate>
        <div className="space-y-6 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Νέα Απόδειξη</h1>
            <BackButton href="/maintenance/receipts" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Στοιχεία</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="contractor">Συνεργείο ID *</Label>
                <Input
                  id="contractor"
                  type="number"
                  value={form.contractor}
                  onChange={(e) => setForm({ ...form, contractor: e.target.value })}
                  placeholder="Εισάγετε το ID του συνεργείου"
                />
              </div>
              <div>
                <Label htmlFor="service_date">Ημερομηνία Υπηρεσίας *</Label>
                <Input
                  id="service_date"
                  type="date"
                  value={form.service_date}
                  onChange={(e) => setForm({ ...form, service_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="amount">Ποσό (€) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="description">Περιγραφή *</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Περιγραφή της υπηρεσίας"
                />
              </div>
              <div>
                <Label htmlFor="invoice_number">Αριθμός Τιμολογίου</Label>
                <Input
                  id="invoice_number"
                  value={form.invoice_number}
                  onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                  placeholder="Προαιρετικό"
                />
              </div>
              <div>
                <Label htmlFor="payment_status">Κατάσταση Πληρωμής</Label>
                <select
                  id="payment_status"
                  className="w-full border rounded h-9 px-2"
                  value={form.payment_status}
                  onChange={(e) =>
                    setForm({ ...form, payment_status: e.target.value as 'pending' | 'paid' | 'overdue' })
                  }
                >
                  <option value="pending">Εκκρεμές</option>
                  <option value="paid">Πληρωμένο</option>
                  <option value="overdue">Καθυστέρηση</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Αποθήκευση…' : 'Αποθήκευση'}
                </Button>
                <Button asChild variant="outline">
                  <Link href="/maintenance/receipts">Άκυρο</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </SubscriptionGate>
    </AuthGate>
  );
}
