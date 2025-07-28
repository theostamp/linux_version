'use client';

import { useBuilding } from '@/components/contexts/BuildingContext';
import { useRequests } from '@/hooks/useRequests';
import ErrorMessage from '@/components/ErrorMessage';
import { useAuth } from '@/components/contexts/AuthContext';
import type { UserRequest } from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { deleteUserRequest } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useState } from 'react';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import RequestCard from '@/components/RequestCard';
import RequestSkeleton from '@/components/RequestSkeleton';
import { motion } from 'framer-motion';

export default function RequestsPage() {
  const { currentBuilding, selectedBuilding, isLoading: buildingLoading } = useBuilding();
  const { isAuthReady, user } = useAuth();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Χρησιμοποιούμε το selectedBuilding για φιλτράρισμα
  // Αν είναι null, σημαίνει "όλα τα κτίρια" και περνάμε null στο API
  const buildingId = selectedBuilding?.id ?? null;
  const canDelete = user?.is_superuser || user?.is_staff;
  const canCreateRequest = true; // Όλοι οι χρήστες μπορούν να δημιουργήσουν αιτήματα

  const {
    data: requests = [],
    isLoading,
    isError,
    isSuccess,
  } = useRequests(buildingId);

  if (!isAuthReady || buildingLoading || isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">📋 Αιτήματα</h1>
        <BuildingFilterIndicator className="mb-4" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <RequestSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">📋 Αιτήματα</h1>
        <BuildingFilterIndicator className="mb-4" />
        <ErrorMessage message="Αδυναμία φόρτωσης αιτημάτων." />
      </div>
    );
  }

  const handleDelete = async (request: UserRequest) => {
    if (!confirm(`Είστε σίγουροι ότι θέλετε να διαγράψετε το αίτημα "${request.title}";`)) {
      return;
    }
    
    setDeletingId(request.id);
    try {
      await deleteUserRequest(request.id);
      toast.success('Το αίτημα διαγράφηκε επιτυχώς');
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Σφάλμα κατά τη διαγραφή του αιτήματος');
    } finally {
      setDeletingId(null);
    }
  };

  const container = {
    hidden: { opacity: 1 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };
  const item = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📋 Αιτήματα</h1>
        {canCreateRequest && (
          <Link href="/requests/new">
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              ➕ Νέο Αίτημα
            </Button>
          </Link>
        )}
      </div>

      <BuildingFilterIndicator />

      {isSuccess && requests.length === 0 && (
        <div className="text-center text-gray-500 space-y-2">
          <p>Δεν υπάρχουν διαθέσιμα αιτήματα.</p>
          {canCreateRequest && (
            <p className="text-sm text-gray-400">
              Δημιουργήστε το πρώτο αίτημα για να ξεκινήσετε.
            </p>
          )}
        </div>
      )}

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {requests.map((request: UserRequest) => (
          <motion.div
            key={request.id}
            variants={item}
            className="p-4 border rounded-lg shadow-sm bg-white space-y-1 relative"
          >
            {/* Building badge - show only when viewing all buildings */}
            {!selectedBuilding && request.building_name && (
              <div className="absolute top-3 left-3 z-10">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-medium shadow-sm">
                  🏢 {request.building_name}
                </span>
              </div>
            )}
            
            {canDelete && (
              <button
                onClick={() => handleDelete(request)}
                disabled={deletingId === request.id}
                className="absolute top-3 right-3 p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors disabled:opacity-50 z-10"
                title="Διαγραφή αιτήματος"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <div className={`${!selectedBuilding && request.building_name ? 'pt-8' : ''}`}>
              <RequestCard request={request} />
            </div>
          </motion.div>
        ))}
      </motion.div>
      
      {/* Floating Action Button for mobile/better UX */}
      {canCreateRequest && (
        <Link 
          href="/requests/new"
          className="fixed bottom-6 right-6 bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
          title="Νέο Αίτημα"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      )}
    </div>
  );
}
