import Link from 'next/link';
import { ArrowRight, Archive, Building, Monitor, Settings, Sparkles } from 'lucide-react';
import { typography } from '@/lib/typography';

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
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/25">
              <Building className="h-5 w-5 text-slate-950" />
            </span>
            <span className="text-sm font-semibold tracking-wide text-slate-100">newconcierge.app</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/login" className="rounded-full border border-white/20 px-4 py-2 text-slate-200 transition hover:border-white/40">
              Σύνδεση
            </Link>
            <Link href="/signup" className="rounded-full bg-emerald-500 px-4 py-2 font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400">
              Ξεκίνα
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.22),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.2),transparent_55%),linear-gradient(135deg,#020617_0%,#0f172a_45%,#0b1120_100%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:py-20">
          <div className="flex-1 space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Premium εμπειρία
            </span>
            <h1 className={typography.heroTitle}>Πλάνα Premium για κάθε πολυκατοικία</h1>
            <p className="text-sm text-slate-300 sm:text-base">
              Αναβάθμισε με Premium (Kiosk, AI, Αρχείο) ή Premium + IoT για Smart Heating.
            </p>
            <p className="text-xs text-emerald-200/80">14 ημέρες δοκιμή χωρίς κάρτα.</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
              >
                Ζήτησε πρόσβαση
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="mailto:hello@newconcierge.app"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/40"
              >
                Μίλησε μαζί μας
              </a>
            </div>
          </div>
          <div className="flex-1 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-emerald-500/10">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Τι περιλαμβάνει</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-200">
              <li>Info point management με scenes & widgets</li>
              <li>Full-screen kiosk display για όλους τους ενοίκους</li>
              <li>AI παραστατικά με ενημέρωση υπολοίπων & αρχειοθέτηση</li>
              <li>Ηλεκτρονικό αρχείο πολυκατοικίας με αναζήτηση</li>
              <li>Smart Heating (στο Premium + IoT)</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-6 px-4 pb-16 pt-10 sm:px-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Πλάνα συνδρομής</h2>
          <p className="text-sm text-slate-400">Χρέωση ανά διαμέρισμα, χωρίς πολύπλοκες κλίμακες.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-emerald-500/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Premium</p>
                <h3 className="mt-2 text-xl font-semibold">Kiosk + AI + Αρχείο</h3>
              </div>
              <div className="text-right">
                <div className="text-3xl font-semibold text-emerald-300">€1.8</div>
                <div className="text-xs text-slate-400">/διαμέρισμα</div>
              </div>
            </div>
            <ul className="mt-5 space-y-2 text-sm text-slate-200">
              <li>Info point management με scenes & widgets</li>
              <li>Display kiosk info point για όλους τους ενοίκους</li>
              <li>AI παραστατικά & αυτόματη τιμολόγηση</li>
              <li>Ηλεκτρονικό αρχείο πολυκατοικίας</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-emerald-400/30 bg-slate-900/80 p-6 shadow-xl shadow-emerald-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Premium + IoT</p>
                <h3 className="mt-2 text-xl font-semibold">Smart Heating + IoT</h3>
              </div>
              <div className="text-right">
                <div className="text-3xl font-semibold text-emerald-300">€2.3</div>
                <div className="text-xs text-slate-400">/διαμέρισμα</div>
              </div>
            </div>
            <ul className="mt-5 space-y-2 text-sm text-slate-200">
              <li>Όλα τα Premium features</li>
              {iotFeatures.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Free</p>
            <p className="mt-2 text-lg font-semibold">Έως 7 διαμερίσματα</p>
            <p className="mt-2 text-sm text-slate-400">Βασικό φύλλο κοινοχρήστων, 1 πολυκατοικία.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Web</p>
            <p className="mt-2 text-lg font-semibold">€1.0 / διαμέρισμα</p>
            <p className="mt-2 text-sm text-slate-400">Πλήρης πλατφόρμα διαχείρισης χωρίς οθόνη εισόδου.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-6 px-4 pb-20 sm:px-6">
        <div className="space-y-2">
          <h2 className={typography.sectionHeaderDark}>Premium λειτουργίες</h2>
          <p className="text-sm text-slate-400">
            Τα modules που ξεκλειδώνεις με το Premium πακέτο.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {premiumFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 transition-all duration-200 hover:border-emerald-400/30 hover:bg-slate-900"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className={`mt-4 ${typography.featureCardTitle}`}>{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{feature.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-200">
                  {feature.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl shadow-emerald-500/10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">Ήδη συνδρομητής;</h2>
              <p className="text-sm text-slate-400">
                Προχώρησε σε αναβάθμιση Premium ανά κτίριο ή δες τη συνδρομή σου.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/upgrade"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
              >
                Αναβάθμιση Premium
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/my-subscription"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/40"
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
