'use client';

import { useParams, useRouter } from 'next/navigation';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useVoteDetail } from '@/hooks/useVoteDetail';
import { useMyVote } from '@/hooks/useMyVote';
import { useVoteResults } from '@/hooks/useVoteResults';
import ErrorMessage from '@/components/ErrorMessage';
import VoteSubmitForm from '@/components/VoteSubmitForm';
import VoteResultsDisplay from '@/components/votes/VoteResultsDisplay';
import ParticipationMeter from '@/components/votes/ParticipationMeter';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Clock, Calendar, Building2, User, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { deleteVote, type Vote } from '@/lib/api';
import { useAuth } from '@/components/contexts/AuthContext';
import { toast } from 'sonner';
import { useState } from 'react';
import { hasOfficeAdminAccess } from '@/lib/roleUtils';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function VoteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const voteId = Number(id);
  const { buildings, isLoading: buildingsLoading } = useBuilding();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: vote, isLoading: loadingVote, error } = useVoteDetail(voteId);
  const { data: myVote, refetch: refetchMyVote } = useMyVote(voteId);
  const { data: results, refetch: refetchResults } = useVoteResults(voteId);

  const canDelete = hasOfficeAdminAccess(user);

  const handleDelete = async () => {
    if (!vote) return;
    
    const isGlobal = (vote as { building_name?: string }).building_name === "Όλα τα κτίρια";
    const confirmMessage = isGlobal 
      ? `Είστε σίγουροι ότι θέλετε να διαγράψετε την ΚΑΘΟΛΙΚΗ ψηφοφορία "${vote.title}" από όλα τα κτίρια;`
      : `Είστε σίγουροι ότι θέλετε να διαγράψετε τη ψηφοφορία "${vote.title}";`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const message = await deleteVote(vote.id);
      toast.success(message);
      router.push('/votes');
    } catch (err) {
      console.error('Error deleting vote:', err);
      toast.error('Σφάλμα κατά τη διαγραφή της ψηφοφορίας');
      setIsDeleting(false);
    }
  };

  if (error) return <ErrorMessage message="Αποτυχία φόρτωσης ψηφοφορίας." />;
  if (loadingVote || !vote || buildingsLoading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-48 bg-gray-200 rounded"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Έλεγχος πρόσβασης
  const hasAccessToVote = () => {
    if (vote.building === null) return true;
    if (buildings.length === 0) return false;
    if (hasOfficeAdminAccess(user)) {
      return buildings.some(building => building.id === vote.building);
    }
    return buildings.some(building => building.id === vote.building);
  };

  if (buildings.length === 0 && !buildingsLoading) {
    return <ErrorMessage message="Δεν έχετε πρόσβαση σε κανένα κτίριο." />;
  }

  if (!hasAccessToVote()) {
    return <ErrorMessage message="Δεν έχετε δικαίωμα πρόσβασης σε αυτή την ψηφοφορία." />;
  }

  const today = new Date().toISOString().split('T')[0];
  // Handle null/invalid end_date - treat as no expiry
  const hasValidEndDate = vote.end_date && vote.end_date !== '1970-01-01' && !vote.end_date.startsWith('1970');
  const isActive = vote.start_date <= today && (!hasValidEndDate || today <= vote.end_date);
  const hasVoted = !!myVote;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr || dateStr.startsWith('1970')) return 'Χωρίς ημερομηνία λήξης';
    const date = new Date(dateStr);
    if (isNaN(date.getTime()) || date.getFullYear() <= 1970) return 'Χωρίς ημερομηνία λήξης';
    return date.toLocaleDateString('el-GR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long', 
      year: 'numeric'
    });
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleDateString('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusInfo = () => {
    if (!vote.is_active) {
      return {
        icon: AlertCircle,
        status: 'Ανενεργή',
        color: 'gray',
        canVote: false,
        message: 'Η ψηφοφορία έχει απενεργοποιηθεί'
      };
    }
    
    if (!isActive) {
      const notStarted = vote.start_date > today;
      return {
        icon: Clock,
        status: notStarted ? 'Δεν έχει ξεκινήσει' : 'Έχει λήξει',
        color: notStarted ? 'blue' : 'gray',
        canVote: false,
        message: notStarted ? 
          `Ξεκινά ${formatDate(vote.start_date)}` : 
          (hasValidEndDate ? `Έληξε ${formatDate(vote.end_date)}` : 'Η ψηφοφορία έκλεισε')
      };
    }

    return {
      icon: CheckCircle2,
      status: 'Ενεργή',
      color: 'green',
      canVote: true,
      message: hasVoted ? 'Έχετε ήδη ψηφίσει' : 'Μπορείτε να ψηφίσετε τώρα!'
    };
  };

  const statusInfo = getStatusInfo();
  const voteWithExtras = vote as Vote & { 
    building_name?: string;
    creator_name?: string;
    days_remaining?: number | null;
    total_votes?: number;
    participation_percentage?: number;
    min_participation?: number;
    is_urgent?: boolean;
    status_display?: string;
    choices?: string[];
    is_valid?: boolean;
  };

  const statusColors = {
    green: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      icon: 'text-emerald-600'
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      icon: 'text-blue-600'
    },
    gray: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-700',
      icon: 'text-gray-600'
    }
  };

  const currentStatusColors = statusColors[statusInfo.color as keyof typeof statusColors];
  const StatusIcon = statusInfo.icon;

  // Calculate total eligible voters (for participation meter)
  const totalEligible = voteWithExtras.participation_percentage && voteWithExtras.total_votes 
    ? Math.round((voteWithExtras.total_votes * 100) / voteWithExtras.participation_percentage)
    : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <Link href="/votes">
          <Button variant="ghost" className="gap-2 hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4" />
            Επιστροφή στις Ψηφοφορίες
          </Button>
        </Link>
      </motion.div>

      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden"
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="relative z-10">
          {/* Status badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {voteWithExtras.is_urgent && (
              <span className="inline-flex items-center gap-1.5 bg-red-500/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium border border-red-400/30">
                <Zap className="w-4 h-4" />
                Επείγουσα
              </span>
            )}
            <span className={cn(
              'inline-flex items-center gap-1.5 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium',
              statusInfo.color === 'green' && 'bg-emerald-500/20 border border-emerald-400/30',
              statusInfo.color === 'blue' && 'bg-blue-500/20 border border-blue-400/30',
              statusInfo.color === 'gray' && 'bg-white/20 border border-white/30'
            )}>
              <StatusIcon className="w-4 h-4" />
              {statusInfo.status}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            {vote.title}
          </h1>
          
          <p className="text-lg text-white/90 max-w-2xl">
            {vote.description}
          </p>

          {/* Meta info */}
          <div className="flex flex-wrap gap-4 mt-6 text-white/80">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>{voteWithExtras.building_name || 'Όλα τα κτίρια'}</span>
            </div>
            {voteWithExtras.creator_name && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{voteWithExtras.creator_name}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(vote.start_date).toLocaleDateString('el-GR')}
                {hasValidEndDate ? ` - ${new Date(vote.end_date).toLocaleDateString('el-GR')}` : ' - Ανοικτή'}
              </span>
            </div>
            {voteWithExtras.days_remaining !== null && voteWithExtras.days_remaining !== undefined && voteWithExtras.days_remaining > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{voteWithExtras.days_remaining} ημέρες απομένουν</span>
              </div>
            )}
          </div>

          {/* Delete button */}
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-red-500/50 transition-colors disabled:opacity-50"
              title="Διαγραφή ψηφοφορίας"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Status message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={cn(
          'rounded-xl p-4 border flex items-center gap-3',
          currentStatusColors.bg,
          currentStatusColors.border
        )}
      >
        <StatusIcon className={cn('w-5 h-5', currentStatusColors.icon)} />
        <span className={cn('font-medium', currentStatusColors.text)}>
          {statusInfo.message}
        </span>
      </motion.div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voting section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {hasVoted ? (
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-emerald-800 text-lg mb-1">
                    Η ψήφος σας καταχωρήθηκε!
                  </h3>
                  <p className="text-emerald-700">
                    Ψηφίσατε: <span className="font-bold text-lg">{myVote.choice}</span>
                  </p>
                  {myVote.created_at && (
                    <p className="text-sm text-emerald-600 mt-2">
                      📅 {formatDateTime(myVote.created_at)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            statusInfo.canVote && voteWithExtras.choices ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  🗳️ Υποβολή Ψήφου
                </h2>
                <p className="text-gray-600 mb-6">
                  Επιλέξτε την απάντησή σας και πατήστε υποβολή
                </p>
                <VoteSubmitForm
                  voteId={vote.id}
                  choices={voteWithExtras.choices}
                  isActive={true}
                  initialChoice={null}
                  onSubmitted={async () => {
                    await refetchMyVote();
                    await refetchResults();
                  }}
                />
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-3 text-gray-600">
                  <AlertCircle className="w-5 h-5" />
                  <span>{statusInfo.message}</span>
                </div>
              </div>
            )
          )}
        </motion.div>

        {/* Participation meter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <ParticipationMeter
            percentage={voteWithExtras.participation_percentage || 0}
            minRequired={voteWithExtras.min_participation || 0}
            totalVoters={voteWithExtras.total_votes || 0}
            totalEligible={totalEligible}
          />
        </motion.div>
      </div>

      {/* Results section */}
      {results && results.results && voteWithExtras.choices && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
        >
          <VoteResultsDisplay
            results={results.results}
            total={results.total || 0}
            participationPercentage={voteWithExtras.participation_percentage}
            minParticipation={voteWithExtras.min_participation}
            isValid={voteWithExtras.is_valid}
          />
        </motion.div>
      )}

      {/* Empty results state */}
      {(!results || !results.results || (results.total === 0)) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📊</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Δεν υπάρχουν ψήφοι ακόμα</h3>
          <p className="text-gray-600">
            Τα αποτελέσματα θα εμφανιστούν μόλις υποβληθούν οι πρώτες ψήφοι.
          </p>
        </motion.div>
      )}
    </div>
  );
}
