'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, ListTodo, LayoutGrid, RefreshCw, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useTodos } from '@/hooks/useTodos';
import { TodoListView } from '@/components/todos/TodoListView';
import { TodoCalendarView } from '@/components/todos/TodoCalendarView';
import { TodoKanbanView } from '@/components/todos/TodoKanbanView';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type TabValue = 'calendar' | 'list' | 'kanban';

interface Tab {
  value: TabValue;
  label: string;
  icon: React.ElementType;
}

const tabs: Tab[] = [
  { value: 'calendar', label: 'Ημερολόγιο', icon: Calendar },
  { value: 'list', label: 'Λίστα', icon: ListTodo },
  { value: 'kanban', label: 'Kanban', icon: LayoutGrid },
];

export default function CalendarPage() {
  const searchParams = useSearchParams();
  const viewParam = searchParams.get('view') as TabValue | null;
  const initialTab: TabValue = viewParam && ['calendar', 'list', 'kanban'].includes(viewParam)
    ? viewParam
    : 'calendar';
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  const { selectedBuilding, isLoading: buildingLoading } = useBuilding();
  const { pendingCount, refetch, isLoading } = useTodos();

  useEffect(() => {
    if (viewParam && viewParam !== activeTab && ['calendar', 'list', 'kanban'].includes(viewParam)) {
      setActiveTab(viewParam);
    }
  }, [viewParam, activeTab]);

  const handleRefresh = () => {
    refetch();
  };

  if (buildingLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    );
  }

  if (!selectedBuilding) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <Calendar className="w-16 h-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">
            Επιλέξτε κτίριο
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Παρακαλώ επιλέξτε ένα κτίριο για να δείτε τις εργασίες
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title-sm">
            Ημερολόγιο & Εργασίες
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedBuilding.name} • {pendingCount} εκκρεμείς εργασίες
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            Ανανέωση
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                activeTab === tab.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="min-h-[500px]">
        {activeTab === 'calendar' && (
          <TodoCalendarView buildingId={selectedBuilding.id} />
        )}
        {activeTab === 'list' && (
          <TodoListView buildingId={selectedBuilding.id} />
        )}
        {activeTab === 'kanban' && (
          <TodoKanbanView buildingId={selectedBuilding.id} />
        )}
      </div>
    </div>
  );
}
