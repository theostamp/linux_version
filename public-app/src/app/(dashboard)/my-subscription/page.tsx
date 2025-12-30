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
import { Loader2, CreditCard, Shield, TrendingUp, CheckCircle, AlertTriangle, RefreshCcw } from 'lucide-react';
import { typography } from '@/lib/typography';
import { getMonthlyPrice } from '@/lib/pricing';

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

const planLabels: Record<PlanKey, string> = {
  web: 'Web',
  premium: 'Premium',
  premium_iot: 'Premium + IoT',
};
const planBadgeClasses: Record<PlanKey, string> = {
  web: 'border-sky-200 text-sky-700 bg-sky-50/70',
  premium: 'border-emerald-200 text-emerald-700 bg-emerald-50/70',
  premium_iot: 'border-amber-200 text-amber-700 bg-amber-50/70',
};

const planToFlags = (plan: PlanKey) => ({
  premium_enabled: plan !== 'web',
  iot_enabled: plan === 'premium_iot',
});

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
  const usageTracking = summary?.usage_tracking ?? [];
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

  const buildingStats = React.useMemo(() => {
    const stats = {
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
    }
    stats.charges.web = getMonthlyPrice('web', stats.apartments.web);
    stats.charges.premium = getMonthlyPrice('premium', stats.apartments.premium);
    stats.charges.premium_iot = getMonthlyPrice('premium_iot', stats.apartments.premium_iot);
    stats.charges.total = stats.charges.web + stats.charges.premium + stats.charges.premium_iot;
    return stats;
  }, [buildings]);

  React.useEffect(() => {
    if (subscription?.billing_interval) {
      setBillingInterval(subscription.billing_interval);
    }
  }, [subscription?.billing_interval]);

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
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase text-muted-foreground">Κόστος</p>
                    <p className="text-xl font-semibold">
                      {formatCurrency(subscription.price, subscription.currency || 'EUR')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      / {subscription.billing_interval === 'year' ? 'έτος' : 'μήνα'}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
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
                  <div className="rounded-lg border p-4">
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
                      <FeatureLine active icon={<Shield className="h-4 w-4" />} label="Προτεραιότητα υποστήριξης" enabled={summary?.plan_features.has_priority_support} />
                      <FeatureLine icon={<TrendingUp className="h-4 w-4" />} label="Analytics" enabled={summary?.plan_features.has_analytics} />
                      <FeatureLine icon={<CheckCircle className="h-4 w-4" />} label="Custom Integrations" enabled={summary?.plan_features.has_custom_integrations} />
                      <FeatureLine icon={<AlertTriangle className="h-4 w-4" />} label="White Label" enabled={summary?.plan_features.has_white_label} />
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
                ) : upcomingInvoice ? (
                  <div className="rounded-lg border bg-muted/40 p-4 text-sm">
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
                  <p className="text-sm text-muted-foreground">
                    Δεν υπάρχει διαθέσιμο ιστορικό χρεώσεων ακόμα.
                  </p>
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
                        {method.is_default && <Badge>Default</Badge>}
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
                Η χρέωση υπολογίζεται ανά διαμέρισμα και ανά πλάνο που έχει επιλεγεί σε κάθε κτίριο.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">Σύνολο: {buildingStats.total}</Badge>
                <Badge variant="secondary">Web: {buildingStats.web}</Badge>
                <Badge variant="secondary">Premium: {buildingStats.premium}</Badge>
                <Badge variant="secondary">Premium + IoT: {buildingStats.premium_iot}</Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-sm text-sky-900">
                  <p className="text-xs uppercase text-muted-foreground">Web</p>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span>Κτίρια</span>
                      <span className="font-semibold">{buildingStats.web}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Διαμερίσματα</span>
                      <span className="font-semibold">{buildingStats.apartments.web}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Κόστος</span>
                      <span className="font-semibold">{formatCurrency(buildingStats.charges.web)}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-900">
                  <p className="text-xs uppercase text-muted-foreground">Premium</p>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span>Κτίρια</span>
                      <span className="font-semibold">{buildingStats.premium}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Διαμερίσματα</span>
                      <span className="font-semibold">{buildingStats.apartments.premium}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Κόστος</span>
                      <span className="font-semibold">{formatCurrency(buildingStats.charges.premium)}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-900">
                  <p className="text-xs uppercase text-muted-foreground">Premium + IoT</p>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span>Κτίρια</span>
                      <span className="font-semibold">{buildingStats.premium_iot}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Διαμερίσματα</span>
                      <span className="font-semibold">{buildingStats.apartments.premium_iot}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Κόστος</span>
                      <span className="font-semibold">{formatCurrency(buildingStats.charges.premium_iot)}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-900">
                  <p className="text-xs uppercase text-muted-foreground">Σύνολο</p>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span>Κτίρια</span>
                      <span className="font-semibold">{buildingStats.total}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Διαμερίσματα</span>
                      <span className="font-semibold">
                        {buildingStats.apartments.web +
                          buildingStats.apartments.premium +
                          buildingStats.apartments.premium_iot}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Κόστος</span>
                      <span className="font-semibold">{formatCurrency(buildingStats.charges.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {buildingsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : buildings && buildings.length > 0 ? (
                <div className="space-y-3">
                  {buildings.map((building) => {
                    const planKey = resolveBuildingPlan(building);
                    const planLabel = planLabels[planKey];
                    const apartmentsCount = building.apartments_count ?? 0;
                    const hasApartments = apartmentsCount > 0;
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
                        className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="text-xs uppercase text-muted-foreground">Κτίριο</p>
                          <p className="text-base font-semibold">{building.name}</p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className={planBadgeClasses[planKey]}>
                              {planLabel}
                            </Badge>
                            {planKey === 'premium_iot' && <Badge variant="secondary">IoT</Badge>}
                            <span>Διαμερίσματα: {hasApartments ? apartmentsCount : '—'}</span>
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
          {subscription && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Χρήση πλατφόρμας</CardTitle>
                  <CardDescription>Παρακολούθηση βασικών μετρικών</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {usageTracking.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Δεν υπάρχουν μετρήσεις χρήσης διαθέσιμες.
                    </p>
                  ) : (
                    usageTracking.map((metric) => (
                      <div
                        key={metric.id}
                        className="rounded-lg border px-3 py-2 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium capitalize">{metric.metric_type.replace('_', ' ')}</p>
                          <Badge variant="outline">
                            {metric.current_value}/{metric.limit_value}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Περίοδος {formatDate(metric.period_start)} → {formatDate(metric.period_end)}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Χρήσιμες ενέργειες</CardTitle>
                  <CardDescription>Υποστήριξη και χρέωση</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="font-medium">Χρειάζεσαι βοήθεια;</p>
                    <p className="text-muted-foreground">
                      Η ομάδα μας είναι διαθέσιμη για αναβαθμίσεις, εξατομίκευση ή ερωτήσεις χρέωσης.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          window.open('mailto:support@newconcierge.app', '_blank');
                        }}
                      >
                        Επικοινωνία υποστήριξης
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.open('https://newconcierge.app/pricing', '_blank')}
                      >
                        Πλάνα & τιμολόγηση
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
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
