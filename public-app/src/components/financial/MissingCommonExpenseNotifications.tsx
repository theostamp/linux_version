'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Building2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { api } from '@/lib/api';
import {
  COMMON_EXPENSES_SENT_EVENT,
  getLastCommonExpensesAttempt,
  type CommonExpensesSendAttempt,
} from '@/lib/api/notifications';
import { useAuth } from '@/components/contexts/AuthContext';
import { hasOfficeAdminAccess, userHasRole } from '@/lib/roleUtils';

const EMPTY_LIST: MissingBuildingEntry[] = [];

type MissingBuildingEntry = {
  building_id: number;
  building_name: string;
  period_id?: number | null;
  period_name?: string | null;
  notifications_sent_at?: string | null;
  reason?: 'no_period' | 'not_sent_this_month' | string | null;
};

type MissingNotificationsResponse = {
  reference_month?: string;
  current_month_start?: string;
  missing_count?: number;
  missing_buildings?: MissingBuildingEntry[];
};

const reasonLabels: Record<string, string> = {
  no_period: 'Δεν έχει εκδοθεί περίοδος',
  not_sent_this_month: 'Δεν στάλθηκαν email αυτόν τον μήνα',
};

const FAILURE_NOTE_WINDOW_MS = 1000 * 60 * 60 * 24 * 7;
const DISMISS_STORAGE_KEY = 'missing_common_expenses_notice_dismissed_v1';

const formatReferenceMonth = (referenceMonth?: string): string => {
  if (!referenceMonth) return '';
  const [year, month] = referenceMonth.split('-').map(Number);
  if (!year || !month) return referenceMonth;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
};

const formatAttemptTimestamp = (timestamp?: string | null) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('el-GR', { dateStyle: 'short', timeStyle: 'short' });
};

export default function MissingCommonExpenseNotifications() {
  const { user, isAuthenticated, isAuthReady } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [data, setData] = useState<MissingNotificationsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<CommonExpensesSendAttempt | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const refreshEvent = COMMON_EXPENSES_SENT_EVENT;

  const canView = useMemo(() => {
    return (
      isAuthenticated &&
      (hasOfficeAdminAccess(user) || userHasRole(user, ['internal_manager']))
    );
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthReady || !canView) return;
    let isActive = true;

    const loadMissing = async () => {
      setLastAttempt(getLastCommonExpensesAttempt());
      setIsLoading(true);
      try {
        const response = await api.get<MissingNotificationsResponse>(
          '/financial/common-expenses/missing-notifications/'
        );
        if (!isActive) return;
        setData(response);
      } catch (error) {
        if (!isActive) return;
        setData(null);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadMissing();

    return () => {
      isActive = false;
    };
  }, [isAuthReady, canView]);

  useEffect(() => {
    if (!isAuthReady || !canView || typeof window === 'undefined') return;
    let isActive = true;

    const handleRefresh = () => {
      setLastAttempt(getLastCommonExpensesAttempt());
      setIsLoading(true);
      api
        .get<MissingNotificationsResponse>('/financial/common-expenses/missing-notifications/')
        .then((response) => {
          if (!isActive) return;
          setData(response);
        })
        .catch(() => {
          if (!isActive) return;
          setData(null);
        })
        .finally(() => {
          if (!isActive) return;
          setIsLoading(false);
        });
    };

    window.addEventListener(refreshEvent, handleRefresh);
    return () => {
      isActive = false;
      window.removeEventListener(refreshEvent, handleRefresh);
    };
  }, [isAuthReady, canView, refreshEvent]);

  const missingBuildings = data?.missing_buildings ?? EMPTY_LIST;
  const missingCount = missingBuildings.length;

  const entries = useMemo(() => {
    return [...missingBuildings].sort((a, b) =>
      (a.building_name || '').localeCompare(b.building_name || '', 'el')
    );
  }, [missingBuildings]);

  const referenceLabel = useMemo(() => {
    return formatReferenceMonth(data?.reference_month);
  }, [data?.reference_month]);

  const headerMonth = referenceLabel || data?.reference_month || 'προηγούμενου μήνα';

  const failedAttemptNote = useMemo(() => {
    if (!lastAttempt || lastAttempt.status !== 'failed') return null;
    const timestamp = new Date(lastAttempt.timestamp);
    if (Number.isNaN(timestamp.getTime())) return null;
    if (Date.now() - timestamp.getTime() > FAILURE_NOTE_WINDOW_MS) return null;
    return formatAttemptTimestamp(lastAttempt.timestamp);
  }, [lastAttempt]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!data?.reference_month) {
      setIsDismissed(false);
      return;
    }
    try {
      const stored = window.localStorage.getItem(DISMISS_STORAGE_KEY);
      if (!stored) {
        setIsDismissed(false);
        return;
      }
      const parsed = JSON.parse(stored) as { reference_month?: string; missing_count?: number };
      const matchesReference = parsed?.reference_month === data.reference_month;
      const matchesCount = typeof parsed?.missing_count === 'number'
        ? parsed.missing_count === missingCount
        : true;
      setIsDismissed(matchesReference && matchesCount);
    } catch {
      setIsDismissed(false);
    }
  }, [data?.reference_month, missingCount]);

  const handleDismiss = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        DISMISS_STORAGE_KEY,
        JSON.stringify({
          reference_month: data?.reference_month ?? null,
          missing_count: missingCount,
          dismissed_at: new Date().toISOString(),
        })
      );
    } catch {}
    setIsDismissed(true);
  };

  if (!isAuthReady || !canView || (isLoading && !data) || missingCount === 0 || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-6 z-50 max-w-[calc(100vw-2.5rem)]">
      <div className="w-80 max-w-full rounded-2xl border border-border/70 bg-card/95 shadow-lg backdrop-blur">
        <div className="flex w-full items-center justify-between gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  Κοινοχρήστα {headerMonth}
                </div>
                <div className="text-xs text-muted-foreground">
                  Εκκρεμεί αποστολή σε {missingCount} κτίρια
                </div>
              </div>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            aria-label="Κλείσιμο ειδοποίησης"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {isExpanded && (
          <div className="space-y-3 px-4 pb-4">
            <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
              {entries.map((entry) => {
                const reason = entry.reason ? reasonLabels[entry.reason] : undefined;
                return (
                  <Link
                    key={entry.building_id}
                    href={`/financial?building=${entry.building_id}`}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/70 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
                  >
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">{entry.building_name}</div>
                      {entry.period_name && (
                        <div className="text-xs text-muted-foreground">
                          Περίοδος: {entry.period_name}
                        </div>
                      )}
                      {reason && (
                        <div className="text-xs text-amber-700">{reason}</div>
                      )}
                    </div>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
            {failedAttemptNote && missingCount > 0 && (
              <div className="rounded-xl border border-amber-200/70 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
                <div className="font-medium">
                  Η τελευταία αποστολή απέτυχε στις {failedAttemptNote}.
                </div>
                <div className="text-amber-800">
                  Ελέγξτε σύνδεση email/SMTP, τα emails των διαμερισμάτων, και δοκιμάστε ξανά.
                </div>
              </div>
            )}
            <div className="text-[11px] text-muted-foreground">
              Έλεγχος αποστολής για τον προηγούμενο μήνα.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
