'use client';

import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import { Smartphone, Mail, Monitor, Users, UserCheck } from 'lucide-react';

interface BySource {
  electronic?: number;
  physical?: number;
  proxy?: number;
}

interface SourceDetails {
  app?: number;
  email?: number;
  pre_vote?: number;
  live?: number;
  proxy?: number;
}

interface VoteResultsDisplayProps {
  results: {
    ΝΑΙ: number;
    ΟΧΙ: number;
    ΛΕΥΚΟ: number;
    by_source?: BySource;
    source_details?: SourceDetails;
    [key: string]: number | BySource | SourceDetails | undefined;
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
    bg: 'bg-[#00BC7D]',
    gradient: 'from-[#00BC7D] to-[#009A6B]',
    fill: '#00BC7D',
    light: 'bg-[#E6FFF5]',
    text: 'text-[#0B1225]',
    border: 'border-[#c0ffe6]',
  },
  ΟΧΙ: {
    bg: 'bg-[#e11d48]',
    gradient: 'from-[#e11d48] to-[#be123c]',
    fill: '#e11d48',
    light: 'bg-[#ffe4e6]',
    text: 'text-[#7f102c]',
    border: 'border-[#fecdd3]',
  },
  ΛΕΥΚΟ: {
    bg: 'bg-[#9aa5bf]',
    gradient: 'from-[#9aa5bf] to-[#7884a0]',
    fill: '#9aa5bf',
    light: 'bg-[#f5f6f9]',
    text: 'text-[#0B1225]',
    border: 'border-[#d6dce8]',
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
                  isWinner && choice === 'ΝΑΙ' && 'ring-[#52F5BE]',
                  isWinner && choice === 'ΟΧΙ' && 'ring-[#f9a8b1]',
                  isWinner && choice === 'ΛΕΥΚΟ' && 'ring-[#c1c9da]'
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
                <div className="h-3 bg-[#d6dce8] rounded-full overflow-hidden">
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
        className="bg-gradient-to-r from-[#f5f6f9] to-[#e8ebf2] rounded-xl p-4 border border-[#d6dce8]"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{total}</p>
            <p className="text-sm text-gray-500">Σύνολο ψήφων</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#00BC7D]">{results.ΝΑΙ || 0}</p>
            <p className="text-sm text-gray-500">Υπέρ (Ναι)</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-rose-600">{results.ΟΧΙ || 0}</p>
            <p className="text-sm text-gray-500">Κατά (Όχι)</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#3e4a68]">{results.ΛΕΥΚΟ || 0}</p>
            <p className="text-sm text-gray-500">Λευκό</p>
          </div>
        </div>
      </motion.div>

      {/* Breakdown by voting method */}
      {results.by_source && total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-xl p-4 border border-gray-200"
        >
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Τρόπος Ψηφοφορίας
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Electronic votes */}
            {((results.by_source as BySource).electronic ?? 0) > 0 && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-700">
                    {(results.by_source as BySource).electronic}
                  </p>
                  <p className="text-xs text-blue-600">Ηλεκτρονικά</p>
                </div>
              </div>
            )}
            
            {/* Physical presence votes */}
            {((results.by_source as BySource).physical ?? 0) > 0 && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-700">
                    {(results.by_source as BySource).physical}
                  </p>
                  <p className="text-xs text-emerald-600">Φυσική παρουσία</p>
                </div>
              </div>
            )}
            
            {/* Proxy votes */}
            {((results.by_source as BySource).proxy ?? 0) > 0 && (
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-purple-700">
                    {(results.by_source as BySource).proxy}
                  </p>
                  <p className="text-xs text-purple-600">Εξουσιοδότηση</p>
                </div>
              </div>
            )}

            {/* Show "No breakdown data" if all are 0 */}
            {((results.by_source as BySource).electronic ?? 0) === 0 && 
             ((results.by_source as BySource).physical ?? 0) === 0 && 
             ((results.by_source as BySource).proxy ?? 0) === 0 && (
              <div className="col-span-full text-center text-gray-500 text-sm py-2">
                Δεν υπάρχουν διαθέσιμα στοιχεία ανάλυσης
              </div>
            )}
          </div>

          {/* Detailed breakdown (optional) */}
          {results.source_details && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                {(results.source_details as SourceDetails).app ? (
                  <span className="flex items-center gap-1">
                    <Smartphone className="w-3 h-3" />
                    {(results.source_details as SourceDetails).app} από εφαρμογή
                  </span>
                ) : null}
                {(results.source_details as SourceDetails).email ? (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {(results.source_details as SourceDetails).email} από email
                  </span>
                ) : null}
                {(results.source_details as SourceDetails).pre_vote ? (
                  <span className="flex items-center gap-1">
                    <Monitor className="w-3 h-3" />
                    {(results.source_details as SourceDetails).pre_vote} pre-voting
                  </span>
                ) : null}
                {(results.source_details as SourceDetails).live ? (
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    {(results.source_details as SourceDetails).live} στη συνέλευση
                  </span>
                ) : null}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

