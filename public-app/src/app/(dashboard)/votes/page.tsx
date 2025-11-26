'use client';

import { useBuilding } from '@/components/contexts/BuildingContext';
import { useVotes } from '@/hooks/useVotes';
import VoteStatus from '@/components/VoteStatus';
import ErrorMessage from '@/components/ErrorMessage';
import { useAuth } from '@/components/contexts/AuthContext';
import type { Vote } from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { deleteVote } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';

function isActive(start: string, end: string) {
  const today = new Date().toISOString().split('T')[0];
  return start <= today && today <= end;
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
  const canDelete = user?.is_superuser || user?.is_staff;
  const canCreateVote = user?.is_superuser || user?.is_staff;

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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">🗳️ Ψηφοφορίες</h1>
        {canCreateVote && (
          <Link href="/votes/new">
            <Button>
              ➕ Νέα Ψηφοφορία
            </Button>
          </Link>
        )}
      </div>

      <BuildingFilterIndicator />

      {isSuccess && votes.length === 0 && (
        <div className="text-center text-gray-500 space-y-2">
          <p>Δεν υπάρχουν διαθέσιμες ψηφοφορίες.</p>
          {canCreateVote && (
            <p className="text-sm text-gray-400">
              Δημιουργήστε την πρώτη ψηφοφορία για να ξεκινήσετε.
            </p>
          )}
        </div>
      )}

      {votes.map((vote: Vote) => {
        const active = isActive(vote.start_date, vote.end_date);
        return (
          <div
            key={vote.id}
            className="p-4 border rounded-lg shadow-sm bg-white space-y-1 relative"
          >
            {/* Building badge - show only when viewing all buildings */}
            {!selectedBuilding && (vote as { building_name?: string }).building_name && (
              <div className="absolute top-3 left-3 z-10">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-medium shadow-sm">
                  🏢 {(vote as { building_name?: string }).building_name}
                </span>
              </div>
            )}
            
            {canDelete && (
              <button
                onClick={() => handleDelete(vote)}
                disabled={deletingId === vote.id}
                className="absolute top-3 right-3 p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors disabled:opacity-50 z-10"
                title="Διαγραφή ψηφοφορίας"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <div className={`${!selectedBuilding && (vote as { building_name?: string }).building_name ? 'pt-8' : ''}`}>
              <h2 className="text-2xl font-semibold tracking-tight text-gray-800 pr-10">{vote.title}</h2>
              <p className="text-sm text-gray-600">{vote.description}</p>
              <p className="text-xs text-gray-500">
                Έναρξη: {vote.start_date} • Λήξη: {vote.end_date}
              </p>

              <VoteStatus voteId={vote.id} isActive={active} />
            </div>
          </div>
        );
      })}
      
      {/* Floating Action Button for mobile/better UX */}
      {canCreateVote && (
        <Link 
          href="/votes/new"
          className="fixed bottom-6 right-6 bg-primary text-primary-foreground p-4 rounded-none shadow-lg transition-all duration-200 hover:scale-110"
          title="Νέα Ψηφοφορία"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
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

