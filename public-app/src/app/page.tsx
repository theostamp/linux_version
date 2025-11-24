import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Building,
  CheckCircle,
  CreditCard,
  Megaphone,
  Monitor,
  PieChart,
  QrCode,
  Shield,
  Smartphone,
  Users,
  Zap,
} from "lucide-react";

const featureGroups = [
  {
    title: "Λειτουργία & Οργάνωση",
    description: "Ψηφιακός concierge για ομαλή, καθημερινή λειτουργία κτιρίων και συγκροτημάτων.",
    icon: Building,
    items: [
      "Ψηφιακό προφίλ κτιρίου με όλους τους χώρους και τους χρήστες",
      "Έξυπνος προγραμματισμός συντηρήσεων και εργασιών",
      "Διαχείριση επισκεπτών, χώρων στάθμευσης και κοινοχρήστων",
      "Αυτόματα logs ενεργειών για πλήρη ιχνηλασιμότητα",
    ],
  },
  {
    title: "Επικοινωνία & Info-Point",
    description: "Κρίσιμες ενημερώσεις πάντα μπροστά σε κατοίκους και επισκέπτες.",
    icon: Megaphone,
    items: [
      "Info-point οθόνες με real-time ανακοινώσεις & οδηγίες",
      "Push/email/SMS ειδοποιήσεις με στοχευμένο κοινό",
      "Ενιαίο board ανακοινώσεων με approvals πριν τη δημοσίευση",
      "Πρότυπα για συχνές ενημερώσεις (ασφάλεια, προγραμματισμένες εργασίες)",
    ],
  },
  {
    title: "Οικονομικά & Πληρωμές",
    description: "Από χρεώσεις μέχρι είσπραξη σε ένα βήμα, με πλήρη ορατότητα.",
    icon: CreditCard,
    items: [
      "Αυτόματη κατανομή κοινοχρήστων ανά διαμέρισμα και έργο",
      "Online πληρωμές και συμφωνία σε πραγματικό χρόνο",
      "Ειδοποιήσεις καθυστερήσεων και ρυθμίσεις δόσεων",
      "Εξαγωγές, αποδείξεις και οικονομικές αναφορές on-demand",
    ],
  },
  {
    title: "Ασφάλεια & Συμμόρφωση",
    description: "Προστασία δεδομένων και σαφείς ρόλοι ώστε να κοιμάστε ήσυχοι.",
    icon: Shield,
    items: [
      "Δικαιώματα ανά ρόλο (διαχειριστής, κάτοικος, συνεργείο)",
      "GDPR-ready αποθήκευση και κρυπτογράφηση",
      "Audit trail για κάθε κρίσιμη ενέργεια",
      "Backups, high-availability και multi-tenant αρχιτεκτονική",
    ],
  },
];

const roleFlows = [
  {
    title: "Για Διαχειριστές",
    icon: Users,
    items: [
      "Πίνακας εργασιών με ό,τι εκκρεμεί ανά ημέρα",
      "Εγκρίσεις πληρωμών και αιτημάτων σε 2 κλικ",
      "Συγκεντρωτικά reports για συνέλευση ή συμβούλιο",
    ],
  },
  {
    title: "Για Κατοίκους",
    icon: Smartphone,
    items: [
      "Self-service portal για οφειλές, αιτήματα και κρατήσεις",
      "Άμεση πρόσβαση σε οδηγούς ασφαλείας και κανονισμούς",
      "Info-point & kiosk πρόσβαση χωρίς ανάγκη εκπαίδευσης",
    ],
  },
  {
    title: "Για Συνεργεία",
    icon: Monitor,
    items: [
      "Αποστολή οδηγιών/εικόνων πριν την άφιξη",
      "Check-in/check-out σε kiosk για διαφάνεια χρόνου",
      "Καταγραφή υλικών και κόστους ανά εργασία",
    ],
  },
];

