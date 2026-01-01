'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, CheckCircle, XCircle, MinusCircle,
  Loader2, Check, UserCheck, UserPlus,
  Search, Vote, MoreVertical, ShieldCheck,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useAttendeeCheckIn,
  useAttendeeCheckOut,
  useCastVote
} from '@/hooks/useAssemblies';
import type { AgendaItem, AssemblyAttendee, VoteChoice } from '@/lib/api';

interface LiveAttendeePanelProps {
  assemblyId: string;
  attendees: AssemblyAttendee[];
  currentItem: AgendaItem | null;
  voteResults?: any;
  canManage: boolean;
}

export default function LiveAttendeePanel({
  assemblyId,
  attendees,
  currentItem,
  voteResults,
  canManage
}: LiveAttendeePanelProps) {
  const [search, setSearch] = useState('');
  const [expandedAttendee, setExpandedAttendee] = useState<string | null>(null);

  const checkInMutation = useAttendeeCheckIn();
  const checkOutMutation = useAttendeeCheckOut();
  const castVoteMutation = useCastVote();

  const filteredAttendees = attendees.filter(a =>
    a.apartment_number.toLowerCase().includes(search.toLowerCase()) ||
    a.display_name.toLowerCase().includes(search.toLowerCase())
  );

  const presentAttendees = attendees.filter(a => a.is_present);
  const absentAttendees = attendees.filter(a => !a.is_present);

  const isVotingActive = currentItem?.item_type === 'voting' && currentItem?.status === 'in_progress';

  const handleToggleCheckIn = async (attendee: AssemblyAttendee) => {
    if (attendee.is_present) {
      if (confirm(`Έξοδος για το διαμέρισμα ${attendee.apartment_number};`)) {
        await checkOutMutation.mutateAsync(attendee.id);
      }
    } else {
      await checkInMutation.mutateAsync({ id: attendee.id, attendanceType: 'in_person' });
    }
  };

  const handleManualVote = async (attendee: AssemblyAttendee, vote: VoteChoice) => {
    if (!currentItem) return;

    await castVoteMutation.mutateAsync({
      attendeeId: attendee.id,
      agendaItemId: currentItem.id,
      vote: vote
    });
  };

  const getAttendeeVote = (attendeeId: string) => {
    return voteResults?.votes?.find((v: any) => v.attendee === attendeeId);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col h-full shadow-sm">
      <div className="p-4 border-b border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Παρόντες & Ψηφοφορία
          </h3>
          <div className="text-xs font-bold px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full">
            {presentAttendees.length} / {attendees.length}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Αναζήτηση διαμερίσματος ή ονόματος..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        <AnimatePresence initial={false}>
          {filteredAttendees.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Δεν βρέθηκαν αποτελέσματα</p>
            </div>
          ) : (
            filteredAttendees.map((attendee) => {
              const hasVoted = getAttendeeVote(attendee.id);
              const isExpanded = expandedAttendee === attendee.id;

              return (
                <div key={attendee.id} className={cn(
                  "transition-colors",
                  attendee.is_present ? "bg-emerald-50/30" : "bg-white",
                  isExpanded && "bg-slate-50"
                )}>
                  <div
                    className="p-4 flex items-center gap-3 cursor-pointer"
                    onClick={() => setExpandedAttendee(isExpanded ? null : attendee.id)}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                      attendee.is_present ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
                    )}>
                      {attendee.apartment_number}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 truncate">{attendee.display_name}</span>
                        {attendee.is_proxy && <ShieldCheck className="w-3 h-3 text-amber-500" title="Με εξουσιοδότηση" />}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{attendee.mills} χιλιοστά</span>
                        <span>•</span>
                        <span className={cn(
                          "font-medium",
                          attendee.is_present ? "text-emerald-600" : "text-gray-400"
                        )}>
                          {attendee.is_present ? "Παρών" : "Απών"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isVotingActive && attendee.is_present && (
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          hasVoted ? "bg-emerald-500 text-white" : "bg-amber-100 text-amber-600 animate-pulse"
                        )}>
                          {hasVoted ? <Check className="w-4 h-4" /> : <Vote className="w-4 h-4" />}
                        </div>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-0 space-y-4 border-t border-gray-100/50">
                          {/* Manager Actions */}
                          {canManage && (
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                size="sm"
                                variant={attendee.is_present ? "outline" : "default"}
                                onClick={(e) => { e.stopPropagation(); handleToggleCheckIn(attendee); }}
                                disabled={checkInMutation.isPending || checkOutMutation.isPending}
                                className={cn(
                                  "w-full font-bold",
                                  !attendee.is_present && "bg-emerald-600 hover:bg-emerald-700"
                                )}
                              >
                                {attendee.is_present ? "Σημείωση Εξόδου" : "Check-in"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                disabled
                              >
                                Λεπτομέρειες
                              </Button>
                            </div>
                          )}

                          {/* Live Voting for Manager */}
                          {canManage && isVotingActive && attendee.is_present && !hasVoted && (
                            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                              <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3">Καταχώρηση Ψήφου</div>
                              <div className="grid grid-cols-3 gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleManualVote(attendee, 'approve')}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                                  disabled={castVoteMutation.isPending}
                                >
                                  Υπέρ
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleManualVote(attendee, 'reject')}
                                  className="bg-red-500 hover:bg-red-600 text-white font-bold"
                                  disabled={castVoteMutation.isPending}
                                >
                                  Κατά
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleManualVote(attendee, 'abstain')}
                                  className="bg-gray-500 hover:bg-gray-600 text-white font-bold"
                                  disabled={castVoteMutation.isPending}
                                >
                                  Λευκό
                                </Button>
                              </div>
                            </div>
                          )}

                          {hasVoted && (
                            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2 text-emerald-700">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">Η ψήφος καταγράφηκε ({hasVoted.vote_display})</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
