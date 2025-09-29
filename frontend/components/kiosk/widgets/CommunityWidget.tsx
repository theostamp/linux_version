'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { 
  MessageSquare, 
  Users, 
  Heart,
  Star,
  Calendar,
  Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

export default function CommunityWidget({ data, isLoading, error }: BaseWidgetProps) {
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

  // Mock community data if no real data available
  const communityData = {
    welcome_message: data?.community_message || 'Καλώς ήρθατε στο σύστημα διαχείρισης κτιρίου. Εδώ μπορείτε να βρείτε όλες τις πληροφορίες που χρειάζεστε.',
    building_name: data?.building_info?.name || 'Αλκμάνος 22',
    community_stats: {
      total_residents: data?.building_info?.total_residents || 65,
      active_events: 2,
      upcoming_meetings: 1,
      community_rating: 4.5
    },
    recent_events: [
      {
        id: 1,
        title: 'Συνέλευση Κτιρίου',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        type: 'meeting',
        description: 'Μηνιαία συνέλευση κατοίκων'
      },
      {
        id: 2,
        title: 'Καθαρισμός Κοινού Χώρου',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        type: 'maintenance',
        description: 'Ετήσιος καθαρισμός κτιρίου'
      }
    ],
    community_highlights: [
      {
        title: 'Πράσινη Κοινότητα',
        description: '100% ανανεώσιμες πηγές ενέργειας',
        icon: '🌱'
      },
      {
        title: 'Ασφαλής Περιοχή',
        description: 'Συστήματα ασφαλείας 24/7',
        icon: '🛡️'
      },
      {
        title: 'Μοντέρνα Εγκαταστάσεις',
        description: 'Καινούρια συστήματα θέρμανσης',
        icon: '🏢'
      }
    ]
  };

  return (
    <div className="h-full overflow-hidden">
      <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-purple-500/20">
        <MessageSquare className="w-5 h-5 text-purple-300" />
        <h2 className="text-lg font-bold text-white">Κοινότητα</h2>
      </div>
      
      <div className="space-y-4 h-full overflow-y-auto">
        {/* Welcome Message */}
        <div className="bg-gradient-to-br from-purple-900/40 to-violet-900/40 backdrop-blur-sm p-4 rounded-xl border border-purple-500/30">
          <div className="flex items-center space-x-2 mb-3">
            <Heart className="w-4 h-4 text-purple-300" />
            <h3 className="text-sm font-semibold text-purple-100">Καλώς Ήρθατε</h3>
          </div>
          
          <div className="text-sm text-white leading-relaxed mb-3">
            {communityData.welcome_message}
          </div>
          
          <div className="text-xs text-purple-200">
            Κτίριο: {communityData.building_name}
          </div>
        </div>

        {/* Community Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 backdrop-blur-sm p-3 rounded-xl border border-blue-500/30 text-center">
            <Users className="w-4 h-4 mx-auto mb-1 text-blue-300" />
            <div className="text-lg font-bold text-white">
              {communityData.community_stats.total_residents}
            </div>
            <div className="text-xs text-blue-200">Κάτοικοι</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 backdrop-blur-sm p-3 rounded-xl border border-green-500/30 text-center">
            <Star className="w-4 h-4 mx-auto mb-1 text-green-300" />
            <div className="text-lg font-bold text-white">
              {communityData.community_stats.community_rating}
            </div>
            <div className="text-xs text-green-200">Αξιολόγηση</div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-900/40 to-yellow-900/40 backdrop-blur-sm p-3 rounded-xl border border-orange-500/30 text-center">
            <Calendar className="w-4 h-4 mx-auto mb-1 text-orange-300" />
            <div className="text-lg font-bold text-white">
              {communityData.community_stats.active_events}
            </div>
            <div className="text-xs text-orange-200">Εκδηλώσεις</div>
          </div>
          
          <div className="bg-gradient-to-br from-red-900/40 to-pink-900/40 backdrop-blur-sm p-3 rounded-xl border border-red-500/30 text-center">
            <MessageSquare className="w-4 h-4 mx-auto mb-1 text-red-300" />
            <div className="text-lg font-bold text-white">
              {communityData.community_stats.upcoming_meetings}
            </div>
            <div className="text-xs text-red-200">Συνέλευσεις</div>
          </div>
        </div>

        {/* Upcoming Events */}
        {communityData.recent_events && communityData.recent_events.length > 0 && (
          <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 backdrop-blur-sm p-4 rounded-xl border border-cyan-500/30">
            <div className="flex items-center space-x-2 mb-3">
              <Calendar className="w-4 h-4 text-cyan-300" />
              <h3 className="text-sm font-semibold text-cyan-100">Επερχόμενες Εκδηλώσεις</h3>
            </div>
            
            <div className="space-y-2">
              {communityData.recent_events.map((event: any) => (
                <div key={event.id} className="bg-cyan-800/30 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-white">
                      {event.title}
                    </h4>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      event.type === 'meeting' 
                        ? 'bg-blue-500/20 text-blue-300' 
                        : 'bg-green-500/20 text-green-300'
                    }`}>
                      {event.type === 'meeting' ? 'Συνέλευση' : 'Συντήρηση'}
                    </div>
                  </div>
                  
                  <p className="text-xs text-cyan-200 mb-2">
                    {event.description}
                  </p>
                  
                  <div className="flex items-center text-xs text-cyan-300">
                    <Calendar className="w-3 h-3 mr-1" />
                    {format(event.date, 'dd MMMM yyyy', { locale: el })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Community Highlights */}
        <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-sm p-4 rounded-xl border border-indigo-500/30">
          <div className="flex items-center space-x-2 mb-3">
            <Star className="w-4 h-4 text-indigo-300" />
            <h3 className="text-sm font-semibold text-indigo-100">Χαρακτηριστικά Κοινότητας</h3>
          </div>
          
          <div className="space-y-2">
            {communityData.community_highlights.map((highlight: any, index: number) => (
              <div key={index} className="bg-indigo-800/30 p-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{highlight.icon}</span>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-white">
                      {highlight.title}
                    </div>
                    <div className="text-xs text-indigo-200">
                      {highlight.description}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-gradient-to-br from-gray-800/40 to-slate-800/40 backdrop-blur-sm p-3 rounded-xl border border-gray-600/30">
          <div className="flex items-center space-x-2 mb-2">
            <Mail className="w-4 h-4 text-gray-300" />
            <h4 className="text-xs font-semibold text-gray-100">Επικοινωνία</h4>
          </div>
          <div className="text-xs text-gray-300">
            Για ερωτήσεις ή προτάσεις, επικοινωνήστε με τη διοίκηση
          </div>
        </div>
      </div>
    </div>
  );
}
