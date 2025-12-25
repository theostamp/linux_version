'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Clock, MapPin, Vote, CheckCircle,
  Timer, FileText, AlertCircle, ChevronRight,
  Building2, Video, Info, MessageSquare, TrendingUp,
  ThumbsUp, ThumbsDown, Minus, Circle, Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssemblyData {
  id: string;
  title: string;
  scheduled_date: string;
  scheduled_time: string;
  location?: string;
  status: string;
  actual_start_time?: string | null;
  building_name: string;
  quorum_percentage: number;
  achieved_quorum_mills: number;
  required_quorum_mills: number;
  total_building_mills?: number;
  is_online?: boolean;
  agenda_items: Array<{
    id: string;
    order: number;
    title: string;
    item_type: string;
    status: string;
    estimated_duration: number;
  }>;
  current_item?: {
    id: string;
    order: number;
    title: string;
    item_type: string;
    status: string;
    voting_results?: {
      approve: { count: number; mills: number };
      reject: { count: number; mills: number };
      abstain: { count: number; mills: number };
      total: { count: number; mills: number };
    };
  } | null;
  attendees_stats?: {
    total: number;
    present: number;
    voted: number;
  };
}

interface LiveAssemblySceneProps {
  data?: any;
  buildingId?: number | null;
  assembly?: AssemblyData | null;
}

