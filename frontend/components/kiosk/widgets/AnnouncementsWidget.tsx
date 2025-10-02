'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { Bell, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import MarkdownRenderer from '@/components/kiosk/MarkdownRenderer';

export default function AnnouncementsWidget({ data, isLoading, error }: BaseWidgetProps) {
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

  if (!data?.announcements || data.announcements.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-300">
        <div className="text-center">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Δεν υπάρχουν ανακοινώσεις</h3>
          <p className="text-sm">Δεν έχουν δημοσιευτεί ανακοινώσεις ακόμα</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-blue-500/20">
        <Bell className="w-6 h-6 text-blue-300" />
        <h2 className="text-lg font-bold text-white">Ανακοινώσεις</h2>
      </div>
      
      <div className="space-y-3 h-full overflow-y-auto">
        {data.announcements.slice(0, 5).map((announcement: any, index: number) => (
          <div 
            key={announcement.id} 
            className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 backdrop-blur-sm p-4 rounded-xl border border-blue-500/30 hover:border-blue-400/50 transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-white line-clamp-2 flex-1 mr-2">
                {announcement.title}
              </h3>
              <div className="flex items-center text-xs text-blue-300 bg-blue-800/30 px-2 py-1 rounded-full">
                <Calendar className="w-3 h-3 mr-1" />
                {format(new Date(announcement.created_at), 'dd/MM', { locale: el })}
              </div>
            </div>
            
            <div className="text-xs text-blue-100 line-clamp-3 mb-3 leading-relaxed">
              <MarkdownRenderer content={announcement.description} />
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center text-blue-300">
                <Clock className="w-3 h-3 mr-1" />
                {format(new Date(announcement.created_at), 'HH:mm', { locale: el })}
              </div>
              
              {announcement.priority === 'high' && (
                <div className="bg-red-500/20 text-red-300 px-2 py-1 rounded-full text-xs">
                  Επείγον
                </div>
              )}
              
              {announcement.priority === 'medium' && (
                <div className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full text-xs">
                  Σημαντικό
                </div>
              )}
            </div>
          </div>
        ))}
        
        {data.announcements.length > 5 && (
          <div className="text-center py-2">
            <p className="text-xs text-blue-300">
              +{data.announcements.length - 5} περισσότερες ανακοινώσεις
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
