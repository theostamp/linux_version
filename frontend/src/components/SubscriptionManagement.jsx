import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  Users, 
  Building, 
  Zap,
  Crown,
  Star,
  ArrowRight,
  AlertCircle,
  Settings,
  Download
} from 'lucide-react';

const SubscriptionManagement = () => {
  const navigate = useNavigate();
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      
      // Fetch current subscription
      const subscriptionResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:18000'}/api/billing/subscription/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
          'Content-Type': 'application/json',
        },
      });

      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json();
        setCurrentSubscription(subscriptionData);
      }

      // Fetch available plans
      const plansResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:18000'}/api/billing/plans/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
          'Content-Type': 'application/json',
        },
      });

      if (plansResponse.ok) {
        const plansData = await plansResponse.json();
        setAvailablePlans(plansData);
      }

    } catch (error) {
      console.error('Error fetching subscription data:', error);
      toast.error('Σφάλμα κατά τη φόρτωση των δεδομένων συνδρομής');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId) => {
    try {
      setUpgrading(true);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:18000'}/api/billing/subscription/upgrade/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_id: planId,
          billing_interval: 'month'
        }),
      });

      if (response.ok) {
        toast.success('Η αναβάθμιση της συνδρομής ολοκληρώθηκε επιτυχώς!');
        fetchSubscriptionData(); // Refresh data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Σφάλμα κατά την αναβάθμιση');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error(error.message || 'Σφάλμα κατά την αναβάθμιση της συνδρομής');
    } finally {
      setUpgrading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Είστε σίγουροι ότι θέλετε να ακυρώσετε τη συνδρομή σας;')) {
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:18000'}/api/billing/subscription/cancel/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Η συνδρομή ακυρώθηκε επιτυχώς');
        fetchSubscriptionData(); // Refresh data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Σφάλμα κατά την ακύρωση');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error(error.message || 'Σφάλμα κατά την ακύρωση της συνδρομής');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'trial':
        return <Star className="w-5 h-5 text-yellow-500" />;
      case 'past_due':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'canceled':
        return <XCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Ενεργή';
      case 'trial':
        return 'Δοκιμαστική Περίοδος';
      case 'past_due':
        return 'Εκπρόθεσμη';
      case 'canceled':
        return 'Ακυρωμένη';
      default:
        return 'Άγνωστη';
    }
  };

  const getPlanIcon = (planType) => {
    switch (planType) {
      case 'starter':
        return <Zap className="w-6 h-6 text-blue-500" />;
      case 'professional':
        return <Crown className="w-6 h-6 text-purple-500" />;
      case 'enterprise':
        return <Building className="w-6 h-6 text-gold-500" />;
      default:
        return <Star className="w-6 h-6 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Φόρτωση δεδομένων συνδρομής...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Διαχείριση Συνδρομής</h1>
          <p className="mt-2 text-gray-600">Διαχειριστείτε τη συνδρομή και τα χαρακτηριστικά του λογαριασμού σας</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Subscription */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Plan Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {currentSubscription?.plan && getPlanIcon(currentSubscription.plan.plan_type)}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {currentSubscription?.plan?.name || 'Professional Plan'}
                    </h2>
                    <p className="text-gray-600">Τρέχουσα Συνδρομή</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentSubscription && getStatusIcon(currentSubscription.status)}
                  <span className="text-sm font-medium text-gray-700">
                    {currentSubscription ? getStatusText(currentSubscription.status) : 'Ενεργή'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    €{currentSubscription?.plan?.monthly_price || 59}
                  </div>
                  <div className="text-sm text-gray-600">ανά μήνα</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {currentSubscription?.plan?.max_buildings || 5}
                  </div>
                  <div className="text-sm text-gray-600">Κτίρια</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {currentSubscription?.plan?.max_apartments || 100}
                  </div>
                  <div className="text-sm text-gray-600">Διαμερίσματα</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/billing/history')}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Ιστορικό Χρέωσης
                </button>
                <button
                  onClick={() => navigate('/billing/payment-methods')}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Μέθοδοι Πληρωμής
                </button>
                {currentSubscription?.status === 'active' && (
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Ακύρωση
                  </button>
                )}
              </div>
            </div>

            {/* Billing Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Πληροφορίες Χρέωσης</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Επόμενη Χρέωση</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">
                      {currentSubscription?.current_period_end 
                        ? new Date(currentSubscription.current_period_end).toLocaleDateString('el-GR')
                        : 'Επόμενος μήνας'
                      }
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Συχνότητα Χρέωσης</label>
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">
                      {currentSubscription?.billing_interval === 'month' ? 'Μηνιαία' : 'Ετήσια'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Available Plans */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Διαθέσιμα Σχέδια</h3>
            
            {availablePlans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  {getPlanIcon(plan.plan_type)}
                  <div>
                    <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                    <p className="text-sm text-gray-600">{plan.description}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-2xl font-bold text-gray-900">€{plan.monthly_price}</div>
                  <div className="text-sm text-gray-600">ανά μήνα</div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building className="w-4 h-4" />
                    <span>Μέχρι {plan.max_buildings === 999999 ? '∞' : plan.max_buildings} κτίρια</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>Μέχρι {plan.max_apartments === 999999 ? '∞' : plan.max_apartments} διαμερίσματα</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>Μέχρι {plan.max_users === 999999 ? '∞' : plan.max_users} χρήστες</span>
                  </div>
                </div>

                {currentSubscription?.plan?.id !== plan.id && (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={upgrading}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {upgrading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Αναβάθμιση
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}

                {currentSubscription?.plan?.id === plan.id && (
                  <div className="w-full bg-green-100 text-green-800 px-4 py-2 rounded-lg text-center font-medium">
                    Τρέχον Σχέδιο
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManagement;
