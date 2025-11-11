# 🚀 Vercel Auto-Deploy Setup Guide

## ⚠️ **Πρόβλημα: Δεν γίνεται Auto-Deploy**

Αν το Vercel δεν κάνει auto-deploy όταν push-άρετε στο GitHub, ακολουθήστε τα παρακάτω βήματα:

---

## ✅ **Βήμα 1: Ελέγξτε το GitHub Connection**

### 1.1 Πηγαίνετε στο Vercel Dashboard
- https://vercel.com/dashboard
- Επιλέξτε το project `linux-version` (ή το όνομα του project σας)

### 1.2 Settings → Git
- Κάντε κλικ στο **"Settings"** tab
- Επιλέξτε **"Git"** από το αριστερό menu
- Ελέγξτε αν υπάρχει **"Connected Git Repository"**

### 1.3 Αν ΔΕΝ υπάρχει connection:
- Κάντε κλικ **"Connect Git Repository"**
- Επιλέξτε **"GitHub"**
- Επιλέξτε το repository: `theostamp/linux_version`
- Κάντε κλικ **"Connect"**

---

## ✅ **Βήμα 2: Ελέγξτε το Production Branch**

### 2.1 Settings → Git → Production Branch
- Βεβαιωθείτε ότι το **"Production Branch"** είναι `main`
- Αν δεν είναι, αλλάξτε το σε `main`
- Κάντε κλικ **"Save"**

---

## ✅ **Βήμα 3: Ελέγξτε το Root Directory**

### 3.1 Settings → General → Root Directory
- Βεβαιωθείτε ότι το **"Root Directory"** είναι `public-app`
- Αν δεν είναι, αλλάξτε το σε `public-app`
- Κάντε κλικ **"Save"**

---

## ✅ **Βήμα 4: Ελέγξτε τα Deploy Hooks**

### 4.1 Settings → Git → Deploy Hooks
- Ελέγξτε αν υπάρχουν **"Deploy Hooks"** configured
- Αν δεν υπάρχουν, δεν χρειάζεται να προσθέσετε - το auto-deploy λειτουργεί με GitHub webhooks

---

## ✅ **Βήμα 5: Ελέγξτε τα GitHub Webhooks**

### 5.1 Πηγαίνετε στο GitHub Repository
- https://github.com/theostamp/linux_version
- Κάντε κλικ στο **"Settings"** tab
- Επιλέξτε **"Webhooks"** από το αριστερό menu

### 5.2 Ελέγξτε αν υπάρχει Vercel Webhook
- Θα πρέπει να υπάρχει ένα webhook με URL: `https://api.vercel.com/v1/integrations/github/...`
- Αν δεν υπάρχει, το Vercel θα το δημιουργήσει αυτόματα όταν κάνετε connect το repository

---

## ✅ **Βήμα 6: Manual Trigger για Testing**

### 6.1 Trigger Manual Deploy
- Πηγαίνετε στο **"Deployments"** tab στο Vercel
- Κάντε κλικ στα τρία κουκκίδα (•••) στο latest deployment
- Επιλέξτε **"Redeploy"**
- Αυτό θα επιβεβαιώσει ότι το build λειτουργεί

---

## ✅ **Βήμα 7: Test Auto-Deploy**

### 7.1 Κάντε ένα μικρό commit
```bash
cd /home/theo/project
echo "# Test" >> public-app/README.md
git add public-app/README.md
git commit -m "test: Trigger Vercel auto-deploy"
git push origin main
```

### 7.2 Ελέγξτε το Vercel Dashboard
- Μέσα σε 10-30 δευτερόλεπτα θα πρέπει να εμφανιστεί νέο deployment
- Αν δεν εμφανιστεί, υπάρχει πρόβλημα με το GitHub connection

---

## 🔧 **Troubleshooting**

### Αν το Auto-Deploy δεν λειτουργεί:

1. **Disconnect και Reconnect το GitHub Repository**:
   - Vercel Dashboard → Settings → Git
   - Κάντε κλικ **"Disconnect"**
   - Κάντε κλικ **"Connect Git Repository"** ξανά
   - Επιλέξτε το repository

2. **Ελέγξτε τα GitHub Permissions**:
   - GitHub → Settings → Applications → Authorized OAuth Apps
   - Βρείτε το "Vercel"
   - Ελέγξτε ότι έχει permissions για repository access

3. **Ελέγξτε τα Vercel Team Permissions**:
   - Αν είστε σε team, βεβαιωθείτε ότι έχετε permissions για deployments

4. **Manual Deploy από CLI**:
   ```bash
   cd public-app
   npx vercel --prod
   ```

---

## 📋 **Checklist**

- [ ] GitHub repository connected στο Vercel
- [ ] Production branch είναι `main`
- [ ] Root Directory είναι `public-app`
- [ ] GitHub webhook υπάρχει και είναι active
- [ ] Test commit trigger-άρει deployment

---

## 🎯 **Expected Behavior**

Μετά το setup:
- ✅ Κάθε push στο `main` branch → Auto-deploy στο Vercel
- ✅ Deployment status εμφανίζεται στο GitHub commit
- ✅ Build logs διαθέσιμα στο Vercel Dashboard
- ✅ Email notifications (αν enabled) για deployment status

---

## 📞 **Support**

Αν το πρόβλημα συνεχίζεται:
1. Ελέγξτε τα Vercel logs για errors
2. Ελέγξτε τα GitHub webhook delivery logs
3. Επικοινωνήστε με το Vercel support

