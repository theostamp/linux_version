import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { CreditCard, Lock, CheckCircle, ArrowLeft, Building } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Initialize Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const PaymentForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  const { userData, plan } = location.state || {};

  useEffect(() => {
    if (!userData || !plan) {
      navigate('/register');
    }
  }, [userData, plan, navigate]);

  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setPaymentError(null);

    try {
      // Create payment method
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
        billing_details: {
          name: userData.name,
          email: userData.email,
        },
      });

      if (error) {
        setPaymentError(error.message);
        setIsLoading(false);
        return;
      }

      // In a real implementation, you would send the payment method to your backend
      // and create a subscription there
      console.log('Payment method created:', paymentMethod);
      
      // Simulate API call to create subscription
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Payment successful! Your account is being activated...');
      
      // Redirect to success page
      navigate('/success', {
        state: {
          userData,
          plan,
          paymentMethod: paymentMethod.id
        }
      });

    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError('Payment failed. Please try again.');
      toast.error('Payment failed. Please try again.');
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
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 px-8 py-6">
            <div className="flex items-center">
              <Building className="w-8 h-8 text-white" />
              <span className="ml-2 text-2xl font-bold text-white">Digital Concierge</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-4">
              Complete Your Subscription
            </h1>
            <p className="text-primary-100 mt-2">
              Secure payment powered by Stripe
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
                <p className="text-gray-600">per month</p>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="px-8 py-8">
            <div className="space-y-6">
              {/* Billing Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Billing Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Name
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
                  Payment Method
                </h3>
                <div className="border border-gray-300 rounded-lg p-4">
                  <div className="flex items-center mb-4">
                    <CreditCard className="w-5 h-5 text-gray-600 mr-2" />
                    <span className="text-sm font-semibold text-gray-700">
                      Credit or Debit Card
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
                      Secure Payment
                    </h4>
                    <p className="text-green-700 text-sm">
                      Your payment information is encrypted and processed securely by Stripe. 
                      We never store your card details.
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
                      30-day money-back guarantee
                    </h4>
                    <p className="text-blue-700 text-sm">
                      If you're not satisfied with our service, we'll refund your first month's payment.
                    </p>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      Total
                    </p>
                    <p className="text-sm text-gray-600">
                      Billed monthly, cancel anytime
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-gray-900">
                      €{plan.price}
                    </p>
                    <p className="text-sm text-gray-600">
                      per month
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Registration
              </button>

              <button
                type="submit"
                disabled={!stripe || isLoading}
                className="bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing Payment...
                  </>
                ) : (
                  <>
                    Subscribe Now - €{plan.price}
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
};

const PaymentFormWrapper = () => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm />
    </Elements>
  );
};

export default PaymentFormWrapper;

