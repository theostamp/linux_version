# 🔧 Vercel Settings Synchronization Guide

**Ημερομηνία:** 11 Νοεμβρίου 2025  
**Σκοπός:** Συγχρονισμός Project Settings με Production Overrides

---

## 📋 Τρέχουσα Κατάσταση

### Production Overrides (από `public-app/vercel.json`)
✅ **Install Command:** `npm ci`  
✅ **Build Command:** `npm run build`  
✅ **Output Directory:** `.next`

### Project Settings (Default Next.js Preset)
⚠️ **Install Command:** `npm install` (ή yarn/pnpm/bun)  
⚠️ **Build Command:** `npm run build` ή `next build`  
⚠️ **Output Directory:** `next` (default)

---

## 🎯 Στόχος

Να συγχρονίσουμε τα **Project Settings** στο Vercel Dashboard ώστε να ταιριάζουν με τα **Production Overrides** που ορίζονται στο `vercel.json`.

---

## 📝 Βήματα Συγχρονισμού

### Βήμα 1: Πρόσβαση στο Vercel Dashboard

1. **Ανοίγεις το Vercel Dashboard**
   - Πηγαίνεις στο: https://vercel.com/dashboard
   - Επιλέγεις το project σου

2. **Πλοήγηση στις Settings**
   - Κάνεις κλικ στο project
   - Μεταβαίνεις στο tab **Settings**
   - Στο sidebar, κάνεις κλικ στο **General**

### Βήμα 2: Build & Development Settings

1. **Εύρεση της ενότητας "Build & Development Settings"**
   - Σκρολάρεις προς τα κάτω μέχρι να βρεις την ενότητα
   - Θα δεις τα τρέχοντα settings

2. **Επεξεργασία των Settings**

   **Install Command:**
   ```
   npm ci
   ```
   - Αλλάζεις από `npm install` (ή default) σε `npm ci`
   - Το `npm ci` είναι καλύτερο για production (clean install)

   **Build Command:**
   ```
   npm run build
   ```
   - Επιβεβαιώνεις ότι είναι `npm run build`
   - Αν είναι `next build`, το αλλάζεις σε `npm run build`

   **Output Directory:**
   ```
   .next
   ```
   - Αλλάζεις από `next` (default) σε `.next`
   - Αυτό είναι το σωστό output directory για Next.js

3. **Αποθήκευση**
   - Κάνεις κλικ στο **Save** ή **Update**
   - Τα settings θα ενημερωθούν

### Βήμα 3: Επαλήθευση

1. **Έλεγχος ότι τα Settings ταιριάζουν**
   - Επιστρέφεις στο **Settings → General**
   - Ελέγχεις ότι:
     - ✅ Install Command: `npm ci`
     - ✅ Build Command: `npm run build`
     - ✅ Output Directory: `.next`

2. **Trigger νέου Deployment**
   - Μεταβαίνεις στο tab **Deployments**
   - Κάνεις κλικ στο **Redeploy** στο latest deployment
   - Ή push ένα νέο commit στο `main` branch

3. **Έλεγχος Build Logs**
   - Μετά το deployment, ελέγχεις τα build logs
   - Επιβεβαιώνεις ότι χρησιμοποιούνται τα σωστά commands:
     ```
     Installing dependencies...
     Running "npm ci"
     
     Building application...
     Running "npm run build"
     ```

---

## ✅ Αναμενόμενο Αποτέλεσμα

Μετά τον συγχρονισμό:

- ✅ **Project Settings** = **Production Overrides**
- ✅ Δεν υπάρχει σύγχυση μεταξύ των δύο
- ✅ Όλα τα deployments χρησιμοποιούν τις ίδιες ρυθμίσεις
- ✅ Το Dashboard δείχνει τις σωστές ρυθμίσεις

---

## 🔍 Επιπλέον Ελέγχοι

### Framework Preset
- Επιβεβαιώνεις ότι είναι **Next.js**
- Αν δεν είναι, το αλλάζεις σε **Next.js**

### Root Directory
- Επιβεβαιώνεις ότι είναι **`public-app`**
- Αν δεν είναι, το αλλάζεις σε **`public-app`**

### Production Branch
- Επιβεβαιώνεις ότι είναι **`main`**
- Αν χρειάζεται, το αλλάζεις σε **`main`**

---

## 📸 Screenshot Locations

Στο Vercel Dashboard, τα settings βρίσκονται εδώ:

```
Project → Settings → General → Build & Development Settings
```

---

## 🐛 Troubleshooting

### Αν τα Settings δεν αποθηκεύονται:
1. Ελέγχεις ότι έχεις permissions (Owner/Member)
2. Προσπαθείς refresh της σελίδας
3. Κάνεις logout/login στο Vercel

### Αν το Build αποτυγχάνει μετά την αλλαγή:
1. Ελέγχεις τα build logs για το συγκεκριμένο error
2. Επιβεβαιώνεις ότι το `package.json` έχει το script `build`
3. Ελέγχεις ότι το `npm ci` μπορεί να τρέξει (υπάρχει `package-lock.json`)

### Αν τα Production Overrides εξακολουθούν να εμφανίζονται:
- Αυτό είναι φυσιολογικό! Τα Production Overrides υπερισχύουν πάντα
- Αλλά τώρα τα Project Settings θα ταιριάζουν, οπότε δεν θα υπάρχει σύγχυση

---

## 📚 Σχετικά Αρχεία

- **`public-app/vercel.json`** - Production Overrides configuration
- **`public-app/package.json`** - Build scripts definition
- **`VERCEL_RAILWAY_SETUP_GUIDE.md`** - General Vercel setup guide

---

**Last Updated:** 11 Νοεμβρίου 2025  
**Status:** ✅ Ready to sync



