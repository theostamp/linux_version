# 🔧 Google OAuth 2.0 Policy Compliance Fix Guide

## 🚨 **Πρόβλημα:**
```
Η πρόσβαση αποκλείστηκε: Σφάλμα εξουσιοδότησης
You can't sign in to this app because it doesn't comply with Google's OAuth 2.0 policy
Error 400: invalid_request
```

## ✅ **Λύση - Βήμα προς Βήμα:**

### **Βήμα 1: Δημιουργία .env File**

Δημιούργησε ένα `.env` file στο root directory του project:

```bash
# Στο terminal, στο root directory του project:
cp env.example .env
```

Στη συνέχεια, επεξεργάσου το `.env` file και πρόσθεσε:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=18479237023-toafs2t3stm3i6lvcb87aopaqhe7pv4s.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALENDAR_ENABLED=True
GOOGLE_ADMIN_EMAIL=your-email@gmail.com
```

### **Βήμα 2: Google Cloud Console Setup**

#### **2.1 Πήγαινε στο Google Cloud Console:**
- URL: https://console.cloud.google.com/
- Επιλέγεις το project σου (ή δημιουργείς νέο)

#### **2.2 Enable Google Calendar API:**
```
APIs & Services → Library → Search "Google Calendar API" → Enable
```

#### **2.3 Configure OAuth Consent Screen:**
```
APIs & Services → OAuth consent screen
```

**Ρυθμίσεις:**
```
User Type: External
App name: "New Concierge Building Management"
User support email: [το email σου]
Developer contact information: [το email σου]
```

**Στο Scopes section, πρόσθεσε:**
```
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/calendar.events
```

#### **2.4 Update OAuth 2.0 Client:**
```
APIs & Services → Credentials → OAuth 2.0 Client IDs
```

**Authorized redirect URIs - Πρόσθεσε όλες αυτές:**
```
http://demo.localhost:8000/auth/google/callback
http://localhost:8000/auth/google/callback
http://demo.localhost:18000/auth/google/callback
http://localhost:18000/auth/google/callback
http://127.0.0.1:8000/auth/google/callback
http://127.0.0.1:18000/auth/google/callback
```

### **Βήμα 3: Test Users (Development)**

Αν το app είναι σε "Testing" mode, πρέπει να προσθέσεις test users:

```
OAuth consent screen → Test users → Add users
```

Πρόσθεσε το email σου και οποιοδήποτε άλλο email θέλεις να δοκιμάσει το app.

### **Βήμα 4: Restart Services**

```bash
# Restart Docker containers
docker-compose down
docker-compose up -d

# Check logs
docker-compose logs backend
```

### **Βήμα 5: Test Connection**

```bash
# Test Google Calendar API connection
docker exec -it linux_version-backend-1 python manage.py test_google_calendar
```

## 🔍 **Troubleshooting:**

### **Αν ακόμα παίρνεις error:**

1. **Ελέγξε τα redirect URIs:**
   - Πρέπει να ταιριάζουν ακριβώς με αυτά που έχεις στο Google Cloud Console
   - Συμπεριλαμβάνει το port number (8000 ή 18000)

2. **Ελέγξε το OAuth Consent Screen:**
   - Πρέπει να είναι "Published" ή τουλάχιστον να έχεις προσθέσει test users
   - Τα scopes πρέπει να είναι σωστά

3. **Clear browser cache:**
   - Δοκίμασε σε incognito/private mode
   - Clear cookies για το localhost

4. **Ελέγξε τα environment variables:**
   ```bash
   docker exec -it linux_version-backend-1 env | grep GOOGLE
   ```

### **Common Issues:**

- **"redirect_uri_mismatch"**: Τα redirect URIs δεν ταιριάζουν
- **"access_denied"**: Το OAuth consent screen δεν είναι σωστά ρυθμισμένο
- **"invalid_client"**: Λάθος CLIENT_ID ή CLIENT_SECRET

## 🎯 **Expected Result:**

Μετά από αυτές τις αλλαγές, θα πρέπει να μπορείς να συνδεθείς στο Google Calendar χωρίς errors!

## 📞 **Next Steps:**

Αν το πρόβλημα συνεχίζεται:
1. Ελέγξε τα Google Cloud Console logs
2. Ελέγξε τα Docker logs
3. Δοκίμασε με διαφορετικό browser
4. Ελέγξε αν το Google Calendar API είναι enabled

---

**💡 Tip:** Αν είσαι σε development mode, μπορείς να χρησιμοποιήσεις "Testing" mode στο OAuth consent screen και να προσθέσεις μόνο test users.
