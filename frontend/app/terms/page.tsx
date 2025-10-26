'use client';

import { Building, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Επιστροφή
          </Button>
          
          <div className="flex items-center mb-4">
            <Building className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Όροι Χρήσης</h1>
          </div>
          <p className="text-gray-600">
            Τελευταία ενημέρωση: {new Date().toLocaleDateString('el-GR')}
          </p>
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>1. Αποδοχή των Όρων</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              Καλωσορίζουμε στην Digital Concierge. Αυτοί οι Όροι Χρήσης 
              (εφεξής "Όροι") διέπουν τη χρήση της πλατφόρμας μας. 
              Με την πρόσβαση ή χρήση της πλατφόρμας, συμφωνείτε να 
              δεσμεύεστε από αυτούς τους Όρους.
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>2. Περιγραφή Υπηρεσιών</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              Η Digital Concierge παρέχει μια ολοκληρωμένη πλατφόρμα για τη 
              διαχείριση κτιρίων και πολυκατοικιών, συμπεριλαμβανομένων:
            </p>
            <ul>
              <li>Διαχείριση κατοίκων και διαμερισμάτων</li>
              <li>Οικονομική διαχείριση και αναφορές</li>
              <li>Επικοινωνία και ανακοινώσεις</li>
              <li>Διαχείριση αιτημάτων συντήρησης</li>
              <li>Ψηφοφορίες και αποφάσεις</li>
              <li>Αναλυτικά στοιχεία και στατιστικά</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>3. Λογαριασμός Χρήστη</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <h4>3.1 Δημιουργία Λογαριασμού:</h4>
            <ul>
              <li>Πρέπει να είστε τουλάχιστον 18 ετών</li>
              <li>Πρέπει να παρέχετε ακριβείς πληροφορίες</li>
              <li>Είστε υπεύθυνοι για την ασφάλεια του λογαριασμού σας</li>
            </ul>

            <h4>3.2 Απαγορεύσεις:</h4>
            <ul>
              <li>Δεν μπορείτε να μοιραστείτε τον λογαριασμό σας</li>
              <li>Δεν μπορείτε να χρησιμοποιήσετε την πλατφόρμα για παράνομες δραστηριότητες</li>
              <li>Δεν μπορείτε να παρεμβαίνετε στην λειτουργία της πλατφόρμας</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>4. Τιμολόγηση και Πληρωμές</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <h4>4.1 Συνδρομές:</h4>
            <ul>
              <li>Οι τιμές είναι σε ευρώ και περιλαμβάνουν ΦΠΑ</li>
              <li>Οι πληρωμές γίνονται μέσω Stripe</li>
              <li>Οι συνδρομές ανανεώνονται αυτόματα</li>
            </ul>

            <h4>4.2 Ακύρωση:</h4>
            <ul>
              <li>Μπορείτε να ακυρώσετε οποιαδήποτε στιγμή</li>
              <li>Η ακύρωση ισχύει από την επόμενη περίοδο χρέωσης</li>
              <li>Δεν παρέχουμε επιστροφές για περίοδο που έχει ήδη χρεωθεί</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>5. Δικαιώματα Πνευματικής Ιδιοκτησίας</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              Όλα τα δικαιώματα πνευματικής ιδιοκτησίας της πλατφόρμας 
              ανήκουν στην Digital Concierge. Δεν μπορείτε να:
            </p>
            <ul>
              <li>Αντιγράψετε ή αναπαράγετε την πλατφόρμα</li>
              <li>Κάνετε reverse engineering</li>
              <li>Χρησιμοποιήσετε τα εμπορικά σήματα μας</li>
              <li>Δημιουργήσετε παράγωγα προϊόντα</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>6. Ευθύνη Χρήστη</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              Είστε υπεύθυνοι για:
            </p>
            <ul>
              <li>Την ακρίβεια των δεδομένων που εισάγετε</li>
              <li>Την συμμόρφωση με τους νόμους και κανονισμούς</li>
              <li>Την προστασία των δεδομένων των κατοίκων</li>
              <li>Την ασφαλή χρήση της πλατφόρμας</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>7. Αποποίηση Ευθύνης</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              Η πλατφόρμα παρέχεται "ως έχει". Δεν εγγυόμαστε:
            </p>
            <ul>
              <li>Ότι η πλατφόρμα θα είναι διαθέσιμη συνεχώς</li>
              <li>Ότι δεν θα υπάρχουν σφάλματα ή bugs</li>
              <li>Ότι τα αποτελέσματα θα είναι ακριβή</li>
              <li>Ότι η πλατφόρμα θα πληροί όλες τις ανάγκες σας</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>8. Περιορισμός Ευθύνης</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              Η ευθύνη μας περιορίζεται στο μέγιστο επιτρεπόμενο από το νόμο. 
              Δεν είμαστε υπεύθυνοι για:
            </p>
            <ul>
              <li>Έμμεσες ή συνεπακόλουθες ζημίες</li>
              <li>Απώλεια κερδών ή ευκαιριών</li>
              <li>Απώλεια δεδομένων</li>
              <li>Ζημίες από τρίτους</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>9. Τερματισμός</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              Μπορούμε να τερματίσουμε την πρόσβασή σας αν:
            </p>
            <ul>
              <li>Παραβιάσετε αυτούς τους Όρους</li>
              <li>Δεν πληρώσετε τις χρεώσεις</li>
              <li>Χρησιμοποιήσετε την πλατφόρμα παράνομα</li>
              <li>Δημιουργήσετε κίνδυνο για άλλους χρήστες</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>10. Εφαρμοστέο Δίκαιο</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              Αυτοί οι Όροι διέπονται από το ελληνικό δίκαιο. 
              Οποιαδήποτε διαφορά θα επιλυθεί στα ελληνικά δικαστήρια.
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>11. Επικοινωνία</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              Για ερωτήσεις σχετικά με αυτούς τους Όρους, 
              επικοινωνήστε μαζί μας στο:
            </p>
            <ul>
              <li>Email: legal@digitalconcierge.gr</li>
              <li>Τηλέφωνο: +30 210 123 4567</li>
              <li>Διεύθυνση: Αθήνα, Ελλάδα</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>12. Αλλαγές στους Όρους</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              Μπορούμε να ενημερώσουμε αυτούς τους Όρους κατά καιρούς. 
              Θα σας ειδοποιήσουμε για σημαντικές αλλαγές μέσω email ή 
              ειδοποίησης στην πλατφόρμα.
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-12 text-center">
          <Link href="/">
            <Button variant="outline">
              <Building className="w-4 h-4 mr-2" />
              Επιστροφή στην Αρχική
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
