'use client';

import Link from 'next/link';
import { Building, Home, ArrowRight, ChevronLeft } from 'lucide-react';
import BuildingRevealBackground from '@/components/BuildingRevealBackground';

export default function LoginSelectPage() {
  return (
    <div className="min-h-screen bg-slate-950 relative">
      <BuildingRevealBackground />
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center gap-2 text-slate-200 hover:text-white transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm">Αρχική</span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">Δεν έχετε λογαριασμό;</span>
              <Link 
                href="/signup" 
                className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Δημιουργία
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* App Description Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4">
              <Building className="h-6 w-6 text-emerald-400" />
              <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                New Concierge
              </span>
            </div>
            <h1 className="text-3xl font-bold text-slate-50 mb-3">
              Καλώς ήρθατε
            </h1>
            <p className="text-slate-400 leading-relaxed max-w-md mx-auto">
              Επιλέξτε τον τύπο λογαριασμού σας για να συνδεθείτε
            </p>
          </div>

          {/* Selection Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Office Manager Card */}
            <Link 
              href="/login/office"
              className="group rounded-2xl border border-slate-700 bg-slate-900/70 p-8 hover:border-blue-500/50 hover:bg-slate-800/70 transition-all duration-300"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6 group-hover:bg-blue-500/30 transition-colors">
                  <Building className="h-8 w-8 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-50 mb-2">
                  Γραφείο Διαχείρισης
                </h2>
                <p className="text-sm text-slate-400 mb-6">
                  Διαχειριστές, υπάλληλοι γραφείου, εσωτερικοί διαχειριστές πολυκατοικιών
                </p>
                <div className="flex items-center gap-2 text-blue-400 font-medium group-hover:gap-3 transition-all">
                  <span>Σύνδεση με email & κωδικό</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>

            {/* Resident Card */}
            <Link 
              href="/login/resident"
              className="group rounded-2xl border border-slate-700 bg-slate-900/70 p-8 hover:border-emerald-500/50 hover:bg-slate-800/70 transition-all duration-300"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6 group-hover:bg-emerald-500/30 transition-colors">
                  <Home className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-50 mb-2">
                  Ένοικος / Ιδιοκτήτης
                </h2>
                <p className="text-sm text-slate-400 mb-6">
                  Κάτοικοι πολυκατοικιών που έχουν εγγραφεί μέσω QR code
                </p>
                <div className="flex items-center gap-2 text-emerald-400 font-medium group-hover:gap-3 transition-all">
                  <span>Σύνδεση με email link</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          </div>

          {/* Help text */}
          <div className="mt-10 text-center">
            <p className="text-sm text-slate-500">
              Δεν είστε σίγουροι; Αν σαρώσατε QR code στην είσοδο της πολυκατοικίας σας, 
              επιλέξτε <span className="text-emerald-400">"Ένοικος"</span>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
