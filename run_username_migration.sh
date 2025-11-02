#!/bin/bash

echo "=========================================="
echo "🚀 Username Field Migration - Full Process"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Copy migration scripts to container
echo "📦 Step 1: Copying migration scripts to container..."
docker cp backend/create_username_migration.py linux_version-backend-1:/app/
docker cp backend/migrate_existing_users.py linux_version-backend-1:/app/

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Scripts copied successfully${NC}"
else
    echo -e "${RED}✗ Failed to copy scripts${NC}"
    exit 1
fi
echo ""

# Step 2: Create the migration file
echo "📝 Step 2: Creating Django migration file..."
docker exec -it linux_version-backend-1 python /app/create_username_migration.py

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migration file created${NC}"
else
    echo -e "${RED}✗ Failed to create migration${NC}"
    exit 1
fi
echo ""

# Step 3: Show the migration file (for review)
echo "👀 Step 3: Reviewing migration file..."
echo -e "${YELLOW}Please review the migration file below:${NC}"
echo "----------------------------------------"
docker exec linux_version-backend-1 find /app/users/migrations/ -name "*username*" -type f -exec cat {} \;
echo "----------------------------------------"
echo ""

# Ask for confirmation
echo -e "${YELLOW}⚠️  IMPORTANT: Review the migration above${NC}"
echo "Do you want to proceed with applying the migration? (y/n)"
read -p "> " confirmation

if [ "$confirmation" != "y" ]; then
    echo -e "${YELLOW}Migration cancelled by user${NC}"
    exit 0
fi
echo ""

# Step 4: Apply the migration
echo "🔧 Step 4: Applying migration to database..."
docker exec -it linux_version-backend-1 python manage.py migrate users

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migration applied successfully${NC}"
else
    echo -e "${RED}✗ Failed to apply migration${NC}"
    exit 1
fi
echo ""

# Step 5: Migrate existing users
echo "👥 Step 5: Migrating existing users to have usernames..."
docker exec -it linux_version-backend-1 python /app/migrate_existing_users.py

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Existing users migrated successfully${NC}"
else
    echo -e "${RED}✗ Failed to migrate existing users${NC}"
    echo -e "${YELLOW}Note: This might be OK if there are no existing users${NC}"
fi
echo ""

# Step 6: Verify the migration
echo "✅ Step 6: Verifying migration..."
echo "Checking if username field exists in CustomUser model..."
docker exec linux_version-backend-1 python manage.py shell -c "from users.models import CustomUser; print(f'Username field exists: {hasattr(CustomUser, \"username\")}'); print(f'Total users: {CustomUser.objects.count()}'); print(f'Users with username: {CustomUser.objects.exclude(username__isnull=True).exclude(username=\"\").count()}')"

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 Migration Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Test user registration with username"
echo "2. Deploy frontend changes"
echo "3. Monitor for any issues"
echo ""

