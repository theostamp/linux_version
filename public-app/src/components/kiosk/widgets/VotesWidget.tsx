'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { Vote, Users, Calendar, TrendingUp, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

export default function VotesWidget({ widget, data, isLoading, error, settings }: BaseWidgetProps) {
  // Get settings
  const maxItems = settings?.maxItems || widget?.settings?.maxItems || settings?.displayLimit || widget?.settings?.displayLimit || 2;
  const showTitle = settings?.showTitle ?? widget?.settings?.showTitle ?? true;
  const title = settings?.title || widget?.settings?.title || 'Ψηφοφορίες';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-300">
        <div className="text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data?.votes || data.votes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-300">
        <div className="text-center">
          <Vote className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Δεν υπάρχουν ψηφοφορίες</h3>
          <p className="text-sm">Δεν έχουν δημιουργηθεί ψηφοφορίες ακόμα</p>
        </div>
      </div>
    );
  }

  // Use ISO date string comparison to include votes that end TODAY as active
  const today = new Date().toISOString().split('T')[0]; // e.g. "2025-12-14"
  
  const activeVotes = data.votes.filter((vote: any) => {
    if (!vote.end_date || vote.end_date < '1971-01-01') return true; // No end date = always active
    return vote.end_date >= today; // Include today's end date as active
  });

  const completedVotes = data.votes.filter((vote: any) => {
    if (!vote.end_date || vote.end_date < '1971-01-01') return false; // No end date = never completed
    return vote.end_date < today; // Only past dates are completed
  });

  return (
    <div className="h-full overflow-hidden">
      {showTitle && (
        <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-green-500/20">
          <Vote className="w-6 h-6 text-green-300" />
          <h2 className="text-lg font-bold text-white">{title}</h2>
        </div>
      )}

      <div className="space-y-3 h-full overflow-y-auto">
        {/* Active Votes */}
        {activeVotes.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-green-300 mb-2 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              Ενεργές Ψηφοφορίες
            </h3>
            {activeVotes.slice(0, maxItems).map((vote: any) => (
              <div 
                key={vote.id} 
                className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 backdrop-blur-sm p-4 rounded-xl border border-green-500/30 mb-3"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-white line-clamp-2 flex-1 mr-2">
                    {vote.title}
                  </h4>
                  <div className="bg-green-500/20 text-green-300 px-2 py-1 rounded-full text-xs">
                    Ενεργή
                  </div>
                </div>
                
                <p className="text-xs text-green-100 line-clamp-2 mb-3">
                  {vote.description}
                </p>
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center text-green-300">
                    <Calendar className="w-3 h-3 mr-1" />
                    Λήγει: {format(new Date(vote.end_date), 'dd/MM', { locale: el })}
                  </div>
                  
                  <div className="flex items-center text-green-300">
                    <Users className="w-3 h-3 mr-1" />
                    {vote.total_votes || 0} ψήφοι
                  </div>
                </div>
                
                {/* Progress bar */}
                {vote.total_votes > 0 && (
                  <div className="mt-2">
                    <div className="w-full bg-green-900/30 rounded-full h-1.5">
                      <div 
                        className="bg-green-400 h-1.5 rounded-full transition-all"
                        style={{ 
                          width: `${Math.min((vote.total_votes / 100) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Recent Completed Votes */}
        {completedVotes.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 mb-2 flex items-center">
              <CheckCircle className="w-3 h-3 mr-1" />
              Ολοκληρωμένες Ψηφοφορίες
            </h3>
            {completedVotes.slice(0, 1).map((vote: any) => (
              <div 
                key={vote.id} 
                className="bg-gradient-to-br from-gray-800/40 to-slate-800/40 backdrop-blur-sm p-3 rounded-xl border border-gray-600/30"
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-semibold text-gray-200 line-clamp-1">
                    {vote.title}
                  </h4>
                  <div className="bg-gray-500/20 text-gray-400 px-2 py-1 rounded-full text-xs">
                    Ολοκληρώθηκε
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {format(new Date(vote.end_date), 'dd/MM', { locale: el })}
                  </div>
                  
                  <div className="flex items-center">
                    <Users className="w-3 h-3 mr-1" />
                    {vote.total_votes || 0} ψήφοι
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 backdrop-blur-sm p-3 rounded-xl border border-blue-500/20">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-green-400">
                {activeVotes.length}
              </div>
              <div className="text-xs text-gray-300">Ενεργές</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-400">
                {data.votes.length}
              </div>
              <div className="text-xs text-gray-300">Σύνολο</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
