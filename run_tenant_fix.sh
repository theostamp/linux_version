#!/bin/bash

echo "🚀 Fixing Demo Tenant Configuration"
echo "===================================="

# Check if Docker containers are running
echo "📦 Checking Docker containers..."
if ! docker ps | grep -q "linux_version-backend-1"; then
    echo "❌ Backend container is not running"
    echo "💡 Starting containers..."
    docker-compose up -d
    sleep 10
fi

# Copy the fix script to the container
echo "📋 Copying tenant fix script to container..."
docker cp fix_demo_tenant.py linux_version-backend-1:/app/

# Execute the script inside the container
echo "🔧 Executing tenant fix inside Docker container..."
docker exec -it linux_version-backend-1 python /app/fix_demo_tenant.py

# Check the result
echo ""
echo "🧪 Testing tenant configuration..."
docker exec linux_version-backend-1 python -c "
import os, sys, django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()
from tenants.models import Domain
domains = Domain.objects.filter(domain='demo.localhost')
if domains.exists():
    print('✅ demo.localhost domain is configured')
else:
    print('❌ demo.localhost domain not found')
"

echo ""
echo "🎯 Next Steps:"
echo "1. Refresh your browser at demo.localhost:8080"
echo "2. The login should now work properly"
echo "3. If issues persist, check backend logs: docker logs linux_version-backend-1"
