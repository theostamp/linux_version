'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Users, Plus, Calendar, Clock, MapPin, Video, 
  CheckCircle, XCircle, AlertCircle, Play, 
  FileText, Send, Building2, Timer, Percent
} from 'lucide-react';

import { useBuilding } from '@/components/contexts/BuildingContext';
import { useAuth } from '@/components/contexts/AuthContext';
import { useAssemblies, useDeleteAssembly } from '@/hooks/useAssemblies';
import type { AssemblyListItem, AssemblyStatus } from '@/lib/api';

import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { hasOfficeAdminAccess, hasInternalManagerAccess } from '@/lib/roleUtils';

const statusColors: Record<AssemblyStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  draft: { bg: 'bg-muted', text: 'text-muted-foreground', icon: <FileText className="w-3 h-3" /> },
  scheduled: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', icon: <Calendar className="w-3 h-3" /> },
  convened: { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', icon: <Send className="w-3 h-3" /> },
  in_progress: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', icon: <Play className="w-3 h-3" /> },
  completed: { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', icon: <CheckCircle className="w-3 h-3" /> },
  cancelled: { bg: 'bg-destructive/10', text: 'text-destructive', icon: <XCircle className="w-3 h-3" /> },
  adjourned: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', icon: <AlertCircle className="w-3 h-3" /> },
};

function AssemblyCard({ 
  assembly, 
  index, 
  canManage,
  onDelete
}: { 
  assembly: AssemblyListItem; 
  index: number;
  canManage: boolean;
  onDelete: () => void;
}) {
  const router = useRouter();
  const status = statusColors[assembly.status] || statusColors.draft;
  const isLive = assembly.status === 'in_progress';
  const isUpcoming = assembly.is_upcoming;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('el-GR', { 
      weekday: 'short',
      day: '2-digit', 
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr.slice(0, 5); // HH:MM
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={() => router.push(`/assemblies/${assembly.id}`)}
      className={cn(
        'group relative rounded-xl border bg-card p-5 shadow-sm transition-all duration-300 cursor-pointer',
        'hover:shadow-md hover:border-indigo-500/30',
        isLive && 'border-emerald-500/50 bg-emerald-500/5 ring-2 ring-emerald-500/30'
      )}
    >
      {/* Live indicator */}
      {isLive && (
        <div className="absolute -top-2 -right-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white text-xs shadow-lg animate-pulse">
            <Play className="w-4 h-4" />
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 space-y-2">
          {/* Title row */}
          <div className="flex flex-wrap items-center gap-2">
            <div className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg',
              isLive ? 'bg-emerald-500 text-white' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
            )}>
              <Users className="h-4 w-4" />
            </div>
            <h3 className="text-base font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
              {assembly.title}
            </h3>
          </div>

          {/* Building name (if no filter) */}
          {assembly.building_name && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground ml-10">
              <Building2 className="w-3.5 h-3.5" />
              <span>{assembly.building_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Status badge */}
        <span className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
          status.bg, status.text
        )}>
          {status.icon}
          {assembly.status_display}
        </span>

        {/* Date/Time */}
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {formatDate(assembly.scheduled_date)}
        </span>
        
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatTime(assembly.scheduled_time)}
        </span>

        {/* Location type */}
        {assembly.is_physical && assembly.is_online && (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-1 text-xs text-purple-600 dark:text-purple-400">
            <Video className="h-3 w-3" />
            Υβριδική
          </span>
        )}
        {assembly.is_online && !assembly.is_physical && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs text-blue-600 dark:text-blue-400">
            <Video className="h-3 w-3" />
            Online
          </span>
        )}
        {assembly.is_physical && !assembly.is_online && assembly.location && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {assembly.location}
          </span>
        )}

        {/* Pre-voting active */}
        {assembly.is_pre_voting_active && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-600 dark:text-amber-400 font-medium animate-pulse">
            🗳️ Pre-voting ενεργό
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <FileText className="w-4 h-4" />
          <span>{assembly.agenda_items_count} θέματα</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4" />
          <span>{assembly.attendees_count} παρόντες</span>
        </div>

        {/* Quorum indicator */}
        <div className={cn(
          'flex items-center gap-1.5 ml-auto',
          assembly.quorum_achieved ? 'text-emerald-600 dark:text-emerald-400' : 
            assembly.quorum_status === 'close' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
        )}>
          <Percent className="w-4 h-4" />
          <span>{(Number(assembly.quorum_percentage) || 0).toFixed(0)}%</span>
          {assembly.quorum_achieved && <CheckCircle className="w-4 h-4" />}
        </div>
      </div>
    </motion.div>
  );
}

