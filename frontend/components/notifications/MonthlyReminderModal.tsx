'use client';

/**
 * Monthly Reminder Modal
 * Reminds administrators to send common expenses on 1st-2nd of each month
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMonthlyTasksReminder } from '@/hooks/useMonthlyTasksReminder';
import { useBuilding } from '@/components/contexts/BuildingContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Send, Clock, Building2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

export function MonthlyReminderModal() {
  const router = useRouter();
  const { buildings, currentBuilding } = useBuilding();
  const { data: tasks } = useMonthlyTasksReminder();

  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if we should show the modal
    const today = new Date();
    const dayOfMonth = today.getDate();

    // Only show on 1st-2nd of month
    if (dayOfMonth > 2) {
      return;
    }

    // Check if already dismissed today
    const dismissedDate = localStorage.getItem('monthly-reminder-dismissed');
    if (dismissedDate === today.toDateString()) {
      return;
    }

    // Check if we have pending common expense tasks
    const pendingTasks = tasks?.filter(
      (task) => task.task_type === 'common_expense' && task.status === 'pending_confirmation'
    );

    if (pendingTasks && pendingTasks.length > 0 && !dismissed) {
      // Delay showing modal to avoid blocking initial render
      const timer = setTimeout(() => {
        setOpen(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [tasks, dismissed]);

  const handleDismiss = () => {
    // Store dismissal in localStorage
    const today = new Date();
    localStorage.setItem('monthly-reminder-dismissed', today.toDateString());
    setDismissed(true);
    setOpen(false);
  };

  const handleSendToAll = () => {
    // Navigate to notifications send page with pre-filled common expenses template
    router.push('/notifications/send?template=common_expense&scope=all');
    setOpen(false);
  };

  const handleSelectBuildings = () => {
    // Navigate to notifications send page for building selection
    router.push('/notifications/send?template=common_expense&scope=specific');
    setOpen(false);
  };

  const handleRemindTomorrow = () => {
    handleDismiss();
  };

  if (!tasks || tasks.length === 0) {
    return null;
  }

  const pendingTasks = tasks.filter(
    (task) => task.task_type === 'common_expense' && task.status === 'pending_confirmation'
  );

  if (pendingTasks.length === 0) {
    return null;
  }

  const currentMonth = format(new Date(), 'MMMM yyyy', { locale: el });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-orange-500/10">
              <AlertCircle className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <DialogTitle className="text-xl">Μηνιαία Αποστολή Κοινοχρήστων</DialogTitle>
              <DialogDescription>
                Τα κοινόχρηστα του {currentMonth} δεν έχουν σταλεί ακόμα
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Εκκρεμείς Αποστολές</p>
                <p className="text-xs text-muted-foreground">
                  {pendingTasks.length} {pendingTasks.length === 1 ? 'κτίριο' : 'κτίρια'}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {pendingTasks.length}
            </Badge>
          </div>

          {/* Pending tasks list */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Κτίρια με εκκρεμή αποστολή:</p>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {pendingTasks.map((task) => {
                const building = buildings.find((b) => b.id === task.building);
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 bg-background border rounded-md"
                  >
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {building?.name || building?.address || 'Κτίριο'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(task.period_month), 'MMMM yyyy', { locale: el })}
                      </p>
                    </div>
                    {task.is_due && (
                      <Badge variant="destructive" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        Ληξιπρόθεσμο
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action info */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 <strong>Συμβουλή:</strong> Μπορείτε να στείλετε τα κοινόχρηστα σε όλες τις
              πολυκατοικίες μαζικά ή να επιλέξετε συγκεκριμένα κτίρια.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleRemindTomorrow}
            className="w-full sm:w-auto"
          >
            Υπενθύμιση Αύριο
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              onClick={handleSelectBuildings}
              className="flex-1 sm:flex-initial"
            >
              <Building2 className="w-4 h-4 mr-2" />
              Επιλογή Κτιρίων
            </Button>
            <Button
              onClick={handleSendToAll}
              className="flex-1 sm:flex-initial bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
            >
              <Send className="w-4 h-4 mr-2" />
              Αποστολή σε Όλα
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
