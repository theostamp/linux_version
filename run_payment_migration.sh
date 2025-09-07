#!/bin/bash

echo "🚀 Creating Payment Models Migration"
echo "===================================="

# Copy the migration script to Docker container
echo "📁 Copying migration script to container..."
docker cp create_payment_models_migration.py linux_version-backend-1:/app/

# Execute the migration creation script
echo "🔄 Creating migration inside Docker container..."
docker exec -it linux_version-backend-1 python /app/create_payment_models_migration.py

# Check if migration was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration script executed successfully!"
    echo ""
    echo "🔄 Applying migrations..."
    docker exec -it linux_version-backend-1 python manage.py migrate maintenance
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 Payment models migration completed successfully!"
        echo ""
        echo "📋 Next steps:"
        echo "1. Update Django admin to register new models"
        echo "2. Create API serializers and viewsets"
        echo "3. Add payment functionality to frontend"
    else
        echo "❌ Migration application failed!"
        exit 1
    fi
else
    echo "❌ Migration creation failed!"
    exit 1
fi
