'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Calendar, Clock, MapPin, Vote, CheckCircle,
  Timer, FileText, Percent, AlertCircle, ChevronRight,
  Building2, Video, Play
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssemblyData {
  id: string;
  title: string;
  scheduled_date: string;
  scheduled_time: string;
  location?: string;
  is_online: boolean;
  is_physical: boolean;
  meeting_link?: string;
  status: string;
  agenda_items: Array<{
    id: string;
    order: number;
    title: string;
    item_type: string;
    estimated_duration: number;
  }>;
  stats: {
    total_apartments_invited: number;
    rsvp_attending: number;
    rsvp_not_attending: number;
    rsvp_pending: number;
    pre_voted_count: number;
    pre_voted_percentage: number;
  };
  quorum_percentage: number;
  is_pre_voting_active: boolean;
  building_name: string;
}

interface AssemblyCountdownSceneProps {
  data?: any; // KioskData
  buildingId?: number | null;
  assembly?: AssemblyData | null;
}

type CountdownTime = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isToday: boolean;
  hasStarted: boolean;
  isPast: boolean;
};

function calculateCountdown(dateStr: string, timeStr: string): CountdownTime {
  const now = new Date();
  const [hours, minutes] = timeStr.split(':').map(Number);
  const targetDate = new Date(dateStr);
  targetDate.setHours(hours, minutes, 0, 0);

  const diff = targetDate.getTime() - now.getTime();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const isToday = today.getTime() === target.getTime();

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isToday,
      hasStarted: true,
      isPast: diff < -3 * 60 * 60 * 1000 // More than 3 hours ago
    };
  }

  const seconds = Math.floor((diff / 1000) % 60);
  const mins = Math.floor((diff / 1000 / 60) % 60);
  const hrs = Math.floor((diff / 1000 / 60 / 60) % 24);
  const days = Math.floor(diff / 1000 / 60 / 60 / 24);

  return {
    days,
    hours: hrs,
    minutes: mins,
    seconds,
    isToday,
    hasStarted: false,
    isPast: false
  };
}

function CountdownDigit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <motion.div
          key={value}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4 min-w-[100px] border border-white/20"
        >
          <span className="text-6xl font-bold text-white tabular-nums">
            {String(value).padStart(2, '0')}
          </span>
        </motion.div>
      </div>
      <span className="text-white/60 text-sm mt-2 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

function AgendaItemRow({ item, index }: { item: AssemblyData['agenda_items'][0]; index: number }) {
  const isVoting = item.item_type === 'voting';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl transition-all',
        isVoting 
          ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-400/30' 
          : 'bg-white/5 border border-white/10'
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold',
        isVoting ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/80'
      )}>
        {item.order}
      </div>
      
      <div className="flex-1">
        <h4 className="text-white font-medium">{item.title}</h4>
        <div className="flex items-center gap-3 mt-1 text-sm text-white/50">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {item.estimated_duration} λεπτά
          </span>
          {isVoting && (
            <span className="flex items-center gap-1 text-indigo-300">
              <Vote className="w-3 h-3" />
              Ψηφοφορία
            </span>
          )}
        </div>
      </div>

      {isVoting && (
        <Vote className="w-6 h-6 text-indigo-400" />
      )}
    </motion.div>
  );
}

function PreVotingProgress({ stats }: { stats: AssemblyData['stats'] }) {
  const percentage = stats.pre_voted_percentage || 0;

  return (
    <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl p-6 border border-emerald-400/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500/30 rounded-xl flex items-center justify-center">
            <Vote className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Ηλεκτρονική Ψηφοφορία</h3>
            <p className="text-emerald-200/70 text-sm">Pre-voting σε εξέλιξη</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-emerald-300">{stats.pre_voted_count}</div>
          <div className="text-emerald-200/60 text-sm">έχουν ψηφίσει</div>
        </div>
      </div>

      <div className="relative h-4 bg-black/30 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
      
      <div className="flex justify-between mt-2 text-sm">
        <span className="text-emerald-200/60">
          {stats.pre_voted_count} από {stats.total_apartments_invited} διαμερίσματα
        </span>
        <span className="text-emerald-300 font-medium">{percentage.toFixed(0)}%</span>
      </div>
    </div>
  );
}

