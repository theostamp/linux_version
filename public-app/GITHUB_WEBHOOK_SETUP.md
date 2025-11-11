# 🔗 GitHub Webhook Setup για Vercel Auto-Deploy

## 🔴 **Πρόβλημα: Δεν υπάρχει GitHub Webhook**

Χωρίς webhook, το Vercel δεν μπορεί να ανιχνεύσει τα νέα commits και να trigger-άρει deployments.

---

## ✅ **Λύση 1: Reconnect το GitHub Repository στο Vercel (Προτεινόμενη)**

Αυτή η μέθοδος θα δημιουργήσει αυτόματα το webhook:

### Βήματα:

1. **Vercel Dashboard → Settings → Git**
   - Κάντε κλικ στο **"Disconnect"** button
   - Επιβεβαιώστε το disconnect

2. **Connect ξανά**:
   - Κάντε κλικ **"Connect Git Repository"**
   - Επιλέξτε **"GitHub"**
   - Επιλέξτε το repository: `theostamp/linux_version`
   - Κάντε κλικ **"Connect"**

3. **Επιβεβαιώστε τα Permissions**:
   - Το Vercel θα ζητήσει permissions για:
     - Repository access
     - Webhook creation
   - Κάντε κλικ **"Authorize"** ή **"Install"**

4. **Ελέγξτε το Webhook**:
   - GitHub → `theostamp/linux_version` → Settings → Webhooks
   - Θα πρέπει να εμφανιστεί ένα webhook με URL: `https://api.vercel.com/v1/integrations/github/...`
   - Status: **Active** (πράσινο)

---

## ✅ **Λύση 2: Manual Webhook Creation (Εναλλακτική)**

Αν η Λύση 1 δεν λειτουργεί, μπορείτε να δημιουργήσετε το webhook χειροκίνητα:

### Βήματα:

1. **Πηγαίνετε στο GitHub Repository**:
   - https://github.com/theostamp/linux_version
   - Settings → Webhooks → Add webhook

2. **Webhook Settings**:
   - **Payload URL**: `https://api.vercel.com/v1/integrations/github`
   - **Content type**: `application/json`
   - **Secret**: (αφήστε κενό ή χρησιμοποιήστε Vercel secret αν έχετε)
   - **Events**: Επιλέξτε:
     - ✅ Push
     - ✅ Pull request
   - **Active**: ✅ Enabled

3. **Save**:
   - Κάντε κλικ **"Add webhook"**

---

## ✅ **Λύση 3: Vercel CLI (Εναλλακτική)**

Μπορείτε να reconnect μέσω CLI:

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
cd public-app
vercel link

# Follow prompts:
# - Select existing project: linux-version
# - Link to existing project? Yes
```

---

## 🧪 **Test μετά το Setup**

Μετά το webhook setup:

1. **Κάντε ένα test commit**:
   ```bash
   echo "# Webhook test" >> public-app/README.md
   git add public-app/README.md
   git commit -m "test: Webhook test"
   git push origin main
   ```

2. **Ελέγξτε το GitHub Webhook**:
   - GitHub → Settings → Webhooks
   - Κάντε κλικ στο Vercel webhook
   - Ελέγξτε τα **"Recent Deliveries"**
   - Θα πρέπει να βλέπετε **200 OK** responses

3. **Ελέγξτε το Vercel Dashboard**:
   - Deployments → Νέο deployment θα πρέπει να εμφανιστεί σε 10-30 δευτερόλεπτα

---

## 🔍 **Troubleshooting**

### Αν το Webhook δεν λειτουργεί:

1. **Ελέγξτε τα GitHub Permissions**:
   - GitHub → Settings → Applications → Authorized OAuth Apps
   - Βρείτε το "Vercel"
   - Ελέγξτε ότι έχει permissions για:
     - Repository access
     - Webhook creation

2. **Ελέγξτε τα Webhook Deliveries**:
   - GitHub → Settings → Webhooks → Vercel webhook
   - Κάντε κλικ **"Recent Deliveries"**
   - Αν βλέπετε errors, κάντε κλικ για να δείτε τα details

3. **Reinstall Vercel GitHub App**:
   - GitHub → Settings → Applications → Installed GitHub Apps
   - Βρείτε το "Vercel"
   - Κάντε κλικ **"Configure"**
   - Επιλέξτε **"Only select repositories"**
   - Επιλέξτε `theostamp/linux_version`
   - Save

---

## 📋 **Checklist**

- [ ] GitHub repository disconnected από Vercel
- [ ] GitHub repository reconnected στο Vercel
- [ ] Vercel permissions granted
- [ ] GitHub webhook created (αυτόματα ή manual)
- [ ] Webhook status: Active
- [ ] Test commit trigger-άρει deployment

---

## 🎯 **Expected Result**

Μετά το setup:
- ✅ Κάθε push στο `main` → GitHub webhook → Vercel deployment
- ✅ Deployment status στο GitHub commit
- ✅ Auto-deploy λειτουργεί!

