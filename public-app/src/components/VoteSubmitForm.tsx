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
  onSubmitted?: () => void;
}

export default function VoteSubmitForm({
  voteId,
  choices,
  isActive,
  buildingId = null,
  submissions,
  onSubmitted,
}: Readonly<Props>) {
  const { mutate: submitVote, isPending } = useSubmitVote();

  const [pendingApartmentId, setPendingApartmentId] = useState<number | null>(null);

  const [selectedByApartment, setSelectedByApartment] = useState<Record<number, string | null>>({});

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
        {submissions.map((s) => {
          const alreadyVoted = s.choice !== null && s.choice !== undefined;
          const selected = selectedByApartment[s.apartment_id] ?? null;
          const error = errorByApartment[s.apartment_id] ?? null;
          const isThisPending = pendingApartmentId === s.apartment_id && isPending;

          return (
            <div key={s.apartment_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Διαμέρισμα {s.apartment_number}
                  </div>
                  <div className="text-xs text-slate-500">{s.mills} χιλιοστά</div>
                </div>

                {alreadyVoted ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                    Ψηφίσατε: {s.choice}
                  </span>
                ) : isActive ? (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                    Δεν έχετε ψηφίσει
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    Κλειστή
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-2">
                {choices.map((c) => (
                  <label
                    key={`${s.apartment_id}-${c}`}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-4 py-2 transition',
                      selected === c ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200',
                      (!isActive || alreadyVoted) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50',
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
                      }}
                      className="accent-indigo-600"
                      disabled={!isActive || alreadyVoted || isPending}
                    />
                    {c}
                  </label>
                ))}

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
                  disabled={isThisPending || alreadyVoted || !isActive || !selected}
                  className={cn(
                    'mt-2 w-full rounded-lg bg-indigo-600 px-4 py-2 text-white transition',
                    'hover:bg-indigo-700 disabled:opacity-50',
                  )}
                >
                  {isThisPending ? 'Υποβολή...' : 'Υποβολή Ψήφου'}
                </button>

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
            onChange={() => setSelectedLegacy(c)}
            className="accent-indigo-600"
            disabled={!isActive}
          />
          {c}
        </label>
      ))}

      <button
        type="submit"
        disabled={isPending || selectedLegacy === null || !isActive}
        className="rounded bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700 disabled:opacity-50"
      >
        {isPending ? 'Υποβολή...' : 'Υποβολή Ψήφου'}
      </button>

      {errorLegacy && <p className="text-red-600 text-sm">{errorLegacy}</p>}
    </form>
  );
}
