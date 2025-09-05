#!/bin/bash

echo "🔍 Debugging Login 400 Error"
echo "============================="

# First, create demo users
echo "👥 Setting up demo users..."
docker cp check_demo_users.py linux_version-backend-1:/app/
docker exec linux_version-backend-1 python /app/check_demo_users.py

echo ""
echo "📋 Checking backend logs for 400 errors..."
echo "==========================================="
docker logs --tail 20 linux_version-backend-1 | grep -E "(400|ERROR|login|POST)"

echo ""
echo "🧪 Testing login endpoint directly..."
echo "===================================="
curl -X POST http://demo.localhost:8000/api/users/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.localhost","password":"admin123"}' \
  -v

echo ""
echo "🔍 Checking if users exist in demo schema..."
echo "==========================================="
docker exec linux_version-backend-1 python -c "
import os, sys, django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()
from django_tenants.utils import schema_context
from users.models import CustomUser

with schema_context('demo'):
    users = CustomUser.objects.all()
    print(f'Total users: {users.count()}')
    for user in users:
        print(f'  - {user.email} (active: {user.is_active})')
"

echo ""
echo "🎯 Correct Login Credentials:"
echo "============================"
echo "Email:    admin@demo.localhost"
echo "Password: admin123"
echo ""
echo "🌐 Frontend: http://demo.localhost:8080"
