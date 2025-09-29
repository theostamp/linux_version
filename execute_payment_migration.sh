#!/bin/bash

# Execute Payment Migration Script
# This script creates and applies the payment models migration

set -e  # Exit on any error

echo "🚀 Starting Payment Migration Process..."

# Check if Docker containers are running
echo "📋 Checking Docker container status..."
if ! docker ps | grep -q "linux_version-backend-1"; then
    echo "❌ Backend container is not running. Starting containers..."
    docker-compose up -d
    sleep 10
fi

# Create the migration script
echo "📝 Creating migration script..."
cat > create_payment_migration.py << 'EOF'
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.core.management import execute_from_command_line

print("Creating payment models migration...")
execute_from_command_line(['manage.py', 'makemigrations', 'maintenance', '--name', 'add_payment_models'])
print("Migration created successfully!")
EOF

# Copy migration script to container
echo "📤 Copying migration script to container..."
docker cp create_payment_migration.py linux_version-backend-1:/app/

# Execute migration creation
echo "🔧 Creating migration..."
docker exec -it linux_version-backend-1 python /app/create_payment_migration.py

# Apply the migration
echo "🔄 Applying migration..."
docker exec -it linux_version-backend-1 python manage.py migrate maintenance

# Verify migration
echo "✅ Verifying migration..."
docker exec -it linux_version-backend-1 python manage.py showmigrations maintenance

# Clean up
echo "🧹 Cleaning up..."
rm -f create_payment_migration.py

echo "🎉 Payment migration completed successfully!"
echo ""
echo "📋 New tables created:"
echo "  - maintenance_paymentschedule"
echo "  - maintenance_paymentinstallment" 
echo "  - maintenance_paymentreceipt"
echo ""
echo "🔗 API endpoints now available:"
echo "  - /api/maintenance/payment-schedules/"
echo "  - /api/maintenance/payment-installments/"
echo "  - /api/maintenance/payment-receipts/"
