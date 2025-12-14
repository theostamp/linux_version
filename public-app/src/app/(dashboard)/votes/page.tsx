'use client';

import { useBuilding } from '@/components/contexts/BuildingContext';
import { useVotes } from '@/hooks/useVotes';
import VoteStatus from '@/components/VoteStatus';
import ErrorMessage from '@/components/ErrorMessage';
import { useAuth } from '@/components/contexts/AuthContext';
import type { Vote, Building } from '@/lib/api';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  Vote as VoteIcon, 
  Calendar, 
  Clock, 
  Trash2, 
  Building2, 
  Zap,
  Users,
  ChevronRight 
} from 'lucide-react';
import { deleteVote } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { Button } from '@/components/ui/button';
import { hasOfficeAdminAccess, hasInternalManagerAccess } from '@/lib/roleUtils';
import { motion } from 'framer-motion';

interface VoteItemContentProps {
  readonly vote: Vote & { 
    building_name?: string | null;
    participation_percentage?: number;
    total_votes?: number;
    is_urgent?: boolean;
    days_remaining?: number | null;
  };
  readonly active: boolean;
  readonly selectedBuilding: Building | null;
  readonly canDelete: boolean;
  readonly deletingId: number | null;
  readonly handleDelete: (vote: Vote) => void | Promise<void>;
  readonly index: number;
}

const isValidDate = (value: string | null | undefined): boolean => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getFullYear() > 1970;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Ανοικτή';
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getFullYear() <= 1970) {
    return 'Ανοικτή';
  }
  return date.toLocaleDateString('el-GR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const isActive = (startDate: string, endDate: string | null | undefined): boolean => {
  const now = new Date();
  const start = new Date(startDate);
  
  if (Number.isNaN(start.getTime())) {
    return false;
  }
  
  // If no valid end date, consider it always active (after start)
  if (!isValidDate(endDate)) {
    return now >= start;
  }
  
  const end = new Date(endDate!);
  return now >= start && now <= end;
};

function VoteItemContent({
  vote,
  active,
  selectedBuilding,
  canDelete,
  deletingId,
  handleDelete,
  index,
}: VoteItemContentProps) {
  const buildingName = vote.building_name;
  const showBuildingBadge = !selectedBuilding && (buildingName || vote.building === null);
  const endSoon = active && vote.days_remaining !== null && vote.days_remaining !== undefined && vote.days_remaining <= 2;
  const participationPercentage = vote.participation_percentage || 0;
  const totalVotes = vote.total_votes || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        'group relative rounded-xl border bg-card p-5 shadow-sm transition-all duration-300',
        'hover:shadow-md hover:border-indigo-500/30',
        vote.is_urgent && 'border-destructive/30 bg-destructive/5'
      )}
    >
      {/* Urgent indicator */}
      {vote.is_urgent && (
        <div className="absolute -top-1 -right-1">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs shadow-lg">
            <Zap className="h-3 w-3" />
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 space-y-2">
          {/* Title row */}
          <div className="flex flex-wrap items-center gap-2">
            <div className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg',
              active ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-muted text-muted-foreground'
            )}>
              <VoteIcon className="h-4 w-4" />
            </div>
            <h3 className="text-base font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
              {vote.title}
            </h3>
          </div>

          {/* Description */}
          {vote.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 ml-10">
              {vote.description}
            </p>
          )}
        </div>

        {/* Delete button */}
        {canDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDelete(vote);
            }}
            disabled={deletingId === vote.id}
            className={cn(
              'rounded-lg border border-transparent bg-muted/50 p-2 text-muted-foreground transition-all',
              'hover:bg-destructive/10 hover:border-destructive/20 hover:text-destructive',
              'opacity-0 group-hover:opacity-100',
              deletingId === vote.id && 'opacity-60 cursor-not-allowed'
            )}
            title="Διαγραφή ψηφοφορίας"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {showBuildingBadge && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            {buildingName || 'Όλα τα κτίρια'}
          </span>
        )}
        
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {formatDate(vote.start_date)} – {formatDate(vote.end_date)}
        </span>

        <span className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
          active 
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
            : 'bg-muted text-muted-foreground'
        )}>
          {active ? '✓ Ενεργή' : 'Ολοκληρώθηκε'}
        </span>

        {endSoon && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-600 dark:text-amber-400 font-medium animate-pulse">
            <Clock className="h-3 w-3" />
            Λήγει σύντομα
          </span>
        )}

        {participationPercentage > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs text-blue-600 dark:text-blue-400">
            <Users className="h-3 w-3" />
            {participationPercentage.toFixed(0)}% συμμετοχή
          </span>
        )}

        {totalVotes > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-1 text-xs text-purple-600 dark:text-purple-400">
            {totalVotes} ψήφ{totalVotes === 1 ? 'ος' : 'οι'}
          </span>
        )}
      </div>

      {/* Vote status with mini results */}
      <VoteStatus voteId={vote.id} isActive={active} />
    </motion.div>
  );
}

