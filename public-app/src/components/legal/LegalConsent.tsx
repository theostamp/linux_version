'use client';

import { useId } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export const TERMS_VERSION = 'v1.0';

type LegalConsentProps = {
  accepted: boolean;
  onAcceptedChange: (value: boolean) => void;
  className?: string;
  compact?: boolean;
};

const termsSections = [
  {
    title: 'Άρθρο 1 – Ορισμοί',
    lines: [
      '1.1 «Πλατφόρμα»: το ηλεκτρονικό σύστημα καταγραφής δηλώσεων/ψήφων.',
      '1.2 «Κανονισμός»: ο κανονισμός της πολυκατοικίας, ως ισχύει.',
      '1.3 «Συνέλευση»: η γενική συνέλευση των συνιδιοκτητών.',
      '1.4 «Πρακτικό»: το έγγραφο που αποτυπώνει τις αποφάσεις.',
    ],
  },
  {
    title: 'Άρθρο 2 – Αντικείμενο',
    lines: [
      '2.1 Η Πλατφόρμα χρησιμοποιείται για την καταγραφή δηλώσεων/ψήφων και τη σύνταξη κειμένου πρακτικού.',
      '2.2 Η Πλατφόρμα δεν εγκρίνει αποφάσεις ούτε υποκαθιστά τον Κανονισμό.',
    ],
  },
  {
    title: 'Άρθρο 3 – Ηλεκτρονική ταυτοποίηση (email‑only)',
    lines: [
      '3.1 Η ταυτοποίηση/επικοινωνία γίνεται αποκλειστικά μέσω του δηλωμένου email (χωρίς SMS).',
      '3.2 Ο χρήστης δηλώνει ότι είναι ο νόμιμος δικαιούχος συμμετοχής και ότι διατηρεί τον έλεγχο του email του.',
    ],
  },
  {
    title: 'Άρθρο 4 – Δήλωση βούλησης & ισχύς αποφάσεων',
    lines: [
      '4.1 Η συμμετοχή/ψήφος μέσω της Πλατφόρμας αποτελεί δήλωση βούλησης.',
      '4.2 Η ισχύς οποιασδήποτε απόφασης προκύπτει από το πρακτικό που συντάσσεται/υπογράφεται σύμφωνα με τον Κανονισμό.',
      '4.3 Σε περίπτωση ασυμφωνίας, υπερισχύουν ο Κανονισμός και το υπογεγραμμένο πρακτικό.',
    ],
  },
  {
    title: 'Άρθρο 5 – Εξουσιοδότηση',
    lines: [
      '5.1 Η εκπροσώπηση γίνεται μόνο με έγγραφη εξουσιοδότηση.',
      '5.2 Η Πλατφόρμα δύναται να καταγράφει την εξουσιοδότηση ως δήλωση βούλησης.',
    ],
  },
  {
    title: 'Άρθρο 6 – Τήρηση αρχείου',
    lines: [
      '6.1 Η ηλεκτρονική αποδοχή των όρων και οι σχετικές δηλώσεις/ψήφοι τηρούνται στο αρχείο της πολυκατοικίας.',
    ],
  },
  {
    title: 'Άρθρο 7 – Περιορισμός ευθύνης',
    lines: [
      '7.1 Η Πλατφόρμα δεν αξιολογεί τη νομιμότητα ή εγκυρότητα αποφάσεων.',
    ],
  },
  {
    title: 'Άρθρο 8 – Ηλεκτρονική αποδοχή',
    lines: [
      '8.1 Η αποδοχή των όρων γίνεται ηλεκτρονικά με επιλογή του checkbox «Αποδέχομαι τους Όρους Χρήσης».',
      '8.2 Η αποδοχή καταγράφεται με ημερομηνία/ώρα και email του χρήστη.',
    ],
  },
] as const;

