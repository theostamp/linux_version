'use client';

import Link from 'next/link';
import { useMyVote } from '@/hooks/useMyVote';
import { useVoteResults } from '@/hooks/useVoteResults';
import VoteMiniResults from '@/components/votes/VoteMiniResults';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check, ArrowRight, Clock, Eye } from 'lucide-react';

interface Props {
  readonly voteId: number;
  readonly isActive: boolean;
}

export default function VoteStatus({ voteId, isActive }: Props) {
  const { data: myVote, isLoading: loadingMyVote } = useMyVote(voteId);
  const { data: results, isLoading: loadingResults } = useVoteResults(voteId);

  if (loadingMyVote || loadingResults) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-2 bg-gray-200 rounded-full w-full" />
        <div className="flex justify-between items-center">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-8 bg-gray-200 rounded w-20" />
        </div>
      </div>
    );
  }

  const hasVoted = !!myVote;
  const totalVotes = results?.total || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Mini results */}
      {totalVotes > 0 && results?.results && (
        <VoteMiniResults
          results={results.results}
          total={totalVotes}
        />
      )}

      {/* Status and action row */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {hasVoted ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2"
            >
              <span className={cn(
                'flex items-center justify-center w-5 h-5 rounded-full',
                'bg-emerald-100 text-emerald-600'
              )}>
                <Check className="w-3 h-3" />
              </span>
              <span className="text-sm font-medium text-emerald-700">
                Ψηφίσατε: {myVote.choice}
              </span>
            </motion.div>
          ) : isActive ? (
            <div className="flex items-center gap-2">
              <span className={cn(
                'flex items-center justify-center w-5 h-5 rounded-full',
                'bg-blue-100 text-blue-600'
              )}>
                <Clock className="w-3 h-3" />
              </span>
              <span className="text-sm text-blue-600">
                Δεν έχετε ψηφίσει
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {totalVotes > 0 ? `${totalVotes} ψήφοι` : 'Η ψηφοφορία έληξε'}
              </span>
            </div>
          )}
        </div>

        {/* Action button */}
        <Link href={`/votes/${voteId}`}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              hasVoted || !isActive
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-sm'
            )}
          >
            {hasVoted || !isActive ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                Προβολή
              </>
            ) : (
              <>
                Ψήφισε
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </motion.button>
        </Link>
      </div>
    </motion.div>
  );
}
