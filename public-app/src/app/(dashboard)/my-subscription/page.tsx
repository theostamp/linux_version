'use client';

import * as React from 'react';
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
  status: 'active' | 'trial' | 'trialing' | 'past_due' | 'canceled';
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

  const isBusy = subscriptionLoading || updateMutation.isPending || cancelMutation.isPending;

  const billingCycles = summary?.billing_cycles ?? [];
  const upcomingInvoice =
    billingCycles.find((cycle) => cycle.status !== 'paid') ?? billingCycles[0] ?? null;
  const paymentMethods = summary?.payment_methods ?? [];
  const usageTracking = summary?.usage_tracking ?? [];

  const availablePlans = React.useMemo(() => {
    if (!plans?.length) return [];
    return plans.sort((a, b) => parseFloat(a.monthly_price) - parseFloat(b.monthly_price));
  }, [plans]);

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
      ) : !subscription ? (
        <Card>
          <CardHeader>
            <CardTitle>Δεν έχεις ενεργή συνδρομή</CardTitle>
            <CardDescription>
              Επικοινώνησε με την ομάδα μας για να ενεργοποιήσουμε το κατάλληλο πλάνο ή για να
              ξεκινήσεις νέα δοκιμή.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
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
                toast.info('Σύντομα θα υποστηρίζουμε self-serve ενεργοποίηση μέσα από το dashboard.');
              }}
            >
              Μάθε περισσότερα
            </Button>
          </CardContent>
        </Card>
      ) : (
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
                <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
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
                  <p className="text-xs uppercase text-muted-foreground">Τρόποι πληρωμής</p>
                  {paymentMethods.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Δεν έχει αποθηκευτεί κάρτα ακόμη. Οι πληροφορίες αποθηκεύονται αυτόματα μετά το
                      checkout στον Stripe.
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

          <Card>
            <CardHeader>
              <CardTitle>Διαθέσιμα πλάνα</CardTitle>
              <CardDescription>
                Σύγκρινε τα πλάνα και αναβάθμισε απευθείας μέσα από το dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                          {formatCurrency(plan.monthly_price)}
                          <span className="text-sm font-normal text-muted-foreground"> /μήνα</span>
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
                            disabled={isCurrent || updateMutation.isPending}
                            onClick={() => updateMutation.mutate(plan.id)}
                          >
                            {isCurrent ? 'Ενεργό πλάνο' : 'Επιλογή πλάνου'}
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
