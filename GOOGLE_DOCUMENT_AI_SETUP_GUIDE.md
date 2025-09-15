# 🤖 Google Document AI Setup Guide

## Βήμα 1: Δημιουργία Document AI Processor

### 1.1 Πρόσβαση στο Google Cloud Console
1. Πηγαίνετε στο [Google Cloud Console](https://console.cloud.google.com)
2. Επιλέξτε το project: `new-concierge-document-ai`
3. Πηγαίνετε στο **Document AI** από το μενού

### 1.2 Δημιουργία Processor
1. Κάντε κλικ στο **"Create Processor"**
2. Επιλέξτε **"Invoice Parser"** (για παραστατικά)
3. Συμπληρώστε:
   - **Processor name**: `invoice-parser`
   - **Region**: `us-central1` (ή `europe-west1` αν θέλετε EU)
4. Κάντε κλικ **"Create"**

### 1.3 Αντιγραφή Processor ID
1. Αφού δημιουργηθεί, κάντε κλικ στον processor
2. Αντιγράψτε το **Processor ID** (μοιάζει με: `a1b2c3d4e5f6g7h8`)
3. Αυτό το ID θα το προσθέσουμε στο `.env` αρχείο

## Βήμα 2: Ενημέρωση Environment Variables

Αφού πάρετε το Processor ID, προσθέστε το στο `.env`:

```bash
GOOGLE_DOCUMENT_AI_PROCESSOR_ID=your-actual-processor-id-here
```

## Βήμα 3: Έλεγχος Service Account Permissions

Βεβαιωθείτε ότι το service account έχει τα απαραίτητα permissions:
- **Document AI API User**
- **Document AI Editor** (αν χρειάζεται)

## Βήμα 4: Δοκιμή

Μετά την ενημέρωση του `.env`, κάντε restart το backend:
```bash
docker-compose restart backend
```

---

**Σημείωση:** Αυτός ο οδηγός είναι για development. Στο production, χρησιμοποιήστε Secret Manager για τα credentials.
