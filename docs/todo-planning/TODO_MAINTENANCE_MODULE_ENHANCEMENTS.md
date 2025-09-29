# 🚀 TODO: Στρατηγική Αναβάθμιση Module Συντήρησης

## 🎯 **Στόχος**
Μετατροπή του module συντήρησης από ένα απλό σύστημα καταγραφής εργασιών σε ένα ολοκληρωμένο, προληπτικό και στρατηγικό εργαλείο διαχείρισης κτιριακών εγκαταστάσεων.

---

## 📁 **Αρχεία που θα Τροποποιηθούν/Δημιουργηθούν**

### 🔧 **Backend**
- `backend/maintenance/models.py`: Προσθήκη/Τροποποίηση μοντέλων.
- `backend/maintenance/views.py`: Νέα API endpoints.
- `backend/maintenance/serializers.py`: Νέα serializers.
- `backend/maintenance/admin.py`: Ενημέρωση του admin interface.
- `backend/user_requests/models.py`: Πιθανή τροποποίηση για σύνδεση.
- `backend/scripts/auto_initialization.py`: Προσθήκη demo data για τα νέα μοντέλα.

### 🎨 **Frontend**
- `frontend/app/(dashboard)/maintenance/`: Νέες υπο-σελίδες (assets, recurring).
- `frontend/app/(dashboard)/requests/page.tsx`: Προσθήκη κουμπιού "Δημιουργία Εργασίας".
- `frontend/components/maintenance/`: Νέα components (AssetCard, RecurringTaskForm, etc.).
- `frontend/api/maintenance.ts`: Νέες συναρτήσεις κλήσης API.

---

## 🚀 **Συγκεκριμένες Ενέργειες & Βήματα Υλοποίησης**

### **Βήμα 1: 🔗 Πλήρης Ενσωμάτωση με Αιτήματα Χρηστών (User Requests)**
*Μετατρέπουμε την αναφορά ενός προβλήματος σε άμεση δράση.*

- [ ] **1.1 Backend: Σύνδεση Μοντέλων**
    - Στο `maintenance/models.py`, στο μοντέλο `ScheduledMaintenance`, προσθήκη του παρακάτω πεδίου:
      ```python
      originating_request = models.OneToOneField(
          'user_requests.UserRequest',
          on_delete=models.SET_NULL,
          null=True,
          blank=True,
          related_name='maintenance_task',
          verbose_name="Αρχικό Αίτημα"
      )
      ```
- [ ] **1.2 Backend: Αυτοματοποίηση Status**
    - Δημιουργία ενός Django signal. Όταν ένα `ScheduledMaintenance` task αλλάζει status σε `completed`, το συνδεδεμένο `originating_request` θα πρέπει αυτόματα να αλλάζει status σε `completed`.
- [ ] **1.3 Frontend: Νέα Ροή Εργασίας**
    - Στη σελίδα λίστας των `UserRequests` (`/requests`), προσθήκη ενός κουμπιού "Δημιουργία Εργασίας" για κάθε αίτημα τύπου 'maintenance'.
    - Το πάτημα του κουμπιού θα ανοίγει τη φόρμα δημιουργίας `ScheduledMaintenance`, προσυμπληρώνοντας αυτόματα τον τίτλο και την περιγραφή από το αίτημα.
