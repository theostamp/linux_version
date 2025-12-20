'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { AlertTriangle, CheckCircle2, Euro } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type ApartmentStatus = {
  apartment_number: string;
  has_pending: boolean;
};

const apartmentSortKey = (value: string) => {
  const raw = value.trim();
  const digitsMatch = raw.match(/\d+/);
  const digits = digitsMatch?.[0] ?? '';
  const num = digits ? Number(digits) : Number.POSITIVE_INFINITY;
  const prefix = raw.replace(/\d+/g, '').trim().toLowerCase();
  return { prefix, num, raw: raw.toLowerCase() };
};

function SummaryMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: { bg: string; border: string; value: string; label: string };
}) {
  return (
    <div className={`rounded-xl border p-2.5 ${tone.bg} ${tone.border}`}>
      <div className={`text-[11px] ${tone.label}`}>{label}</div>
      <div className={`mt-1 text-sm font-semibold tracking-tight ${tone.value}`}>{value}</div>
    </div>
  );
}

export default function ApartmentDebtsWidget({ data, isLoading, error }: BaseWidgetProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'apartments'>('summary');
  const rawTotalObligations =
    (typeof data?.financial?.total_obligations === 'number' && data.financial.total_obligations) ||
    (typeof data?.financial?.summary?.total_obligations === 'number' && data.financial.summary.total_obligations) ||
    0;
  const rawTotalPayments =
    (typeof data?.financial?.total_payments === 'number' && data.financial.total_payments) ||
    (typeof data?.financial?.summary?.total_payments === 'number' && data.financial.summary.total_payments) ||
    0;

  const totalObligations = Math.max(0, rawTotalObligations);
  const totalPayments = Math.max(0, rawTotalPayments);
  const totalRequirements = totalPayments + totalObligations;

  const derivedCoveragePercentage = totalRequirements > 0 ? (totalPayments / totalRequirements) * 100 : undefined;
  const fallbackCoveragePercentage =
    typeof data?.financial?.collection_rate === 'number' ? data.financial.collection_rate : undefined;
  const paymentCoveragePercentage = clamp(
    typeof derivedCoveragePercentage === 'number' ? derivedCoveragePercentage : fallbackCoveragePercentage ?? 0,
    0,
    100
  );

  const hasFinancialData = totalRequirements > 0 || typeof fallbackCoveragePercentage === 'number';
  const showWarning = totalRequirements > 0 && paymentCoveragePercentage < 75 && new Date().getDate() >= 15;

  const apartmentStatuses = useMemo<ApartmentStatus[]>(() => {
    const source = data?.financial?.apartment_statuses;
    if (!Array.isArray(source)) return [];

    return source
      .map((item: any) => ({
        apartment_number: typeof item?.apartment_number === 'string' ? item.apartment_number : String(item?.apartment_number ?? ''),
        has_pending: Boolean(item?.has_pending),
      }))
      .filter((item: ApartmentStatus) => item.apartment_number.trim().length > 0)
      .sort((a, b) => {
        const ka = apartmentSortKey(a.apartment_number);
        const kb = apartmentSortKey(b.apartment_number);
        if (ka.prefix !== kb.prefix) return ka.prefix.localeCompare(kb.prefix);
        if (ka.num !== kb.num) return ka.num - kb.num;
        return ka.raw.localeCompare(kb.raw);
      });
  }, [data?.financial?.apartment_statuses]);

  const pendingApartments = useMemo(() => apartmentStatuses.filter((apt) => apt.has_pending), [apartmentStatuses]);
  const okApartments = useMemo(() => apartmentStatuses.filter((apt) => !apt.has_pending), [apartmentStatuses]);
  const hasApartmentsTab = apartmentStatuses.length > 0;
  // Keep activeTab valid if data changes
  useEffect(() => {
    if (!hasApartmentsTab && activeTab === 'apartments') {
      setActiveTab('summary');
    }
  }, [hasApartmentsTab, activeTab]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-300">
        <div className="text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden flex flex-col gap-3">
      {!hasFinancialData ? (
        <div className="flex flex-col items-center justify-center flex-1 text-purple-300">
          <Euro className="w-12 h-12 mb-3 opacity-60" />
          <p className="text-sm font-medium">Δεν υπάρχουν διαθέσιμα στοιχεία</p>
          <p className="text-xs text-purple-400 mt-1">Δείτε αναλυτικά τα κοινόχρηστα στην εφαρμογή</p>
        </div>
      ) : (
        <>
          <div className="flex flex-1 min-h-0 gap-3">
            {/* Vertical Tabs (left column) */}
            {hasApartmentsTab && (
              <div className="w-[108px] shrink-0 rounded-xl overflow-hidden border border-indigo-500/20 bg-indigo-950/20 flex flex-col">
                <button
                  type="button"
                  className={`px-3 py-2 text-left text-xs font-semibold tracking-wide transition-colors ${
                    activeTab === 'summary'
                      ? 'bg-indigo-500/25 text-white'
                      : 'text-indigo-200/80 hover:bg-indigo-500/15'
                  }`}
                  onClick={() => setActiveTab('summary')}
                >
                  Σύνοψη
                </button>
                <button
                  type="button"
                  className={`px-3 py-2 text-left text-xs font-semibold tracking-wide transition-colors ${
                    activeTab === 'apartments'
                      ? 'bg-indigo-500/25 text-white'
                      : 'text-indigo-200/80 hover:bg-indigo-500/15'
                  }`}
                  onClick={() => setActiveTab('apartments')}
                >
                  Διαμερίσματα
                </button>
                <div className="mt-auto px-3 py-2 border-t border-indigo-500/15 text-[10px] text-indigo-200/60">
                  {apartmentStatuses.length} διαμ.
                </div>
              </div>
            )}

            {/* Content (right column) */}
            <div className="flex-1 min-w-0 flex flex-col gap-3">
              {showWarning && (
                <div className="bg-orange-500/20 border border-orange-400/50 rounded-lg p-2 text-center animate-pulse">
                  <p className="text-orange-300 text-xs font-bold">⚠️ Χαμηλή Κάλυψη Εισπράξεων</p>
                </div>
              )}

              {activeTab === 'summary' && (
                <>
                  <div className="bg-indigo-900/20 backdrop-blur-sm rounded-xl border border-indigo-500/20 p-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-indigo-300 font-medium">Κάλυψη Μήνα</span>
                      <span className={`font-bold ${paymentCoveragePercentage < 75 ? 'text-orange-300' : 'text-white'}`}>
                        {paymentCoveragePercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div
                      className="w-full bg-indigo-950/50 rounded-full h-5 overflow-hidden border border-indigo-700/30"
                      title={
                        totalRequirements > 0
                          ? `Εισπραχθέντα: ${formatCurrency(totalPayments)} / Σύνολο: ${formatCurrency(totalRequirements)}`
                          : undefined
                      }
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          paymentCoveragePercentage >= 75
                            ? 'bg-gradient-to-r from-green-500 to-emerald-400 shadow-lg shadow-green-500/50'
                            : 'bg-gradient-to-r from-orange-500 to-red-500 shadow-lg shadow-orange-500/50'
                        }`}
                        style={{ width: `${paymentCoveragePercentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <SummaryMetric
                      label="Εισπραχθέντα"
                      value={formatCurrency(totalPayments)}
                      tone={{
                        bg: 'bg-emerald-500/10',
                        border: 'border-emerald-400/25',
                        value: 'text-emerald-200',
                        label: 'text-emerald-200/80',
                      }}
                    />
                    <SummaryMetric
                      label="Υπόλοιπο"
                      value={formatCurrency(totalObligations)}
                      tone={{
                        bg: 'bg-orange-500/10',
                        border: 'border-orange-400/25',
                        value: 'text-orange-200',
                        label: 'text-orange-200/80',
                      }}
                    />
                    <SummaryMetric
                      label="Σύνολο"
                      value={formatCurrency(totalRequirements)}
                      tone={{
                        bg: 'bg-indigo-500/10',
                        border: 'border-indigo-400/25',
                        value: 'text-indigo-100',
                        label: 'text-indigo-200/80',
                      }}
                    />
                  </div>

                  {hasApartmentsTab && (
                    <div className="bg-indigo-900/20 backdrop-blur-sm rounded-xl border border-indigo-500/20 p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border px-3 py-2 text-left bg-orange-500/10 border-orange-400/25">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-300" />
                            <span className="text-xs font-semibold text-white">Εκκρεμότητες</span>
                          </div>
                          <div className="text-[11px] text-white/70">{pendingApartments.length} διαμερίσματα</div>
                        </div>
                        <div className="rounded-xl border px-3 py-2 text-left bg-emerald-500/10 border-emerald-400/25">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                            <span className="text-xs font-semibold text-white">Ενημερωμένα</span>
                          </div>
                          <div className="text-[11px] text-white/70">{okApartments.length} διαμερίσματα</div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'apartments' && hasApartmentsTab && (
                <div className="bg-indigo-900/20 backdrop-blur-sm rounded-xl border border-indigo-500/20 p-3 flex-1 min-h-0 overflow-hidden flex flex-col">
                  <div className="text-xs text-indigo-200/80 mb-2">Κατάσταση διαμερισμάτων</div>
                  <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1">
                    {apartmentStatuses.map((apt) => (
                      <div
                        key={apt.apartment_number}
                        className={`flex items-center justify-between rounded-lg px-2 py-1 border ${
                          apt.has_pending
                            ? 'bg-orange-500/10 border-orange-400/25 text-orange-100'
                            : 'bg-emerald-500/10 border-emerald-400/25 text-emerald-100'
                        }`}
                      >
                        <span className="text-xs font-semibold">Διαμ. {apt.apartment_number}</span>
                        <span className="text-[11px] opacity-80">{apt.has_pending ? 'Εκκρεμεί' : 'ΟΚ'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
