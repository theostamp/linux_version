'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { api, getActiveBuildingId, fetchScheduledMaintenances, type ScheduledMaintenance as ApiScheduledMaintenance, createServiceReceipt } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackButton } from '@/components/ui/BackButton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DistributionSelector } from '@/components/ui/DistributionSelector';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useExpenses } from '@/hooks/useExpenses';

const schema = z.object({
  title: z.string().trim().min(3, 'Ο τίτλος πρέπει να έχει τουλάχιστον 3 χαρακτήρες').max(100, 'Ο τίτλος δεν μπορεί να ξεπερνά τους 100 χαρακτήρες'),
  description: z.string().trim().max(1000, 'Η περιγραφή δεν μπορεί να ξεπερνά τους 1000 χαρακτήρες').optional(),
  contractor: z.preprocess((v) => (v ? Number(v) : undefined), z.number().int().positive().optional()),
  scheduled_date: z.string().optional(),
  priority: z.enum(['low','medium','high','urgent']).default('medium'),
  template: z.string().optional(),
  is_recurring: z.boolean().optional(),
  recurrence_frequency: z.enum(['weekly','monthly','bimonthly','quarterly','semiannual','annual']).optional(),
  status_ui: z.enum(['pending','executed']).default('pending'),
  price: z.preprocess((v) => {
    if (v === undefined || v === null || v === '') return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  }, z.number().positive().optional()),
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
  heading = 'Προγραμματισμός Έργου',
  maintenanceId,
}: {
  readonly heading?: string;
  readonly maintenanceId?: number;
}) {
  const { isAdmin, isManager, isLoading } = useRole();
  const router = useRouter();
  const { toast } = useToast();
  const { createExpense, getExpenses } = useExpenses();
  const [contractors, setContractors] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingContractors, setLoadingContractors] = useState(false);
  const [initialData, setInitialData] = useState<ScheduledMaintenance | null>(null);

  // Templates for common scheduled tasks
  const [templates, setTemplates] = useState<Array<{ key: string; title: string; description: string; suggestedCategory: string }>>([
    { key: 'elevator_maintenance', title: 'Συντήρηση Ανελκυστήρα', description: 'Ετήσια συντήρηση ανελκυστήρα, έλεγχος ασφαλείας και λίπανση εξαρτημάτων.', suggestedCategory: 'elevator_maintenance' },
    { key: 'boiler_service', title: 'Συντήρηση Καυστήρα', description: 'Περιοδική συντήρηση καυστήρα/λέβητα και καθαρισμός.', suggestedCategory: 'heating_maintenance' },
    { key: 'water_tank_cleaning', title: 'Καθαρισμός Δεξαμενής Νερού', description: 'Προγραμματισμένος καθαρισμός και απολύμανση δεξαμενής νερού.', suggestedCategory: 'water_tank_cleaning' },
    { key: 'fire_extinguishers', title: 'Έλεγχος Πυροσβεστήρων', description: 'Ετήσια επιθεώρηση και αναγομώσεις πυροσβεστήρων.', suggestedCategory: 'fire_extinguishers' },
    { key: 'roof_inspection', title: 'Έλεγχος Στέγης', description: 'Περιοδικός έλεγχος στέγης για διαρροές και φθορές.', suggestedCategory: 'roof_maintenance' },
    { key: 'garden_maintenance', title: 'Συντήρηση Κήπου', description: 'Κλάδεμα, πότισμα και συντήρηση πρασίνου.', suggestedCategory: 'garden_maintenance' },
    { key: 'intercom_check', title: 'Συντήρηση Ενδοεπικοινωνίας', description: 'Έλεγχος και συντήρηση συστήματος θυροτηλεόρασης/θυροτηλεφώνου.', suggestedCategory: 'intercom_system' },
    { key: 'electrical_check', title: 'Έλεγχος Ηλεκτρικών Κοινοχρήστων', description: 'Έλεγχος πίνακα, φωτισμού και ασφαλειών κοινοχρήστων.', suggestedCategory: 'electrical_maintenance' },
  ]);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');

  // Receipt modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptTitle, setReceiptTitle] = useState('');
  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0,10));
  const [receiptCategory, setReceiptCategory] = useState<string>('cleaning_services');
  const [receiptDistribution, setReceiptDistribution] = useState<'by_participation_mills' | 'equal_share' | 'by_meters' | 'specific_apartments'>('by_participation_mills');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isCreatingExpense, setIsCreatingExpense] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [pendingCreateAfterConfirm, setPendingCreateAfterConfirm] = useState<null | {
    buildingId: number;
    amountNum: number;
  }>(null);
  const [showRecurringConfirm, setShowRecurringConfirm] = useState(false);

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
    scheduled_date: initialData?.scheduled_date ? formatForDateInput(initialData.scheduled_date) : undefined,
    priority: initialData?.priority ?? 'medium',
    status_ui: initialData?.status === 'completed' ? 'executed' : 'pending',
  }), [initialData]);

  const { control, register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch, getValues } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues,
    values: defaultValues,
  });

  const statusUi = watch('status_ui');
  const watchedPrice = watch('price');
  const watchedTitle = watch('title');

  if (isLoading) return null;
  if (!(isAdmin || isManager)) {
    if (typeof window !== 'undefined') router.push('/maintenance/scheduled');
    return null;
  }

  const onSubmit = async (values: FormValues, options?: { skipReceipt?: boolean }) => {
    const buildingId = getActiveBuildingId();
    const payload: any = {
      title: values.title,
      description: values.description ?? '',
      building: buildingId,
      priority: values.priority,
    };
    if (values.contractor) payload.contractor = values.contractor;
    if (values.scheduled_date) {
      const dateOnly = values.scheduled_date.length > 10 ? values.scheduled_date.slice(0,10) : values.scheduled_date;
      payload.scheduled_date = dateOnly;
    }
    // Map UI status to backend status
    payload.status = values.status_ui === 'executed' ? 'completed' : 'scheduled';

    // If executed and no receipt created yet, check recurrence and then open receipt modal
    if (values.status_ui === 'executed' && !isCreatingExpense && !options?.skipReceipt) {
      // Prefill receipt fields
      setReceiptTitle(values.title);
      setReceiptAmount(values.price ? String(values.price) : '');

      try {
        const duplicateInPeriod = await hasExecutedInDefinedPeriod({
          buildingId,
          currentId: initialData?.id,
          title: values.title,
          scheduledDate: values.scheduled_date,
          referenceDate: receiptDate,
          frequency: values.recurrence_frequency ?? 'monthly',
        });
        if (duplicateInPeriod) {
          setShowRecurringConfirm(true);
          return;
        }
      } catch {
        // If check fails, fail open: proceed to modal
      }

      setShowReceiptModal(true);
      return;
    }

    try {
      let savedId: number | undefined = initialData?.id ?? undefined;
      if (initialData?.id) {
        await api.patch(`/maintenance/scheduled/${initialData.id}/`, payload);
        savedId = initialData.id;
      } else {
        const resp = await api.post('/maintenance/scheduled/', payload);
        savedId = resp?.data?.id ?? undefined;
      }
      if (savedId) {
        toast({ title: 'Επιτυχία', description: `Το έργο καταχωρήθηκε επιτυχώς (ID: ${savedId}).` });
        router.push(`/maintenance/scheduled?highlight=${savedId}`);
      } else {
        toast({ title: 'Επιτυχία', description: 'Το έργο καταχωρήθηκε επιτυχώς.' });
      router.push('/maintenance/scheduled');
      }
    } catch (e: any) {
      toast({ title: 'Σφάλμα', description: e?.message ?? 'Αποτυχία αποθήκευσης' });
    }
  };

  async function hasExecutedInDefinedPeriod(args: {
    buildingId: number;
    currentId?: number;
    title: string;
    scheduledDate?: string;
    referenceDate?: string;
    frequency: 'weekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual';
  }): Promise<boolean> {
    const { buildingId, currentId, title, scheduledDate, referenceDate, frequency } = args;
    const list = await fetchScheduledMaintenances({ buildingId, ordering: 'scheduled_date' });
    const refISO = (referenceDate && referenceDate.length >= 10) ? referenceDate : (scheduledDate ? new Date(scheduledDate).toISOString().slice(0,10) : new Date().toISOString().slice(0,10));
    const { start, end } = getPeriodBounds(refISO, frequency);
    const lower = new Date(start).getTime();
    const upper = new Date(end).getTime();
    const normalizedTitle = title.trim().toLowerCase();

    return list.some((item: ApiScheduledMaintenance) => {
      if (!item) return false;
      if (currentId && item.id === currentId) return false;
      if ((item.status as any) !== 'completed') return false;
      const t = (item.title || '').trim().toLowerCase();
      if (t !== normalizedTitle) return false;
      const d = item.scheduled_date ? new Date(item.scheduled_date).getTime() : NaN;
      if (!Number.isFinite(d)) return false;
      return d >= lower && d <= upper;
    });
  }

  function getPeriodBounds(refDateISO: string, frequency: 'weekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual') {
    const d = new Date(refDateISO + 'T00:00:00');
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-based
    let start = new Date(d);
    let end = new Date(d);

    switch (frequency) {
      case 'weekly': {
        // Monday-Sunday week bounds based on ref date (adjust start to Monday)
        const day = d.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
        const diffToMonday = (day === 0 ? -6 : 1 - day); // if Sunday, go back 6 days
        start = new Date(d);
        start.setDate(d.getDate() + diffToMonday);
        start.setHours(0,0,0,0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23,59,59,999);
        break;
      }
      case 'monthly': {
        start = new Date(year, month, 1);
        end = new Date(year, month + 1, 0);
        break;
      }
      case 'bimonthly': {
        const base = month - (month % 2); // groups of 2 months
        start = new Date(year, base, 1);
        end = new Date(year, base + 2, 0);
        break;
      }
      case 'quarterly': {
        const q = Math.floor(month / 3) * 3;
        start = new Date(year, q, 1);
        end = new Date(year, q + 3, 0);
        break;
      }
      case 'semiannual': {
        const h = month < 6 ? 0 : 6;
        start = new Date(year, h, 1);
        end = new Date(year, h + 6, 0);
        break;
      }
      case 'annual':
      default: {
        start = new Date(year, 0, 1);
        end = new Date(year, 12, 0);
        break;
      }
    }
    const startISO = start.toISOString().slice(0,10);
    const endISO = end.toISOString().slice(0,10);
    return { start: startISO, end: endISO };
  }

  return (
    <>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
              <div className="md:col-span-2">
                <Select onValueChange={(v) => {
                  const t = templates.find(x => x.key === v);
                  if (t) {
                    setValue('template', t.key);
                    setValue('title', t.title as any);
                    setValue('description', t.description as any);
                    setReceiptCategory(t.suggestedCategory);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε περιοδική υπηρεσία" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.key} value={t.key}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddTemplate(v => !v)}>
                  {showAddTemplate ? 'Ακύρωση' : 'Προσθήκη νέας'}
                </Button>
              </div>
            </div>
            {showAddTemplate && (
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input placeholder="Τίτλος νέας εργασίας" value={newTemplateTitle} onChange={(e) => setNewTemplateTitle(e.target.value)} />
                <Input placeholder="Περιγραφή (προαιρετική)" value={newTemplateDescription} onChange={(e) => setNewTemplateDescription(e.target.value)} />
                <div className="md:col-span-2 flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => {
                    setNewTemplateTitle('');
                    setNewTemplateDescription('');
                    setShowAddTemplate(false);
                  }}>Καθαρισμός</Button>
                  <Button type="button" onClick={() => {
                    if (!newTemplateTitle.trim()) return;
                    const key = newTemplateTitle.trim().toLowerCase().replace(/\s+/g, '_').slice(0, 50);
                    const item = { key, title: newTemplateTitle.trim(), description: newTemplateDescription.trim(), suggestedCategory: 'cleaning_services' };
                    setTemplates(prev => [{...item}, ...prev]);
                    setValue('template', item.key);
                    setValue('title', item.title as any);
                    setValue('description', item.description as any);
                    setReceiptCategory('cleaning_services');
                    setShowAddTemplate(false);
                  }}>Αποθήκευση ως πρότυπο</Button>
                </div>
              </div>
            )}
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
              <Input type="date" {...register('scheduled_date')} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Περιοδικότητα</label>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_recurring" {...register('is_recurring')} />
                <label htmlFor="is_recurring" className="text-sm">Επαναλαμβανόμενο έργο</label>
              </div>
              {watch('is_recurring') && (
                <div className="mt-2">
                  <label className="block text-sm font-medium mb-1">Συχνότητα</label>
                  <Controller
                    control={control}
                    name="recurrence_frequency"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                        <SelectTrigger><SelectValue placeholder="Επιλέξτε συχνότητα" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Εβδομαδιαία</SelectItem>
                          <SelectItem value="monthly">Μηνιαία</SelectItem>
                          <SelectItem value="bimonthly">Ανά 2 μήνες</SelectItem>
                          <SelectItem value="quarterly">Τριμηνιαία</SelectItem>
                          <SelectItem value="semiannual">Εξαμηνιαία</SelectItem>
                          <SelectItem value="annual">Ετήσια</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Κατάσταση</label>
              <Controller
                control={control}
                name="status_ui"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                    <SelectTrigger><SelectValue placeholder="Επιλέξτε" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Εκκρεμεί</SelectItem>
                      <SelectItem value="executed">Εκτελέσθηκε</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Τιμή Υπηρεσίας (€)</label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" {...register('price')} />
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

    {/* Receipt Modal */}
    <Dialog open={showReceiptModal} onOpenChange={(open) => setShowReceiptModal(open)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Στοιχεία Απόδειξης</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Τίτλος</label>
              <Input value={receiptTitle} onChange={(e) => setReceiptTitle(e.target.value)} placeholder="Τίτλος παραστατικού" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ποσό (€)</label>
              <Input type="number" step="0.01" min="0" value={receiptAmount} onChange={(e) => setReceiptAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Ημερομηνία</label>
              <Input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Κατηγορία</label>
              <Select value={receiptCategory} onValueChange={(v) => setReceiptCategory(v)}>
                <SelectTrigger><SelectValue placeholder="Επιλέξτε" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cleaning_services">Υπηρεσίες Καθαρισμού</SelectItem>
                  <SelectItem value="elevator_maintenance">Συντήρηση Ανελκυστήρα</SelectItem>
                  <SelectItem value="heating_maintenance">Συντήρηση Θέρμανσης</SelectItem>
                  <SelectItem value="plumbing_maintenance">Συντήρηση Υδραυλικών</SelectItem>
                  <SelectItem value="electrical_maintenance">Συντήρηση Ηλεκτρικών</SelectItem>
                  <SelectItem value="building_maintenance">Συντήρηση Κτιρίου</SelectItem>
                  <SelectItem value="miscellaneous">Λοιπά</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Τύπος Κατανομής</label>
            <DistributionSelector value={receiptDistribution} onValueChange={(v) => setReceiptDistribution(v as any)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Επισύναψη (προαιρετικό)</label>
            <Input type="file" accept="application/pdf,image/*" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => setShowReceiptModal(false)}>Άκυρο</Button>
          <Button type="button"
            onClick={async () => {
              const buildingId = getActiveBuildingId();
              const amountNum = Number(receiptAmount);
              if (!buildingId || !receiptTitle.trim() || !amountNum || isNaN(amountNum)) {
                toast({ title: 'Σφάλμα', description: 'Συμπληρώστε τίτλο και έγκυρο ποσό.' });
                return;
              }
              try {
                // Best-effort duplicate check: limit to same day for reliability
                try {
                  const existing = await getExpenses({
                    building_id: buildingId,
                    date_from: receiptDate,
                    date_to: receiptDate,
                  });
                  const dup = existing.find(e => (
                    (e.title || '').trim().toLowerCase() === receiptTitle.trim().toLowerCase() &&
                    Math.abs((e.amount || 0) - amountNum) < 0.005 &&
                    (e.category || '') === receiptCategory
                  ));
                  if (dup) {
                    setPendingCreateAfterConfirm({ buildingId, amountNum });
                    setShowDuplicateConfirm(true);
                    return;
                  }
                } catch (fetchErr) {
                  // If duplicate lookup fails, continue without blocking
                }
                setIsCreatingExpense(true);
                const created: any = await createExpense({
                  building: buildingId,
                  title: receiptTitle.trim(),
                  amount: Math.round(amountNum * 100) / 100,
                  date: receiptDate,
                  category: receiptCategory,
                  distribution_type: receiptDistribution,
                  attachment: receiptFile || undefined,
                } as any);
                // Link a service receipt explicitly to the expense and maintenance if possible
                try {
                  const expenseId = created?.id ?? created?.data?.id;
                  const contractorId = currentValues.contractor ?? initialData?.contractor;
                  if (contractorId && expenseId) {
                    await createServiceReceipt({
                      contractor: Number(contractorId),
                      building: buildingId,
                      service_date: receiptDate,
                      amount: Math.round(amountNum * 100) / 100,
                      description: receiptTitle.trim(),
                      payment_status: 'pending',
                      receipt_file: receiptFile || undefined,
                      expense: expenseId,
                      scheduled_maintenance: initialData?.id,
                    });
                  }
                } catch {}
                setShowReceiptModal(false);
                const createdId = created?.id ?? created?.data?.id;
                toast({ title: 'Επιτυχία', description: createdId ? `Η απόδειξη καταχωρήθηκε (ID: ${createdId}).` : 'Η απόδειξη καταχωρήθηκε στις δαπάνες.' });
                // After expense creation, submit/continue saving maintenance with current form values
                const currentValues = getValues();
                await onSubmit({ ...currentValues, status_ui: 'executed' }, { skipReceipt: true });
              } catch (err: any) {
                toast({ title: 'Σφάλμα', description: err?.message ?? 'Αποτυχία δημιουργίας δαπάνης' });
              } finally {
                setIsCreatingExpense(false);
              }
            }}
            disabled={isCreatingExpense}
          >{isCreatingExpense ? 'Καταχώρηση…' : 'Καταχώρηση Δαπάνης'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Duplicate Confirmation */}
    <ConfirmDialog
      open={showDuplicateConfirm}
      onOpenChange={(open) => setShowDuplicateConfirm(open)}
      title="Πιθανή Διπλοχρέωση"
      description="Υπάρχει ήδη δαπάνη με ίδιο τίτλο, κατηγορία και ποσό για την ίδια ημέρα. Θέλετε σίγουρα να συνεχίσετε;"
      confirmText="Συνέχεια"
      cancelText="Άκυρο"
      isConfirmLoading={isCreatingExpense}
      onConfirm={async () => {
        if (!pendingCreateAfterConfirm) { setShowDuplicateConfirm(false); return; }
        try {
          setIsCreatingExpense(true);
          const created: any = await createExpense({
            building: pendingCreateAfterConfirm.buildingId,
            title: receiptTitle.trim(),
            amount: Math.round(pendingCreateAfterConfirm.amountNum * 100) / 100,
            date: receiptDate,
            category: receiptCategory,
            distribution_type: receiptDistribution,
            attachment: receiptFile || undefined,
          } as any);
          try {
            const expenseId = created?.id ?? created?.data?.id;
            const contractorId = currentValues.contractor ?? initialData?.contractor;
            if (contractorId && expenseId) {
              await createServiceReceipt({
                contractor: Number(contractorId),
                building: pendingCreateAfterConfirm.buildingId,
                service_date: receiptDate,
                amount: Math.round(pendingCreateAfterConfirm.amountNum * 100) / 100,
                description: receiptTitle.trim(),
                payment_status: 'pending',
                receipt_file: receiptFile || undefined,
                expense: expenseId,
                scheduled_maintenance: initialData?.id,
              });
            }
          } catch {}
          setShowDuplicateConfirm(false);
          setShowReceiptModal(false);
          const createdId = created?.id ?? created?.data?.id;
          toast({ title: 'Επιτυχία', description: createdId ? `Η απόδειξη καταχωρήθηκε (ID: ${createdId}).` : 'Η απόδειξη καταχωρήθηκε στις δαπάνες.' });
          const currentValues = getValues();
          await onSubmit({ ...currentValues, status_ui: 'executed' }, { skipReceipt: true });
        } catch (err: any) {
          toast({ title: 'Σφάλμα', description: err?.message ?? 'Αποτυχία δημιουργίας δαπάνης' });
        } finally {
          setIsCreatingExpense(false);
          setPendingCreateAfterConfirm(null);
        }
      }}
    />

    {/* Recurrence Confirmation */}
    <ConfirmDialog
      open={showRecurringConfirm}
      onOpenChange={(open) => setShowRecurringConfirm(open)}
      title="Έχει ήδη εκτελεστεί στην περίοδο"
      description="Το έργο φαίνεται να έχει ολοκληρωθεί ήδη στην ίδια περίοδο με βάση την καθορισμένη περιοδικότητα. Θέλετε να συνεχίσετε;"
      confirmText="Συνέχεια"
      cancelText="Άκυρο"
      isConfirmLoading={false}
      onConfirm={() => {
        setShowRecurringConfirm(false);
        setShowReceiptModal(true);
      }}
    />
    </>
  );
}

function formatForDateInput(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}