function RSVPSummary({ stats }: { stats: AssemblyData['stats'] }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-emerald-500/20 rounded-xl p-4 text-center border border-emerald-400/20">
        <div className="text-3xl font-bold text-emerald-300">{stats.rsvp_attending}</div>
        <div className="text-emerald-200/60 text-sm mt-1">Θα έρθουν</div>
      </div>
      <div className="bg-amber-500/20 rounded-xl p-4 text-center border border-amber-400/20">
        <div className="text-3xl font-bold text-amber-300">{stats.rsvp_pending}</div>
        <div className="text-amber-200/60 text-sm mt-1">Αναμένονται</div>
      </div>
      <div className="bg-gray-500/20 rounded-xl p-4 text-center border border-gray-400/20">
        <div className="text-3xl font-bold text-gray-300">{stats.rsvp_not_attending}</div>
        <div className="text-gray-200/60 text-sm mt-1">Δεν θα έρθουν</div>
      </div>
    </div>
  );
}

export default function AssemblyCountdownScene({ 
  data, 
  buildingId,
  assembly: externalAssembly 
}: AssemblyCountdownSceneProps) {
  const [countdown, setCountdown] = useState<CountdownTime | null>(null);
  const [assembly, setAssembly] = useState<AssemblyData | null>(externalAssembly || null);
  const [isLoading, setIsLoading] = useState(!externalAssembly && !data?.upcoming_assembly);

  // Get assembly from data.upcoming_assembly (from public-info) or externalAssembly or fetch
  useEffect(() => {
    // Priority 1: externalAssembly prop
    if (externalAssembly) {
      setAssembly(externalAssembly);
      setIsLoading(false);
      return;
    }

    // Priority 2: upcoming_assembly from public-info data
    if (data?.upcoming_assembly) {
      const apiAssembly = data.upcoming_assembly;
      // Transform API data to AssemblyData format
      const transformedAssembly: AssemblyData = {
        id: apiAssembly.id,
        title: apiAssembly.title,
        scheduled_date: apiAssembly.scheduled_date,
        scheduled_time: apiAssembly.scheduled_time || '20:00',
        location: apiAssembly.location,
        is_online: apiAssembly.is_online || false,
        is_physical: apiAssembly.is_physical || false,
        meeting_link: apiAssembly.meeting_link,
        status: apiAssembly.status || 'scheduled',
        agenda_items: apiAssembly.agenda_items || [],
        stats: {
          total_apartments_invited: 0,
          rsvp_attending: 0,
          rsvp_not_attending: 0,
          rsvp_pending: 0,
          pre_voted_count: 0,
          pre_voted_percentage: 0,
        },
        quorum_percentage: apiAssembly.quorum_percentage || 0,
        is_pre_voting_active: apiAssembly.is_pre_voting_active || false,
        building_name: apiAssembly.building_name || '',
      };
      setAssembly(transformedAssembly);
      setIsLoading(false);
      return;
    }

    // Priority 3: Fetch from API (fallback)
    if (!buildingId) {
      setIsLoading(false);
      return;
    }

    const fetchAssembly = async () => {
      try {
        const response = await fetch(`/api/assemblies/upcoming?building_id=${buildingId}`);
        if (response.ok) {
          const responseData = await response.json();
          if (responseData.assembly) {
            setAssembly(responseData.assembly);
          }
        }
      } catch (error) {
        console.error('Failed to fetch assembly:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssembly();
  }, [buildingId, externalAssembly, data?.upcoming_assembly]);

  // Update countdown every second
  useEffect(() => {
    if (!assembly) return;

    const updateCountdown = () => {
      const cd = calculateCountdown(assembly.scheduled_date, assembly.scheduled_time);
      setCountdown(cd);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [assembly]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('el-GR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => timeStr.slice(0, 5);

  // No assembly or loading
  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-400" />
      </div>
    );
  }

  if (!assembly || !countdown) {
    return null; // Don't show scene if no assembly
  }

  // Don't show if assembly was more than 3 hours ago
  if (countdown.isPast) {
    return null;
  }

  const votingItemsCount = assembly.agenda_items.filter(i => i.item_type === 'voting').length;

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {/* Background */}
      <div 
        className="absolute inset-0"
        style={{
          background: countdown.hasStarted
            ? 'linear-gradient(135deg, #064e3b 0%, #0f766e 30%, #0d9488 70%, #14b8a6 100%)'
            : countdown.isToday
              ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4f46e5 70%, #6366f1 100%)'
              : 'linear-gradient(135deg, #020617 0%, #0f172a 30%, #1e3a8a 70%, #1d4ed8 100%)'
        }}
      />

      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-white/10"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [null, -100],
              opacity: [0.3, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex">
        {/* Left side - Main countdown */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className={cn(
                'w-16 h-16 rounded-2xl flex items-center justify-center',
                countdown.hasStarted 
                  ? 'bg-emerald-500 animate-pulse' 
                  : 'bg-gradient-to-br from-indigo-500 to-purple-600'
              )}>
                <Users className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-white mb-2">
              {countdown.hasStarted ? '🔴 ΣΥΝΕΛΕΥΣΗ ΣΕ ΕΞΕΛΙΞΗ' : 'Γενική Συνέλευση'}
            </h1>
            
            <h2 className="text-2xl text-white/80">{assembly.title}</h2>
            
            <div className="flex items-center justify-center gap-4 mt-4 text-white/60">
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {formatDate(assembly.scheduled_date)}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {formatTime(assembly.scheduled_time)}
              </span>
              {assembly.location && (
                <span className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  {assembly.location}
                </span>
              )}
            </div>
          </motion.div>

          {/* Countdown timer */}
          {!countdown.hasStarted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-4 mb-8"
            >
              {countdown.days > 0 && (
                <>
                  <CountdownDigit value={countdown.days} label="Ημέρες" />
                  <span className="text-4xl text-white/30 font-light">:</span>
                </>
              )}
              <CountdownDigit value={countdown.hours} label="Ώρες" />
              <span className="text-4xl text-white/30 font-light">:</span>
              <CountdownDigit value={countdown.minutes} label="Λεπτά" />
              <span className="text-4xl text-white/30 font-light">:</span>
              <CountdownDigit value={countdown.seconds} label="Δεύτερα" />
            </motion.div>
          )}

          {/* Live indicator when started */}
          {countdown.hasStarted && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-4 mb-8"
            >
              <div className="flex items-center gap-3 bg-emerald-500/30 px-8 py-4 rounded-2xl border border-emerald-400/50">
                <div className="w-4 h-4 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-2xl font-bold text-emerald-300">LIVE</span>
              </div>
            </motion.div>
          )}

          {/* Pre-voting progress */}
          {assembly.is_pre_voting_active && assembly.stats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full max-w-lg"
            >
              <PreVotingProgress stats={assembly.stats} />
            </motion.div>
          )}

          {/* RSVP Summary */}
          {assembly.stats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-full max-w-lg mt-6"
            >
              <RSVPSummary stats={assembly.stats} />
            </motion.div>
          )}
        </div>

        {/* Right side - Agenda */}
        <div className="w-[450px] bg-black/30 backdrop-blur-sm p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Ημερήσια Διάταξη
            </h3>
            {votingItemsCount > 0 && (
              <span className="px-3 py-1 bg-indigo-500/30 text-indigo-300 rounded-full text-sm">
                {votingItemsCount} ψηφοφορίες
              </span>
            )}
          </div>

          <div className="space-y-3">
            {assembly.agenda_items.map((item, index) => (
              <AgendaItemRow key={item.id} item={item} index={index} />
            ))}
          </div>

          {/* E-Voting prompt */}
          {votingItemsCount > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-8 p-4 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl border border-emerald-400/30 text-center"
            >
              <Vote className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-emerald-100 font-semibold text-sm mb-1">
                Ψηφοφορία διαθέσιμη!
              </p>
              <p className="text-white/70 text-xs leading-relaxed">
                Μπορείτε να ψηφίσετε ηλεκτρονικά μέσω της εφαρμογής<br />
                ή σαρώνοντας το QR code στο διαμέρισμά σας
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom ticker */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm py-3 px-6">
        <div className="flex items-center justify-between text-white/70 text-sm">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span>{assembly.building_name}</span>
          </div>
          <div className="flex items-center gap-4">
            {assembly.is_online && (
              <span className="flex items-center gap-1">
                <Video className="w-4 h-4" />
                Διαδικτυακή συμμετοχή διαθέσιμη
              </span>
            )}
            <span>
              Απαρτία*: {assembly.quorum_percentage?.toFixed(0) || 0}%
            </span>
          </div>
        </div>
        <div className="mt-1 text-[10px] text-white/40">
          * Περιλαμβάνει παρόντες και όσους έχουν ψηφίσει (pre-voting/καταχωρημένες ψήφοι).
        </div>
      </div>
    </div>
  );
}
