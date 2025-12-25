'use client';

import { useState, useMemo } from 'react';
import { 
  Vote, CheckCircle, XCircle, MinusCircle, 
  Loader2, Search, Users, Mail, RefreshCw, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCastVote } from '@/hooks/useAssemblies';
import type { AgendaItem, AssemblyAttendee, VoteChoice } from '@/lib/api';

interface VotingControlPanelProps {
  item: AgendaItem;
  attendees: AssemblyAttendee[];
  totalBuildingMills: number;
  votes: Array<{
    id: string;
    attendee: string;
    vote: VoteChoice;
    vote_display: string;
    mills: number;
    vote_source: 'pre_vote' | 'live' | 'proxy';
    voted_at: string;
  }>;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

type VoteFilter = 'all' | 'voted' | 'pending' | 'pre_vote';

const voteConfig = {
  approve: {
    label: 'Υπέρ',
    icon: CheckCircle,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    activeColor: 'bg-emerald-500 text-white shadow-lg shadow-emerald-200',
    borderColor: 'border-emerald-300',
    ringColor: 'ring-emerald-500',
  },
  reject: {
    label: 'Κατά',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    activeColor: 'bg-red-500 text-white shadow-lg shadow-red-200',
    borderColor: 'border-red-300',
    ringColor: 'ring-red-500',
  },
  abstain: {
    label: 'Λευκό',
    icon: MinusCircle,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    activeColor: 'bg-gray-500 text-white shadow-lg shadow-gray-200',
    borderColor: 'border-gray-300',
    ringColor: 'ring-gray-500',
  },
};

function MobileVoteButtons({
  currentVote,
  onVote,
  disabled,
  isLoading,
}: {
  currentVote: VoteChoice | null;
  onVote: (vote: VoteChoice) => void;
  disabled?: boolean;
  isLoading?: boolean;
}) {
  const choices: VoteChoice[] = ['approve', 'reject', 'abstain'];
  
  return (
    <div className="flex gap-2">
      {choices.map((choice) => {
        const config = voteConfig[choice];
        const isActive = currentVote === choice;
        const Icon = config.icon;
        
        return (
          <button
            key={choice}
            onClick={() => onVote(choice)}
            disabled={disabled || isLoading}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl border-2 transition-all duration-200",
              "min-h-[64px] touch-manipulation active:scale-95",
              isActive 
                ? `${config.activeColor} ${config.borderColor} ring-2 ${config.ringColor} ring-offset-1` 
                : `bg-white ${config.borderColor} hover:${config.bgColor}`,
              disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Icon className={cn(
                  "w-7 h-7",
                  isActive ? 'text-white' : config.color
                )} />
                <span className={cn(
                  "text-sm font-bold",
                  isActive ? 'text-white' : config.color
                )}>
                  {config.label}
                </span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

function AttendeeVoteCard({
  attendee,
  totalBuildingMills,
  vote,
  onVote,
  isPending,
}: {
  attendee: AssemblyAttendee;
  totalBuildingMills: number;
  vote: {
    vote: VoteChoice;
    vote_source: 'pre_vote' | 'live' | 'proxy';
  } | null;
  onVote: (attendeeId: string, vote: VoteChoice) => void;
  isPending: boolean;
}) {
  const isPreVote = vote?.vote_source === 'pre_vote';
  const hasVoted = !!vote;
  const quorumContributionPercent =
    totalBuildingMills > 0 ? (attendee.mills * 100) / totalBuildingMills : 0;
  
  return (
    <div className={cn(
      "bg-white rounded-2xl border-2 p-4 transition-all",
      hasVoted ? "border-emerald-200 bg-emerald-50/30" : "border-gray-200"
    )}>
      {/* Header με πληροφορίες ενοίκου */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 bg-gradient-to-br from-indigo-400 to-indigo-600 text-white">
          {attendee.apartment_number}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 text-base truncate">
              {attendee.display_name}
            </span>
            {isPreVote && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] font-bold">
                <Mail className="w-2.5 h-2.5 mr-1" />
                ΕΠΙΣΤΟΛΙΚΗ
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500 font-medium">
              {attendee.mills} χιλιοστά
              {hasVoted && (
                <span className="text-gray-400">
                  {' '}
                  ({quorumContributionPercent.toFixed(1)}% απαρτίας*)
                </span>
              )}
            </span>
            {hasVoted && (
              <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                <CheckCircle className="w-2.5 h-2.5 mr-1" />
                Ψήφισε
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Κουμπιά Ψήφου - Μεγάλα για εύκολο touch */}
      <MobileVoteButtons
        currentVote={vote?.vote || null}
        onVote={(v) => {
          if (v === vote?.vote) return;
          onVote(attendee.id, v);
        }}
        disabled={false}
        isLoading={isPending}
      />
    </div>
  );
}

export default function VotingControlPanel({
  item,
  attendees,
  totalBuildingMills,
  votes,
  onRefresh,
  isRefreshing
}: VotingControlPanelProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<VoteFilter>('pending');
  const [pendingVotes, setPendingVotes] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  
  const castVoteMutation = useCastVote();

  // Create a map of attendee votes for quick lookup
  const voteMap = useMemo(() => {
    const map = new Map<string, typeof votes[0]>();
    votes.forEach(v => map.set(v.attendee, v));
    return map;
  }, [votes]);

  // Filter and search attendees
  const filteredAttendees = useMemo(() => {
    let result = [...attendees];
    
    // Apply search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(a => 
        a.apartment_number.toLowerCase().includes(searchLower) ||
        a.display_name.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply filter
    switch (filter) {
      case 'voted':
        result = result.filter(a => voteMap.has(a.id));
        break;
      case 'pending':
        result = result.filter(a => !voteMap.has(a.id));
        break;
      case 'pre_vote':
        result = result.filter(a => {
          const vote = voteMap.get(a.id);
          return vote?.vote_source === 'pre_vote';
        });
        break;
    }
    
    // Sort: Present first, then by apartment number
    return result.sort((a, b) => {
      if (a.is_present !== b.is_present) return a.is_present ? -1 : 1;
      return a.apartment_number.localeCompare(b.apartment_number);
    });
  }, [attendees, search, filter, voteMap]);

  // Calculate statistics
  const stats = useMemo(() => {
    const votedCount = votes.length;
    const preVoteCount = votes.filter(v => v.vote_source === 'pre_vote').length;
    const pendingCount = attendees.filter(a => !voteMap.has(a.id)).length;
    
    return { votedCount, preVoteCount, pendingCount };
  }, [attendees, votes, voteMap]);

  const handleVote = async (attendeeId: string, vote: VoteChoice) => {
    setPendingVotes(prev => new Set(prev).add(attendeeId));
    
    try {
      await castVoteMutation.mutateAsync({
        attendeeId,
        agendaItemId: item.id,
        vote
      });
    } finally {
      setPendingVotes(prev => {
        const next = new Set(prev);
        next.delete(attendeeId);
        return next;
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          size="lg"
          className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg h-12 px-5"
        >
          <Vote className="w-5 h-5" />
          <span className="hidden sm:inline">Διαχείριση</span> Ψήφων
          {stats.pendingCount > 0 && (
            <Badge className="bg-amber-400 text-amber-900 text-xs font-bold ml-1">
              {stats.pendingCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      {/* Full-screen mobile dialog */}
      <DialogContent className="sm:max-w-5xl lg:max-w-6xl max-w-[100vw] h-[100dvh] sm:h-[90vh] sm:max-h-[900px] p-0 gap-0 flex flex-col rounded-none sm:rounded-2xl">
        {/* Header - Sticky */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shrink-0">
          <DialogHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Vote className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <div>Ψηφοφορία Live</div>
                  <div className="text-xs font-normal text-gray-500 line-clamp-1">{item.title}</div>
                </div>
              </DialogTitle>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </DialogHeader>

          {/* Stats Bar - Πολύ ευδιάκριτα */}
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/80 rounded-xl p-2 shadow-sm">
              <div className="font-black text-2xl text-emerald-600">{stats.votedCount}</div>
              <div className="text-[9px] text-gray-500 uppercase font-semibold tracking-wider">Ψήφισαν</div>
            </div>
            <div className="bg-white/80 rounded-xl p-2 shadow-sm">
              <div className="font-black text-2xl text-blue-600">{stats.preVoteCount}</div>
              <div className="text-[9px] text-gray-500 uppercase font-semibold tracking-wider">Επιστολ.</div>
            </div>
            <div className="bg-white/80 rounded-xl p-2 shadow-sm">
              <div className={cn(
                "font-black text-2xl",
                stats.pendingCount > 0 ? "text-amber-500 animate-pulse" : "text-gray-300"
              )}>
                {stats.pendingCount}
              </div>
              <div className="text-[9px] text-gray-500 uppercase font-semibold tracking-wider">Εκκρεμεί</div>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="px-4 py-3 space-y-3 bg-gray-50/50">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input 
                placeholder="Αναζήτηση διαμερίσματος..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 h-12 text-base rounded-xl bg-white border-gray-200 shadow-sm"
              />
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {([
                { value: 'pending', label: 'Εκκρεμείς', count: stats.pendingCount, highlight: true },
                { value: 'all', label: 'Όλοι', count: attendees.length },
                { value: 'voted', label: 'Ψήφισαν', count: stats.votedCount },
                { value: 'pre_vote', label: 'Επιστολικές', count: stats.preVoteCount },
              ] as const).map((f) => (
                <Button
                  key={f.value}
                  variant={filter === f.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "shrink-0 h-10 px-4 rounded-full font-semibold shadow-sm",
                    filter === f.value ? "bg-indigo-600 shadow-indigo-200" : "bg-white",
                    f.highlight && filter !== f.value && f.count > 0 && "border-amber-300 text-amber-700"
                  )}
                >
                  {f.label}
                  <span className={cn(
                    "ml-1.5 text-xs font-bold",
                    filter === f.value ? "text-indigo-200" : "text-gray-400"
                  )}>
                    {f.count}
                  </span>
                </Button>
              ))}
              
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="ml-auto shrink-0 h-10 w-10 rounded-full"
                >
                  <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Attendee List - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0 bg-gray-50/30">
          {filteredAttendees.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium text-lg">
                {filter === 'pending' 
                  ? 'Όλοι έχουν ψηφίσει! 🎉'
                  : 'Δεν βρέθηκαν αποτελέσματα'}
              </p>
              {filter === 'pending' && (
                <p className="text-gray-400 text-sm mt-2">Μπορείτε να κλείσετε αυτό το παράθυρο</p>
              )}
            </div>
          ) : (
            filteredAttendees.map((attendee) => (
              <AttendeeVoteCard
                key={attendee.id}
                attendee={attendee}
                totalBuildingMills={totalBuildingMills}
                vote={voteMap.get(attendee.id) ? {
                  vote: voteMap.get(attendee.id)!.vote,
                  vote_source: voteMap.get(attendee.id)!.vote_source
                } : null}
                onVote={handleVote}
                isPending={pendingVotes.has(attendee.id)}
              />
            ))
          )}
        </div>

        {/* Footer - Fixed στο κάτω μέρος */}
        <div className="mt-auto p-3 bg-gray-50/50 border-t border-gray-100 shrink-0">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3 text-blue-500" />
                <span>Επιστολική</span>
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-500" />
                <span>Ψήφισε</span>
              </span>
            </div>
            <span className="text-gray-400">
              {filteredAttendees.length} εγγραφές
            </span>
          </div>
          <div className="text-[10px] text-gray-400 text-center">
            * Οι καταχωρημένες ψήφοι (pre-vote/live/proxy) προσμετρώνται στην απαρτία.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
