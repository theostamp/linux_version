'use client';

import { useMemo } from 'react';
import { Vote, Clock, Users, CheckCircle2, XCircle, MinusCircle, Smartphone } from 'lucide-react';
import type { KioskData } from '@/hooks/useKioskData';
import { format, parseISO, differenceInDays, differenceInHours, startOfDay, endOfDay } from 'date-fns';
import { el } from 'date-fns/locale';

interface KioskVote {
  id: number;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  is_urgent?: boolean;
  is_active?: boolean;
  min_participation?: number;
  total_votes?: number;
  participation_percentage?: number;
  is_valid?: boolean;
  eligible_voters_count?: number;
  total_building_mills?: number;
  results?: {
    ΝΑΙ: number;
    ΟΧΙ: number;
    ΛΕΥΚΟ: number;
    total?: number;
    mills?: { ΝΑΙ: number; ΟΧΙ: number; ΛΕΥΚΟ: number };
    percentages_by_mills?: { ΝΑΙ: number; ΟΧΙ: number; ΛΕΥΚΟ: number };
    participation_percentage?: number;
    eligible_voters?: number;
    total_building_mills?: number;
    total_mills_voted?: number;
  };
}

interface ActiveVoteWidgetProps {
  data: KioskData | null;
  variant?: 'banner' | 'sidebar' | 'full' | 'ambient';
}

