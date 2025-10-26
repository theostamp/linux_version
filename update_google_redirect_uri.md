# Update Google OAuth Redirect URI

## Problem
The Google OAuth is failing with `redirect_uri_mismatch` error because:

- **Frontend sends**: `https://linux-version.vercel.app/auth/callback`
- **Backend expects**: `http://demo.localhost:8000/auth/google/callback`

## Solution
Update the Railway environment variable:

1. Go to Railway Dashboard
2. Select your project
3. Go to Variables tab
4. Update `GOOGLE_REDIRECT_URI` to:
   ```
   https://linux-version.vercel.app/auth/callback
   ```

## Alternative: Update via Railway CLI
```bash
railway variables set GOOGLE_REDIRECT_URI=https://linux-version.vercel.app/auth/callback
```

## After Update
1. Restart the Railway service
2. Test Google OAuth again
3. The redirect should work correctly

## Note
Make sure the Google OAuth app in Google Cloud Console also has this redirect URI configured.
