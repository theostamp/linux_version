# Tenant Post-Deploy Verification Checklist

Ακολουθήστε τα παρακάτω βήματα μετά την ενεργοποίηση του schema `theo` σε production (https://theo.newconcierge.app):

## Προετοιμασία
- Εκτελέστε `python fix_tenant_theo_demo_data.py --schema theo --force` από τον ριζικό φάκελο του repo (WSL). Αυτό διασφαλίζει ότι το demo κτίριο “Αλκμάνος 22” και όλα τα διαμερίσματα/μέλη δημιουργούνται με συνέπεια.
- Επιβεβαιώστε ότι οι βασικές μεταβλητές περιβάλλοντος (`API_BASE_URL`, `NEXT_PUBLIC_API_URL`, `TENANT_BASE_DOMAIN`) έχουν συγχρονιστεί σε Vercel/Railway και δείχνουν στο production backend.
- Μετά το deploy του `public-app`, καθαρίστε caches/CDN όπου απαιτείται (Vercel purge).

## Έλεγχοι Εφαρμογής (Frontend)
1. **Authentication**
   - Συνδεθείτε ως `theo` στο https://theo.newconcierge.app/login.
   - Επιβεβαιώστε ότι το dashboard δεν ανακατευθύνει σε login μετά την επιτυχή αυθεντικοποίηση.

2. **BuildingContext / Default Building**
   - Μετά το login, ανοίξτε το `/dashboard`.
   - Ελέγξτε ότι το dropdown των κτιρίων έχει επιλεγμένο το “Αλκμάνος 22”.
   - Κάντε refresh και βεβαιωθείτε ότι παραμένει το ίδιο default.

3. **Dashboard Widgets**
   - Tabs “Financial Overview” και “Financial Dashboard” πρέπει να φορτώνουν χωρίς 404.
   - Οι κάρτες για οφειλές/εισπράξεις να εμφανίζουν αριθμητικές τιμές (όχι `NaN` / κενά).
   - Σε περίπτωση μηδενικών δεδομένων, εμφανίζεται μήνυμα empty state (όχι crash).

4. **Οικονομικά (Financial)**
   - `/financial` > tabs (Transactions, Cash flow, Balances, Reports) να φορτώνουν:
     - CashFlow chart: δεν μένει κενό, εμφανίζει empty state αν δεν υπάρχουν κινήσεις.
     - Reports manager: κουμπιά export να ξεκινούν download (HTTP 200, όχι 404).
     - Payment list / modals να διαβάζουν δεδομένα (έστω κενή λίστα).

5. **Ανακοινώσεις**
   - `/announcements` να εμφανίζει λίστα ή empty state χωρίς σφάλμα.
   - Δημιουργία ανακοίνωσης (αν υποστηρίζεται) να καταλήγει σε επιτυχή POST (201/200).

6. **Ψηφοφορίες**
   - `/votes` να φορτώνει λίστα. Άδειο dataset → μήνυμα “Δεν υπάρχουν διαθέσιμες ψηφοφορίες.”
   - Αν υπάρχει ψηφοφορία, το detail `/votes/[id]` να λειτουργεί (GET 200).

7. **Αιτήματα Κατοίκων**
   - `/requests` να φορτώνει χωρίς 404.
   - Τα φίλτρα/αναζητήσεις να μην ρίχνουν σφάλματα (GET 200/204).

8. **Apartment Balances**
   - Από `/financial` -> tab Balances, η λίστα διαμερισμάτων να εμφανίζεται.
   - Επιβεβαιώστε ότι τα modal (Payment history, Notifications) ανοίγουν χωρίς API σφάλματα.

9. **General API sanity**
   - Παρακολουθήστε το network tab του browser ή τα logs του Vercel:
     - Όλες οι κλήσεις `/api/...` να επιστρέφουν 200/204.
     - Κανένα 404 από Next.js route handlers ή backend.

## Backend / Δεδομένα
- Στη βάση του tenant (schema `theo`), `buildings_building` να περιέχει την εγγραφή “Αλκμάνος 22” με 10 διαμερίσματα.
- `apartments_apartment` να έχει 10 rows, συνολικά mills = 1000.
- `buildings_buildingmembership` να περιέχει τουλάχιστον έναν manager (ο χρήστης theo).

## Monitoring & Logs
- Ελέγξτε τα Rails/Railway logs για πιθανά traces από τις νέες διαδρομές (αναζητήστε `tenantProxy`).
- Σε περίπτωση σφαλμάτων, ενεργοποιήστε προσωρινά το `Vercel` logging (LOG DRAIN) και καταγράψτε τις κλήσεις.

## Rollback Plan
- Αν εντοπιστούν κρίσιμα σφάλματα, απενεργοποιήστε προσωρινά τον rewrite σε `/api/:path*` (Vercel) και ξαναενεργοποιήστε τον παλιό backend entrypoint μέχρι να διορθωθεί η ροή.
- Επαναφέρετε τα demo δεδομένα με `--force` αφού λυθούν τα προβλήματα.

## Τεκμηρίωση
- Καταγράψτε τα αποτελέσματα στον `Z_logs` φάκελο ή στο αντίστοιχο Notion page.
- Ενημερώστε την ομάδα σε Slack με screenshot από τα tabs του tenant μετά τον έλεγχο.


