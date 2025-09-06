'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRole } from '@/lib/auth';
import { api, getActiveBuildingId, makeRequestWithRetry } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackButton } from '@/components/ui/BackButton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const schema = z.object({
  title: z.string().trim().min(3, 'Ο τίτλος πρέπει να έχει τουλάχιστον 3 χαρακτήρες').max(100, 'Ο τίτλος δεν μπορεί να ξεπερνά τους 100 χαρακτήρες'),
  description: z.string().trim().min(1, 'Η περιγραφή είναι υποχρεωτική').max(1000, 'Η περιγραφή δεν μπορεί να ξεπερνά τους 1000 χαρακτήρες'),
  project_type: z.enum(['maintenance','renovation','construction','installation','repair','upgrade','other']),
  status: z.enum(['planning','bidding','awarded','in_progress','completed','cancelled']),
  contractor: z.preprocess((v) => (v ? Number(v) : undefined), z.number().int().positive().optional()),
  start_at: z.string().optional(),
  is_recurring: z.boolean().optional(),
  estimated_cost: z.preprocess((v) => (v ? Number(v) : undefined), z.number().nonnegative().optional()),
  priority: z.enum(['low','medium','high','urgent']).default('medium'),
  template: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const PROJECT_TYPE_OPTIONS: ReadonlyArray<{ value: FormValues['project_type']; label: string; category?: string }> = [
  { value: 'maintenance', label: 'Συντήρηση', category: 'Γενικά' },
  { value: 'renovation', label: 'Ανακαίνιση', category: 'Γενικά' },
  { value: 'construction', label: 'Κατασκευή', category: 'Γενικά' },
  { value: 'installation', label: 'Εγκατάσταση', category: 'Γενικά' },
  { value: 'repair', label: 'Επισκευή', category: 'Γενικά' },
  { value: 'upgrade', label: 'Αναβάθμιση', category: 'Γενικά' },
  { value: 'other', label: 'Άλλο', category: 'Γενικά' },
];

const STATUS_OPTIONS: ReadonlyArray<{ value: FormValues['status']; label: string }> = [
  { value: 'planning', label: 'Σχεδιασμός' },
  { value: 'bidding', label: 'Διαγωνισμός/Προσφορές' },
  { value: 'awarded', label: 'Ανάθεση' },
  { value: 'in_progress', label: 'Σε εξέλιξη' },
  { value: 'completed', label: 'Ολοκληρωμένο' },
  { value: 'cancelled', label: 'Ακυρωμένο' },
];

export type ScheduledProject = {
  id?: number;
  title: string;
  description: string;
  project_type: FormValues['project_type'];
  status: FormValues['status'];
};

