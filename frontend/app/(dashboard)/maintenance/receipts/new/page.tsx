'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { createServiceReceipt, fetchContractors, type Contractor } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useBuilding } from '@/components/contexts/BuildingContext';

export default function NewReceiptPage() {
  const { selectedBuilding, currentBuilding } = useBuilding();
  const buildingToUse = selectedBuilding || currentBuilding;
  const { data: contractors = [] } = useQuery<Contractor[]>({
    queryKey: ['maintenance', 'contractors'],
    queryFn: fetchContractors,
    staleTime: 60_000,
  });

  const [contractor, setContractor] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!buildingToUse?.id) {
      setError('Δεν έχει επιλεγεί κτίριο.');
      return;
    }
    if (!contractor || !serviceDate || !amount || !description) {
      setError('Συμπληρώστε όλα τα υποχρεωτικά πεδία.');
      return;
    }
    setSubmitting(true);
    try {
      await createServiceReceipt({
        contractor: Number(contractor),
        building: buildingToUse.id,
        service_date: serviceDate,
        amount: amount,
        description: description.trim(),
        invoice_number: invoiceNumber || undefined,
        payment_status: 'pending',
        receipt_file: file || undefined,
      });
      window.location.href = '/maintenance/receipts';
    } catch (err) {
      setError('Αποτυχία αποθήκευσης. Δοκιμάστε ξανά.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Νέα Απόδειξη Υπηρεσίας</h1>
          <p className="text-muted-foreground">Καταχώριση απόδειξης/τιμολογίου συνεργείου</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/maintenance/receipts">
            <ArrowLeft className="w-4 h-4 mr-2" /> Πίσω στη λίστα
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Στοιχεία Απόδειξης</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contractor">Συνεργείο</Label>
                <select
                  id="contractor"
                  value={contractor}
                  onChange={(e) => setContractor(e.target.value)}
                  className="w-full border rounded-md p-2"
                >
                  <option value="">-- Επιλέξτε --</option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceDate">Ημ/νία υπηρεσίας</Label>
                <Input id="serviceDate" type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Ποσό (€)</Label>
                <Input id="amount" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice">Αριθμός Τιμολογίου (προαιρετικό)</Label>
                <Input id="invoice" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Περιγραφή</Label>
                <Textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="file">Αρχείο Απόδειξης (προαιρετικό)</Label>
                <Input id="file" type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center gap-2">
              <Button type="submit" disabled={submitting}>{submitting ? 'Αποθήκευση…' : 'Αποθήκευση'}</Button>
              <Button asChild variant="outline" type="button">
                <Link href="/maintenance/receipts">Άκυρο</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}



