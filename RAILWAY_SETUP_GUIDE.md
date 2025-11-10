# Railway Setup Guide - Complete Services Checklist

## 🔍 Current Status

### ✅ Services που έχουμε:
1. **PostgreSQL Database** - Auto-provisioned από Railway
2. **Redis** - Auto-provisioned από Railway  
3. **Django Backend** - Service: `linuxversion-production`
4. **Frontend** - Deployed στο Vercel (not Railway)

### ❌ Services που ΛΕΙΠΟΥΝ (CRITICAL):

1. **Celery Worker** - ⚠️ **MUST ADD**
   - Background worker για async tasks
   - Email notifications
   - Document parsing
   - Financial calculations

2. **Celery Beat** - ⚠️ **MUST ADD**
   - Scheduled tasks
   - Periodic notifications
   - Scheduled reports

---

## 🚨 CRITICAL: Celery Services Missing

### Πώς να προσθέσετε Celery Worker στο Railway:

#### Step 1: Create New Service
1. Πηγαίνετε στο Railway Dashboard: https://railway.app/dashboard
2. Επιλέξτε το project: `linuxversion-production`
3. Κάντε κλικ στο **"New"** → **"Service"**
4. Επιλέξτε **"Deploy from GitHub repo"**
5. Επιλέξτε το repository: `linux_version`

#### Step 2: Configure Celery Worker Service
1. **Service Name:** `celery-worker`
2. **Root Directory:** `backend`
3. **Start Command:** `celery -A new_concierge_backend worker -l info`
4. **Build Command:** (same as backend)

#### Step 3: Connect to Services
1. Κάντε κλικ στο **"Settings"** → **"Service Dependencies"**
2. Connect to:
   - ✅ PostgreSQL Database
   - ✅ Redis
   - ✅ Django Backend (optional, για shared env vars)

#### Step 4: Add Environment Variables
Κάντε κλικ στο **"Variables"** και προσθέστε:

```bash
# Copy ALL environment variables from Backend service
# Use Railway variable references:
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
CELERY_BROKER_URL=${{Redis.REDIS_URL}}
CELERY_RESULT_BACKEND=${{Redis.REDIS_URL}}

# Copy all other variables from Backend service:
DJANGO_SECRET_KEY=${{Backend.DJANGO_SECRET_KEY}}
DJANGO_ALLOWED_HOSTS=${{Backend.DJANGO_ALLOWED_HOSTS}}
STRIPE_SECRET_KEY=${{Backend.STRIPE_SECRET_KEY}}
# ... όλα τα άλλα variables από Backend
```

**Προσοχή:** Μπορείτε να χρησιμοποιήσετε Railway's **"Shared Variables"** feature για να μοιράσετε variables μεταξύ services.

---

## 🚨 CRITICAL: Celery Beat Service

### Πώς να προσθέσετε Celery Beat στο Railway:

#### Step 1: Create New Service
1. Πηγαίνετε στο Railway Dashboard
2. Κάντε κλικ στο **"New"** → **"Service"**
3. Επιλέξτε **"Deploy from GitHub repo"**

#### Step 2: Configure Celery Beat Service
1. **Service Name:** `celery-beat`
2. **Root Directory:** `backend`
3. **Start Command:** `celery -A new_concierge_backend beat -l info`
4. **Build Command:** (same as backend)

#### Step 3: Connect to Services
1. Connect to:
   - ✅ PostgreSQL Database
   - ✅ Redis
   - ✅ Django Backend (optional)

#### Step 4: Add Environment Variables
```bash
# Same as Celery Worker
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
CELERY_BROKER_URL=${{Redis.REDIS_URL}}
CELERY_RESULT_BACKEND=${{Redis.REDIS_URL}}
# ... όλα τα άλλα variables
```

---

## 📋 Complete Railway Services Checklist

### Core Services:
- [x] PostgreSQL Database
- [x] Redis
- [x] Django Backend
- [ ] **Celery Worker** ← **ADD THIS**
- [ ] **Celery Beat** ← **ADD THIS**

### Optional Services:
- [ ] Flower (Monitoring - Optional)
- [ ] Nginx (Not needed - Railway handles routing)

---

## 🔧 Railway Configuration Files

