'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, AlertCircle, Bell, Building2 } from 'lucide-react';
import { monthlyTasksApi } from '@/lib/api/notifications';
import type { MonthlyNotificationTask } from '@/types/notifications';
import { useToast } from '@/hooks/use-toast';

interface MonthlyTaskReminderModalProps {
  tasks: MonthlyNotificationTask[];
  open: boolean;
  onClose: () => void;
}

export function MonthlyTaskReminderModal({
  tasks,
  open,
  onClose,
}: MonthlyTaskReminderModalProps) {
  const [enableAutoSend, setEnableAutoSend] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const confirmMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return monthlyTasksApi.confirm(taskId, {
        send_immediately: true,
        enable_auto_send: enableAutoSend,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Επιτυχία',
        description: enableAutoSend
          ? 'Η ειδοποίηση στάλθηκε και η αυτόματη αποστολή ενεργοποιήθηκε'
          : 'Η ειδοποίηση στάλθηκε επιτυχώς',
      });
      queryClient.invalidateQueries({ queryKey: ['monthly-tasks'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Σφάλμα',
        description: error.message || 'Αποτυχία αποστολής ειδοποίησης',
      });
    },
  });

  const skipMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return monthlyTasksApi.skip(taskId);
    },
    onSuccess: () => {
      toast({
        title: 'Επιτυχία',
        description: 'Η ειδοποίηση παραλείφθηκε',
      });
      queryClient.invalidateQueries({ queryKey: ['monthly-tasks'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Σφάλμα',
        description: error.message || 'Αποτυχία παράλειψης ειδοποίησης',
      });
    },
  });

  const handleConfirm = () => {
    if (tasks.length > 0) {
      confirmMutation.mutate(tasks[0].id);
    }
  };

  const handleSkip = () => {
    if (tasks.length > 0) {
      skipMutation.mutate(tasks[0].id);
    }
  };

  if (tasks.length === 0) {
    return null;
  }

  const task = tasks[0]; // Show first pending task
  const periodDate = new Date(task.period_month);
  const periodText = periodDate.toLocaleDateString('el-GR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" />
            <DialogTitle className="text-xl">
              Υπενθύμιση Μηνιαίας Αποστολής
            </DialogTitle>
          </div>
          <DialogDescription>
            Είναι η {new Date().getDate()}η του μήνα - ώρα για αποστολή κοινοχρήστων!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Task Details */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Τύπος:</span>
                  <Badge variant="default">{task.task_type_display}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="font-semibold">Κτίριο:</span>
                  <span>{task.building_name || 'Όλα τα κτίρια'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="font-semibold">Περίοδος:</span>
                  <span>{periodText}</span>
                </div>
                {task.template_name && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Template:</span>
                    <span className="text-muted-foreground">{task.template_name}</span>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {/* Multiple Tasks Warning */}
          {tasks.length > 1 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                Υπάρχουν {tasks.length} εκκρεμείς αποστολές. Θα επεξεργαστούμε την πρώτη.
              </AlertDescription>
            </Alert>
          )}

          {/* Auto-send Option */}
          <div className="flex items-center space-x-2 p-4 bg-muted rounded-lg">
            <Checkbox
              id="auto-send"
              checked={enableAutoSend}
              onCheckedChange={(checked) => setEnableAutoSend(checked as boolean)}
            />
            <Label
              htmlFor="auto-send"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              <div>
                <div className="font-semibold">Μη με ξαναρωτήσεις</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Στείλε τα αυτόματα κάθε {task.day_of_month}η του μήνα στις{' '}
                  {task.time_to_send}
                </div>
              </div>
            </Label>
          </div>

          {/* Action Explanation */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <strong>Αποστολή Τώρα:</strong> Η ειδοποίηση θα σταλεί άμεσα σε όλους τους
              ενοίκους
            </p>
            <p>
              <strong>Παράλειψη:</strong> Δεν θα σταλεί για αυτόν το μήνα (μπορείς να στείλεις
              χειροκίνητα αργότερα)
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={skipMutation.isPending || confirmMutation.isPending}
          >
            Παράλειψη
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirmMutation.isPending || skipMutation.isPending}
          >
            {confirmMutation.isPending ? 'Αποστολή...' : 'Αποστολή Τώρα'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
