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
  accent: string;
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
      accent: 'hsl(var(--primary))',
      link: '/announcements',
      count: data?.announcements_count || 0,
      description: `${data?.announcements_count || 0} ενεργές`,
    },
    {
      key: 'votes',
      label: 'Ψηφοφορίες',
      icon: <CheckCircle className="w-5 h-5" />,
      accent: '#8b5cf6', // Purple - consider moving to variable if used widely
      link: '/votes',
      count: data?.votes_count || 0,
      description: `${data?.votes_count || 0} διαθέσιμες`,
    },
    {
      key: 'requests',
      label: 'Αιτήματα',
      icon: <AlertCircle className="w-5 h-5" />,
      accent: '#f59e0b', // Amber/Warning
      link: '/requests',
      count: data?.requests_count || 0,
      description: `${data?.requests_count || 0} συνολικά`,
    },
    {
      key: 'urgent',
      label: 'Επείγοντα',
      icon: <Clock className="w-5 h-5" />,
      accent: 'hsl(var(--destructive))',
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
              className="rounded-xl p-4 border-0 shadow-sm bg-muted animate-pulse"
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
              "cursor-pointer rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 group hover:scale-[1.02]",
              "bg-[hsl(var(--card))] border border-gray-300"
            )}
          >
            {/* Icon & Arrow */}
            <div className="flex items-center justify-between mb-3">
              <div
                className="p-2 rounded-lg shadow-sm"
                style={{ 
                  color: action.accent,
                  backgroundColor: action.accent.startsWith('#') 
                    ? `${action.accent}1f` 
                    : `color-mix(in srgb, ${action.accent}, transparent 90%)`
                }}
              >
                {action.icon}
              </div>
              <ArrowRight
                className={cn(
                  "w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                  "text-muted-foreground"
                )}
              />
            </div>
            
            {/* Count */}
            <div
              className="text-2xl font-bold mb-1"
              style={{ color: action.accent }}
            >
              {action.count}
            </div>
            
            {/* Label */}
            <div className="text-sm font-medium text-foreground">
              {action.label}
            </div>
            
            {/* Description */}
            {action.description && (
              <div className="text-xs mt-1 text-muted-foreground">
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


