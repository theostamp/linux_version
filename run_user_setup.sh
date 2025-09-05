#!/bin/bash

echo "👥 Setting up Demo Users"
echo "======================="

# Copy the user setup script to the container
echo "📋 Copying user setup script to container..."
docker cp check_demo_users.py linux_version-backend-1:/app/

# Execute the script inside the container
echo "🔧 Creating demo users inside Docker container..."
docker exec -it linux_version-backend-1 python /app/check_demo_users.py

echo ""
echo "🎯 Demo Login Credentials:"
echo "========================="
echo "Admin:   admin@demo.localhost   / admin123"
echo "Manager: manager@demo.localhost / manager123"
echo "Tenant:  tenant@demo.localhost  / tenant123"
echo ""
echo "🌐 Try logging in at: http://demo.localhost:8080"