function VotesPageContent() {
  const { currentBuilding, selectedBuilding, setSelectedBuilding, buildings, isLoading: buildingLoading } = useBuilding();
  const { isAuthReady, user } = useAuth();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isUpdatingFromUrl = useRef(false);
  const isUpdatingUrl = useRef(false);

  // URL sync logic
  useEffect(() => {
    if (isUpdatingUrl.current) return;
    
    const buildingParam = searchParams.get('building');
    if (buildingParam) {
      const buildingIdFromUrl = parseInt(buildingParam, 10);
      if (!isNaN(buildingIdFromUrl) && buildings.length > 0) {
        const buildingFromUrl = buildings.find(b => b.id === buildingIdFromUrl);
        if (buildingFromUrl && (!selectedBuilding || selectedBuilding.id !== buildingIdFromUrl)) {
          isUpdatingFromUrl.current = true;
          setSelectedBuilding(buildingFromUrl);
          setTimeout(() => { isUpdatingFromUrl.current = false; }, 100);
        }
      }
    }
  }, [searchParams, buildings, selectedBuilding, currentBuilding, setSelectedBuilding]);

  useEffect(() => {
    if (isUpdatingFromUrl.current) return;
    
    const buildingParam = searchParams.get('building');
    const expectedBuildingId = selectedBuilding?.id?.toString() || null;
    
    if (selectedBuilding && selectedBuilding.id !== currentBuilding?.id) {
      if (buildingParam !== expectedBuildingId) {
        isUpdatingUrl.current = true;
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.set('building', selectedBuilding.id.toString());
        const newUrl = `/votes?${newSearchParams.toString()}`;
        router.replace(newUrl, { scroll: false });
        setTimeout(() => { isUpdatingUrl.current = false; }, 100);
      }
    } else if (buildingParam) {
      isUpdatingUrl.current = true;
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('building');
      const newUrl = newSearchParams.toString() 
        ? `/votes?${newSearchParams.toString()}`
        : '/votes';
      router.replace(newUrl, { scroll: false });
      setTimeout(() => { isUpdatingUrl.current = false; }, 100);
    }
  }, [selectedBuilding, currentBuilding, searchParams, router]);

  // IMPORTANT:
  // - selectedBuilding === null means "All buildings" (or "All my properties" for residents)
  // - selectedBuilding (object) means an explicit building filter
  // - only if no explicit selection exists, fall back to currentBuilding
  const buildingId =
    selectedBuilding === null ? null : (selectedBuilding?.id ?? currentBuilding?.id ?? null);
  const canDelete = hasOfficeAdminAccess(user);
  const canCreateVote = hasInternalManagerAccess(user);

  const {
    data: votesData = [],
    isLoading,
    isError,
    isSuccess,
  } = useVotes(buildingId);

  // Deduplication
  const votes = votesData.filter((vote, index, self) => 
    index === self.findIndex((v) => v.id === vote.id)
  );

  // Separate active and past votes
  const activeVotes = votes.filter(v => isActive(v.start_date, v.end_date));
  const pastVotes = votes.filter(v => !isActive(v.start_date, v.end_date));

  if (!isAuthReady || buildingLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">🗳️ Ψηφοφορίες</h1>
            <p className="text-muted-foreground mt-1">Συμμετοχή στη λήψη αποφάσεων</p>
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">🗳️ Ψηφοφορίες</h1>
        <BuildingFilterIndicator className="mb-4" />
        <ErrorMessage message="Αδυναμία φόρτωσης ψηφοφοριών." />
      </div>
    );
  }

  const handleDelete = async (vote: Vote) => {
    const isGlobal = (vote as { building_name?: string }).building_name === "Όλα τα κτίρια";
    const confirmMessage = isGlobal 
      ? `Είστε σίγουροι ότι θέλετε να διαγράψετε την ΚΑΘΟΛΙΚΗ ψηφοφορία "${vote.title}" από όλα τα κτίρια;`
      : `Είστε σίγουροι ότι θέλετε να διαγράψετε τη ψηφοφορία "${vote.title}";`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    setDeletingId(vote.id);
    try {
      const message = await deleteVote(vote.id);
      toast.success(message);
      // ✅ Invalidate όλα τα votes queries (με prefix matching)
      await queryClient.invalidateQueries({ queryKey: ['votes'], exact: false });
      // ✅ Refetch το συγκεκριμένο query για το τρέχον buildingId
      if (buildingId) {
        await queryClient.refetchQueries({ queryKey: ['votes', buildingId] });
      } else {
        // Αν δεν υπάρχει buildingId, refetch όλα
        await queryClient.refetchQueries({ queryKey: ['votes'], exact: false });
      }
    } catch (err) {
      console.error('Error deleting vote:', err);
      toast.error('Σφάλμα κατά τη διαγραφή της ψηφοφορίας');
    } finally {
      setDeletingId(null);
    }
  };

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
              <VoteIcon className="w-5 h-5" />
            </span>
            Ψηφοφορίες
          </h1>
          <p className="text-muted-foreground mt-1 ml-13">
            Συμμετοχή στη λήψη αποφάσεων της πολυκατοικίας
          </p>
        </div>
        {canCreateVote && (
          <Button asChild className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
            <Link href="/votes/new">
              <Plus className="w-4 h-4 mr-2" />
              Νέα Ψηφοφορία
            </Link>
          </Button>
        )}
      </motion.div>

      <BuildingFilterIndicator className="mb-2" />

      {isSuccess && votes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-2xl border-2 border-dashed border-border p-12 text-center"
        >
          <div className="w-20 h-20 bg-muted rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6">
            <VoteIcon className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Δεν υπάρχουν ψηφοφορίες
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Οι ψηφοφορίες σας βοηθούν να πάρετε αποφάσεις μαζί με τους υπόλοιπους ενοίκους.
          </p>
          {canCreateVote && (
            <Button asChild size="lg" className="bg-gradient-to-r from-indigo-500 to-purple-600">
              <Link href="/votes/new">
                <Plus className="w-5 h-5 mr-2" />
                Δημιουργία πρώτης ψηφοφορίας
              </Link>
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-8">
          {/* Active votes section */}
          {activeVotes.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-lg font-semibold text-foreground">
                  Ενεργές Ψηφοφορίες ({activeVotes.length})
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeVotes.map((vote, index) => (
                  <VoteItemContent
                key={vote.id}
                    vote={vote as VoteItemContentProps['vote']}
                    active={true}
                    selectedBuilding={selectedBuilding}
                    canDelete={!!canDelete}
                    deletingId={deletingId}
                    handleDelete={handleDelete}
                    index={index}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past votes section */}
          {pastVotes.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                <h2 className="text-lg font-semibold text-muted-foreground">
                  Ολοκληρωμένες Ψηφοφορίες ({pastVotes.length})
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pastVotes.map((vote, index) => (
                  <VoteItemContent 
                    key={vote.id}
                    vote={vote as VoteItemContentProps['vote']}
                    active={false}
                    selectedBuilding={selectedBuilding}
                    canDelete={!!canDelete}
                    deletingId={deletingId}
                    handleDelete={handleDelete}
                    index={index}
              />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Floating Action Button for mobile */}
      {canCreateVote && (
        <Link 
          href="/votes/new"
          className="md:hidden fixed bottom-6 right-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110 z-50"
          title="Νέα Ψηφοφορία"
        >
          <Plus className="w-6 h-6" />
        </Link>
      )}
    </div>
  );
}

export default function VotesPage() {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <VotesPageContent />
      </SubscriptionGate>
    </AuthGate>
  );
}
