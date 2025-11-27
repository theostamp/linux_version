'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Settings, 
  Calendar, 
  Clock, 
  ToggleRight, 
  ToggleLeft,
  Plus,
  Trash2,
  Building2
} from 'lucide-react';
import { monthlyTasksApi } from '@/lib/api/notifications';
import type { MonthlyNotificationTask } from '@/types/notifications';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const TASK_TYPES = [
  { value: 'common_expense', label: 'Κοινόχρηστα Μήνα' },
  { value: 'balance_reminder', label: 'Υπενθύμιση Οφειλών' },
];

export default function SettingsPanel() {
  const { buildings, selectedBuilding } = useBuilding();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    taskType: 'common_expense',
    buildingId: selectedBuilding?.id?.toString() ?? '',
    dayOfMonth: '1',
    timeToSend: '09:00',
    autoSend: false,
  });

  const { data: tasks = [], isLoading } = useQuery<MonthlyNotificationTask[]>({
    queryKey: ['monthly-tasks-settings'],
    queryFn: () => monthlyTasksApi.schedule(),
  });

  const toggleAutoSendMutation = useMutation({
    mutationFn: async ({ taskId, enabled }: { taskId: number; enabled: boolean }) => {
      return enabled 
        ? monthlyTasksApi.enableAutoSend(taskId)
        : monthlyTasksApi.disableAutoSend(taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-tasks-settings'] });
      toast.success('Οι ρυθμίσεις ενημερώθηκαν');
    },
    onError: () => {
      toast.error('Αποτυχία ενημέρωσης');
    },
  });

  const getTaskTypeLabel = (type: string) => {
    return TASK_TYPES.find(t => t.value === type)?.label || type;
  };

  const formatPeriod = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Ρυθμίσεις Αυτόματων Αποστολών</h2>
          <p className="text-sm text-gray-500">
            Διαχείριση προγραμματισμένων μηνιαίων ειδοποιήσεων
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Settings className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium">
                Αυτόματες Μηνιαίες Αποστολές
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Όταν ενεργοποιείτε την αυτόματη αποστολή, το σύστημα θα στέλνει αυτόματα 
                τα κοινόχρηστα ή τις υπενθυμίσεις την καθορισμένη ημέρα κάθε μήνα.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Προγραμματισμένες Αποστολές</h3>
          <Badge variant="outline">{tasks.length} ρυθμίσεις</Badge>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              Φόρτωση...
            </CardContent>
          </Card>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p>Δεν υπάρχουν αυτόματες αποστολές</p>
              <p className="text-sm mt-1">
                Μπορείτε να στέλνετε χειροκίνητα από την καρτέλα "Αποστολή"
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">
                          {getTaskTypeLabel(task.task_type)}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {task.status_display || task.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          <span>{task.building_name || 'Όλες οι πολυκατοικίες'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Ημέρα {task.day_of_month}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{task.time_to_send}</span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-500">
                        Περίοδος: {formatPeriod(task.period_month)}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {task.auto_send_enabled ? 'Αυτόματη' : 'Χειροκίνητη'}
                        </span>
                        <button
                          onClick={() => toggleAutoSendMutation.mutate({
                            taskId: task.id,
                            enabled: !task.auto_send_enabled
                          })}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {task.auto_send_enabled ? (
                            <ToggleRight className="h-8 w-8 text-green-500" />
                          ) : (
                            <ToggleLeft className="h-8 w-8 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Tips */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-sm text-gray-700">💡 Συμβουλές</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>
            • Τα κοινόχρηστα συνήθως αποστέλλονται τις πρώτες μέρες του μήνα
          </p>
          <p>
            • Οι υπενθυμίσεις οφειλών μπορούν να προγραμματιστούν στα μέσα του μήνα
          </p>
          <p>
            • Ακόμα και με αυτόματη αποστολή, μπορείτε να στείλετε χειροκίνητα οποτεδήποτε
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

