'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { api, getActiveBuildingId } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackButton } from '@/components/ui/BackButton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const schema = z.object({
  title: z.string().trim().min(3, 'Ο τίτλος πρέπει να έχει τουλάχιστον 3 χαρακτήρες').max(100, 'Ο τίτλος δεν μπορεί να ξεπερνά τους 100 χαρακτήρες'),
  description: z.string().trim().max(1000, 'Η περιγραφή δεν μπορεί να ξεπερνά τους 1000 χαρακτήρες').optional(),
  contractor: z.preprocess((v) => (v ? Number(v) : undefined), z.number().int().positive().optional()),
  scheduled_date: z.string().optional(),
  priority: z.enum(['low','medium','high','urgent']).default('medium'),
  template: z.string().optional(),
  is_recurring: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export type ScheduledMaintenance = {
  id?: number;
  title: string;
  description?: string;
  contractor?: number | null;
  scheduled_date?: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
};

export default function ScheduledMaintenanceForm({
  heading = 'Προγραμματισμένο Έργο',
  maintenanceId,
}: {
  readonly heading?: string;
  readonly maintenanceId?: number;
}) {
  const { isAdmin, isManager, isLoading } = useRole();
  const router = useRouter();
  const { toast } = useToast();
  const [contractors, setContractors] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingContractors, setLoadingContractors] = useState(false);
  const [initialData, setInitialData] = useState<ScheduledMaintenance | null>(null);

  useEffect(() => {
    const loadContractors = async () => {
      try {
        setLoadingContractors(true);
        const resp = await api.get('/maintenance/contractors/', { params: { page_size: 1000 } });
        const data = resp.data;
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
    const loadExisting = async () => {
      if (!maintenanceId) return;
      try {
        const { data } = await api.get(`/maintenance/scheduled/${maintenanceId}/`);
        setInitialData({
          id: data.id,
          title: data.title,
          description: data.description ?? '',
          contractor: data.contractor ?? undefined,
          scheduled_date: data.scheduled_date ?? undefined,
          priority: data.priority ?? 'medium',
          status: data.status ?? 'scheduled',
        });
      } catch (e: any) {
        toast({ title: 'Σφάλμα', description: e?.message ?? 'Αποτυχία φόρτωσης εργασίας' });
      }
    };
    loadExisting();
  }, [maintenanceId, toast]);

  const defaultValues: FormValues = useMemo(() => ({
    title: initialData?.title ?? '',
    description: initialData?.description ?? '',
    contractor: initialData?.contractor ?? undefined,
    scheduled_date: initialData?.scheduled_date ? formatForDatetimeLocal(initialData.scheduled_date) : undefined,
    priority: initialData?.priority ?? 'medium',
  }), [initialData]);

  const { control, register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues,
    values: defaultValues,
  });

  if (isLoading) return null;
  if (!(isAdmin || isManager)) {
    if (typeof window !== 'undefined') router.push('/maintenance/scheduled');
    return null;
  }

  const onSubmit = async (values: FormValues) => {
    const buildingId = getActiveBuildingId();
    const payload: any = {
      title: values.title,
      description: values.description ?? '',
      building: buildingId,
      priority: values.priority,
    };
    if (values.contractor) payload.contractor = values.contractor;
    if (values.scheduled_date) payload.scheduled_date = new Date(values.scheduled_date).toISOString();

    try {
      if (initialData?.id) {
        await api.patch(`/maintenance/scheduled/${initialData.id}/`, payload);
      } else {
        await api.post('/maintenance/scheduled/', payload);
      }
      router.push('/maintenance/scheduled');
    } catch (e: any) {
      toast({ title: 'Σφάλμα', description: e?.message ?? 'Αποτυχία αποθήκευσης' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{heading}</CardTitle>
          <BackButton />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="text-sm text-muted-foreground">Στοιχεία Έργου — Συμπληρώστε τα βασικά στοιχεία</div>
          <div>
            <label className="block text-sm font-medium mb-1">Τύπος έργου</label>
            <div className="text-xs text-muted-foreground mb-2">Η επιλογή συμπληρώνει αυτόματα τίτλο/περιγραφή. Μπορείτε να τα αλλάξετε.</div>
            <Input placeholder="Εφαρμογή προτύπου / Νέα κατηγορία (προαιρετικό)" {...register('template')} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Τίτλος <span className="text-red-600">*</span></label>
            <Input {...register('title')} placeholder="π.χ. Συντήρηση ανελκυστήρα" />
            {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
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
              <Input type="datetime-local" {...register('scheduled_date')} />
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
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Περιγραφή</label>
            <Textarea rows={4} placeholder="Σύντομη περιγραφή εργασιών, πρόσβαση, υλικά, κλπ." {...register('description')} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push('/maintenance/scheduled')}>Άκυρο</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Αποθήκευση…' : 'Αποθήκευση'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function formatForDatetimeLocal(iso: string): string {
  try {
    const d = new Date(iso);
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  } catch {
    return '';
  }
}


