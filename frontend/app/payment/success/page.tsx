'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, ArrowRight, Building, Mail, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  const subscriptionId = searchParams.get('subscription_id');

  useEffect(() => {
    // Auto-redirect countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        <Card className="overflow-hidden shadow-2xl">
          {/* Success Icon */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 px-8 py-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-6 shadow-lg">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Επιτυχής Ενεργοποίηση!
            </h1>
            <p className="text-green-100 text-lg">
              Η συνδρομή σας ενεργοποιήθηκε με επιτυχία
            </p>
          </div>

          {/* Content */}
          <div className="px-8 py-8">
            <div className="space-y-6">
              {/* Welcome Message */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Καλώς ήρθατε στο Digital Concierge!
                </h2>
                <p className="text-gray-600">
                  Ο λογαριασμός σας είναι πλέον ενεργός και έχετε πλήρη πρόσβαση σε όλες τις δυνατότητες.
                </p>
              </div>

              {/* Subscription Details */}
              {subscriptionId && (
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="flex items-center mb-4">
                    <CreditCard className="w-5 h-5 text-gray-600 mr-2" />
                    <h3 className="font-semibold text-gray-900">Στοιχεία Συνδρομής</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">ID Συνδρομής:</span>
                      <span className="font-mono text-gray-900">{subscriptionId}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Κατάσταση:</span>
                      <span className="text-green-600 font-semibold">Ενεργή</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Next Steps */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Mail className="w-5 h-5 mr-2 text-blue-600" />
                  Επόμενα Βήματα
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-blue-600 text-sm font-semibold">1</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-gray-700">
                        Θα λάβετε ένα email επιβεβαίωσης με όλες τις λεπτομέρειες της συνδρομής σας
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-blue-600 text-sm font-semibold">2</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-gray-700">
                        Εξερευνήστε το dashboard και προσθέστε το πρώτο σας κτίριο
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-blue-600 text-sm font-semibold">3</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-gray-700">
                        Προσκαλέστε τους συνεργάτες σας και αρχίστε τη διαχείριση
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features Reminder */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start">
                  <Building className="w-6 h-6 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">
                      Έχετε πρόσβαση σε:
                    </h4>
                    <ul className="space-y-1 text-sm text-blue-700">
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Διαχείριση Κτιρίων & Διαμερισμάτων
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Οικονομική Διαχείριση & Αναφορές
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Ανακοινώσεις & Ψηφοφορίες
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Αιτήματα Συντήρησης
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Διαχείριση Ομάδων & Συνεργατών
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Auto-redirect notice */}
              <div className="text-center py-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Θα μεταφερθείτε αυτόματα στο dashboard σε{' '}
                  <span className="font-bold text-blue-600">{countdown}</span> δευτερόλεπτα...
                </p>
              </div>

              {/* Action Button */}
              <div className="flex justify-center">
                <Button
                  onClick={() => router.push('/dashboard')}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  Μετάβαση στο Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
