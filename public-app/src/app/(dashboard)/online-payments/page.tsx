'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/contexts/AuthContext';
import { apiGet, apiPost } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CreditCard,
  Euro,
  Clock,
  Shield,
  Smartphone,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Wallet,
  ArrowRight,
  Lock,
  Zap
} from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { useBuilding } from '@/components/contexts/BuildingContext';
import type { CheckoutResponse, OnlineCharge } from '@/types/online-payments';

// Types
interface MyApartmentResponse {
  has_apartment: boolean;
  apartments: Array<{
    id: number;
    number: string;
    current_balance: number;
    building: {
      name: string;
      address: string;
    };
  }>;
}

// Fetch function
async function fetchMyApartmentData(): Promise<MyApartmentResponse> {
  return apiGet<MyApartmentResponse>('/financial/my-apartment/');
}

function normalizeChargesResponse(payload: unknown): OnlineCharge[] {
  if (Array.isArray(payload)) return payload as OnlineCharge[];
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    // Common DRF pagination shape
    if (Array.isArray(obj.results)) return obj.results as OnlineCharge[];
    // Generic wrappers we sometimes use
    if (Array.isArray(obj.data)) return obj.data as OnlineCharge[];
    if (Array.isArray(obj.charges)) return obj.charges as OnlineCharge[];
  }
  return [];
}

