
// ✅ frontend/components/VoteResults.tsx
'use client';

import { useVoteResults } from '@/hooks/useVoteResults';

interface Props {
  readonly voteId: number;
}

export default function VoteResults({ voteId }: Props) {
  const { data, isLoading, isError } = useVoteResults(voteId);

  if (isLoading) return <p>Φόρτωση αποτελεσμάτων...</p>;
  if (isError || !data) return <p>Σφάλμα κατά τη φόρτωση.</p>;

  const { results, total } = data;

  const getPercent = (count: number) =>
    total > 0 ? Math.round((count / total) * 100) : 0;

  const getColor = (label: string) => {
    if (label === 'ΝΑΙ') return 'bg-green-500';
    if (label === 'ΟΧΙ') return 'bg-red-500';
    if (label === 'ΛΕΥΚΟ') return 'bg-gray-500';
    return 'bg-blue-500';
  };

  return (
    <div className="mt-4">
      <h3 className="text-md font-semibold mb-2 text-gray-800 dark:text-gray-200">Αποτελέσματα:</h3>
      {Object.entries(results).map(([label, count]) => {
        const countNum = count;
        return (
          <div key={label} className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span>{label}</span>
              <span>{getPercent(countNum)}% ({countNum})</span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${getColor(label)}`}
                style={{ width: `${getPercent(countNum)}%` }}
              ></div>
            </div>
          </div>
        );
      })}
      <div className="text-xs text-gray-500 mt-2">Σύνολο ψήφων: {total}</div>
    </div>
  );
}
