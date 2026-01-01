'use client';

import { Calendar, MapPin, Clock, AlertCircle, Smartphone, Users, Vote } from 'lucide-react';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import { el } from 'date-fns/locale';
import { useState, useEffect } from 'react';

// Assembly data from API
interface AssemblyAPIData {
  id: string;
  title: string;
  scheduled_date: string;
  scheduled_time: string | null;
  location?: string;
  status?: string;
  is_pre_voting_active?: boolean;
  agenda_items?: Array<{ id: string; order: number; title: string; item_type: string; estimated_duration: number }>;
  stats?: {
    total_apartments_invited: number;
    rsvp_attending: number;
    rsvp_pending: number;
  };
}

interface AssemblyAnnouncementWidgetProps {
  data?: any;
  isLoading?: boolean;
  error?: string | null;
  buildingId?: number | null;
}

export default function AssemblyAnnouncementWidget({ data, isLoading: propLoading, error: propError, buildingId }: AssemblyAnnouncementWidgetProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Get assembly from public-info data (no separate API call needed!)
  const assembly: AssemblyAPIData | null = data?.upcoming_assembly || null;
  const votes = Array.isArray(data?.votes) ? data.votes : [];

  // Update time every minute for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Debug log
  useEffect(() => {
    if (assembly) {
      console.log('[AssemblyWidget] Got assembly from public-info:', assembly.title);
    } else {
      console.log('[AssemblyWidget] No upcoming_assembly in data:', !!data);
    }
  }, [assembly, data]);

  if (propLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-300"></div>
      </div>
    );
  }

  if (propError) {
    return (
      <div className="flex items-center justify-center h-full text-red-300">
        <div className="text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-sm">{propError}</p>
        </div>
      </div>
    );
  }

  const hasAnyImportant = !!assembly || votes.length > 0;

  // No important items found
  if (!hasAnyImportant) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-purple-300">
        <AlertCircle className="w-10 h-10 mb-2 opacity-60" />
        <p className="text-sm text-center font-medium">Δεν υπάρχουν ενεργά</p>
        <p className="text-xs text-purple-400 mt-1">Συνελεύσεις / Ψηφοφορίες</p>
      </div>
    );
  }

  // Assembly computed fields (if present)
  let assemblyDate: Date | null = null;
  let daysRemaining = 0;
  let hoursRemaining = 0;
  let isPastEvent = false;
  let isToday = false;
  let isInProgress = false;
  let hasVotingItems = false;
  let isPreVotingActive = false;
  let remainingLabel: string | null = null;
  const preVotingStats = assembly?.stats;

  if (assembly) {
    assemblyDate = new Date(assembly.scheduled_date);
    if (assembly.scheduled_time) {
      const [hours, minutes] = assembly.scheduled_time.split(':').map(Number);
      assemblyDate.setHours(hours, minutes, 0, 0);
    }

    daysRemaining = differenceInDays(assemblyDate, currentTime);
    hoursRemaining = differenceInHours(assemblyDate, currentTime) % 24;
    isPastEvent = assemblyDate < currentTime;
    isToday = daysRemaining === 0 && !isPastEvent;
    isInProgress = assembly.status === 'in_progress';
    hasVotingItems = assembly.agenda_items?.some(item => item.item_type === 'voting') || false;
    isPreVotingActive = assembly.is_pre_voting_active || false;

    remainingLabel = !isPastEvent
      ? daysRemaining > 0
        ? `Σε ${daysRemaining} ${daysRemaining === 1 ? 'ημέρα' : 'ημέρες'}`
        : hoursRemaining > 0
          ? `Σε ${hoursRemaining} ${hoursRemaining === 1 ? 'ώρα' : 'ώρες'}`
          : 'Σήμερα'
      : null;
  }

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-purple-500/20">
        <Users className="w-5 h-5 text-purple-300" />
        <h3 className="text-sm font-bold text-white">Σημαντικά</h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3">
          {/* Assembly card (if available) */}
          {assembly && assemblyDate && (
            <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-sm p-3 rounded-lg border border-purple-500/30 space-y-2">
              {remainingLabel && (
                <div className="flex justify-end">
                  <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${
                    isToday
                      ? 'bg-orange-500/25 border border-orange-400/50 text-orange-100'
                      : 'bg-purple-500/25 border border-purple-400/40 text-purple-100'
                  }`}>
                    {remainingLabel}{assembly.location ? ` · ${assembly.location}` : ''}
                  </span>
                </div>
              )}

              {isInProgress ? (
                <div className="bg-gradient-to-r from-emerald-600/50 to-teal-600/50 rounded-lg p-2 border border-emerald-400/40">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-emerald-100 font-bold uppercase text-xs">Σε Εξέλιξη</span>
                  </div>
                </div>
              ) : isToday ? (
                <div className="bg-gradient-to-r from-orange-600/50 to-red-600/50 rounded-lg p-2 border border-orange-400/50 animate-pulse">
                  <div className="flex items-center justify-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-orange-200 animate-bounce" />
                    <span className="text-orange-100 font-bold text-xs uppercase tracking-wide">ΣΗΜΕΡΑ Συνέλευση</span>
                  </div>
                </div>
              ) : null}

              <div className="text-xs space-y-1">
                <span className="text-purple-300 font-medium block">Συνέλευση</span>
                <span className="text-white line-clamp-2 leading-snug font-medium">{assembly.title}</span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-800/40 border border-purple-500/30 text-[11px] text-purple-100">
                  <Calendar className="w-3 h-3" />
                  <span>{format(assemblyDate, 'dd/MM/yyyy', { locale: el })}</span>
                </div>
                {assembly.scheduled_time && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-800/40 border border-purple-500/30 text-[11px] text-purple-100">
                    <Clock className="w-3 h-3" />
                    <span>{assembly.scheduled_time.slice(0, 5)}</span>
                  </div>
                )}
                {assembly.location && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-800/40 border border-purple-500/30 text-[11px] text-purple-100 max-w-full">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{assembly.location}</span>
                  </div>
                )}
              </div>

              {(hasVotingItems || isPreVotingActive) && (
                <div className={`mt-2 pt-2 border-t ${isToday ? 'border-orange-400/30' : 'border-purple-400/30'}`}>
                  {isPreVotingActive && preVotingStats?.total_apartments_invited != null && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-[11px] text-white/80">
                        <span>
                          Προ-ψηφοφορία: {preVotingStats.pre_voted_count ?? 0}/{preVotingStats.total_apartments_invited} (
                          {(preVotingStats.pre_voted_percentage ?? 0).toFixed(1)}%)
                        </span>
                        {preVotingStats.voting_items_count != null && preVotingStats.voting_items_count > 0 && (
                          <span className="text-white/60">
                            {preVotingStats.voting_items_count} θέματα
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] ${
                    isToday ? 'bg-emerald-500/30 text-emerald-100' : 'bg-emerald-500/20 text-emerald-200'
                  }`}>
                    <Smartphone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="leading-tight">
                      Μπορείτε να ψηφίσετε ηλεκτρονικά μέσω της εφαρμογής!
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Votes (if any) */}
          {votes.length > 0 && (
            <div className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 backdrop-blur-sm p-3 rounded-lg border border-emerald-500/25 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Vote className="w-4 h-4 text-emerald-300" />
                  <span className="text-emerald-100 font-semibold text-xs">Ψηφοφορίες</span>
                </div>
                <span className="text-[11px] text-emerald-200/80">{votes.length} ενεργές</span>
              </div>
              <div className="text-xs text-white/90 line-clamp-2">
                {votes[0]?.title || 'Ενεργή ψηφοφορία'}
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] bg-emerald-500/20 text-emerald-100 border border-emerald-400/20">
                <Smartphone className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="leading-tight">
                  Μπορείτε να ψηφίσετε ηλεκτρονικά μέσω της εφαρμογής!
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
