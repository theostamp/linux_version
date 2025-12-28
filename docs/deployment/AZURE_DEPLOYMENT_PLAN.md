# 🚀 Azure Backend Deployment Plan
**Target**: Django Backend + PostgreSQL + Redis on Azure  
**Frontend**: Stays on Vercel (No changes needed)  
**Goal**: Managed infrastructure, less manual DevOps

---

## 💡 Why Azure Makes Sense

### Current Problems (from your setup):
- Manual server management (DigitalOcean droplet)
- Docker compose orchestration yourself
- SSL certificate management
- Database backups responsibility
- Monitoring & alerts manual setup

### Azure Benefits:
- ✅ Managed PostgreSQL (auto backups, scaling)
- ✅ Managed Redis
- ✅ Azure App Service (Django auto-scaling)
- ✅ Built-in SSL/TLS
- ✅ Integrated monitoring & alerts
- ✅ Automatic updates

---

## 📋 Architecture Overview

```
┌──────────────────┐
│   Vercel (Front) │  ─── unchanged ───
└────────┬─────────┘
         │ API calls
         ▼
┌─────────────────────────────┐
│   Azure App Service         │
│   Django Backend (Docker)   │
└────────┬────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐  ┌──────────┐
│PostgreSQL│  │  Redis  │
│ Azure DB │  │  Azure  │
└─────────┘  └──────────┘
```

---

## 🎯 Step-by-Step Migration

### Phase 1: Azure Resources Setup

#### 1.1 Create Resource Group
```bash
az group create \
  --name newconcierge-prod \
  --location westeurope
```

#### 1.2 Create PostgreSQL Database
```bash
# Azure Database for PostgreSQL (Flexible Server)
az postgres flexible-server create \
  --resource-group newconcierge-prod \
  --name newconcierge-db \
  --location westeurope \
  --admin-user concierge_admin \
  --admin-password <secure-password> \
  --sku-name Standard_B1ms \
  --storage-size 32 \
  --version 16

# Create database
az postgres flexible-server db create \
  --resource-group newconcierge-prod \
  --server-name newconcierge-db \
  --database-name concierge_db
```

#### 1.3 Create Azure Cache for Redis
```bash
az redis create \
  --resource-group newconcierge-prod \
  --name newconcierge-cache \
  --location westeurope \
  --sku Basic \
  --vm-size c0
```

#### 1.4 Create Azure Container Registry
```bash
az acr create \
  --resource-group newconcierge-prod \
  --name newconciergeacr \
  --sku Basic
```

#### 1.5 Create App Service Plan
```bash
az appservice plan create \
  --name newconcierge-plan \
  --resource-group newconcierge-prod \
  --sku B2 \
  --is-linux
```

---

### Phase 2: Deploy Backend

#### 2.1 Build & Push Docker Image
```bash
cd linux_version/backend

# Login to ACR
az acr login --name newconciergeacr

# Build image
docker build -f Dockerfile.prod -t newconciergeacr.azurecr.io/backend:latest .

# Push to ACR
docker push newconciergeacr.azurecr.io/backend:latest
```

#### 2.2 Create Web App
```bash
az webapp create \
  --resource-group newconcierge-prod \
  --plan newconcierge-plan \
  --name newconcierge-backend \
  --deployment-container-image-name newconciergeacr.azurecr.io/backend:latest

# Enable continuous deployment from ACR
az webapp deployment container config \
  --name newconcierge-backend \
  --resource-group newconcierge-prod \
  --enable-cd true
```

#### 2.3 Configure Environment Variables
```bash
# Database connection
az webapp config appsettings set \
  --name newconcierge-backend \
  --resource-group newconcierge-prod \
  --settings \
    DATABASE_URL="postgresql://concierge_admin:<password>@newconcierge-db.postgres.database.azure.com:5432/concierge_db" \
    REDIS_URL="rediss://newconcierge-cache.redis.cache.windows.net:6380/?ssl=true" \
    DJANGO_SECRET_KEY="<your-secret-key>" \
    DJANGO_DEBUG="False" \
    DJANGO_ALLOWED_HOSTS="newconcierge-backend.azurewebsites.net,<your-custom-domain>"

# Import all variables from your .env.production
# (Add other env vars as needed)
```

