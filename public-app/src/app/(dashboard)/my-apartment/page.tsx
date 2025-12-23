'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/contexts/AuthContext';
import { apiGet } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Home, 
  CreditCard, 
  Receipt, 
  History, 
  Euro, 
  User,
  Building2,
  AlertCircle,
  CheckCircle2,
  Laptop,
  Mail,
  Loader2,
  Wrench,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import AuthGate from '@/components/AuthGate';
import Link from 'next/link';
import { toast } from 'sonner';
import { sendMyApartmentLinkEmail } from '@/lib/api';

// Types
interface PaymentHistory {
  id: number;
  date: string | null;
  amount: number;
  payment_method: string;
  notes: string;
  receipt_number: string;
}

interface ExpenseHistory {
  id: number;
  date: string | null;
  title: string;
  category: string;
  total_amount: number;
  your_share: number;
  payer_responsibility: string;
}

interface TransactionHistory {
  id: number;
  date: string | null;
  type: string;
  amount: number;
  description: string;
  balance_after: number | null;
}

interface ApartmentData {
  id: number;
  number: string;
  floor: number;
  owner_name: string;
  owner_email: string;
  tenant_name: string;
  tenant_email: string;
  is_rented: boolean;
  square_meters: number;
  participation_mills: number;
  current_balance: number;
  building: {
    id: number;
    name: string;
    address: string;
  };
  payment_history: PaymentHistory[];
  expense_history: ExpenseHistory[];
  transaction_history: TransactionHistory[];
  summary: {
    current_balance: number;
    total_paid: number;
    total_expenses: number;
    status: string;
  };
}

interface MyApartmentResponse {
  has_apartment: boolean;
  apartments: ApartmentData[];
  apartments_count: number;
  user: {
    email: string;
    name: string;
  };
  message?: string;
  building?: {
    id: number;
    name: string;
    address: string;
  };
}

// Fetch function
async function fetchMyApartmentData(): Promise<MyApartmentResponse> {
  return apiGet<MyApartmentResponse>('/financial/my-apartment/');
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: 'default' | 'destructive' | 'secondary' | 'outline'; icon: React.ReactNode }> = {
    'Οφειλή': { variant: 'destructive', icon: <AlertCircle className="w-3 h-3 mr-1" /> },
    'Πιστωτικό': { variant: 'secondary', icon: <CheckCircle2 className="w-3 h-3 mr-1" /> },
    'Εξοφλημένο': { variant: 'default', icon: <CheckCircle2 className="w-3 h-3 mr-1" /> },
  };
  
  const { variant, icon } = variants[status] || { variant: 'outline' as const, icon: null };
  
  return (
    <Badge variant={variant} className="flex items-center">
      {icon}
      {status}
    </Badge>
  );
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

// Format date
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy', { locale: el });
  } catch {
    return dateStr;
  }
}

// Payment method translation
function translatePaymentMethod(method: string): string {
  const translations: Record<string, string> = {
    'cash': 'Μετρητά',
    'bank_transfer': 'Τραπεζική Μεταφορά',
    'card': 'Κάρτα',
    'check': 'Επιταγή',
  };
  return translations[method] || method;
}

