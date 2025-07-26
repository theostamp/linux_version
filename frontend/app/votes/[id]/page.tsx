'use client';

import { useParams, useRouter } from 'next/navigation';
import { useBuilding } from '@/components/contexts/BuildingContext';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import { useVoteDetail } from '@/hooks/useVoteDetail';
import { useMyVote } from '@/hooks/useMyVote';
import { useVoteResults } from '@/hooks/useVoteResults';
import ErrorMessage from '@/components/ErrorMessage';
import VoteSubmitForm from '@/components/VoteSubmitForm';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { deleteVote } from '@/lib/api';
import { useAuth } from '@/components/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { useState } from 'react';

export default function VoteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const voteId = Number(id);
  const { currentBuilding, buildings } = useBuilding();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: vote, isLoading: loadingVote, error } = useVoteDetail(voteId);
  const { data: myVote, refetch: refetchMyVote } = useMyVote(voteId);
  const { data: results, refetch: refetchResults } = useVoteResults(voteId);

  const canDelete = user?.is_superuser || user?.is_staff;

  const handleDelete = async () => {
    if (!vote) return;
    
    const isGlobal = vote.building_name === "Όλα τα κτίρια";
    const confirmMessage = isGlobal 
      ? `Είστε σίγουροι ότι θέλετε να διαγράψετε την ΚΑΘΟΛΙΚΗ ψηφοφορία "${vote.title}" από όλα τα κτίρια;`
      : `Είστε σίγουροι ότι θέλετε να διαγράψετε τη ψηφοφορία "${vote.title}";`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const message = await deleteVote(vote.id);
      toast.success(message);
      router.push('/votes');
    } catch (error) {
      console.error('Error deleting vote:', error);
      toast.error('Σφάλμα κατά τη διαγραφή της ψηφοφορίας');
      setIsDeleting(false);
    }
  };

  if (error) return <ErrorMessage message="Αποτυχία φόρτωσης ψηφοφορίας." />;
  if (loadingVote || !vote) return <p className="p-6">Φόρτωση...</p>;

  // Check if user has access to this vote
  // Staff users can access votes from any building they manage
  // Regular users can only access votes from their current building
  const hasAccessToVote = () => {
    if (!currentBuilding) return false;
    
    // Global votes (building is null) are accessible to all authenticated users
    if (vote.building === null) {
      return true;
    }
    
    // Staff users can access votes from any building they manage
    if (user?.is_staff || user?.is_superuser) {
      return buildings.some(building => building.id === vote.building);
    }
    
    // Regular users can only access votes from their current building
    return vote.building === currentBuilding.id;
  };

  if (!hasAccessToVote()) {
    return <ErrorMessage message="Δεν έχετε δικαίωμα πρόσβασης σε αυτή την ψηφοφορία." />;
  }

  const today = new Date().toISOString().split('T')[0];
  const isActive = vote.start_date <= today && today <= vote.end_date;
  const hasVoted = !!myVote;

  // Format dates for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('el-GR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleDateString('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Determine actual status
  const getStatusInfo = () => {
    if (!vote.is_active) {
      return {
        icon: '🔴',
        status: 'Ανενεργή',
        canVote: false,
        message: 'Η ψηφοφορία είναι ανενεργή'
      };
    }
    
    if (!isActive) {
      return {
        icon: '⏳',
        status: vote.start_date > today ? 'Δεν έχει ξεκινήσει' : 'Έχει λήξει',
        canVote: false,
        message: vote.start_date > today ? 
          'Η ψηφοφορία δεν έχει ξεκινήσει ακόμα' : 
          'Η ψηφοφορία έχει λήξει'
      };
    }

    return {
      icon: '🟢',
      status: 'Ενεργή',
      canVote: true,
      message: hasVoted ? 'Έχετε ήδη ψηφίσει' : 'Μπορείτε να ψηφίσετε'
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Navigation */}
      <Link href="/votes">
        <Button variant="secondary">⬅ Επιστροφή στις Ψηφοφορίες</Button>
      </Link>

      {/* Vote Information Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{vote.title}</h1>
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {vote.status_display}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {vote.is_urgent && (
              <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                🚨 Επείγουσα
              </div>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                title="Διαγραφή ψηφοφορίας"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <p className="text-gray-700 text-lg mb-6">{vote.description}</p>

        {/* Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Creator Info */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">👤</span>
              <h3 className="font-semibold text-gray-900">Δημιουργός</h3>
            </div>
            <p className="text-gray-700">{vote.creator_name}</p>
            <p className="text-xs text-gray-500">
              Δημιουργήθηκε: {formatDateTime(vote.created_at)}
            </p>
          </div>

          {/* Building Info */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">🏢</span>
              <h3 className="font-semibold text-gray-900">Κτίριο</h3>
            </div>
            <p className="text-gray-700">{vote.building_name}</p>
            <p className="text-xs text-gray-500">ID: {vote.building}</p>
          </div>

          {/* Duration Info */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">📅</span>
              <h3 className="font-semibold text-gray-900">Διάρκεια</h3>
            </div>
            <p className="text-gray-700">
              {formatDate(vote.start_date)} - {formatDate(vote.end_date)}
            </p>
            {vote.days_remaining !== null && (
              <p className="text-xs text-gray-500">
                {vote.days_remaining > 0 
                  ? `${vote.days_remaining} ημέρες απομένουν` 
                  : 'Έχει λήξει'
                }
              </p>
            )}
          </div>

          {/* Participation Stats */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">📊</span>
              <h3 className="font-semibold text-gray-900">Συμμετοχή</h3>
            </div>
            <p className="text-gray-700">{vote.total_votes} ψήφοι</p>
            <p className="text-xs text-gray-500">
              {vote.participation_percentage}% συμμετοχή
            </p>
          </div>

          {/* Requirements */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">🎯</span>
              <h3 className="font-semibold text-gray-900">Απαιτήσεις</h3>
            </div>
            <p className="text-gray-700">Ελάχιστη συμμετοχή: {vote.min_participation}%</p>
            <p className="text-xs text-gray-500">
              {vote.participation_percentage >= vote.min_participation 
                ? '✅ Έγκυρα αποτελέσματα' 
                : '❌ Ανεπαρκής συμμετοχή'
              }
            </p>
          </div>

          {/* Status */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">⚡</span>
              <h3 className="font-semibold text-gray-900">Κατάσταση</h3>
            </div>
            <p className="text-gray-700">
              {statusInfo.icon} {statusInfo.status}
            </p>
            <p className="text-xs text-gray-500">
              {statusInfo.message}
            </p>
          </div>
        </div>
      </div>

      {/* Status Alerts */}
      {!statusInfo.canVote && !hasVoted && (
        <div className="bg-yellow-100 text-yellow-800 px-4 py-3 rounded-lg border border-yellow-200">
          <div className="flex items-center space-x-2">
            <span>⚠️</span>
            <span className="font-medium">{statusInfo.message}</span>
          </div>
        </div>
      )}

      {/* Voting Section */}
      {hasVoted ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-green-600 text-xl">✅</span>
            <h3 className="font-semibold text-green-800">Η ψήφος σας καταχωρήθηκε</h3>
          </div>
          <p className="text-green-700">
            Ψηφίσατε: <strong className="font-bold">{myVote.choice}</strong>
          </p>
          {myVote.submitted_at && (
            <p className="text-xs text-green-600 mt-1">
              Καταχωρήθηκε: {formatDateTime(myVote.submitted_at)}
            </p>
          )}
        </div>
      ) : (
        statusInfo.canVote && vote.choices && (
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">🗳️ Υποβολή Ψήφου</h2>
            <VoteSubmitForm
              voteId={vote.id}
              choices={vote.choices}
              isActive={true}
              initialChoice={null}
              onSubmitted={async () => {
                await refetchMyVote();
                await refetchResults();
              }}
            />
          </div>
        )
      )}

      {/* Results Section */}
      {results && vote.choices && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">📊 Αποτελέσματα Ψηφοφορίας</h2>
          <div className="space-y-4">
            {vote.choices.map((choice: string) => {
              const count = results.results[choice] || 0;
              const percent = ((count / (results.total || 1)) * 100).toFixed(1);
              return (
                <div key={choice} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{choice}</span>
                    <span className="text-sm text-gray-600">
                      {count} ψήφοι ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}

            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Σύνολο ψήφων: {results.total}</span>
                <span>Συμμετοχή: {vote.participation_percentage}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
