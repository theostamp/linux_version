'use client';

import { useParams } from 'next/navigation';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useVoteDetail } from '@/hooks/useVoteDetail';
import { useMyVote } from '@/hooks/useMyVote';
import { useVoteResults } from '@/hooks/useVoteResults';
import ErrorMessage from '@/components/ErrorMessage';
import VoteSubmitForm from '@/components/VoteSubmitForm';

export default function VoteDetailPage() {
  const { id } = useParams();
  const voteId = Number(id);
  const { currentBuilding } = useBuilding();

  const { data: vote, isLoading: loadingVote, error } = useVoteDetail(voteId);
  const { data: myVote, refetch: refetchMyVote } = useMyVote(voteId);
  const { data: results, refetch: refetchResults } = useVoteResults(voteId);

  if (error) return <ErrorMessage message="Αποτυχία φόρτωσης ψηφοφορίας." />;
  if (loadingVote || !vote) return <p className="p-6">Φόρτωση...</p>;

  if (!currentBuilding || vote.building !== currentBuilding.id) {
    return <ErrorMessage message="Η ψηφοφορία δεν ανήκει στο τρέχον κτήριο." />;
  }

  const today = new Date().toISOString().split('T')[0];
  const isActive = vote.start_date <= today && today <= vote.end_date;
  const hasVoted = !!myVote;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{vote.title}</h1>
      <p className="text-gray-700">{vote.description}</p>
      <div className="text-sm text-gray-500">
        Έναρξη: {vote.start_date} • Λήξη: {vote.end_date}
      </div>

      {!isActive && (
        <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded text-sm">
          ⚠️ Η ψηφοφορία δεν είναι ενεργή.
        </div>
      )}

      {hasVoted ? (
        <div className="bg-green-100 text-green-800 px-4 py-3 rounded text-sm">
          ✅ Η ψήφος σας: <strong>{myVote.choice}</strong>
        </div>
      ) : (
        isActive && (
          <VoteSubmitForm
            voteId={vote.id}
            choices={vote.choices}
            isActive={isActive}
            initialChoice={null}
            onSubmitted={async () => {
              await refetchMyVote();
              await refetchResults();
            }}
          />
        )
      )}

      {results && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">📊 Αποτελέσματα</h2>
          <div className="space-y-3">
          {vote.choices.map((c: string) => {
            const count = results.results[c] || 0;
            const percent = ((count / (results.total || 1)) * 100).toFixed(1);
            return (
              <div key={c} className="text-sm">
                <div className="flex justify-between">
                  <span>{c}</span>
                  <span>{count} ψήφοι ({percent}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded h-2 mt-1">
                  <div
                    className="h-2 bg-blue-600 rounded transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}

            <p className="text-xs text-gray-500">Σύνολο: {results.total} ψήφοι</p>
          </div>
        </div>
      )}
    </div>
  );
}
