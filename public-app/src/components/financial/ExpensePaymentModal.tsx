'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { Expense } from '@/types/financial';
import { formatCurrency } from '@/lib/utils';
import { useExpensePayments } from '@/hooks/useExpensePayments';
import { useInvoiceScan } from '@/hooks/useInvoiceScan';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { toast } from 'sonner';
import { X } from 'lucide-react';

interface ExpensePaymentModalProps {
  isOpen: boolean;
  expense: Expense | null;
  buildingId?: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Μετρητά' },
  { value: 'bank_transfer', label: 'Τραπεζική Μεταφορά' },
  { value: 'check', label: 'Επιταγή' },
  { value: 'card', label: 'Κάρτα' },
];

export const ExpensePaymentModal: React.FC<ExpensePaymentModalProps> = ({
  isOpen,
  expense,
  buildingId,
  onClose,
  onSuccess,
}) => {
  const { createExpensePayment, isLoading } = useExpensePayments(buildingId || undefined);
  const { selectedBuilding, buildingContext } = useBuilding();
  const { scanInvoiceAsync, isLoading: isScanning, data: scannedData, reset: resetScan } = useInvoiceScan();
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [method, setMethod] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [ocrFileName, setOcrFileName] = useState<string | null>(null);

  const isPremium = Boolean(
    buildingContext?.billing?.premium_enabled ?? selectedBuilding?.premium_enabled
  );

  const remainingAmount = useMemo(() => {
    if (!expense) return 0;
    if (typeof expense.remaining_amount === 'number') return expense.remaining_amount;
    return expense.amount || 0;
  }, [expense]);

  useEffect(() => {
    if (!isOpen || !expense) return;

    const today = new Date().toISOString().split('T')[0];
    const defaultAmount = remainingAmount > 0 ? remainingAmount : expense.amount || 0;

    setAmount(defaultAmount.toFixed(2));
    setPaymentDate(today);
    setMethod('');
    setReferenceNumber('');
    setNotes('');
    setReceipt(null);
    setOcrFileName(null);
    resetScan();
  }, [expense, isOpen, remainingAmount, resetScan]);

  useEffect(() => {
    if (!scannedData) return;

    if (typeof scannedData.amount === 'number') {
      setAmount(scannedData.amount.toFixed(2));
    }
    if (scannedData.date) {
      setPaymentDate(scannedData.date);
    }
    if (scannedData.document_number && !referenceNumber) {
      setReferenceNumber(scannedData.document_number);
    }
    if (scannedData.supplier && !notes) {
      setNotes(`OCR προμηθευτής: ${scannedData.supplier}`);
    }
  }, [scannedData, referenceNumber, notes]);

  if (!isOpen || !expense) return null;

  const parsedAmount = Number(amount) || 0;
  const remainingAfter = Math.max(remainingAmount - parsedAmount, 0);

  const handleSubmit = async () => {
    if (!expense) return;
    if (!paymentDate) {
      toast.error('Συμπληρώστε ημερομηνία εξόφλησης.');
      return;
    }
    if (!method) {
      toast.error('Επιλέξτε τρόπο πληρωμής.');
      return;
    }
    if (parsedAmount <= 0) {
      toast.error('Το ποσό πρέπει να είναι μεγαλύτερο του μηδενός.');
      return;
    }

    const result = await createExpensePayment({
      expense: expense.id,
      amount: parsedAmount,
      payment_date: paymentDate,
      method,
      reference_number: referenceNumber || undefined,
      notes: notes || undefined,
      receipt: receipt || undefined,
    });

    if (result) {
      onSuccess();
      onClose();
    }
  };

  const handleOcrFileSelect = async (file?: File | null) => {
    if (!file) return;
    if (!isPremium) {
      toast.error('Η λειτουργία OCR είναι διαθέσιμη μόνο σε Premium.');
      return;
    }

    setReceipt(file);
    setOcrFileName(file.name);
    try {
      await scanInvoiceAsync(file);
    } catch (err) {
      console.error('OCR scan failed:', err);
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 flex items-center justify-center z-[120] p-4 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl w-full max-w-xl shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Εξόφληση Δαπάνης</h2>
              <p className="text-sm text-gray-500">{expense.title}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="px-6 py-4 space-y-4">
            <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-3">
              <div>
                <div className="text-xs text-gray-500">Υπόλοιπο προς εξόφληση</div>
                <div className="text-lg font-semibold text-gray-900">{formatCurrency(remainingAmount)}</div>
              </div>
              <Badge variant="outline" className="text-xs">
                {expense.payment_status_display || 'Απλήρωτο'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expense-payment-amount">Ποσό Πληρωμής</Label>
                <Input
                  id="expense-payment-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Υπόλοιπο μετά την πληρωμή: {formatCurrency(remainingAfter)}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-payment-date">Ημερομηνία Εξόφλησης</Label>
                <Input
                  id="expense-payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Τρόπος Πληρωμής</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε τρόπο" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-payment-reference">Αριθμός Αναφοράς</Label>
                <Input
                  id="expense-payment-reference"
                  placeholder="Π.χ. αριθμός συναλλαγής"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-payment-notes">Σημειώσεις</Label>
              <Textarea
                id="expense-payment-notes"
                placeholder="Προαιρετικές σημειώσεις για την πληρωμή"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-payment-receipt">Απόδειξη / Παραστατικό</Label>
              <Input
                id="expense-payment-receipt"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setReceipt(e.target.files?.[0] || null)}
              />
              {receipt && (
                <p className="text-xs text-gray-500">Επιλεγμένο αρχείο: {receipt.name}</p>
              )}
            </div>

            <div className="space-y-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="expense-payment-ocr" className="text-sm">OCR Παραστατικού</Label>
                {!isPremium && (
                  <Badge variant="outline" className="text-xs">Premium</Badge>
                )}
              </div>
              <Input
                id="expense-payment-ocr"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                disabled={!isPremium || isScanning}
                onChange={(e) => handleOcrFileSelect(e.target.files?.[0] || null)}
              />
              {isScanning && (
                <p className="text-xs text-blue-600">Ανάλυση παραστατικού σε εξέλιξη...</p>
              )}
              {ocrFileName && (
                <p className="text-xs text-gray-500">OCR αρχείο: {ocrFileName}</p>
              )}
              {scannedData && (
                <div className="text-xs text-gray-600">
                  Αναγνώριση: {scannedData.amount ? `${scannedData.amount.toFixed(2)}€` : '—'} · {scannedData.date || '—'}
                </div>
              )}
              {!isPremium && (
                <p className="text-xs text-gray-500">
                  Διαθέσιμο σε Premium. <Link href="/upgrade" className="text-blue-600 hover:underline">Αναβάθμιση</Link>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Ακύρωση
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Αποθήκευση...' : 'Καταχώρηση Εξόφλησης'}
            </Button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