### Backend Service (Existing):
- `linux_version/railway.toml` - ✅ Exists
- Root Directory: `backend`
- Start Command: `./entrypoint.sh`

### Celery Worker Service (NEW):
- **Root Directory:** `backend`
- **Start Command:** `celery -A new_concierge_backend worker -l info`
- **Build Command:** Same as backend

### Celery Beat Service (NEW):
- **Root Directory:** `backend`
- **Start Command:** `celery -A new_concierge_backend beat -l info`
- **Build Command:** Same as backend

---

## 🚀 Quick Setup Script

Μπορείτε να δημιουργήσετε τα services και μέσω Railway CLI:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Create Celery Worker service
railway service create --name celery-worker
railway service set --root-directory backend
railway service set --start-command "celery -A new_concierge_backend worker -l info"

# Create Celery Beat service
railway service create --name celery-beat
railway service set --root-directory backend
railway service set --start-command "celery -A new_concierge_backend beat -l info"
```

---

## 🔍 Verification Steps

### 1. Check if Services are Running:
1. Πηγαίνετε στο Railway Dashboard
2. Ελέγξτε τα logs για κάθε service:
   - Backend service: Should show Django starting
   - Celery Worker: Should show `celery@hostname ready`
   - Celery Beat: Should show `celery beat vX.X.X is starting`

### 2. Test Celery Worker:
```bash
# Check Railway logs for Celery Worker
# Should see: "celery@hostname ready"
```

### 3. Test Celery Beat:
```bash
# Check Railway logs for Celery Beat
# Should see: "celery beat vX.X.X is starting"
```

### 4. Test Tasks:
```python
# In Django shell or via API
from notifications.tasks import send_notification
send_notification.delay(...)  # Should work
```

---

## 📊 Service Comparison

### Τοπικό Docker Compose:
```
✅ db (PostgreSQL)
✅ redis
✅ celery (Worker)
✅ celery-beat (Beat)
✅ flower (Monitoring)
✅ backend (Django)
✅ frontend (Next.js)
✅ nginx (Reverse Proxy)
```

### Railway (Current):
```
✅ PostgreSQL Database
✅ Redis
❌ Celery Worker - MISSING
❌ Celery Beat - MISSING
❌ Flower - MISSING (Optional)
✅ Django Backend
✅ Frontend (Vercel)
❌ Nginx - Not needed
```

### Railway (After Adding):
```
✅ PostgreSQL Database
✅ Redis
✅ Celery Worker - ADDED
✅ Celery Beat - ADDED
✅ Django Backend
✅ Frontend (Vercel)
```

---

## ⚠️ Important Notes

1. **Celery Worker και Beat είναι CRITICAL** αν χρησιμοποιείτε:
   - Email notifications
   - Background tasks
   - Scheduled tasks
   - Document parsing
   - Financial calculations

2. **Environment Variables:**
   - Όλα τα services πρέπει να έχουν access στα ίδια PostgreSQL και Redis
   - Χρησιμοποιήστε Railway's variable references για shared variables

3. **Resource Limits:**
   - Celery Worker: 512MB-1GB RAM
   - Celery Beat: 256MB-512MB RAM

4. **Monitoring:**
   - Flower είναι optional (monitoring tool)
   - Μπορείτε να χρησιμοποιήσετε Railway logs για monitoring

---

## 🎯 Next Steps

1. **Προσθέστε Celery Worker service** στο Railway
2. **Προσθέστε Celery Beat service** στο Railway
3. **Verify services are running** (check logs)
4. **Test tasks** (send test email, etc.)
5. **Monitor logs** για errors

---

## 📝 Checklist

- [ ] Celery Worker service created
- [ ] Celery Beat service created
- [ ] Services connected to PostgreSQL
- [ ] Services connected to Redis
- [ ] Environment variables configured
- [ ] Services are running (check logs)
- [ ] Test tasks working
- [ ] Monitoring setup (optional)

---

## 🆘 Troubleshooting

### Celery Worker not starting:
- Check logs for errors
- Verify Redis connection
- Verify DATABASE_URL
- Check environment variables

### Celery Beat not starting:
- Check logs for errors
- Verify Redis connection
- Check for duplicate beat processes
- Verify timezone settings

### Tasks not executing:
- Check Celery Worker is running
- Check Redis connection
- Check task registration
- Check logs for errors















