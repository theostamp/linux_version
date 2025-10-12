# 📹 Widget: Camera & Security

## 🎯 1. Στόχος

Ενσωμάτωση μιας κάμερας στο Kiosk για την παροχή δύο βασικών επιπέδων λειτουργικότητας:

1.  **Ασφάλεια & Αποτροπή (MVP):** Παθητική καταγραφή βίντεο κατά την ανίχνευση κίνησης για την ασφάλεια του χώρου και την προστασία της συσκευής από βανδαλισμούς.
2.  **Έξυπνες Λειτουργίες (Μελλοντική Επέκταση):** Ενεργή χρήση της κάμερας για αναγνώριση προσώπου, με σκοπό την παροχή εξατομικευμένης εμπειρίας στους ενοίκους.

---

## 🏗️ 2. Αρχιτεκτονική

Η λειτουργία θα βασίζεται σε μια αρχιτεκτονική που συνδυάζει τοπική επεξεργασία στο Kiosk και κεντρική διαχείριση στο backend.

```mermaid
graph TD
    subgraph Kiosk
        A[1. Camera Module] --> B{2. Camera Service</br>(Motion Detection)};
    end

    subgraph "Backend API"
        C[3. API Endpoint</br>/api/kiosk/recordings/upload/];
    end

    subgraph "Cloud Infrastructure"
        D[4. Secure Cloud Storage</br>(e.g., AWS S3)];
        E[5. AI/ML Service</br>(e.g., AWS Rekognition)];
    end
    
    subgraph "Backend Database"
        F[CameraRecording Model];
    end

    B -- on motion --> B;
    B -- records & uploads clip --> C;
    C -- stores file --> D;
    C -- creates record --> F;

    %% Future Face Recognition Flow
    B -- sends frame for analysis --> G[API: /kiosk/identify-face/];
    G --> E;
    E --> G;
    G -- returns resident data --> B;

```

---

## 🔩 3. Φάση 1: Security Recording (MVP)

### Λειτουργικότητα

-   **Ανίχνευση Κίνησης:** Ένα background service στο Kiosk παρακολουθεί συνεχώς τη ροή της κάμερας για κίνηση.
-   **Καταγραφή Clip:** Όταν ανιχνευτεί κίνηση, το service καταγράφει ένα σύντομο βίντεο κλιπ (π.χ. 20 δευτερόλεπτα).
-   **Ασφαλής Μεταφόρτωση:** Το κλιπ μεταφορτώνεται αμέσως στο backend μέσω ενός ασφαλούς API endpoint. **Κανένα βίντεο δεν αποθηκεύεται μόνιμα στη συσκευή του Kiosk.**
-   **Ειδοποίηση GDPR:** Στην οθόνη του Kiosk εμφανίζεται μόνιμα μια διακριτική ένδειξη (π.χ. εικονίδιο κάμερας και το κείμενο "Ο χώρος βιντεοσκοπείται") για την ενημέρωση των διερχομένων.

### Τεχνική Υλοποίηση

#### Backend

-   **Νέο Model (`kiosk/models.py`):**
    ```python
    class CameraRecording(models.Model):
        kiosk = models.ForeignKey('kiosks.Kiosk', on_delete=models.CASCADE)
        timestamp = models.DateTimeField(auto_now_add=True)
        video_file = models.FileField(upload_to='kiosk_recordings/') # Points to S3
        reason = models.CharField(max_length=50, default='motion_detected')

        class Meta:
            ordering = ['-timestamp']
    ```
-   **Νέο API Endpoint (`kiosk/views.py`):**
    -   `POST /api/kiosk/recordings/upload/`: Ένα endpoint που θα δέχεται το αρχείο βίντεο και θα δημιουργεί την αντίστοιχη εγγραφή `CameraRecording`.

-   **Νέο Cron Job (`AUTOMATED_CRON_JOBS.md`):**
    -   Δημιουργία ενός management command `cleanup_recordings` που θα διαγράφει αυτόματα τα αρχεία βίντεο και τις εγγραφές που είναι παλαιότερες από μια καθορισμένη περίοδο (π.χ. 15 ημέρες), για συμμόρφωση με το GDPR.

#### Kiosk

-   **Νέο Background Service:** Ένα service γραμμένο σε Python ή Node.js που θα χρησιμοποιεί βιβλιοθήκες όπως το OpenCV για την ανίχνευση κίνησης και την καταγραφή.

---

## ✨ 4. Φάση 2: Smart Features (Μελλοντική Επέκταση)

### Λειτουργικότητα

-   **Εξατομικευμένο Καλωσόρισμα:** Όταν ένας ένοικος που έχει δώσει τη συγκατάθεσή του πλησιάζει το Kiosk, το σύστημα τον αναγνωρίζει και εμφανίζει ένα προσωπικό μήνυμα (π.χ. "Καλώς ήρθατε, κ. Παπαδόπουλε").
-   **Προσωπικές Ειδοποιήσεις:** Το Kiosk μπορεί να εμφανίσει ειδοποιήσεις που αφορούν αποκλειστικά τον συγκεκριμένο ένοικο (π.χ. "Έχετε 1 νέα ανακοίνωση" ή "Η ψηφοφορία για το ασανσέρ λήγει αύριο").

### Νομικό Πλαίσιο & Συγκατάθεση (GDPR)

Αυτή η λειτουργία απαιτεί **ρητή, προαιρετική συγκατάθεση (opt-in)** από κάθε ένοικο.

1.  **Opt-in στο Mobile App:** Ο ένοικος θα πρέπει να ενεργοποιήσει τη λειτουργία μέσα από τις ρυθμίσεις της εφαρμογής του στο κινητό.
2.  **Διαφάνεια:** Σαφής επεξήγηση του πώς χρησιμοποιούνται τα βιομετρικά του δεδομένα.
3.  **Δικαίωμα στη Λήθη:** Ο ένοικος πρέπει να μπορεί ανά πάσα στιγμή να ανακαλέσει τη συγκατάθεσή του και να διαγράψει οριστικά τα δεδομένα του με ένα κλικ.

### Τεχνική Ροή

1.  Το Kiosk ανιχνεύει ένα πρόσωπο.
2.  Στέλνει ένα καρέ στο backend.
3.  Το backend καλεί μια υπηρεσία AI (π.χ. AWS Rekognition) για ταυτοποίηση.
4.  Αν υπάρξει επιτυχής ταυτοποίηση, το backend ανακτά τις προσωπικές πληροφορίες/ειδοποιήσεις για τον ένοικο.
5.  Το Kiosk λαμβάνει τα δεδομένα και προσαρμόζει προσωρινά την οθόνη του.

---

## ⚙️ 5. Διαμόρφωση Widget

-   **Όνομα:** `CameraSecurity`
-   **Τύπος:** `background_service`
-   **Περιγραφή:** Διαχειρίζεται την κάμερα για ασφάλεια και έξυπνες λειτουργίες.
-   **Ρυθμίσεις (στο `Kiosk` model):**
    -   `camera_enabled: boolean` (default: `false`)
    -   `camera_mode: Enum('security', 'smart')` (default: `'security'`)
    -   `recording_retention_days: Integer` (default: `15`)