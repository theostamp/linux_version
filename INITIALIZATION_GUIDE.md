# 🚀 Django Tenants Project - Οδηγός Αρχικοποίησης

## 📋 Σύνοψη

Το project έχει αρχικοποιηθεί επιτυχώς με:
- ✅ **Public Tenant** (shared schema)
- ✅ **Sample Tenant** (athinon12)
- ✅ **Superuser** 
- ✅ **Sample Buildings & Users**
- ✅ **Database Migrations**

## 🏗️ Αρχιτεκτονική

### Shared Apps (Public Schema)
- `django_tenants` - Multi-tenancy
- `tenants` - Client & Domain models
- `users` - Custom User model
- `django.contrib.*` - Core Django apps

### Tenant Apps (Per Tenant Schema)
- `buildings` - Building management
- `announcements` - Building announcements
- `user_requests` - Resident requests
- `votes` - Voting system
- `residents` - Resident management
- `obligations` - Financial obligations
- `public_info` - Public information

## 🗄️ Database Schema

### Public Schema
- `tenants_client` - Tenant information
- `tenants_domain` - Domain mapping
- `users_customuser` - Global users

### Tenant Schema (athinon12)
- `buildings_building` - Building data
- `buildings_buildingmembership` - User-Building relationships
- `users_customuser` - Tenant-specific users

## 🔑 Access Credentials

### Superuser (Global Admin)
- **Email:** theostam1966@gmail.com
- **Password:** admin123

### Tenant Users (athinon12)
- **Manager:** manager@athinon12.localhost / changeme123
- **Resident1:** resident1@athinon12.localhost / changeme123
- **Resident2:** resident2@athinon12.localhost / changeme123

## 🌐 Access URLs

### Public (Global)
- **Admin:** http://localhost:8000/admin/
- **API:** http://localhost:8000/api/

### Tenant (athinon12)
- **Admin:** http://athinon12.localhost:8000/admin/
- **API:** http://athinon12.localhost:8000/api/

### Frontend
- **Main:** http://localhost:8080/

## 📊 Sample Data

### Buildings (3)
1. **Αθηνών 12** - 24 διαμερίσματα
2. **Πατησίων 45** - 16 διαμερίσματα  
3. **Σόλωνος 8** - 12 διαμερίσματα

### Users (5 total)
- 1 Superuser (global)
- 1 Admin (tenant)
- 3 Residents (tenant)

### Memberships (3)
- Resident1 → Αθηνών 12 (A1)
- Resident2 → Πατησίων 45 (B2)
- Manager → Σόλωνος 8 (C3)

## 🛠️ Development Commands

### Check Project Status
```bash
docker-compose run --rm backend python project_status.py
```

### Check Shared Data
```bash
docker-compose run --rm backend python check_shared_data.py
```

### Check Tenant Data
```bash
docker-compose run --rm backend python check_data.py athinon12
```

### Create New Tenant
```bash
docker-compose run --rm backend python create_tenant.py <schema> <name> <domain> <email>
```

### Create Sample Data for Tenant
```bash
docker-compose run --rm backend python create_sample_data.py <schema>
```

### Django Shell (Public)
```bash
docker-compose run --rm backend python manage.py shell
```

### Django Shell (Tenant)
```bash
docker-compose run --rm backend python manage.py shell_plus --schema=athinon12
```

## 🔄 Database Operations

### Shared Migrations
```bash
docker-compose exec backend python manage.py migrate_schemas --shared
```

### Tenant Migrations
```bash
docker-compose exec backend python manage.py migrate_schemas --tenant
```

### Create Superuser
```bash
docker-compose run --rm backend python create_superuser.py
```

## 📁 File Structure

```
backend/
├── create_superuser.py      # Superuser creation
├── create_tenant.py         # Tenant creation
├── create_sample_data.py    # Sample data generation
├── check_data.py           # Tenant data verification
├── check_shared_data.py    # Shared data verification
├── project_status.py       # Overall project status
├── buildings/              # Building management app
├── tenants/                # Multi-tenancy app
├── users/                  # Custom user app
└── new_concierge_backend/  # Django settings
```

## 🚨 Important Notes

1. **Tenant Isolation:** Κάθε tenant έχει ξεχωριστό schema στη βάση
2. **User Separation:** Users μπορούν να υπάρχουν και στο public και στα tenants
3. **Domain Mapping:** Κάθε tenant έχει το δικό του subdomain
4. **Data Access:** Χρησιμοποιήστε `tenant_context()` για tenant-specific operations

## 🎯 Next Steps

1. **API Development:** Δημιουργία REST APIs για κάθε app
2. **Frontend Integration:** Σύνδεση με Next.js frontend
3. **Authentication:** JWT token implementation
4. **Permissions:** Role-based access control
5. **Testing:** Unit και integration tests

## 🔧 Troubleshooting

### Container Issues
```bash
# Rebuild containers
docker-compose build --no-cache

# Restart services
docker-compose restart

# Check logs
docker-compose logs backend
```

### Database Issues
```bash
# Reset database
docker-compose down -v
docker-compose up -d db
docker-compose run --rm backend python manage.py migrate_schemas --shared
```

### Permission Issues
```bash
# Fix entrypoint permissions
chmod +x backend/entrypoint.sh
dos2unix backend/entrypoint.sh
```

---

**✅ Project αρχικοποιήθηκε επιτυχώς! Μπορείτε να ξεκινήσετε την ανάπτυξη!** 