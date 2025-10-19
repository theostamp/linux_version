'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/contexts/AuthContext';
import { Loader2, CreditCard, CheckCircle, ArrowRight, Zap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface SubscriptionGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  requiredStatus?: 'active' | 'trial' | 'any';
}

export default function SubscriptionGate({
  children,
  fallback,
  requiredStatus = 'any'
}: SubscriptionGateProps) {
  const { user, isAuthReady, isLoading } = useAuth();
  const router = useRouter();
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);

  // Fetch subscription status when user is authenticated
  useEffect(() => {
    const fetchSubscription = async () => {
      if (user) {
        try {
          const { data } = await api.get('/users/subscription/');
          if (data.subscription) {
            setSubscriptionStatus(data.subscription.status);
          } else {
            setSubscriptionStatus(null);
          }
        } catch (error) {
          setSubscriptionStatus(null);
        } finally {
          setIsCheckingSubscription(false);
        }
      } else {
        setIsCheckingSubscription(false);
      }
    };

    fetchSubscription();
  }, [user]);

  // Show loading state while checking auth or subscription
  if (isLoading || !isAuthReady || isCheckingSubscription) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Έλεγχος συνδρομής...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname + window.location.search;
      router.push(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
    }
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Μετάβαση στη σύνδεση...</p>
        </div>
      </div>
    );
  }

  // Check subscription status
  const hasSubscription = subscriptionStatus &&
    (subscriptionStatus === 'active' || subscriptionStatus === 'trial');

  // If requiredStatus is 'active', check specifically for active (not trial)
  const meetsRequirement = requiredStatus === 'active'
    ? subscriptionStatus === 'active'
    : hasSubscription;

  // If user doesn't have required subscription, show fallback or default upgrade page
  if (!meetsRequirement) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white text-center">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Απαιτείται Συνδρομή</h1>
              <p className="text-blue-100">
                Για να έχετε πρόσβαση σε αυτή τη λειτουργία, χρειάζεστε ενεργή συνδρομή
              </p>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Τι περιλαμβάνει η συνδρομή:
                </h2>
                <div className="space-y-3">
                  {[
                    'Πρόσβαση σε όλα τα κτίρια και διαμερίσματα',
                    'Διαχείριση ανακοινώσεων και ψηφοφοριών',
                    'Παρακολούθηση αιτημάτων και συντήρησης',
                    'Οικονομική διαχείριση και αναφορές',
                    'Υποστήριξη 24/7',
                    'Αυτόματα backups και ασφάλεια δεδομένων'
                  ].map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Preview */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Ξεκινά από</p>
                    <p className="text-3xl font-bold text-gray-900">29€<span className="text-lg text-gray-600">/μήνα</span></p>
                  </div>
                  <Zap className="w-12 h-12 text-yellow-500" />
                </div>
                <p className="text-sm text-gray-600">
                  Επιλέξτε το πλάνο που ταιριάζει στις ανάγκες σας
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="space-y-3">
                <Link href="/payment?plan=1" className="block">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Επιλογή Πλάνου & Αγορά
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/my-subscription" className="block">
                  <Button variant="outline" className="w-full py-6 text-lg">
                    Δες τις Επιλογές Συνδρομής
                  </Button>
                </Link>
                <Link href="/dashboard" className="block">
                  <Button variant="ghost" className="w-full">
                    Επιστροφή στο Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Help Text */}
          <p className="text-center text-gray-600 mt-6 text-sm">
            Χρειάζεστε βοήθεια; <a href="mailto:support@example.com" className="text-blue-600 hover:underline">Επικοινωνήστε μαζί μας</a>
          </p>
        </div>
      </div>
    );
  }

  // User has valid subscription, render children
  return <>{children}</>;
}
