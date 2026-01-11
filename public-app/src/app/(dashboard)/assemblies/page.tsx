'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users, Plus, Calendar, Clock, MapPin, Video,
  CheckCircle, XCircle, AlertCircle, Play,
  FileText, Send, Building2, Timer, Percent, HelpCircle,
  Activity
} from 'lucide-react';

import { useBuilding } from '@/components/contexts/BuildingContext';
import { useAuth } from '@/components/contexts/AuthContext';
import { useAssemblies, useDeleteAssembly } from '@/hooks/useAssemblies';
import type { AssemblyListItem, AssemblyStatus } from '@/lib/api';

import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { hasOfficeAdminAccess, hasInternalManagerAccess } from '@/lib/roleUtils';

const statusColors: Record<AssemblyStatus, { variant: "default" | "secondary" | "destructive" | "success" | "warning" | "outline"; icon: React.ReactNode }> = {
  draft: { variant: 'secondary', icon: <FileText className="w-3 h-3" /> },
  scheduled: { variant: 'default', icon: <Calendar className="w-3 h-3" /> },
  convened: { variant: 'default', icon: <Send className="w-3 h-3" /> },
  in_progress: { variant: 'success', icon: <Play className="w-3 h-3" /> },
  completed: { variant: 'outline', icon: <CheckCircle className="w-3 h-3" /> },
  cancelled: { variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
  adjourned: { variant: 'warning', icon: <AlertCircle className="w-3 h-3" /> },
};

function AssemblyCard({
  assembly,
  index,
  canManage,
  onDelete,
  isPast = false,
}: {
  assembly: AssemblyListItem;
  index: number;
  canManage: boolean;
  onDelete: () => void;
  isPast?: boolean;
}) {
  const router = useRouter();
  const statusConfig = statusColors[assembly.status] || statusColors.draft;
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
        'group relative rounded-2xl bg-card border p-5 shadow-sm transition-all duration-300 cursor-pointer overflow-hidden',
        'hover:shadow-md hover:border-primary/30',
        isLive ? 'ring-2 ring-emerald-500/30 border-emerald-500/20 bg-emerald-500/[0.02]' : 'bg-gray-50/50',
        isPast && 'opacity-70 grayscale-[0.2]'
      )}
    >
      {/* Live Badge Top Right */}
      {isLive && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm animate-pulse">
          <Activity className="w-3 h-3" />
          <span>Live Τώρα</span>
        </div>
      )}

      {/* Past Badge Top Right (Subtle) */}
      {isPast && assembly.status === 'completed' && (
        <div className="absolute top-3 right-3">
          <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-none">
            Ολοκληρώθηκε
          </Badge>
        </div>
      )}

      {/* Delete button (if can manage and not live) */}
      {canManage && !isLive && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity rounded-full border border-gray-300 bg-white/80 text-gray-400 hover:text-destructive hover:border-destructive/60 px-2 py-1 text-[10px] shadow-sm"
          title="Διαγραφή συνέλευσης"
        >
          Διαγραφή
        </button>
      )}

      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 space-y-1.5">
          {/* Title row */}
          <div className="flex items-start gap-3">
            <div className={cn(
              'flex items-center justify-center w-10 h-10 rounded-xl shrink-0',
              isLive ? 'bg-emerald-500 text-white shadow-emerald-200 shadow-lg' :
              isPast ? 'bg-muted text-muted-foreground' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
            )}>
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className={cn(
                "text-base font-bold leading-tight group-hover:text-primary transition-colors",
                isPast && "text-muted-foreground"
              )}>
                {assembly.title}
              </h3>
              {/* Building name */}
              {assembly.building_name && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Building2 className="w-3 h-3" />
                  <span>{assembly.building_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {/* Status badge */}
        <Badge variant={statusConfig.variant} className="gap-1 px-2 py-0.5">
          {statusConfig.icon}
          {assembly.status_display}
        </Badge>

        {/* Date/Time */}
        <Badge variant="outline" className="gap-1 border-muted-foreground/10 bg-muted/30">
          <Calendar className="h-3 w-3" />
          {formatDate(assembly.scheduled_date)}
        </Badge>

        <Badge variant="outline" className="gap-1 border-muted-foreground/10 bg-muted/30">
          <Clock className="h-3 w-3" />
          {formatTime(assembly.scheduled_time)}
        </Badge>

        {/* Location type */}
        {assembly.is_physical && assembly.is_online && (
          <Badge variant="outline" className="gap-1 border-purple-200 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800">
            <Video className="h-3 w-3" />
            Υβριδική
          </Badge>
        )}
        {assembly.is_online && !assembly.is_physical && (
          <Badge variant="outline" className="gap-1 border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
            <Video className="h-3 w-3" />
            Online
          </Badge>
        )}

        {/* Pre-voting active */}
        {assembly.is_pre_voting_active && !isPast && (
          <Badge variant="warning" className="gap-1 animate-pulse">
            🗳️ Pre-voting ενεργό
          </Badge>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/40">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            <span>{assembly.agenda_items_count} θέματα</span>
          </div>

          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>{assembly.attendees_count} παρόντες</span>
          </div>
        </div>

        {/* Quorum indicator */}
        <div className={cn(
          'flex items-center gap-1.5 text-xs font-semibold',
          assembly.quorum_achieved ? 'text-emerald-600 dark:text-emerald-400' :
            assembly.quorum_status === 'close' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
        )}>
          <div className="flex flex-col items-end">
            <span
              className="text-[10px] text-muted-foreground uppercase font-normal"
              title="* Περιλαμβάνει παρόντες και όσους έχουν ψηφίσει (pre-voting/καταχωρημένες ψήφοι)."
            >
              Απαρτία*
            </span>
            <div className="flex items-center gap-1">
              <span>{(Number(assembly.quorum_percentage) || 0).toFixed(0)}%</span>
              {assembly.quorum_achieved && <CheckCircle className="w-3.5 h-3.5" />}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AssembliesPageContent() {
  const { currentBuilding, selectedBuilding, buildingContext, buildings, isLoading: buildingLoading } = useBuilding();
  const { isAuthReady, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deleteAssembly = useDeleteAssembly();

  const buildingId =
    selectedBuilding === null ? null : (selectedBuilding?.id ?? currentBuilding?.id ?? null);
  const canManage = hasInternalManagerAccess(user, buildingContext ?? selectedBuilding);

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
            <h1 className="page-title">📋 Γενικές Συνελεύσεις</h1>
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
        <h1 className="page-title">📋 Γενικές Συνελεύσεις</h1>
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
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl bg-card/60 backdrop-blur-sm p-5 shadow-sm ring-1 ring-border/20"
      >
        <div>
          <h1 className="page-title flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <Users className="w-5 h-5" />
            </span>
            <span>Γενικές Συνελεύσεις</span>
          </h1>
          <p className="text-muted-foreground mt-1 ml-13">
            Οργάνωση, διαχείριση και παρακολούθηση συνελεύσεων
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="flex items-center gap-2">
            <Link href="/help#assemblies--overview">
              <HelpCircle className="w-4 h-4" />
              Βοήθεια
            </Link>
          </Button>
          {canManage && (
            <Button asChild className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
              <Link href="/assemblies/new">
                <Plus className="w-4 h-4 mr-2" />
                Νέα Συνέλευση
              </Link>
            </Button>
          )}
        </div>
      </motion.div>

      <BuildingFilterIndicator className="mb-2" />

      {isSuccess && assemblies.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card/60 backdrop-blur-sm rounded-3xl p-12 text-center shadow-sm ring-1 ring-border/20"
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
        <div className="space-y-12">
          {/* Draft assemblies */}
          {draftAssemblies.length > 0 && canManage && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b">
                <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    Προσχέδια Συνελεύσεων
                  </h2>
                  <p className="text-sm text-muted-foreground">Συνελεύσεις που βρίσκονται υπό προετοιμασία</p>
                </div>
                <Badge variant="secondary" className="ml-2">
                  {draftAssemblies.length}
                </Badge>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    Προγραμματισμένες & Live
                  </h2>
                  <p className="text-sm text-muted-foreground">Τρέχουσες και μελλοντικές συνελεύσεις</p>
                </div>
                <Badge className="ml-2 bg-indigo-500 hover:bg-indigo-600">
                  {upcomingAssemblies.length}
                </Badge>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b">
                <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-muted-foreground">
                    Ιστορικό Συνελεύσεων
                  </h2>
                  <p className="text-sm text-muted-foreground">Ολοκληρωμένες, αναβληθείσες ή ακυρωμένες</p>
                </div>
                <Badge variant="outline" className="ml-2">
                  {pastAssemblies.length}
                </Badge>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {pastAssemblies.map((assembly, index) => (
                  <AssemblyCard
                    key={assembly.id}
                    assembly={assembly}
                    index={index}
                    canManage={canManage}
                    onDelete={() => handleDelete(assembly.id, assembly.title)}
                    isPast
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
