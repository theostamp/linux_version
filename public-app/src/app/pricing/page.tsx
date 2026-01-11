import Link from 'next/link';
import { ArrowRight, Archive, Building, Monitor, Settings, Sparkles } from 'lucide-react';

const premiumFeatures = [
  {
    title: 'Διαχείριση info point',
    description: 'Οργάνωσε scenes, widgets και πρόγραμμα προβολής με πλήρη έλεγχο ανά κτίριο.',
    bullets: [
      'Scenes με έτοιμα templates και custom διατάξεις.',
      'Ενεργοποίηση widgets ανά ανάγκη και ώρα.',
      'Live preview πριν τη δημοσίευση.',
    ],
    icon: Settings,
  },
  {
    title: 'Display kiosk info point',
    description: 'Η οθόνη εισόδου που ενημερώνει όλους χωρίς login, σε πραγματικό χρόνο.',
    bullets: [
      'Πλήρης οθόνη με αυτόματη εναλλαγή περιεχομένου.',
      'Ανακοινώσεις, ψηφοφορίες, οικονομικά, καιρός.',
      'QR σύνδεση για άμεσο onboarding κατοίκων.',
    ],
    icon: Monitor,
  },
  {
    title: 'AI Παραστατικά & Αυτόματη Τιμολόγηση',
    description: 'Σάρωση παραστατικών και αυτόματη καταχώρηση δαπανών με ενημέρωση υπολοίπων.',
    bullets: [
      'AI εξαγωγή ποσού, ημερομηνίας, προμηθευτή και κατηγορίας.',
      'Δημιουργία δαπάνης με ένα κλικ + ενημέρωση υπολοίπων.',
      'Αυτόματη αρχειοθέτηση στο Ηλεκτρονικό Αρχείο.',
    ],
    icon: Sparkles,
  },
  {
    title: 'Ηλεκτρονικό Αρχείο Πολυκατοικίας',
    description: 'Κεντρικό repository για πρακτικά, συμβάσεις και παραστατικά με εύκολη αναζήτηση.',
    bullets: [
      'Κατηγοριοποίηση και μεταδεδομένα ανά αρχείο.',
      'Γρήγορο preview PDF/εικόνων χωρίς downloads.',
      'Ασφαλής πρόσβαση για όλη την ομάδα.',
    ],
    icon: Archive,
  },
];

