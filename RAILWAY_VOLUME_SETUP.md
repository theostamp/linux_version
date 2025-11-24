# Railway Volume Setup για Media Files

## Πρόβλημα

Τα office logos και άλλα media files που ανεβαίνουν στο Django backend δεν αποθηκεύονται μόνιμα γιατί το Railway χρησιμοποιεί ephemeral storage. Κάθε redeploy ή restart του container διαγράφει τα αρχεία.

## Λύση: Railway Volume

Το Railway παρέχει persistent volumes που μπορούν να mount σε συγκεκριμένα directories.

### Βήματα Ρύθμισης

#### 1. Δημιουργία Volume στο Railway

1. Πήγαινε στο Railway Dashboard
2. Επέλεξε το **linuxversion-production** service
3. Πήγαινε στην καρτέλα **Settings**
4. Scroll down στο **Volumes** section
5. Κάνε κλικ στο **+ New Volume**
6. Ρύθμισε το volume:
   - **Mount Path**: `/vol/media`
   - **Size**: 1 GB (ή όσο χρειάζεσαι)
7. Κάνε κλικ στο **Add**

#### 2. Επαναφορά του Service

Μετά τη δημιουργία του volume, το Railway θα κάνει redeploy του service αυτόματα.

#### 3. Επιβεβαίωση

Μετά το redeploy, δοκίμασε να ανεβάσεις ένα logo από το frontend:

1. Πήγαινε στο **Office Settings**
2. Ανέβασε ένα logo
3. Refresh τη σελίδα
4. Το logo θα πρέπει να εμφανίζεται σωστά

### Εναλλακτική Λύση: Cloud Storage (S3 / CloudFlare R2)

Αν προτιμάς cloud storage αντί για Railway volume, μπορείς να χρησιμοποιήσεις:

- **AWS S3**
- **CloudFlare R2** (συμβατό με S3 API, χωρίς egress fees)
- **DigitalOcean Spaces**

#### Απαιτούμενες Αλλαγές για S3

1. Εγκατάσταση του `django-storages` και `boto3`:
   ```bash
   pip install django-storages boto3
   ```

2. Ενημέρωση του `settings_prod.py`:
   ```python
   # AWS S3 Settings
   USE_S3 = os.getenv('USE_S3', 'False') == 'True'

   if USE_S3:
       AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
       AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
       AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME')
       AWS_S3_REGION_NAME = os.getenv('AWS_S3_REGION_NAME', 'eu-central-1')
       AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
       AWS_S3_OBJECT_PARAMETERS = {
           'CacheControl': 'max-age=86400',
       }

       # Media files (uploads)
       DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
       MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'
   ```

3. Ρύθμιση Environment Variables στο Railway:
   - `USE_S3=True`
   - `AWS_ACCESS_KEY_ID=your-key`
   - `AWS_SECRET_ACCESS_KEY=your-secret`
   - `AWS_STORAGE_BUCKET_NAME=your-bucket-name`
   - `AWS_S3_REGION_NAME=eu-central-1`

## Τρέχουσα Κατάσταση

✅ Το Dockerfile δημιουργεί το `/vol/media` directory
✅ Το entrypoint.sh διασφαλίζει ότι τα directories υπάρχουν
✅ Το media proxy route λειτουργεί σωστά στο Next.js
⏳ **Απαιτείται**: Ρύθμιση Railway Volume για persistent storage

## Επόμενα Βήματα

1. ✅ Commit τις αλλαγές στο Dockerfile και entrypoint.sh
2. 📋 Δημιούργησε Railway Volume όπως περιγράφεται παραπάνω
3. 🚀 Deploy το backend στο Railway
4. ✅ Δοκίμασε το office logo upload
