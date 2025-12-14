'use client';

import { useMemo } from 'react';
import { BarChart3, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import type { KioskVote } from '@/hooks/useKioskData';

type Props = {
  data?: any;
  isLoading?: boolean;
  error?: string | null;
};

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export default function VoteResultsBannerWidget({ data, isLoading, error }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-300" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-300">
        <div className="text-center">
          <div className="text-xl mb-1">⚠️</div>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    );
  }

  const votes: KioskVote[] = Array.isArray(data?.votes) ? data.votes : [];
  const activeVotes = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return votes.filter((v) => !v.end_date || v.end_date >= today);
  }, [votes]);

  if (activeVotes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-emerald-200/70">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-60" />
          <p className="text-xs font-medium">Δεν υπάρχουν ενεργές ψηφοφορίες</p>
        </div>
      </div>
    );
  }

  const vote = activeVotes[0];
  const results = vote.results || {};
  const total = Number(results.total ?? vote.total_votes ?? 0) || 0;

  // Support both Greek choices (ΝΑΙ/ΟΧΙ/ΛΕΥΚΟ) and generic keys
  const yes = Number(results['ΝΑΙ'] ?? results['yes'] ?? results['approve'] ?? 0) || 0;
  const no = Number(results['ΟΧΙ'] ?? results['no'] ?? results['reject'] ?? 0) || 0;
  const abstain = Number(results['ΛΕΥΚΟ'] ?? results['abstain'] ?? 0) || 0;

  const yesPct = pct(yes, total);
  const noPct = pct(no, total);
  const abstainPct = pct(abstain, total);

  const participation = Number(results.participation_percentage ?? vote.participation_percentage ?? 0) || 0;
  const minParticipation = Number(results.min_participation ?? vote.min_participation ?? 0) || 0;
  const isValid = Boolean(results.is_valid ?? vote.is_valid ?? (participation >= minParticipation));

  const leadingLabel = yes === no ? 'Ισοπαλία' : yes > no ? 'Προβάδισμα: ΝΑΙ' : 'Προβάδισμα: ΟΧΙ';

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-emerald-500/20">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-300" />
          <h3 className="text-xs font-bold text-white">Αποτελέσματα Ψηφοφορίας</h3>
        </div>
        <div className="text-[11px] text-emerald-200/80">
          {activeVotes.length} ενεργή
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-white font-semibold line-clamp-2">
          {vote.title}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-2">
            <div className="flex items-center gap-1 text-[11px] text-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              ΝΑΙ
            </div>
            <div className="text-lg font-bold text-emerald-200 tabular-nums">{yesPct}%</div>
            <div className="text-[10px] text-emerald-200/70">{yes} ψήφοι</div>
          </div>
          <div className="rounded-lg border border-rose-400/20 bg-rose-500/10 p-2">
            <div className="flex items-center gap-1 text-[11px] text-rose-200">
              <XCircle className="w-3 h-3" />
              ΟΧΙ
            </div>
            <div className="text-lg font-bold text-rose-200 tabular-nums">{noPct}%</div>
            <div className="text-[10px] text-rose-200/70">{no} ψήφοι</div>
          </div>
          <div className="rounded-lg border border-slate-400/20 bg-slate-500/10 p-2">
            <div className="flex items-center gap-1 text-[11px] text-slate-200">
              <MinusCircle className="w-3 h-3" />
              ΛΕΥΚΟ
            </div>
            <div className="text-lg font-bold text-slate-200 tabular-nums">{abstainPct}%</div>
            <div className="text-[10px] text-slate-200/70">{abstain} ψήφοι</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-white/70">{leadingLabel}</span>
          <span className={`px-2 py-1 rounded-full border ${isValid ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200' : 'bg-amber-500/15 border-amber-400/30 text-amber-200'}`}>
            Συμμετοχή: {participation}% / {minParticipation}%
          </span>
        </div>

        <div className="text-[10px] text-white/55">
          Απλή πλειοψηφία: υπερισχύει ΝΑΙ έναντι ΟΧΙ. Για έγκυρο αποτέλεσμα απαιτείται ελάχιστη συμμετοχή {minParticipation}%.
        </div>
      </div>
    </div>
  );
}


