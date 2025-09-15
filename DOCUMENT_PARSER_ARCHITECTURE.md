# 🤖 Αρχιτεκτονική & Λογική του AI Document Parser

Αυτό το έγγραφο περιγράφει την τεχνική αρχιτεκτονική, τη ροή δεδομένων και την κατάσταση υλοποίησης της λειτουργίας αυτόματης αναγνώρισης παραστατικών (AI Document Parser) στο σύστημα New Concierge.

---

## 🎯 1. Επισκόπηση & Στόχος

**Στόχος:** Η αυτοματοποίηση της διαδικασίας καταχώρησης δαπανών μέσω της αυτόματης ανάγνωσης και εξαγωγής δεδομένων από αρχεία παραστατικών (PDF, εικόνες) που ανεβάζουν οι χρήστες. Αυτό μειώνει δραστικά τον χρόνο χειροκίνητης εισαγωγής δεδομένων και ελαχιστοποιεί τα λάθη.

**Τρέχουσα Κατάσταση:** Η λειτουργία είναι **σε μεγάλο βαθμό υλοποιημένη και λειτουργική**. Η υποδομή είναι έτοιμη, και τα βασικά κομμάτια του backend και του frontend έχουν αναπτυχθεί.

---

## 🏗️ 2. Αρχιτεκτονική Συστήματος

Η αρχιτεκτονική βασίζεται σε ένα **ασύγχρονο μοντέλο επεξεργασίας** για να διασφαλιστεί ότι η εφαρμογή παραμένει γρήγορη και αποκριτική για τον χρήστη, ακόμα και κατά την επεξεργασία μεγάλων ή πολλαπλών αρχείων.

### Ροή Δεδομένων

```mermaid
graph TD
    subgraph Frontend
        A[1. User Uploads Document] --> B{Document Review Page};
    end

    subgraph "Backend API"
        C[2. API Endpoint</br>/api/documents/upload/] --> D[3. Create DocumentUpload Record</br>(status: pending)];
    end

    subgraph "Async Processing"
        E[4. Celery Task Queue</br>(Redis)] --> F[5. Celery Worker];
    end

    subgraph "External Services"
        G[6. Google Document AI API];
    end
    
    subgraph "Backend Database"
        H[DocumentUpload Model];
        I[Expense Model];
    end

    A --> C;
    C --> E;
    F --> G;
    G --> F;
    F --> H[7. Update DocumentUpload</br>(status: awaiting_confirmation, data: ...)];
    H --> B;
    B --> J[8. User Confirms Data];
    J --> K[9. API Endpoint</br>/api/documents/{id}/confirm/];
    K --> L[10. Create Expense Record];
    L --> I;
    K --> M[11. Link Expense to DocumentUpload];
    M --> H;
```

### Βασικά Στοιχεία

1.  **Frontend (Next.js)**: Παρέχει το UI για το ανέβασμα αρχείων και τη σελίδα ελέγχου/επιβεβαίωσης των εξαγόμενων δεδομένων.
2.  **Backend (Django/DRF)**: Παρέχει τα API endpoints για τη διαχείριση των παραστατικών και τη σύνδεση με το οικονομικό σύστημα.
3.  **Celery & Redis**: Υλοποιούν την "ουρά" εργασιών. Το Django στέλνει την εργασία επεξεργασίας στο Redis, και το Celery την παραλαμβάνει για εκτέλεση στο παρασκήνιο.
4.  **Google Document AI**: Η εξωτερική υπηρεσία που κάνει την πραγματική ανάλυση (OCR) και την εξαγωγή δομημένων δεδομένων από το αρχείο.
5.  **PostgreSQL Database**: Αποθηκεύει τις πληροφορίες για τα παραστατικά (`DocumentUpload` model) και τις τελικές δαπάνες (`Expense` model).

---

## 🔄 3. Αναλυτική Ροή Εργασίας

1.  **Ανέβασμα Αρχείου**: Ο χρήστης ανεβάζει ένα αρχείο (π.χ. `invoice.pdf`) μέσω του `DocumentUploadModal` στο frontend.

2.  **Άμεση Απόκριση API**: Το frontend στέλνει το αρχείο στο `POST /api/documents/upload/`. Το backend:
    -   Δημιουργεί μια νέα εγγραφή στο μοντέλο `DocumentUpload` με `status='pending'`.
    -   Δρομολογεί μια ασύγχρονη εργασία (`process_document.delay(document.id)`) στο Celery.
    -   Επιστρέφει **αμέσως** μια απάντηση `201 Created` στο frontend. Ο χρήστης δεν περιμένει.

3.  **Επεξεργασία στο Παρασκήνιο**:
    -   Ένας `Celery worker` (που τρέχει σε ξεχωριστό container) παραλαμβάνει την εργασία.
    -   Ενημερώνει την κατάσταση του παραστατικού σε `status='processing'`.
    -   Καλεί την υπηρεσία `GoogleDocumentAIService`, η οποία στέλνει το αρχείο στο Google Cloud.
    -   Μετά την επιστροφή των αποτελεσμάτων από την Google, ο worker ενημερώνει την εγγραφή `DocumentUpload` με:
        -   `status='awaiting_confirmation'`
        -   `extracted_data`: Τα δομημένα δεδομένα (π.χ. ποσό, ημερομηνία, προμηθευτής).
        -   `confidence_score`: Το ποσοστό βεβαιότητας της ανάλυσης.

