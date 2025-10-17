'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  CreditCard, 
  Search, 
  Filter, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Calendar,
  Euro,
  Users,
  MoreVertical,
  Download,
  Eye,
  Settings
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSuperUserGuard } from '@/hooks/useSuperUserGuard';

interface Subscription {
  id: string;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  plan: {
    id: number;
    name: string;
    plan_type: string;
    monthly_price: number;
    yearly_price: number;
  };
  status: 'trial' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'paused';
  billing_interval: 'month' | 'year';
  trial_start?: string;
  trial_end?: string;
  current_period_start: string;
  current_period_end: string;
  price: number;
  currency: string;
  created_at: string;
  days_until_renewal: number;
  usage_stats?: {
    buildings: number;
    apartments: number;
    users: number;
  };
}

interface SubscriptionStats {
  total_subscriptions: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  canceled_subscriptions: number;
  monthly_revenue: number;
  yearly_revenue: number;
  churn_rate: number;
  conversion_rate: number;
  upcoming_trial_expirations: number;
  failed_payments: number;
}

export default function AdminSubscriptionsPage() {
  const { isAccessAllowed, isLoading } = useSuperUserGuard();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'trial' | 'active' | 'past_due' | 'canceled'>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  useEffect(() => {
    if (isAccessAllowed) {
      fetchSubscriptions();
      fetchStats();
    }
  }, [isAccessAllowed]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/subscriptions/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.subscriptions || []);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/subscriptions/stats/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSubscriptionAction = async (subscriptionId: string, action: string, data?: any) => {
    try {
      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/${action}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (response.ok) {
        await fetchSubscriptions();
        await fetchStats();
      }
    } catch (error) {
      console.error(`Error ${action} subscription:`, error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'trial': { variant: 'warning' as const, label: 'Trial', icon: Clock },
      'active': { variant: 'success' as const, label: 'Ενεργή', icon: CheckCircle },
      'past_due': { variant: 'destructive' as const, label: 'Καθυστέρηση', icon: AlertTriangle },
      'canceled': { variant: 'secondary' as const, label: 'Ακυρωμένη', icon: XCircle },
      'unpaid': { variant: 'destructive' as const, label: 'Μη Πληρωμένη', icon: XCircle },
      'paused': { variant: 'secondary' as const, label: 'Σε Παύση', icon: Pause },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <config.icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getPlanBadge = (planType: string) => {
    const planConfig = {
      'starter': { color: 'bg-green-100 text-green-800', label: 'Starter' },
      'professional': { color: 'bg-blue-100 text-blue-800', label: 'Professional' },
      'enterprise': { color: 'bg-purple-100 text-purple-800', label: 'Enterprise' },
    };

    const config = planConfig[planType as keyof typeof planConfig] || planConfig.starter;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.plan.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const matchesPlan = planFilter === 'all' || sub.plan.plan_type === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const formatPrice = (price: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  if (isLoading || loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Φόρτωση συνδρομών...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAccessAllowed) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <CreditCard className="w-16 h-16 mx-auto mb-4" />
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
          <h1 className="text-3xl font-bold text-gray-900">Διαχείριση Συνδρομών</h1>
          <p className="text-gray-600 mt-2">Διαχείριση όλων των συνδρομών του συστήματος</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Εξαγωγή Αναφοράς
          </Button>
          <Button className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Διαχείριση Plans
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Σύνολο Συνδρομών</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_subscriptions}</p>
                <p className="text-xs text-green-600">
                  {stats.active_subscriptions} ενεργές
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Μηνιαίο Έσοδο</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatPrice(stats.monthly_revenue)}
                </p>
                <p className="text-xs text-gray-500">
                  MRR (Monthly Recurring Revenue)
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Trial Συνδρομές</p>
                <p className="text-2xl font-bold text-orange-600">{stats.trial_subscriptions}</p>
                <p className="text-xs text-red-600">
                  {stats.upcoming_trial_expirations} λήγουν σύντομα
                </p>
              </div>
              <Calendar className="w-8 h-8 text-orange-600" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Churn Rate</p>
                <p className="text-2xl font-bold text-red-600">{stats.churn_rate}%</p>
                <p className="text-xs text-gray-500">
                  Conversion: {stats.conversion_rate}%
                </p>
              </div>
              <Users className="w-8 h-8 text-red-600" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Αναζήτηση συνδρομών..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Όλα τα Status</option>
              <option value="trial">Trial</option>
              <option value="active">Ενεργές</option>
              <option value="past_due">Καθυστέρηση</option>
              <option value="canceled">Ακυρωμένες</option>
            </select>
            
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Όλα τα Plans</option>
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Λίστα Συνδρομών ({filteredSubscriptions.length})</h3>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Χρήστης</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Τιμή</TableHead>
                  <TableHead>Περίοδος</TableHead>
                  <TableHead>Λήξη Trial</TableHead>
                  <TableHead>Χρήση</TableHead>
                  <TableHead className="text-right">Ενέργειες</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {subscription.user.first_name} {subscription.user.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{subscription.user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{subscription.plan.name}</div>
                        {getPlanBadge(subscription.plan.plan_type)}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {formatPrice(subscription.price, subscription.currency)}
                        </div>
                        <div className="text-xs text-gray-500">
                          /{subscription.billing_interval === 'month' ? 'μήνας' : 'έτος'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{new Date(subscription.current_period_start).toLocaleDateString('el-GR')}</div>
                        <div className="text-gray-500">έως {new Date(subscription.current_period_end).toLocaleDateString('el-GR')}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {subscription.status === 'trial' && subscription.trial_end ? (
                        <div className="text-sm">
                          <div>{new Date(subscription.trial_end).toLocaleDateString('el-GR')}</div>
                          <div className={`text-xs ${subscription.days_until_renewal <= 3 ? 'text-red-600' : 'text-gray-500'}`}>
                            {subscription.days_until_renewal} ημέρες
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {subscription.usage_stats ? (
                        <div className="text-sm">
                          <div>Κτίρια: {subscription.usage_stats.buildings}</div>
                          <div>Διαμερίσματα: {subscription.usage_stats.apartments}</div>
                          <div>Χρήστες: {subscription.usage_stats.users}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            Προβολή Λεπτομερειών
                          </DropdownMenuItem>
                          {subscription.status === 'trial' && (
                            <DropdownMenuItem
                              onClick={() => handleSubscriptionAction(subscription.id, 'extend_trial', { days: 7 })}
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              Επέκταση Trial
                            </DropdownMenuItem>
                          )}
                          {subscription.status === 'active' && (
                            <DropdownMenuItem
                              onClick={() => handleSubscriptionAction(subscription.id, 'cancel')}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Ακύρωση
                            </DropdownMenuItem>
                          )}
                          {subscription.status === 'canceled' && (
                            <DropdownMenuItem
                              onClick={() => handleSubscriptionAction(subscription.id, 'reactivate')}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Επαναφορά
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleSubscriptionAction(subscription.id, 'generate_invoice')}
                          >
                            <Euro className="w-4 h-4 mr-2" />
                            Δημιουργία Τιμολογίου
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredSubscriptions.length === 0 && (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Δεν βρέθηκαν συνδρομές με τα επιλεγμένα κριτήρια</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// Import missing icons
import { Clock, Pause } from 'lucide-react';