async function fetchCharges(buildingId?: number, period?: string, status?: string): Promise<OnlineCharge[]> {
  const params: Record<string, string | number> = {};
  if (buildingId) params.building = buildingId;
  if (period) params.period = period;
  if (status && status !== 'all') params.status = status;
  const response = await apiGet<unknown>('/online-payments/charges/', params);
  return normalizeChargesResponse(response);
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function OnlinePaymentsContent() {
  const { user } = useAuth();
  const { selectedBuilding } = useBuilding();
  const buildingId = selectedBuilding?.id;
  const [selectedPeriod, setSelectedPeriod] = useState<string>(''); // YYYY-MM
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [isStartingCheckout, setIsStartingCheckout] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-apartment-payments'],
    queryFn: fetchMyApartmentData,
    enabled: !!user,
  });

  const { data: charges, isLoading: chargesLoading, refetch: refetchCharges } = useQuery({
    queryKey: ['online-charges', buildingId, selectedPeriod, selectedStatus],
    queryFn: () => fetchCharges(buildingId, selectedPeriod || undefined, selectedStatus),
    enabled: !!user,
    refetchInterval: 8000, // keep UI fresh while webhooks land
  });

  const chargeList = useMemo(() => (Array.isArray(charges) ? charges : []), [charges]);

  const hasBalance = data?.apartments?.some(apt => apt.current_balance > 0);
  const totalBalance = data?.apartments?.reduce((sum, apt) => sum + (apt.current_balance > 0 ? apt.current_balance : 0), 0) || 0;
  const totalPendingCharges = useMemo(() => {
    const sum = chargeList.reduce((acc, c) => acc + Number(c.amount || 0), 0);
    return isNaN(sum) ? 0 : sum;
  }, [chargeList]);

  const startCheckout = async (chargeId: string) => {
    try {
      setIsStartingCheckout(chargeId);
      const res = await apiPost<CheckoutResponse>('/online-payments/checkout/', { charge_id: chargeId });
      if (res?.checkout_url) {
        window.location.href = res.checkout_url;
      }
    } finally {
      setIsStartingCheckout(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900/50 via-blue-800/30 to-indigo-900/50 border border-blue-900/50 p-8 text-foreground">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl backdrop-blur-sm text-blue-400">
              <CreditCard className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Πληρωμή Online</h1>
              <p className="text-muted-foreground mt-1">Εύκολη και ασφαλής πληρωμή κοινοχρήστων</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Φόρτωση οφειλών...</span>
            </div>
          ) : hasBalance ? (
            <div className="mt-6 p-4 bg-card/30 rounded-xl backdrop-blur-sm border border-border">
              <p className="text-sm text-muted-foreground mb-1">Συνολική Οφειλή</p>
              <p className="text-4xl font-bold text-foreground">{formatCurrency(totalBalance)}</p>
            </div>
          ) : (
            <div className="mt-6 flex items-center gap-2 text-green-500 dark:text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Δεν έχετε εκκρεμείς οφειλές!</span>
            </div>
          )}
        </div>
      </div>

      {/* Charges List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Euro className="w-5 h-5" />
            Οφειλές για Online Πληρωμή
          </CardTitle>
          <CardDescription>
            Επιλέξτε οφειλή και συνεχίστε σε ασφαλές Checkout. Η τελική κατάσταση ενημερώνεται από webhook.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Κτίριο</div>
              <div className="text-sm font-medium">
                {selectedBuilding?.name || '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Περίοδος</div>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                placeholder="YYYY-MM (π.χ. 2025-12)"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Κατάσταση</div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Σε εξέλιξη</SelectItem>
                  <SelectItem value="unpaid">Ανεξόφλητο</SelectItem>
                  <SelectItem value="paid">Πληρωμένο</SelectItem>
                  <SelectItem value="failed">Απέτυχε</SelectItem>
                  <SelectItem value="cancelled">Ακυρώθηκε</SelectItem>
                  <SelectItem value="all">Όλα</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Σύνολο (τρέχον φίλτρο): <span className="font-semibold text-foreground">{formatCurrency(totalPendingCharges)}</span>
            </div>
            <Button variant="outline" onClick={() => refetchCharges()} disabled={chargesLoading}>
              Ανανέωση
            </Button>
          </div>

          {chargesLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Φόρτωση οφειλών...</span>
            </div>
          ) : (chargeList.length ? (
            <div className="space-y-3">
              {chargeList.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/40">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.period}</span>
                      <Badge variant="secondary">{c.category}</Badge>
                      <Badge variant="outline">{c.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{c.description || '—'}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(Number(c.amount || 0))}</div>
                      <div className="text-xs text-muted-foreground">{c.routed_to}</div>
                    </div>
                    <Button
                      onClick={() => startCheckout(c.id)}
                      disabled={isStartingCheckout === c.id || c.status === 'paid'}
                      className="gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      {c.status === 'paid' ? 'Πληρώθηκε' : (isStartingCheckout === c.id ? 'Μετάβαση…' : 'Πληρωμή')}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Δεν βρέθηκαν οφειλές για τα επιλεγμένα φίλτρα.
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="group hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="p-3 bg-blue-500/10 rounded-xl w-fit mb-3 group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-lg">Πληρωμή με Κάρτα</CardTitle>
            <CardDescription>
              Χρησιμοποιήστε Visa, Mastercard ή American Express
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="group hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="p-3 bg-green-500/10 rounded-xl w-fit mb-3 group-hover:scale-110 transition-transform">
              <Building2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-lg">Τραπεζική Μεταφορά</CardTitle>
            <CardDescription>
              Άμεση μεταφορά από τον λογαριασμό σας
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="group hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="p-3 bg-purple-500/10 rounded-xl w-fit mb-3 group-hover:scale-110 transition-transform">
              <Wallet className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <CardTitle className="text-lg">Ηλεκτρονικό Πορτοφόλι</CardTitle>
            <CardDescription>
              Apple Pay, Google Pay και άλλα
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Security & Benefits */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              Ασφάλεια Συναλλαγών
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Κρυπτογράφηση SSL 256-bit</p>
                  <p className="text-sm text-muted-foreground">Τα δεδομένα σας είναι πάντα ασφαλή</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Πιστοποίηση PCI DSS</p>
                  <p className="text-sm text-muted-foreground">Πλήρης συμμόρφωση με διεθνή πρότυπα</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Επαλήθευση 3D Secure</p>
                  <p className="text-sm text-muted-foreground">Επιπλέον επίπεδο προστασίας</p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Πλεονεκτήματα
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Άμεση ενημέρωση υπολοίπου</p>
                  <p className="text-sm text-muted-foreground">Δείτε αμέσως την πληρωμή σας</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Πληρωμή από οπουδήποτε</p>
                  <p className="text-sm text-muted-foreground">Μέσω κινητού ή υπολογιστή</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Euro className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Χωρίς επιπλέον χρεώσεις</p>
                  <p className="text-sm text-muted-foreground">Δωρεάν η υπηρεσία πληρωμής</p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Current Balance Card (if there's a balance) */}
      {!isLoading && !isError && data?.has_apartment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="w-5 h-5" />
              Τα Διαμερίσματά μου
            </CardTitle>
            <CardDescription>
              Δείτε τις τρέχουσες οφειλές ανά διαμέρισμα
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.apartments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Διαμέρισμα {apt.number}</p>
                      <p className="text-sm text-muted-foreground">{apt.building.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${apt.current_balance > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                      {formatCurrency(apt.current_balance)}
                    </p>
                    <Badge variant={apt.current_balance > 0 ? 'destructive' : 'secondary'} className="text-xs">
                      {apt.current_balance > 0 ? 'Οφειλή' : 'Εξοφλημένο'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function OnlinePaymentsPage() {
  return (
    <AuthGate role="any">
      <OnlinePaymentsContent />
    </AuthGate>
  );
}
