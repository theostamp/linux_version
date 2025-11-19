'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, Mail, Calendar, Clock, Building2, FileText, ToggleLeft, ToggleRight } from 'lucide-react';
import { monthlyTasksApi, notificationTemplatesApi } from '@/lib/api/notifications';
import type { MonthlyNotificationTask, NotificationTemplate } from '@/types/notifications';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const TASK_TYPE_OPTIONS = [
  { value: 'common_expense', label: 'Λογαριασμός Κοινοχρήστων' },
  { value: 'balance_reminder', label: 'Υπενθύμιση Οφειλών' },
  { value: 'custom', label: 'Προσαρμοσμένη' },
];

export default function MonthlyTasksManager() {
  const { buildings, selectedBuilding } = useBuilding();
  const queryClient = useQueryClient();
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedTaskForPreview, setSelectedTaskForPreview] = useState<number | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [selectedTaskForTest, setSelectedTaskForTest] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    task_type: 'common_expense' as 'common_expense' | 'balance_reminder' | 'custom',
    building: selectedBuilding?.id ?? null,
    day_of_month: 1,
    time_to_send: '09:00',
    template: '',
    auto_send_enabled: false,
  });

  // Fetch scheduled tasks
  const {
    data: tasks = [],
    isLoading: tasksLoading,
    refetch: refetchTasks,
  } = useQuery<MonthlyNotificationTask[]>({
    queryKey: ['monthlyTasks', selectedBuilding?.id],
    queryFn: () => monthlyTasksApi.schedule({ building_id: selectedBuilding?.id }),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch templates
  const {
    data: templates = [],
    isLoading: templatesLoading,
  } = useQuery<NotificationTemplate[]>({
    queryKey: ['notificationTemplates'],
    queryFn: () => notificationTemplatesApi.list({ is_active: true }),
    staleTime: 10 * 60 * 1000,
  });

  // Configure task mutation
  const configureMutation = useMutation({
    mutationFn: (data: typeof formData) => monthlyTasksApi.configure({
      task_type: data.task_type,
      building: data.building,
      day_of_month: data.day_of_month,
      time_to_send: data.time_to_send,
      template: parseInt(data.template),
      auto_send_enabled: data.auto_send_enabled,
    }),
    onSuccess: async () => {
      toast.success('Η μηνιαία ειδοποίηση ρυθμίστηκε επιτυχώς');
      setIsConfigDialogOpen(false);
      // ✅ Invalidate AND explicitly refetch for immediate UI update
      await queryClient.invalidateQueries({ queryKey: ['monthlyTasks'] });
      await queryClient.refetchQueries({ queryKey: ['monthlyTasks'] });
      // Reset form
      setFormData({
        task_type: 'common_expense',
        building: selectedBuilding?.id ?? null,
        day_of_month: 1,
        time_to_send: '09:00',
        template: '',
        auto_send_enabled: false,
      });
    },
    onError: (error: any) => {
      toast.error(`Σφάλμα: ${error.message || 'Αποτυχία ρύθμισης'}`);
    },
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: (taskId: number) => monthlyTasksApi.preview(taskId),
    onSuccess: () => {
      setIsPreviewDialogOpen(true);
    },
  });

  // Test send mutation
  const testSendMutation = useMutation({
    mutationFn: ({ taskId, email }: { taskId: number; email: string }) =>
      monthlyTasksApi.testSend(taskId, email),
    onSuccess: (data) => {
      toast.success(data.message);
      setIsTestDialogOpen(false);
      setTestEmail('');
    },
    onError: (error: any) => {
      toast.error(`Σφάλμα: ${error.message || 'Αποτυχία αποστολής'}`);
    },
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
      await queryClient.refetchQueries({ queryKey: ['monthlyTasks'] });
      toast.success('Η αυτόματη αποστολή ενημερώθηκε');
    },
  });

  const handlePreview = (taskId: number) => {
    setSelectedTaskForPreview(taskId);
    previewMutation.mutate(taskId);
  };

  const handleTestSend = (taskId: number) => {
    setSelectedTaskForTest(taskId);
    setIsTestDialogOpen(true);
  };

  const handleSubmitTest = () => {
    if (!testEmail || !selectedTaskForTest) return;
    testSendMutation.mutate({ taskId: selectedTaskForTest, email: testEmail });
  };

  const previewData = previewMutation.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Μηνιαίες Αυτόματες Ειδοποιήσεις</h2>
          <p className="text-sm text-gray-500">
            Ρυθμίστε αυτόματες ειδοποιήσεις που θα αποστέλλονται τις πρώτες μέρες κάθε μήνα
          </p>
        </div>
        <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Νέο Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ρύθμιση Μηνιαίας Ειδοποίησης</DialogTitle>
              <DialogDescription>
                Δημιουργήστε μια νέα μηνιαία ειδοποίηση που θα αποστέλλεται αυτόματα
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="task_type">Τύπος Task</Label>
                <Select
                  value={formData.task_type}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, task_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="building">Κτίριο (Προαιρετικό)</Label>
                <Select
                  value={formData.building?.toString() || 'all'}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      building: value === 'all' ? null : parseInt(value),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Όλα τα κτίρια</SelectItem>
                    {buildings.map((building) => (
                      <SelectItem key={building.id} value={building.id.toString()}>
                        {building.name || building.street}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="day_of_month">Ημέρα Μήνα</Label>
                  <Input
                    id="day_of_month"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.day_of_month}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        day_of_month: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="time_to_send">Ώρα Αποστολής</Label>
                  <Input
                    id="time_to_send"
                    type="time"
                    value={formData.time_to_send}
                    onChange={(e) =>
                      setFormData({ ...formData, time_to_send: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="template">Πρότυπο</Label>
                <Select
                  value={formData.template}
                  onValueChange={(value) => setFormData({ ...formData, template: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε πρότυπο" />
                  </SelectTrigger>
                  <SelectContent>
                    {templatesLoading ? (
                      <SelectItem value="loading" disabled>
                        Φόρτωση...
                      </SelectItem>
                    ) : templates.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Δεν υπάρχουν πρότυπα
                      </SelectItem>
                    ) : (
                      templates.map((template) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name} ({template.category_display})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto_send"
                  checked={formData.auto_send_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, auto_send_enabled: checked })
                  }
                />
                <Label htmlFor="auto_send" className="cursor-pointer">
                  Ενεργοποίηση αυτόματης αποστολής
                </Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsConfigDialogOpen(false)}
                >
                  Ακύρωση
                </Button>
                <Button
                  onClick={() => configureMutation.mutate(formData)}
                  disabled={!formData.template || configureMutation.isPending}
                >
                  {configureMutation.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {tasksLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, idx) => (
            <Card key={idx} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 w-1/3 rounded bg-slate-200" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            Δεν υπάρχουν προγραμματισμένα tasks. Δημιουργήστε ένα νέο task για να ξεκινήσετε.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {task.task_type_display}
                      </h3>
                      <Badge variant="outline">{task.status_display}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        <span>{task.building_name || 'Όλα τα κτίρια'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Ημέρα {task.day_of_month}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{task.time_to_send}</span>
                      </div>
                      {task.template_name && (
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          <span>{task.template_name}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      Περίοδος: {new Date(task.period_month).toLocaleDateString('el-GR', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
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
                      <span className="text-xs text-gray-600">
                        {task.auto_send_enabled ? 'Αυτόματη' : 'Χειροκίνητη'}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(task.id)}
                      disabled={previewMutation.isPending}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestSend(task.id)}
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Test
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Ειδοποίησης</DialogTitle>
            <DialogDescription>
              Προεπισκόπηση της ειδοποίησης που θα αποσταλεί
            </DialogDescription>
          </DialogHeader>
          {previewMutation.isPending ? (
            <div className="p-8 text-center">Φόρτωση preview...</div>
          ) : previewData ? (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Θέμα</Label>
                <div className="mt-1 p-3 bg-slate-50 rounded border">
                  {previewData.subject}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Περιεχόμενο</Label>
                <div className="mt-1 p-3 bg-slate-50 rounded border whitespace-pre-wrap">
                  {previewData.body}
                </div>
              </div>
              {previewData.sms && (
                <div>
                  <Label className="text-sm font-medium">SMS</Label>
                  <div className="mt-1 p-3 bg-slate-50 rounded border">
                    {previewData.sms}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-red-500">
              Σφάλμα φόρτωσης preview
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Test Send Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Δοκιμαστική Αποστολή</DialogTitle>
            <DialogDescription>
              Στείλτε μια δοκιμαστική ειδοποίηση σε συγκεκριμένο email
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="test_email">Email</Label>
              <Input
                id="test_email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>
                Ακύρωση
              </Button>
              <Button
                onClick={handleSubmitTest}
                disabled={!testEmail || testSendMutation.isPending}
              >
                {testSendMutation.isPending ? 'Αποστολή...' : 'Αποστολή'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
