'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, ArrowLeft, Play, Pause, Square, Clock,
  CheckCircle, XCircle, Minus, Vote, Loader2,
  ChevronRight, Timer, Percent, Building2,
  Video, MapPin, AlertCircle, MessageSquare, Monitor,
  FileText
} from 'lucide-react';

import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { 
  useAssembly, useAssemblyAttendees, useAgendaItems, 
  useStartAgendaItem, useEndAgendaItem, useAttendeeCheckIn,
  useEndAssembly, useAgendaItemVoteResults
} from '@/hooks/useAssemblies';
import { useAssemblyWebSocket } from '@/hooks/useAssemblyWebSocket';

import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { hasInternalManagerAccess } from '@/lib/roleUtils';
import LiveVotingPanel from '@/components/assemblies/LiveVotingPanel';
import LiveResultsDisplay from '@/components/assemblies/LiveResultsDisplay';
import LiveAttendeePanel from '@/components/assemblies/LiveAttendeePanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function LiveTimer({ startTime }: { startTime: string | null }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    
    const start = new Date(startTime).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  return (
    <div className="font-mono text-4xl font-bold text-emerald-600">
      {hours > 0 && `${hours.toString().padStart(2, '0')}:`}
      {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
    </div>
  );
}

function QuorumDisplay({ 
  achieved, 
  percentage, 
  achievedMills, 
  requiredMills 
}: { 
  achieved: boolean;
  percentage: number;
  achievedMills: number;
  requiredMills: number;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Percent className="w-4 h-4" />
          Απαρτία
        </h3>
        <span className={cn(
          'px-2.5 py-1 rounded-full text-xs font-medium',
          achieved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
        )}>
          {achieved ? '✓ Επετεύχθη' : 'Αναμονή'}
        </span>
      </div>

      <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className={cn(
            'h-full rounded-full',
            achieved ? 'bg-emerald-500' : 'bg-amber-500'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="flex justify-between mt-2 text-sm">
        <span className="text-gray-500">
          {achievedMills} / {requiredMills} χιλιοστά
        </span>
        <span className={cn('font-medium', achieved ? 'text-emerald-600' : 'text-gray-600')}>
          {percentage.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function AgendaItemCard({
  item,
  isActive,
  isCompleted,
  onStart,
  onComplete,
  canManage,
  isStarting,
  isCompleting
}: {
  item: {
    id: string;
    order: number;
    title: string;
    item_type: string;
    estimated_duration: number;
    started_at?: string;
    completed_at?: string;
    result?: string;
  };
  isActive: boolean;
  isCompleted: boolean;
  onStart: () => void;
  onComplete: () => void;
  canManage: boolean;
  isStarting: boolean;
  isCompleting: boolean;
}) {
  const itemTypeColors: Record<string, string> = {
    informational: 'bg-blue-100 text-blue-700',
    discussion: 'bg-amber-100 text-amber-700',
    voting: 'bg-indigo-100 text-indigo-700',
    approval: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <motion.div
      layout
      className={cn(
        'bg-white rounded-xl border-2 p-4 transition-all',
        isActive && 'border-emerald-500 ring-2 ring-emerald-200',
        isCompleted && 'border-gray-200 opacity-60',
        !isActive && !isCompleted && 'border-gray-200'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
          isCompleted ? 'bg-emerald-100 text-emerald-600' :
          isActive ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
        )}>
          {isCompleted ? <CheckCircle className="w-5 h-5" /> : item.order}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('px-2 py-0.5 rounded text-xs font-medium', itemTypeColors[item.item_type] || 'bg-gray-100')}>
              {item.item_type}
            </span>
            <span className="text-xs text-gray-400">{item.estimated_duration} λεπτά</span>
          </div>
          <h4 className="font-medium text-gray-900 mt-1 truncate">{item.title}</h4>
        </div>

        {canManage && !isCompleted && (
          <div className="flex items-center gap-2">
            {!isActive ? (
              <Button
                size="sm"
                variant="outline"
                onClick={onStart}
                disabled={isStarting}
              >
                {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onComplete}
                disabled={isCompleting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isCompleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              </Button>
            )}
          </div>
        )}

        {isCompleted && item.result && (
          <span className={cn(
            'px-2 py-1 rounded-full text-xs font-medium',
            item.result === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          )}>
            {item.result === 'approved' ? 'Εγκρίθηκε' : 'Απορρίφθηκε'}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function LiveAssemblyContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { selectedBuilding, isLoading: buildingLoading } = useBuilding();
  const assemblyId = params.id as string;

  const [activeTab, setActiveTab] = useState<'live' | 'attendees' | 'agenda'>('live');

  const { data: assembly, isLoading, error } = useAssembly(assemblyId);
  const { data: attendees = [] } = useAssemblyAttendees(assemblyId);

  // Real-time updates via WebSocket
  useAssemblyWebSocket(assemblyId);

  const { data: agendaItems = [] } = useAgendaItems(assemblyId);
  
  const startAgendaItem = useStartAgendaItem();
  const endAgendaItem = useEndAgendaItem();
  const endAssembly = useEndAssembly();

  const canManage = hasInternalManagerAccess(user);
  
  const currentItem = agendaItems.find(item => item.status === 'in_progress');
  const { data: voteResults } = useAgendaItemVoteResults(currentItem?.id);
  const currentAttendee = attendees.find(a => a.user === user?.id);
  const isVotingItem = currentItem?.item_type === 'voting';

  if (isLoading || buildingLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error || !assembly) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Δεν βρέθηκε η συνέλευση</h2>
        <Button variant="outline" onClick={() => router.push('/assemblies')} className="mt-4">
          Επιστροφή
        </Button>
      </div>
    );
  }

  // Check if assembly belongs to selected building
  if (selectedBuilding && assembly.building !== selectedBuilding.id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Building2 className="w-12 h-12 text-amber-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Διαφορετικό κτίριο</h2>
        <p className="text-gray-500 mt-2">Η συνέλευση ανήκει στο κτίριο: {assembly.building_name}</p>
        <Button variant="outline" onClick={() => router.push('/assemblies')} className="mt-4">
          Επιστροφή στις Συνελεύσεις
        </Button>
      </div>
    );
  }

  const isLive = assembly.status === 'in_progress';
  const completedCount = agendaItems.filter(item => item.completed_at).length;
  const presentCount = attendees.filter(a => a.is_present).length;

  const handleStartItem = async (itemId: string) => {
    await startAgendaItem.mutateAsync(itemId);
  };

  const handleCompleteItem = async (itemId: string) => {
    const item = agendaItems.find(i => i.id === itemId);
    const defaultDecision = item?.item_type === 'voting' 
      ? 'Εγκρίθηκε κατά πλειοψηφία' 
      : 'Ολοκληρώθηκε η συζήτηση';
      
    const decision = prompt('Ποια είναι η απόφαση για αυτό το θέμα;', defaultDecision);
    if (decision === null) return; // Cancelled
    
    await endAgendaItem.mutateAsync({ 
      id: itemId, 
      options: { 
        decision_type: item?.item_type === 'voting' ? 'approved' : 'no_decision',
        decision: decision
      } 
    });
  };

  const handleEndAssembly = async () => {
    if (!confirm('Θέλετε να ολοκληρώσετε τη συνέλευση;')) return;
    await endAssembly.mutateAsync(assembly.id);
    router.push(`/assemblies/${assembly.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/assemblies/${assembly.id}`)}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Πίσω
          </Button>

          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              isLive ? 'bg-emerald-500 text-white animate-pulse' : 'bg-gray-500 text-white'
            )}>
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{assembly.title}</h1>
                {isLive && (
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
                    LIVE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-gray-500">
                <Building2 className="w-4 h-4" />
                <span>{assembly.building_name}</span>
              </div>
            </div>
          </div>
        </div>

        {canManage && isLive && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => window.open(`/kiosk-display?building_id=${assembly.building}`, '_blank')}
              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            >
              <Monitor className="w-4 h-4 mr-2" />
              Προβολή Kiosk
            </Button>
            <Button
              variant="destructive"
              onClick={handleEndAssembly}
              disabled={endAssembly.isPending}
            >
              {endAssembly.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Square className="w-4 h-4 mr-2" />
              )}
              Τέλος Συνέλευσης
            </Button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Timer */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-gray-500 mb-1">
            <Timer className="w-3 h-3" />
            <span className="text-xs font-medium">Διάρκεια</span>
          </div>
          <div className="font-mono text-xl font-bold text-emerald-600">
            <LiveTimer startTime={assembly.started_at} />
          </div>
        </div>

        {/* Quorum - Hidden on very small screens or made compact */}
        <div className="hidden md:block">
          <QuorumDisplay
            achieved={assembly.quorum_achieved}
            percentage={Number(assembly.quorum_percentage) || 0}
            achievedMills={assembly.achieved_quorum_mills || 0}
            requiredMills={assembly.required_quorum_mills || 1000}
          />
        </div>
        
        {/* Mobile Quorum */}
        <div className="md:hidden bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-gray-500 mb-1">
            <Percent className="w-3 h-3" />
            <span className="text-xs font-medium">Απαρτία</span>
          </div>
          <div className={cn(
            "text-xl font-bold",
            assembly.quorum_achieved ? "text-emerald-600" : "text-amber-600"
          )}>
            {Number(assembly.quorum_percentage).toFixed(1)}%
          </div>
        </div>

        {/* Present */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-gray-500 mb-1">
            <Users className="w-3 h-3" />
            <span className="text-xs font-medium">Παρόντες</span>
          </div>
          <div className="text-xl font-bold text-indigo-600">{presentCount}</div>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-gray-500 mb-1">
            <CheckCircle className="w-3 h-3" />
            <span className="text-xs font-medium">Πρόοδος</span>
          </div>
          <div className="text-xl font-bold text-amber-600">{completedCount}/{agendaItems.length}</div>
        </div>
      </div>

      {/* Main Tabs for Mobile/Desktop Flow */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="live" className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            <span>Live</span>
          </TabsTrigger>
          <TabsTrigger value="attendees" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Παρόντες</span>
          </TabsTrigger>
          <TabsTrigger value="agenda" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Ατζέντα</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-6">
          {currentItem ? (
            <div className="grid lg:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "lg:col-span-2 rounded-2xl p-6 md:p-8 text-white shadow-lg",
                  isVotingItem 
                    ? "bg-gradient-to-br from-indigo-600 to-purple-700" 
                    : "bg-gradient-to-br from-emerald-500 to-teal-600"
                )}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] md:text-xs font-bold uppercase tracking-widest">
                    {isVotingItem ? 'Θέμα Ψηφοφορίας' : 'Τρέχον Θέμα'}
                  </div>
                  <div className="text-white/60 text-xs md:text-sm font-medium">
                    {currentItem.order} από {agendaItems.length}
                  </div>
                </div>
                
                <h2 className="text-2xl md:text-3xl font-black mb-4">{currentItem.title}</h2>
                
                {currentItem.description && (
                  <p className="text-sm md:text-lg text-white/80 leading-relaxed mb-6">
                    {currentItem.description}
                  </p>
                )}

                {isVotingItem && voteResults && (
                  <div className="mt-8 pt-8 border-t border-white/10">
                    <LiveResultsDisplay 
                      results={voteResults.summary} 
                      votingTypeDisplay={currentItem.voting_type_display}
                    />
                  </div>
                )}
              </motion.div>

              <div className="space-y-6">
                {isVotingItem && (
                  <LiveVotingPanel
                    item={currentItem}
                    attendee={currentAttendee || null}
                    hasVoted={voteResults?.votes?.some((v: any) => v.attendee === currentAttendee?.id) || false}
                  />
                )}
                
                {!isVotingItem && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center h-full flex flex-col items-center justify-center">
                    <MessageSquare className="w-12 h-12 text-gray-200 mb-4" />
                    <h3 className="text-gray-900 font-bold">Σε εξέλιξη συζήτησης</h3>
                    <p className="text-gray-500 text-sm mt-2">Δεν απαιτείται ψηφοφορία για αυτό το θέμα.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Έτοιμοι για ξεκίνημα;</h3>
              <p className="text-gray-500 mt-2 mb-6 text-sm">Επιλέξτε ένα θέμα από την ατζέντα για να ξεκινήσετε τη συζήτηση.</p>
              <Button onClick={() => setActiveTab('agenda')}>Μετάβαση στην Ατζέντα</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="attendees" className="h-[600px]">
          <LiveAttendeePanel
            assemblyId={assemblyId}
            attendees={attendees}
            currentItem={currentItem || null}
            voteResults={voteResults}
            canManage={canManage}
          />
        </TabsContent>

        <TabsContent value="agenda" className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ημερήσια Διάταξη</h2>
            <div className="space-y-3">
              {agendaItems.map((item) => (
                <AgendaItemCard
                  key={item.id}
                  item={item}
                  isActive={item.id === currentItem?.id}
                  isCompleted={!!item.completed_at}
                  onStart={() => { handleStartItem(item.id); setActiveTab('live'); }}
                  onComplete={() => handleCompleteItem(item.id)}
                  canManage={canManage}
                  isStarting={startAgendaItem.isPending}
                  isCompleting={endAgendaItem.isPending}
                />
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function LiveAssemblyPage() {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <LiveAssemblyContent />
      </SubscriptionGate>
    </AuthGate>
  );
}

