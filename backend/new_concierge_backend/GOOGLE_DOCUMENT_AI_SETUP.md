# 🚀 Google Document AI - Οδηγός Ρύθμισης

Αυτός ο οδηγός περιγράφει τα βήματα για τη ρύθμιση του Google Document AI API, ώστε το backend να μπορεί να επικοινωνεί με την υπηρεσία της Google για την ανάλυση παραστατικών.

---

## 🛠️ Βήματα Ρύθμισης στο Google Cloud

### **Βήμα 1: Δημιουργία ή Επιλογή Project**

1.  **Πλοήγηση στο Google Cloud Console**:
    -   Πηγαίνετε στη διεύθυνση: [https://console.cloud.google.com/](https://console.cloud.google.com/)

2.  **Δημιουργία Νέου Project**:
    -   Από το μενού επιλογής project (πάνω αριστερά), κάντε κλικ στο **"New Project"**.
    -   Δώστε ένα όνομα στο project, π.χ., `New Concierge Document AI`.
    -   Κάντε κλικ στο **"Create"**.

### **Βήμα 2: Ενεργοποίηση του Document AI API**

1.  **Βεβαιωθείτε ότι είστε στο σωστό project**.
2.  **Πλοήγηση στη Βιβλιοθήκη API**:
    -   Από το μενού πλοήγησης (hamburger menu ☰), επιλέξτε **APIs & Services → Library**.
3.  **Αναζήτηση και Ενεργοποίηση**:
    -   Στη γραμμή αναζήτησης, πληκτρολογήστε **"Cloud Document AI API"**.
    -   Επιλέξτε το από τα αποτελέσματα και κάντε κλικ στο **"Enable"**.

### **Βήμα 3: Δημιουργία Service Account**

Για την επικοινωνία του server μας με την Google, θα χρησιμοποιήσουμε ένα Service Account, που είναι η προτεινόμενη και ασφαλής μέθοδος για server-to-server επικοινωνία.

1.  **Πλοήγηση στα Service Accounts**:
    -   Από το μενού πλοήγησης (☰), επιλέξτε **IAM & Admin → Service Accounts**.
2.  **Δημιουργία Service Account**:
    -   Κάντε κλικ στο **"+ CREATE SERVICE ACCOUNT"**.
    -   **Service account name**: `document-parser-service`
    -   **Service account ID**: Θα δημιουργηθεί αυτόματα.
    -   **Description**: `Service account for the Document Parser AI feature`.
    -   Κάντε κλικ στο **"CREATE AND CONTINUE"**.
3.  **Εκχώρηση Δικαιωμάτων (Roles)**:
    -   Στο πεδίο "Role", αναζητήστε και προσθέστε το ρόλο **"Document AI Editor"**. Αυτό δίνει στο service account τα απαραίτητα δικαιώματα για να επεξεργάζεται έγγραφα.
    -   Κάντε κλικ στο **"CONTINUE"** και μετά στο **"DONE"**.

### **Βήμα 4: Δημιουργία και Λήψη Κλειδιού (JSON Key)**

1.  **Εύρεση του Service Account**:
    -   Στη λίστα των service accounts, βρείτε αυτό που μόλις δημιουργήσατε (`document-parser-service@...`).
2.  **Δημιουργία Κλειδιού**:
    -   Κάντε κλικ στις τρεις τελείες (⋮) στη στήλη "Actions" και επιλέξτε **"Manage keys"**.
    -   Κάντε κλικ στο **"ADD KEY" → "Create new key"**.
    -   Επιλέξτε **JSON** ως τύπο κλειδιού και κάντε κλικ στο **"CREATE"**.
3.  **Αποθήκευση του Αρχείου**:
    -   Ένα αρχείο `.json` θα κατέβει αυτόματα στον υπολογιστή σας.
    -   **Σημαντικό**: Μετακινήστε αυτό το αρχείο σε ασφαλές σημείο μέσα στο project σας. Η προτεινόμενη τοποθεσία είναι: `backend/credentials/google-document-ai-credentials.json`.
    -   **Προσοχή**: Μην κάνετε ποτέ commit αυτό το αρχείο στο Git! Προσθέστε το `backend/credentials/` στο αρχείο `.gitignore` αν δεν υπάρχει ήδη.

### **Βήμα 5: Ρύθμιση Περιβάλλοντος στο Project**

1.  **Ενημέρωση του `.env`**:
    -   Ανοίξτε το αρχείο `.env` στο root του project σας.
    -   Προσθέστε την παρακάτω γραμμή, αντικαθιστώντας το path με το σωστό path *μέσα στο Docker container*:
        ```env
        # .env
        GOOGLE_APPLICATION_CREDENTIALS=/app/backend/credentials/google-document-ai-credentials.json
        ```

2.  **Εγκατάσταση Google Client Library**:
    -   Εκτελέστε την παρακάτω εντολή για να εγκαταστήσετε την απαραίτητη βιβλιοθήκη Python μέσα στο Docker container:
        ```bash
        docker exec -it linux_version-backend-1 pip install google-cloud-documentai
        ```
    -   Προσθέστε το `google-cloud-documentai` στο αρχείο `requirements.txt` για να εγκαθίσταται αυτόματα σε μελλοντικά builds.

---

## ✅ Έλεγχos & Επόμενα Βήματα

Μετά από αυτά τα βήματα, το backend σας είναι έτοιμο να πιστοποιηθεί και να επικοινωνήσει με το Google Document AI.

Το επόμενο λογικό βήμα είναι να δημιουργήσετε την κλάση `GoogleDocumentAIService` στο backend που θα χρησιμοποιεί αυτή τη σύνδεση για να στέλνει τα παραστατικά προς ανάλυση.