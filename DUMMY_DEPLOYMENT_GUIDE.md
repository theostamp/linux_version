# Dummy Deployment Guide - Railway + Vercel

## 📋 Περιγραφή

Αυτός είναι ένας **dummy deployment guide** για να δοκιμάσεις το deployment process στο Railway (Backend) και Vercel (Frontend).

## 🚀 Railway Deployment (Backend)

### Προαπαιτούμενα
- GitHub account
- Railway account (https://railway.app)
- PostgreSQL database (Railway auto-provisions)

### Βήματα Deployment

#### 1. Σύνδεση με GitHub
1. Πήγαινε στο Railway Dashboard: https://railway.app/dashboard
2. Κάνε κλικ στο **"New Project"**
3. Επιλέξτε **"Deploy from GitHub repo"**
4. Επιλέξτε το repository: `linux_version`
5. Επιλέξτε το branch: `main`

#### 2. Configuration
- **Root Directory:** `backend`
- **Build Command:** `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate --noinput`
- **Start Command:** `./entrypoint.sh`

Το Railway θα διαβάσει αυτόματα το `railway.toml` από το root directory.

#### 3. Environment Variables
Πρόσθεσε τα environment variables από το `railway.env.example`:

```bash
# Copy from railway.env.example
DATABASE_URL=postgresql://...
DJANGO_SECRET_KEY=your-secret-key
DJANGO_ALLOWED_HOSTS=your-app.up.railway.app
STRIPE_SECRET_KEY=sk_test_...
# ... etc
```

#### 4. PostgreSQL Database
1. Στο Railway Dashboard, κάνε κλικ στο **"New"** → **"Database"** → **"PostgreSQL"**
2. Το Railway θα δημιουργήσει αυτόματα το `DATABASE_URL` environment variable
3. Σύνδεσε το στο Backend service

#### 5. Deploy
Μετά από push στο GitHub, το Railway θα κάνει auto-deploy.

### Verification
```bash
# Check Railway logs
railway logs

# Or visit Railway Dashboard → Service → Logs
```

---

## 🌐 Vercel Deployment (Frontend)

### Προαπαιτούμενα
- GitHub account
- Vercel account (https://vercel.com)
- Node.js 20+ installed locally

### Βήματα Deployment

#### 1. Σύνδεση με GitHub
1. Πήγαινε στο Vercel Dashboard: https://vercel.com/dashboard
2. Κάνε κλικ στο **"Add New"** → **"Project"**
3. Επιλέξτε το GitHub repository: `linux_version`
4. Επιλέξτε το branch: `main`

#### 2. Configuration
- **Framework Preset:** Next.js
- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

Το Vercel θα διαβάσει αυτόματα το `vercel.json` από το `frontend` directory.

#### 3. Environment Variables
Πρόσθεσε τα environment variables από το `vercel.env.example`:

```bash
NEXT_PUBLIC_API_URL=https://linuxversion-production.up.railway.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Σημείωση:** Μόνο `NEXT_PUBLIC_*` variables είναι exposed στο browser.

#### 4. Deploy
Μετά από push στο GitHub, το Vercel θα κάνει auto-deploy.

### Verification
```bash
# Check Vercel deployment
vercel ls

# Or visit Vercel Dashboard → Deployments
```

---

## 🔧 Configuration Files

### Railway (`railway.toml`)
```toml
[build]
builder = "NIXPACKS"
buildCommand = "pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate --noinput"

[deploy]
startCommand = "./entrypoint.sh"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[service]
rootDirectory = "backend"
healthcheckPath = "/health/"
healthcheckTimeout = 100
```

### Vercel (`frontend/vercel.json`)
```json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/.next",
  "installCommand": "cd frontend && npm install",
  "framework": "nextjs",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://linuxversion-production.up.railway.app/api/:path*"
    }
  ]
}
```

---

## 🧪 Testing Dummy Deploy

### 1. Test Backend (Railway)
```bash
# Test health endpoint
curl https://your-app.up.railway.app/health/

# Test API endpoint
curl https://your-app.up.railway.app/api/billing/plans/
```

### 2. Test Frontend (Vercel)
```bash
# Visit your Vercel URL
https://your-app.vercel.app

# Check browser console for API calls
# Should see successful API requests to Railway backend
```

---

## 📝 Checklist

### Railway
- [ ] Project created
- [ ] GitHub repository connected
- [ ] PostgreSQL database added
- [ ] Environment variables set
- [ ] Service deployed successfully
- [ ] Health check passing
- [ ] API endpoints accessible

### Vercel
- [ ] Project created
- [ ] GitHub repository connected
- [ ] Root directory set to `frontend`
- [ ] Environment variables set
- [ ] Build successful
- [ ] Frontend accessible
- [ ] API rewrites working

---

## 🐛 Troubleshooting

### Railway Issues
- **Build fails:** Check `railway.toml` buildCommand
- **Service won't start:** Check logs for errors
- **Database connection:** Verify `DATABASE_URL` is set correctly
- **Port issues:** Railway sets `PORT` automatically

### Vercel Issues
- **Build fails:** Check Node.js version (should be 20+)
- **API calls failing:** Check `NEXT_PUBLIC_API_URL` environment variable
- **CORS errors:** Check Railway CORS settings
- **Rewrites not working:** Verify `vercel.json` configuration

---

## 📚 Resources

- [Railway Documentation](https://docs.railway.app/)
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

## ⚠️ Notes

- Αυτό είναι ένα **dummy deployment** για testing
- Για production, χρειάζονται additional security measures
- Never commit secrets to GitHub
- Use environment variables for all sensitive data