export default function LiveAssemblyScene({ 
  data, 
  buildingId,
  assembly: externalAssembly 
}: LiveAssemblySceneProps) {
  const [assembly, setAssembly] = useState<AssemblyData | null>(externalAssembly || null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update data from kiosk polling
  useEffect(() => {
    if (data?.upcoming_assembly) {
      setAssembly(data.upcoming_assembly);
    }
  }, [data?.upcoming_assembly]);

  // Elapsed time timer + current time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      if (assembly?.actual_start_time) {
        const start = new Date(assembly.actual_start_time).getTime();
        const now = new Date().getTime();
        setElapsedSeconds(Math.floor((now - start) / 1000));
      } else {
        setElapsedSeconds(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [assembly?.actual_start_time]);

  const formatElapsed = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (!assembly) return null;

  const currentItem = assembly.current_item;
  const nextItem = assembly.agenda_items.find(item => item.order === (currentItem?.order || 0) + 1);
  const completedItems = assembly.agenda_items.filter(i => i.status === 'completed').length;
  const totalItems = assembly.agenda_items.length;
  const totalBuildingMills = assembly.total_building_mills || 1000;

  // Voting results calculation
  const votingResults = currentItem?.voting_results;
  const totalVotedMills = votingResults 
    ? votingResults.approve.mills + votingResults.reject.mills + votingResults.abstain.mills 
    : 0;

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-slate-950 text-white font-sans select-none">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-slate-950 to-emerald-900/30" />
        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Live Indicator Bar */}
      <div className="absolute top-0 left-0 right-0 h-2 z-50">
        <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" 
             style={{ backgroundSize: '200% 100%' }} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col p-6 lg:p-10">
        
        {/* Top Header */}
        <header className="flex justify-between items-start mb-6 lg:mb-10">
          {/* Left: Title & Building */}
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3">
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-lg font-black rounded-full shadow-lg shadow-red-500/50"
              >
                <Activity className="w-5 h-5" />
                <span>LIVE</span>
              </motion.div>
              <div className="flex items-center gap-2 text-slate-400">
                <Building2 className="w-5 h-5" />
                <span className="text-xl font-medium">{assembly.building_name}</span>
              </div>
            </div>
            <h1 className="text-4xl lg:text-6xl font-black tracking-tight leading-tight">
              {assembly.title}
            </h1>
          </div>

          {/* Right: Time & Clock */}
          <div className="flex flex-col items-end gap-4">
            {/* Current Time */}
            <div className="text-right">
              <div className="text-slate-500 text-sm font-bold uppercase tracking-widest">Τρέχουσα Ώρα</div>
              <div className="text-5xl lg:text-6xl font-mono font-black text-white/90">
                {formatTime(currentTime)}
              </div>
            </div>
          </div>
        </header>

        {/* Stats Bar - Large and Clear */}
        <div className="grid grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-10">
          {/* Elapsed Time */}
          <StatCard 
            icon={<Timer className="w-8 h-8" />}
            label="Διάρκεια"
            value={formatElapsed(elapsedSeconds)}
            color="emerald"
            large
          />
          
          {/* Quorum */}
          <StatCard 
            icon={<Users className="w-8 h-8" />}
            label="Απαρτία*"
            value={`${assembly.quorum_percentage.toFixed(1)}%`}
            subtext={`${assembly.achieved_quorum_mills} / ${assembly.required_quorum_mills} χιλ.`}
            color={assembly.quorum_percentage >= 100 ? "emerald" : "amber"}
            large
          />
          
          {/* Present */}
          <StatCard 
            icon={<CheckCircle className="w-8 h-8" />}
            label="Παρόντες"
            value={assembly.attendees_stats?.present?.toString() || '-'}
            subtext={`από ${assembly.attendees_stats?.total || '-'}`}
            color="blue"
            large
          />
          
          {/* Progress */}
          <StatCard 
            icon={<FileText className="w-8 h-8" />}
            label="Πρόοδος"
            value={`${completedItems}/${totalItems}`}
            subtext="θέματα"
            color="indigo"
            large
          />
        </div>

        <div className="text-white/50 text-xs px-1 -mt-2 mb-4">
          * Περιλαμβάνει παρόντες και όσους έχουν ψηφίσει (pre-voting/καταχωρημένες ψήφοι).
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex gap-6 lg:gap-8 min-h-0">
          
          {/* Left: Current Agenda Item (70%) */}
          <div className="flex-[2] flex flex-col min-w-0">
            <AnimatePresence mode="wait">
              {currentItem ? (
                <motion.div
                  key={currentItem.id}
                  initial={{ opacity: 0, scale: 0.95, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.02, y: -30 }}
                  transition={{ duration: 0.5 }}
                  className="flex-1 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-3xl p-8 lg:p-12 flex flex-col overflow-hidden"
                >
                  {/* Item Header */}
                  <div className="flex items-center gap-6 mb-8">
                    <motion.div 
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center text-white text-4xl lg:text-5xl font-black shadow-2xl shadow-emerald-500/30"
                    >
                      {currentItem.order}
                    </motion.div>
                    <div>
                      <div className="text-sm lg:text-base font-bold uppercase tracking-[0.3em] text-emerald-400 mb-1">
                        ΤΡΕΧΟΝ ΘΕΜΑ
                      </div>
                      <div className="flex items-center gap-3 text-2xl lg:text-3xl font-semibold text-white/80">
                        {currentItem.item_type === 'voting' && <Vote className="w-8 h-8 text-indigo-400" />}
                        {currentItem.item_type === 'informational' && <Info className="w-8 h-8 text-blue-400" />}
                        {currentItem.item_type === 'discussion' && <MessageSquare className="w-8 h-8 text-amber-400" />}
                        <span>
                          {currentItem.item_type === 'voting' ? 'Ψηφοφορία' : 
                           currentItem.item_type === 'informational' ? 'Ενημέρωση' : 'Συζήτηση'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Item Title */}
                  <h2 className="text-4xl lg:text-5xl xl:text-6xl font-black leading-tight mb-8 lg:mb-12">
                    {currentItem.title}
                  </h2>

                  {/* Voting Results */}
                  {currentItem.item_type === 'voting' && votingResults && (
                    <div className="mt-auto">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl lg:text-3xl font-bold flex items-center gap-3">
                          <TrendingUp className="text-emerald-400 w-8 h-8" />
                          Αποτελέσματα Ψηφοφορίας
                        </h3>
                        <div className="text-xl text-slate-400">
                          <span className="text-white font-bold">{totalVotedMills}</span> χιλιοστά ψήφισαν
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-6">
                        <VoteResultCard 
                          label="ΥΠΕΡ"
                          icon={<ThumbsUp className="w-10 h-10" />}
                          mills={votingResults.approve.mills}
                          count={votingResults.approve.count}
                          percentage={(votingResults.approve.mills / totalBuildingMills) * 100}
                          color="emerald"
                        />
                        <VoteResultCard 
                          label="ΚΑΤΑ"
                          icon={<ThumbsDown className="w-10 h-10" />}
                          mills={votingResults.reject.mills}
                          count={votingResults.reject.count}
                          percentage={(votingResults.reject.mills / totalBuildingMills) * 100}
                          color="rose"
                        />
                        <VoteResultCard 
                          label="ΛΕΥΚΟ"
                          icon={<Minus className="w-10 h-10" />}
                          mills={votingResults.abstain.mills}
                          count={votingResults.abstain.count}
                          percentage={(votingResults.abstain.mills / totalBuildingMills) * 100}
                          color="slate"
                        />
                      </div>
                    </div>
                  )}

                  {/* Non-voting placeholder */}
                  {currentItem.item_type !== 'voting' && (
                    <div className="mt-auto flex items-center justify-center p-8 opacity-10">
                      {currentItem.item_type === 'discussion' ? (
                        <MessageSquare className="w-40 h-40 lg:w-56 lg:h-56" />
                      ) : (
                        <Info className="w-40 h-40 lg:w-56 lg:h-56" />
                      )}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center text-center"
                >
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-32 h-32 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center mb-8"
                  >
                    <Users className="w-16 h-16 text-slate-500" />
                  </motion.div>
                  <h2 className="text-4xl lg:text-5xl font-black text-slate-300">Αναμονή Έναρξης...</h2>
                  <p className="text-xl lg:text-2xl text-slate-500 mt-4 max-w-lg">
                    Ο διαχειριστής θα ξεκινήσει το πρώτο θέμα
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Agenda Sidebar (30%) */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            {/* Agenda List */}
            <div className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 overflow-hidden flex flex-col">
              <h3 className="text-lg font-bold uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2 shrink-0">
                <FileText className="w-5 h-5" />
                Ημερήσια Διάταξη
              </h3>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/10">
                {assembly.agenda_items.map((item) => (
                  <AgendaItemRow 
                    key={item.id}
                    item={item}
                    isCurrent={item.id === currentItem?.id}
                  />
                ))}
              </div>
            </div>

            {/* Next Up */}
            {nextItem && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-indigo-500/40 rounded-3xl p-6 shrink-0"
              >
                <div className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-400 mb-3 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4" />
                  ΕΠΟΜΕΝΟ
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-500/40 rounded-xl flex items-center justify-center text-indigo-200 text-2xl font-bold">
                    {nextItem.order}
                  </div>
                  <div className="text-xl font-bold text-indigo-100 line-clamp-2">{nextItem.title}</div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="h-16 flex items-center justify-between border-t border-white/5 mt-6 pt-4">
          <div className="flex items-center gap-6 text-slate-400">
            {assembly.location && (
              <div className="flex items-center gap-2 text-base">
                <MapPin className="w-5 h-5" />
                {assembly.location}
              </div>
            )}
            {assembly.is_online && (
              <div className="flex items-center gap-2 text-blue-400 text-base">
                <Video className="w-5 h-5" />
                Υβριδική Σύνδεση
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-slate-600 text-sm uppercase font-bold tracking-[0.15em]">
              New Concierge Live Assembly
            </div>
            <motion.div 
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,1)]" 
            />
          </div>
        </footer>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ 
  icon, 
  label, 
  value, 
  subtext,
  color,
  large 
}: { 
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  color: 'emerald' | 'blue' | 'amber' | 'indigo';
  large?: boolean;
}) {
  const colors = {
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
    indigo: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 text-indigo-400',
  };

  return (
    <div className={cn(
      "bg-gradient-to-br border rounded-2xl p-4 lg:p-6 flex items-center gap-4 lg:gap-6",
      colors[color]
    )}>
      <div className="shrink-0 opacity-80">{icon}</div>
      <div>
        <div className="text-xs lg:text-sm font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</div>
        <div className={cn(
          "font-mono font-black",
          large ? "text-3xl lg:text-4xl xl:text-5xl" : "text-2xl lg:text-3xl"
        )}>
          {value}
        </div>
        {subtext && <div className="text-xs lg:text-sm text-slate-500 mt-1">{subtext}</div>}
      </div>
    </div>
  );
}

// Vote Result Card Component
function VoteResultCard({
  label,
  icon,
  mills,
  count,
  percentage,
  color
}: {
  label: string;
  icon: React.ReactNode;
  mills: number;
  count: number;
  percentage: number;
  color: 'emerald' | 'rose' | 'slate';
}) {
  const colors = {
    emerald: { bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/50' },
    rose: { bg: 'bg-rose-500', text: 'text-rose-400', border: 'border-rose-500/50' },
    slate: { bg: 'bg-slate-500', text: 'text-slate-400', border: 'border-slate-500/50' },
  };

  return (
    <div className={cn(
      "bg-white/5 border rounded-2xl p-6 text-center",
      colors[color].border
    )}>
      <div className={cn("mb-4", colors[color].text)}>{icon}</div>
      <div className="text-lg font-bold uppercase tracking-widest text-slate-400 mb-2">{label}</div>
      <div className={cn("text-5xl lg:text-6xl font-black mb-1", colors[color].text)}>
        {percentage.toFixed(1)}%
      </div>
      <div className="text-lg text-slate-400">
        <span className="text-white font-bold">{mills}</span> χιλ. • <span className="text-white font-bold">{count}</span> ψήφοι
      </div>
      
      {/* Progress bar */}
      <div className="mt-4 h-3 bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, percentage)}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={cn("h-full rounded-full", colors[color].bg)}
        />
      </div>
    </div>
  );
}

// Agenda Item Row
function AgendaItemRow({ item, isCurrent }: { item: any; isCurrent: boolean }) {
  return (
    <div 
      className={cn(
        "p-4 rounded-2xl flex items-center gap-4 transition-all",
        isCurrent 
          ? "bg-emerald-500/20 border-2 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)]" 
          : item.status === 'completed' 
            ? "opacity-40 bg-white/5" 
            : "bg-white/5 border border-white/5"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shrink-0",
        isCurrent 
          ? "bg-emerald-500 text-white" 
          : item.status === 'completed'
            ? "bg-emerald-500/30 text-emerald-400"
            : "bg-white/10 text-white/50"
      )}>
        {item.status === 'completed' ? <CheckCircle className="w-5 h-5" /> : item.order}
      </div>
      <span className={cn(
        "font-medium text-base line-clamp-2",
        isCurrent ? "text-emerald-300" : "text-white/70"
      )}>
        {item.title}
      </span>
    </div>
  );
}
