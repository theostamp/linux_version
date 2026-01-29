'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Copy, Link as LinkIcon, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VerifyResponse {
  results_hash: string;
  audit_root_hash: string;
  events_count: number;
  generated_at: string;
  verify_url?: string | null;
}

export default function VerifyEvidencePage() {
  const searchParams = useSearchParams();
  const typeParam = (searchParams.get('type') || 'vote').toLowerCase();
  const type = typeParam === 'assembly' ? 'assembly' : 'vote';
  const id = searchParams.get('id') || '';

  const [expectedResultsHash, setExpectedResultsHash] = useState(searchParams.get('results_hash') || '');
  const [expectedAuditHash, setExpectedAuditHash] = useState(searchParams.get('audit_root_hash') || '');
  const [verifyData, setVerifyData] = useState<VerifyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpoint = useMemo(() => {
    if (!id) return '';
    return type === 'assembly'
      ? `/api/assemblies/${id}/verify/`
      : `/api/votes/${id}/verify/`;
  }, [id, type]);

  const fetchVerify = async () => {
    if (!endpoint) return;
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch(endpoint);
      if (resp.status === 401 || resp.status === 403) {
        setError('Χρειάζεται σύνδεση για επαλήθευση.');
        return;
      }
      if (!resp.ok) {
        const payload = await resp.json().catch(() => ({}));
        setError(payload?.error || 'Αποτυχία επαλήθευσης.');
        return;
      }
      const data = (await resp.json()) as VerifyResponse;
      setVerifyData(data);
    } catch (err) {
      setError('Αδυναμία σύνδεσης με τον διακομιστή.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!endpoint) return;
    fetchVerify();
  }, [endpoint]);

  const matches =
    Boolean(expectedResultsHash)
    && Boolean(expectedAuditHash)
    && verifyData
    && verifyData.results_hash === expectedResultsHash
    && verifyData.audit_root_hash === expectedAuditHash;

  const partialMatch =
    verifyData
    && ((expectedResultsHash && verifyData.results_hash === expectedResultsHash)
      || (expectedAuditHash && verifyData.audit_root_hash === expectedAuditHash));

  const copyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Αντιγράφηκε');
    } catch {
      toast.error('Αποτυχία αντιγραφής');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/40">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Επαλήθευση Πρακτικού</h1>
              <p className="text-sm text-slate-600">
                Συγκρίνουμε τα hashes του πρακτικού με τα υπολογισμένα δεδομένα του συστήματος.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={fetchVerify}
              disabled={isLoading || !endpoint}
              className="gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              Επαλήθευση
            </Button>
          </div>

          <div className="mt-6 grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <LinkIcon className="h-4 w-4" />
              Τύπος: <span className="font-semibold text-slate-900">{type}</span>
              <span className="text-slate-400">•</span>
              ID: <span className="font-semibold text-slate-900">{id || '—'}</span>
            </div>
            {!endpoint && (
              <div className="text-amber-700">
                Λείπει το ID ή ο τύπος επαλήθευσης στο URL.
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <AlertTriangle className="mr-2 inline h-4 w-4" />
              {error}
            </div>
          )}

          {verifyData && (
            <div className="mt-6 space-y-4">
              <div
                className={cn(
                  'rounded-2xl border p-4 text-sm',
                  matches
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : partialMatch
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : 'border-rose-200 bg-rose-50 text-rose-700'
                )}
              >
                {matches ? (
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    Τα hashes ταιριάζουν — το πρακτικό επαληθεύεται.
                  </div>
                ) : partialMatch ? (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Μερική αντιστοίχιση — ελέγξτε τις τιμές.
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Δεν υπάρχει αντιστοίχιση.
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase text-slate-500">Expected</div>
                  <label className="mt-2 block text-xs text-slate-500">Results hash</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                    value={expectedResultsHash}
                    onChange={(e) => setExpectedResultsHash(e.target.value)}
                    placeholder="results_hash"
                  />
                  <label className="mt-3 block text-xs text-slate-500">Audit root hash</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                    value={expectedAuditHash}
                    onChange={(e) => setExpectedAuditHash(e.target.value)}
                    placeholder="audit_root_hash"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase text-slate-500">Computed</div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="text-xs text-slate-500">Results hash</div>
                    <button
                      type="button"
                      className="text-xs text-emerald-700"
                      onClick={() => copyValue(verifyData.results_hash)}
                    >
                      <Copy className="inline h-3 w-3" />
                    </button>
                  </div>
                  <div className="mt-1 break-all rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    {verifyData.results_hash}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="text-xs text-slate-500">Audit root hash</div>
                    <button
                      type="button"
                      className="text-xs text-emerald-700"
                      onClick={() => copyValue(verifyData.audit_root_hash)}
                    >
                      <Copy className="inline h-3 w-3" />
                    </button>
                  </div>
                  <div className="mt-1 break-all rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    {verifyData.audit_root_hash}
                  </div>

                  <div className="mt-4 text-xs text-slate-500">
                    Events: <span className="font-semibold text-slate-700">{verifyData.events_count}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Generated: <span className="font-semibold text-slate-700">{verifyData.generated_at}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
