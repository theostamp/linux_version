'use client';

import { useState, useMemo } from 'react';
import { 
  Vote, CheckCircle, XCircle, MinusCircle, 
  Loader2, Search, Users, Mail, Hand, Filter, RefreshCw
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
    shortLabel: 'Υ',
    icon: CheckCircle,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    activeColor: 'bg-emerald-500 text-white',
    borderColor: 'border-emerald-500',
  },
  reject: {
    label: 'Κατά',
    shortLabel: 'Κ',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    activeColor: 'bg-red-500 text-white',
    borderColor: 'border-red-500',
  },
  abstain: {
    label: 'Λευκό',
    shortLabel: 'Λ',
    icon: MinusCircle,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    activeColor: 'bg-gray-500 text-white',
    borderColor: 'border-gray-500',
  },
};

function VoteButtonGroup({
  currentVote,
  onVote,
  disabled,
  isLoading,
  size = 'default'
}: {
  currentVote: VoteChoice | null;
  onVote: (vote: VoteChoice) => void;
  disabled?: boolean;
  isLoading?: boolean;
  size?: 'default' | 'compact';
}) {
  const choices: VoteChoice[] = ['approve', 'reject', 'abstain'];
  
  return (
    <div className={cn(
      "flex rounded-lg overflow-hidden border",
      size === 'compact' ? 'h-8' : 'h-10'
    )}>
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
              "flex-1 flex items-center justify-center gap-1 transition-all",
              "border-r last:border-r-0 font-medium",
              size === 'compact' ? 'px-2 text-xs' : 'px-3 text-sm',
              isActive ? config.activeColor : `hover:${config.bgColor} ${config.color}`,
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <Icon className={cn(
                  size === 'compact' ? 'w-3 h-3' : 'w-4 h-4'
                )} />
                <span className="hidden sm:inline">{config.label}</span>
                <span className="sm:hidden">{config.shortLabel}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

function AttendeeVoteRow({
  attendee,
  vote,
  onVote,
  isPending,
}: {
  attendee: AssemblyAttendee;
  vote: {
    vote: VoteChoice;
    vote_source: 'pre_vote' | 'live' | 'proxy';
  } | null;
  onVote: (attendeeId: string, vote: VoteChoice) => void;
  isPending: boolean;
}) {
  const isPreVote = vote?.vote_source === 'pre_vote';
  
  return (
    <div className={cn(
      "border-b border-gray-100 last:border-b-0",
      !attendee.is_present && "opacity-50"
    )}>
      <div className="flex items-center gap-3 p-3">
        {/* Apartment Number */}
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0",
          attendee.is_present ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
        )}>
          {attendee.apartment_number}
        </div>
        
        {/* Name & Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">{attendee.display_name}</span>
            {isPreVote && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-blue-50 text-blue-700 border-blue-200">
                <Mail className="w-2.5 h-2.5 mr-1" />
                Επιστολική
              </Badge>
            )}
            {!attendee.is_present && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-gray-50 text-gray-500">
                Απών
              </Badge>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {attendee.mills} χιλιοστά
          </div>
        </div>

        {/* Vote Buttons */}
        <div className="shrink-0">
          <VoteButtonGroup
            currentVote={vote?.vote || null}
            onVote={(v) => onVote(attendee.id, v)}
            disabled={!attendee.is_present && !isPreVote}
            isLoading={isPending}
            size="compact"
          />
        </div>
      </div>
    </div>
  );
}

export default function VotingControlPanel({
  item,
  attendees,
  votes,
  onRefresh,
  isRefreshing
}: VotingControlPanelProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<VoteFilter>('all');
  const [pendingVotes, setPendingVotes] = useState<Set<string>>(new Set());
  
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
        result = result.filter(a => !voteMap.has(a.id) && a.is_present);
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
    const presentAttendees = attendees.filter(a => a.is_present);
    const votedCount = votes.length;
    const preVoteCount = votes.filter(v => v.vote_source === 'pre_vote').length;
    const liveVoteCount = votedCount - preVoteCount;
    const pendingCount = presentAttendees.filter(a => !voteMap.has(a.id)).length;
    
    return { votedCount, preVoteCount, liveVoteCount, pendingCount, presentCount: presentAttendees.length };
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
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
        >
          <Vote className="w-4 h-4" />
          Διαχείριση Ψήφων
          {stats.pendingCount > 0 && (
            <Badge className="bg-amber-500 text-white text-[10px] px-1.5">
              {stats.pendingCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Vote className="w-5 h-5 text-indigo-600" />
            Καταχώρηση Ψήφων: {item.title}
          </DialogTitle>
        </DialogHeader>

        {/* Stats Bar */}
        <div className="px-4 py-3 bg-gray-50 border-y border-gray-100 grid grid-cols-4 gap-2 text-center text-sm">
          <div>
            <div className="font-bold text-indigo-600">{stats.presentCount}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Παρόντες</div>
          </div>
          <div>
            <div className="font-bold text-emerald-600">{stats.votedCount}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Ψήφισαν</div>
          </div>
          <div>
            <div className="font-bold text-blue-600">{stats.preVoteCount}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Επιστολικές</div>
          </div>
          <div>
            <div className="font-bold text-amber-600">{stats.pendingCount}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Εκκρεμούν</div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="px-4 py-3 space-y-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Αναζήτηση διαμερίσματος ή ονόματος..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            {([
              { value: 'all', label: 'Όλοι' },
              { value: 'pending', label: 'Εκκρεμείς' },
              { value: 'voted', label: 'Ψήφισαν' },
              { value: 'pre_vote', label: 'Επιστολικές' },
            ] as const).map((f) => (
              <Button
                key={f.value}
                variant={filter === f.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f.value)}
                className="shrink-0 text-xs h-7"
              >
                {f.label}
              </Button>
            ))}
            
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="ml-auto shrink-0"
              >
                <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              </Button>
            )}
          </div>
        </div>

        {/* Attendee List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {filteredAttendees.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Δεν βρέθηκαν αποτελέσματα</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredAttendees.map((attendee) => (
                <AttendeeVoteRow
                  key={attendee.id}
                  attendee={attendee}
                  vote={voteMap.get(attendee.id) ? {
                    vote: voteMap.get(attendee.id)!.vote,
                    vote_source: voteMap.get(attendee.id)!.vote_source
                  } : null}
                  onVote={handleVote}
                  isPending={pendingVotes.has(attendee.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-blue-500" />
                Επιστολική = προ-ψηφισμένη
              </span>
              <span className="flex items-center gap-1">
                <Hand className="w-3.5 h-3.5 text-amber-500" />
                Χειροκίνητη καταχώρηση
              </span>
            </div>
            <div className="text-xs text-gray-400">
              {filteredAttendees.length} εγγραφές
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

