'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, ArrowLeft, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function PaymentCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Ακύρωση Πληρωμής</CardTitle>
            <CardDescription>
              Η πληρωμή ακυρώθηκε. Δεν χρεώθηκε κανένα ποσό.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Δεν χρεώθηκε κανένα ποσό στον λογαριασμό σας. 
                Μπορείτε να δοκιμάσετε ξανά οποιαδήποτε στιγμή.
              </p>
            </div>

            <div className="space-y-3">
              <Link href="/plans" className="block">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Επιλογή Πακέτου
                </Button>
              </Link>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Επιστροφή
              </Button>
            </div>

            <div className="text-center pt-4 border-t">
              <p className="text-sm text-gray-600">
                Χρειάζεστε βοήθεια;{' '}
                <a href="mailto:support@example.com" className="text-blue-600 hover:underline">
                  Επικοινωνήστε μαζί μας
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
