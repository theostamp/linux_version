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
              <div className="h-5 w-32 bg-muted-foreground/20 rounded-none" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-16 bg-muted rounded-none" />
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
      return <Bell className={`w-4 h-4 ${isUrgent ? 'text-destructive' : 'text-blue-500'}`} />;
    } else if (type === 'vote') {
      return <CheckCircle className={`w-4 h-4 ${isUrgent ? 'text-destructive' : 'text-emerald-500'}`} />;
    }
    return <Clock className="w-4 h-4 text-muted-foreground" />;
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
          <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.slice(0, 5).map((activity, index) => (
            <div
              key={`${activity.type}-${activity.id}-${index}`}
              onClick={() => handleActivityClick(activity)}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors group"
            >
                <div className="flex-shrink-0 mt-0.5">
                  {getActivityIcon(activity.type, activity.is_urgent)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {activity.title}
                    </p>
                    <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatActivityType(activity.type)}
                    </span>
                    <span className="text-xs text-muted-foreground/50">•</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.date), { addSuffix: true, locale: el })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {emptyMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-foreground mb-4">
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