function AssembliesPageContent() {
  const { currentBuilding, selectedBuilding, buildings, isLoading: buildingLoading } = useBuilding();
  const { isAuthReady, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deleteAssembly = useDeleteAssembly();

  const buildingId = currentBuilding?.id ?? selectedBuilding?.id ?? null;
  const canManage = hasInternalManagerAccess(user);

  const {
    data: assemblies = [],
    isLoading,
    isError,
    isSuccess,
    error,
    refetch
  } = useAssemblies(buildingId);

  // Separate by status
  const upcomingAssemblies = assemblies.filter(a => 
    ['scheduled', 'convened', 'in_progress'].includes(a.status)
  );
  const pastAssemblies = assemblies.filter(a => 
    ['completed', 'adjourned', 'cancelled'].includes(a.status)
  );
  const draftAssemblies = assemblies.filter(a => a.status === 'draft');

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Είστε σίγουροι ότι θέλετε να διαγράψετε τη συνέλευση "${title}";`)) {
      return;
    }
    deleteAssembly.mutate(id);
  };

  if (!isAuthReady || buildingLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">📋 Γενικές Συνελεύσεις</h1>
            <p className="text-muted-foreground mt-1">Οργάνωση και διαχείριση συνελεύσεων</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border bg-gray-50 p-5">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">📋 Γενικές Συνελεύσεις</h1>
        <BuildingFilterIndicator className="mb-4" />
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">Αδυναμία φόρτωσης συνελεύσεων.</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-4">
            Δοκιμή ξανά
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <Users className="w-5 h-5" />
            </span>
            Γενικές Συνελεύσεις
          </h1>
          <p className="text-muted-foreground mt-1 ml-13">
            Οργάνωση, διαχείριση και παρακολούθηση συνελεύσεων
          </p>
        </div>
        {canManage && (
          <Button asChild className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
            <Link href="/assemblies/new">
              <Plus className="w-4 h-4 mr-2" />
              Νέα Συνέλευση
            </Link>
          </Button>
        )}
      </motion.div>

      <BuildingFilterIndicator className="mb-2" />

      {isSuccess && assemblies.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-2xl border-2 border-dashed border-border p-12 text-center"
        >
          <div className="w-20 h-20 bg-muted rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Δεν υπάρχουν συνελεύσεις
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Δημιουργήστε τη πρώτη σας συνέλευση με δομημένη ατζέντα και αυτόματη δημιουργία πρακτικών.
          </p>
          {canManage && (
            <Button asChild size="lg" className="bg-gradient-to-r from-indigo-500 to-purple-600">
              <Link href="/assemblies/new">
                <Plus className="w-5 h-5 mr-2" />
                Δημιουργία Συνέλευσης
              </Link>
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-8">
          {/* Draft assemblies */}
          {draftAssemblies.length > 0 && canManage && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                <h2 className="text-lg font-semibold text-muted-foreground">
                  Προσχέδια ({draftAssemblies.length})
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {draftAssemblies.map((assembly, index) => (
                  <AssemblyCard
                    key={assembly.id}
                    assembly={assembly}
                    index={index}
                    canManage={canManage}
                    onDelete={() => handleDelete(assembly.id, assembly.title)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming & Live assemblies */}
          {upcomingAssemblies.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-lg font-semibold text-foreground">
                  Επερχόμενες / Σε Εξέλιξη ({upcomingAssemblies.length})
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingAssemblies.map((assembly, index) => (
                  <AssemblyCard
                    key={assembly.id}
                    assembly={assembly}
                    index={index}
                    canManage={canManage}
                    onDelete={() => handleDelete(assembly.id, assembly.title)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past assemblies */}
          {pastAssemblies.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                <h2 className="text-lg font-semibold text-muted-foreground">
                  Ολοκληρωμένες ({pastAssemblies.length})
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pastAssemblies.map((assembly, index) => (
                  <AssemblyCard
                    key={assembly.id}
                    assembly={assembly}
                    index={index}
                    canManage={canManage}
                    onDelete={() => handleDelete(assembly.id, assembly.title)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Action Button for mobile */}
      {canManage && (
        <Link
          href="/assemblies/new"
          className="md:hidden fixed bottom-6 right-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110 z-50"
          title="Νέα Συνέλευση"
        >
          <Plus className="w-6 h-6" />
        </Link>
      )}
    </div>
  );
}

export default function AssembliesPage() {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <AssembliesPageContent />
      </SubscriptionGate>
    </AuthGate>
  );
}

