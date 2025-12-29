'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Plus, Clock, Users, CheckCircle,
  AlertCircle, ChevronRight, MessageSquare, Loader2,
  Calendar, Building2
} from 'lucide-react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useAuth } from '@/components/contexts/AuthContext';
import { usePolls, useVoteInPoll, type CommunityPoll } from '@/hooks/usePolls';
import { hasInternalManagerAccess } from '@/lib/roleUtils';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';

function PollCard({ poll }: { poll: CommunityPoll }) {
  const voteMutation = useVoteInPoll();
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (optionId: string) => {
    setIsVoting(true);
    try {
      await voteMutation.mutateAsync({ pollId: poll.id, optionId });
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              poll.is_expired ? "bg-gray-100 text-gray-500" : "bg-indigo-100 text-indigo-600"
            )}>
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 leading-tight">{poll.title}</h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {poll.author_name}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(poll.created_at).toLocaleDateString('el-GR')}
                </span>
              </div>
            </div>
          </div>
          <div className={cn(
            "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
            poll.is_expired ? "bg-gray-100 text-gray-500" : "bg-emerald-100 text-emerald-700"
          )}>
            {poll.is_expired ? 'ΛΗΞΗ' : 'ΕΝΕΡΓΗ'}
          </div>
        </div>

        {poll.description && (
          <p className="text-sm text-gray-600 mb-6 line-clamp-2">{poll.description}</p>
        )}

        <div className="space-y-2">
          {poll.options.map((option) => (
            <button
              key={option.id}
              disabled={poll.has_voted || poll.is_expired || isVoting}
              onClick={() => handleVote(option.id)}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all relative group overflow-hidden",
                poll.has_voted ? "border-gray-100 bg-gray-50/50" : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30",
                "disabled:cursor-default"
              )}
            >
              <div className="flex items-center justify-between relative z-10">
                <span className={cn(
                  "text-sm font-medium",
                  poll.has_voted ? "text-gray-500" : "text-gray-700 group-hover:text-indigo-700"
                )}>
                  {option.text}
                </span>
                {poll.has_voted && (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
          <span className="font-medium">{poll.vote_count} συμμετοχές</span>
          {poll.expires_at && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Λήγει: {new Date(poll.expires_at).toLocaleDateString('el-GR')}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function PollsContent() {
  const { selectedBuilding } = useBuilding();
  const { user } = useAuth();
  const { data: polls = [], isLoading } = usePolls(selectedBuilding?.id);
  const canManage = hasInternalManagerAccess(user);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Δημοσκοπήσεις Κοινότητας</h1>
          <p className="text-gray-500 mt-1">Γρήγορες ερωτήσεις και αποφάσεις για την καθημερινότητα της πολυκατοικίας</p>
        </div>
        {canManage && (
          <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl h-12 px-6 shadow-indigo-200 shadow-lg transition-all hover:-translate-y-0.5">
            <Plus className="w-5 h-5 mr-2" />
            Νέα Δημοσκόπηση
          </Button>
        )}
      </div>

      {!selectedBuilding ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-12 text-center">
          <Building2 className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-amber-900">Παρακαλώ επιλέξτε κτίριο</h2>
          <p className="text-amber-700 mt-2">Για να δείτε τις δημοσκοπήσεις, πρέπει να έχετε επιλέξει μια πολυκατοικία.</p>
        </div>
      ) : polls.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-20 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Καμία ενεργή δημοσκόπηση</h2>
          <p className="text-gray-500 mt-2 max-w-sm mx-auto">
            Δεν υπάρχουν δημοσκοπήσεις για το κτίριο "{selectedBuilding.name}" αυτή τη στιγμή.
          </p>
          {canManage && (
            <Button variant="outline" className="mt-8 border-indigo-200 text-indigo-600 hover:bg-indigo-50">
              Δημιουργήστε την πρώτη
            </Button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PollsPage() {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <PollsContent />
      </SubscriptionGate>
    </AuthGate>
  );
}











