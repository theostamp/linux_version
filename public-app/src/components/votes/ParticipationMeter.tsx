'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Users, Target, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ParticipationMeterProps {
  percentage: number;
  minRequired?: number;
  totalVoters?: number;
  totalEligible?: number;
  compact?: boolean;
  showDetails?: boolean;
}

export default function ParticipationMeter({
  percentage,
  minRequired = 0,
  totalVoters = 0,
  totalEligible = 0,
  compact = false,
  showDetails = true,
}: ParticipationMeterProps) {
  const isValid = percentage >= minRequired;
  const remaining = minRequired > 0 ? Math.max(0, minRequired - percentage) : 0;

  // Calculate color based on percentage
  const getColor = () => {
    if (percentage >= minRequired && minRequired > 0) return 'emerald';
    if (percentage >= minRequired * 0.7) return 'amber';
    if (percentage >= minRequired * 0.5) return 'orange';
    return 'rose';
  };

  const color = minRequired > 0 ? getColor() : 'blue';

  const colorClasses = {
    emerald: {
      bg: 'bg-emerald-500',
      gradient: 'from-emerald-400 to-emerald-600',
      light: 'bg-emerald-50',
      text: 'text-emerald-700',
      ring: 'ring-emerald-200',
    },
    amber: {
      bg: 'bg-amber-500',
      gradient: 'from-amber-400 to-amber-600',
      light: 'bg-amber-50',
      text: 'text-amber-700',
      ring: 'ring-amber-200',
    },
    orange: {
      bg: 'bg-orange-500',
      gradient: 'from-orange-400 to-orange-600',
      light: 'bg-orange-50',
      text: 'text-orange-700',
      ring: 'ring-orange-200',
    },
    rose: {
      bg: 'bg-rose-500',
      gradient: 'from-rose-400 to-rose-600',
      light: 'bg-rose-50',
      text: 'text-rose-700',
      ring: 'ring-rose-200',
    },
    blue: {
      bg: 'bg-blue-500',
      gradient: 'from-blue-400 to-blue-600',
      light: 'bg-blue-50',
      text: 'text-blue-700',
      ring: 'ring-blue-200',
    },
  };

  const colors = colorClasses[color];

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentage, 100)}%` }}
            transition={{ duration: 0.5 }}
            className={cn('h-full rounded-full bg-gradient-to-r', colors.gradient)}
          />
        </div>
        <span className={cn('text-xs font-medium', colors.text)}>
          {percentage.toFixed(0)}%
        </span>
        {minRequired > 0 && (
          <span className="text-xs text-gray-400">
            / {minRequired}%
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl p-5 border', colors.light, colors.ring, 'ring-1')}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className={cn('w-5 h-5', colors.text)} />
          <h4 className="font-semibold text-gray-900">Ποσοστό Συμμετοχής</h4>
        </div>
        {minRequired > 0 && (
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium',
            isValid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          )}>
            {isValid ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Επιτεύχθηκε</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                <span>Απαιτείται {remaining.toFixed(1)}% ακόμη</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Main display */}
      <div className="flex items-end gap-4 mb-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className={cn('text-5xl font-bold', colors.text)}
        >
          {percentage.toFixed(1)}%
        </motion.div>

        {minRequired > 0 && (
          <div className="flex items-center gap-1 text-gray-500 mb-2">
            <Target className="w-4 h-4" />
            <span className="text-sm">
              Στόχος: {minRequired}%
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
        {/* Minimum required marker */}
        {minRequired > 0 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-gray-600 z-10"
            style={{ left: `${Math.min(minRequired, 100)}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-600 rounded-full" />
          </div>
        )}

        {/* Progress fill */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn(
            'h-full rounded-full bg-gradient-to-r relative',
            colors.gradient
          )}
        >
          {/* Animated shine effect */}
          <motion.div
            animate={{ x: ['0%', '100%'] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
              ease: 'easeInOut'
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          />
        </motion.div>
      </div>

      {/* Details */}
      {showDetails && (totalVoters > 0 || totalEligible > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4"
        >
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{totalVoters}</p>
            <p className="text-sm text-gray-500">Ψήφισαν</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{totalEligible}</p>
            <p className="text-sm text-gray-500">Δικαιούχοι</p>
          </div>
        </motion.div>
      )}

      {/* Motivational message */}
      {!isValid && minRequired > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-4 text-center text-sm text-gray-600 bg-white/50 rounded-lg p-3"
        >
          📣 Ενθαρρύνετε περισσότερους ενοίκους να ψηφίσουν για έγκυρα αποτελέσματα!
        </motion.div>
      )}
    </div>
  );
}
