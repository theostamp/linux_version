'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  Building, 
  Users, 
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Subscription {
  id: number;
  plan_name: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  tenant?: {
    schema_name: string;
    name: string;
  };
}

export default function MySubscriptionPage() {
  const { user, isAuthReady } = useAuth();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthReady) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    fetchSubscription();
  }, [user, isAuthReady]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/users/subscription/');
      
      if (data.subscription) {
        setSubscription(data.subscription);
      } else {
        setSubscription(null);
      }
    } catch (err: any) {
      console.error('Failed to fetch subscription:', err);
      setError('Αποτυχία φόρτωσης συνδρομής');
      toast.error('Αποτυχία φόρτωσης συνδρομής');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    fetchSubscription();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Φόρτωση συνδρομής...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Σφάλμα</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button onClick={handleRetry} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Προσπάθεια Ξανά
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Η Συνδρομή Μου</h1>
            <p className="mt-2 text-gray-600">Διαχείριση συνδρομής και χρέωσης</p>
          </div>

          <Card>
            <CardContent className="p-8 text-center">
              <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Δεν Έχετε Συνδρομή</h2>
              <p className="text-gray-600 mb-6">
                Δεν έχετε ενεργή συνδρομή. Επιλέξτε ένα πακέτο για να ξεκινήσετε.
              </p>
              <div className="space-y-3">
                <Link href="/plans" className="block">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Επιλογή Πακέτου
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/dashboard" className="block">
                  <Button variant="outline" className="w-full">
                    Επιστροφή στο Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'trial':
        return 'text-blue-600 bg-blue-100';
      case 'canceled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ενεργή';
      case 'trial':
        return 'Δοκιμαστική';
      case 'canceled':
        return 'Ακυρωμένη';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Η Συνδρομή Μου</h1>
          <p className="mt-2 text-gray-600">Διαχείριση συνδρομής και χρέωσης</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Subscription Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Στοιχεία Συνδρομής
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Πλάνο:</span>
                <span className="font-semibold">{subscription.plan_name}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Κατάσταση:</span>
                <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(subscription.status)}`}>
                  {getStatusText(subscription.status)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Έναρξη:</span>
                <span className="font-semibold">
                  {new Date(subscription.current_period_start).toLocaleDateString('el-GR')}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Λήξη:</span>
                <span className="font-semibold">
                  {new Date(subscription.current_period_end).toLocaleDateString('el-GR')}
                </span>
              </div>

              {subscription.cancel_at_period_end && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mr-2" />
                    <span className="text-sm text-yellow-800">
                      Η συνδρομή θα ακυρωθεί στο τέλος της περιόδου
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tenant Information */}
          {subscription.tenant && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Χώρος Εργασίας
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Όνομα:</span>
                  <span className="font-semibold">{subscription.tenant.name}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Schema:</span>
                  <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                    {subscription.tenant.schema_name}
                  </span>
                </div>

                <div className="pt-4">
                  <Link href={`http://${subscription.tenant.schema_name}.localhost:8080/dashboard`} className="block">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      <Building className="w-4 h-4 mr-2" />
                      Πήγαινε στην Εφαρμογή
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Ενέργειες</CardTitle>
              <CardDescription>
                Διαχείριση συνδρομής και ρυθμίσεις
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link href="/plans" className="block">
                  <Button variant="outline" className="w-full">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Αλλαγή Πακέτου
                  </Button>
                </Link>
                
                <Link href="/dashboard" className="block">
                  <Button variant="outline" className="w-full">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Επιστροφή στο Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Help */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Χρειάζεστε βοήθεια;{' '}
            <a href="mailto:support@example.com" className="text-blue-600 hover:underline">
              Επικοινωνήστε μαζί μας
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
