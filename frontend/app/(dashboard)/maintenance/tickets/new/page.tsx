'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { api, getActiveBuildingId } from '@/lib/api';
import { useRole } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BackButton } from '@/components/ui/BackButton';

const schema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  category: z.enum(['electrical','plumbing','elevator','hvac','cleaning','security','general','other']).default('general'),
  priority: z.enum(['low','medium','high','urgent']).default('medium'),
});

type FormValues = z.infer<typeof schema>;

export default function NewTicketPage() {
  const { isAdmin, isManager, isLoading } = useRole();
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      priority: 'medium',
      category: 'general',
    },
  });

  if (isLoading) return null;
  if (!(isAdmin || isManager)) {
    if (typeof window !== 'undefined') {
      window.location.replace('/maintenance');
    }
    return null;
  }

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      building: getActiveBuildingId(),
    };
    await api.post('/maintenance/tickets/', payload);
    router.push('/maintenance');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Νέο Αίτημα Συντήρησης</CardTitle>
          <BackButton href="/maintenance/tickets" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Τίτλος</label>
            <Input {...register('title')} />
            {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Περιγραφή</label>
            <Textarea {...register('description')} rows={4} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Κατηγορία</label>
              <Select onValueChange={(v) => setValue('category', v as FormValues['category'])} value={watch('category')}>
                <SelectTrigger><SelectValue placeholder="Επιλέξτε" /></SelectTrigger>
                <SelectContent>
                  {['electrical','plumbing','elevator','hvac','cleaning','security','general','other'].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Προτεραιότητα</label>
              <Select onValueChange={(v) => setValue('priority', v as FormValues['priority'])} value={watch('priority')}>
                <SelectTrigger><SelectValue placeholder="Επιλέξτε" /></SelectTrigger>
                <SelectContent>
                  {['low','medium','high','urgent'].map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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


