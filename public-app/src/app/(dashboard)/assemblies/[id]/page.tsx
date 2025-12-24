'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Calendar, Clock, MapPin, Video, FileText,
  ArrowLeft, Play, CheckCircle, AlertCircle, Percent,
  Timer, Vote, Send, Building2, ChevronRight, Edit,
  Trash2, XCircle, Loader2, Download, Printer, ClipboardList
} from 'lucide-react';

import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { 
  useAssembly, 
  useSendAssemblyInvitation,
  useStartAssembly,
  useDeleteAssembly,
  useDownloadAssemblyMinutes 
} from '@/hooks/useAssemblies';
import type { Assembly, AssemblyStatus } from '@/lib/api';

import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { hasOfficeAdminAccess, hasInternalManagerAccess } from '@/lib/roleUtils';

import RSVPCard from '@/components/assemblies/RSVPCard';
import PreVotingForm from '@/components/assemblies/PreVotingForm';
import AssemblyMinutesModal from '@/components/assemblies/AssemblyMinutesModal';

const statusColors: Record<AssemblyStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-600', icon: <FileText className="w-4 h-4" /> },
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Calendar className="w-4 h-4" /> },
  convened: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: <Send className="w-4 h-4" /> },
  in_progress: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <Play className="w-4 h-4" /> },
  completed: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-4 h-4" /> },
  adjourned: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <AlertCircle className="w-4 h-4" /> },
};

