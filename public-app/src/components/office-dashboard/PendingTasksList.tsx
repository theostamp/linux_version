'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { 
  Wrench, 
  Building2,
  Clock,
  ExternalLink,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { PendingTask } from '@/hooks/useOfficeDashboard';

interface PendingTasksListProps {
  data?: PendingTask[];
  loading?: boolean;
  initialVisibleCount?: number;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'pending':
      return { label: 'Εκκρεμεί', className: 'bg-amber-100 text-amber-700 border-amber-200' };
    case 'in_progress':
      return { label: 'Σε εξέλιξη', className: 'bg-blue-100 text-blue-700 border-blue-200' };
    case 'approved':
      return { label: 'Εγκεκριμένο', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    case 'scheduled':
      return { label: 'Προγραμματισμένο', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
    default:
      return { label: status, className: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
};

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case 'high':
    case 'urgent':
      return { label: 'Επείγον', className: 'bg-red-100 text-red-700' };
    case 'medium':
      return { label: 'Μέτριο', className: 'bg-amber-100 text-amber-700' };
    default:
      return { label: 'Κανονικό', className: 'bg-slate-100 text-slate-600' };
  }
};

export function PendingTasksList({ 
  data, 
  loading = false,
  initialVisibleCount = 3
}: PendingTasksListProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  if (loading) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Εκκρεμή Αιτήματα
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Εκκρεμή Αιτήματα
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-muted-foreground">Όλα ολοκληρώθηκαν!</p>
            <p className="text-sm text-muted-foreground">Δεν υπάρχουν εκκρεμή αιτήματα.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine visible tasks
  const hasMore = data.length > initialVisibleCount;
  const visibleTasks = isExpanded ? data : data.slice(0, initialVisibleCount);
  const hiddenCount = data.length - initialVisibleCount;

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Εκκρεμή Αιτήματα
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/requests')}
          >
            Προβολή όλων
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visibleTasks.map((task) => {
            const statusConfig = getStatusConfig(task.status);
            const priorityConfig = getPriorityConfig(task.priority);
            
            return (
              <div 
                key={task.id}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground truncate">
                      {task.title}
                    </span>
                    <Badge variant="outline" className={`text-xs ${priorityConfig.className}`}>
                      {priorityConfig.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {task.building_name}
                    </span>
                    {task.days_pending > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.days_pending} ημέρες
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <Badge variant="outline" className={statusConfig.className}>
                    {statusConfig.label}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/requests/${task.id}`)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Expand/Collapse Button */}
        {hasMore && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-primary hover:text-primary/80 hover:bg-primary/5"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Λιγότερα
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Περισσότερα ({hiddenCount} ακόμα)
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PendingTasksList;
