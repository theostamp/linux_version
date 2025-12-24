'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Calendar, Clock, MapPin, Vote, CheckCircle,
  Timer, FileText, Percent, AlertCircle, ChevronRight,
  Building2, Video, Play, Info, MessageSquare, TrendingUp
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
}

interface LiveAssemblySceneProps {
  data?: any; // KioskData
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

  // Update data from kiosk polling
  useEffect(() => {
    if (data?.upcoming_assembly) {
      setAssembly(data.upcoming_assembly);
    }
  }, [data?.upcoming_assembly]);

  // Elapsed time timer
  useEffect(() => {
    const interval = setInterval(() => {
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
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!assembly) return null;

  const currentItem = assembly.current_item;
  const nextItem = assembly.agenda_items.find(item => item.order === (currentItem?.order || 0) + 1);

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-slate-950 text-white font-sans">
      {/* Background Gradient & Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-slate-900 to-emerald-900/20" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 animate-pulse" />
      </div>

      {/* Main Content Grid */}
      <div className="relative z-10 h-full flex flex-col p-8">
        
        {/* Header Section */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="px-3 py-1 bg-emerald-500 text-white text-sm font-bold rounded-full flex items-center gap-2 animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full" />
                ΣΕ ΕΞΕΛΙΞΗ
              </div>
              <span className="text-slate-400 font-medium">| {assembly.building_name}</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">{assembly.title}</h1>
          </div>

          <div className="flex gap-6">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <Timer className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Διάρκεια</div>
                <div className="text-2xl font-mono font-bold text-emerald-400">{formatElapsed(elapsedSeconds)}</div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4 min-w-[180px]">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Απαρτία</div>
                <div className="text-2xl font-bold text-blue-400">
                  {assembly.quorum_percentage.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Section: Current Agenda Item */}
        <div className="flex-1 flex gap-8 mb-8">
          {/* Main Focus Card */}
          <div className="flex-[2] flex flex-col">
            <AnimatePresence mode="wait">
              {currentItem ? (
                <motion.div
                  key={currentItem.id}
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.05, y: -20 }}
                  className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 flex flex-col"
                >
                  <div className="flex items-center gap-4 mb-6 text-emerald-400">
                    <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-emerald-500/20">
                      {currentItem.order}
                    </div>
                    <div>
                      <div className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-500/70">Τρέχον Θέμα</div>
                      <div className="flex items-center gap-2">
                        {currentItem.item_type === 'voting' && <Vote className="w-5 h-5" />}
                        {currentItem.item_type === 'informational' && <Info className="w-5 h-5" />}
                        {currentItem.item_type === 'discussion' && <MessageSquare className="w-5 h-5" />}
                        <span className="text-xl font-semibold capitalize">
                          {currentItem.item_type === 'voting' ? 'Ψηφοφορία' : 
                           currentItem.item_type === 'informational' ? 'Ενημέρωση' : 'Συζήτηση'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <h2 className="text-5xl font-bold leading-tight mb-8">
                    {currentItem.title}
                  </h2>

                  {/* Voting Results (Live) */}
                  {currentItem.item_type === 'voting' && currentItem.voting_results && (
                    <div className="mt-auto space-y-6">
                      <div className="flex justify-between items-end">
                        <h3 className="text-2xl font-bold flex items-center gap-3">
                          <TrendingUp className="text-emerald-400" />
                          Αποτελέσματα Live
                        </h3>
                        <div className="text-slate-400">
                          Σύνολο: <span className="text-white font-bold">{currentItem.voting_results.total.mills}</span> χιλιοστά
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* APPROVE */}
                        <VoteProgress 
                          label="Υπέρ" 
                          color="bg-emerald-500" 
                          mills={currentItem.voting_results.approve.mills} 
                          total={assembly.required_quorum_mills} 
                          percentage={(currentItem.voting_results.approve.mills / assembly.total_building_mills) * 100}
                        />
                        {/* REJECT */}
                        <VoteProgress 
                          label="Κατά" 
                          color="bg-rose-500" 
                          mills={currentItem.voting_results.reject.mills} 
                          total={assembly.required_quorum_mills} 
                          percentage={(currentItem.voting_results.reject.mills / assembly.total_building_mills) * 100}
                        />
                        {/* ABSTAIN */}
                        <VoteProgress 
                          label="Λευκό" 
                          color="bg-slate-500" 
                          mills={currentItem.voting_results.abstain.mills} 
                          total={assembly.required_quorum_mills} 
                          percentage={(currentItem.voting_results.abstain.mills / assembly.total_building_mills) * 100}
                        />
                      </div>
                    </div>
                  )}

                  {currentItem.item_type !== 'voting' && (
                    <div className="mt-auto flex items-center justify-center p-12 opacity-20">
                      {currentItem.item_type === 'discussion' ? (
                        <MessageSquare className="w-48 h-48" />
                      ) : (
                        <Info className="w-48 h-48" />
                      )}
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                    <Users className="w-12 h-12 text-slate-500" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-400">Έναρξη Συζήτησης...</h2>
                  <p className="text-slate-500 mt-2 max-w-sm">
                    Ο διαχειριστής θα ξεκινήσει το πρώτο θέμα σε λίγο.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar: Agenda & Next Up */}
          <div className="flex-1 flex flex-col gap-8">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex-1">
              <h3 className="text-lg font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Ημερήσια Διάταξη
              </h3>
              <div className="space-y-3">
                {assembly.agenda_items.map((item) => (
                  <div 
                    key={item.id}
                    className={cn(
                      "p-4 rounded-2xl flex items-center gap-4 transition-all",
                      item.status === 'in_progress' ? "bg-emerald-500/20 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]" :
                      item.status === 'completed' ? "opacity-30 grayscale" : "bg-white/5 border border-white/5"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                      item.status === 'in_progress' ? "bg-emerald-500 text-white" : "bg-white/10 text-white/50"
                    )}>
                      {item.order}
                    </div>
                    <span className={cn(
                      "font-medium",
                      item.status === 'in_progress' ? "text-emerald-400" : "text-white/70"
                    )}>{item.title}</span>
                    {item.status === 'completed' && <CheckCircle className="ml-auto w-4 h-4 text-emerald-500" />}
                  </div>
                ))}
              </div>
            </div>

            {nextItem && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-3xl p-6"
              >
                <div className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">Ακολουθεί</div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-300 font-bold">
                    {nextItem.order}
                  </div>
                  <div className="text-lg font-bold text-indigo-100">{nextItem.title}</div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer Ticker / Meta */}
        <div className="h-16 flex items-center justify-between border-t border-white/5 mt-auto">
          <div className="flex items-center gap-8 text-slate-400 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {assembly.location}
            </div>
            {assembly.is_online && (
              <div className="flex items-center gap-2 text-blue-400">
                <Video className="w-4 h-4" />
                Υβριδική Σύνδεση Ενεργή
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-slate-500 text-xs uppercase font-bold tracking-[0.2em]">New Concierge Live System</div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,1)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function VoteProgress({ label, color, mills, total, percentage }: { label: string, color: string, mills: number, total: number, percentage: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-bold">
        <span>{label}</span>
        <span>{mills} <span className="text-slate-500 font-normal">χιλ.</span> ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[2px]">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (mills / 1000) * 100)}%` }}
          className={cn("h-full rounded-full shadow-lg", color)}
        />
      </div>
    </div>
  );
}

