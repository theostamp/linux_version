'use client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { apiPost, getActiveBuildingId } from '@/lib/api';
import { useRole } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Ο τίτλος πρέπει να έχει τουλάχιστον 3 χαρακτήρες')
    .max(100, 'Ο τίτλος δεν μπορεί να ξεπερνά τους 100 χαρακτήρες'),
  description: z
    .string()
    .trim()
    .max(1000, 'Η περιγραφή δεν μπορεί να ξεπερνά τους 1000 χαρακτήρες')
    .optional(),
  project_type: z.enum(
    ['maintenance','renovation','construction','installation','repair','upgrade','other'] as const
  ),
  status: z.enum(
    ['planning','bidding','awarded','in_progress','completed','cancelled'] as const
  ),
});

 

type FormValues = z.infer<typeof schema>;

const PROJECT_TYPE_OPTIONS: ReadonlyArray<{ value: FormValues['project_type']; label: string }> = [
  { value: 'maintenance', label: 'Συντήρηση' },
  { value: 'renovation', label: 'Ανακαίνιση' },
  { value: 'construction', label: 'Κατασκευή' },
  { value: 'installation', label: 'Εγκατάσταση' },
  { value: 'repair', label: 'Επισκευή' },
  { value: 'upgrade', label: 'Αναβάθμιση' },
  { value: 'other', label: 'Άλλο' },
] as const;

const STATUS_OPTIONS: ReadonlyArray<{ value: FormValues['status']; label: string }> = [
  { value: 'planning', label: 'Σχεδιασμός' },
  { value: 'bidding', label: 'Διαγωνισμός/Προσφορές' },
  { value: 'awarded', label: 'Ανάθεση' },
  { value: 'in_progress', label: 'Σε εξέλιξη' },
  { value: 'completed', label: 'Ολοκληρωμένο' },
  { value: 'cancelled', label: 'Ακυρωμένο' },
] as const;

export default function NewProjectPage() {
  const { isAdmin, isManager, isLoading } = useRole();
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      project_type: 'maintenance',
      status: 'planning',
    },
  });

  if (isLoading) return null;
  if (!(isAdmin || isManager)) {
    if (typeof window !== 'undefined') {
      window.location.replace('/projects');
    }
    return null;
  }

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      building: getActiveBuildingId(),
    };
    await apiPost('/api/projects/projects/', payload);
    router.push('/projects');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Νέο Έργο</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Τίτλος <span className="text-red-600">*</span></label>
            <Input {...register('title')} placeholder="Π.χ. Αναβάθμιση ανελκυστήρα" />
            {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Περιγραφή</label>
            <Textarea {...register('description')} rows={4} placeholder="Περιγραφή έργου (προαιρετικό)" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Τύπος Έργου <span className="text-red-600">*</span></label>
              <Select onValueChange={(v) => setValue('project_type', v as FormValues['project_type'], { shouldValidate: true, shouldTouch: true })} value={watch('project_type')}>
                <SelectTrigger><SelectValue placeholder="Επιλέξτε" /></SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.project_type && <p className="text-sm text-red-600">{errors.project_type.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Κατάσταση <span className="text-red-600">*</span></label>
              <Select onValueChange={(v) => setValue('status', v as FormValues['status'], { shouldValidate: true, shouldTouch: true })} value={watch('status')}>
                <SelectTrigger><SelectValue placeholder="Επιλέξτε" /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.status && <p className="text-sm text-red-600">{errors.status.message}</p>}
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

