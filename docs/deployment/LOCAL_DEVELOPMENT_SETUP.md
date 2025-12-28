# Τοπικό Περιβάλλον Ανάπτυξης - Local Development Mirror

Αυτός ο οδηγός περιγράφει πώς να ρυθμίσεις ένα πλήρες τοπικό περιβάλλον ανάπτυξης που καθρεφτίζει την παραγωγή για debugging χωρίς deploy.

## Προαπαιτούμενα

- **Python 3.12+** με system dependencies όπως προκύπτουν από το `backend/Dockerfile`
- **Node.js 20+** / npm 10+ για το Next.js frontend
- **Docker Desktop** / Docker Compose για Postgres & Redis containers
- **Git** για clone του repository

## Γρήγορη Εγκατάσταση

### Αυτοματοποιημένη Εγκατάσταση

```bash
# 1. Εκτέλεσε το setup script
./scripts/setup-local-dev.sh
```

Αυτό το script θα:
- Ελέγξει τα prerequisites
- Ξεκινήσει τα Docker containers (Postgres & Redis)
- Δημιουργήσει Python virtual environment
- Εγκαταστήσει dependencies
- Εκτελέσει migrations
- Δημιουργήσει demo tenant
- Εγκαταστήσει frontend dependencies
- Προσθέσει demo.localhost στο /etc/hosts

### Χειροκίνητη Εγκατάσταση

Αν προτιμάς να κάνεις manual setup:

#### 1. Docker Infrastructure

```bash
# Start Postgres & Redis
docker compose -f docker-compose.local.yml up -d db redis
```

#### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt -r requirements-ai.txt -r requirements_pdf.txt

# Run migrations
python manage.py migrate_schemas --shared
python manage.py migrate_schemas

# Create demo tenant
python scripts/create_tenant_and_migrate.py demo --password 123456
```

#### 3. Frontend Setup

```bash
cd public-app

# Install dependencies
npm ci

# .env.local should already be created (see backend/.env for INTERNAL_API_SECRET_KEY)
```

#### 4. System Configuration

```bash
# Add demo.localhost to /etc/hosts
echo "127.0.0.1 demo.localhost" | sudo tee -a /etc/hosts
```

## Εκκίνηση του Περιβάλλοντος

### Με Scripts

```bash
# Start infrastructure only
./scripts/start-local-dev.sh
```

### Χειροκίνητα

**Terminal 1 - Infrastructure:**
```bash
docker compose -f docker-compose.local.yml up db redis
```

**Terminal 2 - Backend:**
```bash
cd backend
source .venv/bin/activate
python manage.py runserver 0.0.0.0:18000
```

**Terminal 3 - Frontend:**
```bash
cd public-app
npm run dev
```

## Πρόσβαση

- **Frontend:** http://demo.localhost:3000
- **Backend API:** http://localhost:18000
- **Postgres:** localhost:5433
- **Redis:** localhost:6379

## Demo Tenant Credentials

Μετά την εκτέλεση του `create_tenant_and_migrate.py demo`, τα credentials είναι στο:
```
backend/logs/demo.log
```

## Debugging

### VS Code Debugging

Το project περιλαμβάνει VS Code launch configurations:

1. **Python: Django Backend** - Debug Django development server
2. **Python: Django Shell Plus** - Debug Django shell
3. **Next.js: Frontend Debug** - Debug Next.js server-side
4. **Next.js: Frontend Debug (Chrome)** - Debug Next.js client-side
5. **Full Stack Debug** - Debug backend και frontend μαζί

### Manual Debugging

**Backend:**
```bash
cd backend
source .venv/bin/activate

# Django shell plus
python manage.py shell_plus

# Runserver with better tracebacks
python manage.py runserver_plus 0.0.0.0:18000

# Debug with debugpy
python -m debugpy --listen 0.0.0.0:5678 manage.py runserver 0.0.0.0:18000
```

**Frontend:**
```bash
cd public-app
npm run dev  # Already supports debugging
```

## Database Mirroring (Optional)

Για να καθρεφτίσεις πλήρως τα production data:

```bash
# 1. Create dump from production
pg_dump -h <production-host> -U <user> -d <database> > production_dump.sql

