'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, Lock, CheckCircle, ArrowLeft, Building, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/contexts/AuthContext';
import { api } from '@/lib/api';

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);

  const { user } = useAuth();

  useEffect(() => {
    // Check if user already has a subscription
    const checkExistingSubscription = async () => {
      if (user) {
        try {
          const { data } = await api.get('/api/users/subscription/');
          if (data.subscription && data.subscription.status !== 'canceled') {
            toast.success('You already have an active subscription!');
            router.push('/dashboard');
            return;
          }
        } catch (error) {
          // No subscription found, continue to payment
        }
      }
    };

    checkExistingSubscription();

    const planId = searchParams.get('plan');
    const userEmail = searchParams.get('email');
    const userName = searchParams.get('name');
    const buildingName = searchParams.get('buildingName');

    if (planId) {
      // TODO: Fetch plan details from API instead of mocking
      // For now, use mock data
      setPlan({
        id: planId,
        name: planId === '1' ? 'Starter' : planId === '2' ? 'Professional' : 'Enterprise',
        price: planId === '1' ? 29 : planId === '2' ? 59 : 99,
        description: 'Digital Concierge Plan'
      });
    }

    if (userEmail && userName) {
      setUserData({ email: userEmail, name: userName, buildingName });
    } else {
      // Try to get from localStorage
      const storedUserData = typeof window !== 'undefined' ? localStorage.getItem('registration_data') : null;
      if (storedUserData) {
        setUserData(JSON.parse(storedUserData));
      } else if (user?.email) {
        // Fallback to authenticated user
        setUserData({ email: user.email, name: (user as any)?.full_name || user.email.split('@')[0] });
      }
    }

    // If no plan and no user, but user is authenticated, stay on payment page to show plans
    // Only redirect to register if user is NOT authenticated
    if (!planId && !userEmail && !user) {
      router.push('/register');
      return;
    }

    // No timeout-based redirect if user is authenticated
    // User can select a plan from the payment page
  }, [searchParams, router, user]);

  const handleCreateCheckoutSession = async () => {
    if (!plan || !userData) {
      toast.error('Missing plan or user information');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // Create Stripe Checkout Session
      const { data } = await api.post('/api/billing/create-checkout-session/', {
        plan_id: plan.id,
        building_name: userData.buildingName || ''
      });

      // Redirect to Stripe Checkout
      window.location.href = data.checkout_url;

    } catch (error: any) {
      console.error('Error creating checkout session:', error);

      // Extract detailed error message
      const errorData = error.response?.data;
      let errorMessage = 'Αποτυχία δημιουργίας συνεδρίας πληρωμής. Παρακαλώ προσπαθήστε ξανά.';

      if (errorData) {
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        }

        // Check for specific error types
        if (errorData.error?.includes('already has an active subscription')) {
          errorMessage = 'Έχετε ήδη ενεργή συνδρομή. Δεν μπορείτε να δημιουργήσετε νέα.';
          setTimeout(() => router.push('/dashboard'), 2000);
        } else if (errorData.error?.includes('already has a workspace')) {
          errorMessage = 'Έχετε ήδη χώρο εργασίας. Δεν μπορείτε να δημιουργήσετε νέο.';
          setTimeout(() => router.push('/dashboard'), 2000);
        }
      }

      setError(errorMessage);
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  if (!plan || !userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Subscription</h1>
          <p className="mt-2 text-gray-600">Secure payment powered by Stripe</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Plan Summary */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Plan Summary</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{plan.name} Plan</h3>
                  <p className="text-sm text-gray-500">{plan.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">€{plan.price}</div>
                  <div className="text-sm text-gray-500">per month</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-2">What's included:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Digital Concierge Platform
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Building Management Tools
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Resident Communication
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Financial Management
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    24/7 Support
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Building Name
                </label>
                <div className="flex items-center p-3 border border-gray-300 rounded-md bg-gray-50">
                  <Building className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-gray-900">{userData.buildingName || 'Not specified'}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="flex items-center p-3 border border-gray-300 rounded-md bg-gray-50">
                  <span className="text-gray-900">{userData.email}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="flex items-center p-3 border border-gray-300 rounded-md bg-gray-50">
                  <span className="text-gray-900">{userData.name}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-800">{error}</p>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="text-xs text-red-600 hover:text-red-800 underline mt-2 flex items-center"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Προσπάθεια ξανά
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={handleCreateCheckoutSession}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Επεξεργασία...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Συνέχεια στην Πληρωμή
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
              <Lock className="h-4 w-4 mr-1" />
              Secured by Stripe
            </div>

            <div className="mt-4 text-xs text-gray-500 text-center">
              By continuing, you agree to our Terms of Service and Privacy Policy.
              You will be redirected to Stripe's secure checkout page to complete your payment.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}