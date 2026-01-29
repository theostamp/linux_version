'use client';

import { useEffect, useState } from 'react';
import { useSubmitVote } from '@/hooks/useSubmitVote';
import { toast } from 'sonner';
import type { LinkedVoteSubmission } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Props {
  voteId: number;
  choices: string[];
  isActive: boolean;
  buildingId?: number | null;
  submissions?: LinkedVoteSubmission[];
  defaultChoice?: string | null;
  onSubmitted?: () => void;
}

export default function VoteSubmitForm({
  voteId,
  choices,
  isActive,
  buildingId = null,
  submissions,
  defaultChoice = null,
  onSubmitted,
}: Readonly<Props>) {
  const { mutate: submitVote, isPending } = useSubmitVote();

  const [pendingApartmentId, setPendingApartmentId] = useState<number | null>(null);

  const [selectedByApartment, setSelectedByApartment] = useState<Record<number, string | null>>({});
  const [readyByApartment, setReadyByApartment] = useState<Record<number, boolean>>({});

  const [errorByApartment, setErrorByApartment] = useState<Record<number, string | null>>({});

  // Keep state aligned with server (e.g. after refetch)
  useEffect(() => {
    if (!submissions) return;
    setSelectedByApartment((prev) => {
      const next = { ...prev };
      for (const s of submissions) {
        if (s.choice) {
          next[s.apartment_id] = s.choice;
          continue;
        }
        if (!(s.apartment_id in next)) {
          next[s.apartment_id] = null;
        }
      }
      return next;
    });
  }, [submissions]);

  // Legacy fallback state (single submission per user)
  const [selectedLegacy, setSelectedLegacy] = useState<string | null>(null);
  const [errorLegacy, setErrorLegacy] = useState<string | null>(null);
  const [readyLegacy, setReadyLegacy] = useState(false);

  const formatDateTime = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    if (!defaultChoice) return;
    setSelectedLegacy(defaultChoice);
  }, [defaultChoice]);

  if (submissions && submissions.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Δεν βρέθηκαν επιλέξιμα διαμερίσματα για αυτή την ψηφοφορία.
      </div>
    );
  }

  if (submissions && submissions.length > 0) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-indigo-900">
          <div className="font-semibold mb-1">Πώς λειτουργεί</div>
          <ul className="space-y-1 text-indigo-800">
            <li>• Επιλέγετε ψήφο για κάθε διαμέρισμα.</li>
            <li>• Με την υποβολή, εκδίδεται αποδεικτικό καταχώρισης.</li>
            <li>• Η τελευταία υποβολή ισχύει έως τη λήξη.</li>
          </ul>
        </div>

        {submissions.map((s) => {
          const alreadyVoted = s.choice !== null && s.choice !== undefined;
          const selected = selectedByApartment[s.apartment_id] ?? null;
          const error = errorByApartment[s.apartment_id] ?? null;
          const isThisPending = pendingApartmentId === s.apartment_id && isPending;
          const submittedAtLabel = formatDateTime(s.submitted_at);
          const receiptId = s.receipt_id ?? null;
          const readyToSubmit = readyByApartment[s.apartment_id] ?? false;
          const step = !selected ? 1 : readyToSubmit ? 3 : 2;
          const statusLabel = alreadyVoted
            ? (isActive ? `Τρέχουσα επιλογή: ${s.choice}` : `Ψηφίσατε: ${s.choice}`)
            : (isActive ? 'Δεν έχετε ψηφίσει' : 'Κλειστή');

          return (
            <div key={s.apartment_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Διαμέρισμα {s.apartment_number}
                  </div>
                  <div className="text-xs text-slate-500">{s.mills} χιλιοστά</div>
                </div>

                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium',
                    alreadyVoted
                      ? 'bg-emerald-100 text-emerald-800'
                      : isActive
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-700'
                  )}
                >
                  {statusLabel}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                {['Επιλογή', 'Επιβεβαίωση', 'Υποβολή'].map((label, index) => {
                  const stepIndex = index + 1;
                  const isActiveStep = step === stepIndex;
                  const isDone = step > stepIndex;
                  return (
                    <div key={`${s.apartment_id}-${label}`} className="flex items-center gap-2">
                      <span
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold',
                          isDone && 'border-emerald-500 bg-emerald-500 text-white',
                          isActiveStep && !isDone && 'border-indigo-500 text-indigo-600',
                          !isActiveStep && !isDone && 'border-slate-200 text-slate-400'
                        )}
                      >
                        {stepIndex}
                      </span>
                      <span className={cn(isActiveStep ? 'text-slate-700' : 'text-slate-400')}>{label}</span>
                      {stepIndex < 3 && <span className="text-slate-300">—</span>}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 space-y-2">
                {alreadyVoted && (receiptId || submittedAtLabel) && (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-[11px] text-emerald-800">
                    {receiptId && (
                      <span className="mr-2">
                        Receipt: <span className="font-semibold">{receiptId}</span>
                      </span>
                    )}
                    {submittedAtLabel && (
                      <span>
                        Χρόνος: <span className="font-semibold">{submittedAtLabel}</span>
                      </span>
                    )}
                  </div>
                )}

                {choices.map((c) => (
                  <label
                    key={`${s.apartment_id}-${c}`}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-4 py-2 transition',
                      selected === c ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200',
                      !isActive ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50',
                    )}
                  >
                    <input
                      type="radio"
                      name={`choice-${s.apartment_id}`}
                      value={c}
                      checked={selected === c}
                      onChange={() => {
                        setErrorByApartment((prev) => ({ ...prev, [s.apartment_id]: null }));
                        setSelectedByApartment((prev) => ({ ...prev, [s.apartment_id]: c }));
                        setReadyByApartment((prev) => ({ ...prev, [s.apartment_id]: false }));
                      }}
                      className="accent-indigo-600"
                      disabled={!isActive || isPending}
                    />
                    {c}
                  </label>
                ))}

                {selected && !readyToSubmit && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                    Θα υποβληθεί: <span className="font-semibold text-slate-900">{selected}</span>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReadyByApartment((prev) => ({ ...prev, [s.apartment_id]: true }));
                        }}
                        className="w-full rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-indigo-700 transition hover:bg-indigo-100"
                      >
                        Συνέχεια στην υποβολή
                      </button>
                    </div>
                  </div>
                )}

                {readyToSubmit && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorByApartment((prev) => ({ ...prev, [s.apartment_id]: null }));
                        if (!selected) {
                          setErrorByApartment((prev) => ({ ...prev, [s.apartment_id]: 'Παρακαλώ επιλέξτε μία επιλογή.' }));
                          return;
                        }

                        setPendingApartmentId(s.apartment_id);
                        submitVote(
                          { voteId, option: selected, buildingId, apartmentId: s.apartment_id },
                          {
                            onSuccess: () => {
                              toast.success(`Η ψήφος καταχωρήθηκε για το διαμέρισμα ${s.apartment_number}!`);
                              setPendingApartmentId(null);
                              setReadyByApartment((prev) => ({ ...prev, [s.apartment_id]: false }));
                              if (onSubmitted) onSubmitted();
                            },
                            onError: (err: unknown) => {
                              setPendingApartmentId(null);
                              const apiError = err as { response?: { body?: string }; message?: string };
                              const body = apiError?.response?.body;
                              if (body) {
                                try {
                                  const parsed = JSON.parse(body) as { error?: string };
                                  if (parsed?.error) {
                                    setErrorByApartment((prev) => ({ ...prev, [s.apartment_id]: parsed.error || null }));
                                    return;
                                  }
                                } catch {
                                  // Ignore JSON parse errors and fall back to generic message
                                }
                              }
                              setErrorByApartment((prev) => ({ ...prev, [s.apartment_id]: apiError?.message || 'Αποτυχία υποβολής ψήφου.' }));
                            },
                          }
                        );
                      }}
                      disabled={isThisPending || !isActive || !selected}
                      className={cn(
                        'w-full rounded-lg bg-indigo-600 px-4 py-2 text-white transition',
                        'hover:bg-indigo-700 disabled:opacity-50',
                      )}
                    >
                      {isThisPending ? 'Υποβολή...' : alreadyVoted ? 'Αλλαγή Ψήφου' : 'Υποβολή Ψήφου'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReadyByApartment((prev) => ({ ...prev, [s.apartment_id]: false }))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-600 transition hover:bg-slate-50"
                    >
                      Πίσω στην επιλογή
                    </button>
                  </div>
                )}

                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
            </div>
          );
        })}

        <div className="text-[11px] text-slate-500">
          * Η συμμετοχή σας (ανά διαμέρισμα) προσμετράται στην απαρτία.
        </div>
      </div>
    );
  }

  // Fallback for legacy standalone votes (single submission per user)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErrorLegacy(null);

        if (!selectedLegacy) {
          setErrorLegacy('Παρακαλώ επιλέξτε μία επιλογή.');
          return;
        }

        submitVote(
          { voteId, option: selectedLegacy, buildingId },
          {
            onSuccess: () => {
              toast.success('Η ψήφος σας καταχωρήθηκε!');
              if (onSubmitted) onSubmitted();
            },
            onError: (err: unknown) => {
              const apiError = err as { response?: { body?: string }; message?: string };
              const body = apiError?.response?.body;
              if (body) {
                try {
                  const parsed = JSON.parse(body) as { error?: string };
                  if (parsed?.error) {
                    setErrorLegacy(parsed.error);
                    return;
                  }
                } catch {
                  // Ignore JSON parse errors and fall back to generic message
                }
              }
              setErrorLegacy(apiError?.message || 'Αποτυχία υποβολής ψήφου.');
            },
          }
        );
      }}
      className="space-y-3 animate-fade-in"
    >
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        {['Επιλογή', 'Επιβεβαίωση', 'Υποβολή'].map((label, index) => {
          const stepIndex = index + 1;
          const step = !selectedLegacy ? 1 : readyLegacy ? 3 : 2;
          const isActiveStep = step === stepIndex;
          const isDone = step > stepIndex;
          return (
            <div key={`${label}-${index}`} className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold',
                  isDone && 'border-emerald-500 bg-emerald-500 text-white',
                  isActiveStep && !isDone && 'border-indigo-500 text-indigo-600',
                  !isActiveStep && !isDone && 'border-slate-200 text-slate-400'
                )}
              >
                {stepIndex}
              </span>
              <span className={cn(isActiveStep ? 'text-slate-700' : 'text-slate-400')}>{label}</span>
              {stepIndex < 3 && <span className="text-slate-300">—</span>}
            </div>
          );
        })}
      </div>

      {choices.map((c) => (
        <label
          key={c}
          className={cn(
            'flex items-center gap-2 rounded border px-4 py-2 transition',
            selectedLegacy === c ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200',
            !isActive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-indigo-50',
          )}
        >
          <input
            type="radio"
            name="choice"
            value={c}
            checked={selectedLegacy === c}
            onChange={() => {
              setSelectedLegacy(c);
              setReadyLegacy(false);
            }}
            className="accent-indigo-600"
            disabled={!isActive}
          />
          {c}
        </label>
      ))}

      {selectedLegacy && !readyLegacy && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          Θα υποβληθεί: <span className="font-semibold text-slate-900">{selectedLegacy}</span>
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setReadyLegacy(true)}
              className="w-full rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-indigo-700 transition hover:bg-indigo-100"
            >
              Συνέχεια στην υποβολή
            </button>
          </div>
        </div>
      )}

      {readyLegacy && (
        <div className="space-y-2">
          <button
            type="submit"
            disabled={isPending || selectedLegacy === null || !isActive}
            className="w-full rounded bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {isPending ? 'Υποβολή...' : 'Υποβολή Ψήφου'}
          </button>
          <button
            type="button"
            onClick={() => setReadyLegacy(false)}
            className="w-full rounded border border-slate-200 bg-white px-4 py-2 text-slate-600 transition hover:bg-slate-50"
          >
            Πίσω στην επιλογή
          </button>
        </div>
      )}

      {errorLegacy && <p className="text-red-600 text-sm">{errorLegacy}</p>}
    </form>
  );
}
