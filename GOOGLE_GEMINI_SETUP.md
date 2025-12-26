# Google Gemini API Setup Guide

## Overview
This application uses Google Gemini 1.5 Flash API for **Smart Invoice Scanning** - extracting structured data from invoice images.

## Prerequisites
- Google account
- Google Cloud Platform (GCP) project (optional, but recommended for production)

## Step 1: Get Gemini API Key

### Option A: Google AI Studio (Easiest - Recommended for Development)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key (starts with `AIza...`)

### Option B: Google Cloud Console (Recommended for Production)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Enable the **Generative Language API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Generative Language API"
   - Click "Enable"
4. Create API Key:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key

## Step 2: Restrict API Key (Recommended for Production)

For security, restrict your API key:

1. Click on your API key to edit it
2. Under "API restrictions":
   - Select "Restrict key"
   - Choose: **Generative Language API**
3. Under "Application restrictions":
   - For server-side use: Select "IP addresses (web servers, cron jobs, etc.)"
   - Add your server IP addresses (Railway, etc.)
   - OR select "None" if using from multiple IPs (less secure)

## Step 3: Add API Key to Environment Variables

### Local Development
Add to `backend/.env`:
```bash
GOOGLE_API_KEY=AIzaSy...your-api-key-here
```

### Production (Railway)
1. Go to your Railway project settings
2. Navigate to "Variables"
3. Add new variable:
   - **Name**: `GOOGLE_API_KEY`
   - **Value**: Your Gemini API key
   - **Scope**: Production (and Preview if needed)

## Important Notes

### Different from Google Maps API Key
- `GOOGLE_API_KEY` - For Gemini AI (invoice scanning)
- `GOOGLE_MAPS_API_KEY` - For Maps, Places, Street View (frontend)
- These are **separate** API keys with different purposes

### API Quotas & Pricing
- Google Gemini 1.5 Flash has a **free tier** with generous limits
- Check current pricing: https://ai.google.dev/pricing
- Monitor usage in Google Cloud Console

### Testing
After setting up the API key, test the invoice scanning endpoint:
```bash
curl -X POST https://your-backend.railway.app/api/financial/expenses/scan/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@invoice.jpg"
```

## Troubleshooting

### Error: "GOOGLE_API_KEY environment variable is not set"
- Verify the environment variable is set correctly
- Restart your backend server after adding the variable
- Check Railway/Vercel environment variables are saved

### Error: "API key not valid"
- Verify the API key is correct (no extra spaces)
- Ensure Generative Language API is enabled
- Check API key restrictions allow your server IP

### Error: "Quota exceeded"
- Check your API usage in Google Cloud Console
- Upgrade to paid plan if needed
- Implement rate limiting if necessary