function QuorumMeter({ assembly }: { assembly: Assembly }) {
  const percentage = Number(assembly.quorum_percentage) || 0;
  const required = Number(assembly.required_quorum_percentage) || 50;
  const achieved = assembly.quorum_achieved;

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
          {achieved ? '✓ Επετεύχθη' : `Απαιτείται ${required}%`}
        </span>
      </div>

      <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
        {/* Required threshold line */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-10"
          style={{ left: `${required}%` }}
        />
        
        {/* Progress bar */}
        <motion.div
          className={cn(
            'h-full rounded-full',
            achieved ? 'bg-emerald-500' : percentage >= required - 10 ? 'bg-amber-500' : 'bg-red-400'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="flex justify-between mt-2 text-sm">
        <span className="text-gray-500">
          {assembly.achieved_quorum_mills} / {assembly.required_quorum_mills} χιλιοστά
        </span>
        <span className={cn(
          'font-medium',
          achieved ? 'text-emerald-600' : 'text-gray-600'
        )}>
          {percentage.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function AgendaOverview({ assembly }: { assembly: Assembly }) {
  const votingItems = assembly.agenda_items.filter(i => i.item_type === 'voting');
  const totalDuration = assembly.total_agenda_duration;

  return (
    <div className="bg-white rounded-xl border border-gray-300 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-300 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Ημερήσια Διάταξη
        </h3>
        <span className="text-sm text-gray-500">
          ~{totalDuration} λεπτά
        </span>
      </div>

      <div className="divide-y divide-gray-100">
        {assembly.agenda_items.map((item, index) => (
          <div 
            key={item.id}
            className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors"
          >
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-medium',
              item.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
              item.status === 'in_progress' ? 'bg-indigo-100 text-indigo-700' :
              'bg-gray-100 text-gray-600'
            )}>
              {item.order}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 text-sm">{item.title}</h4>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {item.estimated_duration} λεπτά
                </span>
                <span className={cn(
                  'px-1.5 py-0.5 rounded',
                  item.item_type === 'voting' ? 'bg-indigo-100 text-indigo-700' :
                  item.item_type === 'discussion' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                )}>
                  {item.item_type_display}
                </span>
              </div>
            </div>
            {item.item_type === 'voting' && (
              <Vote className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {votingItems.length > 0 && (
        <div className="px-5 py-3 bg-indigo-50 border-t border-gray-300">
          <p className="text-sm text-indigo-700">
            <Vote className="w-4 h-4 inline mr-1" />
            {votingItems.length} θέμα{votingItems.length > 1 ? 'τα' : ''} προς ψήφιση
          </p>
        </div>
      )}
    </div>
  );
}

function AttendeesPreview({ assembly }: { assembly: Assembly }) {
  const { attendees, stats } = assembly;
  const displayAttendees = attendees.slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-gray-300 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-300 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Συμμετοχές
        </h3>
        <span className="text-sm text-gray-500">
          {stats.total_apartments_invited} κλήσεις
        </span>
      </div>

      {/* RSVP stats */}
      <div className="px-5 py-3 grid grid-cols-3 gap-2 border-b border-gray-300">
        <div className="text-center">
          <div className="text-lg font-bold text-emerald-600">{stats.rsvp_attending}</div>
          <div className="text-xs text-gray-500">Θα έρθουν</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-amber-600">{stats.rsvp_pending}</div>
          <div className="text-xs text-gray-500">Αναμένονται</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-600">{stats.rsvp_not_attending}</div>
          <div className="text-xs text-gray-500">Απόντες</div>
        </div>
      </div>

      {/* Pre-voted count */}
      {stats.pre_voted_count > 0 && (
        <div className="px-5 py-3 bg-indigo-50 flex items-center gap-2">
          <Vote className="w-4 h-4 text-indigo-600" />
          <span className="text-sm text-indigo-700">
            <strong>{stats.pre_voted_count}</strong> έχουν ψηφίσει ηλεκτρονικά
          </span>
        </div>
      )}

      {/* Attendees list */}
      <div className="divide-y divide-gray-100">
        {displayAttendees.map((attendee) => (
          <div key={attendee.id} className="px-5 py-2 flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">{attendee.apartment_number}</div>
              <div className="text-xs text-gray-500">{attendee.display_name}</div>
            </div>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              attendee.rsvp_status === 'attending' ? 'bg-emerald-100 text-emerald-700' :
              attendee.rsvp_status === 'not_attending' ? 'bg-gray-100 text-gray-600' :
              attendee.rsvp_status === 'maybe' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-500'
            )}>
              {attendee.rsvp_status_display}
            </span>
          </div>
        ))}
      </div>

      {attendees.length > 5 && (
        <div className="px-5 py-3 border-t border-gray-100">
          <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
            Δείτε όλους ({attendees.length})
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function AssemblyDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthReady } = useAuth();
  const { selectedBuilding, isLoading: buildingLoading } = useBuilding();
  const [activeTab, setActiveTab] = useState<'overview' | 'vote'>('overview');
  const [isMinutesModalOpen, setIsMinutesModalOpen] = useState(false);

  const assemblyId = params.id as string;

  const { data: assembly, isLoading, isError, refetch } = useAssembly(assemblyId);
  const sendInvitation = useSendAssemblyInvitation();
  const startAssembly = useStartAssembly();
  const deleteAssembly = useDeleteAssembly();
  const downloadMinutes = useDownloadAssemblyMinutes();

  const canManage = hasInternalManagerAccess(user);

  // Find current user's attendee record
  const myAttendee = assembly?.attendees.find(a => a.user === user?.id) || null;

  if (!isAuthReady || isLoading || buildingLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-100 rounded-xl"></div>
            <div className="h-64 bg-gray-100 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  // Check if assembly belongs to selected building
  if (assembly && selectedBuilding && assembly.building !== selectedBuilding.id) {
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

  if (isError || !assembly) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800">Σφάλμα φόρτωσης</h3>
        <p className="text-red-600 mt-1">Δεν ήταν δυνατή η φόρτωση της συνέλευσης.</p>
        <Button variant="outline" onClick={() => refetch()} className="mt-4">
          Δοκιμή ξανά
        </Button>
      </div>
    );
  }

  const status = statusColors[assembly.status] || statusColors.draft;
  const isLive = assembly.status === 'in_progress';
  const canStart = ['scheduled', 'convened'].includes(assembly.status);
  const showPreVoting = assembly.is_pre_voting_active && myAttendee;

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

  const handleDelete = async () => {
    if (!confirm(`Είστε σίγουροι ότι θέλετε να διαγράψετε τη συνέλευση "${assembly.title}";`)) {
      return;
    }
    await deleteAssembly.mutateAsync(assembly.id);
    router.push('/assemblies');
  };

  const handleSendInvitation = async () => {
    if (!confirm('Θέλετε να στείλετε πρόσκληση σε όλους τους ενοίκους;')) {
      return;
    }
    await sendInvitation.mutateAsync(assembly.id);
  };

  const handleStart = async () => {
    if (!confirm('Θέλετε να ξεκινήσει η συνέλευση τώρα;')) {
      return;
    }
    await startAssembly.mutateAsync(assembly.id);
    router.push(`/assemblies/${assembly.id}/live`);
  };

  const handleDownloadWorkingSheet = () => {
    // We use a direct link because this is a public/GET endpoint for authenticated users
    const url = `${process.env.NEXT_PUBLIC_CORE_API_URL}/api/assemblies/${assembly.id}/download_working_sheet/`;
    // We should ideally use the api client to handle headers if needed, 
    // but for simplicity and immediate feedback, we open in new tab
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Back button & header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/assemblies')}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Πίσω
          </Button>
          
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              isLive ? 'bg-emerald-500 text-white animate-pulse' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
            )}>
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{assembly.title}</h1>
              <div className="flex items-center gap-2 mt-1 text-gray-500">
                <Building2 className="w-4 h-4" />
                <span>{assembly.building_name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              {/* Working Sheet Button */}
              <Button
                variant="outline"
                onClick={handleDownloadWorkingSheet}
                className="text-gray-600 border-gray-300 hover:bg-gray-50"
                title="Εκτύπωση φύλλου εργασίας για χειρόγραφη συμπλήρωση"
              >
                <Printer className="w-4 h-4 mr-2" />
                Φύλλο Εργασίας
              </Button>

              {assembly.status === 'draft' && (
                <Button
                  variant="outline"
                  onClick={handleSendInvitation}
                  disabled={sendInvitation.isPending}
                >
                  {sendInvitation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Αποστολή Πρόσκλησης
                </Button>
              )}
              
              {canStart && (
                <Button
                  onClick={handleStart}
                  disabled={startAssembly.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {startAssembly.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Έναρξη
                </Button>
              )}

              {isLive && (
                <Button
                  asChild
                  className="bg-gradient-to-r from-emerald-500 to-teal-600"
                >
                  <Link href={`/assemblies/${assembly.id}/live`}>
                    <Play className="w-4 h-4 mr-2" />
                    Live Dashboard
                  </Link>
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className={cn(
        'rounded-xl p-4 flex items-center justify-between',
        status.bg
      )}>
        <div className="flex items-center gap-3">
          <span className={status.text}>{status.icon}</span>
          <span className={cn('font-medium', status.text)}>{assembly.status_display}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {formatDate(assembly.scheduled_date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatTime(assembly.scheduled_time)}
          </span>
          {assembly.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {assembly.location}
            </span>
          )}
          {assembly.is_online && (
            <span className="flex items-center gap-1">
              <Video className="w-4 h-4" />
              Διαδικτυακά
            </span>
          )}
        </div>
      </div>

      {/* Tabs for RSVP/Voting */}
      {myAttendee && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Επισκόπηση
            </TabsTrigger>
            <TabsTrigger value="vote" className="flex items-center gap-2">
              <Vote className="w-4 h-4" />
              Ψηφοφορία
              {showPreVoting && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-500 text-white rounded-full">
                  Ενεργή
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left column */}
              <div className="space-y-6">
                <RSVPCard 
                  assembly={assembly} 
                  attendee={myAttendee}
                  onPreVoteClick={() => setActiveTab('vote')}
                />
                <QuorumMeter assembly={assembly} />
              </div>

              {/* Right column */}
              <div className="space-y-6">
                <AgendaOverview assembly={assembly} />
                <AttendeesPreview assembly={assembly} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="vote" className="mt-6">
            <PreVotingForm 
              assembly={assembly} 
              attendee={myAttendee}
              onComplete={() => setActiveTab('overview')}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* If user is not an attendee, show read-only view */}
      {!myAttendee && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <QuorumMeter assembly={assembly} />
            
            {/* Description */}
            {assembly.description && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Περιγραφή</h3>
                <p className="text-gray-600">{assembly.description}</p>
              </div>
            )}
          </div>
          <div className="space-y-6">
            <AgendaOverview assembly={assembly} />
            <AttendeesPreview assembly={assembly} />
          </div>
        </div>
      )}

      {/* Admin actions at bottom */}
      {canManage && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={() => setIsMinutesModalOpen(true)}
            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
          >
            <FileText className="w-4 h-4 mr-2" />
            Πρακτικά (Modal)
          </Button>
          {(assembly.status === 'completed') && (
            <Button 
              variant="outline" 
              onClick={() => downloadMinutes.mutate(assembly.id)}
              disabled={downloadMinutes.isPending}
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            >
              {downloadMinutes.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Λήψη Πρακτικών (PDF)
            </Button>
          )}
          {(assembly.status === 'draft' || assembly.status === 'scheduled' || assembly.status === 'convened') && (
            <Button variant="outline" asChild>
              <Link href={`/assemblies/${assembly.id}/edit`}>
                <Edit className="w-4 h-4 mr-2" />
                Επεξεργασία
              </Link>
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={handleDelete}
            disabled={deleteAssembly.isPending}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {deleteAssembly.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Διαγραφή
          </Button>
        </div>
      )}

      {canManage && (
        <AssemblyMinutesModal
          open={isMinutesModalOpen}
          onOpenChange={setIsMinutesModalOpen}
          assemblyId={assembly.id}
        />
      )}
    </div>
  );
}

export default function AssemblyDetailPage() {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <AssemblyDetailContent />
      </SubscriptionGate>
    </AuthGate>
  );
}

