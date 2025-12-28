# 🚀 Manual Deploy Instructions - Αν το Auto-Deploy δεν λειτουργεί

## 🔴 Πρόβλημα: Reconnect δεν αντιδρά

Αν κάνατε reconnect το GitHub repository αλλά δεν βλέπετε deployments, δοκιμάστε τα εξής:

---

## ✅ Λύση 1: Manual Redeploy από Vercel Dashboard

Αυτό θα επιβεβαιώσει ότι το build λειτουργεί:

### Βήματα:
1. Vercel Dashboard → **Deployments**
2. Βρείτε το latest deployment
3. Κάντε κλικ στα τρία κουκκίδα (•••)
4. Επιλέξτε **"Redeploy"**
5. Επιλέξτε **"Use existing Build Cache"** (γρηγορότερο)

**Αν αυτό λειτουργεί**: Το πρόβλημα είναι στο webhook, όχι στο build.

---

## ✅ Λύση 2: Deploy Hook (Temporary Solution)

Μέχρι να λυθεί το webhook, χρησιμοποιήστε Deploy Hook:

### Setup:
1. Vercel Dashboard → Settings → Git → **Deploy Hooks**
2. Κάντε κλικ **"Create Hook"**
   - **Name**: `GitHub Push Hook`
   - **Branch**: `main`
3. Copy το URL (π.χ. `https://api.vercel.com/v1/integrations/deploy/...`)

### Usage:
Μετά από κάθε push:
```bash
# Trigger deploy manually
curl -X POST https://api.vercel.com/v1/integrations/deploy/YOUR_HOOK_URL
```

Ή προσθέστε στο `.git/hooks/post-push`:
```bash
#!/bin/bash
curl -X POST https://api.vercel.com/v1/integrations/deploy/YOUR_HOOK_URL
```

---

## ✅ Λύση 3: Vercel CLI Deploy

Deploy απευθείας από το local machine:

### Setup:
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
cd public-app
vercel link
# Select: theostamp
# Project: linux-version
```

### Deploy:
```bash
# Deploy to production
cd public-app
vercel --prod
```

---

## ✅ Λύση 4: Check GitHub Webhook Manually

Ελέγξτε αν το webhook λειτουργεί:

### Βήματα:
1. **GitHub** → `theostamp/linux_version` → **Settings** → **Webhooks**
2. Βρείτε το Vercel webhook
3. Κάντε κλικ πάνω του
4. Scroll down → **"Recent Deliveries"**
5. Κάντε κλικ στο latest delivery
6. Ελέγξτε:
   - **Request**: Θα πρέπει να δείχνει τα commit details
   - **Response**: Θα πρέπει να είναι **200 OK**
   - Αν είναι **404** ή **500**, υπάρχει πρόβλημα

### Αν δεν υπάρχουν Deliveries:
Το webhook δεν trigger-άρεται. Δοκιμάστε:
- **Test Delivery**: Κάντε κλικ "Redeliver" για να δοκιμάσετε το webhook
- Αν αποτύχει, το webhook είναι λάθος configured

---

## ✅ Λύση 5: Reinstall Vercel GitHub App

Αν τίποτα άλλο δεν λειτουργεί:

### Βήματα:
1. **GitHub** → **Settings** (personal, όχι repository)
2. **Applications** → **Installed GitHub Apps**
3. Βρείτε **"Vercel"**
4. Κάντε κλικ **"Configure"**
5. **Repository access**:
   - Επιλέξτε **"Only select repositories"**
   - Επιλέξτε `theostamp/linux_version`
   - **Save**
6. Scroll down → **Permissions**:
   - Βεβαιωθείτε ότι έχει:
     - ✅ Repository contents: Read & write
     - ✅ Repository webhooks: Read & write
     - ✅ Commit statuses: Read & write

---

## 🔍 Διαγνωστικό Test

Για να δούμε που είναι το πρόβλημα:

### Test 1: Local Build
```bash
cd public-app
npm install
npm run build
```
Αν αυτό λειτουργεί → το πρόβλημα δεν είναι στο build.

### Test 2: Vercel CLI Deploy
```bash
cd public-app
vercel --prod
```
Αν αυτό λειτουργεί → το πρόβλημα είναι μόνο στο webhook.

### Test 3: GitHub Webhook Test
GitHub → Webhooks → Vercel webhook → "Test delivery"
Αν αυτό αποτυγχάνει → το webhook είναι misconfigured.

---

## 📋 Quick Workaround

Μέχρι να λυθεί το auto-deploy, χρησιμοποιήστε:

### Option A: Vercel CLI
```bash
cd public-app && vercel --prod
```

### Option B: Deploy Hook
```bash
curl -X POST https://api.vercel.com/v1/integrations/deploy/YOUR_HOOK_URL
```

### Option C: Manual Redeploy
Vercel Dashboard → Deployments → Redeploy

---

## 🆘 Support

Αν τίποτα δεν λειτουργεί:
1. Vercel Support: https://vercel.com/help
2. GitHub Support για webhook issues
3. Ελέγξτε Vercel Discord/Community

---

## 🎯 Expected Resolution

Το πιο πιθανό:
- Το webhook δεν δημιουργήθηκε σωστά
- Χρειάζεται reinstall του Vercel GitHub App
- Temporary solution: Vercel CLI ή Deploy Hook



