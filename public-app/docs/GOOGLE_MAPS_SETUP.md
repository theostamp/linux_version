# Google Maps API Setup Guide

## Overview
This application uses Google Maps API for:
- **Address Autocomplete**: Auto-complete address input fields when creating/editing buildings
- **Street View Images**: Display Street View images for building locations
- **Geocoding**: Convert addresses to coordinates (latitude/longitude)

## Prerequisites
- Google Cloud Platform (GCP) account
- Billing enabled on your GCP project (Google Maps API requires billing)

## Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable billing for your project

## Step 2: Enable Required APIs
Enable the following APIs in your GCP project:
1. **Places API** - For address autocomplete
2. **Maps JavaScript API** - For interactive maps
3. **Street View Static API** - For Street View images

### How to Enable APIs:
1. Go to [APIs & Services > Library](https://console.cloud.google.com/apis/library)
2. Search for each API and click "Enable"

## Step 3: Create API Key
1. Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" > "API Key"
3. Copy your API key

## Step 4: Restrict API Key (Recommended for Production)
For security, restrict your API key:

1. Click on your API key to edit it
2. Under "API restrictions":
   - Select "Restrict key"
   - Choose: **Places API**, **Maps JavaScript API**, **Street View Static API**
3. Under "Application restrictions":
   - For web apps: Select "HTTP referrers (web sites)"
   - Add your domain(s):
     - `localhost:3000/*` (for development)
     - `*.yourdomain.com/*` (for production)
     - `yourdomain.com/*` (for production)

## Step 5: Add API Key to Environment Variables

### Local Development
Create a `.env.local` file in the `public-app` directory:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key-here
```

### Production (Vercel)
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add:
   - **Name**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - **Value**: Your API key
   - **Environment**: Production, Preview, Development (as needed)

## Step 6: Verify Setup
1. Start your development server: `npm run dev`
2. Navigate to `/buildings/new` or `/buildings/[id]/edit`
3. Click on the address input field
4. Start typing an address - you should see autocomplete suggestions
5. Check browser console for any errors

## Troubleshooting

### Address Autocomplete Not Working
- **Check API key**: Ensure `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set correctly
- **Check browser console**: Look for errors related to Google Maps
- **Verify API restrictions**: Make sure Places API is enabled and not restricted
- **Check billing**: Ensure billing is enabled on your GCP project

### Street View Not Showing
- **Verify API**: Ensure Street View Static API is enabled
- **Check coordinates**: Street View requires valid latitude/longitude
- **API key restrictions**: Make sure Street View Static API is included in restrictions

### Console Errors
- `"Google Maps API key is not set"`: Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to your `.env.local`
- `"This API key is not authorized"`: Check API restrictions in GCP Console
- `"Billing not enabled"`: Enable billing in your GCP project

## Cost Considerations
- Google Maps API has a free tier with monthly credits
- After free tier, pay-as-you-go pricing applies
- Monitor usage in [GCP Console > APIs & Services > Dashboard](https://console.cloud.google.com/apis/dashboard)
- Set up billing alerts to avoid unexpected charges

## Security Best Practices
1. **Always restrict API keys** by domain and API
2. **Never commit API keys** to version control
3. **Use different keys** for development and production
4. **Rotate keys** periodically
5. **Monitor usage** for unusual activity

## Additional Resources
- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [Places API Documentation](https://developers.google.com/maps/documentation/places/web-service)
- [Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript)
- [Street View Static API Documentation](https://developers.google.com/maps/documentation/streetview)

