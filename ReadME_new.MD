

docker compose exec backend python scripts/initial_user_setup.py
docker compose exec backend python manage.py migrate 
docker compose exec backend python manage.py makemigrations


docker compose exec backend python manage.py migrate_schemas --shared
docker compose exec backend python manage.py migrate_schemas --tenant --schema=public


<!-- add new tenant     -->
 docker compose exec backend   python scripts/create_tenant_auto.py neo          --manager-email manager@neo.com          --manager-password neo12345     # προαιρετικό

find . -name "*.py" -exec sed -i '/^from django\|^import django/ s/$/  /' {} +


docker compose exec backend python manage.py migrate_schemas --shared
docker compose exec backend python manage.py migrate_schemas --tenant --schema=public


docker compose exec backend python manage.py  makemigrations

docker compose exec backend python manage.py  makemigrations announcements
docker compose exec backend python manage.py  migrate announcements

docker compose exec backend python manage.py migrate_schemas --tenant --schema=public
docker compose exec backend python manage.py migrate_schemas --shared
docker compose exec backend python manage.py migrate_schemas --tenant --schema=public




docker compose exec backend  python  scripts/create_tenant_and_migrate.py --name=manager8

Για περισσότερους tenants: Μπορείς να δημιουργήσεις όσους Office Managers θέλεις, π.χ.:

docker compose exec backend  python create_tenant.py city1 "Αθήνα Διαχείριση" city1.localhost city1@example.com



στο local
sudo rm -rf .next
sudo rm -rf node_modules
sudo rm package-lock.json
sudo npm run clean
sudo npm install
sudo npm run build

στο docker containersh
docker compose exec frontend sh -c "rm -rf .next && rm -rf node_modules && rm package-lock.json && npm run clean && npm install && npm run build"

 rm -rf .next

 rm -rf node_modules

 rm package-lock.json

 npm run clean

 npm install

 npm run build

docker compose exec frontend sh -c "rm -rf .next && rm -rf node_modules && rm package-lock.json && npm run clean && npm install && npm run build"

