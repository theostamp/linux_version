import Link from "next/link";
import { ArrowRight, CheckCircle, Building, Users, Shield, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Building className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">New Concierge</span>
            </div>
            <nav className="hidden md:flex items-center space-x-4">
              <Link href="#features" className="text-gray-600 hover:text-gray-900">Λειτουργίες</Link>
              <Link href="#pricing" className="text-gray-600 hover:text-gray-900">Τιμές</Link>
              <Link href="/login" className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                Σύνδεση
              </Link>
              <Link href="/signup" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Ξεκινήστε
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Ψηφιακός Concierge για
              <span className="text-blue-600"> Σύγχρονα Κτίρια</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Απλοποιήστε τη διαχείριση κτιρίων, βελτιώστε την εμπειρία των κατοίκων και αυτοματοποιήστε 
              τις οικονομικές λειτουργίες με την ολοκληρωμένη ψηφιακή μας πλατφόρμα.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/signup" 
                className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                Ξεκινήστε Δωρεάν Δοκιμή
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link 
                href="/login" 
                className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Σύνδεση
              </Link>
              <Link 
                href="#pricing" 
                className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Δείτε Τιμές
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Όλα όσα χρειάζεστε για τη διαχείριση του κτιρίου σας
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Από τη χρηματοοικονομική διαχείριση έως την επικοινωνία με τους κατοίκους, σας καλύπτουμε.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Διαχείριση Κτιρίου</h3>
                <p className="text-gray-600">
                  Πλήρης πληροφόρηση κτιρίου, διαχείριση διαμερισμάτων και παρακολούθηση συντηρήσεων.
                </p>
              </div>
              
              <div className="text-center p-6">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Πύλη Κατοίκων</h3>
                <p className="text-gray-600">
                  Ασφαλής πρόσβαση κατοίκων με ανακοινώσεις, ψηφοφορίες και διαχείριση αιτημάτων.
                </p>
              </div>
              
              <div className="text-center p-6">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Χρηματοοικονομικός Έλεγχος</h3>
                <p className="text-gray-600">
                  Αυτοματοποιημένη παρακολούθηση εξόδων, επεξεργασία πληρωμών και χρηματοοικονομικές αναφορές.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Απλές, διαφανείς τιμές
              </h2>
              <p className="text-xl text-gray-600">
                Επιλέξτε το πρόγραμμα που ταιριάζει στις ανάγκες του κτιρίου σας.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Basic Plan */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Βασικό</h3>
                <p className="text-gray-600 mb-6">Ιδανικό για μικρά κτίρια</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">€29</span>
                  <span className="text-gray-600">/μήνα</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Έως 20 διαμερίσματα</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Βασική χρηματοοικονομική διαχείριση</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Υποστήριξη μέσω email</span>
                  </li>
                </ul>
                <Link 
                  href="/signup?plan=basic" 
                  className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors block text-center"
                >
                  Ξεκινήστε
                </Link>
              </div>

              {/* Professional Plan */}
              <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-blue-600 relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Πιο Δημοφιλές
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Επαγγελματικό</h3>
                <p className="text-gray-600 mb-6">Ιδανικό για μεσαία κτίρια</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">€59</span>
                  <span className="text-gray-600">/μήνα</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Έως 50 διαμερίσματα</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Προηγμένα χρηματοοικονομικά εργαλεία</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Διαχείριση συντηρήσεων</span>
          </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Προτεραιότητα υποστήριξης</span>
          </li>
                </ul>
                <Link 
                  href="/signup?plan=professional" 
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors block text-center"
                >
                  Ξεκινήστε
                </Link>
              </div>

              {/* Enterprise Plan */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Επιχειρηματικό</h3>
                <p className="text-gray-600 mb-6">Για μεγάλα συγκροτήματα</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">€99</span>
                  <span className="text-gray-600">/μήνα</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Απεριόριστα διαμερίσματα</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Πλήρης πρόσβαση σε όλες τις λειτουργίες</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Προσαρμοσμένες ενσωματώσεις</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Υποστήριξη 24/7</span>
                  </li>
                </ul>
                <Link 
                  href="/signup?plan=enterprise" 
                  className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors block text-center"
                >
                  Ξεκινήστε
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-blue-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Έτοιμοι να μεταμορφώσετε τη διαχείριση του κτιρίου σας;
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Ενώστε εκατοντάδες κτίρια που χρησιμοποιούν ήδη το New Concierge για να απλοποιήσουν τις λειτουργίες τους.
            </p>
            <Link 
              href="/signup" 
              className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center"
            >
              Ξεκινήστε τη Δωρεάν Δοκιμή σας
              <Zap className="ml-2 h-5 w-5" />
            </Link>
        </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Building className="h-6 w-6 text-blue-400" />
                <span className="ml-2 text-xl font-bold">New Concierge</span>
              </div>
              <p className="text-gray-400">
                Ψηφιακή πλατφόρμα concierge για σύγχρονη διαχείριση κτιρίων.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Προϊόν</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-white">Λειτουργίες</Link></li>
                <li><Link href="#pricing" className="hover:text-white">Τιμές</Link></li>
                <li><Link href="/signup" className="hover:text-white">Εγγραφή</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Υποστήριξη</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Τεκμηρίωση</a></li>
                <li><a href="#" className="hover:text-white">Κέντρο Βοήθειας</a></li>
                <li><a href="#" className="hover:text-white">Επικοινωνία</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Νομικά</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Πολιτική Απορρήτου</a></li>
                <li><a href="#" className="hover:text-white">Όροι Χρήσης</a></li>
                <li><a href="#" className="hover:text-white">Πολιτική Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 New Concierge. Όλα τα δικαιώματα διατηρούνται.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