const pricingPlans = [
  {
    name: "Βασικό",
    price: "€29",
    description: "Για μικρά κτίρια που θέλουν οργάνωση χωρίς πολυπλοκότητα.",
    highlights: ["Έως 20 διαμερίσματα", "Βασικά οικονομικά & ειδοποιήσεις", "Email υποστήριξη"],
    href: "/signup?plan=basic",
    accent: "border-slate-200",
    popular: false,
  },
  {
    name: "Επαγγελματικό",
    price: "€59",
    description: "Για κτίρια που χρειάζονται πλήρη εικόνα και αυτοματισμούς.",
    highlights: [
      "Έως 50 διαμερίσματα",
      "Info-point & kiosk mode χωρίς επιπλέον χρέωση",
      "Προηγμένα οικονομικά και αναφορές",
      "Προτεραιότητα υποστήριξης",
    ],
    href: "/signup?plan=professional",
    accent: "border-blue-500 shadow-xl shadow-blue-100",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "Για μεγάλους ομίλους, mixed-use assets και ειδικές ροές.",
    highlights: [
      "Απεριόριστα διαμερίσματα και κτίρια",
      "SSO, ιδιωτικά deployments, custom SLA",
      "Πλήρης παραμετροποίηση ροών και ρόλων",
      "Dedicated success manager",
    ],
    href: "/signup?plan=enterprise",
    accent: "border-slate-200",
    popular: false,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-indigo-50 pointer-events-none" />
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-sm">
                <Building className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">Building Concierge</p>
                <p className="font-bold text-lg text-slate-900">New Concierge</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="#features" className="text-slate-700 hover:text-slate-900">
                Λειτουργίες
              </Link>
              <Link href="#info-point" className="text-slate-700 hover:text-slate-900">
                Info-point & Kiosk
              </Link>
              <Link href="#pricing" className="text-slate-700 hover:text-slate-900">
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
                className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 shadow-sm"
              >
                Ξεκινήστε
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="relative">
        <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Πλατφόρμα concierge νέας γενιάς
              </div>
              <div className="space-y-4">
                <h1 className="text-3xl md:text-5xl font-extrabold leading-tight text-slate-900">
                  Η επαγγελματική πλατφόρμα διαχείρισης κτιρίων με info-point & kiosk mode ενσωματωμένα.
                </h1>
                <p className="text-lg md:text-xl text-slate-600">
                  Προσφέρουμε την εμπειρία που περιμένουν οι κάτοικοι, με την ακρίβεια που χρειάζεται ο
                  διαχειριστής: επικοινωνία, οικονομικά και λειτουργίες σε μία ενιαία οθόνη.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="#info-point"
                  className="inline-flex items-center justify-center gap-2 bg-sky-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-sky-700 shadow-sm"
                >
                  Δείτε το info-point
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold border border-slate-200 text-slate-900 hover:bg-white"
                >
                  Ξεκινήστε δωρεάν
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white/80 border border-slate-100 p-4 shadow-sm">
                  <p className="text-sm text-slate-500">Info-point ενημερώσεις</p>
                  <p className="text-2xl font-bold text-slate-900">Live σε κοινόχρηστους χώρους</p>
                </div>
                <div className="rounded-2xl bg-white/80 border border-slate-100 p-4 shadow-sm">
                  <p className="text-sm text-slate-500">Kiosk mode</p>
                  <p className="text-2xl font-bold text-slate-900">Για tablets & οθόνες αφής</p>
                </div>
                <div className="rounded-2xl bg-white/80 border border-slate-100 p-4 shadow-sm">
                  <p className="text-sm text-slate-500">Εφαρμογή κατοίκων</p>
                  <p className="text-2xl font-bold text-slate-900">Απλή, χωρίς εκπαίδευση</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-6 bg-gradient-to-br from-sky-100 via-white to-indigo-100 rounded-3xl blur-3xl opacity-70" />
              <div className="relative bg-white rounded-3xl border border-slate-100 shadow-xl p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Κατάσταση κτιρίου</p>
                    <p className="text-2xl font-bold text-slate-900">On track</p>
                  </div>
                  <Shield className="h-10 w-10 text-sky-600" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Αιτήματα</p>
                    <p className="text-xl font-bold text-slate-900">12 ανοικτά</p>
                    <p className="text-emerald-600 text-sm mt-1">7 σε εξέλιξη</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Οφειλές</p>
                    <p className="text-xl font-bold text-slate-900">€2.430</p>
                    <p className="text-emerald-600 text-sm mt-1">65% σε ρύθμιση</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 p-4 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-sky-100 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-sky-700" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-900">Info-point σε λειτουργία</p>
                    <p className="text-sm text-slate-600">
                      Ενημερώσεις ασφάλειας, ανακοινώσεις συντήρησης και QR για γρήγορα αιτήματα ζωντανά.
                    </p>
                    <div className="flex items-center gap-2 text-sm text-emerald-600 font-semibold">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Live σε 3 οθόνες εισόδου
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Λειτουργίες</p>
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">
                  Όλα ιεραρχημένα, όπως τα δουλεύετε κάθε μέρα.
                </h2>
                <Link
                  href="/signup"
                  className="hidden md:inline-flex items-center gap-2 text-sky-700 font-semibold hover:text-sky-800"
                >
                  Ζητήστε demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <p className="text-lg text-slate-600 max-w-3xl">
                Καλύπτουμε ολόκληρο τον κύκλο: οργάνωση, επικοινωνία, οικονομικά και συμμόρφωση, ώστε να μην
                χρειάζονται πολλαπλά εργαλεία ή αυτοσχέδιες λύσεις.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {featureGroups.map((group) => (
                <div
                  key={group.title}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:-translate-y-1 transition-transform duration-150"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-11 w-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                      <group.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Ενότητα</p>
                      <h3 className="text-xl font-bold text-slate-900">{group.title}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{group.description}</p>
                  <ul className="mt-4 space-y-3">
                    {group.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="info-point" className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Info-point & Kiosk</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">
                Πληροφορία στο προσκήνιο, είτε είστε στην είσοδο είτε σε tablet.
              </h2>
              <p className="text-lg text-slate-600 max-w-3xl">
                Ζωντανές ανακοινώσεις σε οθόνες, QR για άμεση δράση και κλειδωμένο περιβάλλον για tablets &
                συσκευές αφής. Ειδικά σχεδιασμένο για κοινόχρηστους χώρους.
              </p>
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-900 via-slate-900 to-slate-800 text-white p-8 shadow-2xl">
                <div className="absolute inset-0 opacity-40" />
                <div className="relative space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold">
                    <Monitor className="h-4 w-4" />
                    Info-point
                  </div>
                  <h3 className="text-2xl font-bold">Ζωντανές οθόνες υποδοχής</h3>
                  <p className="text-slate-100 text-sm">
                    Ανακοινώσεις, οδηγίες ασφαλείας, κανονισμοί και ειδοποιήσεις συντήρησης πάντα ορατά.
                  </p>
                  <ul className="space-y-3 text-sm text-slate-100">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5" />
                      <span>Templates ανακοινώσεων με χρονοπρογραμματισμό</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5" />
                      <span>Προβολή QR για αιτήματα service ή οδηγούς εκκένωσης</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5" />
                      <span>Εναλλαγές περιεχομένου σε real-time χωρίς restart</span>
                    </li>
                  </ul>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold">
                      <Megaphone className="h-4 w-4" />
                      Ανακοινώσεις
                    </span>
                    <span className="inline-flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold">
                      <QrCode className="h-4 w-4" />
                      QR δράσης
                    </span>
                    <span className="inline-flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold">
                      <PieChart className="h-4 w-4" />
                      KPIs κοινόχρηστων
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid gap-6">
                <div className="rounded-3xl bg-white border border-slate-100 shadow-lg p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Kiosk mode</p>
                        <h3 className="text-xl font-bold text-slate-900">Κλειδωμένο, ασφαλές περιβάλλον</h3>
                      </div>
                    </div>
                    <Shield className="h-6 w-6 text-slate-400" />
                  </div>
                  <ul className="space-y-3 text-sm text-slate-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                      <span>Full-screen εμπειρία για tablets/οθόνες αφής χωρίς αποσπάσεις</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                      <span>Role-based πρόσβαση σε πληροφορίες κατοίκων & επισκεπτών</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                      <span>Auto-refresh περιεχομένου και offline fallback</span>
                    </li>
                  </ul>
                  <div className="mt-4 grid sm:grid-cols-3 gap-2">
                    <div className="rounded-xl bg-slate-50 p-3 text-center">
                      <p className="text-xs text-slate-500">Τοποθεσίες</p>
                      <p className="text-sm font-semibold text-slate-900">Είσοδοι, lobby, parking</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 text-center">
                      <p className="text-xs text-slate-500">Σενάρια</p>
                      <p className="text-sm font-semibold text-slate-900">Οδηγίες, alert, κανονισμοί</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 text-center">
                      <p className="text-xs text-slate-500">Έλεγχος</p>
                      <p className="text-sm font-semibold text-slate-900">Κεντρική διαχείριση</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl border border-dashed border-slate-200 p-6 bg-white/70 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Συντομεύσεις</p>
                      <h4 className="text-lg font-bold text-slate-900">QR flows & άμεση δράση</h4>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">
                    Αιτήματα συντήρησης, ενημέρωση για βλάβες, αναφορές συμβάντων ή πληρωμές με ένα scan.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                      <QrCode className="h-4 w-4" />
                      Maintenance
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                      <CreditCard className="h-4 w-4" />
                      Πληρωμές
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                      <Bell className="h-4 w-4" />
                      Alerts
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Ρόλοι & Ροές</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">
                Έτοιμο για όλους: διαχειριστές, κατοίκους, συνεργεία.
              </h2>
              <p className="text-lg text-slate-600 max-w-3xl">
                Καθένας βλέπει μόνο ό,τι χρειάζεται, με workflows που μειώνουν χρόνο και λάθη.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {roleFlows.map((flow) => (
                <div key={flow.title} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                      <flow.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{flow.title}</h3>
                  </div>
                  <ul className="space-y-3 text-sm text-slate-700">
                    {flow.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="space-y-3 text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Τιμολόγηση</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">Απλή, διαφανής τιμή.</h2>
              <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                Επιλέξτε πλάνο με βάση το μέγεθος και τις απαιτήσεις σας. Info-point και kiosk συμπεριλαμβάνονται από το
                επαγγελματικό πλάνο και πάνω.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {pricingPlans.map((plan) => (
                <div
                  key={plan.name}
                  className={`bg-white rounded-2xl border ${plan.accent} p-6 shadow-sm relative overflow-hidden`}
                >
                  {plan.popular ? (
                    <div className="absolute right-4 top-4 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-semibold">
                      Πιο δημοφιλές
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{plan.description}</p>
                    <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                    <span className="text-sm text-slate-500">{plan.price !== "Custom" ? "/μήνα" : "Κατόπιν ζήτησης"}</span>
                  </div>
                  <ul className="mt-6 space-y-3 text-sm text-slate-700">
                    {plan.highlights.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.href}
                    className={`mt-6 block w-full text-center font-semibold px-4 py-3 rounded-lg ${
                      plan.popular
                        ? "bg-sky-600 text-white hover:bg-sky-700"
                        : "border border-slate-200 text-slate-900 hover:bg-white"
                    }`}
                  >
                    Ξεκινήστε
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto rounded-3xl bg-slate-900 text-white p-10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-sky-700/30 via-slate-900 to-slate-900" />
            <div className="relative grid lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-widest text-sky-200">Επόμενα βήματα</p>
                <h2 className="text-3xl md:text-4xl font-extrabold">Έτοιμοι να περάσουμε σε παραγωγή;</h2>
                <p className="text-lg text-slate-200">
                  Στήνουμε info-point, kiosk και οικονομικές ροές σε μία εβδομάδα. Από εκεί και πέρα, η ομάδα σας
                  κρατάει τα πάντα ενημερωμένα χωρίς έξτρα εργαλεία.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-lg font-semibold hover:bg-slate-100"
                  >
                    Ξεκινήστε τώρα
                    <Zap className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold border border-white/30 text-white hover:bg-white/10"
                  >
                    Σύνδεση
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-sm text-slate-200">Χρόνος ενεργοποίησης</p>
                    <p className="text-2xl font-bold">1 εβδομάδα</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-sm text-slate-200">Support</p>
                    <p className="text-2xl font-bold">Priority</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-sm text-slate-200">Info-point</p>
                    <p className="text-2xl font-bold">Ready</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-sm text-slate-200">Kiosk mode</p>
                    <p className="text-2xl font-bold">Locked</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-100 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-sky-600 text-white flex items-center justify-center">
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
                  <Link href="#features" className="hover:text-slate-900">
                    Λειτουργίες
                  </Link>
                </li>
                <li>
                  <Link href="#info-point" className="hover:text-slate-900">
                    Info-point & Kiosk
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="hover:text-slate-900">
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