const iotFeatures = [
  'Smart Heating dashboard με χρονοπρογραμματισμούς',
  'Ειδοποιήσεις βλάβης / διαρροών online & στο kiosk',
  'Στατιστικά κατανάλωσης και προβλέψεις',
  'Επέκταση με νέες IoT λειτουργίες',
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-bg-app-main text-text-primary">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl shadow-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary shadow-lg shadow-accent-primary/25">
              <Building className="h-5 w-5 text-white" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-xs uppercase tracking-widest text-text-secondary">Ψηφιακός Θυρωρός</span>
              <span className="text-lg font-bold text-accent-primary">newconcierge.app</span>
            </span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/login"
              className="rounded-full border border-gray-200 px-4 py-2 text-text-primary shadow-sm transition hover:border-accent-primary/40 hover:text-accent-primary"
            >
              Σύνδεση
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-accent-primary px-4 py-2 font-semibold text-white shadow-lg shadow-accent-primary/25 transition hover:opacity-90"
            >
              Ξεκίνα
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden border-b border-gray-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(30,78,140,0.12),transparent_55%),radial-gradient(circle_at_85%_0%,rgba(46,124,144,0.12),transparent_50%)]" />
        <div className="absolute -top-24 right-6 h-72 w-72 rounded-full bg-accent-primary/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr,0.9fr] lg:items-center lg:py-20">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-primary/20 bg-white/70 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-primary shadow-sm">
              Premium εμπειρία
            </span>
            <h1 className="page-title-hero">
              Πλάνα Premium για κάθε πολυκατοικία
            </h1>
            <p className="text-sm text-text-secondary sm:text-base">
              Αναβάθμισε με Premium (Kiosk, AI, Αρχείο) ή Premium + IoT για Smart Heating.
            </p>
            <p className="text-xs text-text-secondary">14 ημέρες δοκιμή χωρίς κάρτα.</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-accent-primary px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-accent-primary/25 transition hover:opacity-90"
              >
                Ζήτησε πρόσβαση
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="mailto:hello@newconcierge.app"
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-6 py-2 text-sm font-semibold text-text-primary shadow-sm transition hover:border-accent-primary/40 hover:text-accent-primary"
              >
                Μίλησε μαζί μας
              </a>
            </div>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white/90 p-6 shadow-card-soft">
            <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Τι περιλαμβάνει</p>
            <ul className="mt-4 space-y-3 text-sm text-text-primary">
              <li>Info point management με scenes & widgets</li>
              <li>Full-screen kiosk display για όλους τους ενοίκους</li>
              <li>AI παραστατικά με ενημέρωση υπολοίπων & αρχειοθέτηση</li>
              <li>Ηλεκτρονικό αρχείο πολυκατοικίας με αναζήτηση</li>
              <li>Smart Heating (στο Premium + IoT)</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-6 px-4 pb-16 pt-12 sm:px-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary">Πλάνα συνδρομής</h2>
          <p className="text-sm text-text-secondary">Χρέωση ανά διαμέρισμα, χωρίς πολύπλοκες κλίμακες.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-card-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Premium</p>
                <h3 className="mt-2 text-xl font-semibold text-text-primary">Kiosk + AI + Αρχείο</h3>
              </div>
              <div className="text-right">
                <div className="text-3xl font-semibold text-accent-primary">€1.8</div>
                <div className="text-xs text-text-secondary">/διαμέρισμα</div>
              </div>
            </div>
            <ul className="mt-5 space-y-2 text-sm text-text-secondary">
              <li>Info point management με scenes & widgets</li>
              <li>Display kiosk info point για όλους τους ενοίκους</li>
              <li>AI παραστατικά & αυτόματη τιμολόγηση</li>
              <li>Ηλεκτρονικό αρχείο πολυκατοικίας</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-accent-primary/30 bg-gradient-to-br from-accent-primary/10 via-white to-white p-6 shadow-lg shadow-accent-primary/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-accent-primary">Premium + IoT</p>
                <h3 className="mt-2 text-xl font-semibold text-text-primary">Smart Heating + IoT</h3>
              </div>
              <div className="text-right">
                <div className="text-3xl font-semibold text-accent-primary">€2.3</div>
                <div className="text-xs text-text-secondary">/διαμέρισμα</div>
              </div>
            </div>
            <ul className="mt-5 space-y-2 text-sm text-text-secondary">
              <li>Όλα τα Premium features</li>
              {iotFeatures.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card-soft">
            <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Free</p>
            <p className="mt-2 text-lg font-semibold text-text-primary">Έως 7 διαμερίσματα</p>
            <p className="mt-2 text-sm text-text-secondary">Βασικό φύλλο κοινοχρήστων, 1 πολυκατοικία.</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card-soft">
            <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Web</p>
            <p className="mt-2 text-lg font-semibold text-text-primary">€1.0 / διαμέρισμα</p>
            <p className="mt-2 text-sm text-text-secondary">Πλήρης πλατφόρμα διαχείρισης χωρίς οθόνη εισόδου.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-6 px-4 pb-20 sm:px-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary">Premium λειτουργίες</h2>
          <p className="text-sm text-text-secondary">Τα modules που ξεκλειδώνεις με το Premium πακέτο.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {premiumFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card-soft transition-all duration-200 hover:-translate-y-1 hover:border-accent-primary/30 hover:shadow-lg hover:shadow-accent-primary/10"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-text-primary">{feature.title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{feature.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-text-secondary">
                  {feature.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-accent-primary/30 bg-gradient-to-br from-accent-primary/15 via-[var(--bg-dark-surface)] to-[var(--bg-dark-main)] p-8 shadow-lg shadow-accent-primary/15">
          <div className="absolute -top-24 right-12 h-48 w-48 rounded-full bg-accent-primary/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between text-on-dark">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-on-dark-title">Ήδη συνδρομητής;</h2>
              <p className="text-sm text-on-dark-secondary">
                Προχώρησε σε αναβάθμιση Premium ανά κτίριο ή δες τη συνδρομή σου.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/upgrade"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2 text-sm font-semibold text-accent-primary shadow-lg shadow-white/20 transition hover:opacity-90"
              >
                Αναβάθμιση Premium
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/my-subscription"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-2 text-sm font-semibold text-on-dark transition hover:bg-white/10"
              >
                Η συνδρομή μου
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
