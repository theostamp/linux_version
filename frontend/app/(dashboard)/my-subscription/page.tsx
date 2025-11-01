'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Calendar,
  Euro,
  TrendingUp,
  Download,
  Settings,
  ArrowRight,
  Star,
  Zap,
  Crown,
  Clock,
  Pause,
  Play
} from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { userSubscriptionApi, type UserSubscription, type SubscriptionPlan } from '@/lib/api/user';
import { getStatusBadgeVariant, formatCurrency, formatDate } from '@/lib/api/user';
import { toast } from '@/hooks/use-toast';

interface BillingCycle {
  id: string;
  period_start: string;
  period_end: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: 'pending' | 'paid' | 'failed';
  paid_at?: string;
  due_date: string;
  invoice_url?: string;
}

export default function MySubscriptionPage() {
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [billingHistory, setBillingHistory] = useState<BillingCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      
      const [subscriptionResponse, plansResponse, billingResponse] = await Promise.all([
        fetch('/api/user/subscription/current/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        }),
        fetch('/api/subscription-plans/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        }),
        fetch('/api/user/subscription/billing-history/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        })
      ]);

      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json();
        setCurrentSubscription(subscriptionData.subscription);
      }

      if (plansResponse.ok) {
        const plansData = await plansResponse.json();
        setAvailablePlans(plansData.plans || []);
      }

      if (billingResponse.ok) {
        const billingData = await billingResponse.json();
        setBillingHistory(billingData.billing_cycles || []);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionAction = async (action: string, data?: any) => {
    try {
      setActionLoading(true);
      
      const response = await fetch(`/api/user/subscription/${action}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (response.ok) {
        await fetchSubscriptionData();
        alert(`${action} completed successfully!`);
      } else {
        const error = await response.json();
        alert(error.message || `Error performing ${action}`);
      }
    } catch (error) {
      console.error(`Error ${action}:`, error);
      alert(`Error performing ${action}`);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'trial': { variant: 'secondary' as const, label: 'Trial', icon: Clock },
      'active': { variant: 'default' as const, label: 'Ενεργή', icon: CheckCircle },
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

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'starter':
        return <Star className="w-6 h-6 text-green-600" />;
      case 'professional':
        return <Zap className="w-6 h-6 text-blue-600" />;
      case 'enterprise':
        return <Crown className="w-6 h-6 text-purple-600" />;
      default:
        return <CreditCard className="w-6 h-6 text-gray-600" />;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === 0 || limit >= 999999) return 0;
    return Math.min(100, (current / limit) * 100);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Φόρτωση συνδρομής...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthGate>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Η Συνδρομή μου</h1>
            <p className="text-gray-600 mt-2">Διαχείριση συνδρομής και πληρωμών</p>
          </div>
          {currentSubscription && (
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Εξαγωγή Αναφοράς
            </Button>
          )}
        </div>

        {currentSubscription ? (
          <>
            {/* Current Subscription */}
            <Card className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-3">
                    {getPlanIcon(currentSubscription.plan.plan_type)}
                    {currentSubscription.plan.name}
                  </h3>
                  <p className="text-gray-600 mt-1">{currentSubscription.plan.description}</p>
                </div>
                <div className="text-right">
                  {getStatusBadge(currentSubscription.status)}
                  <p className="text-2xl font-bold mt-2">
                    {formatCurrency(currentSubscription.price, currentSubscription.currency)}
                    <span className="text-sm font-normal text-gray-500">
                      /{currentSubscription.billing_interval === 'month' ? 'μήνας' : 'έτος'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-600">Τρέχουσα Περίοδος</p>
                  <p className="text-lg font-semibold">
                    {new Date(currentSubscription.current_period_start).toLocaleDateString('el-GR')} - 
                    {new Date(currentSubscription.current_period_end).toLocaleDateString('el-GR')}
                  </p>
                </div>
                
                {currentSubscription.status === 'trial' && currentSubscription.trial_end && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Λήξη Trial</p>
                    <p className="text-lg font-semibold text-orange-600">
                      {new Date(currentSubscription.trial_end).toLocaleDateString('el-GR')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {currentSubscription.days_until_renewal} ημέρες απομένουν
                    </p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm font-medium text-gray-600">Επόμενη Πληρωμή</p>
                  <p className="text-lg font-semibold">
                    {currentSubscription.days_until_renewal} ημέρες
                  </p>
                </div>
              </div>

              {/* Usage Stats */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3">Χρήση</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Κτίρια</span>
                      <span className="text-sm text-gray-500">
                        {currentSubscription.usage.buildings}/{currentSubscription.usage_limits.buildings === 999999 ? '∞' : currentSubscription.usage_limits.buildings}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${getUsagePercentage(currentSubscription.usage.buildings, currentSubscription.usage_limits.buildings)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Διαμερίσματα</span>
                      <span className="text-sm text-gray-500">
                        {currentSubscription.usage.apartments}/{currentSubscription.usage_limits.apartments === 999999 ? '∞' : currentSubscription.usage_limits.apartments}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${getUsagePercentage(currentSubscription.usage.apartments, currentSubscription.usage_limits.apartments)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Χρήστες</span>
                      <span className="text-sm text-gray-500">
                        {currentSubscription.usage.users}/{currentSubscription.usage_limits.users === 999999 ? '∞' : currentSubscription.usage_limits.users}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{ width: `${getUsagePercentage(currentSubscription.usage.users, currentSubscription.usage_limits.users)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Διαχείριση Πληρωμών
                </Button>
                
                {currentSubscription.status === 'active' && (
                  <Button 
                    variant="outline" 
                    onClick={() => handleSubscriptionAction('cancel')}
                    disabled={actionLoading}
                  >
                    Ακύρωση Συνδρομής
                  </Button>
                )}
                
                {currentSubscription.status === 'canceled' && (
                  <Button 
                    onClick={() => handleSubscriptionAction('reactivate')}
                    disabled={actionLoading}
                    className="flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Επαναφορά Συνδρομής
                  </Button>
                )}
                
                <Button 
                  variant="outline"
                  onClick={() => handleSubscriptionAction('upgrade')}
                  disabled={actionLoading}
                >
                  Upgrade Plan
                </Button>
              </div>
            </Card>

            {/* Billing History */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Ιστορικό Πληρωμών</h3>
              
              {billingHistory.length > 0 ? (
                <div className="space-y-4">
                  {billingHistory.slice(0, 5).map((cycle) => (
                    <div key={cycle.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">
                          {new Date(cycle.period_start).toLocaleDateString('el-GR')} - 
                          {new Date(cycle.period_end).toLocaleDateString('el-GR')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {cycle.status === 'paid' && cycle.paid_at
                            ? `Πληρώθηκε στις ${new Date(cycle.paid_at).toLocaleDateString('el-GR')}`
                            : `Λήγει στις ${new Date(cycle.due_date).toLocaleDateString('el-GR')}`
                          }
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(cycle.total_amount)}
                        </p>
                        <Badge variant={cycle.status === 'paid' ? 'default' : 'secondary'}>
                          {cycle.status === 'paid' ? 'Πληρωμένο' : 'Εκκρεμές'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  {billingHistory.length > 5 && (
                    <Button variant="outline" className="w-full">
                      Προβολή Όλων
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">
                  Δεν υπάρχει ιστορικό πληρωμών
                </p>
              )}
            </Card>
          </>
        ) : (
          /* No Subscription - Show Plans */
          <div className="space-y-6">
            <Card className="p-6 text-center">
              <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Δεν έχετε συνδρομή</h3>
              <p className="text-gray-600 mb-6">
                Επιλέξτε ένα plan για να αποκτήσετε πρόσβαση σε όλες τις δυνατότητες του συστήματος.
              </p>
            </Card>

            {/* Available Plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {availablePlans.map((plan) => (
                <Card key={plan.id} className="p-6 relative">
                  
                  <div className="text-center mb-6">
                    <div className="flex justify-center mb-4">
                      {getPlanIcon(plan.plan_type)}
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                    
                    <div className="mb-4">
                      <span className="text-3xl font-bold">{formatCurrency(plan.monthly_price)}</span>
                      <span className="text-gray-500">/μήνας</span>
                    </div>
                    
                    <div className="text-sm text-gray-500 mb-6">
                      ή {formatCurrency(plan.yearly_price)}/έτος (20% έκπτωση)
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    {plan.features.has_analytics && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Analytics</span>
                      </div>
                    )}
                    {plan.features.has_custom_integrations && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Custom Integrations</span>
                      </div>
                    )}
                    {plan.features.has_priority_support && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Priority Support</span>
                      </div>
                    )}
                    {plan.features.has_white_label && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm">White Label</span>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    className="w-full flex items-center justify-center gap-2"
                    variant="outline"
                  >
                    Επιλογή Plan
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  );
}


