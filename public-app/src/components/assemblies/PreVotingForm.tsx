'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Vote, CheckCircle, XCircle, MinusCircle, Clock,
  AlertCircle, ChevronRight, ChevronDown, FileText,
  Loader2, Check, ArrowRight, Building2, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCastVote } from '@/hooks/useAssemblies';
import { LegalConsent, TERMS_VERSION } from '@/components/legal/LegalConsent';
import type { Assembly, AgendaItem, AssemblyAttendee, VoteChoice } from '@/lib/api';

interface PreVotingFormProps {
  assembly: Assembly;
  attendee: AssemblyAttendee | null;
  onComplete?: () => void;
}

type VoteOption = {
  value: VoteChoice;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
};

const voteOptions: VoteOption[] = [
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

interface VotingItemCardProps {
  item: AgendaItem;
  attendee: AssemblyAttendee;
  votedItems: Set<string>;
  onVote: (itemId: string, vote: VoteChoice) => void;
  isSubmitting: boolean;
  termsAccepted: boolean;
}

function VotingItemCard({ item, attendee, votedItems, onVote, isSubmitting, termsAccepted }: VotingItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedVote, setSelectedVote] = useState<VoteChoice | null>(null);
  const hasVoted = votedItems.has(item.id);
  const isVotingDisabled = !termsAccepted || hasVoted;

  const handleVoteSelect = (vote: VoteChoice) => {
    if (isVotingDisabled) return;
    setSelectedVote(vote);
  };

  const handleSubmitVote = () => {
    if (!termsAccepted) return;
    if (selectedVote && !hasVoted) {
      onVote(item.id, selectedVote);
    }
  };

  // Check if this item already has vote results from attendee
  const existingVote = item.vote_results;

  return (
    <motion.div
      layout
      className={cn(
        'bg-white rounded-xl border-2 overflow-hidden transition-all',
        hasVoted
          ? 'border-emerald-200 bg-emerald-50/30'
          : 'border-gray-300 hover:border-indigo-200'
      )}
    >
      {/* Header */}
      <button
        onClick={() => !hasVoted && setExpanded(!expanded)}
        disabled={hasVoted}
        className={cn(
          'w-full p-4 text-left flex items-start gap-4',
          !hasVoted && 'hover:bg-gray-50 cursor-pointer'
        )}
      >
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
          hasVoted ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
        )}>
          {hasVoted ? <Check className="w-5 h-5" /> : <Vote className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-indigo-600">
              Θέμα {item.order}
            </span>
            {item.voting_type !== 'simple_majority' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                {item.voting_type_display}
              </span>
            )}
            {hasVoted && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                ✓ Ψηφίσατε
              </span>
            )}
          </div>
          <h4 className="font-semibold text-gray-900 mt-1">{item.title}</h4>

          {item.description && !expanded && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>

        {!hasVoted && (
          <div className="flex-shrink-0">
            {expanded ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </div>
        )}
      </button>

      {/* Expanded content for voting */}
      <AnimatePresence>
        {expanded && !hasVoted && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 pt-0 border-t border-gray-100">
              {/* Full description */}
              {item.description && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              )}

              {/* Linked project info */}
              {item.linked_project_title && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-700">
                    Σχετίζεται με: <strong>{item.linked_project_title}</strong>
                  </span>
                </div>
              )}

              {/* Vote options */}
              <div className="space-y-2 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Επιλέξτε την ψήφο σας:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {voteOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleVoteSelect(option.value)}
                      disabled={isVotingDisabled}
                      className={cn(
                        'p-3 rounded-xl border-2 transition-all duration-200',
                        'flex flex-col items-center justify-center gap-2',
                        selectedVote === option.value
                          ? `${option.borderColor.split(' ')[0]} ${option.bgColor} ring-2 ring-offset-1 ${option.borderColor.split(' ')[0].replace('border', 'ring')}`
                          : `${option.borderColor} bg-white`,
                        isVotingDisabled && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        selectedVote === option.value ? option.bgColor : 'bg-gray-100'
                      )}>
                        <span className={selectedVote === option.value ? option.color : 'text-gray-400'}>
                          {option.icon}
                        </span>
                      </div>
                      <span className={cn(
                        'text-sm font-medium',
                        selectedVote === option.value ? option.color : 'text-gray-600'
                      )}>
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mills info */}
              <div className="mb-4 p-3 bg-indigo-50 rounded-lg flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span className="text-sm text-indigo-700">
                  Η ψήφος σας αντιστοιχεί σε <strong>{attendee.mills} χιλιοστά</strong>
                </span>
              </div>

              {/* Submit button */}
              <Button
                onClick={handleSubmitVote}
                disabled={!selectedVote || isSubmitting || !termsAccepted}
                className={cn(
                  'w-full',
                  selectedVote
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700'
                    : ''
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Καταχώρηση...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Υποβολή Ψήφου
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function PreVotingForm({ assembly, attendee, onComplete }: PreVotingFormProps) {
  const [votedItems, setVotedItems] = useState<Set<string>>(new Set());
  const [currentSubmitting, setCurrentSubmitting] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const castVoteMutation = useCastVote();

  // Filter voting items that allow pre-voting
  const votingItems = assembly.agenda_items.filter(
    item => item.item_type === 'voting' && item.allows_pre_voting
  );

  const allVoted = votingItems.length > 0 && votedItems.size === votingItems.length;

  const handleVote = async (itemId: string, vote: VoteChoice) => {
    if (!attendee) return;
    if (!termsAccepted) return;

    setCurrentSubmitting(itemId);

    try {
      await castVoteMutation.mutateAsync({
        attendeeId: attendee.id,
        agendaItemId: itemId,
        vote,
        consent: {
          termsAccepted: true,
          termsVersion: TERMS_VERSION,
          termsAcceptedVia: 'app_pre_vote',
        },
      });

      setVotedItems(prev => new Set([...prev, itemId]));
    } catch (error) {
      // Error handled by mutation
    } finally {
      setCurrentSubmitting(null);
    }
  };

  if (!attendee) {
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

  const totalBuildingMills = Number(assembly.total_building_mills) || 0;
  const quorumContributionPercent =
    totalBuildingMills > 0 ? (attendee.mills * 100) / totalBuildingMills : 0;

  if (!assembly.is_pre_voting_active) {
    const formatShortDate = (iso?: string | null) => {
      if (!iso) return '';
      // Ensure we always parse as a date-only value (avoid timezone shifts)
      const d = new Date(`${iso}T00:00:00`);
      return isNaN(d.getTime()) ? iso : d.toLocaleDateString('el-GR');
    };

    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`;

    const addDaysIso = (iso: string, days: number) => {
      const d = new Date(`${iso}T00:00:00`);
      d.setDate(d.getDate() + days);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const startIso = assembly.pre_voting_start_date || assembly.scheduled_date || null;
    const endIso =
      assembly.pre_voting_end_date ||
      (assembly.scheduled_date ? addDaysIso(assembly.scheduled_date, 3) : null);

    let message = 'Η ψηφοφορία θα γίνει κατά τη διάρκεια της συνέλευσης';
    if (assembly.pre_voting_enabled) {
      if (startIso && todayIso < startIso) {
        message = `Το pre-voting ξεκινά στις ${formatShortDate(startIso)}${endIso ? ` και λήγει στις ${formatShortDate(endIso)}` : ''}`;
      } else if (endIso && todayIso > endIso) {
        message = `Το pre-voting έληξε στις ${formatShortDate(endIso)}`;
      } else if (startIso && endIso) {
        message = `Το pre-voting είναι διαθέσιμο από ${formatShortDate(startIso)} έως ${formatShortDate(endIso)}`;
      } else if (startIso) {
        message = `Το pre-voting ξεκίνησε στις ${formatShortDate(startIso)}`;
      }
    }

    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <Clock className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <h4 className="font-semibold text-gray-700">Το pre-voting δεν είναι ενεργό</h4>
        <p className="text-sm text-gray-500 mt-1">
          {message}
        </p>
      </div>
    );
  }

  if (votingItems.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
        <FileText className="w-10 h-10 text-blue-400 mx-auto mb-3" />
        <h4 className="font-semibold text-blue-800">Δεν υπάρχουν θέματα ψηφοφορίας</h4>
        <p className="text-sm text-blue-600 mt-1">
          Η ατζέντα αυτής της συνέλευσης δεν περιέχει θέματα που απαιτούν ψηφοφορία.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
            <Vote className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Ηλεκτρονική Ψηφοφορία</h3>
            <p className="text-white/80 text-sm mt-1">
              Ψηφίστε πριν τη συνέλευση - {votingItems.length} θέματα προς ψήφιση
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Πρόοδος</span>
            <span>{votedItems.size} / {votingItems.length} ψήφοι</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(votedItems.size / votingItems.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <LegalConsent accepted={termsAccepted} onAcceptedChange={setTermsAccepted} />
        {!termsAccepted && (
          <p className="text-xs text-amber-700">
            Αποδεχθείτε τους όρους για να ενεργοποιηθεί η υποβολή ψήφου.
          </p>
        )}
      </div>

      {/* Info about mills */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
        <Users className="w-5 h-5 text-indigo-600 mt-0.5" />
        <div>
          <p className="text-sm text-indigo-800">
            <strong>Τα μιλέσιμά σας:</strong> {attendee.mills}{' '}
            <span className="text-indigo-700">
              ({quorumContributionPercent.toFixed(1)}% της απαρτίας*)
            </span>
          </p>
          <p className="text-xs text-indigo-600 mt-1">
            Οι ψήφοι σας υπολογίζονται με βάση τα χιλιοστά του διαμερίσματός σας.
          </p>
          <p className="text-[11px] text-indigo-600 mt-1">
            * Η συμμετοχή σας προσμετράται στην απαρτία ακόμη κι αν δεν είστε παρών/ούσα.
          </p>
        </div>
      </div>

      {/* Voting items */}
      <div className="space-y-3">
        {votingItems.map((item) => (
          <VotingItemCard
            key={item.id}
            item={item}
            attendee={attendee}
            votedItems={votedItems}
            onVote={handleVote}
            isSubmitting={currentSubmitting === item.id}
            termsAccepted={termsAccepted}
          />
        ))}
      </div>

      {/* Completion message */}
      <AnimatePresence>
        {allVoted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center"
          >
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h4 className="text-lg font-bold text-emerald-800">
              Ολοκληρώσατε την ψηφοφορία!
            </h4>
            <p className="text-emerald-600 text-sm mt-2">
              Οι ψήφοι σας καταχωρήθηκαν επιτυχώς. Θα ενσωματωθούν στα αποτελέσματα της συνέλευσης.
            </p>
            {onComplete && (
              <Button
                onClick={onComplete}
                className="mt-4 bg-emerald-600 hover:bg-emerald-700"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Επιστροφή
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
