'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCircle, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardOverview } from '@/hooks/useDashboardData';

interface QuickAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
  textColor: string;
  link: string;
  count: number;
  description: string;
}

interface QuickActionsGridProps {
  data?: DashboardOverview;
  loading?: boolean;
}

export function QuickActionsGrid({ data, loading = false }: QuickActionsGridProps) {
  const router = useRouter();
  
  const actions: QuickAction[] = [
    {
      key: 'announcements',
      label: 'Ανακοινώσεις',
      icon: <Bell className="w-5 h-5" />,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      link: '/announcements',
      count: data?.announcements_count || 0,
      description: `${data?.announcements_count || 0} ενεργές`,
    },
    {
      key: 'votes',
      label: 'Ψηφοφορίες',
      icon: <CheckCircle className="w-5 h-5" />,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      link: '/votes',
      count: data?.votes_count || 0,
      description: `${data?.votes_count || 0} διαθέσιμες`,
    },
    {
      key: 'requests',
      label: 'Αιτήματα',
      icon: <AlertCircle className="w-5 h-5" />,
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-700',
      link: '/requests',
      count: data?.requests_count || 0,
      description: `${data?.requests_count || 0} συνολικά`,
    },
    {
      key: 'urgent',
      label: 'Επείγοντα',
      icon: <Clock className="w-5 h-5" />,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-700',
      link: '/requests',
      count: data?.urgent_items || 0,
      description: `${data?.urgent_items || 0} προς επίλυση`,
    },
  ];
  
  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-4">Γρήγορες Ενέργειες</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-none p-4 border-0 shadow-sm bg-muted animate-pulse"
            >
              <div className="h-10 bg-muted-foreground/20 rounded-none mb-3" />
              <div className="h-8 w-12 bg-muted-foreground/20 rounded-none mb-1" />
              <div className="h-4 w-20 bg-muted-foreground/20 rounded-none" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-foreground mb-4">
        🚀 Γρήγορες Ενέργειες
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action) => (
          <div
            key={action.key}
            onClick={() => router.push(action.link)}
            className={cn(
              "cursor-pointer rounded-none p-4 shadow-sm hover:shadow-md transition-all duration-200 group hover:scale-105 border-0",
              action.bgColor,
              action.borderColor
            )}
          >
            {/* Icon & Arrow */}
            <div className="flex items-center justify-between mb-3">
              <div className={cn("p-2 rounded-none bg-card/50 shadow-sm", action.textColor)}>
                {action.icon}
              </div>
              <ArrowRight
                className={cn(
                  "w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                  action.textColor
                )}
              />
            </div>
            
            {/* Count */}
            <div className={cn("text-2xl font-bold mb-1", action.textColor)}>
              {action.count}
            </div>
            
            {/* Label */}
            <div className={cn("text-sm font-medium", action.textColor)}>
              {action.label}
            </div>
            
            {/* Description */}
            {action.description && (
              <div className={cn("text-xs mt-1 opacity-80", action.textColor)}>
                {action.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default QuickActionsGrid;


