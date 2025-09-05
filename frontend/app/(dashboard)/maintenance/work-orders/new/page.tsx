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
import { BackButton } from '@/components/ui/BackButton';

const schema = z.object({
  ticket: z.preprocess((v) => Number(v), z.number().int().positive()),
  contractor: z.preprocess((v) => (v ? Number(v) : undefined), z.number().int().positive().optional()),
  assigned_to: z.preprocess((v) => (v ? Number(v) : undefined), z.number().int().positive().optional()),
  status: z.enum(['scheduled','assigned','en_route','in_progress','paused','done','verified','cancelled']).default('scheduled'),
  scheduled_at: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewWorkOrderPage() {
  const { isAdmin, isManager, isLoading } = useRole();
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'scheduled' },
  });

  if (isLoading) return null;
  if (!(isAdmin || isManager)) {
    if (typeof window !== 'undefined') {
      window.location.replace('/maintenance');
    }
    return null;
  }

  const onSubmit = async (values: FormValues) => {
    const payload: any = { ...values };
    if (values.scheduled_at) {
      // datetime-local -> ISO
      payload.scheduled_at = new Date(values.scheduled_at).toISOString();
    }
    await api.post('/maintenance/work-orders/', payload);
    router.push('/maintenance');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Νέα Εντολή Εργασίας</CardTitle>
          <BackButton href="/maintenance/work-orders" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Ticket ID</label>
              <Input type="number" {...register('ticket')} />
              {errors.ticket && <p className="text-sm text-red-600">Υποχρεωτικό</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contractor ID (προαιρετικό)</label>
              <Input type="number" {...register('contractor')} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Κατάσταση</label>
              <Select value={watch('status')} onValueChange={(v) => setValue('status', v as FormValues['status'])}>
                <SelectTrigger><SelectValue placeholder="Επιλέξτε" /></SelectTrigger>
                <SelectContent>
                  {['scheduled','assigned','en_route','in_progress','paused','done','verified','cancelled'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Προγραμματισμένη Ημερομηνία/Ώρα</label>
              <Input type="datetime-local" {...register('scheduled_at')} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Σημειώσεις</label>
            <Textarea rows={4} {...register('notes')} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>Αποθήκευση</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}


