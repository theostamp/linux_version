'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  MapPin,
  Vote,
  CheckCircle,
  Timer,
  FileText,
  ChevronRight,
  Building2,
  Video,
  Info,
  MessageSquare,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getScenePalette } from '@/components/kiosk/scenes/palette';

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
  assembly: externalAssembly 
}: LiveAssemblySceneProps) {
  const [assembly, setAssembly] = useState<AssemblyData | null>(externalAssembly || null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [paletteHour, setPaletteHour] = useState(() => new Date().getHours());

  // Update data from kiosk polling
  useEffect(() => {
    if (data?.upcoming_assembly) {
      setAssembly(data.upcoming_assembly);
    }
  }, [data?.upcoming_assembly]);

  useEffect(() => {
    const timer = setInterval(() => setPaletteHour(new Date().getHours()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

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

  const palette = useMemo(() => getScenePalette(paletteHour), [paletteHour]);
  const cardStyle = { backgroundColor: palette.cardSurface, borderColor: palette.accentBorder };
  const sidebarStyle = { backgroundColor: palette.sidebarSurface, borderColor: palette.accentBorder };
  const tickerStyle = { backgroundColor: palette.tickerSurface, borderColor: palette.accentBorder };

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
    <div
      className="relative h-screen w-screen overflow-hidden text-white select-none"
      style={{ background: palette.background }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: palette.overlay }} />

      <div className="relative z-10 h-full flex flex-col gap-2 p-4 pb-24">
        
        {/* Top Header */}
        <header
          className="flex justify-between items-start backdrop-blur-2xl rounded-2xl shadow-2xl border p-4"
          style={cardStyle}
        >
          {/* Left: Title & Building */}
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <motion.div 
                animate={{ opacity: [0.75, 1, 0.75] }}
                transition={{ duration: 2.4, repeat: Infinity }}
                className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/20 border border-rose-400/30 text-rose-200 text-[11px] font-bold uppercase tracking-[0.18em] rounded-full"
              >
                <Activity className="w-4 h-4" />
                <span>LIVE</span>
              </motion.div>
              <div className="flex items-center gap-2 text-white/70">
                <Building2 className="w-4 h-4" />
                <span className="text-sm font-medium">{assembly.building_name}</span>
              </div>
            </div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              {assembly.title}
            </h1>
          </div>

          {/* Right: Time & Clock */}
          <div className="flex flex-col items-end gap-4">
            {/* Current Time */}
            <div className="text-right">
              <div className="text-indigo-200/70 text-[11px] font-bold uppercase tracking-[0.16em]">
                Τρέχουσα Ώρα
              </div>
              <div className="text-3xl lg:text-4xl font-mono font-black text-white/90">
                {formatTime(currentTime)}
              </div>
            </div>
          </div>
        </header>

        {/* Stats Bar - Large and Clear */}
        <div className="grid grid-cols-4 gap-2 lg:gap-3">
          {/* Elapsed Time */}
          <StatCard 
            icon={<Timer className="w-6 h-6" />}
            label="Διάρκεια"
            value={formatElapsed(elapsedSeconds)}
            color="emerald"
            large
            surfaceColor={palette.cardSurface}
            accentBorder={palette.accentBorder}
          />
          
          {/* Quorum */}
          <StatCard 
            icon={<Users className="w-6 h-6" />}
            label="Απαρτία*"
            value={`${assembly.quorum_percentage.toFixed(1)}%`}
            subtext={`${assembly.achieved_quorum_mills} / ${assembly.required_quorum_mills} χιλ.`}
            color={assembly.quorum_percentage >= 100 ? "emerald" : "amber"}
            large
            surfaceColor={palette.cardSurface}
            accentBorder={palette.accentBorder}
          />
          
          {/* Present */}
          <StatCard 
            icon={<CheckCircle className="w-6 h-6" />}
            label="Παρόντες"
            value={assembly.attendees_stats?.present?.toString() || '-'}
            subtext={`από ${assembly.attendees_stats?.total || '-'}`}
            color="blue"
            large
            surfaceColor={palette.cardSurface}
            accentBorder={palette.accentBorder}
          />
          
          {/* Progress */}
          <StatCard 
            icon={<FileText className="w-6 h-6" />}
            label="Πρόοδος"
            value={`${completedItems}/${totalItems}`}
            subtext="θέματα"
            color="indigo"
            large
            surfaceColor={palette.cardSurface}
            accentBorder={palette.accentBorder}
          />
        </div>

        <div className="text-white/50 text-[11px] px-1">
          * Περιλαμβάνει παρόντες και όσους έχουν ψηφίσει (pre-voting/καταχωρημένες ψήφοι).
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-h-0 flex gap-2">
          
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
	                  className="flex-1 backdrop-blur-2xl border rounded-2xl p-6 flex flex-col overflow-hidden"
	                  style={cardStyle}
	                >
	                  {/* Item Header */}
	                  <div className="flex items-center gap-4 mb-6">
	                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-emerald-500/20">
	                      {currentItem.order}
	                    </div>
	                    <div>
	                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300/80 mb-1">
	                        ΤΡΕΧΟΝ ΘΕΜΑ
	                      </div>
	                      <div className="flex items-center gap-2 text-lg lg:text-xl font-semibold text-white/85">
	                        {currentItem.item_type === 'voting' && <Vote className="w-6 h-6 text-indigo-300" />}
	                        {currentItem.item_type === 'informational' && <Info className="w-6 h-6 text-blue-300" />}
	                        {currentItem.item_type === 'discussion' && <MessageSquare className="w-6 h-6 text-amber-300" />}
	                        <span>
	                          {currentItem.item_type === 'voting' ? 'Ψηφοφορία' : 
	                           currentItem.item_type === 'informational' ? 'Ενημέρωση' : 'Συζήτηση'}
	                        </span>
	                      </div>
	                    </div>
	                  </div>

	                  {/* Item Title */}
	                  <h2 className="text-3xl lg:text-4xl font-black leading-tight mb-6">
	                    {currentItem.title}
	                  </h2>

                  {/* Voting Results */}
	                  {currentItem.item_type === 'voting' && votingResults && (
	                    <div className="mt-auto">
	                      <div className="flex items-center justify-between mb-6">
	                        <h3 className="text-lg lg:text-xl font-bold flex items-center gap-2">
	                          <TrendingUp className="text-emerald-300 w-6 h-6" />
	                          Αποτελέσματα Ψηφοφορίας
	                        </h3>
	                        <div className="text-sm text-white/70">
	                          <span className="text-white font-bold">{totalVotedMills}</span> χιλ. ψήφισαν
	                        </div>
	                      </div>

	                      <div className="grid grid-cols-3 gap-3">
	                        <VoteResultCard 
	                          label="ΥΠΕΡ"
	                          icon={<ThumbsUp className="w-7 h-7" />}
	                          mills={votingResults.approve.mills}
	                          count={votingResults.approve.count}
	                          percentage={(votingResults.approve.mills / totalBuildingMills) * 100}
	                          color="emerald"
	                          surfaceColor={palette.cardSurface}
	                          accentBorder={palette.accentBorder}
	                        />
	                        <VoteResultCard 
	                          label="ΚΑΤΑ"
	                          icon={<ThumbsDown className="w-7 h-7" />}
	                          mills={votingResults.reject.mills}
	                          count={votingResults.reject.count}
	                          percentage={(votingResults.reject.mills / totalBuildingMills) * 100}
	                          color="rose"
	                          surfaceColor={palette.cardSurface}
	                          accentBorder={palette.accentBorder}
	                        />
	                        <VoteResultCard 
	                          label="ΛΕΥΚΟ"
	                          icon={<Minus className="w-7 h-7" />}
	                          mills={votingResults.abstain.mills}
	                          count={votingResults.abstain.count}
	                          percentage={(votingResults.abstain.mills / totalBuildingMills) * 100}
	                          color="slate"
	                          surfaceColor={palette.cardSurface}
	                          accentBorder={palette.accentBorder}
	                        />
	                      </div>
	                    </div>
	                  )}

                  {/* Non-voting placeholder */}
	                  {currentItem.item_type !== 'voting' && (
	                    <div className="mt-auto flex items-center justify-center p-8 opacity-10">
	                      {currentItem.item_type === 'discussion' ? (
	                        <MessageSquare className="w-32 h-32 lg:w-44 lg:h-44" />
	                      ) : (
	                        <Info className="w-32 h-32 lg:w-44 lg:h-44" />
	                      )}
	                    </div>
	                  )}
	                </motion.div>
	              ) : (
	                <motion.div 
	                  initial={{ opacity: 0 }}
	                  animate={{ opacity: 1 }}
	                  className="flex-1 backdrop-blur-2xl border rounded-2xl p-10 flex flex-col items-center justify-center text-center"
	                  style={cardStyle}
	                >
	                  <motion.div 
	                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
	                    transition={{ duration: 2, repeat: Infinity }}
	                    className="w-32 h-32 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center mb-8"
	                  >
	                    <Users className="w-16 h-16 text-slate-500" />
	                  </motion.div>
	                  <h2 className="text-3xl lg:text-4xl font-black text-slate-200">Αναμονή Έναρξης...</h2>
	                  <p className="text-lg lg:text-xl text-slate-300/60 mt-4 max-w-lg">
	                    Ο διαχειριστής θα ξεκινήσει το πρώτο θέμα
	                  </p>
	                </motion.div>
	              )}
            </AnimatePresence>
          </div>

          {/* Right: Agenda Sidebar (30%) */}
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            {/* Agenda List */}
            <div
              className="flex-1 backdrop-blur-2xl border rounded-2xl p-4 overflow-hidden flex flex-col shadow-2xl"
              style={sidebarStyle}
            >
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-200/80 mb-4 flex items-center gap-2 shrink-0">
                <FileText className="w-4 h-4" />
                Ημερήσια Διάταξη
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-white/10">
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
                className="backdrop-blur-2xl border rounded-2xl p-4 shrink-0 shadow-2xl"
                style={cardStyle}
              >
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-200/80 mb-3 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-indigo-200/70" />
                  ΕΠΟΜΕΝΟ
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500/25 rounded-xl flex items-center justify-center text-indigo-100 text-xl font-black">
                    {nextItem.order}
                  </div>
                  <div className="text-base font-bold text-white/90 line-clamp-2">{nextItem.title}</div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <div
        className="fixed bottom-4 left-5 right-5 h-20 backdrop-blur-3xl border shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl z-50 overflow-hidden"
        style={tickerStyle}
      >
        <div className="h-full px-8 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white/80 text-sm font-medium min-w-0">
            <Building2 className="w-4 h-4 shrink-0" />
            <span className="shrink-0">{assembly.building_name}</span>
            <span className="text-white/30">•</span>
            <span className="truncate">
              {currentItem ? `Θέμα ${currentItem.order}: ${currentItem.title}` : 'Αναμονή έναρξης'}
            </span>
          </div>

          <div className="flex items-center gap-6 text-white/75 text-sm font-medium">
            {assembly.location && (
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {assembly.location}
              </span>
            )}
            {assembly.is_online && (
              <span className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Υβριδική
              </span>
            )}
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.15em] text-white/60 font-bold">LIVE</span>
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.75)]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0.5 left-0 right-0 h-3 flex items-center justify-center z-40">
        <p className="text-[9px] text-lime-200/60 font-normal tracking-wide">
          © {new Date().getFullYear()} New Concierge. All rights reserved.
        </p>
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
  large,
  surfaceColor,
  accentBorder,
}: { 
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  color: 'emerald' | 'blue' | 'amber' | 'indigo';
  large?: boolean;
  surfaceColor: string;
  accentBorder: string;
}) {
  const colors = {
    emerald: { text: 'text-emerald-300', iconBg: 'bg-emerald-500/15' },
    blue: { text: 'text-blue-300', iconBg: 'bg-blue-500/15' },
    amber: { text: 'text-amber-300', iconBg: 'bg-amber-500/15' },
    indigo: { text: 'text-indigo-300', iconBg: 'bg-indigo-500/15' },
  };

  return (
    <div
      className="backdrop-blur-2xl border rounded-2xl p-4 flex items-center gap-4 shadow-2xl"
      style={{ backgroundColor: surfaceColor, borderColor: accentBorder }}
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
        colors[color].iconBg,
        colors[color].text
      )}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55 mb-1">
          {label}
        </div>
        <div className={cn(
          "font-mono font-black text-white",
          large ? "text-2xl lg:text-3xl" : "text-xl lg:text-2xl"
        )}>
          {value}
        </div>
        {subtext && (
          <div className="text-[11px] text-white/45 mt-1 truncate">
            {subtext}
          </div>
        )}
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
  color,
  surfaceColor,
  accentBorder,
}: {
  label: string;
  icon: React.ReactNode;
  mills: number;
  count: number;
  percentage: number;
  color: 'emerald' | 'rose' | 'slate';
  surfaceColor: string;
  accentBorder: string;
}) {
  const colors = {
    emerald: { bg: 'bg-emerald-500', text: 'text-emerald-300' },
    rose: { bg: 'bg-rose-500', text: 'text-rose-300' },
    slate: { bg: 'bg-slate-500', text: 'text-slate-300' },
  };

  return (
    <div
      className="backdrop-blur-2xl border rounded-2xl p-4 text-center shadow-2xl"
      style={{ backgroundColor: surfaceColor, borderColor: accentBorder }}
    >
      <div className={cn("mb-3", colors[color].text)}>{icon}</div>
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55 mb-1">{label}</div>
      <div className={cn("text-4xl lg:text-5xl font-black mb-1", colors[color].text)}>
        {percentage.toFixed(1)}%
      </div>
      <div className="text-[11px] text-white/55">
        <span className="text-white font-bold">{mills}</span> χιλ. •{' '}
        <span className="text-white font-bold">{count}</span> ψήφοι
      </div>
      
      {/* Progress bar */}
      <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
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
        "p-3 rounded-2xl flex items-center gap-3 transition-all",
        isCurrent 
          ? "bg-emerald-500/20 border-2 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)]" 
          : item.status === 'completed' 
            ? "opacity-40 bg-white/5" 
            : "bg-white/5 border border-white/5"
      )}
    >
      <div className={cn(
        "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base shrink-0",
        isCurrent 
          ? "bg-emerald-500 text-white" 
          : item.status === 'completed'
            ? "bg-emerald-500/30 text-emerald-400"
            : "bg-white/10 text-white/50"
      )}>
        {item.status === 'completed' ? <CheckCircle className="w-4 h-4" /> : item.order}
      </div>
      <span className={cn(
        "font-medium text-sm line-clamp-2",
        isCurrent ? "text-emerald-300" : "text-white/70"
      )}>
        {item.title}
      </span>
    </div>
  );
}
