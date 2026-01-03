'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, FileDown, Loader2 } from 'lucide-react';

import { apiGetBlob } from '@/lib/api';
import { useAuth } from '@/components/contexts/AuthContext';
import { Button } from '@/components/ui/button';

type DownloadStatus = 'idle' | 'loading' | 'success' | 'error';

const pickExtension = (mimeType: string | undefined) => {
  if (!mimeType) return 'jpg';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  return 'bin';
};

export default function CommonExpenseSheetDownloadPage() {
  const { isAuthReady, isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const buildingId = searchParams.get('building_id') || searchParams.get('building') || '';
  const month = searchParams.get('month') || '';
  const periodId = searchParams.get('period_id') || '';
  const hasRequiredParams = Boolean(buildingId && (month || periodId));

  const [status, setStatus] = useState<DownloadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const redirectTarget = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const downloadSheet = useCallback(async () => {
    if (!hasRequiredParams) return;
    setStatus('loading');
    setErrorMessage('');

    try {
      const blob = await apiGetBlob('/financial/common-expenses/sheet', {
        building_id: buildingId,
        month: month || undefined,
        period_id: periodId || undefined,
      });

      const extension = pickExtension(blob.type);
      const fileName = month
        ? `koinoxrista-${month}.${extension}`
        : periodId
          ? `koinoxrista-period-${periodId}.${extension}`
          : `koinoxrista.${extension}`;

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);

      setStatus('success');
    } catch (error) {
      const statusCode = (error as { status?: number; response?: { status?: number } })?.status ??
        (error as { response?: { status?: number } })?.response?.status;

      if (statusCode === 401) {
        setErrorMessage('Χρειάζεται σύνδεση για να κατεβάσετε το φύλλο κοινοχρήστων.');
      } else if (statusCode === 403) {
        setErrorMessage('Δεν έχετε πρόσβαση στο φύλλο κοινοχρήστων αυτής της πολυκατοικίας.');
      } else if (statusCode === 404) {
        setErrorMessage('Δεν βρέθηκε φύλλο κοινοχρήστων για την επιλεγμένη περίοδο.');
      } else {
        setErrorMessage('Η λήψη απέτυχε. Παρακαλούμε δοκιμάστε ξανά.');
      }

      setStatus('error');
    }
  }, [buildingId, month, periodId, hasRequiredParams]);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) return;
    if (!hasRequiredParams) return;
    if (status !== 'idle') return;
    void downloadSheet();
  }, [isAuthReady, isAuthenticated, hasRequiredParams, status, downloadSheet]);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main-light)]">
        <Loader2 className="h-10 w-10 text-accent-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const encodedRedirect = encodeURIComponent(redirectTarget);
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main-light)] px-4">
        <div className="max-w-lg w-full rounded-2xl border border-gray-200 bg-white p-8 shadow-card-soft text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary">Απαιτείται σύνδεση</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Για να κατεβάσετε το φύλλο κοινοχρήστων χρειάζεται να συνδεθείτε.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button asChild size="full">
              <Link href={`/login/resident?redirect=${encodedRedirect}`}>Σύνδεση ενοίκου</Link>
            </Button>
            <Button asChild variant="outline" size="full">
              <Link href={`/login/office?redirect=${encodedRedirect}`}>Σύνδεση διαχείρισης</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasRequiredParams) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main-light)] px-4">
        <div className="max-w-lg w-full rounded-2xl border border-gray-200 bg-white p-8 shadow-card-soft text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
          <h1 className="mt-4 text-lg font-semibold text-text-primary">Λείπουν στοιχεία</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Χρειάζεται building_id και month ή period_id για να βρεθεί το φύλλο κοινοχρήστων.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main-light)] px-4">
      <div className="max-w-lg w-full rounded-2xl border border-gray-200 bg-white p-8 shadow-card-soft text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto h-12 w-12 text-accent-primary animate-spin" />
            <h1 className="mt-4 text-lg font-semibold text-text-primary">Κατεβάζουμε το φύλλο...</h1>
            <p className="mt-2 text-sm text-text-secondary">Η λήψη θα ξεκινήσει αυτόματα.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <h1 className="mt-4 text-lg font-semibold text-text-primary">Το φύλλο κατέβηκε</h1>
            <p className="mt-2 text-sm text-text-secondary">
              Αν δεν ξεκίνησε η λήψη, πατήστε ξανά το κουμπί.
            </p>
            <div className="mt-6">
              <Button onClick={downloadSheet} size="full">
                <FileDown className="mr-2 h-4 w-4" />
                Κατέβασμα ξανά
              </Button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mt-4 text-lg font-semibold text-text-primary">Δεν ήταν δυνατή η λήψη</h1>
            <p className="mt-2 text-sm text-text-secondary">{errorMessage}</p>
            <div className="mt-6">
              <Button onClick={downloadSheet} size="full">
                Δοκιμάστε ξανά
              </Button>
            </div>
          </>
        )}

        {status === 'idle' && (
          <>
            <FileDown className="mx-auto h-12 w-12 text-accent-primary" />
            <h1 className="mt-4 text-lg font-semibold text-text-primary">Έτοιμο για λήψη</h1>
            <p className="mt-2 text-sm text-text-secondary">
              Πατήστε το κουμπί για να κατεβάσετε το φύλλο κοινοχρήστων.
            </p>
            <div className="mt-6">
              <Button onClick={downloadSheet} size="full">
                Λήψη φύλλου
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
