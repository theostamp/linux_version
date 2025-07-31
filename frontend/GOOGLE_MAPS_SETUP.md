# Google Maps API Setup Guide

## Step 1: Create/Select Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

## Step 2: Enable Required APIs

**CRITICAL: You must enable BOTH APIs for the autocomplete to work:**

### **2.1 Enable Maps JavaScript API**
1. Go to [APIs & Services > Library](https://console.cloud.google.com/apis/library)
2. Search for "Maps JavaScript API"
3. Click on it and press "ENABLE"

### **2.2 Enable Places API (New) - REQUIRED**
1. Go to [APIs & Services > Library](https://console.cloud.google.com/apis/library)
2. Search for "Places API (New)"
3. Click on it and press "ENABLE"
4. **This is essential to avoid the "legacy API" error**

### **2.3 Enable Geocoding API (Optional but recommended)**
1. Search for "Geocoding API"
2. Click on it and press "ENABLE"

## Step 3: Create API Key

1. Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "CREATE CREDENTIALS" > "API key"
3. Copy the generated API key
4. Click on the key name to configure restrictions

## Step 4: Configure API Key Restrictions

### **4.1 Application Restrictions (Choose HTTP referrers)**
1. Select "HTTP referrers (web sites)"
2. Add these referrers:
   ```
   http://localhost:8080/*
   http://localhost:3001/*
   http://demo.localhost:8080/*
   http://tap.localhost:8080/*
   http://tap.localhost:3001/*
   https://yourdomain.com/*
   ```

### **4.2 API Restrictions**
1. Select "Restrict key"
2. Choose:
   - Maps JavaScript API
   - Places API (New)
   - Geocoding API (if enabled)

## Step 5: Add to Environment File

Create/edit `frontend/.env.local`:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_API_KEY_HERE
```

**Important Notes:**
- Replace `YOUR_ACTUAL_API_KEY_HERE` with your actual API key
- The file should be in `frontend/.env.local` (not the root directory)
- Restart your Next.js server after adding the key

## Common Issues & Troubleshooting

### **Issue 1: "Legacy API not enabled" Error**
```
You're calling a legacy API, which is not enabled for your project
```

**Solution:**
1. **Enable "Places API (New)"** in Google Cloud Console
2. Wait 5-10 minutes for the API to become active
3. Restart your Next.js server

### **Issue 2: "Loading=async" Performance Warning**
**Solution:** Already fixed in the latest code with `&loading=async` parameter

### **Issue 3: API Key Restrictions**
- Use **HTTP Referrer restrictions** for web applications
- Do NOT use IP Address restrictions for localhost development
- Include both `http://localhost:8080/*` and `http://localhost:3001/*`

### **Issue 4: Quota Exceeded**
- Check your [Google Cloud Console Quotas](https://console.cloud.google.com/iam-admin/quotas)
- The free tier includes substantial quota for development

### **Issue 5: API Key Not Working**
1. Check the `.env.local` file exists in `frontend/` directory
2. Restart Next.js server: `npm run dev`
3. Clear browser cache: `Ctrl+Shift+R`
4. Check browser console for detailed error messages

## Testing the Setup

1. Navigate to `http://localhost:8080/buildings/new`
2. Try typing in the address field
3. You should see Google Maps autocomplete suggestions
4. Check browser console for any errors

## API Usage Costs

- **Development**: Free tier is usually sufficient
- **Production**: Monitor usage in Google Cloud Console
- **Autocomplete**: ~$2.83 per 1000 requests
- **Geocoding**: ~$5.00 per 1000 requests

For current pricing, visit [Google Maps Platform Pricing](https://developers.google.com/maps/billing/gmp-billing) 