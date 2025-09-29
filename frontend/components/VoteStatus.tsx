'use client';

import Link from 'next/link';
import { useMyVote } from '@/hooks/useMyVote';

interface Props {
  readonly voteId: number;
  readonly isActive: boolean;
}

export default function VoteStatus({ voteId, isActive }: Props) {
  const { data, isLoading } = useMyVote(voteId);

  if (isLoading) return <p className="text-sm text-gray-500">Έλεγχος ψήφου…</p>;

  let statusElement;
  if (data) {
    statusElement = (
      <span className="text-green-600 text-sm">
        ✅ Έχετε ήδη ψηφίσει: <strong>{data.choice}</strong>
      </span>
    );
  } else if (isActive) {
    statusElement = (
      <span className="text-blue-600 text-sm">🔔 Δεν έχετε ψηφίσει ακόμη</span>
    );
  } else {
    statusElement = (
      <span className="text-gray-500 text-sm">Η ψηφοφορία έχει λήξει</span>
    );
  }

  return (
    <div className="mt-2 flex items-center justify-between">
      {statusElement}

      <Link
        href={`/votes/${voteId}`}
        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
      >
        {data || !isActive ? 'Προβολή' : 'Ψήφισε'}
      </Link>
    </div>
  );
}