#### 2.4 Configure Custom Domain & SSL
```bash
# Add custom domain
az webapp config hostname add \
  --webapp-name newconcierge-backend \
  --resource-group newconcierge-prod \
  --hostname api.yourdomain.com

# Configure SSL (free certificate)
az webapp config ssl bind \
  --name newconcierge-backend \
  --resource-group newconcierge-prod \
  --certificate-thumbprint <thumbprint> \
  --ssl-type SNI
```

---

### Phase 3: Database Migration

#### 3.1 Export from Current Database
```bash
# From your current server
pg_dump -h localhost -U postgres -d concierge_db > backup.sql
```

#### 3.2 Import to Azure PostgreSQL
```bash
# Get connection string
psql "host=newconcierge-db.postgres.database.azure.com port=5432 dbname=concierge_db user=concierge_admin password=<password> sslmode=require" < backup.sql
```

---

### Phase 4: Update Vercel Frontend

#### 4.1 Update API URL
```bash
# In Vercel Dashboard → Environment Variables
NEXT_PUBLIC_API_URL=https://newconcierge-backend.azurewebsites.net/api
```

---

## 💰 Estimated Costs (Monthly)

| Service | Size | Monthly Cost (€) |
|---------|------|------------------|
| App Service (B2) | 2 CPU, 3.5GB RAM | ~€15 |
| PostgreSQL (Flexible, Standard_B1ms) | 1 vCore, 2GB RAM | ~€35 |
| Redis (Basic C0) | 250MB | ~€15 |
| Container Registry (Basic) | 10GB | ~€5 |
| **Total** | | **~€70/month** |

**VS Current**: Potentially similar, but with management included.

---

## 🔄 Continuous Deployment Setup

### Option 1: GitHub Actions
```yaml
# .github/workflows/azure-deploy.yml
name: Deploy to Azure

on:
  push:
    branches: [main]
    paths: ['linux_version/backend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build and push to ACR
        uses: azure/docker-login@v1
        with:
          login-server: newconciergeacr.azurecr.io
          username: ${{ secrets.AZURE_CLIENT_ID }}
          password: ${{ secrets.AZURE_CLIENT_SECRET }}
      
      - name: Build and push
        run: |
          docker build -f linux_version/backend/Dockerfile.prod -t newconciergeacr.azurecr.io/backend:${{ github.sha }} .
          docker push newconciergeacr.azurecr.io/backend:${{ github.sha }}
      
      - name: Update Web App
        uses: azure/webapps-deploy@v2
        with:
          app-name: newconcierge-backend
          images: newconciergeacr.azurecr.io/backend:${{ github.sha }}
```

---

## 🚨 Quick Migration Checklist

- [ ] Create Azure resources (PostgreSQL, Redis, ACR, App Service)
- [ ] Build & push Docker image to ACR
- [ ] Configure environment variables
- [ ] Export database from current server
- [ ] Import database to Azure PostgreSQL
- [ ] Test backend API endpoints
- [ ] Update Vercel frontend API URL
- [ ] Configure custom domain & SSL
- [ ] Setup monitoring & alerts
- [ ] Cutover DNS (when ready)

---

## 📞 What You Need

1. **Azure account** (free tier for testing)
2. **Current database backup** (pg_dump)
3. **Environment variables** (from your .env.production)
4. **2-3 hours** for initial setup
5. **DNS access** (to update DNS records)

---

## 🎯 Next Steps

Want me to:
1. **Create the actual Azure deployment scripts?**
2. **Test the migration on a staging environment first?**
3. **Help with database migration from DigitalOcean to Azure?**

Let me know which part to focus on! 🚀