- [ ] **1.4 Frontend: Ειδοποιήσεις**
    - Όταν η εργασία (και κατ' επέκταση το αίτημα) ολοκληρώνεται, ο χρήστης που έκανε το αρχικό αίτημα να λαμβάνει ειδοποίηση.

---

### **Βήμα 2: 🏛️ Διαχείριση Παγίων & Εξοπλισμού (Asset Management)**
*Δημιουργούμε ψηφιακό φάκελο για κάθε κρίσιμο εξοπλισμό του κτιρίου.*

- [ ] **2.1 Backend: Δημιουργία Μοντέλου `BuildingAsset`**
    - Στο `maintenance/models.py`, δημιουργία του νέου μοντέλου `BuildingAsset` όπως προτάθηκε στην προηγούμενη συνομιλία.
- [ ] **2.2 Backend: Σύνδεση Εργασίας με Πάγιο**
    - Στο μοντέλο `ScheduledMaintenance`, προσθήκη του πεδίου `asset` (ForeignKey στο `BuildingAsset`).
- [ ] **2.3 Backend: Δημιουργία API Endpoints**
    - Δημιουργία νέων ViewSets και Serializers για το `BuildingAsset`.
- [ ] **2.4 Frontend: Νέα Σελίδα Διαχείρισης Παγίων**
    - Δημιουργία σελίδας `/maintenance/assets` που θα εμφανίζει όλα τα πάγια του κτιρίου σε μορφή λίστας ή καρτών.
    - Δημιουργία σελίδας λεπτομερειών για κάθε πάγιο (`/maintenance/assets/[id]`) που θα δείχνει:
        - Πληροφορίες του παγίου (εγγύηση, κατασκευαστής κ.λπ.).
        - **Πλήρες ιστορικό συντηρήσεων** (λίστα όλων των `ScheduledMaintenance` που συνδέονται με αυτό).
        - **Συνολικό κόστος συντήρησης** (άθροισμα του `actual_cost` από το ιστορικό).

---

### **Βήμα 3: 🗓️ Προληπτική & Επαναλαμβανόμενη Συντήρηση**
*Αυτοματοποιούμε τις τακτικές εργασίες για να προλαμβάνουμε βλάβες.*

- [ ] **3.1 Backend: Δημιουργία Μοντέλου `RecurringMaintenance`**
    - Στο `maintenance/models.py`, δημιουργία του νέου μοντέλου `RecurringMaintenance`:
      ```python
      class RecurringMaintenance(models.Model):
          title_template = models.CharField(max_length=200)
          building = models.ForeignKey(Building, on_delete=models.CASCADE)
          asset = models.ForeignKey(BuildingAsset, on_delete=models.CASCADE, null=True, blank=True)
          frequency = models.CharField(max_length=20, choices=[('monthly', 'Μηνιαία'), ('quarterly', 'Τριμηνιαία'), ('yearly', 'Ετήσια')])
          start_date = models.DateField()
          is_active = models.BooleanField(default=True)
          # ... άλλα πεδία ...
      ```
- [ ] **3.2 Backend: Δημιουργία Περιοδικού Task**
    - Υλοποίηση ενός περιοδικού task (π.χ. με Celery Beat) που θα εκτελείται καθημερινά.
    - Το task θα ελέγχει τα `RecurringMaintenance` και θα δημιουργεί αυτόματα νέες `ScheduledMaintenance` εργασίες όταν έρθει η ώρα (π.χ. την 1η κάθε μήνα για τις μηνιαίες εργασίες).
- [ ] **3.3 Frontend: Νέα Σελίδα Διαχείρισης**
    - Δημιουργία σελίδας `/maintenance/recurring` όπου ο διαχειριστής θα μπορεί να δημιουργεί, να βλέπει και να ενεργοποιεί/απενεργοποιεί τις επαναλαμβανόμενες εργασίες.

---

### **Βήμα 4: 📈 Βελτιωμένη Διαχείριση Συνεργείων & Προσφορών**
*Δημιουργούμε ένα διαφανές και αντικειμενικό σύστημα επιλογής συνεργατών.*

- [ ] **4.1 Backend: Δυναμική Αξιολόγηση Συνεργείου**
    - Τροποποίηση του `Contractor` model. Το πεδίο `rating` δεν θα είναι πλέον χειροκίνητο.
    - Δημιουργία ενός νέου μοντέλου `ContractorReview` που θα συνδέεται με μια ολοκληρωμένη `ScheduledMaintenance` εργασία.
    - Το `rating` του `Contractor` θα υπολογίζεται δυναμικά ως ο μέσος όρος όλων των `ContractorReview`.
- [ ] **4.2 Backend: Διαχείριση Συμβολαίων**
    - Αξιοποίηση του υπάρχοντος `projects/models.py -> Contract` model για την παρακολούθηση συμβολαίων συντήρησης με συγκεκριμένα συνεργεία (π.χ. ετήσιο συμβόλαιο συντήρησης ανελκυστήρα).
- [ ] **4.3 Frontend: Ροή Εργασίας Προσφορών**
    - Για μεγάλες, μη-τακτικές εργασίες, ο διαχειριστής θα μπορεί να δημιουργήσει ένα νέο `Project`.
    - Το `Project` θα μπορεί να ανοίξει για υποβολή προσφορών (`Offer`).
    - Ο διαχειριστής θα βλέπει όλες τις προσφορές συγκεντρωτικά και θα μπορεί να επιλέξει την καλύτερη, δημιουργώντας αυτόματα ένα `Contract`.

---

### **Βήμα 5: 🎨 Δημιουργία Δεδομένων Επίδειξης (Demo Data)**
*Ζωντανεύουμε τις νέες λειτουργίες με ρεαλιστικά δεδομένα.*

- [ ] **5.1 Ενημέρωση `auto_initialization.py`**
    - Στο `backend/scripts/auto_initialization.py`, επέκταση της συνάρτησης `create_demo_data` (ή δημιουργία νέας) για να δημιουργεί:
        - 2-3 `BuildingAsset` (π.χ. "Ανελκυστήρας", "Λέβητας Κεντρικής Θέρμανσης").
        - Μερικές `ScheduledMaintenance` εργασίες συνδεδεμένες με αυτά τα πάγια.
        - Μία `RecurringMaintenance` εργασία (π.χ. "Μηνιαίος έλεγχος πυροσβεστήρων").
        - Μερικές `ContractorReview` για τα ολοκληρωμένα tasks.

---