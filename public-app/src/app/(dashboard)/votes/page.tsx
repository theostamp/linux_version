'use client';

import { useBuilding } from '@/components/contexts/BuildingContext';
import { useVotes } from '@/hooks/useVotes';
import VoteStatus from '@/components/VoteStatus';
import ErrorMessage from '@/components/ErrorMessage';
import { useAuth } from '@/components/contexts/AuthContext';
import type { Vote, Building } from '@/lib/api';
import Link from 'next/link';
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';
import { cn } from '@/lib/utils';
import { Plus, Vote as VoteIcon, Calendar, Clock, Trash2, Building2 } from 'lucide-react';
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

interface VoteItemContentProps {
  readonly vote: Vote;
  readonly active: boolean;
  readonly selectedBuilding: Building | null;
  readonly canDelete: boolean;
  readonly deletingId: number | null;
  readonly handleDelete: (vote: Vote) => void | Promise<void>;
}

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString('el-GR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

function VoteItemContent({
  vote,
  active,
  selectedBuilding,
  canDelete,
  deletingId,
  handleDelete,
}: VoteItemContentProps) {
  const buildingName = (vote as { building_name?: string | null }).building_name;
  const showBuildingBadge = !selectedBuilding && (buildingName || vote.building === null);
  const endSoon = active && new Date(vote.end_date).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 2;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/40 bg-background p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <VoteIcon className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground leading-tight">
              {vote.title}
            </h3>
            {showBuildingBadge && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                {buildingName || 'Όλα τα κτίρια'}
              </span>
            )}
            {endSoon && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-700">
                <Clock className="h-3 w-3" /> Λήγει σύντομα
              </span>
            )}
          </div>
          {vote.description && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {vote.description}
            </p>
          )}
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={() => handleDelete(vote)}
            disabled={deletingId === vote.id}
            className={cn(
              'rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700',
              deletingId === vote.id && 'opacity-60 cursor-not-allowed'
            )}
            title="Διαγραφή ψηφοφορίας"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDate(vote.start_date)} – {formatDate(vote.end_date)}
        </span>
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5', active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
          {active ? 'Ενεργή' : 'Μη ενεργή'}
        </span>
        {vote.participation_percentage !== undefined && vote.participation_percentage !== null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
            Συμμετοχή: {vote.participation_percentage.toFixed(1)}%
          </span>
        )}
      </div>

      <VoteStatus voteId={vote.id} isActive={active} />
    </div>
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

  // Συγχρονισμός URL parameter με BuildingContext (URL -> Context)
  useEffect(() => {
    if (isUpdatingUrl.current) return; // Skip αν ενημερώνουμε το URL
    
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
    } else if (selectedBuilding && selectedBuilding.id !== currentBuilding?.id) {
      // Αν δεν υπάρχει URL parameter αλλά υπάρχει selectedBuilding διαφορετικό από currentBuilding
      // Δεν το καθαρίζουμε αυτόματα - αφήνουμε το user να το κάνει μέσω του selector
    }
  }, [searchParams, buildings, selectedBuilding, currentBuilding, setSelectedBuilding]);

  // Ενημέρωση URL όταν αλλάζει το selectedBuilding (Context -> URL)
  useEffect(() => {
    if (isUpdatingFromUrl.current) return; // Skip αν ενημερώνουμε από το URL
    
    const buildingParam = searchParams.get('building');
    const expectedBuildingId = selectedBuilding?.id?.toString() || null;
    
    // Ενημερώνουμε το URL μόνο αν το selectedBuilding είναι διαφορετικό από το currentBuilding
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
      // Αν το selectedBuilding είναι null ή ίδιο με currentBuilding, καθαρίζουμε το URL parameter
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

  const buildingId = currentBuilding?.id ?? selectedBuilding?.id ?? null;
  const canDelete = hasOfficeAdminAccess(user);
  // Internal managers μπορούν να δημιουργούν ψηφοφορίες
  const canCreateVote = hasInternalManagerAccess(user);

  const {
    data: votesData = [],
    isLoading,
    isError,
    isSuccess,
  } = useVotes(buildingId);

  // Αποφυγή διπλότυπων εμφανίσεων - deduplication με βάση το vote.id
  const votes = votesData.filter((vote, index, self) => 
    index === self.findIndex((v) => v.id === vote.id)
  );

  if (!isAuthReady || buildingLoading || isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">🗳️ Ψηφοφορίες</h1>
        <BuildingFilterIndicator className="mb-4" />
        <p>Φόρτωση ψηφοφοριών...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">🗳️ Ψηφοφορίες</h1>
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
      // ✅ Invalidate AND explicitly refetch for immediate UI update
      await queryClient.invalidateQueries({ queryKey: ['votes'] });
      await queryClient.refetchQueries({ queryKey: ['votes'] });
    } catch (error) {
      console.error('Error deleting vote:', error);
      toast.error('Σφάλμα κατά τη διαγραφή της ψηφοφορίας');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-condensed">🗳️ Ψηφοφορίες</h1>
          <p className="text-muted-foreground mt-1">Συμμετοχή στη λήψη αποφάσεων</p>
        </div>
        {canCreateVote && (
          <Button asChild size="sm">
            <Link href="/votes/new">
              <Plus className="w-4 h-4 mr-2" />
              Νέα Ψηφοφορία
            </Link>
          </Button>
        )}
      </div>

      <BuildingFilterIndicator className="mb-2" />

      {isSuccess && votes.length === 0 ? (
        <div className="bg-card rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <VoteIcon className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="font-medium mb-4">Δεν υπάρχουν διαθέσιμες ψηφοφορίες.</p>
          {canCreateVote && (
            <Button asChild>
              <Link href="/votes/new">Δημιουργία πρώτης ψηφοφορίας</Link>
            </Button>
          )}
        </div>
      ) : (
        <BentoGrid className="max-w-[1920px] auto-rows-auto gap-4">
          {votes.map((vote: Vote) => {
            const active = isActive(vote.start_date, vote.end_date);
            return (
              <BentoGridItem
                key={vote.id}
                className="md:col-span-1"
                header={
                  <VoteItemContent 
                    vote={vote} 
                    active={active} 
                    selectedBuilding={selectedBuilding}
                    canDelete={!!canDelete}
                    deletingId={deletingId}
                    handleDelete={handleDelete}
                  />
                }
              />
            );
          })}
        </BentoGrid>
      )}
      
      {/* Floating Action Button for mobile */}
      {canCreateVote && (
        <Link 
          href="/votes/new"
          className="md:hidden fixed bottom-6 right-6 bg-primary text-primary-foreground p-4 rounded-full shadow-lg transition-transform hover:scale-110 z-50"
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

