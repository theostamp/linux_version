'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Vote, CheckCircle, XCircle, MinusCircle, AlertCircle,
  Calendar, Building2, Home, Loader2, ArrowRight, Check,
  Shield, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type VoteChoice = 'approve' | 'reject' | 'abstain';

interface VotingItem {
  id: string;
  order: number;
  title: string;
  description: string;
  voting_type: string;
  has_voted: boolean;
}

interface EmailVoteData {
  valid: boolean;
  assembly: {
    id: string;
    title: string;
    scheduled_date: string;
    total_building_mills: number;
    required_quorum_percentage: number;
  };
  attendee: {
    id: string;
    apartment_number: string;
    mills: number;
  };
  voting_items: VotingItem[];
  all_voted: boolean;
}

const voteOptions: { value: VoteChoice; label: string; icon: React.ReactNode; color: string; bgColor: string }[] = [
  {
    value: 'approve',
    label: 'Υπέρ',
    icon: <CheckCircle className="w-6 h-6" />,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300',
  },
  {
    value: 'reject',
    label: 'Κατά',
    icon: <XCircle className="w-6 h-6" />,
    color: 'text-red-700',
    bgColor: 'bg-red-100 hover:bg-red-200 border-red-300',
  },
  {
    value: 'abstain',
    label: 'Λευκό',
    icon: <MinusCircle className="w-6 h-6" />,
    color: 'text-text-secondary',
    bgColor: 'bg-bg-app-main hover:bg-white border-gray-200',
  },
];

