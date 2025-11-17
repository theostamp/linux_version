'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';
import type { DashboardOverview } from '@/hooks/useDashboardData';

interface ActivityFeedProps {
  data?: DashboardOverview;
  loading?: boolean;
}

export function ActivityFeed({ data, loading = false }: ActivityFeedProps) {
  const router = useRouter();
  
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 w-32 bg-gray-300 rounded" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-16 bg-gray-200 rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  const recentActivity = data?.recent_activity || [];
  const urgentItems = recentActivity.filter(item => item.is_urgent);
  const regularItems = recentActivity.filter(item => !item.is_urgent);
  
  const handleActivityClick = (activity: typeof recentActivity[0]) => {
    if (activity.type === 'announcement') {
      router.push('/announcements');
    } else if (activity.type === 'vote') {
      router.push('/votes');
    }
  };
  
  const getActivityIcon = (type: string, isUrgent: boolean) => {
    if (type === 'announcement') {
      return <Bell className={`w-4 h-4 ${isUrgent ? 'text-red-600' : 'text-blue-600'}`} />;
    } else if (type === 'vote') {
      return <CheckCircle className={`w-4 h-4 ${isUrgent ? 'text-red-600' : 'text-green-600'}`} />;
    }
    return <Clock className="w-4 h-4 text-gray-600" />;
  };
  
  const formatActivityType = (type: string) => {
    const typeLabels: Record<string, string> = {
      announcement: 'Ανακοίνωση',
      vote: 'Ψηφοφορία',
    };
    return typeLabels[type] || type;
  };
  
  const renderActivityList = (items: typeof recentActivity, title: string, emptyMessage: string) => (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {title}
          <span className="text-sm font-normal text-gray-500">({items.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.slice(0, 5).map((activity, index) => (
              <div
                key={`${activity.type}-${activity.id}-${index}`}
                onClick={() => handleActivityClick(activity)}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getActivityIcon(activity.type, activity.is_urgent)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {activity.title}
                    </p>
                    <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {formatActivityType(activity.type)}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(activity.date), { addSuffix: true, locale: el })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">
            {emptyMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        📰 Πρόσφατη Δραστηριότητα
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Items */}
        {renderActivityList(
          urgentItems,
          '⚠️ Επείγοντα',
          'Δεν υπάρχουν επείγοντα θέματα'
        )}
        
        {/* Recent Items */}
        {renderActivityList(
          regularItems.slice(0, 5),
          '⏰ Πρόσφατα',
          'Δεν υπάρχει πρόσφατη δραστηριότητα'
        )}
      </div>
    </div>
  );
}

export default ActivityFeed;

