'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building, ArrowRight, CheckCircle, Users, CreditCard, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function DemoPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to demo tenant
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : '';
    const demoUrl = `${protocol}//demo.localhost${port}/dashboard`;
    
    // Show redirect message for a moment, then redirect
    setTimeout(() => {
      window.location.href = demoUrl;
    }, 2000);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <Card className="overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Μετάβαση στο Demo</h1>
            <p className="text-blue-100">
              Σας μεταφέρουμε στο demo environment για να δείτε το σύστημα σε δράση
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                <ArrowRight className="w-6 h-6 text-blue-600 animate-pulse" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Μεταφερόμαστε στο Demo...
              </h2>
              <p className="text-gray-600">
                Θα μεταφερθείτε αυτόματα στο demo environment σε λίγα δευτερόλεπτα
              </p>
            </div>

            {/* Demo Features */}
            <div className="mb-8">
              <h3 className="font-semibold text-gray-900 mb-4 text-center">
                Στο Demo θα δείτε:
              </h3>
              <div className="space-y-3">
                {[
                  'Πλήρη διαχείριση κτιρίου με 10 διαμερίσματα',
                  'Διαχείριση ανακοινώσεων και ψηφοφοριών',
                  'Αιτήματα συντήρησης και παρακολούθηση',
                  'Οικονομική διαχείριση και αναφορές',
                  'Διαχείριση κατοίκων και συνεργατών'
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Demo Credentials */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Demo Credentials
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Admin:</span>
                  <span className="font-mono text-gray-900">admin@demo.localhost / admin123456</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Manager:</span>
                  <span className="font-mono text-gray-900">manager@demo.localhost / manager123456</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Resident:</span>
                  <span className="font-mono text-gray-900">resident1@demo.localhost / resident123456</span>
                </div>
              </div>
            </div>

            {/* Manual Redirect */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Αν δεν μεταφερθείτε αυτόματα, πατήστε το κουμπί παρακάτω
              </p>
              <Button 
                onClick={() => {
                  const protocol = window.location.protocol;
                  const port = window.location.port ? `:${window.location.port}` : '';
                  const demoUrl = `${protocol}//demo.localhost${port}/dashboard`;
                  window.location.href = demoUrl;
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Building className="w-4 h-4 mr-2" />
                Μετάβαση στο Demo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}


