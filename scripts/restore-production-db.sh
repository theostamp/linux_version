#!/bin/bash

# Production Database Mirroring Script
# Restores production database dump to local development database

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 Production Database Mirroring${NC}"
echo "============================================"

# Check if dump file is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: $0 <dump_file.sql>${NC}"
    echo ""
    echo "Example:"
    echo "  $0 production_dump.sql"
    echo ""
    echo "To create a dump from production:"
    echo "  pg_dump -h <host> -U <user> -d <database> > production_dump.sql"
    exit 1
fi

DUMP_FILE="$1"

if [ ! -f "$DUMP_FILE" ]; then
    echo -e "${RED}❌ Dump file not found: $DUMP_FILE${NC}"
    exit 1
fi

echo -e "\n${YELLOW}This will replace your local database with production data!${NC}"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

# Check if Docker containers are running
if ! docker compose -f docker-compose.local.yml ps | grep -q "Up"; then
    echo -e "${YELLOW}Starting Docker containers...${NC}"
    docker compose -f docker-compose.local.yml up -d db redis
    echo "Waiting for database to be ready..."
    sleep 5
fi

# Database connection details
DB_HOST="localhost"
DB_PORT="5433"
DB_NAME="newconcierge"
DB_USER="newconcierge"
DB_PASSWORD="newconcierge"

echo -e "\n${YELLOW}Step 1: Dropping existing database...${NC}"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"

echo -e "\n${YELLOW}Step 2: Creating fresh database...${NC}"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"

echo -e "\n${YELLOW}Step 3: Restoring dump file...${NC}"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$DUMP_FILE"

echo -e "\n${YELLOW}Step 4: Running Django migrations...${NC}"
cd "$PROJECT_ROOT/backend"

if [ ! -d ".venv" ]; then
    echo -e "${RED}❌ Virtual environment not found. Run setup-local-dev.sh first.${NC}"
    exit 1
fi

source .venv/bin/activate

# Run migrations to ensure schema is up to date
python manage.py migrate_schemas --shared --noinput
python manage.py migrate_schemas --noinput

echo -e "\n${YELLOW}Step 5: Clearing sessions...${NC}"
python manage.py clearsessions

echo -e "\n${YELLOW}Step 6: Collecting static files...${NC}"
python manage.py collectstatic --noinput

echo -e "\n${GREEN}✅ Database restoration complete!${NC}"
echo ""
echo "Note: You may need to update DJANGO_ALLOWED_HOSTS and CSRF_TRUSTED_ORIGINS"
echo "in backend/.env if you're accessing via production domains."