# 2. Restore to local
./scripts/restore-production-db.sh production_dump.sql
```

## Environment Variables

### Backend (`backend/.env`)

Βασικές ρυθμίσεις:
- `DJANGO_DEBUG=True`
- `DATABASE_URL=postgresql://newconcierge:newconcierge@localhost:5433/newconcierge`
- `REDIS_URL=redis://localhost:6379/0`
- `INTERNAL_API_SECRET_KEY=<shared-with-frontend>`

### Frontend (`public-app/.env.local`)

Βασικές ρυθμίσεις:
- `CORE_API_URL=http://localhost:18000`
- `NEXT_PUBLIC_API_URL=http://localhost:18000`
- `NEXT_PUBLIC_APP_URL=http://demo.localhost:3000`
- `INTERNAL_API_SECRET_KEY=<ίδια με backend>`

## Troubleshooting

### Port Already in Use

Αν κάποιο port είναι ήδη σε χρήση:

```bash
# Check what's using the port
lsof -i :18000  # Backend
lsof -i :3000   # Frontend
lsof -i :5433   # Postgres
lsof -i :6379   # Redis

# Stop the service or change ports in docker-compose.local.yml
```

### Database Connection Issues

```bash
# Check if Postgres is running
docker compose -f docker-compose.local.yml ps

# Check logs
docker compose -f docker-compose.local.yml logs db

# Test connection
psql -h localhost -p 5433 -U newconcierge -d newconcierge
```

### Frontend Can't Connect to Backend

1. Ελέγξε ότι το `CORE_API_URL` στο `.env.local` είναι σωστό
2. Ελέγξε ότι το `INTERNAL_API_SECRET_KEY` είναι ίδιο και στα δύο `.env`
3. Ελέγξε ότι ο backend τρέχει στο port 18000
4. Ελέγξε CORS settings στο `backend/.env`

### Tenant Subdomain Not Working

```bash
# Verify /etc/hosts entry
cat /etc/hosts | grep demo.localhost

# Should show: 127.0.0.1 demo.localhost

# If missing, add it:
echo "127.0.0.1 demo.localhost" | sudo tee -a /etc/hosts
```

## VS Code Tasks

Το project περιλαμβάνει VS Code tasks:

- **Start Docker Services** - Start Postgres & Redis
- **Stop Docker Services** - Stop containers
- **Backend: Run Migrations** - Run Django migrations
- **Backend: Create Migrations** - Create new migrations
- **Frontend: Install Dependencies** - Install npm packages

## Workflow Tips

1. **Multi-terminal Setup:** Χρησιμοποίησε 3 terminals:
   - Terminal 1: Docker services
   - Terminal 2: Backend server
   - Terminal 3: Frontend dev server

2. **Hot Reload:** Και τα δύο tiers υποστηρίζουν hot reload:
   - Backend: Django runserver auto-reloads
   - Frontend: Next.js Turbopack hot reload

3. **Database Changes:** Μετά από migrations:
   ```bash
   cd backend
   source .venv/bin/activate
   python manage.py migrate_schemas --shared
   python manage.py migrate_schemas
   ```

4. **Clear Cache:** Αν έχεις caching issues:
   ```bash
   # Redis cache
   docker compose -f docker-compose.local.yml exec redis redis-cli FLUSHALL
   
   # Django cache
   cd backend && source .venv/bin/activate
   python manage.py shell
   >>> from django.core.cache import cache
   >>> cache.clear()
   ```

## Επόμενα Βήματα

1. ✅ Setup complete - Ready for development!
2. 🔄 Test tenant creation and access
3. 🔄 Verify API endpoints
4. 🔄 Test frontend-backend integration
5. 🔄 Setup production database mirroring (optional)

## Πηγές

- Backend Dockerfile: `backend/Dockerfile`
- Environment schema: `env.schema.example`
- Tenant creation script: `backend/scripts/create_tenant_and_migrate.py`
- Frontend config: `public-app/config.env.example`

