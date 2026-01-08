'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';
import {
  Loader2,
  CreditCard,
  Shield,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  RefreshCcw,
  Info,
  HelpCircle,
} from 'lucide-react';
import { typography } from '@/lib/typography';
import {
  FREE_MAX_APARTMENTS,
  PLAN_RATES,
  PREMIUM_IOT_MIN_MONTHLY,
  PREMIUM_MIN_MONTHLY,
  getMonthlyPrice,
} from '@/lib/pricing';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type SubscriptionPlan = {
  id: number;
  name: string;
  description?: string;
  plan_type: string;
  monthly_price: string;
  yearly_price: string;
  max_buildings: number;
  max_apartments: number;
  max_users: number;
  max_api_calls?: number;
  max_storage_gb?: number;
  has_analytics: boolean;
  has_custom_integrations: boolean;
  has_priority_support: boolean;
  has_white_label: boolean;
};

type UserSubscription = {
  id: number;
  status: 'active' | 'trial' | 'trialing' | 'past_due' | 'canceled' | 'cancelled';
  billing_interval: 'month' | 'year';
  trial_start?: string | null;
  trial_end?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  price?: string | null;
  currency?: string | null;
  cancel_at_period_end?: boolean;
  is_trial?: boolean;
  tenant_domain?: string | null;
  plan: SubscriptionPlan;
};

type BillingCycle = {
  id: number;
  period_start: string;
  period_end: string;
  amount_due: string;
  amount_paid: string;
  currency: string;
  status: 'paid' | 'open' | 'draft' | 'void';
  due_date: string;
  paid_at?: string | null;
  stripe_invoice_id?: string | null;
};

type PaymentMethod = {
  id: number;
  payment_type: 'card' | 'sepa' | string;
  card_brand?: string | null;
  card_last4?: string | null;
  card_exp_month?: number | null;
  card_exp_year?: number | null;
  is_default: boolean;
};

type PlanKey = 'web' | 'premium' | 'premium_iot';
type SummaryTabKey = PlanKey;

type PlanSummaryStats = {
  total: number;
  web: number;
  premium: number;
  premium_iot: number;
  apartments: Record<PlanKey, number>;
  charges: Record<PlanKey, number> & { total: number };
};

type UpgradeCandidate = {
  id: number;
  name: string;
  apartmentsCount: number;
};

type SubscriptionBuilding = {
  id: number;
  name: string;
  apartments_count?: number;
  trial_ends_at?: string | null;
  premium_enabled?: boolean;
  iot_enabled?: boolean;
  address?: string;
  city?: string;
  permissions?: {
    can_edit?: boolean;
  };
};

type SubscriptionSummary = {
  subscription: UserSubscription;
  billing_cycles: BillingCycle[];
  usage_tracking: Array<{
    id: number;
    metric_type: string;
    current_value: number;
    limit_value: number;
    period_start: string;
    period_end: string;
  }>;
  payment_methods: PaymentMethod[];
  plan_features: {
    has_analytics: boolean;
    has_custom_integrations: boolean;
    has_priority_support: boolean;
    has_white_label: boolean;
  };
  limits: {
    buildings: number;
    apartments: number;
    users: number;
    api_calls?: number;
    storage_gb?: number;
  };
};

type ApiListResponse<T> =
  | {
      results?: T[];
      subscriptions?: T[];
      message?: string;
    }
  | T[];

const formatDate = (value?: string | null, fallback: string = '—') =>
  value ? format(new Date(value), "d MMM yyyy", { locale: el }) : fallback;

const formatCurrency = (amount?: string | number | null, currency: string = 'EUR') => {
  if (amount === null || amount === undefined) return '€0';
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
};

const parseListResponse = <T,>(payload: ApiListResponse<T>) => {
  if (Array.isArray(payload)) return payload;
  if (payload?.results && Array.isArray(payload.results)) return payload.results;
  if (payload?.subscriptions && Array.isArray(payload.subscriptions)) return payload.subscriptions;
  return [];
};

const resolveBuildingPlan = (building: SubscriptionBuilding): PlanKey => {
  if (building.premium_enabled) {
    return building.iot_enabled ? 'premium_iot' : 'premium';
  }
  return 'web';
};

const planUi: Record<
  PlanKey,
  {
    label: string;
    tabClass: string;
    noteClass: string;
    badgeClass: string;
  }
> = {
  web: {
    label: 'Web',
    tabClass:
      'border border-sky-100/80 bg-sky-50/70 text-sky-700 hover:bg-sky-100/70 data-[state=active]:bg-sky-100 data-[state=active]:text-sky-900 data-[state=active]:ring-0 data-[state=active]:shadow-none data-[state=active]:border-sky-200',
    noteClass: 'text-sky-700/80',
    badgeClass: 'border-sky-200 text-sky-700 bg-sky-50/70',
  },
  premium: {
    label: 'Premium',
    tabClass:
      'border border-emerald-100/80 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100/70 data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-900 data-[state=active]:ring-0 data-[state=active]:shadow-none data-[state=active]:border-emerald-200',
    noteClass: 'text-emerald-700/80',
    badgeClass: 'border-emerald-200 text-emerald-700 bg-emerald-50/70',
  },
  premium_iot: {
    label: 'Premium + IoT',
    tabClass:
      'border border-amber-100/80 bg-amber-50/70 text-amber-700 hover:bg-amber-100/70 data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900 data-[state=active]:ring-0 data-[state=active]:shadow-none data-[state=active]:border-amber-200',
    noteClass: 'text-amber-700/80',
    badgeClass: 'border-amber-200 text-amber-700 bg-amber-50/70',
  },
};