export default function ActiveVoteWidget({ data, variant = 'banner' }: ActiveVoteWidgetProps) {
  const activeVote = useMemo(() => {
    const votes = (data?.votes || []) as KioskVote[];
    console.log('[ActiveVoteWidget] 🗳️ Looking for active vote in:', votes.length, 'votes');

    // Find the first active vote
    const now = new Date();
    const todayStart = startOfDay(now);

    const active = votes.find(v => {
      // First check is_active flag from backend
      if (v.is_active === false) {
        console.log('[ActiveVoteWidget] Vote', v.id, 'is_active=false, skipping');
        return false;
      }

      // Then check date range
      if (!v.start_date) {
        console.log('[ActiveVoteWidget] Vote', v.id, 'has no start_date');
        return false;
      }

      // Parse dates and compare at day level (not time)
      const startDate = startOfDay(parseISO(v.start_date));
      // For end_date, use end of day so the vote is active until midnight
      const endDate = v.end_date ? endOfDay(parseISO(v.end_date)) : null;

      const isInRange = startDate <= now && (!endDate || endDate >= now);

      console.log('[ActiveVoteWidget] Vote', v.id, ':', v.title?.substring(0, 30), {
        start_date: v.start_date,
        end_date: v.end_date,
        is_active: v.is_active,
        isInRange,
        startDate: startDate.toISOString(),
        endDate: endDate?.toISOString(),
        now: now.toISOString()
      });

      return isInRange;
    });

    console.log('[ActiveVoteWidget] Found active vote:', active?.id, active?.title?.substring(0, 30));
    return active;
  }, [data?.votes]);

  if (!activeVote) return null;

  const results = activeVote.results;
  const endDate = activeVote.end_date ? parseISO(activeVote.end_date) : null;
  const daysRemaining = endDate ? differenceInDays(endDate, new Date()) : null;
  const hoursRemaining = endDate ? differenceInHours(endDate, new Date()) % 24 : null;

  // Calculate percentages from mills if available, otherwise from counts
  const yesPercent = results?.percentages_by_mills?.['ΝΑΙ'] ??
    (results?.total && results.total > 0 ? Math.round((results['ΝΑΙ'] / results.total) * 100) : 0);
  const noPercent = results?.percentages_by_mills?.['ΟΧΙ'] ??
    (results?.total && results.total > 0 ? Math.round((results['ΟΧΙ'] / results.total) * 100) : 0);
  const abstainPercent = results?.percentages_by_mills?.['ΛΕΥΚΟ'] ??
    (results?.total && results.total > 0 ? Math.round((results['ΛΕΥΚΟ'] / results.total) * 100) : 0);

  const participationPercent = results?.participation_percentage ?? activeVote.participation_percentage ?? 0;
  const totalVotes = results?.total ?? activeVote.total_votes ?? 0;

  if (variant === 'banner') {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="bg-gradient-to-r from-indigo-600/95 via-purple-600/95 to-pink-500/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 px-6 py-4 max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Vote className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-white/70 uppercase tracking-wider font-medium">Ψηφοφορία σε εξέλιξη</p>
                {activeVote.is_urgent && (
                  <span className="text-[10px] bg-red-500/30 text-red-100 px-2 py-0.5 rounded-full">Επείγουσα</span>
                )}
              </div>
            </div>
            {daysRemaining !== null && (
              <div className="flex items-center gap-1.5 text-white/80 text-sm">
                <Clock className="w-4 h-4" />
                <span>
                  {daysRemaining > 0
                    ? `${daysRemaining} ${daysRemaining === 1 ? 'ημέρα' : 'ημέρες'}`
                    : hoursRemaining && hoursRemaining > 0
                      ? `${hoursRemaining} ${hoursRemaining === 1 ? 'ώρα' : 'ώρες'}`
                      : 'Σήμερα τελειώνει'}
                </span>
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className="text-white font-semibold text-lg mb-3 line-clamp-1">
            {activeVote.title}
          </h3>

          {/* Results Bar */}
          {totalVotes > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-emerald-200">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-bold">{yesPercent}%</span>
                  <span className="text-white/60 text-xs">ΝΑΙ</span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-200">
                  <XCircle className="w-4 h-4" />
                  <span className="font-bold">{noPercent}%</span>
                  <span className="text-white/60 text-xs">ΟΧΙ</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-200">
                  <MinusCircle className="w-4 h-4" />
                  <span className="font-bold">{abstainPercent}%</span>
                  <span className="text-white/60 text-xs">ΛΕΥΚΟ</span>
                </div>
              </div>

              {/* Stacked progress bar */}
              <div className="h-2 bg-white/20 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-400 transition-all duration-500"
                  style={{ width: `${yesPercent}%` }}
                />
                <div
                  className="bg-rose-400 transition-all duration-500"
                  style={{ width: `${noPercent}%` }}
                />
                <div
                  className="bg-gray-300 transition-all duration-500"
                  style={{ width: `${abstainPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-white/70">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Συμμετοχή: {participationPercent}%
                </span>
                <span>{totalVotes} ψήφ{totalVotes === 1 ? 'ος' : 'οι'}</span>
              </div>
            </div>
          ) : (
            <div className="text-white/70 text-sm">
              Δεν έχουν υποβληθεί ψήφοι ακόμα
            </div>
          )}

          {/* CTA */}
          <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-2 text-emerald-200 text-sm">
            <Smartphone className="w-4 h-4" />
            <span>Ψηφίστε ηλεκτρονικά ή κατά τη συνέλευση!</span>
          </div>
        </div>
      </div>
    );
  }

  // Sidebar variant (more compact)
  if (variant === 'sidebar') {
    return (
      <div className="bg-gradient-to-br from-indigo-600/90 to-purple-700/90 rounded-xl p-4 border border-white/20">
        <div className="flex items-center gap-2 mb-2">
          <Vote className="w-4 h-4 text-white" />
          <span className="text-xs text-white/70 uppercase tracking-wider">Ψηφοφορία</span>
        </div>

        <h4 className="text-white font-medium text-sm mb-2 line-clamp-2">{activeVote.title}</h4>

        {totalVotes > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-white/80">
              <span>ΝΑΙ {yesPercent}%</span>
              <span>ΟΧΙ {noPercent}%</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden flex">
              <div className="bg-emerald-400" style={{ width: `${yesPercent}%` }} />
              <div className="bg-rose-400" style={{ width: `${noPercent}%` }} />
            </div>
            <p className="text-[10px] text-white/60 text-center">
              Συμμετοχή: {participationPercent}%
            </p>
          </div>
        )}

        <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-200">
          <Smartphone className="w-3 h-3" />
          <span>Ψηφίστε από την εφαρμογή!</span>
        </div>
      </div>
    );
  }

  // Ambient variant (for kiosk ambient display - bottom right corner)
  if (variant === 'ambient') {
    return (
      <div className="absolute bottom-6 right-6 z-30 max-w-[420px] animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="relative bg-gradient-to-br from-indigo-600/95 via-purple-600/95 to-pink-600/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Animated pulse ring for urgent votes */}
          {activeVote.is_urgent && (
            <div className="absolute inset-0 rounded-2xl animate-pulse ring-2 ring-red-400/50" />
          )}

          {/* Header */}
          <div className="px-5 py-3 bg-gradient-to-r from-white/10 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Vote className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/70 uppercase tracking-wider font-semibold">
                    🗳️ Ψηφοφορία σε εξέλιξη
                  </span>
                  {activeVote.is_urgent && (
                    <span className="text-[10px] bg-red-500/40 text-red-100 px-2 py-0.5 rounded-full font-bold animate-pulse">
                      ⚡ ΕΠΕΙΓΟΥΣΑ
                    </span>
                  )}
                </div>
              </div>
            </div>
            {daysRemaining !== null && (
              <div className="flex items-center gap-1.5 text-white/80 text-sm bg-white/10 px-3 py-1 rounded-full">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-medium">
                  {daysRemaining > 0
                    ? `${daysRemaining} ${daysRemaining === 1 ? 'ημέρα' : 'ημέρες'}`
                    : hoursRemaining && hoursRemaining > 0
                      ? `${hoursRemaining}ω`
                      : 'Σήμερα!'}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="px-5 py-4">
            {/* Title */}
            <h3 className="text-white font-bold text-lg mb-4 line-clamp-2 leading-snug">
              {activeVote.title}
            </h3>

            {/* Results */}
            {totalVotes > 0 ? (
              <div className="space-y-3">
                {/* Vote counts grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-emerald-500/20 rounded-xl p-2.5 text-center border border-emerald-400/20">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                    <p className="text-emerald-100 text-xl font-bold">{yesPercent}%</p>
                    <p className="text-emerald-200/60 text-[10px] uppercase font-medium">ΝΑΙ</p>
                  </div>
                  <div className="bg-rose-500/20 rounded-xl p-2.5 text-center border border-rose-400/20">
                    <XCircle className="w-5 h-5 text-rose-400 mx-auto mb-1" />
                    <p className="text-rose-100 text-xl font-bold">{noPercent}%</p>
                    <p className="text-rose-200/60 text-[10px] uppercase font-medium">ΟΧΙ</p>
                  </div>
                  <div className="bg-gray-500/20 rounded-xl p-2.5 text-center border border-gray-400/20">
                    <MinusCircle className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                    <p className="text-gray-100 text-xl font-bold">{abstainPercent}%</p>
                    <p className="text-gray-200/60 text-[10px] uppercase font-medium">ΛΕΥΚΟ</p>
                  </div>
                </div>

                {/* Participation bar */}
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="flex items-center justify-between text-xs text-white/70 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>Συμμετοχή (βάσει χιλιοστών)</span>
                    </span>
                    <span className="font-bold text-white">{participationPercent}%</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(participationPercent, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-white/50 mt-1.5 text-center">
                    {totalVotes} {totalVotes === 1 ? 'ψήφος' : 'ψήφοι'} έχουν καταχωρηθεί
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white/10 rounded-xl p-4 text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-white/10 flex items-center justify-center">
                  <Vote className="w-6 h-6 text-white/50" />
                </div>
                <p className="text-white/60 text-sm">Αναμονή για τις πρώτες ψήφους...</p>
              </div>
            )}
          </div>

          {/* CTA Footer */}
          <div className="px-5 py-3 bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border-t border-white/10">
            <div className="flex items-center justify-center gap-2 text-emerald-200 text-sm">
              <Smartphone className="w-4 h-4" />
              <span className="font-medium">Ψηφίστε από την εφαρμογή New Concierge!</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full variant (for dedicated display)
  return (
    <div className="bg-gradient-to-br from-indigo-900/95 via-purple-900/95 to-pink-900/95 rounded-3xl p-8 border border-white/10 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
            <Vote className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white/70 text-sm uppercase tracking-wider">Ηλεκτρονική Ψηφοφορία</p>
            <p className="text-white text-2xl font-bold">Σε Εξέλιξη</p>
          </div>
        </div>
        {daysRemaining !== null && (
          <div className="bg-white/10 rounded-xl px-4 py-2">
            <p className="text-white/60 text-xs">Απομένουν</p>
            <p className="text-white text-xl font-bold">
              {daysRemaining > 0 ? `${daysRemaining} ημέρες` : 'Λίγες ώρες'}
            </p>
          </div>
        )}
      </div>

      <h2 className="text-white text-3xl font-bold mb-6">{activeVote.title}</h2>

      {totalVotes > 0 ? (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-emerald-500/20 rounded-2xl p-4 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-emerald-100 text-4xl font-bold">{yesPercent}%</p>
            <p className="text-emerald-200/70 text-sm">ΝΑΙ</p>
          </div>
          <div className="bg-rose-500/20 rounded-2xl p-4 text-center">
            <XCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
            <p className="text-rose-100 text-4xl font-bold">{noPercent}%</p>
            <p className="text-rose-200/70 text-sm">ΟΧΙ</p>
          </div>
          <div className="bg-gray-500/20 rounded-2xl p-4 text-center">
            <MinusCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-100 text-4xl font-bold">{abstainPercent}%</p>
            <p className="text-gray-200/70 text-sm">ΛΕΥΚΟ</p>
          </div>
        </div>
      ) : (
        <div className="bg-white/10 rounded-2xl p-6 text-center mb-6">
          <p className="text-white/70 text-lg">Αναμονή για τις πρώτες ψήφους...</p>
        </div>
      )}

      <div className="bg-emerald-500/20 rounded-xl p-4 flex items-center justify-center gap-3">
        <Smartphone className="w-6 h-6 text-emerald-300" />
        <p className="text-emerald-100 text-lg">
          Μπορείτε να ψηφίσετε <strong>ηλεκτρονικά</strong> ή <strong>κατά τη συνέλευση</strong>!
        </p>
      </div>
    </div>
  );
}
