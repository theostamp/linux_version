# 🚀 Vercel Deployment Guide

## Environment Variables Setup

### Required Environment Variables

Στο Vercel Dashboard, πηγαίνετε στο:
**Project Settings → Environment Variables**

Προσθέστε τα εξής:

```bash
# Backend API URL (REQUIRED)
API_BASE_URL=https://linuxversion-production.up.railway.app

# Optional - Fallback API URL
NEXT_PUBLIC_API_URL=https://linuxversion-production.up.railway.app
```

### How to Set Environment Variables in Vercel

1. **Login to Vercel**: https://vercel.com
2. **Select Your Project**: Επιλέξτε το `public-app` project
3. **Go to Settings**: Κάντε click στο "Settings" tab
4. **Environment Variables**: Κάντε click στο "Environment Variables" στο sidebar
5. **Add Variable**:
   - Key: `API_BASE_URL`
   - Value: `https://linuxversion-production.up.railway.app`
   - Environment: Select all (Production, Preview, Development)
   - Click "Save"
6. **Repeat** για `NEXT_PUBLIC_API_URL` (optional)

### Verify Environment Variables

Μετά το deployment, μπορείτε να verify ότι τα environment variables είναι set:

1. Go to **Deployments** tab
2. Click στο latest deployment
3. Go to **Runtime Logs**
4. Check για logs που δείχνουν το `API_BASE_URL`

---

## Deployment Steps

### 1. Connect Repository to Vercel

Αν δεν είναι ήδη connected:

1. Go to Vercel Dashboard
2. Click "Add New Project"
3. Import Git Repository
4. Select your repository
5. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `public-app` (if needed)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

### 2. Set Environment Variables

Follow the steps above to set `API_BASE_URL`

### 3. Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Check build logs for any errors

### 4. Verify Deployment

1. **Test Production URL**: Open the production URL from Vercel
2. **Test Login**: Try to login
3. **Test API Calls**: Check browser console for API calls
4. **Check Network Tab**: Verify API calls go to `/api/*` → `/backend-proxy/*`

---

## Troubleshooting

### API Calls Failing

**Problem**: API calls return 502/503 errors

**Solution**:
1. Verify `API_BASE_URL` is set correctly in Vercel
2. Check Railway backend is running
3. Verify CORS settings in Railway allow Vercel domain
4. Check backend-proxy route logs in Vercel

### Authentication Not Working

**Problem**: Login fails or tokens not saved

**Solution**:
1. Check browser console for errors
2. Verify localStorage is enabled
3. Check API endpoint `/api/users/token/simple/` is accessible
4. Verify backend authentication endpoint works

### Build Fails

**Problem**: Build fails with TypeScript errors

**Solution**:
1. Run `npm run build` locally first
2. Fix any TypeScript errors
3. Check `next.config.ts` settings
4. Verify all dependencies are installed

### Environment Variables Not Working

**Problem**: `process.env.API_BASE_URL` is undefined

**Solution**:
1. Verify variable is set in Vercel
2. Redeploy after setting variables
3. Check variable name is exactly `API_BASE_URL`
4. For client-side, use `NEXT_PUBLIC_` prefix

---

## Post-Deployment Checklist

After successful deployment:

- [ ] Production URL loads correctly
- [ ] Login page accessible
- [ ] Login works with valid credentials
- [ ] Dashboard loads after login
- [ ] API calls work (check Network tab)
- [ ] No console errors
- [ ] Mobile responsive works
- [ ] All main pages accessible
- [ ] Error handling works (test with invalid credentials)

---

## Monitoring

### Vercel Analytics

1. Enable Vercel Analytics in project settings
2. Monitor page views and performance
3. Check for errors in Analytics dashboard

### Error Monitoring

Consider setting up:
- **Sentry**: For error tracking
- **LogRocket**: For session replay
- **Vercel Logs**: Built-in logging

---

## Rollback Plan

If something goes wrong:

1. Go to **Deployments** tab in Vercel
2. Find the last working deployment
3. Click "..." menu → "Promote to Production"
4. This will rollback to that version

---

## Production URL

After deployment, your production URL will be:
```
https://your-project-name.vercel.app
```

Or if you have a custom domain:
```
https://your-custom-domain.com
```