export default function VoteByEmailPage() {
  const params = useParams();
  const token = params.token as string;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EmailVoteData | null>(null);
  const [votes, setVotes] = useState<Record<string, VoteChoice>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);

  // Fetch vote data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/vote-by-email/${token}`);
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || 'Σφάλμα κατά τη φόρτωση');
          return;
        }

        setData(result);
      } catch (err) {
        setError('Αδυναμία σύνδεσης με τον διακομιστή');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleVoteSelect = (itemId: string, vote: VoteChoice) => {
    setVotes(prev => ({ ...prev, [itemId]: vote }));
  };

  const handleSubmit = async () => {
    if (!data) return;

    const votesToSubmit = Object.entries(votes).map(([itemId, vote]) => ({
      agenda_item_id: itemId,
      vote,
    }));

    if (votesToSubmit.length === 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/vote-by-email/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votes: votesToSubmit }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Σφάλμα κατά την καταχώρηση');
        return;
      }

      setSubmitted(true);
      setSubmittedCount(result.votes_recorded || votesToSubmit.length);
    } catch (err) {
      setError('Αδυναμία αποστολής ψήφων');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('el-GR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-app-main flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-accent-primary animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Φόρτωση ψηφοφορίας...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-bg-app-main flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-card-soft border border-gray-200">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-primary mb-2">Σφάλμα</h1>
          <p className="text-text-secondary mb-6">{error}</p>
          <p className="text-sm text-text-secondary">
            Ο σύνδεσμος ψηφοφορίας μπορεί να έχει λήξει ή να μην είναι έγκυρος.
            Παρακαλούμε επικοινωνήστε με τη διαχείριση του κτιρίου.
          </p>
        </div>
      </div>
    );
  }

  // Already voted all
  if (data?.all_voted || submitted) {
    return (
      <div className="min-h-screen bg-bg-app-main flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-card-soft border border-gray-200"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-20 h-20 bg-accent-primary/10 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-10 h-10 text-accent-primary" />
          </motion.div>

          <h1 className="text-2xl font-bold text-text-primary mb-2">
            {submitted ? 'Ευχαριστούμε για τη ψήφο σας!' : 'Έχετε ήδη ψηφίσει'}
          </h1>

          <p className="text-text-secondary mb-4">
            {submitted
              ? `Καταχωρήθηκαν ${submittedCount} ψήφοι επιτυχώς.`
              : 'Έχετε ολοκληρώσει την ηλεκτρονική ψηφοφορία για αυτή τη συνέλευση.'}
          </p>

          {data && (
            <div className="bg-bg-app-main rounded-xl p-4 mb-6 border border-gray-200">
              <p className="text-sm text-text-secondary">Συνέλευση</p>
              <p className="font-medium text-text-primary">{data.assembly.title}</p>
              <p className="text-sm text-text-secondary">{formatDate(data.assembly.scheduled_date)}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-sm text-accent-primary">
            <Shield className="w-4 h-4" />
            <span>Η ψήφος σας έχει καταχωρηθεί με ασφάλεια</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!data) return null;

  const totalBuildingMills = data.assembly.total_building_mills || 0;
  const quorumContributionPercent =
    totalBuildingMills > 0 ? (data.attendee.mills * 100) / totalBuildingMills : 0;

  const pendingItems = data.voting_items.filter(item => !item.has_voted);
  const allVotesSelected = pendingItems.every(item => votes[item.id]);

  return (
    <div className="min-h-screen bg-bg-app-main">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-accent-primary rounded-2xl flex items-center justify-center shadow-lg shadow-accent-primary/20">
              <Vote className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">Ηλεκτρονική Ψηφοφορία</h1>
              <p className="text-text-secondary text-sm">{data.assembly.title}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Info cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-card-soft">
            <div className="flex items-center gap-2 text-text-secondary text-sm mb-1">
              <Calendar className="w-4 h-4" />
              Ημερομηνία
            </div>
            <p className="text-text-primary font-medium">{formatDate(data.assembly.scheduled_date)}</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-card-soft">
            <div className="flex items-center gap-2 text-text-secondary text-sm mb-1">
              <Home className="w-4 h-4" />
              Διαμέρισμα
            </div>
            <p className="text-text-primary font-medium">
              {data.attendee.apartment_number} • {data.attendee.mills} χιλιοστά •{' '}
              {quorumContributionPercent.toFixed(1)}% απαρτίας*
            </p>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-text-secondary">
          * Η συμμετοχή σας προσμετράται στην απαρτία ακόμη κι αν δεν είστε παρών/ούσα.
        </p>

        {/* Voting items */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Vote className="w-5 h-5" />
            Θέματα προς ψήφιση ({pendingItems.length})
          </h2>

          {pendingItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl overflow-hidden shadow-xl"
            >
              {/* Item header */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-accent-primary/10 rounded-lg flex items-center justify-center text-accent-primary font-bold text-sm">
                    {item.order}
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">{item.title}</h3>
                    {item.description && (
                      <p className="text-sm text-text-secondary mt-1">{item.description}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Vote options */}
              <div className="p-5">
                <p className="text-sm text-text-secondary mb-4">Επιλέξτε την ψήφο σας:</p>
                <div className="grid grid-cols-3 gap-3">
                  {voteOptions.map((option) => {
                    const isSelected = votes[item.id] === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleVoteSelect(item.id, option.value)}
                        className={cn(
                          'p-4 rounded-xl border-2 transition-all duration-200',
                          'flex flex-col items-center justify-center gap-2',
                          isSelected
                            ? `${option.bgColor} ring-2 ring-offset-2 ${option.bgColor.split(' ')[0].replace('bg-', 'ring-')}`
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        )}
                      >
                        <span className={isSelected ? option.color : 'text-text-secondary opacity-60'}>
                          {option.icon}
                        </span>
                        <span className={cn(
                          'text-sm font-medium',
                          isSelected ? option.color : 'text-text-secondary'
                        )}>
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Submit button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <Button
            onClick={handleSubmit}
            disabled={!allVotesSelected || isSubmitting}
            className={cn(
              'w-full py-6 text-lg font-semibold rounded-xl transition-all',
              allVotesSelected
                ? 'bg-accent-primary text-white hover:opacity-90'
                : 'bg-bg-app-main text-text-secondary border border-gray-200 cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Καταχώρηση...
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Υποβολή Ψήφων ({Object.keys(votes).length}/{pendingItems.length})
              </>
            )}
          </Button>

          {!allVotesSelected && (
            <p className="text-center text-text-secondary text-sm mt-3">
              Επιλέξτε ψήφο για όλα τα θέματα για να συνεχίσετε
            </p>
          )}
        </motion.div>

        {/* Legal notice */}
        <div className="mt-8 p-4 bg-white rounded-xl border border-gray-200 shadow-card-soft">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-text-secondary mt-0.5" />
            <div className="text-sm text-text-secondary">
              <p>
                Η ψήφος σας καταχωρείται με χρονοσφραγίδα και αντιστοιχεί στα χιλιοστά του
                διαμερίσματός σας ({data.attendee.mills}). Σε περίπτωση φυσικής παρουσίας
                στη συνέλευση, θα έχετε τη δυνατότητα να αλλάξετε την ψήφο σας.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto py-6 text-center text-text-secondary text-sm">
        <p>Powered by newconcierge.app</p>
      </div>
    </div>
  );
}
