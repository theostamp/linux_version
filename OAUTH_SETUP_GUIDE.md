# 🔐 OAuth Authentication Setup Guide

## 📋 Overview

Το σύστημα τώρα υποστηρίζει OAuth authentication με Google και Microsoft για εύκολη εγγραφή και σύνδεση χρηστών.

## 🚀 Features

- **Google OAuth**: Σύνδεση με Google account
- **Microsoft OAuth**: Σύνδεση με Microsoft/Office 365 account
- **Automatic User Creation**: Αυτόματη δημιουργία χρηστών από OAuth
- **JWT Integration**: Πλήρης ενσωμάτωση με το υπάρχον JWT authentication system

## 🛠️ Setup Instructions

### 1. Google OAuth Setup

#### 1.1 Google Cloud Console
1. Πήγαινε στο [Google Cloud Console](https://console.cloud.google.com/)
2. Δημιούργησε νέο project ή επιλέγεις υπάρχον
3. Enable Google+ API:
   ```
   APIs & Services → Library → Search "Google+ API" → Enable
   ```

#### 1.2 OAuth Consent Screen
1. Πήγαινε στο `APIs & Services → OAuth consent screen`
2. Ρυθμίσεις:
   ```
   User Type: External
   App name: "Digital Concierge"
   User support email: [το email σου]
   Developer contact information: [το email σου]
   ```
3. Στο Scopes section, πρόσθεσε:
   ```
   https://www.googleapis.com/auth/userinfo.email
   https://www.googleapis.com/auth/userinfo.profile
   openid
   ```

#### 1.3 OAuth 2.0 Credentials
1. Πήγαινε στο `APIs & Services → Credentials`
2. Κάνε κλικ `Create Credentials → OAuth 2.0 Client IDs`
3. Application type: `Web application`
4. Name: `Digital Concierge Web Client`
5. Authorized redirect URIs:
   ```
   http://localhost:18000/api/auth/callback/
   http://demo.localhost:18000/api/auth/callback/
   ```

### 2. Microsoft OAuth Setup

#### 2.1 Azure Portal
1. Πήγαινε στο [Azure Portal](https://portal.azure.com/)
2. Πήγαινε στο `Azure Active Directory → App registrations`
3. Κάνε κλικ `New registration`

#### 2.2 App Registration
1. Name: `Digital Concierge`
2. Supported account types: `Accounts in any organizational directory and personal Microsoft accounts`
3. Redirect URI: `Web` → `http://localhost:18000/api/auth/callback/`

#### 2.3 API Permissions
1. Πήγαινε στο `API permissions`
2. Κάνε κλικ `Add a permission`
3. Επιλέγεις `Microsoft Graph`
4. Επιλέγεις `Delegated permissions`
5. Προσθέτεις:
   ```
   openid
   email
   profile
   ```

#### 2.4 Client Secret
1. Πήγαινε στο `Certificates & secrets`
2. Κάνε κλικ `New client secret`
3. Description: `Digital Concierge Secret`
4. Expires: `24 months`
5. Κάνε κλικ `Add` και **αποθήκευσε το secret value**

### 3. Environment Configuration

#### 3.1 Update .env File
Πρόσθεσε στο `.env` file:

```env
# OAuth Authentication
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
MICROSOFT_CLIENT_ID=your-microsoft-client-id-here
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret-here
```

#### 3.2 Get Credentials
- **Google**: Από Google Cloud Console → Credentials → OAuth 2.0 Client IDs
- **Microsoft**: Από Azure Portal → App registrations → [Your App] → Overview (Client ID) και Certificates & secrets (Client Secret)

### 4. Database Migration

Τα OAuth fields έχουν ήδη προστεθεί στο User model. Αν χρειάζεται:

```bash
docker-compose exec backend python manage.py migrate
```

## 🎯 Usage

### Frontend Integration

Τα OAuth buttons εμφανίζονται αυτόματα στο:
- **Login Form**: Κάτω από το κουμπί "Σύνδεση"
- **Register Form**: Κάτω από το κουμπί "Εγγραφή"

### User Experience

1. **Ο χρήστης κάνει κλικ στο "Google" ή "Microsoft"**
2. **Redirect στο OAuth provider** (Google/Microsoft)
3. **Ο χρήστης επιβεβαιώνει τα permissions**
4. **Redirect πίσω στο σύστημα** με authorization code
5. **Αυτόματη δημιουργία/σύνδεση χρήστη** με JWT tokens

### Backend Endpoints

- `GET /api/auth/google/` - Initiate Google OAuth
- `GET /api/auth/microsoft/` - Initiate Microsoft OAuth  
- `POST /api/auth/callback/` - Handle OAuth callback

## 🔧 Technical Details

### OAuth Flow
1. **Frontend** → Redirect to backend OAuth endpoint
2. **Backend** → Redirect to OAuth provider
3. **OAuth Provider** → User authorization
4. **OAuth Provider** → Redirect back with code
5. **Backend** → Exchange code for user info
6. **Backend** → Create/find user and generate JWT
7. **Frontend** → Store tokens and redirect to dashboard

### Database Changes
- `oauth_provider`: 'google' ή 'microsoft'
- `oauth_provider_id`: User ID από OAuth provider
- `email_verified`: True για OAuth users (αυτόματη επιβεβαίωση)

## 🚨 Security Notes

1. **HTTPS Required**: Στο production, χρησιμοποίησε HTTPS URLs
2. **State Parameter**: Χρησιμοποιείται για CSRF protection
3. **Client Secrets**: Μη τα αποθηκεύεις στο version control
4. **Redirect URIs**: Επιτρέπει μόνο trusted domains

## 🐛 Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**
   - Ελέγξε τα Authorized redirect URIs στο OAuth provider
   - Βεβαιώσου ότι τα URLs ταιριάζουν ακριβώς

2. **"Client ID not found"**
   - Ελέγξε το GOOGLE_CLIENT_ID/MICROSOFT_CLIENT_ID στο .env
   - Βεβαιώσου ότι το OAuth app είναι active

3. **"Insufficient permissions"**
   - Ελέγξε τα API permissions στο OAuth provider
   - Βεβαιώσου ότι τα scopes είναι σωστά

### Debug Mode

Για debugging, ελέγξε τα logs:
```bash
docker-compose logs backend
```

## 📚 Next Steps

1. **Test OAuth Flow**: Δοκίμασε Google και Microsoft OAuth
2. **Production Setup**: Ρύθμισε OAuth για production domains
3. **User Management**: Προσθήκη OAuth users στο admin panel
4. **Analytics**: Προσθήκη tracking για OAuth vs traditional signup

## 🎉 Success!

Αν όλα πάνε καλά, οι χρήστες θα μπορούν να:
- Κάνουν εγγραφή με ένα κλικ μέσω Google/Microsoft
- Συνδέονται γρήγορα χωρίς να θυμούνται κωδικούς
- Έχουν αυτόματη επιβεβαίωση email
- Απολαμβάνουν καλύτερη user experience