const privacySections = [
  {
    title: 'Άρθρο 1 – Υπεύθυνος Επεξεργασίας',
    lines: [
      '1.1 Υπεύθυνος Επεξεργασίας είναι η Πολυκατοικία, εκπροσωπούμενη από τον Διαχειριστή ή, όπου υπάρχει, από το Γραφείο Διαχείρισης.',
      '1.2 Επικοινωνία: μέσω της διαχείρισης της πολυκατοικίας.',
    ],
  },
  {
    title: 'Άρθρο 2 – Δεδομένα που συλλέγουμε',
    lines: [
      '2.1 Στοιχεία ταυτοποίησης και ιδιοκτησίας (π.χ. ονοματεπώνυμο, ιδιοκτησία/ποσοστό).',
      '2.2 Στοιχεία επικοινωνίας (email και, αν δοθεί, τηλέφωνο).',
      '2.3 Δεδομένα συμμετοχής σε συνέλευση/ψηφοφορία (δηλώσεις, ψήφοι, ημερομηνίες).',
      '2.4 Τεχνικά δεδομένα ασφαλείας (π.χ. ημερομηνία/ώρα αποδοχής, βασικά logs) όπου απαιτείται.',
    ],
  },
  {
    title: 'Άρθρο 3 – Σκοποί επεξεργασίας',
    lines: [
      '3.1 Οργάνωση συνελεύσεων και επικοινωνία με ιδιοκτήτες.',
      '3.2 Καταγραφή δηλώσεων/ψήφων και σύνταξη πρακτικών.',
      '3.3 Τήρηση αρχείου για τη νόμιμη λειτουργία της πολυκατοικίας.',
    ],
  },
  {
    title: 'Άρθρο 4 – Νομικές βάσεις',
    lines: [
      '4.1 Εκτέλεση υποχρεώσεων που απορρέουν από τον Κανονισμό της πολυκατοικίας.',
      '4.2 Έννομο συμφέρον στη διαχείριση και τεκμηρίωση αποφάσεων.',
      '4.3 Συμμόρφωση με νόμιμες υποχρεώσεις.',
      '4.4 Συναίνεση, μόνο όπου απαιτείται (π.χ. προαιρετικές λειτουργίες).',
    ],
  },
  {
    title: 'Άρθρο 5 – Αποδέκτες / Εκτελούντες',
    lines: [
      '5.1 Πρόσβαση μπορεί να έχουν ο διαχειριστής ή/και το γραφείο διαχείρισης, καθώς και τα πρόσωπα που προβλέπει ο Κανονισμός.',
      '5.2 Πάροχοι τεχνικής υποστήριξης/φιλοξενίας ενεργούν ως εκτελούντες την επεξεργασία βάσει οδηγιών.',
    ],
  },
  {
    title: 'Άρθρο 6 – Διαβιβάσεις εκτός ΕΟΧ',
    lines: [
      '6.1 Δεν προβλέπονται διαβιβάσεις εκτός ΕΟΧ.',
      '6.2 Αν προκύψουν, θα παρέχονται οι απαιτούμενες διασφαλίσεις και ενημέρωση.',
    ],
  },
  {
    title: 'Άρθρο 7 – Χρόνος τήρησης',
    lines: [
      '7.1 Τα δεδομένα τηρούνται για όσο απαιτείται για την οργάνωση/τεκμηρίωση των αποφάσεων.',
      '7.2 Εφαρμόζεται κριτήριο διατήρησης «όσο είναι αναγκαίο» και διαγραφή/ανωνυμοποίηση όταν δεν απαιτείται πλέον.',
    ],
  },
  {
    title: 'Άρθρο 8 – Δικαιώματα υποκειμένων',
    lines: [
      '8.1 Δικαίωμα πρόσβασης, διόρθωσης, διαγραφής, περιορισμού, εναντίωσης και φορητότητας.',
      '8.2 Όπου η επεξεργασία βασίζεται σε συναίνεση, αυτή μπορεί να ανακληθεί οποτεδήποτε.',
      '8.3 Δυνατότητα καταγγελίας στην αρμόδια εποπτική αρχή.',
    ],
  },
  {
    title: 'Άρθρο 9 – Ασφάλεια',
    lines: [
      '9.1 Εφαρμόζονται κατάλληλα τεχνικά και οργανωτικά μέτρα για προστασία δεδομένων.',
    ],
  },
  {
    title: 'Άρθρο 10 – Αυτοματοποιημένη λήψη αποφάσεων',
    lines: [
      '10.1 Δεν λαμβάνονται αυτοματοποιημένες αποφάσεις ή προφίλ.',
    ],
  },
  {
    title: 'Άρθρο 11 – Επικαιροποιήσεις',
    lines: [
      '11.1 Η παρούσα πολιτική μπορεί να επικαιροποιείται. Η νεότερη έκδοση θα είναι διαθέσιμη στην πλατφόρμα.',
    ],
  },
] as const;

function LegalSection({ title, lines }: { title: string; lines: readonly string[] }) {
  return (
    <section className="space-y-2">
      <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
      <div className="space-y-1">
        {lines.map((line) => (
          <p key={line} className="text-sm text-text-secondary leading-relaxed">
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}

export function LegalConsent({ accepted, onAcceptedChange, className, compact }: LegalConsentProps) {
  const checkboxId = useId();

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-4 shadow-card-soft',
        compact && 'p-3',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id={checkboxId}
          checked={accepted}
          onCheckedChange={(value) => onAcceptedChange(Boolean(value))}
          className="mt-1"
        />
        <div className="space-y-2">
          <Label htmlFor={checkboxId} className="text-sm text-text-secondary leading-relaxed cursor-pointer">
            Έχω διαβάσει και αποδέχομαι τους Όρους Χρήσης και την Πολιτική Απορρήτου.
          </Label>
          <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
            <Dialog>
              <DialogTrigger asChild>
                <button type="button" className="text-accent-primary hover:underline">
                  Όροι Χρήσης
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Όροι Χρήσης Πλατφόρμας & Ηλεκτρονική Αποδοχή</DialogTitle>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-4">
                  {termsSections.map((section) => (
                    <LegalSection key={section.title} title={section.title} lines={section.lines} />
                  ))}
                  <p className="text-xs text-text-secondary pt-2">
                    Έκδοση Όρων: {TERMS_VERSION}
                  </p>
                </div>
              </DialogContent>
            </Dialog>
            <span className="text-text-secondary/60">•</span>
            <Dialog>
              <DialogTrigger asChild>
                <button type="button" className="text-accent-primary hover:underline">
                  Πολιτική Απορρήτου
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Πολιτική Απορρήτου</DialogTitle>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-4">
                  {privacySections.map((section) => (
                    <LegalSection key={section.title} title={section.title} lines={section.lines} />
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-text-secondary">
        Η αποδοχή καταγράφεται ηλεκτρονικά με ημερομηνία/ώρα και email.
      </p>
    </div>
  );
}