const planToFlags = (plan: PlanKey) => ({
  premium_enabled: plan !== 'web',
  iot_enabled: plan === 'premium_iot',
});

const planInfo: Record<PlanKey, { title: string; details: string[] }> = {
  web: {
    title: 'Πότε να επιλέξω Web συνδρομή',
    details: [
      'Όταν χρειάζεσαι ένα πλήρες εργαλείο συμβατικής διαχείρισης πολυκατοικιών, χωρίς πρόσθετο εξοπλισμό στο κτίριο.',
      'Προσφέρει χαμηλό και προβλέψιμο κόστος σε σχέση με την αγορά, ιδανικό για γραφεία με διαφορετικά μεγέθη χαρτοφυλακίου.',
      'Καλύπτει τις βασικές ροές ενός γραφείου ώστε να οργανώσεις διαδικασίες και να αυξήσεις την παραγωγικότητα.',
    ],
  },
  premium: {
    title: 'Πότε να επιλέξω Premium συνδρομή',
    details: [
      'Όταν χρειάζεσαι όλα όσα προσφέρει το Web και επιπλέον φυσική παρουσία στο κτίριο μέσω info point kiosk.',
      'Περιλαμβάνει τον εξοπλισμό (οθόνη/σύνδεση) και λειτουργίες όπως διαχείριση περιεχομένου, AI παραστατικά και ηλεκτρονικό αρχείο.',
      'Αυτόματη εισαγωγή νέων πολυκατοικιών από υπάρχοντα φύλλα κοινοχρήστων, ώστε η αρχική μετάβαση να γίνεται χωρίς επανακαταχωρήσεις.',
      'Αυτόματη εισαγωγή παραστατικών με ενημέρωση των οικονομικών και αυτόματη αρχειοθέτηση, μειώνοντας αισθητά τον χρόνο χειροκίνητων διαδικασιών.',
    ],
  },
  premium_iot: {
    title: 'Πότε να επιλέξω Premium + IoT συνδρομή',
    details: [
      'Όταν θέλεις τις δυνατότητες του Premium μαζί με έξυπνους αυτοματισμούς IoT.',
      'Κατάλληλο για κτίρια όπου απαιτείται Smart Heating, ειδοποιήσεις βλαβών/διαρροών και συνεχής παρακολούθηση.',
      'Χρήσιμο όταν η ενεργειακή διαχείριση και η άμεση εικόνα λειτουργίας βελτιώνουν την αποτελεσματικότητα του γραφείου.',
    ],
  },
};

const useCurrentSubscription = () =>
  useQuery({
    queryKey: ['subscription-current'],
    queryFn: async () => {
      const data = await api.get<{ subscription?: UserSubscription | null; subscriptions?: UserSubscription[] }>(
        '/billing/subscriptions/current/'
      );
      if (data?.subscription) return data.subscription;
      if (data?.subscriptions?.length) return data.subscriptions[0];
      return null;
    },
    staleTime: 60_000,
  });

const useSubscriptionSummary = (subscriptionId?: number) =>
  useQuery({
    queryKey: ['subscription-summary', subscriptionId],
    queryFn: async () => api.get<SubscriptionSummary>(`/billing/subscriptions/${subscriptionId}/`),
    enabled: Boolean(subscriptionId),
    staleTime: 60_000,
  });

const useSubscriptionPlans = () =>
  useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const response = await api.get<ApiListResponse<SubscriptionPlan>>('/billing/plans/');
      return parseListResponse(response);
    },
    staleTime: 5 * 60_000,
  });

const usePaymentMethods = () =>
  useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const response = await api.get<ApiListResponse<PaymentMethod>>('/billing/payment-methods/');
      return parseListResponse(response);
    },
    staleTime: 60_000,
  });

const useSubscriptionBuildings = () =>
  useQuery({
    queryKey: ['subscription-buildings'],
    queryFn: async () => {
      const response = await api.get<ApiListResponse<SubscriptionBuilding>>('/buildings/my-buildings/');
      return parseListResponse(response);
    },
    staleTime: 60_000,
  });

