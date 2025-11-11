'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, Building, ArrowRight } from 'lucide-react';

interface PaymentStatus {
  status: 'loading' | 'success' | 'error' | 'pending';
  message: string;
  tenantUrl?: string;
  error?: string;
}

export default function VerifyPaymentPage() {
  const params = useParams();
  const sessionId = params.session_id as string;
  
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    status: 'loading',
    message: 'Verifying your payment...'
  });

  useEffect(() => {
    if (!sessionId) {
      setPaymentStatus({
        status: 'error',
        message: 'Invalid session ID',
        error: 'No session ID provided'
      });
      return;
    }

    // Simulate payment verification and tenant creation
    const verifyPayment = async () => {
      try {
        // TODO: Implement actual payment verification
        // This would typically:
        // 1. Verify the Stripe session
        // 2. Call the Core API to create the tenant
        // 3. Wait for tenant creation to complete
        
        setPaymentStatus({
          status: 'loading',
          message: 'Processing your payment...'
        });

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        setPaymentStatus({
          status: 'loading',
          message: 'Creating your building dashboard...'
        });

        // Simulate tenant creation delay
        await new Promise(resolve => setTimeout(resolve, 3000));

        // For demo purposes, assume success
        setPaymentStatus({
          status: 'success',
          message: 'Your building dashboard is ready!',
          tenantUrl: 'demo.localhost:8080' // This would be dynamic based on the actual tenant
        });

      } catch (error) {
        console.error('Payment verification error:', error);
        setPaymentStatus({
          status: 'error',
          message: 'There was an error processing your payment',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    verifyPayment();
  }, [sessionId]);

  const renderStatusIcon = () => {
    switch (paymentStatus.status) {
      case 'loading':
        return <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-600" />;
      case 'error':
        return <XCircle className="h-16 w-16 text-red-600" />;
      default:
        return <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />;
    }
  };

  const renderStatusMessage = () => {
    return (
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          {paymentStatus.status === 'success' ? 'Welcome to New Concierge!' : 
           paymentStatus.status === 'error' ? 'Payment Verification Failed' :
           'Processing Your Payment'}
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          {paymentStatus.message}
        </p>
        
        {paymentStatus.status === 'success' && paymentStatus.tenantUrl && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-center mb-4">
              <Building className="h-8 w-8 text-green-600 mr-2" />
              <span className="text-lg font-semibold text-green-800">
                Your Building Dashboard
              </span>
            </div>
            <p className="text-green-700 mb-4">
              Your building is now accessible at:
            </p>
            <div className="bg-white border border-green-300 rounded-lg p-4 mb-4">
              <code className="text-green-800 font-mono">
                http://{paymentStatus.tenantUrl}
              </code>
            </div>
            <Link
              href={`http://${paymentStatus.tenantUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Access Your Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        )}

        {paymentStatus.status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <p className="text-red-700 mb-4">
              {paymentStatus.error || 'An unexpected error occurred.'}
            </p>
            <div className="space-y-3">
              <Link
                href="/signup"
                className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Try Again
              </Link>
              <Link
                href="/"
                className="inline-block ml-4 border border-red-300 text-red-700 px-6 py-3 rounded-lg font-semibold hover:bg-red-50 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        )}

        {paymentStatus.status === 'loading' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="animate-pulse bg-blue-200 h-2 w-32 rounded"></div>
              </div>
              <p className="text-blue-700 text-sm">
                This may take a few moments. Please don&apos;t close this page.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/" className="flex items-center">
              <Building className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">New Concierge</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-12">
            <div className="flex flex-col items-center">
              {renderStatusIcon()}
              <div className="mt-8 w-full">
                {renderStatusMessage()}
              </div>
            </div>
          </div>

          {/* Additional Information */}
          {paymentStatus.status === 'success' && (
            <div className="mt-8 bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">What's Next?</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="bg-green-100 w-8 h-8 rounded-full flex items-center justify-center mr-4 mt-1">
                    <span className="text-green-600 font-semibold text-sm">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Access Your Dashboard</h3>
                    <p className="text-gray-600">Log in to your building dashboard to start managing your building.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center mr-4 mt-1">
                    <span className="text-blue-600 font-semibold text-sm">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Set Up Your Building</h3>
                    <p className="text-gray-600">Add apartments, residents, and configure your building settings.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-purple-100 w-8 h-8 rounded-full flex items-center justify-center mr-4 mt-1">
                    <span className="text-purple-600 font-semibold text-sm">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Start Managing</h3>
                    <p className="text-gray-600">Begin using all the features to streamline your building operations.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
