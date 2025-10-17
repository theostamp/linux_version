'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Euro, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { useSuperUserGuard } from '@/hooks/useSuperUserGuard';

interface BillingStats {
  overview: {
    total_revenue: number;
    monthly_revenue: number;
    yearly_revenue: number;
    pending_revenue: number;
    total_invoices: number;
    paid_invoices: number;
    pending_invoices: number;
    failed_invoices: number;
    payment_rate: number;
  };
  revenue_trends: Array<{
    month: string;
    revenue: number;
  }>;
  payment_methods: Array<{
    card_brand: string;
    count: number;
  }>;
  metrics: {
    avg_invoice_amount: number;
    churn_rate: number;
    customer_lifetime_value: number;
    mrr: number;
    arr: number;
  };
}

interface RecentPayment {
  id: string;
  user_email: string;
  amount: number;
  status: string;
  date: string;
  method: string;
}

export default function AdminBillingPage() {
  const { isAccessAllowed, isLoading } = useSuperUserGuard();
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    if (isAccessAllowed) {
      fetchBillingData();
    }
  }, [isAccessAllowed, timeRange]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      
      const [statsResponse, paymentsResponse] = await Promise.all([
        fetch(`/api/admin/billing/stats/?period=${timeRange}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        }),
        fetch('/api/admin/billing/recent-payments/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        })
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        setRecentPayments(paymentsData.payments || []);
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyInvoices = async () => {
    try {
      const response = await fetch('/api/admin/billing/generate-monthly-invoices/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Generated ${data.generated_count} monthly invoices`);
        fetchBillingData();
      }
    } catch (error) {
      console.error('Error generating invoices:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      'paid': { variant: 'success' as const, label: 'Πληρωμένο', icon: CheckCircle },
      'pending': { variant: 'warning' as const, label: 'Εκκρεμές', icon: Calendar },
      'failed': { variant: 'destructive' as const, label: 'Αποτυχία', icon: AlertTriangle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <config.icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading || loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Φόρτωση billing data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAccessAllowed) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <Euro className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Πρόσβαση Αρνημένη</h2>
          <p>Δεν έχετε τα απαραίτητα δικαιώματα για πρόσβαση σε αυτή τη σελίδα.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing Dashboard</h1>
          <p className="text-gray-600 mt-2">Οικονομικά στοιχεία και αναλύσεις εσόδων</p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Τελευταίες 7 ημέρες</option>
            <option value="30d">Τελευταίους 30 ημέρες</option>
            <option value="90d">Τελευταίους 90 ημέρες</option>
            <option value="1y">Τελευταίο έτος</option>
          </select>
          <Button variant="outline" onClick={fetchBillingData} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button onClick={generateMonthlyInvoices} className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Generate Invoices
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Συνολικό Έσοδο</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.overview.total_revenue)}
                  </p>
                  <p className="text-xs text-gray-500">Όλων των εποχών</p>
                </div>
                <Euro className="w-8 h-8 text-green-600" />
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Μηνιαίο Έσοδο</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(stats.overview.monthly_revenue)}
                  </p>
                  <p className="text-xs text-gray-500">Τρέχον μήνα</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Εκκρεμή Πληρωμές</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(stats.overview.pending_revenue)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {stats.overview.pending_invoices} τιμολόγια
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatPercentage(stats.overview.payment_rate)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {stats.overview.paid_invoices}/{stats.overview.total_invoices} πληρωμένα
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </div>
            </Card>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">MRR</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(stats.metrics.mrr)}
                </p>
                <p className="text-xs text-gray-500">Monthly Recurring Revenue</p>
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">ARR</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(stats.metrics.arr)}
                </p>
                <p className="text-xs text-gray-500">Annual Recurring Revenue</p>
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Churn Rate</p>
                <p className="text-xl font-bold text-red-600">
                  {formatPercentage(stats.metrics.churn_rate)}
                </p>
                <p className="text-xs text-gray-500">Μηνιαίος ρυθμός αποχώρησης</p>
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">CLV</p>
                <p className="text-xl font-bold text-purple-600">
                  {formatCurrency(stats.metrics.customer_lifetime_value)}
                </p>
                <p className="text-xs text-gray-500">Customer Lifetime Value</p>
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Avg Invoice</p>
                <p className="text-xl font-bold text-orange-600">
                  {formatCurrency(stats.metrics.avg_invoice_amount)}
                </p>
                <p className="text-xs text-gray-500">Μέσο ποσό τιμολογίου</p>
              </div>
            </Card>
          </div>

          {/* Revenue Trends Chart */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Revenue Trends</h3>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-600">12 μήνες</span>
              </div>
            </div>
            
            <div className="h-64 flex items-end justify-between gap-2">
              {stats.revenue_trends.map((trend, index) => (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div
                    className="bg-blue-600 rounded-t w-full mb-2 transition-all hover:bg-blue-700"
                    style={{
                      height: `${Math.max(20, (trend.revenue / Math.max(...stats.revenue_trends.map(t => t.revenue))) * 200)}px`
                    }}
                    title={`${trend.month}: ${formatCurrency(trend.revenue)}`}
                  />
                  <span className="text-xs text-gray-500 transform -rotate-45 origin-left">
                    {trend.month.split('-')[1]}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Payment Methods Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Payment Methods</h3>
              <div className="space-y-4">
                {stats.payment_methods.map((method, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-gray-400" />
                      <span className="font-medium">{method.card_brand || 'Άλλο'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(method.count / Math.max(...stats.payment_methods.map(m => m.count))) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8">{method.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Payments */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Payments</h3>
              <div className="space-y-3">
                {recentPayments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{payment.user_email}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(payment.date).toLocaleDateString('el-GR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(payment.amount)}</p>
                      {getPaymentStatusBadge(payment.status)}
                    </div>
                  </div>
                ))}
                {recentPayments.length === 0 && (
                  <p className="text-center text-gray-500 py-4">Δεν υπάρχουν πρόσφατες πληρωμές</p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
