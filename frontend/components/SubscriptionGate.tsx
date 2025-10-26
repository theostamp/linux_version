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
  // FIX: Start with false, only set to true when we actually start checking
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);

  console.log('[SubscriptionGate] Render - user:', user?.email, 'isAuthReady:', isAuthReady, 'isLoading:', isLoading, 'isCheckingSubscription:', isCheckingSubscription);

  // Fetch subscription status when user is authenticated
  useEffect(() => {
    const fetchSubscription = async () => {
      // IMPORTANT: Only fetch if we have a user AND auth is ready
      if (!isAuthReady) {
        console.log('[SubscriptionGate] Auth not ready, waiting...');
        return;
      }

      if (user) {
        console.log('[SubscriptionGate] Fetching subscription for user:', user.email);
        setIsCheckingSubscription(true);
        try {
          const { data } = await api.get('/api/users/subscription/');
          console.log('[SubscriptionGate] Subscription data:', data);
          if (data.subscription) {
            setSubscriptionStatus(data.subscription.status);
            console.log('[SubscriptionGate] Subscription status:', data.subscription.status);
          } else {
            setSubscriptionStatus(null);
            console.log('[SubscriptionGate] No subscription found');
          }
        } catch (error) {
          console.error('[SubscriptionGate] Error fetching subscription:', error);
          setSubscriptionStatus(null);
        } finally {
          setIsCheckingSubscription(false);
          console.log('[SubscriptionGate] Finished checking subscription');
        }
      } else {
        setIsCheckingSubscription(false);
        console.log('[SubscriptionGate] No user, skipping subscription check');
      }
    };

    fetchSubscription();
  }, [user, isAuthReady]);

  // Show loading state while checking auth or subscription
  if (isLoading || !isAuthReady || isCheckingSubscription) {
    console.log('[SubscriptionGate] Showing loading - isLoading:', isLoading, 'isAuthReady:', isAuthReady, 'isCheckingSubscription:', isCheckingSubscription);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Έλεγχος συνδρομής...</p>
          <p className="text-xs text-gray-400 mt-2">
            Loading: {isLoading ? 'yes' : 'no'} | Auth Ready: {isAuthReady ? 'yes' : 'no'} | Checking Sub: {isCheckingSubscription ? 'yes' : 'no'}
          </p>
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

  console.log('[SubscriptionGate] Logic check - subscriptionStatus:', subscriptionStatus, 'hasSubscription:', hasSubscription, 'requiredStatus:', requiredStatus, 'meetsRequirement:', meetsRequirement);

  // If user has subscription, show subscription management page instead of children
  if (hasSubscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-8 text-white text-center">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Ενεργή Συνδρομή</h1>
              <p className="text-green-100">
                Καλώς ήρθατε! Έχετε ενεργή συνδρομή και μπορείτε να διαχειριστείτε τα κτίριά σας
              </p>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Subscription Info */}
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Στοιχεία Συνδρομής
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Κατάσταση:</span>
                      <span className="font-semibold text-green-600 capitalize">{subscriptionStatus}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Tenant:</span>
                      <span className="font-semibold text-gray-900">etherm2021</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Demo Κτίριο:</span>
                      <span className="font-semibold text-gray-900">Αλκμάνος 22</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Ενέργειες
                  </h2>
                  <div className="space-y-3">
                    <Link href="http://etherm2021.localhost:8080/dashboard" className="block">
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg">
                        <ArrowRight className="w-5 h-5 mr-2" />
                        Πήγαινε στην Εφαρμογή
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </Link>
                    <Link href="/my-subscription" className="block">
                      <Button variant="outline" className="w-full py-6 text-lg">
                        <CreditCard className="w-5 h-5 mr-2" />
                        Διαχείριση Συνδρομής
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

  // If user doesn't have required subscription, show fallback or default upgrade page
  if (!meetsRequirement) {
    console.log('[SubscriptionGate] User does not meet requirement, showing fallback or upgrade page');
    if (fallback) {
      console.log('[SubscriptionGate] Using provided fallback component');
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
                <Link href="/plans" className="block">
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
  console.log('[SubscriptionGate] User meets requirement, rendering children');
  return <>{children}</>;
}
