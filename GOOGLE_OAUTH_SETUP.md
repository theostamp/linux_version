# Google OAuth Setup - Fix redirect_uri_mismatch

## Problem
Google OAuth is failing with `redirect_uri_mismatch` error because the redirect URI is not configured in the Google Cloud Console.

## Solution

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Select your project (or the project with Client ID: `590666847148-a2e037ah9q9f1vogsl6b34mk944bug5g.apps.googleusercontent.com`)

### Step 2: Configure OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**
2. Make sure the app is either:
   - **In Production** (recommended)
   - **In Testing** with your email added as a test user

### Step 3: Add Authorized Redirect URIs
1. Go to **APIs & Services** → **Credentials**
2. Find your OAuth 2.0 Client ID: `590666847148-a2e037ah9q9f1vogsl6b34mk944bug5g.apps.googleusercontent.com`
3. Click **Edit**
4. Under **Authorized redirect URIs**, add:
   ```
   https://linux-version.vercel.app/auth/google/callback
   ```
5. Also add for local development:
   ```
   http://localhost:3000/auth/google/callback
   http://localhost:3001/auth/google/callback
   ```
6. Click **Save**

### Step 4: Wait for Changes to Propagate
- Google OAuth changes can take 5-10 minutes to propagate
- After saving, wait a few minutes before testing

### Step 5: Test Google OAuth
1. Go to: https://linux-version.vercel.app/login
2. Click "Σύνδεση μέσω Google"
3. Should redirect to Google OAuth without errors
4. After authorization, should redirect back to `/auth/google/callback`
5. Should then redirect to `/plans` page

## Current Configuration

**Frontend sends:**
```
https://linux-version.vercel.app/auth/google/callback
```

**Railway environment has:**
```
GOOGLE_REDIRECT_URI="https://linux-version.vercel.app/auth/google/callback"
```

**Google Cloud Console needs:**
```
Authorized redirect URIs:
- https://linux-version.vercel.app/auth/google/callback
- http://localhost:3000/auth/google/callback (for local dev)
- http://localhost:3001/auth/google/callback (for local dev)
```

## Verification

After adding the redirect URI, you can verify by:
1. Checking the OAuth 2.0 Client ID settings in Google Cloud Console
2. Testing the OAuth flow
3. Checking Railway logs for successful OAuth redirects

## Notes

- The redirect URI must match **exactly** (including protocol, domain, and path)
- Google OAuth changes can take 5-10 minutes to propagate
- Make sure the OAuth consent screen is configured correctly
- If using test mode, add your email as a test user

