'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FileText, Upload, CheckCircle2 } from 'lucide-react';

import { apiGet, apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type OfferRequestByToken = {
  token: string;
  status: 'sent' | 'opened' | 'submitted' | 'cancelled' | string;
  provider_name: string;
  project_title: string;
  project_description: string;
  message_to_provider?: string;
};

export default function MarketplaceOfferRequestPage() {
  const params = useParams();
  const token = String((params as { token?: string })?.token || '');

  const [data, setData] = useState<OfferRequestByToken | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [advancePayment, setAdvancePayment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'one_time' | 'installments' | 'other'>('one_time');
  const [installments, setInstallments] = useState('');
  const [completionTime, setCompletionTime] = useState('');
  const [warrantyPeriod, setWarrantyPeriod] = useState('');
  const [description, setDescription] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOfferId, setSubmittedOfferId] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!amount.trim()) return false;
    if (paymentMethod === 'installments' && !installments.trim()) return false;
    return true;
  }, [amount, paymentMethod, installments]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await apiGet<OfferRequestByToken>(`/marketplace/offer-requests/by-token/${encodeURIComponent(token)}/`);
        if (cancelled) return;
        setData(res);
      } catch (e: unknown) {
        if (cancelled) return;
        setError((e as { message?: string })?.message || 'Αποτυχία φόρτωσης αιτήματος προσφοράς.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    if (token) load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const form = new FormData();
      form.append('amount', amount);
      if (advancePayment.trim()) form.append('advance_payment', advancePayment);
      form.append('payment_method', paymentMethod);
      if (installments.trim()) form.append('installments', installments);
      if (completionTime.trim()) form.append('completion_time', completionTime);
      if (warrantyPeriod.trim()) form.append('warranty_period', warrantyPeriod);
      if (description.trim()) form.append('description', description);
      if (paymentTerms.trim()) form.append('payment_terms', paymentTerms);
      files.forEach((f) => form.append('files', f));

      const res = await apiPost<{ offer_id: string }>(
        `/marketplace/offer-requests/by-token/${encodeURIComponent(token)}/submit/`,
        form,
      );

      setSubmittedOfferId(res.offer_id);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message || 'Αποτυχία υποβολής προσφοράς.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/marketplace" className="text-sm text-accent-primary hover:opacity-80">
          ← Επιστροφή στο Marketplace
        </Link>
        <div className="text-xs text-text-secondary font-mono">{token.slice(0, 8)}…</div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-text-secondary">Φόρτωση…</div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">{error}</div>
      ) : !data ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-text-secondary">Δεν βρέθηκαν δεδομένα.</div>
      ) : submittedOfferId ? (
        <div className="rounded-3xl border border-accent-primary/20 bg-accent-primary/10 p-8 text-accent-primary space-y-3">
          <div className="flex items-center gap-2 font-semibold text-lg text-text-primary">
            <CheckCircle2 className="w-5 h-5" />
            Η προσφορά υποβλήθηκε επιτυχώς
          </div>
          <p className="text-sm text-text-secondary">
            Ευχαριστούμε! Η ομάδα/διαχείριση θα δει την προσφορά σας μέσα στην εφαρμογή.
          </p>
          <p className="text-xs text-text-secondary font-mono">Offer ID: {submittedOfferId}</p>
        </div>
      ) : (
        <>
          <div className="rounded-3xl border border-gray-200 bg-white p-8 space-y-3 shadow-card-soft">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs text-text-secondary">Αίτημα προσφοράς προς</p>
                <h1 className="text-2xl font-semibold text-text-primary">{data.provider_name}</h1>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-bg-app-main px-3 py-1 text-xs text-text-secondary">
                <FileText className="w-4 h-4" />
                {data.status}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-bg-app-main p-5">
              <p className="text-sm text-text-primary font-semibold">{data.project_title}</p>
              {data.project_description ? (
                <p className="mt-2 text-sm text-text-secondary whitespace-pre-wrap">{data.project_description}</p>
              ) : null}
              {data.message_to_provider ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm whitespace-pre-wrap">
                  {data.message_to_provider}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-8 space-y-5 shadow-card-soft">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm text-text-secondary">Ποσό προσφοράς *</label>
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="π.χ. 12500" className="focus-visible:ring-accent-primary/30 focus-visible:border-accent-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-text-secondary">Προκαταβολή (€)</label>
                <Input value={advancePayment} onChange={(e) => setAdvancePayment(e.target.value)} placeholder="π.χ. 2000" className="focus-visible:ring-accent-primary/30 focus-visible:border-accent-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-text-secondary">Τρόπος πληρωμής</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="h-10 w-full rounded-md bg-white border border-gray-200 px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary"
                >
                  <option value="one_time">Εφάπαξ πληρωμή</option>
                  <option value="installments">Δόσεις</option>
                  <option value="other">Άλλο</option>
                </select>
              </div>
              <div className={cn('space-y-1', paymentMethod !== 'installments' && 'opacity-60')}>
                <label className="text-sm text-text-secondary">Αριθμός δόσεων</label>
                <Input
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  placeholder="π.χ. 3"
                  disabled={paymentMethod !== 'installments'}
                  className="focus-visible:ring-accent-primary/30 focus-visible:border-accent-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-text-secondary">Χρόνος ολοκλήρωσης</label>
                <Input value={completionTime} onChange={(e) => setCompletionTime(e.target.value)} placeholder="π.χ. 2 μήνες" className="focus-visible:ring-accent-primary/30 focus-visible:border-accent-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-text-secondary">Περίοδος εγγύησης</label>
                <Input value={warrantyPeriod} onChange={(e) => setWarrantyPeriod(e.target.value)} placeholder="π.χ. 12 μήνες" className="focus-visible:ring-accent-primary/30 focus-visible:border-accent-primary" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-text-secondary">Περιγραφή εργασιών</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Αναλυτική περιγραφή υλικών, εργασιών και χρονοδιαγράμματος"
                className="min-h-[120px] focus-visible:ring-accent-primary/30"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-text-secondary">Όροι πληρωμής / σημειώσεις</label>
              <Textarea
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="Περιγράψτε τους όρους πληρωμής, τις παρατηρήσεις ή ειδικές απαιτήσεις"
                className="min-h-[120px] focus-visible:ring-accent-primary/30"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Upload className="w-4 h-4" />
                Συνημμένα (προαιρετικά)
              </div>
              <input
                type="file"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="block w-full text-sm text-text-secondary file:mr-4 file:rounded-md file:border-0 file:bg-accent-primary file:px-4 file:py-2 file:text-white hover:file:opacity-90"
              />
              {files.length ? (
                <div className="text-xs text-text-secondary">
                  Επιλεγμένα: {files.map((f) => f.name).join(', ')}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button disabled={!canSubmit || isSubmitting} onClick={submit}>
                {isSubmitting ? 'Υποβολή…' : 'Υποβολή προσφοράς'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
