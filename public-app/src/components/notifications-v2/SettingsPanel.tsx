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
  Building2,
  Mail,
  MessageSquare,
  Phone,
  Bell,
  Smartphone,
  Info
} from 'lucide-react';
import { monthlyTasksApi } from '@/lib/api/notifications';
import type { MonthlyNotificationTask, NotificationChannel } from '@/types/notifications';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TASK_TYPES = [
  { value: 'common_expense', label: 'Κοινόχρηστα Μήνα' },
  { value: 'balance_reminder', label: 'Υπενθύμιση Οφειλών' },
];

const RECURRENCE_TYPES = [
  { value: 'once', label: 'Μία Φορά' },
  { value: 'weekly', label: 'Εβδομαδιαία' },
  { value: 'biweekly', label: 'Κάθε 2 Εβδομάδες' },
  { value: 'monthly', label: 'Μηνιαία' },
];

const DAYS_OF_WEEK = [
  { value: '0', label: 'Δευτέρα' },
  { value: '1', label: 'Τρίτη' },
  { value: '2', label: 'Τετάρτη' },
  { value: '3', label: 'Πέμπτη' },
  { value: '4', label: 'Παρασκευή' },
  { value: '5', label: 'Σάββατο' },
  { value: '6', label: 'Κυριακή' },
];

