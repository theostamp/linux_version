'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building, 
  Users, 
  CreditCard, 
  CheckCircle, 
  ArrowRight, 
  Star,
  Shield,
  Zap,
  Clock,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

export default function PublicTenantLanding() {
  const router = useRouter();
  const [isPublicTenant, setIsPublicTenant] = useState(false);

  useEffect(() => {
    // Check if we're on localhost (public tenant)
    const hostname = window.location.hostname;
    setIsPublicTenant(hostname === 'localhost' || hostname === '127.0.0.1');
  }, []);

  if (!isPublicTenant) {
    return null; // Don't show on tenant-specific domains
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl">
                <Building className="w-10 h-10 text-white" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Digital Concierge
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Η πλήρης λύση διαχείρισης κτιρίων και διαμερισμάτων. 
              Απλοποιήστε τη διαχείριση, βελτιώστε την επικοινωνία και αυξήστε την αποδοτικότητα.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/plans">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Ξεκινήστε Δωρεάν Δοκιμή
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="outline" className="px-8 py-4 text-lg">
                  <Building className="w-5 h-5 mr-2" />
                  Δείτε το Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Γιατί να επιλέξετε το Digital Concierge;
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Πλήρης λύση διαχείρισης κτιρίων με όλα τα εργαλεία που χρειάζεστε
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Building className="w-8 h-8" />,
                title: "Διαχείριση Κτιρίων",
                description: "Πλήρης έλεγχος όλων των κτιρίων και διαμερισμάτων από ένα κέντρο"
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: "Διαχείριση Κατοίκων",
                description: "Εύκολη επικοινωνία και διαχείριση όλων των κατοίκων"
              },
              {
                icon: <CreditCard className="w-8 h-8" />,
                title: "Οικονομική Διαχείριση",
                description: "Πλήρης οικονομική διαχείριση με αυτόματους υπολογισμούς"
              },
              {
                icon: <Shield className="w-8 h-8" />,
                title: "Ασφάλεια & Backup",
                description: "Αυτόματα backups και ασφάλεια δεδομένων 24/7"
              },
              {
                icon: <Zap className="w-8 h-8" />,
                title: "Αυτοματισμοί",
                description: "Αυτόματες ειδοποιήσεις και διαδικασίες"
              },
              {
                icon: <TrendingUp className="w-8 h-8" />,
                title: "Αναφορές & Analytics",
                description: "Λεπτομερείς αναφορές και στατιστικά για καλύτερες αποφάσεις"
              }
            ].map((feature, index) => (
              <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Επιλέξτε το Πλάνο που Σας Ταιριάζει
            </h2>
            <p className="text-xl text-gray-600">
              Ξεκινήστε με δωρεάν δοκιμή 14 ημερών
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Starter",
                price: "29€",
                period: "/μήνα",
                description: "Ιδανικό για μικρά κτίρια",
                features: [
                  "Έως 2 κτίρια",
                  "Έως 20 διαμερίσματα",
                  "Βασική διαχείριση",
                  "Email υποστήριξη",
                  "Αυτόματα backups"
                ],
                popular: false
              },
              {
                name: "Professional",
                price: "59€",
                period: "/μήνα",
                description: "Για μεσαία κτίρια",
                features: [
                  "Έως 5 κτίρια",
                  "Έως 100 διαμερίσματα",
                  "Πλήρης διαχείριση",
                  "Priority υποστήριξη",
                  "Advanced αναφορές",
                  "API πρόσβαση"
                ],
                popular: true
              },
              {
                name: "Enterprise",
                price: "99€",
                period: "/μήνα",
                description: "Για μεγάλες επιχειρήσεις",
                features: [
                  "Απεριόριστα κτίρια",
                  "Απεριόριστα διαμερίσματα",
                  "Πλήρης λειτουργικότητα",
                  "24/7 υποστήριξη",
                  "Custom αναφορές",
                  "Dedicated account manager"
                ],
                popular: false
              }
            ].map((plan, index) => (
              <Card key={index} className={`p-8 relative ${plan.popular ? 'ring-2 ring-blue-600 shadow-xl' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Δημοφιλές
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 ml-1">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/plans" className="block">
                  <Button 
                    className={`w-full py-3 ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    Επιλογή Πλάνου
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Έτοιμοι να Ξεκινήσετε;
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Δημιουργήστε τον λογαριασμό σας τώρα και αποκτήστε πρόσβαση σε όλες τις δυνατότητες
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/plans">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg">
                <CreditCard className="w-5 h-5 mr-2" />
                Ξεκινήστε Δωρεάν Δοκιμή
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 text-lg">
                <Building className="w-5 h-5 mr-2" />
                Δείτε το Demo
              </Button>
            </Link>
          </div>
          
          <p className="text-blue-100 mt-6 text-sm">
            <Clock className="w-4 h-4 inline mr-1" />
            Δωρεάν δοκιμή 14 ημερών • Χωρίς δεσμεύσεις • Ακύρωση οποιαδήποτε στιγμή
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-2">Digital Concierge</h3>
            <p className="text-gray-400 mb-6">
              Η πλήρης λύση διαχείρισης κτιρίων και διαμερισμάτων
            </p>
            <div className="flex justify-center space-x-6 text-sm text-gray-400">
              <a href="mailto:support@digitalconcierge.gr" className="hover:text-white">
                Επικοινωνία
              </a>
              <a href="/privacy" className="hover:text-white">
                Απόρρητο
              </a>
              <a href="/terms" className="hover:text-white">
                Όροι Χρήσης
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}





