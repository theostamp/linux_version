'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface VoteMiniResultsProps {
  results?: {
    ΝΑΙ: number;
    ΟΧΙ: number;
    ΛΕΥΚΟ: number;
    [key: string]: number;
  };
  total: number;
  participationPercentage?: number;
}

const COLORS = {
  ΝΑΙ: { fill: '#00BC7D', label: 'Ναι' },       // primary teal
  ΟΧΙ: { fill: '#e11d48', label: 'Όχι' },       // danger rose
  ΛΕΥΚΟ: { fill: '#9aa5bf', label: 'Λευκό' },   // muted navy gray
};

export default function VoteMiniResults({
  results,
  total,
  participationPercentage = 0,
}: VoteMiniResultsProps) {
  if (!results || total === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span>📊</span>
        <span>Καμία ψήφος</span>
      </div>
    );
  }

  const choices = ['ΝΑΙ', 'ΟΧΙ', 'ΛΕΥΚΟ'] as const;

  // Calculate percentages
  const percentages = choices.map(choice => ({
    choice,
    count: results[choice] || 0,
    percent: total > 0 ? ((results[choice] || 0) / total) * 100 : 0,
    ...COLORS[choice]
  }));

  // Find winner
  const winner = percentages.reduce((prev, current) =>
    (current.count > prev.count) ? current : prev
  );

  return (
    <div className="space-y-2">
      {/* Mini bar chart */}
      <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
        {percentages.map((item, index) => (
          item.percent > 0 && (
            <motion.div
              key={item.choice}
              initial={{ width: 0 }}
              animate={{ width: `${item.percent}%` }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              style={{ backgroundColor: item.fill }}
              className="h-full first:rounded-l-full last:rounded-r-full"
            />
          )
        ))}
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          {percentages.map((item) => (
            item.count > 0 && (
              <span
                key={item.choice}
                className="flex items-center gap-1"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <span className={cn(
                  'font-medium',
                  item.choice === winner.choice && total > 0 && 'font-bold'
                )}>
                  {item.percent.toFixed(0)}%
                </span>
              </span>
            )
          ))}
        </div>

        <div className="flex items-center gap-2 text-gray-500">
          <span>{total} ψήφ{total === 1 ? 'ος' : 'οι'}</span>
          {participationPercentage > 0 && (
            <>
              <span>•</span>
              <span>{participationPercentage.toFixed(0)}% συμμετοχή</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
