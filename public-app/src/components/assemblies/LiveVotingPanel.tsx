'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Vote, CheckCircle, XCircle, MinusCircle,
  Loader2, Check, AlertCircle, Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCastVote } from '@/hooks/useAssemblies';
import type { AgendaItem, AssemblyAttendee, VoteChoice } from '@/lib/api';

interface LiveVotingPanelProps {
  item: AgendaItem;
  attendee: AssemblyAttendee | null;
  hasVoted: boolean;
  totalBuildingMills: number;
  onVoteSuccess?: () => void;
  canManage?: boolean;
}

const voteOptions: {
  value: VoteChoice;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    value: 'approve',
    label: 'Υπέρ',
    icon: <CheckCircle className="w-5 h-5" />,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50 hover:bg-emerald-100',
    borderColor: 'border-emerald-200 hover:border-emerald-400',
  },
  {
    value: 'reject',
    label: 'Κατά',
    icon: <XCircle className="w-5 h-5" />,
    color: 'text-red-700',
    bgColor: 'bg-red-50 hover:bg-red-100',
    borderColor: 'border-red-200 hover:border-red-400',
  },
  {
    value: 'abstain',
    label: 'Λευκό',
    icon: <MinusCircle className="w-5 h-5" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 hover:bg-gray-100',
    borderColor: 'border-gray-200 hover:border-gray-400',
  },
];

export default function LiveVotingPanel({
  item,
  attendee,
  hasVoted,
  totalBuildingMills,
  onVoteSuccess,
  canManage,
}: LiveVotingPanelProps) {
  const [selectedVote, setSelectedVote] = useState<VoteChoice | null>(null);
  const castVoteMutation = useCastVote();

  if (!attendee) {
    if (canManage) {
      return (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 text-center">
          <Building2 className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
          <h4 className="font-semibold text-indigo-900">Διαχείριση Live Ψηφοφορίας</h4>
          <p className="text-sm text-indigo-700 mt-1">
            Δεν υπάρχει εγγραφή συμμετοχής για τον λογαριασμό σας (ιδιοκτήτης/ένοικος) — αυτό είναι αναμενόμενο για διαχειριστές.
            Για καταχώρηση/διόρθωση ψήφων χρησιμοποιήστε το κουμπί <strong>Διαχείριση Ψήφων</strong>.
          </p>
        </div>
      );
    }
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h4 className="font-semibold text-amber-800">Δεν βρέθηκε εγγραφή συμμετοχής</h4>
        <p className="text-sm text-amber-600 mt-1">
          Δεν έχετε δικαίωμα ψήφου σε αυτή τη συνέλευση.
        </p>
      </div>
    );
  }

  if (hasVoted) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
        <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
        <h4 className="font-semibold text-emerald-800">Η ψήφος σας καταγράφηκε</h4>
        <p className="text-sm text-emerald-600 mt-1">
          Έχετε ψηφίσει επιτυχώς για το θέμα: <strong>{item.title}</strong>
        </p>
      </div>
    );
  }

  const quorumContributionPercent =
    totalBuildingMills > 0 ? (attendee.mills * 100) / totalBuildingMills : 0;

  const handleVoteSubmit = async () => {
    if (!selectedVote) return;

    try {
      await castVoteMutation.mutateAsync({
        attendeeId: attendee.id,
        agendaItemId: item.id,
        vote: selectedVote,
      });
      if (onVoteSuccess) onVoteSuccess();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border-2 border-indigo-500 p-6 shadow-xl ring-4 ring-indigo-50"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
          <Vote className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Live Ψηφοφορία</h3>
          <p className="text-sm text-gray-500">Επιλέξτε την ψήφο σας για το τρέχον θέμα</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-3">
          {voteOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedVote(option.value)}
              className={cn(
                'p-4 rounded-xl border-2 transition-all duration-200',
                'flex flex-col items-center justify-center gap-3',
                selectedVote === option.value
                  ? `${option.borderColor.split(' ')[0]} ${option.bgColor} ring-2 ring-offset-1 ${option.borderColor.split(' ')[0].replace('border', 'ring')}`
                  : 'border-gray-200 bg-white hover:border-indigo-200'
              )}
            >
              <div className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                selectedVote === option.value ? option.bgColor : 'bg-gray-100'
              )}>
                <span className={selectedVote === option.value ? option.color : 'text-gray-400'}>
                  {option.icon}
                </span>
              </div>
              <span className={cn(
                'font-bold',
                selectedVote === option.value ? option.color : 'text-gray-600'
              )}>
                {option.label}
              </span>
            </button>
          ))}
        </div>

        <div className="bg-indigo-50 rounded-xl p-4 flex items-center gap-3">
          <Building2 className="w-5 h-5 text-indigo-600" />
          <div className="text-sm text-indigo-800">
            Η ψήφος σας αντιστοιχεί σε <strong>{attendee.mills} χιλιοστά</strong>{' '}
            <span className="text-indigo-700">({quorumContributionPercent.toFixed(1)}% της απαρτίας*)</span>
          </div>
        </div>
        <div className="text-[11px] text-gray-500 -mt-3 px-1">
          * Η συμμετοχή σας προσμετράται στην απαρτία.
        </div>

        <Button
          onClick={handleVoteSubmit}
          disabled={!selectedVote || castVoteMutation.isPending}
          className={cn(
            'w-full py-6 text-lg font-bold',
            selectedVote
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg'
              : ''
          )}
        >
          {castVoteMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Καταχώρηση...
            </>
          ) : (
            <>
              <Check className="w-5 h-5 mr-2" />
              Υποβολή Ψήφου
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
















