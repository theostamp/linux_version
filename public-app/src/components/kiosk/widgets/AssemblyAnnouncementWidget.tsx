'use client';

import { Calendar, MapPin, Clock, FileText, AlertCircle, Smartphone, Users } from 'lucide-react';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import { el } from 'date-fns/locale';
import { useState, useEffect } from 'react';

// Assembly data from API
interface AssemblyAPIData {
  id: string;
  title: string;
  scheduled_date: string;
  scheduled_time: string;
  location?: string;
  status: string;
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

  // No assembly found
  if (!assembly) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-purple-300">
        <Calendar className="w-10 h-10 mb-2 opacity-60" />
        <p className="text-sm text-center font-medium">Δεν υπάρχουν προγραμματισμένες</p>
        <p className="text-xs text-purple-400 mt-1">Συνελεύσεις</p>
      </div>
    );
  }

  // Parse assembly date and time
  let assemblyDate = new Date(assembly.scheduled_date);
  if (assembly.scheduled_time) {
    const [hours, minutes] = assembly.scheduled_time.split(':').map(Number);
    assemblyDate.setHours(hours, minutes, 0, 0);
  }

  const daysRemaining = differenceInDays(assemblyDate, currentTime);
  const hoursRemaining = differenceInHours(assemblyDate, currentTime) % 24;
  const isPastEvent = assemblyDate < currentTime;
  const isToday = daysRemaining === 0 && !isPastEvent;
  const isInProgress = assembly.status === 'in_progress';
  const hasVotingItems = assembly.agenda_items?.some(item => item.item_type === 'voting') || false;
  const isPreVotingActive = assembly.is_pre_voting_active || false;

  // Remaining time label
  const remainingLabel = !isPastEvent
    ? daysRemaining > 0
      ? `Σε ${daysRemaining} ${daysRemaining === 1 ? 'ημέρα' : 'ημέρες'}`
      : hoursRemaining > 0
        ? `Σε ${hoursRemaining} ${hoursRemaining === 1 ? 'ώρα' : 'ώρες'}`
        : 'Σήμερα'
    : null;

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-purple-500/20">
        <Users className="w-5 h-5 text-purple-300" />
        <h3 className="text-sm font-bold text-white">Επερχόμενη Συνέλευση</h3>
      </div>
      
      {/* Assembly Card */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-sm p-3 rounded-lg border border-purple-500/30 space-y-2">
          {/* Status badge */}
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

          {/* Countdown Header */}
          {isInProgress ? (
            <div className="bg-gradient-to-r from-emerald-600/50 to-teal-600/50 rounded-lg p-3 border-2 border-emerald-400 shadow-lg">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-emerald-100 font-bold uppercase">Σε Εξέλιξη</span>
              </div>
            </div>
          ) : isToday ? (
            <div className="bg-gradient-to-r from-orange-600/50 to-red-600/50 rounded-lg p-3 border-2 border-orange-400 shadow-lg shadow-orange-500/30 animate-pulse">
              <div className="flex items-center justify-center space-x-2">
                <AlertCircle className="w-5 h-5 text-orange-200 animate-bounce" />
                <div className="text-center">
                  <div className="text-white font-extrabold text-base uppercase tracking-wide">
                    ΣΗΜΕΡΑ
                  </div>
                  <div className="text-orange-100 text-sm font-bold mt-1">
                    έχουμε Γενική Συνέλευση
                  </div>
                  {assembly.scheduled_time && (
                    <div className="text-orange-200 text-xs mt-1 flex items-center justify-center">
                      <Clock className="w-3 h-3 mr-1" />
                      στις {assembly.scheduled_time.slice(0, 5)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : !isPastEvent ? (
            <div className="bg-gradient-to-r from-purple-600/30 to-indigo-600/30 rounded-lg p-2 border border-purple-400/40">
              <div className="flex items-center justify-center space-x-2">
                <AlertCircle className="w-4 h-4 text-purple-300 animate-pulse" />
                <div className="text-center">
                  <div className="text-white font-bold text-sm">
                    Σε {daysRemaining > 0 && `${daysRemaining} ${daysRemaining === 1 ? 'ημέρα' : 'ημέρες'}`}
                    {daysRemaining > 0 && hoursRemaining > 0 && ' και '}
                    {hoursRemaining > 0 && `${hoursRemaining} ${hoursRemaining === 1 ? 'ώρα' : 'ώρες'}`}
                  </div>
                  <div className="text-purple-200 text-xs mt-0.5">
                    έχουμε Γενική Συνέλευση
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Title */}
          <div className="text-xs space-y-1">
            <span className="text-purple-300 font-medium block">Τίτλος</span>
            <span className="text-white line-clamp-2 leading-snug font-medium">{assembly.title}</span>
          </div>

          {/* Agenda items count */}
          {assembly.agenda_items && assembly.agenda_items.length > 0 && (
            <div className="text-xs space-y-1">
              <span className="text-purple-300 font-medium block">Θέματα Ημερήσιας Διάταξης</span>
              <span className="text-white">{assembly.agenda_items.length} θέματα</span>
            </div>
          )}
          
          {/* Details pills */}
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
          
          {/* E-Voting Notice */}
          {(hasVotingItems || isPreVotingActive) && (
            <div className={`mt-2 pt-2 border-t ${isToday ? 'border-orange-400/30' : 'border-purple-400/30'}`}>
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
      </div>
    </div>
  );
}
