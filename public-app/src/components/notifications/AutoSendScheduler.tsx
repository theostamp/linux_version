'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar as CalendarIcon, ToggleLeft, ToggleRight } from 'lucide-react';
import { monthlyTasksApi } from '@/lib/api/notifications';
import type { MonthlyNotificationTask } from '@/types/notifications';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AutoSendScheduler() {
  const { selectedBuilding } = useBuilding();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Fetch scheduled tasks
  const {
    data: tasks = [],
    isLoading: tasksLoading,
  } = useQuery<MonthlyNotificationTask[]>({
    queryKey: ['monthlyTasksSchedule', selectedBuilding?.id],
    queryFn: () => monthlyTasksApi.schedule({ building_id: selectedBuilding?.id }),
    staleTime: 5 * 60 * 1000,
  });

  // Toggle auto-send mutation
  const toggleAutoSendMutation = useMutation({
    mutationFn: ({ taskId, enabled }: { taskId: number; enabled: boolean }) =>
      enabled
        ? monthlyTasksApi.enableAutoSend(taskId)
        : monthlyTasksApi.disableAutoSend(taskId),
    onSuccess: async () => {
      // ✅ Invalidate AND explicitly refetch for immediate UI update
      await queryClient.invalidateQueries({ queryKey: ['monthlyTasks'] });
      await queryClient.invalidateQueries({ queryKey: ['monthlyTasksSchedule'] });
      await queryClient.refetchQueries({ queryKey: ['monthlyTasks'] });
      await queryClient.refetchQueries({ queryKey: ['monthlyTasksSchedule'] });
      toast.success('Η αυτόματη αποστολή ενημερώθηκε');
    },
    onError: () => {
      toast.error('Σφάλμα ενημέρωσης');
    },
  });

  // Group tasks by day of month
  const tasksByDay = tasks.reduce((acc, task) => {
    const day = task.day_of_month;
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(task);
    return acc;
  }, {} as Record<number, MonthlyNotificationTask[]>);

  // Generate days 1-31
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  // Get tasks for a specific day
  const getTasksForDay = (day: number) => {
    return tasksByDay[day] || [];
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Προγραμματισμός Αυτόματων Αποστολών</h2>
        <p className="text-sm text-gray-500">
          Προβολή και διαχείριση των προγραμματισμένων μηνιαίων ειδοποιήσεων
        </p>
      </div>

      {tasksLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-pulse">Φόρτωση...</div>
          </CardContent>
        </Card>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            Δεν υπάρχουν προγραμματισμένα tasks
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Calendar View */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Ημερολόγιο Προγραμματισμού
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {/* Day headers */}
                {['Ημ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 p-2">
                    {day}
                  </div>
                ))}
                {/* Days 1-31 */}
                {days.map((day) => {
                  const dayTasks = getTasksForDay(day);
                  const hasTasks = dayTasks.length > 0;
                  const hasAutoSend = dayTasks.some((t) => t.auto_send_enabled);

                  return (
                    <div
                      key={day}
                      className={`
                        aspect-square p-1 border rounded text-sm flex flex-col items-center justify-center
                        ${hasTasks ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}
                        ${hasAutoSend ? 'ring-2 ring-green-400' : ''}
                      `}
                    >
                      <span className="font-medium">{day}</span>
                      {hasTasks && (
                        <div className="flex gap-0.5 mt-1">
                          {dayTasks.map((task) => (
                            <div
                              key={task.id}
                              className={`w-1.5 h-1.5 rounded-full ${
                                task.auto_send_enabled ? 'bg-green-500' : 'bg-indigo-400'
                              }`}
                              title={task.task_type_display}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>Αυτόματη αποστολή</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-400" />
                  <span>Χειροκίνητη αποστολή</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tasks List */}
          <Card>
            <CardHeader>
              <CardTitle>Λίστα Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 border rounded hover:bg-slate-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          Ημέρα {task.day_of_month}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {task.task_type_display}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {task.building_name || 'Όλα τα κτίρια'} · {task.time_to_send}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(task.period_month).toLocaleDateString('el-GR', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.auto_send_enabled ? (
                        <ToggleRight
                          className="h-5 w-5 text-green-600 cursor-pointer"
                          onClick={() =>
                            toggleAutoSendMutation.mutate({
                              taskId: task.id,
                              enabled: false,
                            })
                          }
                        />
                      ) : (
                        <ToggleLeft
                          className="h-5 w-5 text-gray-400 cursor-pointer"
                          onClick={() =>
                            toggleAutoSendMutation.mutate({
                              taskId: task.id,
                              enabled: true,
                            })
                          }
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

