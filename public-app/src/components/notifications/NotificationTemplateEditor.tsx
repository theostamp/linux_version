'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Copy,
  Eye,
  Loader2,
  Mail,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react';
import { notificationTemplatesApi } from '@/lib/api/notifications';
import type { NotificationCategory, NotificationTemplate } from '@/types/notifications';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  announcement: 'Ανακοίνωση',
  payment: 'Πληρωμή',
  maintenance: 'Συντήρηση',
  meeting: 'Συνέλευση',
  emergency: 'Επείγον',
  reminder: 'Υπενθύμιση',
};

type TemplateFormState = {
  name: string;
  category: NotificationCategory;
  description: string;
  subject: string;
  body_template: string;
  sms_template: string;
  is_active: boolean;
  building: number | null;
};

const buildInitialFormState = (buildingId: number | null): TemplateFormState => ({
  name: '',
  category: 'announcement',
  description: '',
  subject: '',
  body_template: '',
  sms_template: '',
  is_active: true,
  building: buildingId,
});

const formatDate = (value?: string) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('el-GR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return value;
  }
};

const buildPresetTemplates = (buildingId: number | null): TemplateFormState[] => [
  {
    name: 'Ανακοίνωση Γενικής Συνέλευσης',
    category: 'meeting',
    description: 'Πρόσκληση με ημερομηνία, ώρα και θέματα ημερήσιας διάταξης',
    subject: 'Πρόσκληση σε γενική συνέλευση {{ meeting_date }}',
    body_template:
      'Αγαπητοί συνιδιοκτήτες,\n\nΣας προσκαλούμε στη γενική συνέλευση της πολυκατοικίας {{ building_name }} την {{ meeting_date }} στις {{ meeting_time }} στο {{ meeting_location }}.\n\nΘέματα:\n{{ agenda_items }}\n\nΠαρακαλούμε επιβεβαιώστε παρουσία και τυχόν θέματα προς προσθήκη.\n\nΜε εκτίμηση,\n{{ contact_name }}',
    sms_template:
      'Γενική συνέλευση {{ building_name }} στις {{ meeting_date }} {{ meeting_time }} στο {{ meeting_location }}. Θέματα: {{ agenda_short }}',
    is_active: true,
    building: buildingId,
  },
  {
    name: 'Υπενθύμιση Οφειλής Κοινοχρήστων',
    category: 'payment',
    description: 'Ήπια υπενθύμιση για καθυστερημένες οφειλές',
    subject: 'Υπενθύμιση οφειλής κοινοχρήστων {{ month_name }}',
    body_template:
      'Καλησπέρα {{ recipient_name }},\n\nΣτον έλεγχο κοινοχρήστων για το {{ month_name }} προκύπτει υπόλοιπο {{ total_due }}.\nΠαρακαλούμε τακτοποιήστε έως {{ due_date }} στους παρακάτω λογαριασμούς:\n{{ payment_instructions }}\n\nΓια απορίες επικοινωνήστε μαζί μας.\n\nΕυχαριστούμε,\nΔιαχείριση {{ building_name }}',
    sms_template:
      '{{ recipient_name }}, υπόλοιπο κοινοχρήστων {{ month_name }}: {{ total_due }}. Προθεσμία {{ due_date }}. {{ payment_short_instructions }}',
    is_active: true,
    building: buildingId,
  },
  {
    name: 'Ενημέρωση Κοινοχρήστων Μήνα',
    category: 'reminder',
    description: 'Σύντομη ενημέρωση για νέα κοινοχρήστων και σύνδεσμο σε PDF',
    subject: 'Κοινοχρήστα {{ month_name }} - σύνοψη για {{ building_name }}',
    body_template:
      'Γεια σας,\n\nΑναρτήθηκαν τα κοινοχρήστα {{ month_name }} για {{ building_name }}.\n\nΣύνοψη:\n- Συνολικό ποσό: {{ total_amount }}\n- Προθεσμία: {{ due_date }}\n- Λήψη αναλυτικού PDF: {{ pdf_url }}\n\nΑν έχετε απορίες επικοινωνήστε με τη διαχείριση.\n\nΕυχαριστούμε,\nΔιαχείριση {{ building_name }}',
    sms_template:
      'Κοινοχρήστα {{ month_name }} διαθέσιμα. Σύνολο {{ total_amount }}, προθεσμία {{ due_date }}. PDF: {{ pdf_url }}',
    is_active: true,
    building: buildingId,
  },
  {
    name: 'Προγραμματισμένη Συντήρηση/Εργασία',
    category: 'maintenance',
    description: 'Ειδοποίηση για εργασίες (ασανσέρ, καθαρισμός, θέρμανση)',
    subject: 'Προγραμματισμένη συντήρηση {{ maintenance_date }}',
    body_template:
      'Καλησπέρα σε όλους,\n\nΤην {{ maintenance_date }} και ώρα {{ maintenance_time }} θα πραγματοποιηθεί {{ maintenance_scope }} στο {{ building_name }}.\n\nΕνδεικτικά:\n- Εργασία: {{ maintenance_title }}\n- Υπεύθυνος: {{ vendor_name }} ({{ vendor_phone }})\n- Εκτιμώμενη διάρκεια: {{ maintenance_duration }}\n\nΠαρακαλούμε φροντίστε για πρόσβαση όπου χρειάζεται.\n\nΕυχαριστούμε,\nΔιαχείριση',
    sms_template:
      '{{ building_name }}: {{ maintenance_title }} στις {{ maintenance_date }} {{ maintenance_time }}. Διάρκεια {{ maintenance_duration }}. Επικοινωνία: {{ vendor_phone }}',
    is_active: true,
    building: buildingId,
  },
  {
    name: 'Έκτακτη Ενημέρωση / Βλάβη',
    category: 'emergency',
    description: 'Γρήγορη ενημέρωση για βλάβες ή επείγοντα θέματα',
    subject: 'Επείγουσα ενημέρωση: {{ issue_title }}',
    body_template:
      'Προέκυψε επείγον θέμα στο {{ building_name }}: {{ issue_title }}.\n\nΣύνοψη:\n{{ issue_description }}\n\nΕπόμενα βήματα:\n{{ next_actions }}\n\nΓια άμεση επικοινωνία: {{ contact_phone }}.\n\nΕυχαριστούμε για τη συνεργασία.',
    sms_template:
      'Επείγον {{ building_name }}: {{ issue_title }}. {{ next_actions_short }} Επικοινωνία: {{ contact_phone }}',
    is_active: true,
    building: buildingId,
  },
];

