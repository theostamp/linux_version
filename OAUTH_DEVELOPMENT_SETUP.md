# 🔧 OAuth Development Setup Guide

## 🚨 Google OAuth Development Issue

Το Google Cloud Console δεν δέχεται πάντα τα `localhost` URLs για OAuth redirect URIs. Αυτό είναι ένα γνωστό πρόβλημα.

## 🛠️ Solutions

### Solution 1: Use 127.0.0.1 instead of localhost

1. **Google Cloud Console**:
   - Authorized redirect URIs: `http://127.0.0.1:3000/auth/callback`

2. **Update OAuthButtons component**:
   ```typescript
   const redirectUri = encodeURIComponent(`http://127.0.0.1:3000/auth/callback`)
   ```

### Solution 2: Use ngrok for public URL

#### 2.1 Install ngrok
```bash
# Download from https://ngrok.com/download
# Or install via package manager
npm install -g ngrok
# or
brew install ngrok
```

#### 2.2 Start ngrok
```bash
# Expose your frontend port
ngrok http 3000
```

#### 2.3 Get public URL
ngrok will give you a URL like: `https://abc123.ngrok.io`

#### 2.4 Update OAuth Configuration
1. **Google Cloud Console**:
   - Authorized redirect URIs: `https://abc123.ngrok.io/auth/callback`

2. **Update OAuthButtons component**:
   ```typescript
   const redirectUri = encodeURIComponent(`https://abc123.ngrok.io/auth/callback`)
   ```

### Solution 3: Use development domain

#### 3.1 Add to /etc/hosts
```bash
sudo nano /etc/hosts
# Add line:
127.0.0.1 dev.localhost
```

#### 3.2 Update OAuth Configuration
1. **Google Cloud Console**:
   - Authorized redirect URIs: `http://dev.localhost:3000/auth/callback`

2. **Update OAuthButtons component**:
   ```typescript
   const redirectUri = encodeURIComponent(`http://dev.localhost:3000/auth/callback`)
   ```

## 🔄 Quick Fix for Current Setup

Αν θέλεις να δοκιμάσεις γρήγορα το OAuth:

1. **Χρησιμοποίησε 127.0.0.1**:
   - Google Cloud Console: `http://127.0.0.1:3000/auth/callback`
   - Microsoft Azure: `http://127.0.0.1:3000/auth/callback`

2. **Ή χρησιμοποίησε ngrok**:
   ```bash
   ngrok http 3000
   # Use the https URL it provides
   ```

## 📝 Environment Variables

Μετά την επιλογή της λύσης, ενημέρωσε το `.env`:

```env
# OAuth Authentication
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
```

## 🎯 Testing

1. **Start the application**:
   ```bash
   docker-compose up
   ```

2. **Test OAuth flow**:
   - Πήγαινε στο `/register` ή `/login`
   - Κάνε κλικ στο "Google" ή "Microsoft" button
   - Ελέγξε αν το redirect λειτουργεί

## 🚀 Production Setup

Για production, χρησιμοποίησε:
- Real domain names
- HTTPS URLs
- Proper OAuth app configuration

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Microsoft OAuth Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [ngrok Documentation](https://ngrok.com/docs)
