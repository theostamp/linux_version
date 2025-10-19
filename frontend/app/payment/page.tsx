'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { CreditCard, Lock, CheckCircle, ArrowLeft, Building } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/contexts/AuthContext';
import { api } from '@/lib/api';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function PaymentFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Get plan and user data from URL params or localStorage
  const [plan, setPlan] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);

  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();

  useEffect(() => {
    // Check if user already has a subscription
    const checkExistingSubscription = async () => {
      if (user) {
        try {
          const { data } = await api.get('/users/subscription/current/');
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

    // Try to get data from URL params first
    const planId = searchParams.get('plan');
    const userEmail = searchParams.get('email');
    const userName = searchParams.get('name');

    if (planId) {
      // Fetch plan details
      // For now, use mock data
      setPlan({
        id: planId,
        name: planId === '1' ? 'Starter' : planId === '2' ? 'Professional' : 'Enterprise',
        price: planId === '1' ? 29 : planId === '2' ? 59 : 99,
        description: 'Digital Concierge Plan'
      });
    }

    if (userEmail && userName) {
      setUserData({ email: userEmail, name: userName });
    } else {
      // Try to get from localStorage
      const storedUserData = localStorage.getItem('registration_data');
      if (storedUserData) {
        setUserData(JSON.parse(storedUserData));
      } else if (user?.email) {
        // Fallback to authenticated user
        setUserData({ email: user.email, name: (user as any)?.full_name || user.email.split('@')[0] });
      }
    }

    // If no plan and no user email in URL, redirect to register
    if (!planId && !userEmail) {
      router.push('/register');
      return;
    }

    // Safety: if plan exists but we still have no userData after short delay, redirect
    const timeout = setTimeout(() => {
      if (planId && !userEmail && !userData && !user) {
        router.push('/register');
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, [searchParams, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setPaymentError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Create payment method
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: userData?.name || '',
          email: userData?.email || '',
        },
      });

      if (error) {
        setPaymentError(error.message || 'Payment failed');
        setIsLoading(false);
        return;
      }

      // Send payment method to backend to create subscription (use axios api with auth interceptor)
      const { data } = await api.post('/users/subscription/create/', {
        payment_method_id: paymentMethod.id,
        plan_id: plan.id,
        user_email: userData.email,
        user_name: userData.name,
      });

      toast.success('Payment successful! Your account is being activated...');

      // Clear registration data
      localStorage.removeItem('registration_data');

      // Redirect to success page
      router.push(`/payment/success?subscription_id=${data.subscription_id}`);

    } catch (error: any) {
      console.error('Payment error:', error);

      // Check if user already has a subscription
      if (error.response?.data?.error === 'You already have an active subscription') {
        toast.success('You already have an active subscription!');
        // Redirect to dashboard
        router.push('/dashboard');
        return;
      }

      setPaymentError(error.response?.data?.error || error.message || 'Payment failed. Please try again.');
      toast.error(error.response?.data?.error || error.message || 'Payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  if (!userData || !plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-primary px-8 py-6">
            <div className="flex items-center">
              <Building className="w-8 h-8 text-white" />
              <span className="ml-2 text-2xl font-bold text-white">Digital Concierge</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-4">
              Ολοκλήρωση Συνδρομής
            </h1>
            <p className="text-primary-foreground/80 mt-2">
              Ασφαλής πληρωμή μέσω Stripe
            </p>
          </div>

          {/* Plan Summary */}
          <div className="px-8 py-6 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {plan.name} Plan
                </h2>
                <p className="text-gray-600">
                  {plan.description}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">
                  €{plan.price}
                </p>
                <p className="text-gray-600">ανά μήνα</p>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="px-8 py-8">
            <div className="space-y-6">
              {/* Billing Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Στοιχεία Χρέωσης
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Όνομα
                    </label>
                    <input
                      type="text"
                      value={userData.name}
                      readOnly
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={userData.email}
                      readOnly
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Τρόπος Πληρωμής
                </h3>
                <div className="border border-gray-300 rounded-lg p-4">
                  <div className="flex items-center mb-4">
                    <CreditCard className="w-5 h-5 text-gray-600 mr-2" />
                    <span className="text-sm font-semibold text-gray-700">
                      Πιστωτική ή Χρεωστική Κάρτα
                    </span>
                  </div>
                  <CardElement options={cardElementOptions} />
                  {paymentError && (
                    <p className="text-red-500 text-sm mt-2">{paymentError}</p>
                  )}
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Lock className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-green-900 mb-1">
                      Ασφαλής Πληρωμή
                    </h4>
                    <p className="text-green-700 text-sm">
                      Οι πληροφορίες πληρωμής σας κρυπτογραφούνται και επεξεργάζονται με ασφάλεια από το Stripe.
                      Δεν αποθηκεύουμε ποτέ τα στοιχεία της κάρτας σας.
                    </p>
                  </div>
                </div>
              </div>

              {/* Money Back Guarantee */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">
                      Εγγύηση επιστροφής χρημάτων 30 ημερών
                    </h4>
                    <p className="text-blue-700 text-sm">
                      Αν δεν είστε ικανοποιημένοι με την υπηρεσία μας, θα επιστρέψουμε την πληρωμή του πρώτου μήνα.
                    </p>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      Σύνολο
                    </p>
                    <p className="text-sm text-gray-600">
                      Χρέωση κάθε μήνα, ακύρωση ανά πάσα στιγμή
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-gray-900">
                      €{plan.price}
                    </p>
                    <p className="text-sm text-gray-600">
                      ανά μήνα
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={() => router.push('/register')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Πίσω στην Εγγραφή
              </button>

              <button
                type="submit"
                disabled={!stripe || isLoading}
                className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Επεξεργασία Πληρωμής...
                  </>
                ) : (
                  <>
                    Συνδρομή - €{plan.price}
                    <CreditCard className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Elements stripe={stripePromise}>
      <PaymentFormInner />
    </Elements>
  );
}
