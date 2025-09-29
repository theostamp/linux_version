# 🔧 Οδηγίες Διόρθωσης Google Document AI Authentication

## 🔴 Πρόβλημα
Το service account `id-document-parser-service@new-concierge-document-ai.iam.gserviceaccount.com` επιστρέφει error `ACCOUNT_STATE_INVALID (401)`.

## ✅ Βήματα Διόρθωσης

### 1. Είσοδος στο Google Cloud Console
```
https://console.cloud.google.com
```
Επιλέξτε το project: `new-concierge-document-ai`

### 2. Έλεγχος Document AI API
1. Πηγαίνετε στο **APIs & Services** → **Enabled APIs**
2. Ελέγξτε αν το **Document AI API** είναι στη λίστα
3. Αν ΔΕΝ είναι:
   - Κλικ **Enable APIs and Services**
   - Αναζητήστε "Document AI API"
   - Κλικ **Enable**

### 3. Έλεγχος Service Account
1. Πηγαίνετε στο **IAM & Admin** → **Service Accounts**
2. Βρείτε το `id-document-parser-service@new-concierge-document-ai.iam.gserviceaccount.com`
3. Ελέγξτε την κατάσταση:
   - Πρέπει να είναι **Enabled** (όχι disabled)
   - Αν είναι disabled, κλικ στα 3 dots → **Enable**

### 4. 🔴 ΑΠΑΙΤΕΙΤΑΙ: Δημιουργία Νέου Key
**Το υπάρχον key είναι invalid - ΠΡΕΠΕΙ να δημιουργήσετε νέο!**

1. Πηγαίνετε στο: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Project: `new-concierge-document-ai`
3. Κλικ στο `id-document-parser-service@new-concierge-document-ai.iam.gserviceaccount.com`
4. Πηγαίνετε στην καρτέλα **Keys**
5. **Add Key** → **Create new key**
6. Επιλέξτε **JSON**
7. Κατεβάστε το αρχείο
8. Αντικαταστήστε το υπάρχον:
```bash
# Στο local machine σας
cp ~/Downloads/<downloaded-key-file>.json /home/theo/projects/linux_version/backend/credentials/google-document-ai-credentials.json
```

### 5. Έλεγχος Permissions
1. Στο **IAM & Admin** → **IAM**
2. Βρείτε το service account
3. Πρέπει να έχει τουλάχιστον:
   - **Document AI API User** role
   - Ή **Document AI Editor** role

Αν δεν έχει:
1. Κλικ **Grant Access**
2. Προσθέστε το email του service account
3. Επιλέξτε role: **Document AI API User**
4. Save

### 6. Έλεγχος Billing
1. **Billing** → Ελέγξτε ότι το project έχει active billing account
2. Αν όχι, συνδέστε ένα billing account

### 7. Έλεγχος Processor
1. Πηγαίνετε στο **Document AI** console
2. Ελέγξτε ότι υπάρχει ο processor με ID: `b650afb1ed612d93`
3. Αν όχι, δημιουργήστε νέο:
   - **Create Processor**
   - Επιλέξτε **Document OCR** ή **Form Parser**
   - Region: **EU**
   - Αντιγράψτε το νέο Processor ID

### 8. Update Environment Variables (αν άλλαξε το Processor ID)
```bash
# Στο .env αρχείο
GOOGLE_DOCUMENT_AI_PROCESSOR_ID=<new-processor-id>
DOCUMENT_AI_PROCESSOR_ID=<new-processor-id>
```

## 🧪 Test μετά τις διορθώσεις

```bash
# Restart containers
docker-compose restart celery backend

# Test authentication
docker exec linux_version-backend-1 python /app/test_google_auth.py

# Test document processing
docker exec linux_version-backend-1 python /app/test_pdf_upload.py
```

## 📝 Σημειώσεις
- Μπορεί να χρειαστούν 1-2 λεπτά για να ενεργοποιηθούν οι αλλαγές
- Αν το πρόβλημα επιμένει, δοκιμάστε να δημιουργήσετε εντελώς νέο service account