4.  **Ειδοποίηση Χρήστη**:
    -   Το frontend, μέσω **polling** (`useDocuments` hook) ή **WebSockets** (`WebSocketProvider`), αντιλαμβάνεται την αλλαγή της κατάστασης.
    -   Εμφανίζεται μια ειδοποίηση (toast) που ενημερώνει τον χρήστη ότι το παραστατικό είναι έτοιμο για έλεγχο.

5.  **Έλεγχος & Επιβεβαίωση**:
    -   Ο χρήστης πλοηγείται στη σελίδα `/documents/[id]/review`.
    -   Η σελίδα εμφανίζει την εικόνα του παραστατικού και μια φόρμα προσυμπληρωμένη με τα `extracted_data`.
    -   Ο χρήστης ελέγχει τα δεδομένα, τα διορθώνει αν χρειάζεται, και πατάει "Επιβεβαίωση & Καταχώρηση".

6.  **Οριστική Καταχώρηση**:
    -   Το frontend στέλνει τα τελικά δεδομένα στο `POST /api/documents/{id}/confirm/`.
    -   Το backend view `confirm_and_create_expense`:
        -   Δημιουργεί μια νέα εγγραφή `financial.Expense`.
        -   Συνδέει τη νέα δαπάνη με το παραστατικό μέσω του πεδίου `linked_expense`.
        -   Ενημερώνει την κατάσταση του `DocumentUpload` σε `status='completed'`.

---

## 🧩 4. Υλοποίηση & Βασικά Αρχεία

### Backend

-   **`document_parser/models.py`**:
    -   `DocumentUpload`: Το κεντρικό μοντέλο που περιέχει το αρχείο, την κατάσταση επεξεργασίας, τα εξαγόμενα δεδομένα και τη σύνδεση με το τελικό `Expense`.

-   **`document_parser/services.py`**:
    -   `GoogleDocumentAIService`: Η κλάση που περιέχει όλη τη λογική για την επικοινωνία με το Google Document AI API.

-   **`document_parser/tasks.py`**:
    -   `process_document`: Το Celery task που εκτελείται ασύγχρονα για την επεξεργασία του παραστατικού.

-   **`document_parser/views.py`**:
    -   `DocumentUploadViewSet`: Το ViewSet που διαχειρίζεται τα API endpoints. Περιλαμβάνει την custom action `confirm_and_create_expense` για την τελική καταχώρηση.

-   **`docker-compose.yml`**:
    -   Έχει ενημερωθεί για να περιλαμβάνει τις υπηρεσίες `celery`, `celery-beat` (για προγραμματισμένες εργασίες) και `flower` (για monitoring).

### Frontend

-   **`hooks/useDocumentParser.ts`**:
    -   Περιέχει τα custom React Query hooks (`useGetDocumentUpload`, `useConfirmDocument`) για την εύκολη επικοινωνία με το backend API.

-   **`app/(dashboard)/documents/page.tsx`**:
    -   Η κύρια σελίδα που εμφανίζει τη λίστα των παραστατικών και την κατάστασή τους, με αυτόματη ανανέωση.

-   **`app/(dashboard)/documents/[id]/review/page.tsx`**:
    -   Η σελίδα ελέγχου, με το split-screen UI για την οπτική σύγκριση και την επιβεβαίωση των δεδομένων.

-   **`WebSocketProvider.tsx`**:
    -   Παρέχει real-time ειδοποιήσεις στον χρήστη όταν ένα παραστατικό ολοκληρώνει την επεξεργασία του.

---

## 📈 5. Κατάσταση & Επόμενα Βήματα

### ✅ Ολοκληρωμένα

-   **Πλήρης Υποδομή**: Η αρχιτεκτονική με Celery/Redis έχει στηθεί και λειτουργεί.
-   **Backend Logic**: Οι υπηρεσίες, τα tasks και τα API endpoints είναι πλήρως υλοποιημένα.
-   **Frontend UI**: Οι σελίδες για το ανέβασμα, τη λίστα και τον έλεγχο των παραστατικών είναι έτοιμες.
-   **Σύνδεση με Οικονομικά**: Η λογική για τη δημιουργία `Expense` από επιβεβαιωμένα παραστατικά έχει υλοποιηθεί.

### ⏳ Σε Εκκρεμότητα / Επόμενες Βελτιώσεις

-   **[ ] Βελτίωση Φόρμας Ελέγχου**:
    -   Αντικατάσταση των γενικών πεδίων `<Input />` με πιο εξειδικευμένα components (π.χ., `DatePicker` για ημερομηνίες, `Autocomplete` για προμηθευτές).

-   **[ ] Έξυπνη Κατηγοριοποίηση Δαπάνης**:
    -   Στο `confirm_and_create_expense`, αντί για μια σταθερή κατηγορία, θα μπορούσε να γίνει προσπάθεια αυτόματης αντιστοίχισης κατηγορίας βάσει του ονόματος του προμηθευτή ή του περιεχομένου του παραστατικού.

-   **[ ] Management Command για Επανεπεξεργασία**:
    -   Δημιουργία ενός Django management command (`python manage.py reprocess_failed_documents`) για την αυτόματη επανεπεξεργασία όλων των παραστατικών που απέτυχαν.

-   **[ ] Πλήρεις End-to-End Δοκιμές**:
    -   Εκτέλεση δοκιμών με πραγματικά Google Cloud credentials για την επιβεβαίωση της απρόσκοπτης λειτουργίας σε συνθήκες παραγωγής.

-   **[ ] Βελτιστοποίηση Κόστους**:
    -   Διερεύνηση επιλογών για μείωση του κόστους, όπως η χρήση ενός φθηνότερου OCR service για απλά παραστατικά ή η ομαδοποίηση κλήσεων προς το API (batch processing).