'use client';

import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';

interface VoteResultsDisplayProps {
  results: {
    ΝΑΙ: number;
    ΟΧΙ: number;
    ΛΕΥΚΟ: number;
    [key: string]: number;
  };
  total: number;
  participationPercentage?: number;
  minParticipation?: number;
  isValid?: boolean;
  compact?: boolean;
  showChart?: boolean;
}

const VOTE_COLORS = {
  ΝΑΙ: {
    bg: 'bg-emerald-500',
    gradient: 'from-emerald-500 to-emerald-600',
    fill: '#10b981',
    light: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  ΟΧΙ: {
    bg: 'bg-rose-500',
    gradient: 'from-rose-500 to-rose-600',
    fill: '#f43f5e',
    light: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  ΛΕΥΚΟ: {
    bg: 'bg-slate-400',
    gradient: 'from-slate-400 to-slate-500',
    fill: '#94a3b8',
    light: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
  },
};

const CHOICE_LABELS = {
  ΝΑΙ: { emoji: '✅', label: 'Ναι' },
  ΟΧΙ: { emoji: '❌', label: 'Όχι' },
  ΛΕΥΚΟ: { emoji: '⬜', label: 'Λευκό' },
};

export default function VoteResultsDisplay({
  results,
  total,
  participationPercentage = 0,
  minParticipation = 0,
  isValid = true,
  compact = false,
  showChart = true,
}: VoteResultsDisplayProps) {
  const choices = ['ΝΑΙ', 'ΟΧΙ', 'ΛΕΥΚΟ'] as const;
  
  // Prepare chart data
  const chartData = choices.map((choice) => ({
    name: CHOICE_LABELS[choice].label,
    value: results[choice] || 0,
    color: VOTE_COLORS[choice].fill,
  })).filter(item => item.value > 0);

  // Calculate winner
  const maxVotes = Math.max(results.ΝΑΙ || 0, results.ΟΧΙ || 0, results.ΛΕΥΚΟ || 0);
  const winner = choices.find(c => (results[c] || 0) === maxVotes && maxVotes > 0);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percent = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-lg px-4 py-3 border border-gray-100">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-gray-600">
            {data.value} ψήφ{data.value === 1 ? 'ος' : 'οι'} ({percent}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {choices.map((choice, index) => {
          const count = results[choice] || 0;
          const percent = total > 0 ? (count / total) * 100 : 0;
          return (
            <motion.div
              key={choice}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-1"
            >
              <span className="text-xs">{CHOICE_LABELS[choice].emoji}</span>
              <span className={cn(
                'text-xs font-medium',
                VOTE_COLORS[choice].text
              )}>
                {percent.toFixed(0)}%
              </span>
            </motion.div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with validation status */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          📊 Αποτελέσματα Ψηφοφορίας
        </h3>
        {minParticipation > 0 && (
          <div className={cn(
            'px-3 py-1 rounded-full text-sm font-medium',
            isValid 
              ? 'bg-emerald-100 text-emerald-700' 
              : 'bg-amber-100 text-amber-700'
          )}>
            {isValid ? '✓ Έγκυρα αποτελέσματα' : `⚠ Απαιτείται ${minParticipation}% συμμετοχή`}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        {showChart && total > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      stroke="white"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-3xl font-bold text-gray-900"
                >
                  {total}
                </motion.div>
                <span className="text-sm text-gray-500">
                  ψήφ{total === 1 ? 'ος' : 'οι'}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Progress Bars */}
        <div className="space-y-4">
          {choices.map((choice, index) => {
            const count = results[choice] || 0;
            const percent = total > 0 ? (count / total) * 100 : 0;
            const isWinner = choice === winner && total > 0;
            const colors = VOTE_COLORS[choice];

            return (
              <motion.div
                key={choice}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.15, duration: 0.3 }}
                className={cn(
                  'rounded-xl p-4 transition-all duration-300',
                  colors.light,
                  colors.border,
                  'border',
                  isWinner && 'ring-2 ring-offset-2',
                  isWinner && choice === 'ΝΑΙ' && 'ring-emerald-400',
                  isWinner && choice === 'ΟΧΙ' && 'ring-rose-400',
                  isWinner && choice === 'ΛΕΥΚΟ' && 'ring-slate-400'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{CHOICE_LABELS[choice].emoji}</span>
                    <span className={cn('font-semibold', colors.text)}>
                      {CHOICE_LABELS[choice].label}
                    </span>
                    {isWinner && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium"
                      >
                        👑 Πλειοψηφία
                      </motion.span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={cn('text-lg font-bold', colors.text)}>
                      {percent.toFixed(1)}%
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({count} ψήφ{count === 1 ? 'ος' : 'οι'})
                    </span>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ 
                      duration: 0.8, 
                      delay: index * 0.15 + 0.2,
                      ease: 'easeOut'
                    }}
                    className={cn(
                      'h-full rounded-full bg-gradient-to-r',
                      colors.gradient
                    )}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Summary footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-100"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{total}</p>
            <p className="text-sm text-gray-500">Σύνολο ψήφων</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">{results.ΝΑΙ || 0}</p>
            <p className="text-sm text-gray-500">Υπέρ (Ναι)</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-rose-600">{results.ΟΧΙ || 0}</p>
            <p className="text-sm text-gray-500">Κατά (Όχι)</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-600">{results.ΛΕΥΚΟ || 0}</p>
            <p className="text-sm text-gray-500">Λευκό</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

