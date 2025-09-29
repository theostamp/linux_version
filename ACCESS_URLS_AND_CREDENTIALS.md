# 🔑 Digital Concierge - URLs & Credentials Guide
> Πλήρης οδηγός πρόσβασης στο σύστημα

## 🌐 URLs Πρόσβασης

### 📱 Frontend (Χρήστες)
- **URL**: http://demo.localhost:3001
- **Περιγραφή**: Η κύρια εφαρμογή για τους χρήστες
- **Σημείωση**: Το port 3001 είναι το external port που εκτίθεται από το Docker

### 🔧 Backend API
- **URL**: http://demo.localhost:8000/api/
- **Internal (Docker)**: http://backend:8000/api/
- **External**: http://127.0.0.1:18000/api/
- **Περιγραφή**: RESTful API endpoints

### 👨‍💼 Django Admin Panel
- **Public Admin**: http://localhost:8000/admin/
- **Demo Admin**: http://demo.localhost:8000/admin/
- **Περιγραφή**: Django administration interface

### 📊 Monitoring Tools
- **Flower (Celery)**: http://localhost:5555
- **PostgreSQL**: localhost:15432
- **Redis**: localhost:6379

## 👥 User Credentials

### 🔴 Ultra-Superuser (Διαχείριση όλων των tenants)
```
Email: theostam1966@gmail.com
Password: theo123!@#
Δικαιώματα: Πλήρη διαχείριση όλων των tenants
URL: http://localhost:8000/admin/
```

### 🟠 Demo Tenant Admin
```
Email: admin@demo.localhost
Password: admin123456
Δικαιώματα: Πλήρη admin πρόσβαση στο demo tenant
URL: http://demo.localhost:8000/admin/
```

### 🟡 Manager (Διαχειριστής Κτιρίου)
```
Email: manager@demo.localhost
Password: manager123456
Δικαιώματα: Περιορισμένα admin δικαιώματα
Role: Manager
```

### 🟢 Residents (Κάτοικοι)
```
Resident 1:
Email: resident1@demo.localhost
Password: resident123456
Role: Resident

Resident 2:
Email: resident2@demo.localhost
Password: resident123456
Role: Owner
```

## 🏢 Demo Building Data

### Κτίριο: Αλκμάνος 22
- **Διεύθυνση**: Αλκμάνος 22, Αθήνα 115 28, Ελλάδα
- **Διαχειριστής**: Μαρία Κωνσταντίνου
- **Τηλ**: 2101234567
- **Διαμερίσματα**: 10
- **Όροφοι**: 5 (0-4)

## 🚀 Quick Start Commands

### Εκκίνηση Συστήματος
```bash
# Γρήγορη εκκίνηση
./quick_start.sh

# Πλήρης εκκίνηση με Docker
docker-compose up --build -d

# Μόνο backend
./run_backend.sh

# Μόνο frontend
./run_frontend.sh
```

### Frontend Warm-up (για γρήγορη φόρτωση)
```bash
# Manual warm-up
python3 backend/scripts/warm_up_frontend.py

# Automatic (runs on startup)
# Configured in backend/entrypoint.sh
```

## 📋 Port Mapping Summary

| Service | Internal Port | External Port | Access URL |
|---------|---------------|---------------|------------|
| Frontend | 3000 | 3001 | http://demo.localhost:3001 |
| Backend | 8000 | 18000 | http://127.0.0.1:18000 |
| PostgreSQL | 5432 | 15432 | localhost:15432 |
| Redis | 6379 | 6379 | localhost:6379 |
| Flower | 5555 | 5555 | http://localhost:5555 |

## 🔄 Docker Network Communication

### Internal Network Names (για container-to-container)
- **Frontend**: `frontend:3000`
- **Backend**: `backend:8000`
- **Database**: `db:5432`
- **Redis**: `redis:6379`

### Environment Variables
```env
# Frontend connects to backend internally
NEXT_PUBLIC_API_URL=http://backend:8000/api

# Database connection
DATABASE_URL=postgresql://concierge_user:securepassword123!@db:5432/concierge_db

# Redis
REDIS_URL=redis://redis:6379/0
```

## ⚠️ Σημαντικές Σημειώσεις

1. **Multi-tenancy**: Το σύστημα χρησιμοποιεί schema-based multi-tenancy
   - Public schema: `localhost`
   - Demo schema: `demo.localhost`

2. **First Load**: Η πρώτη φόρτωση του frontend παίρνει ~50 δευτερόλεπτα (Next.js compilation)
   - Μετά το warm-up: <1 δευτερόλεπτο

3. **Auto-initialization**: Το σύστημα αρχικοποιείται αυτόματα με την εκκίνηση
   - Δημιουργεί tenants, users, και demo data
   - Τρέχει migrations αυτόματα

4. **Authentication**: JWT tokens με 30-λεπτη διάρκεια για access tokens

## 🆘 Troubleshooting

### Frontend δεν φορτώνει
```bash
# Check container status
docker ps

# Check logs
docker logs linux_version-frontend-1

# Restart frontend
docker restart linux_version-frontend-1
```

### Backend API errors
```bash
# Check backend logs
docker logs linux_version-backend-1

# Check database connection
docker exec -it linux_version-backend-1 python manage.py dbshell
```

### Database issues
```bash
# Connect to database
docker exec -it linux_version-db-1 psql -U concierge_user -d concierge_db

# Run migrations manually
docker exec -it linux_version-backend-1 python manage.py migrate
```

## 📝 Demo Workflow

1. **Login**: http://demo.localhost:3001
   - Use any of the demo credentials above

2. **Dashboard**: Automatic redirect after login

3. **Main Features**:
   - 💰 Financial Management
   - 🏠 Apartments & Buildings
   - 🔧 Maintenance & Projects
   - 📢 Announcements
   - 🗳️ Voting System

## 🔐 Security Notes

- Όλα τα passwords είναι για development/demo χρήση μόνο
- Στο production πρέπει να αλλάξουν όλα τα credentials
- Χρήση HTTPS σε production environment
- Environment variables για sensitive data

---

Last Updated: September 2025
Version: 1.0