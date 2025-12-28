# 📍 Vercel Dashboard - Where to Find Settings

## 🔍 Quick Navigation Guide

### Project Settings Locations

#### 1. **General Settings**
**Path**: `Dashboard → [Your Project] → Settings → General`

**What you'll find here**:
- ✅ Root Directory (`public-app`)
- ✅ Framework Preset (Next.js)
- ✅ Build & Development Settings
- ✅ Output Directory (`.next`)
- ✅ Install/Build Commands

**Direct URL Pattern**:
```
https://vercel.com/[username]/[project-name]/settings/general
```

---

#### 2. **Git Settings**
**Path**: `Dashboard → [Your Project] → Settings → Git`

**What you'll find here**:
- ✅ Production Branch (`main`)
- ✅ Preview Branches
- ✅ Git Repository Connection
- ✅ Auto-deploy settings

**Direct URL Pattern**:
```
https://vercel.com/[username]/[project-name]/settings/git
```

---

#### 3. **Environment Variables**
**Path**: `Dashboard → [Your Project] → Settings → Environment Variables`

**What you'll find here**:
- ✅ All environment variables
- ✅ Environment scope (Production/Preview/Development)
- ✅ Add/Edit/Delete variables

**Direct URL Pattern**:
```
https://vercel.com/[username]/[project-name]/settings/environment-variables
```

**Required Variables**:
```bash
API_BASE_URL=https://your-railway-backend.up.railway.app
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

#### 4. **Configuration (JSON View)**
**Path**: `Dashboard → [Your Project] → Settings → General → Configuration`

**What you'll find here**:
- ✅ Current project configuration
- ✅ Shows settings from `public-app/vercel.json`
- ✅ Can export configuration as JSON

**Note**: This shows the **current active configuration**, not a file you edit directly. The actual file is `public-app/vercel.json` in your repository.

---

#### 5. **Deployments**
**Path**: `Dashboard → [Your Project] → Deployments`

**What you'll find here**:
- ✅ All deployment history
- ✅ Deployment status (Ready/Building/Error)
- ✅ Branch name for each deployment
- ✅ Build logs
- ✅ Redeploy option

**Direct URL Pattern**:
```
https://vercel.com/[username]/[project-name]/deployments
```

---

## 📁 Configuration Files

### Vercel Configuration File

**Location**: `public-app/vercel.json` (inside your app directory)

**NOT** in repository root (unlike Railway's `railway.json`)

**Current Configuration**:
```json
{
  "framework": "nextjs",
  "installCommand": "npm ci",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/backend-proxy/:path*"
    }
  ]
}
```

**How to Edit**:
1. Edit `public-app/vercel.json` in your repository
2. Commit and push to `main` branch
3. Vercel will auto-detect and use the new configuration

---

## 🔄 Comparison: Vercel vs Railway

| Setting | Vercel | Railway |
|---------|--------|---------|
| **Config File** | `public-app/vercel.json` | `railway.json` (root) |
| **Location** | Inside app directory | Repository root |
| **Dashboard Config** | Settings → General → Configuration | Settings → Source |
| **Branch Setting** | Settings → Git → Production Branch | Settings → Source → Branch |
| **Root Directory** | Settings → General → Root Directory | Settings → Source → Root Directory |
| **Environment Vars** | Settings → Environment Variables | Variables tab |

---

## ✅ Verification Checklist

### In Vercel Dashboard:

- [ ] **Settings → General**
  - [ ] Root Directory = `public-app` ✅
  - [ ] Framework Preset = `Next.js` ✅
  - [ ] Build Command = `npm run build` ✅

- [ ] **Settings → Git**
  - [ ] Production Branch = `main` ✅
  - [ ] Repository connected ✅

- [ ] **Settings → Environment Variables**
  - [ ] `API_BASE_URL` set ✅
  - [ ] `STRIPE_SECRET_KEY` set ✅
  - [ ] `STRIPE_WEBHOOK_SECRET` set ✅
  - [ ] All variables set for Production/Preview ✅

- [ ] **Deployments**
  - [ ] Latest deployment from `main` branch ✅
  - [ ] Build status = Ready ✅
  - [ ] No errors in logs ✅

---

## 🎯 Quick Access Links

Replace `[username]` and `[project-name]` with your actual values:

- **General Settings**: `https://vercel.com/[username]/[project-name]/settings/general`
- **Git Settings**: `https://vercel.com/[username]/[project-name]/settings/git`
- **Environment Variables**: `https://vercel.com/[username]/[project-name]/settings/environment-variables`
- **Deployments**: `https://vercel.com/[username]/[project-name]/deployments`

---

## 📝 Notes

1. **No Root-Level Config**: Vercel does NOT use a `vercel.json` in the repository root (unlike Railway's `railway.json`)

2. **Configuration File**: The `vercel.json` is inside `public-app/` directory and is automatically detected

3. **Dashboard vs File**: 
   - Dashboard shows current active configuration
   - File (`public-app/vercel.json`) is the source of truth
   - Changes to file → commit → push → auto-deploy

4. **Settings Priority**:
   - File (`vercel.json`) takes precedence
   - Dashboard settings override file settings (if conflicting)
   - Best practice: Keep everything in `vercel.json` file

---

**Last Updated**: 11 Νοεμβρίου 2025

