'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { 
  Wrench, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  Calendar,
  Users,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

export default function MaintenanceWidget({ widget, data, isLoading, error, settings }: BaseWidgetProps) {
  // Get settings
  const maxItems = settings?.maxItems || widget?.settings?.maxItems || settings?.displayLimit || widget?.settings?.displayLimit || 3;
  const showTitle = settings?.showTitle ?? widget?.settings?.showTitle ?? true;
  const title = settings?.title || widget?.settings?.title || 'Συντήρηση & Επισκευές';

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

  // Use real data from API - with default empty values
  const maintenance = {
    active_contractors: data?.maintenance_info?.active_contractors || 0,
    urgent_maintenance: data?.maintenance_info?.urgent_maintenance || 0,
    scheduled_maintenance: data?.maintenance_info?.scheduled_maintenance || 0,
    completed_this_month: data?.maintenance_info?.completed_this_month || 0,
    total_spent_this_month: data?.maintenance_info?.total_spent_this_month || 0,
    active_tasks: data?.maintenance_info?.active_tasks || [],
    upcoming_maintenance: data?.maintenance_info?.upcoming_maintenance || [],
    recent_work: data?.maintenance_info?.recent_work || []
  };

  return (
    <div className="h-full overflow-hidden">
      {showTitle && (
        <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-orange-500/20">
          <Wrench className="w-8 h-8 text-orange-300" />
          <h2 className="text-2xl font-bold text-white">{title}</h2>
        </div>
      )}

      <div className="space-y-3 h-full overflow-hidden">
        {/* Main Stats Grid - Compact */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 backdrop-blur-sm p-2 rounded-lg border border-green-500/30">
            <div className="flex items-center space-x-1 mb-1">
              <CheckCircle className="w-4 h-4 text-green-300" />
              <h3 className="text-sm font-semibold text-green-100">Ολοκληρώθηκαν</h3>
            </div>
            <div className="text-2xl font-bold text-white">{maintenance.completed_this_month}</div>
            <div className="text-sm text-green-200">αυτόν τον μήνα</div>
          </div>

          <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 backdrop-blur-sm p-2 rounded-lg border border-blue-500/30">
            <div className="flex items-center space-x-1 mb-1">
              <Calendar className="w-4 h-4 text-blue-300" />
              <h3 className="text-sm font-semibold text-blue-100">Προγραμματισμένες</h3>
            </div>
            <div className="text-2xl font-bold text-white">{maintenance.scheduled_maintenance}</div>
            <div className="text-sm text-blue-200">εργασίες</div>
          </div>

          <div className="bg-gradient-to-br from-red-900/40 to-red-800/40 backdrop-blur-sm p-2 rounded-lg border border-red-500/30">
            <div className="flex items-center space-x-1 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-300" />
              <h3 className="text-sm font-semibold text-red-100">Επείγουσες</h3>
            </div>
            <div className="text-2xl font-bold text-red-300">{maintenance.urgent_maintenance}</div>
            <div className="text-sm text-red-200">εργασίες</div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/40 to-violet-900/40 backdrop-blur-sm p-2 rounded-lg border border-purple-500/30">
            <div className="flex items-center space-x-1 mb-1">
              <Users className="w-4 h-4 text-purple-300" />
              <h3 className="text-sm font-semibold text-purple-100">Συνεργεία</h3>
            </div>
            <div className="text-2xl font-bold text-purple-300">{maintenance.active_contractors}</div>
            <div className="text-sm text-purple-200">ενεργά</div>
          </div>
        </div>

        {/* Monthly Spending - Compact */}
        <div className="bg-gradient-to-br from-yellow-900/40 to-amber-900/40 backdrop-blur-sm p-3 rounded-xl border border-yellow-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-yellow-300" />
              <h3 className="text-lg font-semibold text-yellow-100">Μηνιαίες Δαπάνες</h3>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">€{maintenance.total_spent_this_month.toLocaleString()}</div>
              <div className="flex items-center text-green-300">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span className="text-sm">-5% vs προηγούμενο</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Maintenance - Condensed */}
        {maintenance.upcoming_maintenance && maintenance.upcoming_maintenance.length > 0 && (
          <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 backdrop-blur-sm p-3 rounded-xl border border-cyan-500/30">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-5 h-5 text-cyan-300" />
              <h3 className="text-lg font-semibold text-cyan-100">Επερχόμενες Εργασίες</h3>
            </div>

            <div className="space-y-1">
              {maintenance.upcoming_maintenance.slice(0, Math.min(maxItems, 2)).map((item: any) => (
                <div key={item.id} className="bg-cyan-800/30 p-2 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white truncate">{item.title}</h4>
                    {item.type === 'urgent' && (
                      <div className="bg-red-500/20 text-red-300 px-2 py-1 rounded-full text-xs">Επείγον</div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm text-cyan-200">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {format(item.date, 'dd/MM', { locale: el })}
                    </div>
                    <div className="truncate">{item.contractor}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Work - Condensed */}
        {maintenance.recent_work && maintenance.recent_work.length > 0 && (
          <div className="bg-gradient-to-br from-gray-800/40 to-slate-800/40 backdrop-blur-sm p-3 rounded-xl border border-gray-600/30">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-5 h-5 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-100">Πρόσφατες Εργασίες</h3>
            </div>

            <div className="space-y-1">
              {maintenance.recent_work.slice(0, Math.min(maxItems, 2)).map((item: any) => (
                <div key={item.id} className="bg-gray-700/30 p-2 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white truncate">{item.title}</h4>
                    <div className="text-sm text-green-300">€{item.cost}</div>
                  </div>
                  <div className="text-sm text-gray-400">{format(item.date, 'dd/MM/yyyy', { locale: el })}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