export default function SettingsPanel() {
  const { buildings, selectedBuilding } = useBuilding();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    taskType: 'common_expense',
    buildingId: selectedBuilding?.id?.toString() ?? '',
    recurrenceType: 'monthly' as 'once' | 'weekly' | 'biweekly' | 'monthly',
    dayOfWeek: '0', // Monday default
    dayOfMonth: '31',
    timeToSend: '09:00',
    autoSend: true,
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

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => monthlyTasksApi.remove(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-tasks-settings'] });
      toast.success('Η αυτόματη αποστολή διαγράφηκε');
    },
    onError: () => {
      toast.error('Αποτυχία διαγραφής');
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: {
      task_type: 'common_expense' | 'balance_reminder' | 'custom';
      building?: number | null;
      recurrence_type: 'once' | 'weekly' | 'biweekly' | 'monthly';
      day_of_week?: number | null;
      day_of_month?: number | null;
      time_to_send: string;
      auto_send_enabled: boolean;
    }) => {
      // Use configure endpoint - template will be selected automatically by backend
      return monthlyTasksApi.configure({
        ...data,
        template: 0, // Backend will select appropriate template based on task_type
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-tasks-settings'] });
      toast.success('Η αυτόματη αποστολή δημιουργήθηκε');
      setShowAddDialog(false);
      // Reset form
      setFormData({
        taskType: 'common_expense',
        buildingId: selectedBuilding?.id?.toString() ?? '',
        recurrenceType: 'monthly',
        dayOfWeek: '0',
        dayOfMonth: '31',
        timeToSend: '09:00',
        autoSend: true,
      });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Αποτυχία δημιουργίας');
    },
  });

  const handleCreateTask = () => {
    const isWeekly = formData.recurrenceType === 'weekly' || formData.recurrenceType === 'biweekly';

    createTaskMutation.mutate({
      task_type: formData.taskType as 'common_expense' | 'balance_reminder' | 'custom',
      building: formData.buildingId ? parseInt(formData.buildingId) : null,
      recurrence_type: formData.recurrenceType,
      day_of_week: isWeekly ? parseInt(formData.dayOfWeek) : null,
      day_of_month: !isWeekly ? parseInt(formData.dayOfMonth) : null,
      time_to_send: formData.timeToSend,
      auto_send_enabled: formData.autoSend,
    });
  };

  const getRecurrenceLabel = (type: string) => {
    return RECURRENCE_TYPES.find(t => t.value === type)?.label || type;
  };

  const getDayOfWeekLabel = (day: number | null) => {
    if (day === null) return null;
    return DAYS_OF_WEEK.find(d => parseInt(d.value) === day)?.label || null;
  };

  const getTaskTypeLabel = (type: string) => {
    return TASK_TYPES.find(t => t.value === type)?.label || type;
  };

  const formatPeriod = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
  };

  const handleDeleteTask = (task: MonthlyNotificationTask) => {
    if (typeof window === 'undefined') return;
    const buildingLabel = task.building_name || 'Όλες οι πολυκατοικίες';
    const confirmMessage = `Διαγραφή κανόνα αυτόματης αποστολής για ${buildingLabel};`;
    if (!window.confirm(confirmMessage)) return;
    deleteTaskMutation.mutate(task.id);
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
          <div className="flex items-center gap-2">
            <Badge variant="outline">{tasks.length} ρυθμίσεις</Badge>
            <Button
              size="sm"
              onClick={() => setShowAddDialog(true)}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Νέα Αυτόματη Αποστολή
            </Button>
          </div>
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
                        <Badge variant="secondary" className="text-xs">
                          {task.recurrence_type_display || getRecurrenceLabel(task.recurrence_type || 'monthly')}
                        </Badge>
                        {(task.recurrence_type === 'weekly' || task.recurrence_type === 'biweekly') && task.day_of_week !== null ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{task.day_of_week_display || getDayOfWeekLabel(task.day_of_week)}</span>
                          </div>
                        ) : task.day_of_month ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Ημέρα {task.day_of_month}</span>
                          </div>
                        ) : null}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTask(task)}
                        className="text-red-500 hover:text-red-600"
                        aria-label="Διαγραφή"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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

      {/* Add New Task Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-600" />
              Νέα Αυτόματη Αποστολή
            </DialogTitle>
            <DialogDescription>
              Δημιουργήστε μια νέα προγραμματισμένη αποστολή που θα εκτελείται αυτόματα κάθε μήνα.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Task Type */}
            <div className="space-y-2">
              <Label htmlFor="taskType">Τύπος Αποστολής</Label>
              <Select
                value={formData.taskType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, taskType: value }))}
              >
                <SelectTrigger id="taskType">
                  <SelectValue placeholder="Επιλέξτε τύπο" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Building Selection */}
            <div className="space-y-2">
              <Label htmlFor="building">Πολυκατοικία</Label>
              <Select
                value={formData.buildingId || '_all_'}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  buildingId: value === '_all_' ? '' : value
                }))}
              >
                <SelectTrigger id="building">
                  <SelectValue placeholder="Επιλέξτε πολυκατοικία" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all_">Όλες οι πολυκατοικίες</SelectItem>
                  {buildings?.map((building) => (
                    <SelectItem key={building.id} value={building.id.toString()}>
                      {building.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recurrence Type */}
            <div className="space-y-2">
              <Label htmlFor="recurrenceType">Συχνότητα Επανάληψης</Label>
              <Select
                value={formData.recurrenceType}
                onValueChange={(value: 'once' | 'weekly' | 'biweekly' | 'monthly') =>
                  setFormData(prev => ({ ...prev, recurrenceType: value }))
                }
              >
                <SelectTrigger id="recurrenceType">
                  <SelectValue placeholder="Επιλέξτε συχνότητα" />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {formData.recurrenceType === 'weekly' && 'Αποστολή κάθε εβδομάδα την επιλεγμένη ημέρα'}
                {formData.recurrenceType === 'biweekly' && 'Αποστολή κάθε 2 εβδομάδες την επιλεγμένη ημέρα'}
                {formData.recurrenceType === 'monthly' && 'Αποστολή μία φορά τον μήνα την επιλεγμένη ημέρα'}
                {formData.recurrenceType === 'once' && 'Μία μόνο αποστολή'}
              </p>
            </div>

            {/* Day of Week - for weekly/biweekly */}
            {(formData.recurrenceType === 'weekly' || formData.recurrenceType === 'biweekly') && (
              <div className="space-y-2">
                <Label htmlFor="dayOfWeek">Ημέρα της Εβδομάδας</Label>
                <Select
                  value={formData.dayOfWeek}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, dayOfWeek: value }))}
                >
                  <SelectTrigger id="dayOfWeek">
                    <SelectValue placeholder="Επιλέξτε ημέρα" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Day of Month - for monthly/once */}
            {(formData.recurrenceType === 'monthly' || formData.recurrenceType === 'once') && (
              <div className="space-y-2">
                <Label htmlFor="dayOfMonth">Ημέρα του Μήνα</Label>
                <Select
                  value={formData.dayOfMonth}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, dayOfMonth: value }))}
                >
                  <SelectTrigger id="dayOfMonth">
                    <SelectValue placeholder="Επιλέξτε ημέρα" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}η ημέρα
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Συστήνεται η επιλογή ημέρας έως 28 για αποφυγή προβλημάτων με μικρούς μήνες
                </p>
              </div>
            )}

            {/* Time to Send */}
            <div className="space-y-2">
              <Label htmlFor="timeToSend">Ώρα Αποστολής</Label>
              <Input
                id="timeToSend"
                type="time"
                value={formData.timeToSend}
                onChange={(e) => setFormData(prev => ({ ...prev, timeToSend: e.target.value }))}
              />
            </div>

            {/* Auto Send Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="autoSend" className="font-medium">
                  Αυτόματη Αποστολή
                </Label>
                <p className="text-xs text-gray-500">
                  Αποστολή χωρίς επιβεβαίωση την καθορισμένη ημέρα
                </p>
              </div>
              <Switch
                id="autoSend"
                checked={formData.autoSend}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoSend: checked }))}
                className="data-[state=unchecked]:bg-gray-300 data-[state=checked]:bg-primary border-gray-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
            >
              Ακύρωση
            </Button>
            <Button
              onClick={handleCreateTask}
              disabled={createTaskMutation.isPending}
            >
              {createTaskMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Δημιουργία...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Δημιουργία
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Channel Configuration Panel Component
function ChannelConfigPanel() {
  interface ChannelInfo {
    id: NotificationChannel;
    name: string;
    description: string;
    icon: React.ReactNode;
    enabled: boolean;
    configured: boolean;
    configUrl?: string;
    color: string;
  }

  const channels: ChannelInfo[] = [
    {
      id: 'email',
      name: 'Email (MailerSend)',
      description: 'Αποστολή ειδοποιήσεων μέσω MailerSend API',
      icon: <Mail className="h-5 w-5" />,
      enabled: true,
      configured: true,
      color: 'text-blue-600',
    },
    {
      id: 'sms',
      name: 'SMS',
      description: 'Γραπτά μηνύματα στο κινητό (Apifon, Yuboto, Twilio)',
      icon: <MessageSquare className="h-5 w-5" />,
      enabled: false,
      configured: false,
      configUrl: '/settings/integrations/sms',
      color: 'text-green-600',
    },
    {
      id: 'viber',
      name: 'Viber',
      description: 'Μηνύματα μέσω Viber Business',
      icon: <Phone className="h-5 w-5" />,
      enabled: false,
      configured: false,
      configUrl: '/settings/integrations/viber',
      color: 'text-purple-600',
    },
    {
      id: 'push',
      name: 'Push Notifications',
      description: 'Ειδοποιήσεις στην εφαρμογή κινητού (Firebase)',
      icon: <Smartphone className="h-5 w-5" />,
      enabled: false,
      configured: false,
      configUrl: '/settings/integrations/firebase',
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Κανάλια Επικοινωνίας</h2>
          <p className="text-sm text-gray-500">
            Διαχείριση καναλιών αποστολής ειδοποιήσεων
          </p>
        </div>
      </div>

      {/* Channel Status Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {channels.map((channel) => (
          <Card
            key={channel.id}
            className={cn(
              'border-2 transition-all',
              channel.enabled
                ? 'border-green-200 bg-green-50'
                : 'border-gray-200 bg-gray-50'
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'p-2 rounded-full',
                  channel.enabled ? 'bg-white' : 'bg-gray-100',
                  channel.color
                )}>
                  {channel.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{channel.name}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        channel.enabled
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-gray-100 text-gray-500 border-gray-200'
                      )}
                    >
                      {channel.enabled ? 'Ενεργό' : 'Ανενεργό'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{channel.description}</p>
                  {!channel.configured && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Απαιτείται ρύθμιση
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Configuration Instructions */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Ρύθμιση Καναλιών</AlertTitle>
        <AlertDescription className="text-blue-700 mt-2 space-y-2">
          <p>
            Για να ενεργοποιήσετε τα επιπλέον κανάλια επικοινωνίας, χρειάζεται
            να ρυθμίσετε τους αντίστοιχους παρόχους:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>
              <strong>SMS:</strong> Σύνδεση με πάροχο SMS (Twilio, Vonage, Apifon, Yuboto)
            </li>
            <li>
              <strong>Viber:</strong> Δημιουργία Viber Business λογαριασμού
            </li>
            <li>
              <strong>Push:</strong> Ρύθμιση Firebase Cloud Messaging
            </li>
          </ul>
          <p className="text-xs mt-2">
            Επικοινωνήστε με την υποστήριξη για βοήθεια στη ρύθμιση.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Event Auto-Notifications Panel
function EventNotificationsPanel() {
  const [settings, setSettings] = useState({
    announcements: { enabled: true, channels: ['email'] as NotificationChannel[] },
    polls: { enabled: true, channels: ['email'] as NotificationChannel[] },
    requests: { enabled: false, channels: ['email'] as NotificationChannel[] },
  });

  const eventTypes = [
    {
      id: 'announcements',
      name: 'Νέες Ανακοινώσεις',
      description: 'Αυτόματη ειδοποίηση όταν δημιουργείται νέα ανακοίνωση',
      icon: <Bell className="h-5 w-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
    },
    {
      id: 'polls',
      name: 'Νέες Ψηφοφορίες',
      description: 'Αυτόματη ειδοποίηση για νέες ψηφοφορίες/συνελεύσεις',
      icon: <Bell className="h-5 w-5" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 border-purple-200',
    },
    {
      id: 'requests',
      name: 'Νέα Αιτήματα',
      description: 'Ειδοποίηση για νέα αιτήματα ενοίκων (μόνο διαχειριστές)',
      icon: <Bell className="h-5 w-5" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
    },
  ];

  const channels: { id: NotificationChannel; label: string; icon: React.ReactNode; enabled: boolean }[] = [
    { id: 'email', label: 'Email', icon: <Mail className="h-4 w-4" />, enabled: true },
    { id: 'sms', label: 'SMS', icon: <MessageSquare className="h-4 w-4" />, enabled: false },
    { id: 'viber', label: 'Viber', icon: <Phone className="h-4 w-4" />, enabled: false },
    { id: 'push', label: 'Push', icon: <Smartphone className="h-4 w-4" />, enabled: false },
  ];

  const toggleEventEnabled = (eventId: string) => {
    setSettings(prev => ({
      ...prev,
      [eventId]: {
        ...prev[eventId as keyof typeof prev],
        enabled: !prev[eventId as keyof typeof prev].enabled,
      },
    }));
  };

  const toggleEventChannel = (eventId: string, channel: NotificationChannel) => {
    setSettings(prev => {
      const current = prev[eventId as keyof typeof prev];
      const newChannels = current.channels.includes(channel)
        ? current.channels.filter(c => c !== channel)
        : [...current.channels, channel];
      return {
        ...prev,
        [eventId]: { ...current, channels: newChannels },
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Αυτόματες Ειδοποιήσεις Συμβάντων</h2>
          <p className="text-sm text-gray-500">
            Αυτόματη ενημέρωση ενοίκων για νέα συμβάντα στο κτίριο
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Alert className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <Info className="h-4 w-4 text-indigo-600" />
        <AlertTitle className="text-indigo-900">Πώς λειτουργεί</AlertTitle>
        <AlertDescription className="text-indigo-700 mt-2">
          <p>
            Όταν δημιουργείται νέα ανακοίνωση, ψηφοφορία ή αίτημα, το σύστημα στέλνει
            <strong> αυτόματα </strong> ειδοποίηση στους ενοίκους μέσω των επιλεγμένων καναλιών.
          </p>
          <p className="mt-2 text-sm">
            Το μήνυμα περιλαμβάνει: Τίτλο, σύντομη περιγραφή και πρόσκληση
            <em> "Δείτε λεπτομέρειες στην εφαρμογή σας"</em>
          </p>
        </AlertDescription>
      </Alert>

      {/* Event Types */}
      <div className="space-y-4">
        {eventTypes.map((event) => {
          const eventSettings = settings[event.id as keyof typeof settings];

          return (
            <Card
              key={event.id}
              className={cn(
                'border-2 transition-all',
                eventSettings.enabled ? event.bgColor : 'border-gray-200 bg-gray-50'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'p-2 rounded-full',
                      eventSettings.enabled ? 'bg-white' : 'bg-gray-100',
                      event.color
                    )}>
                      {event.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{event.name}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            eventSettings.enabled
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          )}
                        >
                          {eventSettings.enabled ? 'Ενεργό' : 'Ανενεργό'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{event.description}</p>

                      {/* Channel Selection */}
                      {eventSettings.enabled && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {channels.map((channel) => {
                            const isSelected = eventSettings.channels.includes(channel.id);
                            return (
                              <button
                                key={channel.id}
                                onClick={() => channel.enabled && toggleEventChannel(event.id, channel.id)}
                                disabled={!channel.enabled}
                                className={cn(
                                  'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all',
                                  !channel.enabled && 'opacity-50 cursor-not-allowed',
                                  isSelected && channel.enabled
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                )}
                              >
                                {channel.icon}
                                {channel.label}
                                {!channel.enabled && (
                                  <span className="text-[10px] opacity-70">(σύντομα)</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <Switch
                    checked={eventSettings.enabled}
                    onCheckedChange={() => toggleEventEnabled(event.id)}
                    className="data-[state=unchecked]:bg-gray-300 data-[state=checked]:bg-primary border-gray-400"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview */}
      <Card className="bg-slate-50 border-slate-200">
        <CardHeader>
          <CardTitle className="text-sm text-slate-700 flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Παράδειγμα Ειδοποίησης
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <p className="font-semibold text-gray-900">📢 Νέα Ανακοίνωση: Εργασίες Συντήρησης Ανελκυστήρα</p>
            <p className="text-gray-600 mt-2">
              Ενημερώνουμε ότι θα πραγματοποιηθεί ετήσια συντήρηση του ανελκυστήρα...
            </p>
            <p className="text-blue-600 mt-3 font-medium">
              👉 Δείτε λεπτομέρειες στην εφαρμογή σας
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="gap-2">
          Αποθήκευση Ρυθμίσεων
        </Button>
      </div>
    </div>
  );
}

// Extended Settings Panel with Tabs
export function ExtendedSettingsPanel() {
  const [activeTab, setActiveTab] = useState('automation');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Αυτοματισμοί
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Συμβάντα
          </TabsTrigger>
          <TabsTrigger value="channels" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Κανάλια
          </TabsTrigger>
        </TabsList>

        <TabsContent value="automation" className="mt-6">
          <SettingsPanel />
        </TabsContent>

        <TabsContent value="events" className="mt-6">
          <EventNotificationsPanel />
        </TabsContent>

        <TabsContent value="channels" className="mt-6">
          <ChannelConfigPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
