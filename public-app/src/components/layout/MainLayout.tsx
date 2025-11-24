import Link from "next/link";
import { Building } from "lucide-react";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-white to-teal-100 pointer-events-none" />
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
                  <Building className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">Building Concierge</p>
                  <p className="font-bold text-lg text-slate-900">New Concierge</p>
                </div>
              </Link>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
              <Link href="/#features" className="text-slate-700 hover:text-slate-900">
                Λειτουργίες
              </Link>
              <Link href="/kiosk" className="text-slate-700 hover:text-slate-900">
                Info-point & Kiosk
              </Link>
              <Link href="/#pricing" className="text-slate-700 hover:text-slate-900">
                Τιμές
              </Link>
              <Link
                href="/login"
                className="text-slate-700 hover:text-slate-900 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                Σύνδεση
              </Link>
              <Link
                href="/signup"
                className="bg-teal-950 text-white px-4 py-2 rounded-lg hover:bg-teal-900 shadow-sm"
              >
                Ξεκινήστε
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="relative">{children}</main>

      <footer className="bg-white border-t border-slate-100 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-teal-600 text-white flex items-center justify-center">
                  <Building className="h-5 w-5" />
                </div>
                <span className="text-lg font-bold text-slate-900">New Concierge</span>
              </div>
              <p className="text-sm text-slate-600">
                Ενοποιημένη πλατφόρμα concierge για σύγχρονα κτίρια με info-point και kiosk mode by design.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Προϊόν</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <Link href="/#features" className="hover:text-slate-900">
                    Λειτουργίες
                  </Link>
                </li>
                <li>
                  <Link href="/kiosk" className="hover:text-slate-900">
                    Info-point & Kiosk
                  </Link>
                </li>
                <li>
                  <Link href="/#pricing" className="hover:text-slate-900">
                    Τιμές
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Υποστήριξη</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <a href="#" className="hover:text-slate-900">
                    Τεκμηρίωση
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-slate-900">
                    Κέντρο βοήθειας
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-slate-900">
                    Επικοινωνία
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Νομικά</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <a href="#" className="hover:text-slate-900">
                    Πολιτική απορρήτου
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-slate-900">
                    Όροι χρήσης
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-slate-900">
                    Πολιτική cookies
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-100 mt-8 pt-6 flex flex-col sm:flex-row justify-between text-sm text-slate-500">
            <p>© 2025 New Concierge. Όλα τα δικαιώματα διατηρούνται.</p>
            <p>Designed για οθόνες info-point & web.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
