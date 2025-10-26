'use client';

import { Building, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PrivacyPage() {
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
            <h1 className="text-3xl font-bold text-gray-900">Πολιτική Απορρήτου</h1>
          </div>
          <p className="text-gray-600">
            Τελευταία ενημέρωση: {new Date().toLocaleDateString('el-GR')}
          </p>
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>1. Εισαγωγή</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              Η Digital Concierge (εφεξής "εμείς", "μας" ή "η εταιρεία μας") 
              σέβεται το απόρρητό σας και δεσμεύεται να προστατεύει τα προσωπικά 
              σας δεδομένα. Αυτή η Πολιτική Απορρήτου εξηγεί πώς συλλέγουμε, 
              χρησιμοποιούμε και προστατεύουμε τις πληροφορίες σας όταν 
              χρησιμοποιείτε την πλατφόρμα μας.
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>2. Πληροφορίες που Συλλέγουμε</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <h4>2.1 Πληροφορίες που μας παρέχετε:</h4>
            <ul>
              <li>Όνομα και επώνυμο</li>
              <li>Διεύθυνση email</li>
              <li>Αριθμός τηλεφώνου</li>
              <li>Πληροφορίες κτιρίου/διαμερίσματος</li>
              <li>Οικονομικά δεδομένα (μόνο για τη διαχείριση του κτιρίου)</li>
            </ul>

            <h4>2.2 Πληροφορίες που συλλέγουμε αυτόματα:</h4>
            <ul>
              <li>Δεδομένα χρήσης της πλατφόρμας</li>
              <li>IP διεύθυνση</li>
              <li>Τύπος περιηγητή και λειτουργικό σύστημα</li>
              <li>Cookies και παρόμοιες τεχνολογίες</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>3. Πώς Χρησιμοποιούμε τις Πληροφορίες</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>Χρησιμοποιούμε τις πληροφορίες σας για:</p>
            <ul>
              <li>Παροχή και βελτίωση των υπηρεσιών μας</li>
              <li>Επικοινωνία μαζί σας</li>
              <li>Διαχείριση του λογαριασμού σας</li>
              <li>Εκπλήρωση νομικών υποχρεώσεων</li>
              <li>Προστασία των δικαιωμάτων και της ασφάλειάς μας</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>4. Κοινοποίηση Πληροφοριών</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              Δεν πουλάμε, ενοικιάζουμε ή μοιραζόμαστε τις προσωπικές σας 
              πληροφορίες με τρίτους, εκτός από:
            </p>
            <ul>
              <li>Πάροχους υπηρεσιών που μας βοηθούν να λειτουργήσουμε την πλατφόρμα</li>
              <li>Νομικές υποχρεώσεις</li>
              <li>Προστασία δικαιωμάτων και ασφάλειας</li>
              <li>Συναίνεσή σας</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>5. Ασφάλεια Δεδομένων</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              Χρησιμοποιούμε βιομετρικές τεχνολογίες ασφαλείας για να προστατεύσουμε 
              τα δεδομένα σας, συμπεριλαμβανομένων:
            </p>
            <ul>
              <li>Κρυπτογράφηση δεδομένων</li>
              <li>Ασφαλείς συνδέσεις (HTTPS)</li>
              <li>Περιορισμένη πρόσβαση σε δεδομένα</li>
              <li>Κανονικό monitoring ασφαλείας</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>6. Δικαιώματά σας</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>Σύμφωνα με τον GDPR, έχετε το δικαίωμα να:</p>
            <ul>
              <li>Πρόσβαση στα προσωπικά σας δεδομένα</li>
              <li>Διόρθωση ανακριβών δεδομένων</li>
              <li>Διαγραφή δεδομένων</li>
              <li>Περιορισμό επεξεργασίας</li>
              <li>Φορητότητα δεδομένων</li>
              <li>Αντίρρηση στην επεξεργασία</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>7. Cookies</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              Χρησιμοποιούμε cookies για να βελτιώσουμε την εμπειρία σας στην πλατφόρμα. 
              Μπορείτε να διαχειριστείτε τα cookies μέσω των ρυθμίσεων του περιηγητή σας.
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>8. Επικοινωνία</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              Για ερωτήσεις σχετικά με αυτή την Πολιτική Απορρήτου, 
              επικοινωνήστε μαζί μας στο:
            </p>
            <ul>
              <li>Email: privacy@digitalconcierge.gr</li>
              <li>Τηλέφωνο: +30 210 123 4567</li>
              <li>Διεύθυνση: Αθήνα, Ελλάδα</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>9. Αλλαγές στην Πολιτική</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p>
              Μπορούμε να ενημερώσουμε αυτή την Πολιτική Απορρήτου κατά καιρούς. 
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
