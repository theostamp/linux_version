# 🚨 Railway Deployment - Quick Fix

## Problem: "Still waiting..." in logs

Your deployment is waiting for **database connections**.

---

## Solution: Add Databases (2 minutes)

### Step 1: Add PostgreSQL
```
1. Go to your Railway project dashboard
2. Click "+ New" button (top right)
3. Select "Database"
4. Click "PostgreSQL"
5. Wait 30 seconds for provisioning
```

### Step 2: Add Redis
```
1. Click "+ New" button again
2. Select "Database"
3. Click "Redis"
4. Wait 30 seconds for provisioning
```

### Step 3: Link Databases to Backend Service
```
1. Click on your Django Backend service
2. Go to "Variables" tab
3. Railway should auto-add these variables:
   - DATABASE_URL (from PostgreSQL)
   - REDIS_URL (from Redis)
```

### Step 4: Trigger Redeploy
```
1. Go to "Deployments" tab
2. Click "Redeploy" button
   OR
3. Push a new commit to GitHub
```

---

## Expected Result

After adding databases, your build logs should show:

```
✓ Installing dependencies...
✓ Running migrations...
✓ Collecting static files...
✓ Starting gunicorn...
✓ Deployment successful!
```

---

## Still Having Issues?

If you still see "Still waiting..." after adding databases:

1. **Check Build Logs** - Look for actual error before "Still waiting..."
2. **Check Variables** - Make sure DATABASE_URL and REDIS_URL are set
3. **Check Root Directory** - Should be set to "backend" in Settings

---

## Next Steps After Success

Once deployment succeeds:

1. Get your Railway backend URL (e.g., `https://xxx.railway.app`)
2. Configure Stripe webhook with that URL
3. Add environment variables for Stripe keys
4. Test the full payment → tenant creation flow

---

**Time estimate**: 5 minutes to add databases and redeploy
