# Railway Volume Setup για Media Files

## Επισκόπηση

Για να αποθηκεύονται τα media files (logos, receipts, κλπ) μόνιμα στο Railway, χρειάζεται να δημιουργήσουμε ένα **Volume** που θα mount-άρει στο Django service.

## Βήματα Ρύθμισης

### 1. Δημιουργία Volume στο Railway Dashboard

1. Πηγαίνετε στο [Railway Dashboard](https://railway.app)
2. Επιλέξτε το project σας
3. Κάντε κλικ στο **"New"** → **"Volume"**
4. Ονομάστε το volume: `media-storage` (ή οποιοδήποτε όνομα θέλετε)
5. Επιλέξτε το size (π.χ. 10GB για αρχή)
6. Κάντε κλικ **"Create"**

### 2. Mount του Volume στο Django Service

1. Στο Railway Dashboard, επιλέξτε το **Django service** (backend)
2. Πηγαίνετε στο tab **"Settings"**
3. Κάντε scroll στο **"Volumes"** section
4. Κάντε κλικ **"Add Volume"**
5. Επιλέξτε το volume που δημιουργήσατε (`media-storage`)
6. Ορίστε το **Mount Path**: `/data` (ή `/vol` αν δημιουργείτε νέο volume)
7. Κάντε κλικ **"Add"**

**Σημείωση:** Στο project σας, το `redis-volume` είναι ήδη mount-αρισμένο στο `/data`, οπότε χρησιμοποιούμε αυτό το path.

### 3. Ρύθμιση Environment Variables

Το Django έχει ρυθμισμένο το `MEDIA_ROOT = '/data/media'` στο `settings_prod.py` (ή `/vol/media` αν χρησιμοποιείτε `/vol` volume).

**Επιβεβαιώστε ότι:**
- Το `MEDIA_ROOT` environment variable ΔΕΝ είναι set (για να χρησιμοποιηθεί το default από `settings_prod.py`)
- Ή set το `MEDIA_ROOT=/data/media` αν θέλετε να το ορίσετε ρητά

### 4. Δημιουργία του Media Directory

Μετά το mount, το volume θα είναι άδειο. Πρέπει να δημιουργήσετε το directory structure:

**Επιλογή Α: Μέσω Railway CLI**
```bash
railway run --service linux_version bash
mkdir -p /data/media/office_logos
mkdir -p /data/media/receipts
# κλπ για άλλα directories
```

**Επιλογή Β: Αυτόματα μέσω Django**
Το Django θα δημιουργήσει τα directories αυτόματα όταν αποθηκεύονται αρχεία, αλλά μπορείτε να το κάνετε και manual:

```python
# Στο Django shell ή startup script
import os
from django.conf import settings

os.makedirs(os.path.join(settings.MEDIA_ROOT, 'office_logos'), exist_ok=True)
os.makedirs(os.path.join(settings.MEDIA_ROOT, 'receipts'), exist_ok=True)
```

### 5. Επαναπροώθηση (Redeploy)

Μετά το mount του volume:
1. Κάντε **Redeploy** του Django service
2. Ελέγξτε τα logs ότι το service ξεκίνησε σωστά
3. Ελέγξτε ότι το `/vol/media` directory υπάρχει

## Επαλήθευση

### Ελέγξτε ότι το Volume είναι Mounted

```bash
# Μέσω Railway CLI
railway run --service linux_version bash
ls -la /data/
# Θα πρέπει να βλέπετε: media/
```

### Ελέγξτε τα Logs

Μετά το upload ενός logo, ελέγξτε τα logs:
```
[OfficeDetailsSerializer] Logo saved successfully. New logo URL: /media/office_logos/logo_xxx.jpg
```

### Test Upload

1. Ανεβάστε ένα logo μέσω του OfficeSettingsModal
2. Ελέγξτε ότι αποθηκεύεται:
   ```bash
   railway run --service linux_version bash
   ls -la /data/media/office_logos/
   ```

## Troubleshooting

### Το Volume δεν φαίνεται

- Ελέγξτε ότι το volume είναι mount-αρισμένο στο service
- Ελέγξτε ότι το mount path είναι `/vol`
- Κάντε redeploy του service

### Permission Errors

Αν βλέπετε permission errors:
```bash
railway run --service linux_version bash
chmod -R 755 /data/media
chown -R $(whoami) /data/media
```

### Files Δεν Αποθηκεύονται

- Ελέγξτε ότι το `MEDIA_ROOT` είναι `/data/media` στο production (ή `/vol/media` αν χρησιμοποιείτε `/vol` volume)
- Ελέγξτε τα Django logs για errors
- Ελέγξτε ότι το volume έχει αρκετό space

## Σημαντικές Σημειώσεις

1. **Backup**: Τα volumes στο Railway είναι persistent, αλλά συνιστάται να έχετε backup strategy
2. **Size**: Μπορείτε να αυξήσετε το size του volume ανά πάσα στιγμή από το Railway dashboard
3. **Multiple Services**: Αν έχετε multiple Django services, μπορείτε να mount-άρετε το ίδιο volume σε όλα
4. **Cost**: Τα volumes στο Railway χρεώνονται ανά GB storage

## Alternative: Cloud Storage (S3, Cloudinary, κλπ)

Αν θέλετε να χρησιμοποιήσετε cloud storage αντί για Railway volumes:

1. **AWS S3**: Χρησιμοποιήστε `django-storages` με S3 backend
2. **Cloudinary**: Χρησιμοποιήστε `django-cloudinary-storage`
3. **Railway Blob Storage**: (αν διαθέσιμο)

Αυτό είναι καλύτερο για scalability αλλά απαιτεί επιπλέον configuration.
