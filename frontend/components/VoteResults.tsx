interface VoteResultsProps {
  results: {
    ΝΑΙ: number;
    ΟΧΙ: number;
    ΛΕΥΚΟ: number;
    total: number;
  };
}

export default function VoteResults({ results }: VoteResultsProps) {
  const { ΝΑΙ, ΟΧΙ, ΛΕΥΚΟ, total } = results;

  const getPercent = (count: number) => {
    return total > 0 ? Math.round((count / total) * 100) : 0;
  };

  const renderBar = (label: string, count: number, color: string) => (
    <div key={label} className="mb-2">
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span>{getPercent(count)}% ({count})</span>
      </div>
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${getPercent(count)}%` }}
        ></div>
      </div>
    </div>
  );

  return (
    <div className="mt-4">
      <h3 className="text-md font-semibold mb-2 text-gray-800 dark:text-gray-200">Αποτελέσματα:</h3>
      {renderBar('✅ ΝΑΙ', ΝΑΙ, 'bg-green-500')}
      {renderBar('❌ ΟΧΙ', ΟΧΙ, 'bg-red-500')}
      {renderBar('⚪ ΛΕΥΚΟ', ΛΕΥΚΟ, 'bg-gray-500')}
      <div className="text-xs text-gray-500 mt-2">Σύνολο ψήφων: {total}</div>
    </div>
  );
}
