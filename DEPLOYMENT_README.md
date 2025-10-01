# 🚀 New Concierge - Deployment Guide

## Quick Start

```bash
# Test current deployment status
./deploy.sh
# Select option: 5

# Deploy everything
./deploy.sh
# Select option: 4
# Enter production URL when prompted
```

## What This System Does

Allows residents to scan a QR code and instantly see:
- Their monthly common expenses (κοινόχρηστα)
- Their current balance
- Building announcements
- Maintenance requests

**No app download, no login, no friction.**

## System Architecture

```
┌──────────────┐
│  QR Code     │  → Scan with phone camera
│  (Physical)  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Mobile Browser / PWA                │
│  /my-apartment/{unique-token}        │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  Backend API (Public, No Auth)       │
│  /api/personal/{token}/dashboard/    │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  Database (Multi-tenant)             │
│  - Apartment data                    │
│  - Common expenses                   │
│  - Announcements                     │
└──────────────────────────────────────┘
```

## Files Overview

### Deployment Tools
- `deploy.sh` - Interactive deployment wizard
- `DEPLOYMENT_GUIDE.md` - Comprehensive deployment documentation
- `DEPLOYMENT_READY.md` - Production readiness checklist

### Backend
- `backend/apartments/models.py` - Apartment model with kiosk_token
- `backend/apartments/views_personal.py` - Public API endpoints
- `backend/apartments/management/commands/generate_apartment_qr_codes.py` - QR generator

### Frontend
- `frontend/app/my-apartment/[token]/page.tsx` - Personal dashboard
- `frontend/.env.production` - Production environment variables
- `frontend/public/manifest.json` - PWA configuration

## Quick Deployment Commands

### 1. Build Frontend
```bash
cd frontend
npm ci
npm run build
```

### 2. Generate QR Codes
```bash
docker exec backend python manage.py generate_apartment_qr_codes \
  --schema demo \
  --base-url https://newconcierge.gr
```

### 3. Test Locally
```bash
# Backend
curl http://localhost:8000/api/personal/{TOKEN}/dashboard/

# Frontend
cd frontend && npm start
# Open: http://localhost:3000/my-apartment/{TOKEN}
```

## Environment Variables

### Development (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production (`.env.production`)
```env
NEXT_PUBLIC_API_URL=https://api.newconcierge.gr
NEXT_PUBLIC_APP_URL=https://newconcierge.gr
```

## Production Hosting Options

### Option 1: Vercel (Recommended for Frontend)
```bash
npm i -g vercel
cd frontend
vercel --prod
```

### Option 2: Own Server with PM2
```bash
cd frontend
npm run build
pm2 start npm --name "newconcierge" -- start
pm2 save
```

### Option 3: Docker
```bash
docker build -t newconcierge-frontend frontend/
docker run -d -p 3000:3000 newconcierge-frontend
```

## Cost Estimate

| Component | Monthly Cost |
|-----------|--------------|
| VPS (2GB) | €10-15 |
| Domain | €1 |
| SSL | Free |
| CDN (optional) | €0-5 |
| **Total** | **€11-21** |

**vs Native App:** €15k-25k development + €3k-5k/year maintenance

**Savings:** ~€17k-29k first year 🎉

## Testing Checklist

- [x] Backend API tested (200 OK)
- [x] Frontend integration tested
- [x] QR codes generated (1 PDF)
- [x] PWA manifest valid
- [x] Environment variables configured
- [x] Deployment script tested

## Support

For detailed deployment instructions, see:
- `DEPLOYMENT_GUIDE.md` - Full production setup
- `DEPLOYMENT_READY.md` - Readiness checklist
- `FINAL_TESTING_REPORT.md` - Test results

## Next Steps

1. Review `DEPLOYMENT_GUIDE.md`
2. Run `./deploy.sh` to test
3. Deploy to production
4. Print QR codes
5. Distribute to residents

---

**System Status:** ✅ Production Ready

**Time to Deploy:** ~2-3 hours

**Ready to launch!** 🚀