// Main content component
function MyApartmentContent() {
  const { user } = useAuth();
  const [selectedApartmentIndex, setSelectedApartmentIndex] = useState(0);
  const [isSendingLinkEmail, setIsSendingLinkEmail] = useState(false);
  const supportUrl = useMemo(() => '/users', []);
  
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['my-apartment'],
    queryFn: fetchMyApartmentData,
    enabled: !!user,
  });
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Φόρτωση δεδομένων διαμερίσματος...</p>
        </div>
      </div>
    );
  }
  
  if (isError) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            Σφάλμα
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {(error as Error)?.message || 'Δεν ήταν δυνατή η φόρτωση των δεδομένων του διαμερίσματος.'}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  if (!data?.has_apartment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            Το Διαμέρισμά μου
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Home className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-lg font-medium mb-2">Δεν έχετε συνδεθεί με διαμέρισμα</p>
          <p className="text-muted-foreground mb-4">
            {data?.message || 'Επικοινωνήστε με τον διαχειριστή του κτιρίου για να συνδεθείτε με το διαμέρισμά σας.'}
          </p>
          {data?.building && (
            <div className="inline-flex items-center gap-2 bg-muted rounded-lg px-4 py-2">
              <Building2 className="w-4 h-4" />
              <span>{data.building.name}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
  
  const apartment = data.apartments[selectedApartmentIndex];
  
  if (!apartment) {
    return null;
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Home className="w-8 h-8 text-primary" />
            Το Διαμέρισμά μου
          </h1>
          <p className="text-muted-foreground mt-1">
            Διαμέρισμα {apartment.number} • {apartment.building.name}
          </p>
        </div>
        <StatusBadge status={apartment.summary.status} />
      </div>

      {/* Open on laptop (email only) */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Laptop className="w-4 h-4 text-primary" />
            Άνοιγμα σε υπολογιστή
          </CardTitle>
          <CardDescription>
            Θα σας στείλουμε email με έναν σύνδεσμο για να ανοίξετε τη σελίδα σε laptop.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="text-sm text-muted-foreground">
            Θα σταλεί στο: <span className="font-medium text-foreground">{data.user?.email || user?.email || 'το email σας'}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              disabled={isSendingLinkEmail}
              onClick={async () => {
                setIsSendingLinkEmail(true);
                try {
                  const res = await sendMyApartmentLinkEmail();
                  toast.success(res?.message || 'Στάλθηκε email με τον σύνδεσμο.');
                } catch (e) {
                  const err = e as { status?: number; response?: { body?: string }; message?: string };
                  const status = err?.status;
                  const body = err?.response?.body || '';

                  if (status === 429 || body.includes('throttled')) {
                    toast.error('Έχετε φτάσει το όριο: 2 emails ανά ημέρα.');
                    return;
                  }
                  if (status === 401) {
                    toast.error('Η συνεδρία σας έληξε. Παρακαλώ συνδεθείτε ξανά.');
                    return;
                  }

                  // If backend returned JSON {error: "..."} show it
                  try {
                    const parsed = JSON.parse(body);
                    if (parsed?.error) {
                      toast.error(String(parsed.error));
                      return;
                    }
                  } catch {
                    // ignore JSON parse errors
                  }

                  toast.error('Αποτυχία αποστολής email. Δοκιμάστε ξανά αργότερα.');
                } finally {
                  setIsSendingLinkEmail(false);
                }
              }}
            >
              {isSendingLinkEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Στείλε στο email μου
            </Button>
            <Button type="button" variant="outline" asChild>
              <a href={supportUrl}>Διαχείριση λογαριασμού</a>
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Αν δεν το βρείτε, ελέγξτε και τον φάκελο ανεπιθύμητης αλληλογραφίας (spam).
          </div>
        </CardContent>
      </Card>
      
      {/* Multiple apartments overview */}
      {data.apartments_count > 1 && (
        <>
          {/* Summary for ALL apartments */}
          <Card className="bg-card border-blue-200 dark:border-blue-900 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Συνολική Εποπτεία ({data.apartments_count} Διαμερίσματα)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                {/* Total Balance */}
                <div className="bg-background rounded-lg p-3 shadow-sm border border-border">
                  <p className="text-xs text-muted-foreground">Συνολική Οφειλή</p>
                  <p className={`text-xl font-bold ${
                    data.apartments.reduce((sum, apt) => sum + apt.current_balance, 0) > 0 
                      ? 'text-destructive' 
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {formatCurrency(data.apartments.reduce((sum, apt) => sum + apt.current_balance, 0))}
                  </p>
                </div>
                
                {/* Total Paid */}
                <div className="bg-background rounded-lg p-3 shadow-sm border border-border">
                  <p className="text-xs text-muted-foreground">Συνολικές Πληρωμές</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(data.apartments.reduce((sum, apt) => sum + apt.summary.total_paid, 0))}
                  </p>
                </div>
                
                {/* Total Expenses */}
                <div className="bg-background rounded-lg p-3 shadow-sm border border-border">
                  <p className="text-xs text-muted-foreground">Συνολικές Δαπάνες</p>
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(data.apartments.reduce((sum, apt) => sum + apt.summary.total_expenses, 0))}
                  </p>
                </div>
                
                {/* Apartments with Debt */}
                <div className="bg-background rounded-lg p-3 shadow-sm border border-border">
                  <p className="text-xs text-muted-foreground">Με Οφειλή</p>
                  <p className="text-xl font-bold text-foreground">
                    {data.apartments.filter(apt => apt.current_balance > 0).length} / {data.apartments_count}
                  </p>
                </div>
              </div>
              
              {/* Apartments list with quick info */}
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Επιλέξτε ποιο διαμέρισμα θέλετε να δείτε. Η επιλογή αλλάζει τα στοιχεία οφειλών, πληρωμών και χρεώσεων.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {data.apartments.map((apt, index) => {
                    const isSelected = index === selectedApartmentIndex;
                    const hasDebt = apt.current_balance > 0;
                    return (
                      <button
                        key={apt.id}
                        type="button"
                        onClick={() => setSelectedApartmentIndex(index)}
                        className={[
                          'w-full text-left rounded-lg border px-3 py-3 transition-colors',
                          'bg-background hover:bg-muted/50',
                          isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border',
                        ].join(' ')}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold truncate">
                              Διαμέρισμα {apt.number}
                            </div>
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {apt.building?.name}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {hasDebt ? (
                              <Badge variant="destructive" className="text-xs">
                                {formatCurrency(apt.current_balance)}
                              </Badge>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                ΟΚ
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Τρέχουσα Οφειλή</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${apartment.current_balance > 0 ? 'text-destructive' : apartment.current_balance < 0 ? 'text-green-600 dark:text-green-400' : ''}`}>
              {formatCurrency(apartment.current_balance)}
            </div>
            <p className="text-xs text-muted-foreground">
              {apartment.current_balance > 0 ? 'Εκκρεμεί πληρωμή' : apartment.current_balance < 0 ? 'Πιστωτικό υπόλοιπο' : 'Εξοφλημένο'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Συνολικές Πληρωμές</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(apartment.summary.total_paid)}
            </div>
            <p className="text-xs text-muted-foreground">
              {apartment.payment_history.length} πληρωμές
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Συνολικές Δαπάνες</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(apartment.summary.total_expenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              {apartment.expense_history.length} χρεώσεις
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Apartment Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Στοιχεία Διαμερίσματος
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Αριθμός</p>
              <p className="font-medium">{apartment.number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Όροφος</p>
              <p className="font-medium">{apartment.floor || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Τετραγωνικά</p>
              <p className="font-medium">{apartment.square_meters ? `${apartment.square_meters} τ.μ.` : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Χιλιοστά</p>
              <p className="font-medium">{apartment.participation_mills || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ιδιοκτήτης</p>
              <p className="font-medium">{apartment.owner_name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Κτίριο</p>
              <p className="font-medium">{apartment.building.name}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">Διεύθυνση</p>
              <p className="font-medium">{apartment.building.address || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Quick Actions for Residents */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors cursor-pointer" asChild>
          <Link href="/requests/new">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <Wrench className="w-5 h-5" />
                Αναφορά Βλάβης
              </CardTitle>
              <CardDescription>
                Ενημερώστε τον διαχειριστή για κάποιο τεχνικό πρόβλημα ή ανάγκη συντήρησης.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm font-medium text-primary">
                Δημιουργία νέας αναφοράς <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="bg-secondary/10 border-secondary/20 hover:bg-secondary/20 transition-colors cursor-pointer" asChild>
          <Link href="/requests">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                <History className="w-5 h-5" />
                Ιστορικό Αναφορών
              </CardTitle>
              <CardDescription>
                Δείτε την κατάσταση και την πρόοδο των αναφορών που έχετε υποβάλει.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm font-medium text-foreground">
                Προβολή όλων <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
      
      {/* Tabs for History */}
      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Πληρωμές</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            <span className="hidden sm:inline">Χρεώσεις</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Κινήσεις</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Ιστορικό Πληρωμών</CardTitle>
              <CardDescription>Οι πληρωμές που έχετε πραγματοποιήσει</CardDescription>
            </CardHeader>
            <CardContent>
              {apartment.payment_history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Δεν υπάρχουν καταγεγραμμένες πληρωμές</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ημερομηνία</TableHead>
                      <TableHead>Ποσό</TableHead>
                      <TableHead>Τρόπος Πληρωμής</TableHead>
                      <TableHead>Αρ. Απόδειξης</TableHead>
                      <TableHead>Σημειώσεις</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apartment.payment_history.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.date)}</TableCell>
                        <TableCell className="font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>{translatePaymentMethod(payment.payment_method)}</TableCell>
                        <TableCell>{payment.receipt_number || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{payment.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Expenses Tab */}
        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Ιστορικό Χρεώσεων</CardTitle>
              <CardDescription>Οι δαπάνες που σας αναλογούν</CardDescription>
            </CardHeader>
            <CardContent>
              {apartment.expense_history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Δεν υπάρχουν καταγεγραμμένες χρεώσεις</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ημερομηνία</TableHead>
                      <TableHead>Περιγραφή</TableHead>
                      <TableHead>Κατηγορία</TableHead>
                      <TableHead>Το Μερίδιό σας</TableHead>
                      <TableHead>Συνολικό Ποσό</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apartment.expense_history.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{formatDate(expense.date)}</TableCell>
                        <TableCell className="font-medium">{expense.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{expense.category}</Badge>
                        </TableCell>
                        <TableCell className="font-medium text-destructive">
                          {formatCurrency(expense.your_share)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatCurrency(expense.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Ιστορικό Κινήσεων</CardTitle>
              <CardDescription>Όλες οι οικονομικές κινήσεις</CardDescription>
            </CardHeader>
            <CardContent>
              {apartment.transaction_history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Δεν υπάρχουν καταγεγραμμένες κινήσεις</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ημερομηνία</TableHead>
                      <TableHead>Τύπος</TableHead>
                      <TableHead>Περιγραφή</TableHead>
                      <TableHead>Ποσό</TableHead>
                      <TableHead>Υπόλοιπο</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apartment.transaction_history.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{formatDate(transaction.date)}</TableCell>
                        <TableCell>
                          <Badge variant={transaction.type === 'payment' ? 'default' : 'secondary'}>
                            {transaction.type === 'payment' ? 'Πληρωμή' : 'Χρέωση'}
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.description || '-'}</TableCell>
                        <TableCell className={transaction.type === 'payment' ? 'text-green-600 dark:text-green-400' : 'text-destructive'}>
                          {transaction.type === 'payment' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                        </TableCell>
                        <TableCell>
                          {transaction.balance_after !== null ? formatCurrency(transaction.balance_after) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Future: Online Payment Button */}
      {apartment.current_balance > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">Εκκρεμεί πληρωμή</h3>
                <p className="text-sm text-muted-foreground">
                  Οφείλετε {formatCurrency(apartment.current_balance)}
                </p>
              </div>
              <Button disabled className="gap-2">
                <CreditCard className="w-4 h-4" />
                Πληρωμή Online (Σύντομα)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Main page component with auth gate
export default function MyApartmentPage() {
  return (
    <AuthGate role="any">
      <MyApartmentContent />
    </AuthGate>
  );
}

