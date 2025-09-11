# 🤖 TODO: Αυτόματη Αναγνώριση Παραστατικών με AI

## 🎯 Στόχος
Ενσωμάτωση ενός συστήματος AI για την αυτόματη ανάγνωση, εξαγωγή δεδομένων και καταχώρηση παραστατικών (δαπάνες, αποδείξεις, λογαριασμοί) από εικόνες ή αρχεία PDF.

---

## 🏗️ Προτεινόμενη Αρχιτεκτονική

### 1. **Τεχνολογία AI/OCR**
- **Επιλογή:** Google Cloud Vision - Document AI
- **Λόγος:** Υψηλή ακρίβεια σε ελληνικά παραστατικά, έτοιμα μοντέλα για τιμολόγια/αποδείξεις, εύκολη ενσωμάτωση μέσω API.

### 2. **Backend (Django)**
- **Νέα App:** `document_parser`
  - Θα περιέχει τη λογική για την επικοινωνία με το AI service και τη διαχείριση της ροής επεξεργασίας.
- **Νέο Model:** `DocumentUpload`
  - Θα παρακολουθεί κάθε έγγραφο που ανεβαίνει και την κατάστασή του (`pending`, `processing`, `awaiting_confirmation`, `completed`, `failed`).
  - Θα αποθηκεύει το αρχικό αρχείο, το κείμενο από το OCR και τα δομημένα δεδομένα (JSON) από το AI.
  - Θα συνδέεται με την τελική εγγραφή (`Expense`, `Payment`, etc.) μέσω GenericForeignKey.
- **Asynchronous Tasks (Celery & Redis)**
  - Η επικοινωνία με το AI service θα γίνεται ασύγχρονα στο background για να μην καθυστερεί το UI.
- **Νέα API Endpoints:**
  - `POST /api/documents/upload/`: Για το ανέβασμα νέων παραστατικών.
  - `GET /api/documents/`: Λίστα όλων των παραστατικών και η κατάστασή τους.
  - `GET /api/documents/{id}/`: Λεπτομέρειες ενός παραστατικού (με τα εξαγόμενα δεδομένα).
  - `POST /api/documents/{id}/confirm/`: Για την οριστική καταχώρηση μετά την επιβεβαίωση του χρήστη.

### 3. **Frontend (Next.js)**
- **Νέα Σελίδα (`/documents`):**
  - Κεντρικός πίνακας ελέγχου για τα παραστατικά.
  - Λίστα με φίλτρα (π.χ. ανά κατάσταση).
  - Κουμπί για ανέβασμα νέου παραστατικού.
- **Νέο Component (`DocumentUploadModal`):**
  - Drag-and-drop interface για εύκολο ανέβασμα αρχείων.
- **Νέα Σελίδα (`/documents/[id]/review`):**
  - Split-screen UI:
    - **Αριστερά:** Προβολή της εικόνας/PDF του παραστατικού.
    - **Δεξιά:** Φόρμα (π.χ. δημιουργίας δαπάνης) προσυμπληρωμένη με τα δεδομένα από το AI.
  - Ο χρήστης ελέγχει, διορθώνει και υποβάλλει τη φόρμα.

---

## 📋 Βήματα Υλοποίησης

### **Φάση 1: Backend Setup (3-4 ημέρες)**
- [ ] Δημιουργία της Django app `document_parser`.
- [ ] Ορισμός του `DocumentUpload` model και δημιουργία migration.
- [ ] Δημιουργία των βασικών API endpoints (CRUD για `DocumentUpload`).
- [ ] Ενσωμάτωση του Celery για ασύγχρονες εργασίες.

### **Φάση 2: Ενσωμάτωση AI Service (2-3 ημέρες)**
- [ ] Δημιουργία λογαριασμού στο Google Cloud Platform και ενεργοποίηση του Document AI API.
- [ ] Αποθήκευση των credentials με ασφαλή τρόπο (environment variables).
- [ ] Δημιουργία μιας service class (`GoogleDocumentAIService`) που θα χειρίζεται την επικοινωνία με το API.
- [ ] Δημιουργία του Celery task που καλεί αυτή την υπηρεσία.

### **Φάση 3: Frontend UI (4-5 ημέρες)**
- [ ] Δημιουργία της σελίδας `/documents` με τον πίνακα ελέγχου.
- [ ] Υλοποίηση του `DocumentUploadModal`.
- [ ] Δημιουργία της σελίδας επιβεβαίωσης `/documents/[id]/review`.
- [ ] Σύνδεση των components με τα νέα API endpoints.

### **Φάση 4: Ολοκλήρωση & Δοκιμές (2-3 ημέρες)**
- [ ] Υλοποίηση της λογικής στο `confirm` endpoint για τη δημιουργία των `Expense`/`Payment`.
- [ ] Προσθήκη ειδοποιήσεων (WebSockets) για την ενημέρωση του χρήστη όταν ολοκληρωθεί η επεξεργασία.
- [ ] End-to-end testing της πλήρους ροής.
- [ ] Βελτιώσεις στο UI/UX βάσει των δοκιμών.

---

## ⚙️ Τεχνικές Λεπτομέρειες

**Παράδειγμα Celery Task (`backend/document_parser/tasks.py`):**
```python
from celery import shared_task
from .models import DocumentUpload
from .services import GoogleDocumentAIService

@shared_task
def process_document(document_id):
    try:
        doc = DocumentUpload.objects.get(id=document_id)
        doc.status = 'processing'
        doc.save()

        service = GoogleDocumentAIService()
        extracted_data, raw_text = service.parse_document(doc.original_file.path)

        doc.extracted_data = extracted_data
        doc.raw_text = raw_text
        doc.status = 'awaiting_confirmation'
        doc.save()

        # TODO: Send WebSocket notification to user

    except DocumentUpload.DoesNotExist:
        # Handle error
        pass
    except Exception as e:
        doc.status = 'failed'
        doc.error_message = str(e)
        doc.save()
```