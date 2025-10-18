# ⚡ New Concierge - Quick Start Guide
## Get Started in 5 Minutes

### **🚀 Quick Installation**

```bash
# 1. Clone and setup
git clone https://github.com/your-org/new-concierge.git
cd new-concierge

# 2. Environment setup
cp .env.example .env
# Edit .env with your settings (minimal required)

# 3. Start services
docker compose up -d

# 4. Setup database
sleep 30
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser

# 5. Access system
echo "✅ New Concierge is ready!"
echo "🌐 Admin Panel: http://localhost:8000/admin/"
echo "📊 API: http://localhost:8000/api/"
echo "📚 Docs: http://localhost:8000/api/docs/"
```

---

## **⚙️ Minimal Environment Setup**

### **Required Variables Only**
```bash
# .env - Minimal setup
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (defaults work)
POSTGRES_PASSWORD=password123

# Email (optional for testing)
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Stripe (optional for testing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## **🎯 First Steps**

### **1. Create Super User**
```bash
docker compose exec backend python manage.py createsuperuser
# Follow prompts to create admin account
```

### **2. Access Admin Panel**
- Visit: `http://localhost:8000/admin/`
- Login with superuser credentials
- Explore the admin interface

### **3. Test API**
```bash
# Test subscription plans
curl http://localhost:8000/api/billing/plans/

# Test system health
curl http://localhost:8000/api/admin/system-health/
```

### **4. Create Test Users**
```bash
# Create manager
docker compose exec backend python manage.py shell
>>> from users.models import CustomUser
>>> from django.contrib.auth.models import Group
>>> manager = CustomUser.objects.create_user(
...     email='manager@test.com',
...     password='testpass123',
...     first_name='Test',
...     last_name='Manager'
... )
>>> manager.groups.add(Group.objects.get(name='Manager'))
```

---

## **📚 Next Steps**

1. **Read Documentation**: Check `USER_GUIDES.md` for detailed instructions
2. **Configure Stripe**: Set up payment processing in `DEPLOYMENT_GUIDE.md`
3. **Test Features**: Use `API_TESTING_GUIDE.md` for comprehensive testing
4. **Production Setup**: Follow `DEPLOYMENT_GUIDE.md` for production deployment

---

## **🔧 Common Commands**

```bash
# View logs
docker compose logs -f backend

# Restart services
docker compose restart

# Access database
docker compose exec db psql -U postgres new_concierge

# Run Django shell
docker compose exec backend python manage.py shell

# Collect static files
docker compose exec backend python manage.py collectstatic
```

---

## **❓ Need Help?**

- **📖 User Guides**: `USER_GUIDES.md`
- **⚙️ System Admin**: `SYSTEM_ADMINISTRATION_GUIDE.md`
- **🧪 API Testing**: `API_TESTING_GUIDE.md`
- **🚀 Full Deployment**: `DEPLOYMENT_GUIDE.md`

**Welcome to New Concierge!** 🎉


