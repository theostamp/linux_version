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
import { PaymentConfigurationSection } from '@/components/maintenance/PaymentConfigurationSection';

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
  estimated_duration: z.preprocess((v) => {
    if (v === undefined || v === null || v === '') return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  }, z.number().positive().int().optional()),
  payment_config: z.object({
    enabled: z.boolean().optional(),
    payment_type: z.enum(['lump_sum', 'advance_installments', 'periodic', 'milestone_based']).optional(),
    total_amount: z.number().optional(),
    advance_percentage: z.number().optional(),
    installment_count: z.number().optional(),
    installment_frequency: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
    periodic_frequency: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
    periodic_amount: z.number().optional(),
    start_date: z.string().optional(),
    notes: z.string().optional(),
    advance_amount: z.number().optional(),
    remaining_amount: z.number().optional(),
    installment_amount: z.number().optional(),
  }).optional(),
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
  estimated_duration?: number | null;
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
  const [existingScheduleId, setExistingScheduleId] = useState<number | null>(null);

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
  const [receiptCategory, setReceiptCategory] = useState<string>('cleaning');
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
          estimated_duration: data.estimated_duration ?? 1,
        });
        // Prefill price from estimated_cost (fallback to actual_cost)
        try {
          setValue('price', (data.estimated_cost ?? data.actual_cost) as any);
        } catch {}

        // Try to load existing payment schedule and prefill payment_config
        try {
          const resp = await api.get('/maintenance/payment-schedules/', { params: { scheduled_maintenance: data.id } });
          const schedule = Array.isArray(resp.data) ? (resp.data[0] || null) : (resp.data?.results?.[0] || null);
          if (schedule) {
            console.log('Found existing payment schedule:', schedule);
            setExistingScheduleId(schedule.id);
            
            // Update the initialData to include payment config
            setInitialData(prev => ({
              ...prev,
              id: data.id,
              title: data.title,
              description: data.description ?? '',
              contractor: data.contractor ?? undefined,
              scheduled_date: data.scheduled_date ?? undefined,
              priority: data.priority ?? 'medium',
              status: data.status ?? 'scheduled',
              estimated_duration: data.estimated_duration ?? 1,
              payment_config: {
                enabled: true,
                payment_type: schedule.payment_type || 'lump_sum',
                total_amount: Number(schedule.total_amount) || 0,
                advance_percentage: schedule.advance_percentage || 30,
                installment_count: schedule.installment_count || 3,
                installment_frequency: schedule.installment_frequency || 'monthly',
                periodic_frequency: schedule.periodic_frequency || 'monthly',
                periodic_amount: schedule.periodic_amount || 0,
                start_date: schedule.start_date || '',
                notes: schedule.notes || '',
              }
            } as any));
            
            // Also set the values immediately for immediate render
            setValue('payment_config.enabled', true as any);
            setValue('payment_config.payment_type', (schedule.payment_type || 'lump_sum') as any);
            setValue('payment_config.total_amount', Number(schedule.total_amount) as any);
            setValue('payment_config.advance_percentage', schedule.advance_percentage as any);
            setValue('payment_config.installment_count', schedule.installment_count as any);
            setValue('payment_config.installment_frequency', (schedule.installment_frequency || 'monthly') as any);
            setValue('payment_config.periodic_frequency', (schedule.periodic_frequency || 'monthly') as any);
            setValue('payment_config.periodic_amount', schedule.periodic_amount as any);
            setValue('payment_config.start_date', schedule.start_date as any);
            setValue('payment_config.notes', schedule.notes as any);
          } else {
            console.log('No payment schedule found for maintenance ID:', data.id);
          }
        } catch (error) {
          console.error('Error loading payment schedule:', error);
        }
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
    estimated_duration: (initialData?.estimated_duration as any) ?? 1,
  }), [initialData]);

  const { control, register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch, getValues, reset } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues,
  });

  useEffect(() => {
    // When initial data is loaded/changes, reset form once to those values
    if (initialData) {
      const resetData = {
        title: initialData.title ?? '',
        description: initialData.description ?? '',
        contractor: initialData.contractor ?? undefined,
        scheduled_date: initialData.scheduled_date ? formatForDateInput(initialData.scheduled_date) : undefined,
        priority: initialData.priority ?? 'medium',
        status_ui: initialData.status === 'completed' ? 'executed' : 'pending',
        estimated_duration: (initialData.estimated_duration as any) ?? 1,
        // Include payment config if it exists
        payment_config: (initialData as any)?.payment_config || undefined,
      };
      console.log('Resetting form with data:', resetData);
      reset(resetData);
    }
  }, [initialData, reset]);

  const watchedPrice = watch('price');
  const paymentConfigEnabled = watch('payment_config.enabled');
  const paymentConfig = watch('payment_config');

  if (isLoading) return null;
  if (!(isAdmin || isManager)) {
    if (typeof window !== 'undefined') router.push('/maintenance/scheduled');
    return null;
  }

  const createInstallmentExpenses = async ({
    buildingId,
    title,
    totalAmount,
    advancePercentage,
    installmentCount,
    startDate,
    category,
    scheduledMaintenanceId,
  }: {
    buildingId: number;
    title: string;
    totalAmount: number;
    advancePercentage: number;
    installmentCount: number;
    startDate: string;
    category: string;
    scheduledMaintenanceId: number;
  }) => {
    const advanceAmount = (totalAmount * advancePercentage) / 100;
    const remainingAmount = totalAmount - advanceAmount;
    const installmentAmount = remainingAmount / installmentCount;
    
    // Create advance payment expense (current month)
    const currentDate = new Date().toISOString().slice(0, 10);
    await createExpense({
      building: buildingId,
      title: `${title} - Προκαταβολή (${advancePercentage}%)`,
      amount: Math.round(advanceAmount * 100) / 100,
      date: currentDate,
      category: category,
      distribution_type: 'by_participation_mills',
      notes: `Προκαταβολή ${advancePercentage}% για συντήρηση. Συνολικό κόστος: ${totalAmount}€`,
    } as any);
    
    // Create installment expenses for future months
    const baseDate = new Date(startDate);
    for (let i = 1; i <= installmentCount; i++) {
      const installmentDate = new Date(baseDate);
      installmentDate.setMonth(baseDate.getMonth() + i);
      const installmentDateStr = installmentDate.toISOString().slice(0, 10);
      
      await createExpense({
        building: buildingId,
        title: `${title} - Δόση ${i}/${installmentCount}`,
        amount: Math.round(installmentAmount * 100) / 100,
        date: installmentDateStr,
        category: category,
        distribution_type: 'by_participation_mills',
        notes: `Δόση ${i} από ${installmentCount} για συντήρηση. Ποσό δόσης: ${installmentAmount.toFixed(2)}€`,
      } as any);
    }
  };

  const onSubmit = async (values: FormValues, options?: { skipReceipt?: boolean }) => {
    const buildingId = getActiveBuildingId();
    const isEditing = Boolean(initialData?.id);
    const payload: any = {
      title: values.title,
      priority: values.priority,
    };
    // Only set building on create; do not change building when editing
    if (!isEditing) {
      payload.building = buildingId;
    }
    // Always include description (allow clearing)
    payload.description = (values.description ?? '').trim();
    // Backend requires estimated_duration
    payload.estimated_duration = Number(values.estimated_duration ?? 1);
    // Always include contractor; allow clearing to null
    payload.contractor = (values.contractor !== undefined ? values.contractor : (initialData?.contractor ?? null));
    if (payload.contractor === undefined) payload.contractor = null;
    if (values.scheduled_date) {
      const dateOnly = values.scheduled_date.length > 10 ? values.scheduled_date.slice(0,10) : values.scheduled_date;
      payload.scheduled_date = dateOnly;
    }
    // Map UI status to backend status; only include if changed vs current
    const desiredStatus = values.status_ui === 'executed' ? 'completed' : 'scheduled';
    const currentStatusUi = initialData?.status === 'completed' ? 'executed' : 'pending';
    if (!isEditing || desiredStatus !== (initialData?.status ?? 'scheduled')) {
      payload.status = desiredStatus;
    }

    // Map price → estimated_cost (and actual_cost when executed)
    if (values.price !== undefined && values.price !== null && values.price !== ('' as any)) {
      const priceNum = Number(values.price);
      if (!Number.isNaN(priceNum)) {
        payload.estimated_cost = priceNum;
        if (payload.status === 'completed') {
          payload.actual_cost = priceNum;
        }
      }
    }

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
        await api.patch(`/maintenance/scheduled/${initialData.id}/`, payload, { xToastSuppress: true } as any);
        savedId = initialData.id;
      } else {
        const resp = await api.post('/maintenance/scheduled/', payload, { xToastSuppress: true } as any);
        savedId = resp?.data?.id ?? undefined;
      }
      // If payment configuration is enabled, create installment expenses first, then try payment schedule
      if (savedId && paymentConfigEnabled) {
        const pc = paymentConfig || {};
        
        // Create installment expenses if payment type is advance_installments
        if (pc.payment_type === 'advance_installments' && pc.total_amount && pc.installment_count) {
          try {
            await createInstallmentExpenses({
              buildingId: getActiveBuildingId(),
              title: values.title,
              totalAmount: pc.total_amount,
              advancePercentage: pc.advance_percentage || 30,
              installmentCount: pc.installment_count,
              startDate: pc.start_date || new Date().toISOString().slice(0, 10),
              category: 'building_maintenance',
              scheduledMaintenanceId: savedId,
            });
            toast({ title: 'Επιτυχία', description: `Δημιουργήθηκαν ${pc.installment_count + 1} τμηματικές δαπάνες για το έργο.` });
          } catch (expenseError: any) {
            console.error('Error creating installment expenses:', expenseError);
            toast({ title: 'Σφάλμα', description: 'Υπήρξε πρόβλημα με τη δημιουργία των τμηματικών δαπανών.', variant: 'destructive' as any });
          }
        }

        // Then try to create payment schedule (optional, won't block the flow)
        try {
          const schedulePayload: any = {
            payment_type: pc.payment_type || 'lump_sum',
            total_amount: pc.total_amount ?? watchedPrice ?? 0,
            advance_percentage: pc.advance_percentage,
            installment_count: pc.installment_count,
            installment_frequency: pc.installment_frequency,
            periodic_frequency: pc.periodic_frequency,
            periodic_amount: pc.periodic_amount,
            start_date: pc.start_date || new Date().toISOString().slice(0, 10),
            notes: pc.notes,
          };
          let scheduleResponse;
          if (existingScheduleId) {
            scheduleResponse = await api.patch(`/maintenance/payment-schedules/${existingScheduleId}/`, schedulePayload);
          } else {
            scheduleResponse = await api.post(`/maintenance/scheduled/${savedId}/create_payment_schedule/`, schedulePayload);
          }
        } catch (e: any) {
          // Don't block main flow; show warning with reason
          const msg = (e?.response?.data && JSON.stringify(e.response.data)) || e?.message || 'Αποτυχία ενημέρωσης/δημιουργίας χρονοδιαγράμματος πληρωμών';
          // Don't show toast for this, as installment expenses were created successfully
        }
      }

      if (savedId) {
        toast({ title: 'Επιτυχία', description: `Το έργο καταχωρήθηκε επιτυχώς (ID: ${savedId}).` });
        router.push(`/maintenance/scheduled?highlight=${savedId}`);
      } else {
        toast({ title: 'Επιτυχία', description: 'Το έργο καταχωρήθηκε επιτυχώς.' });
      router.push('/maintenance/scheduled');
      }
    } catch (e: any) {
      const msg = extractApiErrorMessage(e) ?? 'Αποτυχία αποθήκευσης';
      toast({ title: 'Σφάλμα', description: msg, variant: 'destructive' as any });
    }
  };

  function extractApiErrorMessage(error: unknown): string | null {
    try {
      const err = error as any;
      const data = err?.response?.data;
      if (!data) return err?.message ?? null;
      if (typeof data === 'string') return data;
      if (typeof data?.detail === 'string') return data.detail;
      if (Array.isArray(data?.non_field_errors) && data.non_field_errors.length > 0) {
        return String(data.non_field_errors[0]);
      }
      // DRF field errors: { field: [".."], ... }
      const parts: string[] = [];
      Object.entries(data).forEach(([field, val]) => {
        if (Array.isArray(val) && val.length > 0) {
          parts.push(`${field}: ${String(val[0])}`);
        } else if (typeof val === 'string') {
          parts.push(`${field}: ${val}`);
        }
      });
      return parts.length > 0 ? parts.join(' — ') : (err?.message ?? null);
    } catch {
      return null;
    }
  }

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
        <form onSubmit={handleSubmit((values) => onSubmit(values))} className="space-y-4">
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
                    <SelectValue placeholder="Επιλέξτε υπηρεσία" />
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
                    const item = { key, title: newTemplateTitle.trim(), description: newTemplateDescription.trim(), suggestedCategory: 'cleaning' };
                    setTemplates(prev => [{...item}, ...prev]);
                    setValue('template', item.key);
                    setValue('title', item.title as any);
                    setValue('description', item.description as any);
                    setReceiptCategory('cleaning');
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
                    <Select value={field.value !== undefined && field.value !== null ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))}>
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
                      <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v)}>
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
                  <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v)}>
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
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Εκτιμώμενη Διάρκεια (ώρες)</label>
                <Input type="number" step="1" min="1" placeholder="1" {...register('estimated_duration')} />
                {errors.estimated_duration && <p className="text-sm text-red-600">{String(errors.estimated_duration.message || 'Μη έγκυρη διάρκεια')}</p>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Κατάσταση</label>
              <Controller
                control={control}
                name="status_ui"
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v)}>
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
          {/* Payment Configuration */}
          <PaymentConfigurationSection control={control} watch={watch as any} setValue={setValue as any} projectPrice={watchedPrice as any} />
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
                  <SelectItem value="cleaning">Καθαρισμός Κοινοχρήστων Χώρων</SelectItem>
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
                  const currentValues = getValues();
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
            const currentValues = getValues();
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


