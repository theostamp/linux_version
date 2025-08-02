'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CreditCard, Plus, Search, Filter, Calendar, User, CheckCircle, 
  AlertCircle, Clock, DollarSign, Eye, Edit, Trash2, Download
} from 'lucide-react';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { 
  fetchPayments, 
  fetchPaymentStatistics,
  type Payment,
  type PaymentStatistics
} from '@/lib/api';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';

export default function PaymentsPage() {
  const { user } = useAuth();
  const { selectedBuilding, currentBuilding } = useBuilding();
  const [isLoading, setIsLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStatistics | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    paymentType: '',
    search: '',
    overdueOnly: false
  });

  const buildingToUse = selectedBuilding || currentBuilding;

  useEffect(() => {
    if (buildingToUse) {
      loadPayments();
    }
  }, [buildingToUse, filters]);

  const loadPayments = async () => {
    if (!buildingToUse) return;
    
    setIsLoading(true);
    try {
      const [paymentsData, statsData] = await Promise.all([
        fetchPayments({
          buildingId: buildingToUse.id,
          status: filters.status || undefined,
          paymentType: filters.paymentType || undefined,
          overdueOnly: filters.overdueOnly
        }),
        fetchPaymentStatistics(buildingToUse.id)
      ]);

      let filteredPayments = paymentsData;
      
      // Client-side search filtering
      if (filters.search) {
        filteredPayments = paymentsData.filter(payment =>
          payment.apartment_number.toLowerCase().includes(filters.search.toLowerCase()) ||
          payment.payment_type_display.toLowerCase().includes(filters.search.toLowerCase()) ||
          payment.reference_number?.toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      setPayments(filteredPayments);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading payments:', error);
      toast.error('Σφάλμα κατά τη φόρτωση των πληρωμών');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Πληρωμένο</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Εκκρεμεί</Badge>;
      case 'overdue':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Ληξιπρόθεσμο</Badge>;
      case 'partial':
        return <Badge variant="outline"><DollarSign className="w-3 h-3 mr-1" />Μερική</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      paymentType: '',
      search: '',
      overdueOnly: false
    });
  };

  if (!buildingToUse) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">💳 Πληρωμές</h1>
        <p className="text-red-600">Παρακαλώ επιλέξτε κτίριο για να συνεχίσετε.</p>
        <BuildingFilterIndicator />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            💳 Πληρωμές Κοινοχρήστων
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Διαχείριση και παρακολούθηση πληρωμών
          </p>
          <BuildingFilterIndicator />
        </div>
        <Button asChild>
          <Link href="/financial/payments/new">
            <Plus className="w-4 h-4 mr-2" />
            Νέα Πληρωμή
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Συνολικές Πληρωμές</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_payments}</div>
              <p className="text-xs text-muted-foreground">
                Συνολικό ποσό: €{stats.total_amount?.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Εκκρεμείς</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending_payments}</div>
              <p className="text-xs text-muted-foreground">
                Περιμένουν πληρωμή
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ληξιπρόθεσμες</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overdue_payments}</div>
              <p className="text-xs text-muted-foreground">
                Απαιτούν προσοχή
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Πληρωμένες</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.paid_payments}</div>
              <p className="text-xs text-muted-foreground">
                Συνολικά: €{stats.total_paid?.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Φίλτρα
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Αναζήτηση</label>
              <Input
                placeholder="Αριθμός διαμερίσματος, τύπος..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Κατάσταση</label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Όλες οι καταστάσεις" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Όλες οι καταστάσεις</SelectItem>
                  <SelectItem value="pending">Εκκρεμεί</SelectItem>
                  <SelectItem value="paid">Πληρωμένο</SelectItem>
                  <SelectItem value="overdue">Ληξιπρόθεσμο</SelectItem>
                  <SelectItem value="partial">Μερική Πληρωμή</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Τύπος Πληρωμής</label>
              <Select value={filters.paymentType} onValueChange={(value) => handleFilterChange('paymentType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Όλοι οι τύποι" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Όλοι οι τύποι</SelectItem>
                  <SelectItem value="common_expenses">Κοινοχρήστων</SelectItem>
                  <SelectItem value="heating">Θέρμανση</SelectItem>
                  <SelectItem value="electricity_common">Ηλεκτρικό Κοινοχρήστων</SelectItem>
                  <SelectItem value="cleaning">Καθαριότητα</SelectItem>
                  <SelectItem value="security">Ασφάλεια</SelectItem>
                  <SelectItem value="elevator">Ανελκυστήρες</SelectItem>
                  <SelectItem value="other">Άλλο</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="w-full"
              >
                Καθαρισμός Φίλτρων
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle>Λίστα Πληρωμών</CardTitle>
          <CardDescription>
            {payments.length} πληρωμές βρέθηκαν
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Φόρτωση πληρωμών...</span>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Δεν βρέθηκαν πληρωμές</p>
              <Button className="mt-4" variant="outline" asChild>
                <Link href="/financial/payments/new">
                  Προσθήκη Πρώτης Πληρωμής
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <User className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {payment.apartment_number} - {payment.payment_type_display}
                      </div>
                      <div className="text-sm text-gray-500">
                        Λήξη: {new Date(payment.due_date).toLocaleDateString('el-GR')}
                        {payment.reference_number && ` • Αναφορά: ${payment.reference_number}`}
                      </div>
                      {payment.notes && (
                        <div className="text-sm text-gray-400 mt-1">
                          {payment.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-medium">€{parseFloat(payment.amount).toLocaleString()}</div>
                      <div className="text-sm text-gray-500">
                        Πληρώθηκε: €{parseFloat(payment.amount_paid).toLocaleString()}
                      </div>
                      {parseFloat(payment.remaining_amount) > 0 && (
                        <div className="text-sm text-red-500">
                          Υπόλοιπο: €{parseFloat(payment.remaining_amount).toLocaleString()}
                        </div>
                      )}
                    </div>
                    
                    {getStatusBadge(payment.status)}
                    
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/financial/payments/${payment.id}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/financial/payments/${payment.id}/edit`}>
                          <Edit className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 