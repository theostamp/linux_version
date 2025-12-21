'use client';

import { motion } from 'framer-motion';
import { Percent, Users, Building2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveResultsDisplayProps {
  results: {
    total_votes: number;
    approve_votes: number;
    reject_votes: number;
    abstain_votes: number;
    approve_mills: number;
    reject_mills: number;
    abstain_mills: number;
    total_mills: number;
    approve_percentage: number;
    reject_percentage: number;
    abstain_percentage: number;
  } | null;
  votingType?: string;
  votingTypeDisplay?: string;
}

export default function LiveResultsDisplay({ results, votingType, votingTypeDisplay }: LiveResultsDisplayProps) {
  if (!results) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">Αποτελέσματα ψηφοφορίας</h3>
        <p className="text-gray-500 mt-2">Δεν υπάρχουν ακόμα ψήφοι για αυτό το θέμα</p>
      </div>
    );
  }

  const sections = [
    {
      label: 'Υπέρ',
      percentage: results.approve_percentage,
      mills: results.approve_mills,
      votes: results.approve_votes,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
    },
    {
      label: 'Κατά',
      percentage: results.reject_percentage,
      mills: results.reject_mills,
      votes: results.reject_votes,
      color: 'bg-red-500',
      textColor: 'text-red-700',
      bgColor: 'bg-red-50',
    },
    {
      label: 'Λευκό',
      percentage: results.abstain_percentage,
      mills: results.abstain_mills,
      votes: results.abstain_votes,
      color: 'bg-gray-400',
      textColor: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Ζωντανά Αποτελέσματα</h3>
            {votingTypeDisplay && (
              <p className="text-xs text-indigo-600 font-medium">{votingTypeDisplay}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-indigo-600 leading-none">
            {results.total_mills}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mt-1">
            ΣΥΝΟΛΙΚΑ ΧΙΛΙΟΣΤΑ
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Progress Bar Stack */}
        <div className="h-10 w-full bg-gray-100 rounded-xl overflow-hidden flex shadow-inner">
          {sections.map((s, idx) => s.percentage > 0 && (
            <motion.div
              key={idx}
              initial={{ width: 0 }}
              animate={{ width: `${s.percentage}%` }}
              className={cn('h-full relative group transition-all', s.color)}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sections.map((s, idx) => (
            <div key={idx} className={cn('p-4 rounded-xl border transition-all', s.bgColor, 'border-transparent hover:border-gray-200')}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn('text-sm font-bold', s.textColor)}>{s.label}</span>
                <span className="text-lg font-black">{s.percentage}%</span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-gray-600">
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="text-sm font-medium">{s.mills} <span className="text-[10px] text-gray-400">χιλ.</span></span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-sm font-medium">{s.votes} <span className="text-[10px] text-gray-400">ψήφοι</span></span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info Footer */}
        <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-[11px] text-gray-400 font-bold uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            LIVE UPDATING
          </div>
          <div>TOTAL VOTES: {results.total_votes}</div>
        </div>
      </div>
    </div>
  );
}