export default function NotificationTemplateEditor() {
  const { buildings, selectedBuilding, currentBuilding } = useBuilding();
  const buildingId = selectedBuilding?.id ?? currentBuilding?.id ?? null;
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | NotificationCategory>('all');
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<NotificationTemplate | null>(null);
  const [formState, setFormState] = useState<TemplateFormState>(buildInitialFormState(buildingId));
  const [previewContext, setPreviewContext] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  const {
    data: templates = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<NotificationTemplate[]>({
    queryKey: ['notificationTemplates', buildingId ?? 'all'],
    queryFn: () => notificationTemplatesApi.list(buildingId ? { building: buildingId } : undefined),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    // Keep the default building pre-selected when creating new templates
    if (!editingTemplate) {
      setFormState((prev) => ({
        ...prev,
        building: buildingId,
      }));
    }
  }, [buildingId, editingTemplate]);

  const saveTemplateMutation = useMutation({
    mutationFn: (payload: TemplateFormState) => {
      const body = {
        name: payload.name.trim(),
        category: payload.category,
        description: payload.description.trim(),
        subject: payload.subject.trim(),
        body_template: payload.body_template,
        sms_template: payload.sms_template,
        is_active: payload.is_active,
        building: payload.building ?? undefined,
      };

      if (editingTemplate) {
        return notificationTemplatesApi.update(editingTemplate.id, body);
      }
      return notificationTemplatesApi.create(body);
    },
    onSuccess: async () => {
      toast.success(
        editingTemplate ? 'Το πρότυπο ενημερώθηκε επιτυχώς' : 'Το πρότυπο δημιουργήθηκε επιτυχώς'
      );
      setIsDialogOpen(false);
      setEditingTemplate(null);
      setFormState(buildInitialFormState(buildingId));
      await queryClient.invalidateQueries({ queryKey: ['notificationTemplates'] });
      await queryClient.refetchQueries({ queryKey: ['notificationTemplates'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Αποτυχία αποθήκευσης προτύπου');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => notificationTemplatesApi.delete(id),
    onSuccess: async () => {
      toast.success('Το πρότυπο διαγράφηκε');
      await queryClient.invalidateQueries({ queryKey: ['notificationTemplates'] });
      await queryClient.refetchQueries({ queryKey: ['notificationTemplates'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Αποτυχία διαγραφής προτύπου');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, nextActive }: { id: number; nextActive: boolean }) =>
      notificationTemplatesApi.update(id, { is_active: nextActive }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notificationTemplates'] });
      await queryClient.refetchQueries({ queryKey: ['notificationTemplates'] });
      toast.success('Η κατάσταση του προτύπου ενημερώθηκε');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Δεν ήταν δυνατή η ενημέρωση');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (template: NotificationTemplate) =>
      notificationTemplatesApi.create({
        name: `${template.name} (αντίγραφο)`,
        category: template.category,
        description: template.description,
        subject: template.subject,
        body_template: template.body_template,
        sms_template: template.sms_template,
        is_active: template.is_active,
        building: buildingId ?? template.building ?? undefined,
      }),
    onSuccess: async () => {
      toast.success('Δημιουργήθηκε αντίγραφο προτύπου');
      await queryClient.invalidateQueries({ queryKey: ['notificationTemplates'] });
      await queryClient.refetchQueries({ queryKey: ['notificationTemplates'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Αποτυχία αντιγραφής προτύπου');
    },
  });

  const previewMutation = useMutation({
    mutationFn: ({ templateId, context }: { templateId: number; context: Record<string, string> }) =>
      notificationTemplatesApi.preview({ template_id: templateId, context }),
    onError: () => {
      toast.error('Αποτυχία προεπισκόπησης προτύπου');
    },
  });

  const quickCreatePresetsMutation = useMutation({
    mutationFn: async () => {
      const presets = buildPresetTemplates(buildingId);
      const existingNames = new Set(templates.map((t) => t.name));
      const toCreate = presets.filter((preset) => !existingNames.has(preset.name));

      if (toCreate.length === 0) {
        return { created: 0, skipped: presets.length };
      }

      for (const preset of toCreate) {
        await notificationTemplatesApi.create({
          ...preset,
          building: preset.building ?? undefined,
        });
      }

      return { created: toCreate.length, skipped: presets.length - toCreate.length };
    },
    onSuccess: async ({ created, skipped }) => {
      if (created === 0) {
        toast.info('Όλα τα έτοιμα πρότυπα υπάρχουν ήδη για αυτή την προβολή');
      } else {
        toast.success(
          `Προστέθηκαν ${created} έτοιμα πρότυπα${skipped ? ` (${skipped} παραλείφθηκαν)` : ''}`
        );
      }
      await queryClient.invalidateQueries({ queryKey: ['notificationTemplates'] });
      await queryClient.refetchQueries({ queryKey: ['notificationTemplates'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Αποτυχία προσθήκης έτοιμων προτύπων');
    },
  });

  const filteredTemplates = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return templates
      .filter((template) => (showOnlyActive ? template.is_active : true))
      .filter((template) => (categoryFilter === 'all' ? true : template.category === categoryFilter))
      .filter((template) => {
        if (!term) return true;
        return (
          template.name.toLowerCase().includes(term) ||
          template.description?.toLowerCase().includes(term) ||
          template.subject?.toLowerCase().includes(term)
        );
      });
  }, [templates, searchTerm, categoryFilter, showOnlyActive]);

  const stats = useMemo(() => {
    const active = templates.filter((t) => t.is_active).length;
    const inactive = templates.length - active;
    const system = templates.filter((t) => t.is_system).length;
    return [
      { title: 'Ενεργά', value: active, subtitle: 'Έτοιμα προς χρήση' },
      { title: 'Ανενεργά', value: inactive, subtitle: 'Σε αναμονή' },
      { title: 'Συστημικά', value: system, subtitle: 'Κλειδωμένα templates' },
    ];
  }, [templates]);

  const handleOpenDialog = (template?: NotificationTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormState({
        name: template.name,
        category: template.category,
        description: template.description || '',
        subject: template.subject || '',
        body_template: template.body_template || '',
        sms_template: template.sms_template || '',
        is_active: template.is_active,
        building: template.building ?? null,
      });
    } else {
      setEditingTemplate(null);
      setFormState(buildInitialFormState(buildingId));
    }
    setIsDialogOpen(true);
  };

  const handleDelete = (template: NotificationTemplate) => {
    if (template.is_system) {
      toast.error('Τα συστημικά πρότυπα δεν μπορούν να διαγραφούν');
      return;
    }
    const confirmed = window.confirm('Να διαγραφεί οριστικά το πρότυπο;');
    if (confirmed) {
      deleteTemplateMutation.mutate(template.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim() || !formState.subject.trim() || !formState.body_template.trim()) {
      toast.error('Συμπληρώστε τουλάχιστον όνομα, θέμα και σώμα email');
      return;
    }
    saveTemplateMutation.mutate(formState);
  };

  const setPreviewForTemplate = (template: NotificationTemplate) => {
    const context: Record<string, string> = {};
    (template.available_variables || []).forEach((key) => {
      context[key] = previewContext[key] ?? '';
    });
    setPreviewContext(context);
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
    previewMutation.mutate({ templateId: template.id, context });
  };

  const selectedTemplateBuildingName = (template: NotificationTemplate) => {
    if (template.building === null || template.building === undefined) return 'Όλα τα κτίρια';
    const found = buildings.find((b) => b.id === template.building);
    return found?.name || `Κτίριο #${template.building}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Πρότυπα Ειδοποιήσεων</h2>
          <p className="text-sm text-gray-500">
            Διαχειριστείτε κεντρικά τα email / SMS που χρησιμοποιούνται στις ειδοποιήσεις
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Ανανέωση...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Ανανέωση
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => quickCreatePresetsMutation.mutate()}
            disabled={quickCreatePresetsMutation.isLoading}
          >
            {quickCreatePresetsMutation.isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Φόρτωση...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Προσθήκη έτοιμων προτύπων
              </>
            )}
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Νέο πρότυπο
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((item) => (
          <Card key={item.title} className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{item.value}</div>
              <p className="text-xs text-gray-500">{item.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200">
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px]">
              <Input
                placeholder="Αναζήτηση με όνομα, περιγραφή ή θέμα..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              value={categoryFilter}
              onValueChange={(value) =>
                setCategoryFilter(value === 'all' ? 'all' : (value as NotificationCategory))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Κατηγορία" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Όλες οι κατηγορίες</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch checked={showOnlyActive} onCheckedChange={(checked) => setShowOnlyActive(!!checked)} />
              <span className="text-sm text-gray-600">Μόνο ενεργά</span>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="h-20 w-full animate-pulse rounded-xl border border-dashed border-slate-200 bg-slate-50" />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Δεν ήταν δυνατή η φόρτωση των προτύπων. Δοκιμάστε ξανά.
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-500">
              Δεν βρέθηκαν πρότυπα για τα φίλτρα που επιλέχθηκαν.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="border-slate-200 shadow-sm">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                          <Badge
                            className={cn(
                              'capitalize',
                              template.is_active
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            )}
                          >
                            {template.is_active ? 'Ενεργό' : 'Ανενεργό'}
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1 text-xs">
                            <Tag className="h-3 w-3" />
                            {CATEGORY_LABELS[template.category] || template.category_display}
                          </Badge>
                          {template.is_system && (
                            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                              Σύστημα
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {template.description || 'Δεν έχει προστεθεί περιγραφή.'}
                        </p>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                          <span className="rounded-full bg-slate-100 px-2 py-1">
                            {selectedTemplateBuildingName(template)}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1">
                            Τελευταία ενημέρωση: {formatDate(template.updated_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Switch
                          checked={template.is_active}
                          disabled={toggleActiveMutation.isLoading}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({ id: template.id, nextActive: !!checked })
                          }
                        />
                        <span>{template.is_active ? 'Ενεργό' : 'Ανενεργό'}</span>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Mail className="h-4 w-4 text-indigo-500" />
                          <span>Θέμα</span>
                        </div>
                        <p className="mt-1 text-sm text-gray-900 line-clamp-2">{template.subject}</p>
                        <p className="mt-2 text-xs text-gray-600 line-clamp-2 whitespace-pre-wrap">
                          {template.body_template}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <MessageSquare className="h-4 w-4 text-amber-600" />
                          <span>SMS</span>
                        </div>
                        <p className="mt-1 text-sm text-gray-900 line-clamp-3 whitespace-pre-wrap">
                          {template.sms_template || 'Δεν έχει οριστεί SMS'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {template.available_variables && template.available_variables.length > 0 ? (
                        template.available_variables.map((variable) => (
                          <Badge key={variable} variant="outline" className="text-xs">
                            {`{{ ${variable} }}`}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500">Δεν υπάρχουν μεταβλητές</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewForTemplate(template)}
                        disabled={previewMutation.isLoading}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Προεπισκόπηση
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => duplicateMutation.mutate(template)}
                        disabled={duplicateMutation.isLoading}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Δημιουργία αντιγράφου
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleOpenDialog(template)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Επεξεργασία
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(template)}
                        disabled={deleteTemplateMutation.isLoading}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Διαγραφή
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Επεξεργασία προτύπου' : 'Νέο πρότυπο'}</DialogTitle>
            <DialogDescription>
              Ορίστε κείμενα email και SMS που θα χρησιμοποιούνται στις ειδοποιήσεις
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Όνομα προτύπου</Label>
                <Input
                  id="name"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Κατηγορία</Label>
                <Select
                  value={formState.category}
                  onValueChange={(value) =>
                    setFormState({ ...formState, category: value as NotificationCategory })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Περιγραφή</Label>
              <Textarea
                id="description"
                value={formState.description}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                placeholder="Σύντομη περιγραφή για εσωτερική χρήση"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="subject">Θέμα email</Label>
                <Input
                  id="subject"
                  value={formState.subject}
                  onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Κτίριο</Label>
                <Select
                  value={formState.building?.toString() ?? 'all'}
                  onValueChange={(value) =>
                    setFormState({
                      ...formState,
                      building: value === 'all' ? null : parseInt(value, 10),
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
                <p className="mt-1 text-xs text-gray-500">
                  Αν δεν επιλεγεί κτίριο, το πρότυπο είναι διαθέσιμο σε όλα.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="body">Σώμα email</Label>
                <Textarea
                  id="body"
                  value={formState.body_template}
                  onChange={(e) => setFormState({ ...formState, body_template: e.target.value })}
                  rows={6}
                  placeholder="Χρησιμοποιήστε μεταβλητές όπως {{ recipient_name }}"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sms">Μήνυμα SMS (προαιρετικό)</Label>
                <Textarea
                  id="sms"
                  value={formState.sms_template}
                  onChange={(e) => setFormState({ ...formState, sms_template: e.target.value })}
                  rows={6}
                  placeholder="Σύντομο κείμενο για SMS"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formState.is_active}
                  onCheckedChange={(checked) => setFormState({ ...formState, is_active: !!checked })}
                />
                <Label htmlFor="is_active" className="text-sm">
                  Ενεργό πρότυπο
                </Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>
                  Άκυρο
                </Button>
                <Button type="submit" disabled={saveTemplateMutation.isLoading}>
                  {saveTemplateMutation.isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Αποθήκευση...
                    </>
                  ) : editingTemplate ? (
                    'Αποθήκευση αλλαγών'
                  ) : (
                    'Δημιουργία'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isPreviewOpen}
        onOpenChange={(open) => {
          setIsPreviewOpen(open);
          if (!open) {
            setPreviewTemplate(null);
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Προεπισκόπηση προτύπου</DialogTitle>
            <DialogDescription>
              Δοκιμάστε τα δυναμικά πεδία και δείτε το τελικό κείμενο
            </DialogDescription>
          </DialogHeader>

          {previewTemplate ? (
            <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  Μεταβλητές
                </div>
                {previewTemplate.available_variables && previewTemplate.available_variables.length > 0 ? (
                  <div className="space-y-2">
                    {previewTemplate.available_variables.map((variable) => (
                      <div key={variable} className="space-y-1">
                        <Label className="text-xs font-medium text-gray-600">
                          {`{{ ${variable} }}`}
                        </Label>
                        <Input
                          value={previewContext[variable] ?? ''}
                          onChange={(e) =>
                            setPreviewContext((prev) => ({
                              ...prev,
                              [variable]: e.target.value,
                            }))
                          }
                          placeholder="Τιμή μεταβλητής"
                        />
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        previewMutation.mutate({
                          templateId: previewTemplate.id,
                          context: previewContext,
                        })
                      }
                      disabled={previewMutation.isLoading}
                    >
                      {previewMutation.isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Φόρτωση...
                        </>
                      ) : (
                        'Ενημέρωση προεπισκόπησης'
                      )}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Δεν υπάρχουν μεταβλητές σε αυτό το πρότυπο.</p>
                )}
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="h-4 w-4 text-indigo-500" />
                      Email
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="rounded-lg bg-slate-50 p-3 text-sm text-gray-900">
                      <span className="font-semibold">Θέμα:</span>{' '}
                      {previewMutation.data?.subject || previewTemplate.subject}
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 text-sm text-gray-900 whitespace-pre-wrap">
                      {previewMutation.isLoading ? 'Φόρτωση...' : previewMutation.data?.body || previewTemplate.body_template}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm text-gray-500">
                      <MessageSquare className="h-4 w-4 text-amber-600" />
                      SMS
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg bg-slate-50 p-3 text-sm text-gray-900 whitespace-pre-wrap">
                      {previewMutation.isLoading ? 'Φόρτωση...' : previewMutation.data?.sms || previewTemplate.sms_template || 'Δεν έχει οριστεί SMS'}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-gray-600">
              Επιλέξτε ένα πρότυπο για προεπισκόπηση.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
