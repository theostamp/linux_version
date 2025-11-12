# 🌐 Tenant Domain Setup Guide

## Το Πρόβλημα

Το tenant domain `theo.newconcierge.app` δείχνει στο Django backend (Railway), αλλά πρέπει να δείχνει στο Next.js frontend (Vercel) για να λειτουργήσει το `/dashboard` route.

## Αρχιτεκτονική

```
┌─────────────────────────────────────────────────────────┐
│  Tenant Domain: theo.newconcierge.app                   │
│  ↓                                                       │
│  Vercel (Next.js Frontend)                              │
│  ├── /dashboard → Dashboard Page                         │
│  ├── /login → Login Page                                │
│  └── /api/* → Proxy to Django Backend                   │
│       ↓                                                  │
│  Django Backend (Railway)                                │
│  └── /api/* → API Endpoints                             │
└─────────────────────────────────────────────────────────┘
```

## Βήματα Ρύθμισης

### 1. Προσθήκη Wildcard Domain στο Vercel

1. Πήγαινε στο [Vercel Dashboard](https://vercel.com/dashboard)
2. Επίλεξε το project `public-app`
3. Πήγαινε στο **Settings** → **Domains**
4. Προσθήκη domain: `*.newconcierge.app`
5. Το Vercel θα δώσει DNS records για CNAME

### 2. DNS Configuration

Στο DNS provider σου (όπου διαχειρίζεσαι το `newconcierge.app` domain), πρόσθεσε:

**CNAME Record:**
```
Type: CNAME
Name: *
Value: cname.vercel-dns.com (ή ότι δώσει το Vercel)
TTL: 3600
```

**Σημείωση:** Αν το DNS provider δεν υποστηρίζει wildcard CNAME, πρέπει να προσθέσεις κάθε tenant subdomain ξεχωριστά:

```
Type: CNAME
Name: theo
Value: cname.vercel-dns.com
TTL: 3600
```

### 3. Environment Variables στο Vercel

Βεβαιώσου ότι έχεις αυτά τα environment variables στο Vercel:

```env
NEXT_PUBLIC_CORE_API_URL=https://linuxversion-production.up.railway.app
API_BASE_URL=https://linuxversion-production.up.railway.app
```

### 4. Επιβεβαίωση

Μετά την DNS propagation (5-30 λεπτά):

1. Άνοιξε `https://theo.newconcierge.app` - θα πρέπει να φορτώσει το Next.js frontend
2. Άνοιξε `https://theo.newconcierge.app/dashboard` - θα πρέπει να φορτώσει το dashboard page
3. Άνοιξε `https://theo.newconcierge.app/api/users/me/` - θα πρέπει να κάνει proxy στο Django backend

## Troubleshooting

### Αν το domain δεν φορτώνει:

1. **Ελέγξε DNS propagation:**
   ```bash
   nslookup theo.newconcierge.app
   # Θα πρέπει να δείχνει στο Vercel
   ```

2. **Ελέγξε Vercel logs:**
   - Vercel Dashboard → Project → Deployments → View Logs

3. **Ελέγξε environment variables:**
   - Vercel Dashboard → Settings → Environment Variables
   - Βεβαιώσου ότι `NEXT_PUBLIC_CORE_API_URL` είναι σωστό

### Αν το `/dashboard` δίνει 404:

1. Βεβαιώσου ότι το `/dashboard` route υπάρχει στο Next.js (`public-app/src/app/dashboard/page.tsx`)
2. Ελέγξε ότι το domain δείχνει στο Vercel, όχι στο Railway
3. Κάνε redeploy στο Vercel μετά την προσθήκη του route

## Σημαντικό

- Το tenant domain **ΠΡΕΠΕΙ** να δείχνει στο Vercel (Next.js), όχι στο Railway (Django)
- Το Django backend είναι προσβάσιμο μόνο μέσω API calls (proxy από το Next.js)
- Το Next.js κάνει proxy για όλα τα `/api/*` requests προς το Django backend