export default function ScheduledProjectForm({
  title = 'Προγραμματισμός Έργου',
  projectId,
  initialProject,
}: {
  readonly title?: string;
  readonly projectId?: number;
  readonly initialProject?: ScheduledProject;
}) {
  const { isAdmin, isManager, isLoading } = useRole();
  const router = useRouter();
  const { toast } = useToast();
  const [contractors, setContractors] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingContractors, setLoadingContractors] = useState(false);
  const [projectData, setProjectData] = useState<ScheduledProject | null>(initialProject ?? null);

  useEffect(() => {
    const loadContractors = async () => {
      try {
        setLoadingContractors(true);
        const resp = await makeRequestWithRetry({ method: 'get', url: '/maintenance/contractors/', params: { page_size: 1000 } });
        const data = resp?.data;
        const rows = Array.isArray(data) ? data : data?.results ?? [];
        setContractors(rows.map((r: any) => ({ id: r.id, name: r.name })));
      } catch {
      } finally {
        setLoadingContractors(false);
      }
    };
    loadContractors();
  }, []);

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId || initialProject) return;
      try {
        const { data } = await api.get(`/projects/projects/${projectId}/`);
        setProjectData({
          id: data.id,
          title: data.title,
          description: String(data.description ?? ''),
          project_type: data.project_type,
          status: data.status,
        });
      } catch (e: any) {
        toast({ title: 'Σφάλμα', description: e?.message ?? 'Αποτυχία φόρτωσης έργου' });
      }
    };
    loadProject();
  }, [projectId, initialProject, toast]);

  const defaultValues: FormValues = useMemo(() => ({
    title: projectData?.title ?? '',
    description: projectData?.description ?? '',
    project_type: projectData?.project_type ?? 'maintenance',
    status: projectData?.status ?? 'planning',
    priority: 'medium',
  }), [projectData]);

  const { control, register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues,
    values: defaultValues,
  });

  if (isLoading) return null;
  if (!(isAdmin || isManager)) {
    if (typeof window !== 'undefined') router.push('/projects');
    return null;
  }

  const onSubmit = async (values: FormValues) => {
    const buildingId = getActiveBuildingId();
    const projectPayload = {
      title: values.title,
      description: values.description,
      building: buildingId,
      project_type: values.project_type,
      status: values.status,
    };

    try {
      if (projectData?.id) {
        await api.patch(`/projects/projects/${projectData.id}/`, projectPayload);
      } else {
        await api.post('/projects/projects/', projectPayload);
      }

      if (values.start_at) {
        try {
          const { data: categories } = await api.get('/todos/categories/', { params: { building: buildingId } });
          const cats = Array.isArray(categories) ? categories : categories?.results ?? [];
          const preferred = cats.find((c: any) => String(c.name).toLowerCase().includes('project')) || cats[0];
          if (preferred) {
            await api.post('/todos/items/', {
              title: values.title,
              description: values.description,
              category: preferred.id,
              building: buildingId,
              apartment: null,
              priority: values.priority ?? 'medium',
              status: 'pending',
              due_date: new Date(values.start_at).toISOString(),
            });
          }
        } catch (e: any) {
          toast({ title: 'Σφάλμα', description: e?.message ?? 'Αποτυχία δημιουργίας To-Do για το ημερολόγιο' });
        }
      }

      router.push('/projects');
    } catch (e: any) {
      toast({ title: 'Σφάλμα', description: e?.message ?? 'Αποτυχία αποθήκευσης έργου' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <BackButton />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="text-sm text-muted-foreground">Στοιχεία Έργου — Συμπληρώστε τα βασικά στοιχεία</div>
          <div>
            <label className="block text-sm font-medium mb-1">Τίτλος <span className="text-red-600">*</span></label>
            <Input {...register('title')} placeholder="Π.χ. Συντήρηση ανελκυστήρα" />
            {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Περιγραφή</label>
            <Textarea {...register('description')} rows={4} placeholder="Σύντομη περιγραφή εργασιών, πρόσβαση, υλικά, κλπ." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Τύπος έργου <span className="text-red-600">*</span></label>
              <Controller
                control={control}
                name="project_type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                    <SelectTrigger><SelectValue placeholder="Επιλέξτε υπηρεσία" /></SelectTrigger>
                    <SelectContent className="max-h-80">
                      {PROJECT_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.project_type && <p className="text-sm text-red-600">{errors.project_type.message}</p>}
              <div className="text-xs text-muted-foreground mt-1">Η επιλογή συμπληρώνει αυτόματα τίτλο/περιγραφή. Μπορείτε να τα αλλάξετε.</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Κατάσταση <span className="text-red-600">*</span></label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                    <SelectTrigger><SelectValue placeholder="Επιλέξτε" /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && <p className="text-sm text-red-600">{errors.status.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Συνεργείο (προαιρετικό)</label>
              <div className="flex items-center gap-2">
                <Controller
                  control={control}
                  name="contractor"
                  render={({ field }) => (
                    <Select value={field.value ? String(field.value) : undefined} onValueChange={(v) => field.onChange(Number(v))}>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingContractors ? 'Φόρτωση…' : 'Επιλέξτε συνεργείο'} />
                      </SelectTrigger>
                      <SelectContent>
                        {(!contractors || contractors.length === 0) && (
                          <SelectItem disabled value="-1">Δεν βρέθηκαν συνεργεία</SelectItem>
                        )}
                        {(contractors || []).map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Button type="button" variant="outline" onClick={() => router.push('/maintenance/contractors/new')}>Νέο</Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ημ/νία έναρξης</label>
              <Input type="datetime-local" {...register('start_at')} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Περιοδικότητα</label>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_recurring" {...register('is_recurring')} />
                <label htmlFor="is_recurring" className="text-sm">Επαναλαμβανόμενο έργο</label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Εκτιμώμενο κόστος (€)</label>
              <Input type="number" step="0.01" {...register('estimated_cost')} placeholder="π.χ. 150.00" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Προτεραιότητα</label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                    <SelectTrigger><SelectValue placeholder="Επιλέξτε" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Χαμηλή</SelectItem>
                      <SelectItem value="medium">Μεσαία</SelectItem>
                      <SelectItem value="high">Υψηλή</SelectItem>
                      <SelectItem value="urgent">Επείγουσα</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Εφαρμογή προτύπου</label>
              <Input {...register('template')} placeholder="Νέα κατηγορία / πρότυπο" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Αποθήκευση…' : 'Αποθήκευση'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}


