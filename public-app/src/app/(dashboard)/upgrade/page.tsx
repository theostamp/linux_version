'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';
import { Separator } from '@/components/ui/separator';
import { StatCard } from '@/components/ui/stat-card';
import {
  Archive,
  BadgeEuro,
  Building2,
  Check,
  ChevronDown,
  Clock,
  FileText,
  Lock,
  Mail,
  Monitor,
  Sparkles,
  Users,
} from 'lucide-react';

function FeatureRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-muted-foreground">
      <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
      <span>{text}</span>
    </div>
  );
}

const kioskBullets = [
  'Οθόνη εισόδου με σκηνές (Scenes) & widgets, πλήρως παραμετροποιήσιμη',
  'Ανακοινώσεις, υπενθυμίσεις, έκτακτες ειδοποιήσεις & ενημερώσεις προς κατοίκους',
  'Οικονομικά widgets: ενδεικτικά οφειλές/υπόλοιπα, τρέχοντα κοινόχρηστα, μηνιαία έξοδα',
  'QR Code widget για γρήγορη πρόσβαση σε ψηφιακές υπηρεσίες',
];

const aiFinanceBullets = [
  'AI σάρωση παραστατικών (JPG/PNG/WebP/PDF) για αυτόματη εξαγωγή στοιχείων',
  'Αυτόματη συμπλήρωση ποσού, ημερομηνίας, προμηθευτή, κατηγορίας (με ανθρώπινο έλεγχο)',
  'Δημιουργία δαπάνης “με 1 κλικ” + προαιρετικό upload στο Ηλεκτρονικό Αρχείο',
  'Έλεγχος πιθανών διπλών παραστατικών για λιγότερα λάθη & τριβές',
];

const archiveBullets = [
  'Ηλεκτρονικό Αρχείο ανά κτίριο: πρακτικά Γ.Σ., κανονισμός, κατόψεις, συμβάσεις, πιστοποιητικά, παραστατικά',
  'Μεταδεδομένα (τίτλος/κατηγορία/ημερομηνία/ποσό/ΑΦΜ προμηθευτή) + αναζήτηση/φίλτρα',
  'Γρήγορη προβολή αρχείων (secure preview) και οργάνωση για καλύτερη διαφάνεια',
];

const faqs: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: 'Το Premium ενεργοποιείται για όλο το γραφείο ή ανά κτίριο;',
    a: 'Ανά κτίριο. Έτσι μπορείς να έχεις Premium (Kiosk + AI) σε συγκεκριμένες πολυκατοικίες, ενώ άλλες να μένουν μόνο στο Web.',
  },
  {
    q: 'Πώς γίνεται η χρέωση;',
    a: 'Η χρέωση γίνεται ανά διαμέρισμα. Για Premium, η χρέωση αφορά τα διαμερίσματα του κτιρίου που έχει ενεργό το Premium (με volume discounts σε μεγαλύτερες κλίμακες).',
  },
  {
    q: 'Μπορώ να το ενεργοποιήσω μόνος μου;',
    a: 'Στο v1 η ενεργοποίηση γίνεται από την ομάδα μας. Στόχος μας είναι να γίνει πλήρως self‑serve (ανά κτίριο) σε επόμενο βήμα.',
  },
  {
    q: 'Τι γίνεται αν λήξει ή καθυστερήσει η συνδρομή;',
    a: (
      <span>
        Η πρόσβαση μένει <strong>read‑only</strong> (βλέπεις τα δεδομένα σου), αλλά τα writes μπλοκάρονται και
        Premium λειτουργίες όπως Kiosk/AI απενεργοποιούνται μέχρι την ανανέωση.
      </span>
    ),
  },
];

