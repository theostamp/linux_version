'use client';

import Link from 'next/link';
import { Building, Home, ArrowRight, ChevronLeft } from 'lucide-react';
import BuildingRevealBackground from '@/components/BuildingRevealBackground';

export default function LoginSelectPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-main-light)] text-[var(--text-dark-primary)] relative">
      <BuildingRevealBackground />
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-white via-[var(--bg-main-light)] to-[var(--bg-main-light)]" />

      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center gap-2 text-text-secondary hover:text-accent-primary transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm">Αρχική</span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-secondary">Δεν έχετε λογαριασμό;</span>
              <Link
                href="/signup"
                className="text-sm font-medium text-accent-primary hover:opacity-80 transition-colors"
              >
                Δημιουργία
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* App Description Header */}
          <div className="text-left mb-10">
            <div className="inline-flex items-center gap-2 mb-4">
              <Building className="h-6 w-6 text-accent-primary" />
              <span className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                New Concierge
              </span>
            </div>
            <h1 className="text-3xl font-bold text-accent-primary mb-3">
              Καλώς ήρθατε
            </h1>
            <p className="text-text-secondary leading-relaxed max-w-md">
              Επιλέξτε τον τύπο λογαριασμού σας για να συνδεθείτε
            </p>
          </div>

          {/* Selection Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Office Manager Card */}
            <Link
              href="/login/office"
              className="group rounded-2xl border border-gray-200 bg-[var(--bg-white)] p-8 shadow-card-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-accent-primary/30 hover:shadow-lg hover:shadow-accent-primary/10"
            >
              <div className="flex flex-col items-start text-left">
                <div className="w-16 h-16 rounded-2xl bg-accent-primary/10 flex items-center justify-center mb-6 group-hover:bg-accent-primary/15 transition-colors">
                  <Building className="h-8 w-8 text-accent-primary" />
                </div>
                <h2 className="text-xl font-bold text-accent-primary mb-2">
                  Γραφείο Διαχείρισης
                </h2>
                <p className="text-sm text-text-secondary mb-6">
                  Διαχειριστές, υπάλληλοι γραφείου, εσωτερικοί διαχειριστές πολυκατοικιών
                </p>
                <div className="flex items-center gap-2 text-accent-primary font-medium group-hover:gap-3 transition-all">
                  <span>Σύνδεση με email & κωδικό</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>

            {/* Resident Card */}
            <Link
              href="/login/resident"
              className="group rounded-2xl border border-gray-200 bg-[var(--bg-white)] p-8 shadow-card-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-accent-secondary/40 hover:shadow-lg hover:shadow-accent-primary/10"
            >
              <div className="flex flex-col items-start text-left">
                <div className="w-16 h-16 rounded-2xl bg-accent-secondary/12 flex items-center justify-center mb-6 group-hover:bg-accent-secondary/20 transition-colors">
                  <Home className="h-8 w-8 text-accent-secondary" />
                </div>
                <h2 className="text-xl font-bold text-accent-secondary mb-2">
                  Ένοικος / Ιδιοκτήτης
                </h2>
                <p className="text-sm text-text-secondary mb-6">
                  Κάτοικοι πολυκατοικιών που έχουν εγγραφεί μέσω QR code
                </p>
                <div className="flex items-center gap-2 text-accent-secondary font-medium group-hover:gap-3 transition-all">
                  <span>Σύνδεση με email link</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          </div>

          {/* Help text */}
          <div className="mt-10 text-left">
            <p className="text-sm text-text-secondary">
              Δεν είστε σίγουροι; Αν σαρώσατε QR code στην είσοδο της πολυκατοικίας σας,
              επιλέξτε <span className="text-accent-secondary">"Ένοικος"</span>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