export default function MySubscriptionPage() {
  const {
    data: subscription,
    isLoading: subscriptionLoading,
    isError: subscriptionError,
    refetch: refetchSubscription,
  } = useCurrentSubscription();
  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useSubscriptionSummary(subscription?.id);
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const { data: paymentMethodsData } = usePaymentMethods();
  const { data: buildings, isLoading: buildingsLoading, refetch: refetchBuildings } = useSubscriptionBuildings();
  const [billingInterval, setBillingInterval] = React.useState<'month' | 'year'>('month');
  const [planChanges, setPlanChanges] = React.useState<Record<number, PlanKey>>({});
  const [updatingBuildingId, setUpdatingBuildingId] = React.useState<number | null>(null);
  const [premiumUpgradeCount, setPremiumUpgradeCount] = React.useState(0);

  const updateMutation = useMutation({
    mutationFn: async (planId: number) =>
      api.post('/billing/subscriptions/update_subscription/', {
        plan_id: planId,
      }),
    onSuccess: () => {
      toast.success('Το πλάνο ενημερώθηκε επιτυχώς');
      void refetchSubscription();
      void refetchSummary();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Σφάλμα κατά την αλλαγή πλάνου';
      toast.error(message);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { planId: number; interval: 'month' | 'year' }) =>
      api.post('/billing/subscriptions/create_subscription/', {
        plan_id: payload.planId,
        billing_interval: payload.interval,
      }),
    onSuccess: () => {
      toast.success('Η συνδρομή ενεργοποιήθηκε επιτυχώς');
      void refetchSubscription();
      void refetchSummary();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Σφάλμα κατά την ενεργοποίηση συνδρομής';
      toast.error(message);
    },
  });

  const portalMutation = useMutation({
    mutationFn: async (returnUrl?: string) =>
      api.post<{ url?: string }>('/billing/portal/', {
        return_url: returnUrl,
      }),
    onSuccess: (data) => {
      if (data?.url && typeof window !== 'undefined') {
        window.location.href = data.url;
        return;
      }
      toast.error('Δεν ήταν δυνατή η δημιουργία σελίδας πληρωμής.');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Σφάλμα κατά το άνοιγμα της σελίδας πληρωμής';
      toast.error(message);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => api.post('/billing/subscriptions/reactivate_subscription/', {}),
    onSuccess: () => {
      toast.success('Η αυτόματη ανανέωση ενεργοποιήθηκε.');
      void refetchSubscription();
      void refetchSummary();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Σφάλμα κατά την επανενεργοποίηση';
      toast.error(message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (cancelAtPeriodEnd: boolean) =>
      api.post('/billing/subscriptions/cancel_subscription/', {
        cancel_at_period_end: cancelAtPeriodEnd,
      }),
    onSuccess: () => {
      toast.success('Η συνδρομή ακυρώθηκε. Ισχύει μέχρι το τέλος της περιόδου.');
      void refetchSubscription();
      void refetchSummary();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Σφάλμα κατά την ακύρωση συνδρομής';
      toast.error(message);
    },
  });

  const updateBuildingPlanMutation = useMutation({
    mutationFn: async ({ buildingId, plan }: { buildingId: number; plan: PlanKey }) =>
      api.patch(`/buildings/list/${buildingId}/`, planToFlags(plan)),
    onMutate: ({ buildingId }) => {
      setUpdatingBuildingId(buildingId);
    },
    onSuccess: (_data, variables) => {
      toast.success('Το πλάνο ενημερώθηκε.');
      setPlanChanges((prev) => {
        const next = { ...prev };
        delete next[variables.buildingId];
        return next;
      });
      void refetchBuildings();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Αποτυχία ενημέρωσης πλάνου.';
      toast.error(message);
    },
    onSettled: () => {
      setUpdatingBuildingId(null);
    },
  });

  const isBusy =
    subscriptionLoading ||
    updateMutation.isPending ||
    cancelMutation.isPending ||
    createMutation.isPending ||
    portalMutation.isPending ||
    reactivateMutation.isPending ||
    updateBuildingPlanMutation.isPending;

  const billingCycles = summary?.billing_cycles ?? [];
  const upcomingInvoice =
    billingCycles.find((cycle) => cycle.status !== 'paid') ?? billingCycles[0] ?? null;
  const paymentMethods = summary?.payment_methods?.length ? summary.payment_methods : paymentMethodsData ?? [];
  const hasActiveSubscription = Boolean(subscription);
  const hasPaymentMethod = paymentMethods.length > 0;
  const isTrial = Boolean(
    subscription &&
      (subscription.status === 'trial' || subscription.status === 'trialing' || subscription.is_trial)
  );
  const trialEndsAt = subscription?.trial_end ?? null;
  const portalLabel = hasPaymentMethod
    ? 'Διαχείριση κάρτας'
    : isTrial
      ? 'Προσθήκη κάρτας (προαιρετικά)'
      : 'Προσθήκη κάρτας';
  const canReactivate = Boolean(subscription?.cancel_at_period_end);

  const availablePlans = React.useMemo(() => {
    if (!plans?.length) return [];
    const allowed = new Set(['web', 'premium', 'premium_iot']);
    return plans
      .filter((plan) => allowed.has(plan.plan_type))
      .sort((a, b) => parseFloat(a.monthly_price) - parseFloat(b.monthly_price));
  }, [plans]);

  const buildingStats = React.useMemo<PlanSummaryStats>(() => {
    const stats: PlanSummaryStats = {
      total: 0,
      web: 0,
      premium: 0,
      premium_iot: 0,
      apartments: { web: 0, premium: 0, premium_iot: 0 },
      charges: { web: 0, premium: 0, premium_iot: 0, total: 0 },
    };
    if (!buildings?.length) return stats;
    stats.total = buildings.length;
    for (const building of buildings) {
      const plan = resolveBuildingPlan(building);
      stats[plan] += 1;
      const apartmentsCount = Math.max(0, building.apartments_count ?? 0);
      stats.apartments[plan] += apartmentsCount;
      stats.charges[plan] += getMonthlyPrice(plan, apartmentsCount);
    }
    stats.charges.total = stats.charges.web + stats.charges.premium + stats.charges.premium_iot;
    return stats;
  }, [buildings]);
  const summaryTabs = React.useMemo(
    () => [
      {
        value: 'web' as SummaryTabKey,
        label: planUi.web.label,
        tabClass: planUi.web.tabClass,
        noteClass: planUi.web.noteClass,
        description: `${buildingStats.web} κτίρια`,
        infoTitle: planInfo.web.title,
        infoBody: planInfo.web.details,
      },
      {
        value: 'premium' as SummaryTabKey,
        label: planUi.premium.label,
        tabClass: planUi.premium.tabClass,
        noteClass: planUi.premium.noteClass,
        description: `${buildingStats.premium} κτίρια`,
        infoTitle: planInfo.premium.title,
        infoBody: planInfo.premium.details,
      },
      {
        value: 'premium_iot' as SummaryTabKey,
        label: planUi.premium_iot.label,
        tabClass: planUi.premium_iot.tabClass,
        noteClass: planUi.premium_iot.noteClass,
        description: `${buildingStats.premium_iot} κτίρια`,
        infoTitle: planInfo.premium_iot.title,
        infoBody: planInfo.premium_iot.details,
      },
    ],
    [buildingStats]
  );
  const summaryTabOrder = summaryTabs.map((tab) => tab.value);

  const upgradeCandidates = React.useMemo<UpgradeCandidate[]>(() => {
    if (!buildings?.length) return [];
    return buildings
      .filter((building) => !building.premium_enabled)
      .map((building) => ({
        id: building.id,
        name: building.name,
        apartmentsCount: Math.max(0, building.apartments_count ?? 0),
      }))
      .sort((a, b) => b.apartmentsCount - a.apartmentsCount);
  }, [buildings]);

  const upgradePreview = React.useMemo(() => {
    const clampedCount = Math.min(premiumUpgradeCount, upgradeCandidates.length);
    const selected = upgradeCandidates.slice(0, clampedCount);
    const additionalCost = selected.reduce((sum, building) => {
      const currentCost = getMonthlyPrice('web', building.apartmentsCount);
      const premiumCost = getMonthlyPrice('premium', building.apartmentsCount);
      return sum + (premiumCost - currentCost);
    }, 0);
    return {
      count: clampedCount,
      additionalCost,
      totalCost: buildingStats.charges.total + additionalCost,
      selected,
    };
  }, [premiumUpgradeCount, upgradeCandidates, buildingStats.charges.total]);

  const upgradeSelectionLabel = React.useMemo(() => {
    if (upgradePreview.selected.length === 0) {
      return 'Δεν έχουν επιλεγεί κτίρια για αναβάθμιση.';
    }
    const names = upgradePreview.selected.map((building) => building.name);
    const visible = names.slice(0, 3);
    const remaining = names.length - visible.length;
    return remaining > 0 ? `${visible.join(', ')} +${remaining} ακόμη` : visible.join(', ');
  }, [upgradePreview.selected]);

  React.useEffect(() => {
    if (subscription?.billing_interval) {
      setBillingInterval(subscription.billing_interval);
    }
  }, [subscription?.billing_interval]);

  React.useEffect(() => {
    setPremiumUpgradeCount((prev) => Math.min(prev, upgradeCandidates.length));
  }, [upgradeCandidates.length]);

  if (subscriptionError) {
    return (
      <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold text-destructive">Αποτυχία φόρτωσης συνδρομής</p>
        <Button onClick={() => refetchSubscription()} variant="outline">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Προσπάθησε ξανά
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={typography.pageTitle}>Η συνδρομή μου</h1>
          <p className="text-muted-foreground">
            Διαχείριση πλάνου, χρεώσεων και ορίων χρήσης για το workspace σου.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void refetchSubscription();
              void refetchSummary();
            }}
            disabled={isBusy}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Ανανέωση
          </Button>
        </div>
      </div>

      {subscriptionLoading ? (
        <div className="flex h-full min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Σύνοψη χρεώσεων</CardTitle>
              <CardDescription>Γρήγορη εικόνα ανά πλάνο για τα κτίριά σου.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="web" className="w-full">
                <TabsList className="grid w-full grid-cols-1 gap-2 bg-transparent p-0 shadow-none sm:grid-cols-2 lg:grid-cols-3">
                  {summaryTabs.map((tab) => (
                    <div key={tab.value} className="relative">
                      <TabsTrigger
                        value={tab.value}
                        className={`min-h-[64px] w-full flex-col items-start gap-1 whitespace-normal text-left pr-10 ${tab.tabClass}`}
                      >
                        <span className="text-xs font-semibold uppercase tracking-wide">{tab.label}</span>
                        <span className={`text-[11px] font-normal ${tab.noteClass}`}>
                          {tab.description}
                        </span>
                      </TabsTrigger>
                      <Dialog>
                        <DialogTrigger asChild>
                          <button
                            type="button"
                            className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-500 shadow-sm transition hover:border-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            aria-label={`Περισσότερα για το πλάνο ${tab.label}`}
                          >
                            <HelpCircle className="h-4 w-4" />
                          </button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{tab.infoTitle}</DialogTitle>
                            <DialogDescription asChild className="space-y-2 list-disc pl-4">
                              <ul>
                                {tab.infoBody.map((line, index) => (
                                  <li key={`${tab.value}-${index}`}>{line}</li>
                                ))}
                              </ul>
                            </DialogDescription>
                          </DialogHeader>
                        </DialogContent>
                      </Dialog>
                    </div>
                  ))}
                </TabsList>
                {summaryTabOrder.map((tabKey) => (
                  <TabsContent key={tabKey} value={tabKey} className="mt-4">
                    <PlanTabContent
                      planKey={tabKey}
                      isLoading={buildingsLoading}
                      buildingStats={buildingStats}
                    />
                  </TabsContent>
                ))}
              </Tabs>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm">
                <span className="text-muted-foreground">Η συνολική μηνιαία σας χρέωση είναι</span>
                {buildingsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <span className="text-lg font-semibold">{formatCurrency(buildingStats.charges.total)}</span>
                )}
              </div>
            </CardContent>
          </Card>

          {!subscription && (
            <Card>
              <CardHeader>
                <CardTitle>Δεν υπάρχει ενεργή συνδρομή</CardTitle>
                <CardDescription>
                  Μπορείς να επανενεργοποιήσεις τη συνδρομή σου επιλέγοντας νέο πλάνο παρακάτω ή να
                  επικοινωνήσεις με την ομάδα μας.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      portalMutation.mutate(window.location.href);
                    }
                  }}
                  disabled={portalMutation.isPending}
                >
                  {portalMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {portalLabel}
                </Button>
                <Button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.location.href = 'mailto:sales@newconcierge.app?subject=New Concierge Subscription';
                    }
                  }}
                >
                  Επικοινωνία με πωλήσεις
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    toast.info('Επίλεξε πλάνο παρακάτω για άμεση επανενεργοποίηση.');
                  }}
                >
                  Επανενεργοποίηση τώρα
                </Button>
              </CardContent>
            </Card>
          )}

          {subscription && (
            <>
              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle>{subscription.plan.name}</CardTitle>
                      <CardDescription>
                        {subscription.plan.description || 'Τρέχον πλάνο workspace'}
                      </CardDescription>
                    </div>
                    <Badge variant={subscription.status === 'active' ? 'active' : 'secondary'}>
                      {subscription.status === 'active' ? 'Ενεργή' : subscription.status}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl bg-muted/20 p-4">
                        <p className="text-xs uppercase text-muted-foreground">Κόστος</p>
                        <p className="text-xl font-semibold">
                          {formatCurrency(subscription.price, subscription.currency || 'EUR')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          / {subscription.billing_interval === 'year' ? 'έτος' : 'μήνα'}
                        </p>
                      </div>
                    <div className="rounded-xl bg-muted/20 p-4">
                        <p className="text-xs uppercase text-muted-foreground">Επόμενη χρέωση</p>
                        <p className="text-lg font-semibold">{formatDate(subscription.current_period_end)}</p>
                        {subscription.current_period_end && (
                          <p className="text-xs text-muted-foreground">
                            σε{' '}
                            {formatDistanceToNow(new Date(subscription.current_period_end), {
                              locale: el,
                            })}
                          </p>
                        )}
                      </div>
                    <div className="rounded-xl bg-muted/20 p-4">
                        <p className="text-xs uppercase text-muted-foreground">Κατάσταση</p>
                        <p className="text-lg font-semibold">
                          {subscription.cancel_at_period_end ? 'Προς ακύρωση' : 'Ενεργό'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {subscription.cancel_at_period_end
                            ? 'Η πρόσβαση θα σταματήσει στο τέλος της περιόδου'
                            : 'Η αυτόματη ανανέωση είναι ενεργή'}
                        </p>
                      </div>
                    </div>

                    {isTrial && (
                      <div className="rounded-lg border border-trial-banner-text/20 bg-trial-banner-bg p-4 text-sm text-trial-banner-text">
                        <p className="font-medium">Δοκιμή σε εξέλιξη</p>
                        <p className="mt-1 text-trial-banner-text/80">
                          {trialEndsAt ? `Λήγει στις ${formatDate(trialEndsAt)}.` : 'Η δοκιμή είναι ενεργή.'}{' '}
                          Στην trial περίοδο δεν απαιτείται κάρτα — θα ζητηθεί πριν τη λήξη.
                        </p>
                      </div>
                    )}

                    <Separator />

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground">Δυνατότητες πλάνου</h3>
                        <div className="space-y-2 text-sm">
                          <FeatureLine
                            icon={<Shield className="h-4 w-4" />}
                            label="Προτεραιότητα υποστήριξης"
                            enabled={summary?.plan_features.has_priority_support}
                          />
                          <FeatureLine
                            icon={<TrendingUp className="h-4 w-4" />}
                            label="Analytics"
                            enabled={summary?.plan_features.has_analytics}
                          />
                          <FeatureLine
                            icon={<CheckCircle className="h-4 w-4" />}
                            label="Custom Integrations"
                            enabled={summary?.plan_features.has_custom_integrations}
                          />
                          <FeatureLine
                            icon={<AlertTriangle className="h-4 w-4" />}
                            label="White Label"
                            enabled={summary?.plan_features.has_white_label}
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground">Όρια</h3>
                        <div className="grid gap-2 text-sm">
                          <LimitPill label="Κτίρια" value={summary?.limits.buildings} />
                          <LimitPill label="Διαμερίσματα" value={summary?.limits.apartments} />
                          <LimitPill label="Χρήστες" value={summary?.limits.users} />
                          <LimitPill label="Storage (GB)" value={summary?.limits.storage_gb ?? 0} />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {canReactivate ? (
                        <Button
                          variant="outline"
                          onClick={() => reactivateMutation.mutate()}
                          disabled={reactivateMutation.isPending}
                        >
                          {reactivateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Επαναφορά αυτόματης ανανέωσης
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="destructive"
                            onClick={() => cancelMutation.mutate(true)}
                            disabled={cancelMutation.isPending || subscription.cancel_at_period_end === true}
                          >
                            {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Ακύρωση στο τέλος περιόδου
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => cancelMutation.mutate(false)}
                            disabled={cancelMutation.isPending}
                          >
                            Σταμάτημα άμεσα
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Τιμολόγηση & ιστορικό</CardTitle>
                    <CardDescription>Επόμενες και προηγούμενες χρεώσεις</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {summaryLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {upcomingInvoice ? (
                      <div className="rounded-xl border border-slate-200/70 bg-white/80 p-4 text-sm">
                        <p className="text-xs uppercase text-muted-foreground">Επόμενη χρέωση</p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(upcomingInvoice.amount_due, upcomingInvoice.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Περίοδος {formatDate(upcomingInvoice.period_start)} →{' '}
                          {formatDate(upcomingInvoice.period_end)}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200/70 bg-white/60 p-4 text-sm text-muted-foreground">
                        Δεν υπάρχει διαθέσιμο ιστορικό χρεώσεων ακόμα.
                      </div>
                    )}

                    <div className="rounded-xl border border-slate-200/70 bg-white/80 p-4 text-sm">
                      <p className="text-xs uppercase text-muted-foreground">Συνολική χρέωση</p>
                      {buildingsLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <p className="text-lg font-semibold">
                          {formatCurrency(buildingStats.charges.total)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs uppercase text-muted-foreground">Τρόποι πληρωμής</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              portalMutation.mutate(window.location.href);
                            }
                          }}
                          disabled={portalMutation.isPending}
                        >
                          {portalMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {portalLabel}
                        </Button>
                      </div>
                      {paymentMethods.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {isTrial
                            ? 'Είσαι σε δοκιμαστική περίοδο. Δεν απαιτείται κάρτα τώρα — θα ζητηθεί πριν τη λήξη.'
                            : 'Δεν έχει αποθηκευτεί κάρτα ακόμη. Πρόσθεσε κάρτα για να ολοκληρώσεις την ενεργοποίηση.'}
                        </p>
                      ) : (
                        paymentMethods.map((method) => (
                          <div
                            key={method.id}
                            className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">
                                  {method.card_brand?.toUpperCase()} •••• {method.card_last4}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Λήξη {method.card_exp_month}/{method.card_exp_year}
                                </p>
                              </div>
                            </div>
                            {method.is_default && <Badge>Προεπιλογή</Badge>}
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

            </>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Πολυκατοικίες & πλάνα</CardTitle>
              <CardDescription>
                <span>Η χρέωση υπολογίζεται ανά διαμέρισμα και ανά πλάνο που έχει επιλεγεί σε κάθε κτίριο.</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Premium: ελάχιστο €30/κτίριο • Premium + IoT: ελάχιστο €35/κτίριο
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">Σύνολο: {buildingStats.total}</Badge>
                <Badge variant="outline" className={planUi.web.badgeClass}>
                  Web: {buildingStats.web}
                </Badge>
                <Badge variant="outline" className={planUi.premium.badgeClass}>
                  Premium: {buildingStats.premium}
                </Badge>
                <Badge variant="outline" className={planUi.premium_iot.badgeClass}>
                  Premium + IoT: {buildingStats.premium_iot}
                </Badge>
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-700">
                <Info className="mt-0.5 h-4 w-4 text-slate-500" />
                <div className="space-y-1">
                  <p className="font-medium text-slate-800">Παράδειγμα υπολογισμού (ανά κτίριο)</p>
                  <p>
                    Premium με 8 διαμερίσματα: 8 × €1,80/διαμέρισμα = €14,40 → χρέωση €30 (ελάχιστο ανά
                    κτίριο).
                  </p>
                  <p>
                    Premium + IoT με 8 διαμερίσματα: 8 × €2,30/διαμέρισμα = €18,40 → χρέωση €35 (ελάχιστο
                    ανά κτίριο).
                  </p>
                  <p>Web: χωρίς ελάχιστο, δωρεάν έως 7 διαμερίσματα.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200/50 bg-emerald-50/40 p-4 text-sm text-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase text-slate-500">Σενάριο αναβάθμισης</p>
                    <p className="text-base font-semibold">Πρόσθεσε σταδιακά κτίρια στο Premium</p>
                  </div>
                  <Badge variant="outline" className="border-slate-200/70 bg-white/80 text-slate-700">
                    +{upgradePreview.count} κτίρια
                  </Badge>
                </div>

                {buildingsLoading ? (
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Φόρτωση σεναρίων αναβάθμισης...
                  </div>
                ) : upgradeCandidates.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-600">
                    Δεν υπάρχουν διαθέσιμα Web κτίρια για αναβάθμιση σε Premium αυτή τη στιγμή.
                  </p>
                ) : (
                  <>
                    <p className="mt-2 text-xs text-slate-600">
                      Σύρε το slider για να δεις το συνολικό κόστος αν αναβαθμίσεις web κτίρια σε Premium. Τα
                      κτίρια ταξινομούνται ανά αριθμό διαμερισμάτων (από τα περισσότερα προς τα λιγότερα).
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-600">
                      <span>
                        Premium κτίρια: {buildingStats.premium} → {buildingStats.premium + upgradePreview.count}
                      </span>
                      <span>
                        Web κτίρια: {buildingStats.web} → {Math.max(0, buildingStats.web - upgradePreview.count)}
                      </span>
                    </div>
                    <div className="mt-4">
                      <input
                        type="range"
                        min={0}
                        max={upgradeCandidates.length}
                        value={upgradePreview.count}
                        onChange={(event) => setPremiumUpgradeCount(parseInt(event.target.value, 10))}
                        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-emerald-100/80
                          [&::-webkit-slider-thumb]:appearance-none
                          [&::-webkit-slider-thumb]:h-5
                          [&::-webkit-slider-thumb]:w-5
                          [&::-webkit-slider-thumb]:rounded-full
                          [&::-webkit-slider-thumb]:bg-emerald-600
                          [&::-webkit-slider-thumb]:shadow-lg
                          [&::-webkit-slider-thumb]:shadow-emerald-600/30
                          [&::-webkit-slider-thumb]:transition-transform
                          [&::-webkit-slider-thumb]:hover:scale-110
                          [&::-moz-range-thumb]:h-5
                          [&::-moz-range-thumb]:w-5
                          [&::-moz-range-thumb]:rounded-full
                          [&::-moz-range-thumb]:border-0
                          [&::-moz-range-thumb]:bg-emerald-600"
                      />
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span>0</span>
                        <span>{upgradeCandidates.length}</span>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
                      <div className="rounded-lg border border-slate-200/70 bg-white/80 px-3 py-2">
                        <p className="text-[11px] uppercase text-slate-500">Τρέχον σύνολο</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(buildingStats.charges.total)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200/70 bg-white/80 px-3 py-2">
                        <p className="text-[11px] uppercase text-slate-500">Επιπλέον κόστος</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {upgradePreview.additionalCost > 0
                            ? `+${formatCurrency(upgradePreview.additionalCost)}`
                            : formatCurrency(0)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200/80 bg-white px-3 py-2">
                        <p className="text-[11px] uppercase text-slate-500">Νέο σύνολο</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(upgradePreview.totalCost)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-[11px] text-slate-500">
                      Επιλεγμένα κτίρια: {upgradeSelectionLabel}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Η προσομοίωση δεν εφαρμόζει αλλαγές στα πλάνα των κτιρίων.
                    </p>
                    <p className="mt-3 text-xs text-slate-700/80">
                      Αν θέλετε πλήρη έλεγχο και πιο δυναμική παρουσία στην πολυκατοικία μέσω του info point
                      kiosk, μπορείτε να προσθέσετε νέα κτίρια στο Premium. Στο κόστος της συνδρομής
                      περιλαμβάνεται ο εξοπλισμός και η εγκατάσταση από συνεργεία μας. Η ελάχιστη διάρκεια
                      συνεργασίας είναι 12 μήνες. Για τρόπους συνεργασίας, επικοινωνήστε μαζί μας.
                    </p>
                  </>
                )}
              </div>

              {buildingsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : buildings && buildings.length > 0 ? (
                <div className="rounded-2xl border border-slate-200/70 bg-white/80">
                  {buildings.map((building, index) => {
                    const planKey = resolveBuildingPlan(building);
                    const planLabel = planUi[planKey].label;
                    const apartmentsCount = building.apartments_count ?? 0;
                    const hasApartments = apartmentsCount > 0;
                    const buildingCharge = getMonthlyPrice(planKey, apartmentsCount);
                    const trialEndsAt = building.trial_ends_at ? new Date(building.trial_ends_at) : null;
                    const trialActive = Boolean(trialEndsAt && trialEndsAt >= new Date());
                    const premiumLocked = planKey !== 'web' && !hasApartments && !trialActive;
                    const selectedPlan = planChanges[building.id] ?? planKey;
                    const canEditPlan = building.permissions?.can_edit ?? false;
                    const hasPlanChange = selectedPlan !== planKey;
                    const isUpdating = updatingBuildingId === building.id;

                    return (
                      <div
                        key={building.id}
                        className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${
                          index > 0 ? 'border-t border-slate-200/60' : ''
                        }`}
                      >
                        <div className="space-y-1">
                          <p className="text-xs uppercase text-muted-foreground">Κτίριο</p>
                          <p className="text-base font-semibold">{building.name}</p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className={planUi[planKey].badgeClass}>
                              {planLabel}
                            </Badge>
                            {planKey === 'premium_iot' && <Badge variant="secondary">IoT</Badge>}
                            <span>Διαμερίσματα: {hasApartments ? apartmentsCount : '—'}</span>
                            <span>Χρέωση: {formatCurrency(buildingCharge)}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-start gap-2 sm:items-end">
                          <div className="flex flex-wrap items-center gap-2">
                            {trialActive && (
                              <Badge variant="secondary">
                                Trial έως {formatDate(building.trial_ends_at)}
                              </Badge>
                            )}
                            {premiumLocked && (
                              <Badge variant="destructive">Premium κλειδωμένο</Badge>
                            )}
                            {!hasApartments && !trialActive && planKey !== 'web' && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Λείπουν διαμερίσματα
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <label className="text-xs text-muted-foreground" htmlFor={`plan-${building.id}`}>
                              Πλάνο
                            </label>
                            <select
                              id={`plan-${building.id}`}
                              className="h-8 rounded-md border bg-background px-2 text-xs"
                              value={selectedPlan}
                              disabled={!canEditPlan || isUpdating}
                              onChange={(event) =>
                                setPlanChanges((prev) => ({
                                  ...prev,
                                  [building.id]: event.target.value as PlanKey,
                                }))
                              }
                            >
                              <option value="web">Web</option>
                              <option value="premium">Premium</option>
                              <option value="premium_iot">Premium + IoT</option>
                            </select>
                            {hasPlanChange && (
                              <Button
                                size="sm"
                                variant="default"
                                disabled={!canEditPlan || isUpdating}
                                onClick={() =>
                                  updateBuildingPlanMutation.mutate({
                                    buildingId: building.id,
                                    plan: selectedPlan,
                                  })
                                }
                              >
                                {isUpdating ? '...' : 'Αλλαγή'}
                              </Button>
                            )}
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/buildings/${building.id}/edit`}>Ενημέρωση κτιρίου</Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Δεν υπάρχουν καταχωρημένες πολυκατοικίες ακόμα.
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Μετά τη λήξη του trial, τα Premium features παραμένουν κλειδωμένα αν δεν έχουν
                συμπληρωθεί διαμερίσματα στο αντίστοιχο κτίριο.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Διαθέσιμα πλάνα</CardTitle>
              <CardDescription>
                Σύγκρινε τα πλάνα και αναβάθμισε ή επανενεργοποίησε απευθείας μέσα από το dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!hasActiveSubscription && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Κύκλος χρέωσης:</span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={billingInterval === 'month' ? 'default' : 'outline'}
                      onClick={() => setBillingInterval('month')}
                    >
                      Μηνιαία
                    </Button>
                    <Button
                      type="button"
                      variant={billingInterval === 'year' ? 'default' : 'outline'}
                      onClick={() => setBillingInterval('year')}
                    >
                      Ετήσια
                    </Button>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Ξεκινάς trial χωρίς κάρτα — θα ζητηθεί πριν τη λήξη.
                  </span>
                </div>
              )}
              {plansLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : availablePlans.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Δεν υπάρχουν διαθέσιμα πλάνα προς το παρόν.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {availablePlans.map((plan) => {
                    const isCurrent = subscription?.plan.id === plan.id;
                    const planPrice = billingInterval === 'year' ? plan.yearly_price : plan.monthly_price;
                    const currentPrice = subscription?.plan?.monthly_price ?? '0';
                    const isUpgrade = hasActiveSubscription && parseFloat(plan.monthly_price) > parseFloat(currentPrice);
                    const actionLabel = hasActiveSubscription
                      ? isCurrent
                        ? 'Ενεργό πλάνο'
                        : isUpgrade
                          ? 'Αναβάθμιση'
                          : 'Αλλαγή πλάνου'
                      : 'Ενεργοποίηση πλάνου';

                    return (
                      <div key={plan.id} className="flex flex-col rounded-2xl border p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm uppercase text-muted-foreground">{plan.plan_type}</p>
                            <p className="text-xl font-semibold">{plan.name}</p>
                          </div>
                          {isCurrent && <Badge>Τρέχον</Badge>}
                        </div>
                        <p className="text-3xl font-semibold">
                          {formatCurrency(planPrice)}
                          <span className="text-sm font-normal text-muted-foreground">
                            {billingInterval === 'year' ? ' /έτος' : ' /μήνα'}
                          </span>
                        </p>
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                        <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                          <li>• Έως {plan.max_buildings} κτίρια</li>
                          <li>• Έως {plan.max_apartments} διαμερίσματα</li>
                          <li>• Έως {plan.max_users} χρήστες</li>
                          {plan.has_priority_support && <li>• Προτεραιότητα υποστήριξης</li>}
                          {plan.has_analytics && <li>• Προηγμένα analytics</li>}
                          {plan.has_custom_integrations && <li>• Ενοποιήσεις</li>}
                        </ul>
                        <div className="mt-4">
                          <Button
                            className="w-full"
                            variant={isCurrent ? 'outline' : 'default'}
                            disabled={isCurrent || updateMutation.isPending || createMutation.isPending}
                            onClick={() => {
                              if (hasActiveSubscription) {
                                updateMutation.mutate(plan.id);
                              } else {
                                if (!hasPaymentMethod && plan.plan_type !== 'free') {
                                  toast.info('Η δοκιμή ξεκινά χωρίς κάρτα. Θα ζητηθεί πριν τη λήξη.');
                                }
                                createMutation.mutate({ planId: plan.id, interval: billingInterval });
                              }
                            }}
                          >
                            {actionLabel}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function PlanTabContent({
  planKey,
  isLoading,
  buildingStats,
}: {
  planKey: PlanKey;
  isLoading: boolean;
  buildingStats: PlanSummaryStats;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Υπολογισμός χρέωσης {planUi[planKey].label}...
      </div>
    );
  }

  const apartmentsCount = buildingStats.apartments[planKey];
  const minCharge =
    planKey === 'premium'
      ? PREMIUM_MIN_MONTHLY
      : planKey === 'premium_iot'
        ? PREMIUM_IOT_MIN_MONTHLY
        : null;

  return (
    <div className="rounded-xl bg-muted/20 p-4 text-sm space-y-2">
      <p className="text-xs text-muted-foreground">
        {planUi[planKey].label} · {buildingStats[planKey]} κτίρια · {apartmentsCount} διαμερίσματα
      </p>
      {planKey === 'web' ? (
        <p className="text-xs text-muted-foreground">
          Μηνιαία χρέωση: {apartmentsCount} × {formatCurrency(PLAN_RATES.web)}/διαμέρισμα (μετά τα πρώτα{' '}
          {FREE_MAX_APARTMENTS}/κτίριο).
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Μηνιαία χρέωση ανά διαμέρισμα {formatCurrency(PLAN_RATES[planKey])}/διαμέρισμα. Σύνολο:{' '}
          {apartmentsCount} × {formatCurrency(PLAN_RATES[planKey])}
          {minCharge ? ` (ελάχιστο ${formatCurrency(minCharge)}/κτίριο).` : '.'}
        </p>
      )}
      <p className="text-sm font-semibold">
        Σύνολο: {formatCurrency(buildingStats.charges[planKey])}
      </p>
    </div>
  );
}

function FeatureLine({
  icon,
  label,
  enabled,
}: {
  icon: React.ReactNode;
  label: string;
  enabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {icon}
      <span>{label}</span>
      <Badge variant={enabled ? 'default' : 'outline'}>{enabled ? 'Περιλαμβάνεται' : 'Μη διαθέσιμο'}</Badge>
    </div>
  );
}

function LimitPill({ label, value }: { label: string; value?: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
      <span>{label}</span>
      <span className="font-semibold">{value ?? '—'}</span>
    </div>
  );
}
