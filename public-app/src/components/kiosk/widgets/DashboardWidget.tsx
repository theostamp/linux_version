'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { 
  Bell, 
  Euro, 
  Vote, 
  Wrench, 
  Home,
  Users,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

export default function DashboardWidget({ data, isLoading, error }: BaseWidgetProps) {
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

  const hasContent = (data?.announcements?.length || 0) > 0 || (data?.votes?.length || 0) > 0 ||
                    data?.financial_info || data?.maintenance_info;

  if (!hasContent) {
    return (
      <div className="flex items-center justify-center h-full text-gray-300">
        <div className="text-center">
          <Home className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Δεν υπάρχουν δεδομένα</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      {/* Latest Announcement */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm p-3 rounded-xl border border-slate-600/30">
        {data?.announcements && data.announcements.length > 0 ? (
          <>
            <div className="flex items-center space-x-2 mb-2">
              <Bell className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs font-semibold text-sky-100">Τελευταία Ανακοίνωση</h3>
            </div>
            <h4 className="text-sm font-bold text-white mb-1 line-clamp-2">
              {data.announcements[0].title}
            </h4>
            <p className="text-xs text-slate-300 line-clamp-2">
              {data.announcements[0].description}
            </p>
            <div className="text-xs text-slate-400 mt-1">
              {format(new Date(data.announcements[0].created_at), 'dd/MM HH:mm', { locale: el })}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            <Bell className="w-6 h-6" />
          </div>
        )}
      </div>

      {/* Financial Info */}
      <div className="bg-gradient-to-br from-emerald-800/60 to-emerald-900/60 backdrop-blur-sm p-3 rounded-xl border border-emerald-600/30">
        {data?.financial_info ? (
          <>
            <div className="flex items-center space-x-2 mb-2">
              <Euro className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-emerald-100">Οικονομικά</h3>
            </div>
            <div className="text-lg font-bold text-white">
              {data.financial_info.collection_rate}%
            </div>
            <div className="text-xs text-emerald-200">Είσπραξη</div>
            <div className="w-full bg-emerald-900/50 rounded-full h-1.5 mt-1">
              <div 
                className="bg-emerald-400 h-1.5 rounded-full"
                style={{ width: `${data.financial_info.collection_rate}%` }}
              ></div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-emerald-500">
            <Euro className="w-6 h-6" />
          </div>
        )}
      </div>

      {/* Active Vote */}
      <div className="bg-gradient-to-br from-violet-800/60 to-violet-900/60 backdrop-blur-sm p-3 rounded-xl border border-violet-600/30">
        {data?.votes && data.votes.length > 0 ? (
          <>
            <div className="flex items-center space-x-2 mb-1">
              <Vote className="w-4 h-4 text-violet-400" />
              <h3 className="text-xs font-semibold text-violet-100">Ψηφοφορία</h3>
            </div>
            <h4 className="text-xs font-bold text-white line-clamp-2">
              {data.votes[0].title}
            </h4>
            <div className="text-xs text-violet-300 mt-1">
              {data.votes[0].total_votes || 0} ψήφοι
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-violet-500">
            <Vote className="w-6 h-6" />
          </div>
        )}
      </div>

      {/* Maintenance Status */}
      <div className="bg-gradient-to-br from-amber-800/60 to-amber-900/60 backdrop-blur-sm p-3 rounded-xl border border-amber-600/30">
        <div className="flex items-center space-x-2 mb-1">
          <Wrench className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-semibold text-amber-100">Συντήρηση</h3>
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="bg-amber-900/30 p-1 rounded text-center">
            <div className="text-amber-200">Συνεργεία</div>
            <div className="text-sm font-bold text-white">
              {data?.maintenance_info?.active_contractors || 0}
            </div>
          </div>
          <div className="bg-red-900/30 p-1 rounded text-center">
            <div className="text-red-200">Επείγοντα</div>
            <div className="text-sm font-bold text-red-300">
              {data?.maintenance_info?.urgent_maintenance || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
