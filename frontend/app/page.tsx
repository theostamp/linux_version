// frontend/app/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/contexts/AuthContext';
import EnhancedIntroAnimation from '@/components/EnhancedIntroAnimation';
import {
  Building,
  Users,
  BarChart3,
  Shield,
  CheckCircle,
  ArrowRight,
  Zap,
  Crown,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Home() {
  const { user, isAuthReady } = useAuth();
  const router = useRouter();
  const [showIntro, setShowIntro] = useState(true);
  const [introCompleted, setIntroCompleted] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (user && isAuthReady && !hasRedirected) {
      console.log('Home: User authenticated, redirecting to dashboard');
      setHasRedirected(true);
      router.push('/dashboard');
    }
    // Remove automatic redirect to login - let users see the landing page
    // else if (isAuthReady && !user && !hasRedirected) {
    //   console.log('Home: No user found, redirecting to login');
    //   setHasRedirected(true);
    //   router.push('/login');
    // }
  }, [user, isAuthReady, router, hasRedirected]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
      setIntroCompleted(true);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  // Show loading while redirecting (only for authenticated users)
  if (user && hasRedirected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Μετάβαση στο dashboard...</p>
        </div>
      </div>
    );
  }

  if (showIntro) {
    return <EnhancedIntroAnimation onComplete={() => setShowIntro(false)} />;
  }

  const features = [
    {
      icon: <Building className="w-8 h-8 text-primary" />,
      title: "Διαχείριση Κτιρίων",
      description: "Απλοποιήστε τις λειτουργίες του κτιρίου σας με ολοκληρωμένα εργαλεία διαχείρισης."
    },
    {
      icon: <Users className="w-8 h-8 text-primary" />,
      title: "Πύλη Κατοίκων",
      description: "Παρέχετε στους κατοίκους εύκολη πρόσβαση σε υπηρεσίες και επικοινωνία."
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-primary" />,
      title: "Αναλύσεις & Αναφορές",
      description: "Λάβετε insights για την απόδοση του κτιρίου με λεπτομερείς αναλύσεις."
    },
    {
      icon: <Shield className="w-8 h-8 text-primary" />,
      title: "Ασφαλές & Αξιόπιστο",
      description: "Ασφάλεια επιχειρηματικού επιπέδου με εγγύηση διαθεσιμότητας 99.9%."
    }
  ];

  const plans = [
    {
      id: 1,
      name: "Starter",
      price: 29,
      description: "Ιδανικό για μικρά κτίρια",
      features: [
        "Έως 20 διαμερίσματα",
        "Έως 10 χρήστες",
        "Βασικά εργαλεία διαχείρισης",
        "Email υποστήριξη",
        "50 έγγραφα αποθήκευση"
      ],
      popular: false,
      icon: <Star className="w-6 h-6 text-green-600" />
    },
    {
      id: 2,
      name: "Professional",
      price: 59,
      description: "Προηγμένες δυνατότητες για αναπτυσσόμενες ιδιοκτησίες",
      features: [
        "Έως 100 διαμερίσματα",
        "Έως 25 χρήστες",
        "Προηγμένες αναλύσεις",
        "Εργαλεία αναφορών",
        "Υποστήριξη προτεραιότητας",
        "1GB αποθήκευση"
      ],
      popular: true,
      icon: <Zap className="w-6 h-6 text-blue-600" />
    },
    {
      id: 3,
      name: "Enterprise",
      price: 99,
      description: "Ολοκληρωμένη λύση για μεγάλα portfolios",
      features: [
        "Απεριόριστα διαμερίσματα",
        "Απεριόριστοι χρήστες",
        "Custom ενσωματώσεις",
        "White-label επιλογές",
        "Premium υποστήριξη",
        "Απεριόριστη αποθήκευση"
      ],
      popular: false,
      icon: <Crown className="w-6 h-6 text-purple-600" />
    }
  ];

  return (
    <div className={`min-h-screen bg-white transition-opacity duration-1000 ${introCompleted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Building className="w-8 h-8 text-primary" />
              <span className="ml-2 text-2xl font-bold text-gray-900">Digital Concierge</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium">
                Σύνδεση
              </Link>
              <Link href="/register">
                <Button>
                  Ξεκινήστε Τώρα
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-blue-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Διαχειριστείτε τα Κτίριά σας
              <br />
              <span className="text-primary">με Ευκολία & Αποτελεσματικότητα</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Η ολοκληρωμένη πλατφόρμα για τη διαχείριση πολυκατοικιών και κτιρίων.
              Οικονομικά, συντήρηση, επικοινωνία - όλα σε ένα μέρος.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="text-lg px-8">
                  Δωρεάν Δοκιμή 30 Ημερών
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Σύνδεση
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Όλα όσα χρειάζεστε σε μία πλατφόρμα
            </h2>
            <p className="text-xl text-gray-600">
              Ισχυρά εργαλεία για την αποτελεσματική διαχείριση των ακινήτων σας
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Απλή & Διαφανής Τιμολόγηση
            </h2>
            <p className="text-xl text-gray-600">
              Επιλέξτε το πλάνο που ταιριάζει στις ανάγκες σας
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`p-8 relative ${plan.popular ? 'border-primary ring-2 ring-primary/20 shadow-xl' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                      Πιο Δημοφιλές
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className="flex justify-center mb-4">
                    {plan.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">€{plan.price}</span>
                    <span className="text-gray-500">/μήνας</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href={`/register?plan=${plan.id}`} className="block">
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    size="lg"
                  >
                    Επιλογή Πλάνου
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Έτοιμοι να ξεκινήσετε;
          </h2>
          <p className="text-xl mb-8 text-primary-foreground/90">
            Δοκιμάστε το Digital Concierge δωρεάν για 30 ημέρες. Χωρίς πιστωτική κάρτα.
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Ξεκινήστε Δωρεάν Δοκιμή
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Building className="w-6 h-6 text-white" />
              <span className="ml-2 text-xl font-bold text-white">Digital Concierge</span>
            </div>
            <div className="text-sm">
              © 2025 Digital Concierge. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