export default function UpgradePage() {
  const searchParams = useSearchParams();
  const buildingIdParam = searchParams.get('building_id');

  const { selectedBuilding, buildingContext } = useBuilding();
  const billing = buildingContext?.billing;

  const resolvedBuildingId =
    selectedBuilding?.id ?? (buildingIdParam ? Number(buildingIdParam) : undefined);
  const resolvedBuildingName = selectedBuilding?.name ?? buildingContext?.name ?? '—';
  const resolvedApartmentsCount =
    selectedBuilding?.apartments_count ?? buildingContext?.apartments_count ?? null;

  const accountType = billing?.account_type ?? null;
  const isOfficeAccount = accountType === 'office';

  const premiumEnabled =
    billing?.premium_enabled ?? buildingContext?.premium_enabled ?? false;
  const kioskEnabled = billing?.kiosk_enabled ?? false;
  const aiEnabled = billing?.ai_enabled ?? false;

  const mailtoHref = React.useMemo(() => {
    const subject = 'Αίτημα ενεργοποίησης Premium (Kiosk + AI) ανά κτίριο';
    const bodyLines = [
      'Γεια σας,',
      '',
      'Θέλω ενεργοποίηση Premium (Kiosk + AI) για το παρακάτω κτίριο:',
      `- Κτίριο: ${resolvedBuildingName}`,
      resolvedBuildingId ? `- Building ID: ${resolvedBuildingId}` : null,
      resolvedApartmentsCount !== null ? `- Διαμερίσματα (count): ${resolvedApartmentsCount}` : null,
      accountType ? `- Account type: ${accountType}` : null,
      '',
      'Παρακαλώ στείλτε μου τα επόμενα βήματα και την εκτίμηση χρέωσης ανά διαμέρισμα.',
      '',
      'Ευχαριστώ,',
    ].filter(Boolean) as string[];

    const body = encodeURIComponent(bodyLines.join('\n'));
    return `mailto:sales@newconcierge.app?subject=${encodeURIComponent(subject)}&body=${body}`;
  }, [resolvedBuildingId, resolvedBuildingName, resolvedApartmentsCount, accountType]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Αναβάθμιση</h1>
          <p className="text-muted-foreground">
            Ξεκλείδωσε Premium λειτουργίες (Kiosk + AI) ανά πολυκατοικία.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/my-subscription">Μετάβαση στη Συνδρομή</Link>
        </Button>
      </div>

      {/* Hero / Building context */}
      <div className="rounded-2xl border bg-gradient-to-br from-indigo-50 via-white to-white p-6 shadow-sm dark:from-indigo-950/30 dark:via-background dark:to-background">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Κτίριο</h2>
            </div>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">{resolvedBuildingName}</span>{' '}
              {resolvedBuildingId ? <span>(ID: {resolvedBuildingId})</span> : null}
              {resolvedApartmentsCount !== null ? (
                <span className="ml-2">• Διαμερίσματα: {resolvedApartmentsCount}</span>
              ) : null}
            </p>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Account: {accountType ?? '—'}</Badge>
              <Badge variant={premiumEnabled ? 'default' : 'secondary'}>
                Premium: {premiumEnabled ? 'Ενεργό' : 'Ανενεργό'}
              </Badge>
              <Badge variant={kioskEnabled ? 'default' : 'secondary'}>
                Kiosk: {kioskEnabled ? 'Ενεργό' : 'Κλειδωμένο'}
              </Badge>
              <Badge variant={aiEnabled ? 'default' : 'secondary'}>
                AI: {aiEnabled ? 'Ενεργό' : 'Κλειδωμένο'}
              </Badge>
            </div>

            {!isOfficeAccount ? (
              <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <Lock className="h-4 w-4" />
                  Premium μόνο για γραφεία διαχείρισης
                </div>
                <p className="mt-1 text-muted-foreground">
                  Το Premium (Kiosk + AI) δεν είναι διαθέσιμο για μεμονωμένους διαχειριστές.
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {premiumEnabled ? (
                <>
                  <Button asChild>
                    <Link href="/kiosk-management">
                      <Monitor className="mr-2 h-4 w-4" />
                      Πήγαινε στο Kiosk
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/kiosk-management/preview">Προεπισκόπηση</Link>
                  </Button>
                </>
              ) : (
                <Button asChild disabled={!isOfficeAccount}>
                  <a href={mailtoHref}>
                    <Mail className="mr-2 h-4 w-4" />
                    Ζήτησε αναβάθμιση
                  </a>
                </Button>
              )}
              <Button asChild variant="outline">
                <Link href="/my-subscription">Δες τη συνδρομή σου</Link>
              </Button>
            </div>
          </div>

          {/* Value props */}
          <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
            <StatCard
              title="Μείωση χρόνου εργασιών"
              value="Λιγότερη χειροκίνητη δουλειά"
              subtitle="AI + αυτοματισμοί"
              icon={<Clock className="h-5 w-5" />}
              color="primary"
              href="#ai"
            />
            <StatCard
              title="Επαγγελματική εικόνα"
              value="Premium εμπειρία"
              subtitle="Kiosk στην είσοδο"
              icon={<Monitor className="h-5 w-5" />}
              color="info"
              href="#kiosk"
            />
            <StatCard
              title="Λιγότερες τριβές"
              value="Καλύτερη επικοινωνία"
              subtitle="ενημέρωση κατοίκων"
              icon={<Users className="h-5 w-5" />}
              color="success"
              href="#kiosk"
            />
            <StatCard
              title="Διαφάνεια & οργάνωση"
              value="Ηλεκτρονικό αρχείο"
              subtitle="πρακτικά/παραστατικά"
              icon={<Archive className="h-5 w-5" />}
              color="warning"
              href="#archive"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Τι ξεκλειδώνεις με το Premium</h2>
        <p className="text-sm text-muted-foreground">
          Ενεργοποιείται <strong>ανά κτίριο</strong>. Η χρέωση γίνεται <strong>ανά διαμέρισμα</strong> (volume discounts σε μεγάλες κλίμακες).
        </p>
      </div>

      <BentoGrid className="max-w-[1920px] auto-rows-auto gap-4">
        <BentoGridItem
          className="md:col-span-2"
          title={<span id="kiosk" className="scroll-mt-24">Kiosk (Display + Διαχείριση)</span>}
          description="Οθόνη εισόδου που μειώνει τριβές και αναβαθμίζει την εικόνα της πολυκατοικίας."
          icon={<Monitor className="h-4 w-4" />}
          header={
            <div className="space-y-3">
              <div className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Scenes</Badge>
                  <Badge variant="secondary">Widgets</Badge>
                  <Badge variant="secondary">Live Preview</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {kioskBullets.map((t) => (
                    <FeatureRow key={t} text={t} />
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" disabled={!premiumEnabled}>
                  <Link href="/kiosk-management/preview">Δες προεπισκόπηση</Link>
                </Button>
                <Button asChild variant="outline" disabled={!premiumEnabled}>
                  <Link href="/kiosk-management">Διαχείριση Kiosk</Link>
                </Button>
              </div>
            </div>
          }
        />

        <BentoGridItem
          className="md:col-span-1"
          title={<span id="ai" className="scroll-mt-24">AI για οικονομικά & αυτοματισμούς</span>}
          description="Από παραστατικό → δαπάνη και ενημέρωση οικονομικών, πιο γρήγορα και με λιγότερα λάθη."
          icon={<Sparkles className="h-4 w-4" />}
          header={
            <div className="space-y-3">
              <div className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Παραστατικά</Badge>
                  <Badge variant="secondary">Auto-fill</Badge>
                  <Badge variant="secondary">Duplicate check</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {aiFinanceBullets.map((t) => (
                    <FeatureRow key={t} text={t} />
                  ))}
                </div>
                <div className="mt-3 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                  <strong>Σημείωση:</strong> Οι AI προτάσεις είναι υποβοηθητικές—πάντα γίνεται έλεγχος πριν την τελική καταχώρηση.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link href="/documents">
                    <FileText className="mr-2 h-4 w-4" />
                    Δοκίμασε AI Παραστατικά
                  </Link>
                </Button>
              </div>
            </div>
          }
        />

        <BentoGridItem
          className="md:col-span-3"
          title={<span id="archive" className="scroll-mt-24">Ηλεκτρονικό Αρχείο Πολυκατοικίας</span>}
          description="Οργάνωσε έγγραφα, πρακτικά και παραστατικά—όλα σε ένα σημείο, με αναζήτηση και μεταδεδομένα."
          icon={<Archive className="h-4 w-4" />}
          header={
            <div className="space-y-3">
              <div className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Πρακτικά Γ.Σ.</Badge>
                  <Badge variant="secondary">Κανονισμός</Badge>
                  <Badge variant="secondary">Παραστατικά</Badge>
                  <Badge variant="secondary">Συμβάσεις</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {archiveBullets.map((t) => (
                    <FeatureRow key={t} text={t} />
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link href="/archive">
                    <Archive className="mr-2 h-4 w-4" />
                    Άνοιξε το Αρχείο
                  </Link>
                </Button>
              </div>
            </div>
          }
        />
      </BentoGrid>

      <Separator />

      <Card id="pricing" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="text-xl">Χρέωση & ενεργοποίηση</CardTitle>
          <CardDescription>
            Premium ενεργοποίηση ανά κτίριο, με χρέωση ανά διαμέρισμα.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 font-medium">
                <BadgeEuro className="h-4 w-4 text-muted-foreground" />
                Τιμολόγηση
              </div>
              <p className="mt-2 text-muted-foreground">
                Χρέωση <strong>ανά διαμέρισμα</strong> (κλιμακωτή σε μεγάλες κλίμακες). Για Premium add‑on, αφορά τα διαμερίσματα του κτιρίου που ενεργοποιείται.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 font-medium">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Ανά κτίριο
              </div>
              <p className="mt-2 text-muted-foreground">
                Ιδανικό για γραφεία: μπορείς να έχεις μείξη (Premium σε 5 κτίρια, Web-only στα υπόλοιπα).
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 font-medium">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                Έλεγχος πρόσβασης
              </div>
              <p className="mt-2 text-muted-foreground">
                Οι Premium λειτουργίες επιβάλλονται και από το backend, ώστε να μη γίνεται παράκαμψη από απευθείας URLs.
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center gap-2 font-medium">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Τι πρέπει να κάνω τώρα;
            </div>
            <p className="mt-1 text-muted-foreground">
              Μέχρι να γίνει πλήρως self‑serve η αναβάθμιση, η ενεργοποίηση γίνεται από την ομάδα μας.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild disabled={!isOfficeAccount}>
                <a href={mailtoHref}>
                  <Mail className="mr-2 h-4 w-4" />
                  Ζήτησε αναβάθμιση
                </a>
              </Button>
              <Button asChild variant="outline">
                <Link href="/my-subscription">Δες τη συνδρομή σου</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id="faq" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="text-xl">FAQ</CardTitle>
          <CardDescription>Συχνές ερωτήσεις για Premium ανά κτίριο.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {faqs.map((item) => (
            <details key={item.q} className="group rounded-xl border bg-card p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="font-medium">{item.q}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-2 text-sm text-muted-foreground">{item.a}</div>
            </details>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Ηλεκτρονικό αρχείο & ενδεικτικό νομικό πλαίσιο</CardTitle>
          <CardDescription>
            Κρατάς πρακτικά, κανονισμό και παραστατικά οργανωμένα—λιγότερες τριβές, περισσότερη διαφάνεια.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>Ενδεικτικά</strong>, το πλαίσιο της οριζόντιας ιδιοκτησίας στην Ελλάδα σχετίζεται με:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Ν. 3741/1929 (οριζόντια ιδιοκτησία)</li>
            <li>Αστικός Κώδικας: άρθρα 1002 & 1117</li>
            <li>Π.Δ. 1024/1971 (συμπληρωματικές ρυθμίσεις/εφαρμογή)</li>
            <li>Κανονισμό πολυκατοικίας & αποφάσεις Γενικών Συνελεύσεων</li>
          </ul>
          <div className="rounded-lg border bg-muted/30 p-3 text-xs">
            <strong>Disclaimer:</strong> Το παραπάνω είναι ενημερωτικό και δεν αποτελεί νομική συμβουλή. Για ειδικές υποχρεώσεις τήρησης αρχείων/χρονικά όρια, συμβουλευτείτε δικηγόρο.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


