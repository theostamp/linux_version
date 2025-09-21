'use client';

import Link from 'next/link';
import { BackButton } from '@/components/ui/BackButton';
import React, { useMemo, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchScheduledMaintenances, type ScheduledMaintenance, deleteScheduledMaintenance, deleteProject } from '@/lib/api';
import { useExpenses } from '@/hooks/useExpenses';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertTriangle, CheckCircle, Clock, Plus, Trash2, Pencil } from 'lucide-react';
import { useRole } from '@/lib/auth';
import { ServiceDeletionConfirmDialog } from '@/components/maintenance/ServiceDeletionConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import ScheduledMaintenanceOverviewModal from '@/components/maintenance/ScheduledMaintenanceOverviewModal';

type Priority = 'low' | 'medium' | 'high' | 'urgent';
type Status = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

// Extended type to handle both scheduled maintenance and projects
type CombinedMaintenanceItem = Omit<ScheduledMaintenance, 'id'> & {
  id: string | number;
  is_project?: boolean;
  project_id?: string;
};

type ScheduledMaintenanceItem = ScheduledMaintenance;

function PriorityBadge({ priority }: { priority: Priority }) {
  const colorMap: Record<Priority, string> = {
    low: 'bg-green-50 text-green-700',
    medium: 'bg-yellow-50 text-yellow-700',
    high: 'bg-orange-50 text-orange-700',
    urgent: 'bg-red-50 text-red-700',
  };
  const labelMap: Record<Priority, string> = {
    low: 'Χαμηλή',
    medium: 'Μεσαία',
    high: 'Υψηλή',
    urgent: 'Επείγον',
  };
  return <span className={`px-2 py-1 text-xs rounded ${colorMap[priority]}`}>{labelMap[priority]}</span>;
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; icon: React.ReactNode; classes: string }> = {
    scheduled: { label: 'Προγραμματισμένο', icon: <Calendar className="w-3 h-3" />, classes: 'bg-blue-50 text-blue-700' },
    in_progress: { label: 'Σε εξέλιξη', icon: <Clock className="w-3 h-3" />, classes: 'bg-yellow-50 text-yellow-700' },
    completed: { label: 'Ολοκληρώθηκε', icon: <CheckCircle className="w-3 h-3" />, classes: 'bg-green-50 text-green-700' },
    cancelled: { label: 'Ακυρώθηκε', icon: <AlertTriangle className="w-3 h-3" />, classes: 'bg-gray-50 text-gray-700' },
  };
  const fallback = { label: String(status), icon: null as React.ReactNode, classes: 'bg-neutral-50 text-neutral-700' };
  const { label, icon, classes } = map[status] ?? fallback;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded ${classes}`}>
      {icon}
      {label}
    </span>
  );
}

export default function ScheduledMaintenancePage({ searchParams }: { searchParams?: Promise<{ priority?: string; highlight?: string }> | { priority?: string; highlight?: string } }) {
  // Next.js 15: searchParams may be a Promise; unwrap with React.use when needed
  // @ts-expect-error next 15 searchParams can be promise-like
  const sp = (typeof (searchParams as any)?.then === 'function' ? React.use(searchParams as Promise<{ priority?: string; highlight?: string }>) : (searchParams as { priority?: string; highlight?: string } | undefined));
  const priorityFilter = (sp?.priority || '').toLowerCase() as Priority | '';
  const highlightParam = sp?.highlight ? parseInt(String(sp.highlight), 10) : NaN;
  const [highlightId, setHighlightId] = useState<number | null>(Number.isFinite(highlightParam) ? highlightParam : null);
  const { selectedBuilding, currentBuilding } = useBuilding();
  const buildingId = selectedBuilding?.id || currentBuilding?.id;

  const { data: items = [], isLoading } = useQuery<ScheduledMaintenanceItem[]>({
    queryKey: ['maintenance', 'scheduled', { buildingId, priorityFilter }],
    queryFn: () => fetchScheduledMaintenances({ buildingId: buildingId ?? undefined, priority: priorityFilter || undefined, ordering: 'scheduled_date' }),
    enabled: true,
    staleTime: 30_000,
  });

  // Also fetch approved projects from offers
  const { data: approvedProjects = [] } = useQuery({
    queryKey: ['approved-projects-for-scheduled', { buildingId }],
    queryFn: async () => {
      const { api } = await import('@/lib/api');
      const response = await api.get('/projects/projects/', {
        params: {
          building: buildingId,
          status__in: 'approved,in_progress',
          page_size: 100
        }
      });
      // Transform projects to match ScheduledMaintenance interface
      return (response.data?.results || []).map((project: any) => ({
        id: `project-${project.id}`,
        title: project.title,
        description: project.description,
        contractor_name: project.selected_contractor,
        priority: project.priority || 'medium',
        status: project.status === 'approved' ? 'scheduled' : 'in_progress',
        scheduled_date: project.deadline || project.created_at,
        estimated_cost: project.final_cost || project.estimated_cost,
        building: buildingId,
        is_project: true,
        project_id: project.id
      }));
    },
    enabled: !!buildingId,
    staleTime: 30_000,
  });
  const qc = useQueryClient();
  const { isAdmin, isManager } = useRole();
  const { toast } = useToast();
  const { getExpenses, deleteExpense } = useExpenses(buildingId || 0);
  const [toDeleteId, setToDeleteId] = React.useState<string | number | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [overviewOpen, setOverviewOpen] = React.useState(false);
  const [overviewId, setOverviewId] = React.useState<number | null>(null);

  // Combine scheduled maintenance items with approved projects
  const combinedItems: CombinedMaintenanceItem[] = useMemo(() => {
    return [...items, ...approvedProjects];
  }, [items, approvedProjects]);

  const filtered = useMemo(() => {
    if (!priorityFilter) return combinedItems;
    return combinedItems.filter((i) => i.priority === priorityFilter);
  }, [combinedItems, priorityFilter]);

  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`scheduled-item-${highlightId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const timeout = setTimeout(() => setHighlightId(null), 4000);
      return () => clearTimeout(timeout);
    }
  }, [highlightId, filtered]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BackButton size="sm" href="/maintenance" />
          <h1 className="text-3xl font-bold tracking-tight">Προγραμματισμένα Έργα</h1>
          <p className="text-muted-foreground">Λίστα εργασιών συντήρησης ανά προτεραιότητα</p>
        </div>
        <Button asChild>
          <Link href="/maintenance/scheduled/new">
            <Plus className="w-4 h-4 mr-2" />
            Νέο Έργο
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <div className="col-span-full flex items-center justify-center py-12 text-sm text-muted-foreground">Φόρτωση…</div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="col-span-full text-sm text-muted-foreground">Δεν βρέθηκαν έργα.</div>
        )}
        {!isLoading && filtered.map((item) => (
          <Card
            key={item.id}
            id={`scheduled-item-${item.id}`}
            className={item.id && highlightId === item.id ? 'ring-2 ring-amber-400 bg-amber-50/40 transition-colors' : ''}
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">
                  {item.title}
                  {(item as any).is_project && (
                    <Badge variant="secondary" className="ml-2">Έργο</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {item.contractor_name ? `Συνεργείο: ${item.contractor_name}` : 'Χωρίς συνεργείο'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <PriorityBadge priority={item.priority as Priority} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Ημ/νία: {item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString('el-GR') : '—'}
              </div>
              <div>
                <StatusBadge status={item.status as Status} />
              </div>
              <div className="pt-2 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOverviewId(item.id);
                    setOverviewOpen(true);
                  }}
                >
                  Προβολή
                </Button>
                {(isAdmin || isManager) && (
                  <>
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/maintenance/scheduled/${item.id}/edit`}>
                        <Pencil className="w-3 h-3 mr-1" /> Επεξεργασία
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setToDeleteId(item.id)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Διαγραφή
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ServiceDeletionConfirmDialog
        open={toDeleteId !== null}
        onOpenChange={(open) => !open && setToDeleteId(null)}
        maintenanceTitle={combinedItems.find(item => item.id === toDeleteId)?.title}
        relatedExpensesCount={0} // Will be calculated in onConfirm
        totalAmount={0} // Will be calculated in onConfirm
        isConfirmLoading={deleting}
        onConfirm={async () => {
          if (toDeleteId === null || !buildingId) return;
          try {
            setDeleting(true);
            
            // Find the maintenance item to get its title
            const itemToDelete = combinedItems.find(item => item.id === toDeleteId);
            const maintenanceTitle = itemToDelete?.title || '';
            
            // First, find and delete related expenses
            let deletedExpensesCount = 0;
            let totalDeletedAmount = 0;
            
            try {
              const allExpenses = await getExpenses({ building_id: buildingId });
              const normalizedMaintenanceTitle = maintenanceTitle.toLowerCase();
              const relatedExpenses = allExpenses.filter(expense => {
                const expenseTitle = (expense.title || '').toLowerCase();
                // Match expenses that contain the maintenance title or explicit labels
                return (
                  expenseTitle.includes(normalizedMaintenanceTitle) ||
                  (expenseTitle.includes('προκαταβολή') && expenseTitle.includes(normalizedMaintenanceTitle)) ||
                  (expenseTitle.includes('δόση') && expenseTitle.includes(normalizedMaintenanceTitle))
                );
              });
              
              if (relatedExpenses.length > 0) {
                for (const expense of relatedExpenses) {
                  try {
                    await deleteExpense(expense.id);
                    deletedExpensesCount += 1;
                    totalDeletedAmount += expense.amount || 0;
                  } catch (expenseError) {
                    console.error('Error deleting related expense:', expenseError);
                  }
                }
                
                if (deletedExpensesCount > 0) {
                  toast({ 
                    title: 'Καθαρισμός Δαπανών', 
                    description: `Διαγράφηκαν ${deletedExpensesCount} σχετικές δαπάνες (${totalDeletedAmount.toFixed(2)}€).` 
                  });
                }
              }
            } catch (expenseError) {
              console.error('Error checking related expenses:', expenseError);
              // Continue with maintenance deletion even if expense check fails
            }
            
            // Delete the scheduled maintenance or project
            if (typeof toDeleteId === 'string' && toDeleteId.startsWith('project-')) {
              // For projects, extract the UUID and delete via projects API
              const projectId = toDeleteId.replace('project-', '');
              await deleteProject(projectId);
              qc.invalidateQueries({ queryKey: ['projects', 'approved'] });
            } else {
              // For regular scheduled maintenance, use the numeric ID
              await deleteScheduledMaintenance(toDeleteId as number);
              qc.invalidateQueries({ queryKey: ['maintenance', 'scheduled'] });
            }
            
            // Enhanced success message
            const successMessage = deletedExpensesCount > 0 
              ? `Το έργο "${maintenanceTitle}" και ${deletedExpensesCount} σχετικές δαπάνες διαγράφηκαν επιτυχώς.`
              : `Το έργο "${maintenanceTitle}" διαγράφηκε επιτυχώς.`;
              
            toast({ 
              title: 'Διαγραφή Ολοκληρώθηκε', 
              description: successMessage 
            });
          } catch (e) {
            toast({ 
              title: 'Σφάλμα Διαγραφής', 
              description: 'Αποτυχία διαγραφής του έργου. Παρακαλώ δοκιμάστε ξανά.', 
              variant: 'destructive' as any 
            });
          } finally {
            setDeleting(false);
            setToDeleteId(null);
          }
        }}
      />

      <ScheduledMaintenanceOverviewModal
        open={overviewOpen}
        onOpenChange={(o) => {
          setOverviewOpen(o);
          if (!o) setOverviewId(null);
        }}
        maintenanceId={overviewId}
      />
    </div>
  );
}


