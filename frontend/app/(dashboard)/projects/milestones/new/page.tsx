'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useRole } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const schema = z.object({
  project: z.preprocess((v) => Number(v), z.number().int().positive()),
  title: z.string().min(3),
  description: z.string().optional(),
  due_at: z.string().optional(),
  amount: z.preprocess((v) => (v ? Number(v) : undefined), z.number().nonnegative().optional()),
  status: z.enum(['pending','in_progress','awaiting_approval','approved','overdue']).default('pending'),
});

type FormValues = z.infer<typeof schema>;

export default function NewMilestonePage() {
  const { isAdmin, isManager, isLoading } = useRole();
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'pending' },
  });

  if (isLoading) return null;
  if (!(isAdmin || isManager)) {
    if (typeof window !== 'undefined') {
      window.location.replace('/projects');
    }
    return null;
  }

  const onSubmit = async (values: FormValues) => {
    const payload: any = { ...values };
    if (values.due_at) payload.due_at = new Date(values.due_at).toISOString();
    await api.post('/projects/milestones/', payload);
    router.push('/projects');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Νέο Ορόσημο</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Project ID</label>
              <Input type="number" {...register('project')} />
              {errors.project && <p className="text-sm text-red-600">Υποχρεωτικό</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Κατάσταση</label>
              <Select value={watch('status')} onValueChange={(v) => setValue('status', v as FormValues['status'])}>
                <SelectTrigger><SelectValue placeholder="Επιλέξτε" /></SelectTrigger>
                <SelectContent>
                  {['pending','in_progress','awaiting_approval','approved','overdue'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Τίτλος</label>
            <Input {...register('title')} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Περιγραφή</label>
            <Textarea rows={4} {...register('description')} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Προθεσμία</label>
              <Input type="datetime-local" {...register('due_at')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ποσό</label>
              <Input type="number" step="0.01" {...register('amount')} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>Αποθήκευση</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}


