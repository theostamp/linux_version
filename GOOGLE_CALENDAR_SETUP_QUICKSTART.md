# 🚀 Google Calendar Integration - Quick Setup Guide

## 📋 Phase 1 Complete: Google Cloud Project Setup ✅

Ολοκληρώθηκε η δημιουργία του technical foundation για Google Calendar integration!

### ✅ **Τι δημιουργήθηκε:**

#### 1. **Backend Infrastructure:**
- `backend/integrations/google_calendar.py` - Core Google Calendar service
- `backend/integrations/management/commands/test_google_calendar.py` - Testing command
- Google Calendar settings στο Django settings
- Database model extensions (Building + Event models)

#### 2. **Configuration Files:**
- Updated `requirements.txt` με Google APIs
- Extended `.env` με Google Calendar variables
- Created `backend/credentials/` directory για secure storage
- Added integrations app στα INSTALLED_APPS

#### 3. **Database Models Extended:**
- **Building model**: `google_calendar_id`, `google_calendar_enabled`, `google_calendar_sync_enabled`
- **Event model**: `google_event_id`, `google_sync_enabled`, `last_google_sync`

---

## 🛠️ Next Steps: Google Cloud Setup (Manual)

### **Step 1: Google Cloud Console**

1. **Πήγαινε στο**: https://console.cloud.google.com/
2. **Δημιούργησε νέο project**: "New Concierge Calendar Integration"
3. **Enable Google Calendar API**: APIs & Services → Library → "Google Calendar API" → Enable

### **Step 2: OAuth 2.0 Credentials**

1. **OAuth Consent Screen**:
   ```
   APIs & Services → OAuth consent screen
   App name: "New Concierge Building Management"
   User support email: (το email σου)
   Scopes: Google Calendar API
   ```

2. **Create OAuth Client**:
   ```
   APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client IDs
   Application type: Web application
   Name: "New Concierge Web Client"
   Authorized redirect URIs:
   - http://demo.localhost:8000/auth/google/callback
   - http://localhost:8000/auth/google/callback
   ```

3. **Download JSON**: Save as `backend/credentials/google-oauth-credentials.json`

### **Step 3: Service Account**

1. **Create Service Account**:
   ```
   APIs & Services → Credentials → Create Credentials → Service Account
   Name: "new-concierge-calendar-service"
   ```

2. **Create Key**: JSON format → Save as `backend/credentials/google-service-account.json`

### **Step 4: Update .env file**

```env
# Update these values in .env:
GOOGLE_CALENDAR_ENABLED=True
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_ADMIN_EMAIL=your-admin@gmail.com
```

---

## 🧪 Testing Setup

### **1. Install Dependencies**
```bash
# Install Google APIs in Docker container
docker exec -it linux_version-backend-1 pip install -r requirements.txt
```

### **2. Run Database Migrations**
```bash
# Create and apply migrations for new fields
docker exec -it linux_version-backend-1 python manage.py makemigrations buildings
docker exec -it linux_version-backend-1 python manage.py makemigrations events  
docker exec -it linux_version-backend-1 python manage.py migrate
```

### **3. Test Connection**
```bash
# Test Google Calendar API connection
docker exec -it linux_version-backend-1 python manage.py test_google_calendar

# Setup calendar for demo building
docker exec -it linux_version-backend-1 python manage.py test_google_calendar --setup
```

---

## 📅 **Expected Results After Setup:**

1. **✅ API Connection Test**: "Google Calendar API connection successful"
2. **📅 Building Calendar Created**: "Created Google Calendar for [Building Name]"
3. **🔗 URLs Generated**:
   - Embed URL για frontend integration
   - Public URL για direct access
4. **📧 Calendar Sharing**: Test sharing με admin email

---

## 🚀 **Ready for Phase 2:**

Μετά την ολοκλήρωση του manual setup, θα είσαι έτοιμος για:

### **Phase 2: Admin Experience Implementation**
- OAuth flow για admin authentication
- Admin panel UI για Google Calendar management  
- Calendar connection status display
- Sync configuration options

### **Phase 3: Auto-sync Implementation** 
- Django signals για αυτόματο sync
- Event creation → Google Calendar
- Real-time συγχρονισμός

---

## 🔧 **Troubleshooting:**

### **Common Issues:**

1. **"Service account file not found"**
   - Βεβαιώσου ότι το JSON file είναι στο `backend/credentials/`
   - Check file permissions

2. **"OAuth credentials invalid"**
   - Επιβεβαίωση redirect URIs στο Google Cloud Console
   - Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET στο .env

3. **"API not enabled"**
   - Google Cloud Console → APIs & Services → Library
   - Search "Google Calendar API" → Enable

---

## 📞 **Next Phase Ready!**

Το foundation είναι έτοιμο! Όταν ολοκληρώσεις τα Google Cloud steps, θα μπορούμε να προχωρήσουμε στο Phase 2 με:

- Admin panel integration
- OAuth authentication flow  
- Calendar management UI
- Event synchronization testing

**Let's go! 🎉**