# Οδηγός Εκκίνησης & Διαχείρισης (linux_version)

## 🐧 WSL Ubuntu Terminal Configuration

Το project έχει ρυθμιστεί για να χρησιμοποιεί το WSL Ubuntu ως default terminal αντί για PowerShell.

### Ρυθμίσεις VS Code:
- **Default Terminal**: WSL Ubuntu
- **Debugging**: Ρυθμισμένο για WSL environment
- **Tasks**: Όλες οι εργασίες τρέχουν στο WSL

### Χρήση:
1. **Terminal**: `Ctrl + `` (ανοίγει το WSL Ubuntu terminal)
2. **Tasks**: `Ctrl + Shift + P` → "Tasks: Run Task" → επιλέξτε εργασία
3. **Debugging**: `F5` → επιλέξτε "Python: Current File (WSL)" ή "Django: Run Server (WSL)"

### Διαθέσιμες Εργασίες:
- `Docker Compose Up`: Εκκίνηση των containers
- `Docker Compose Down`: Διακοπή των containers  
- `Django Migrate`: Εκτέλεση migrations
- `Frontend Dev`: Εκκίνηση του frontend development server

---

## 1. Δημιουργία και Εφαρμογή Migrations (Django Tenants)

### (α) Δημιουργία αρχείων migration για tenants
```sh
docker compose exec backend python manage.py makemigrations tenants
```

### (β) Εκτέλεση μόνο των shared migrations (Client & Domain)
```sh
docker compose exec backend python manage.py migrate_schemas --shared --noinput
```

```python
docker compose exec backend python manage.py shell -c "
from tenants.models import Client, Domain
public, _ = Client.objects.get_or_create(schema_name='public',
                                         defaults={'name':'Public'})
Domain.objects.get_or_create(domain='localhost', tenant=public,
                             defaults={'is_primary':True})
print('✅ localhost → public tenant ready')
"
```
### (γ) Εκτέλεση migrations για όλους τους tenants

```python
docker compose exec backend python manage.py shell -c "
from tenants.models import Client, Domain
public = Client.objects.get(schema_name='public')
Domain.objects.get_or_create(domain='localhost', tenant=public,
                             defaults={'is_primary': True})
print('✅ domain localhost → public tenant added')
"
```
```sh
docker compose exec backend python manage.py migrate_schemas --tenant --noinput
```

```sh
python manage.py createsuperuser
```

# Makefile για unified commands (root folder) -->

# Makefile

up:
	docker-compose up --build

down:
	docker-compose down

logs:
	docker-compose logs -f

migrate:
	docker-compose exec backend python manage.py migrate

createsuperuser:
	docker-compose exec backend python manage.py createsuperuser



//////3
make up



# Εκτέλεση test
docker-compose exec backend pytest



cd C:\Users\thodo\digital_concierge\frontend    

npm install next@14

npm install next@latest
npm install react@18.2.0 react-dom@18.2.0




cd frontend
docker start new_concierge-backend-1

docker exec -it new_concierge-backend-1 /bin/sh
cd /app/backend
mkdir -p user_requests/migrations
echo > user_requests/migrations/__init__.py


theostam1966@gmail.com

docker exec -it new_concierge-backend-1 /bin/sh
cd /app/backend
mkdir -p user_requests/migrations
echo > user_requests/migrations/__init__.py



docker exec -it new_concierge-backend-1 /bin/sh
cd /app/backend
mkdir -p user_requests/migrations
echo > user_requests/migrations/__init__.py


cd frontend
Remove-Item -Recurse -Force .next
npm run build
npm run dev

cd frontend
npm run dev


<!-- προτεινόμενο flow σε production ή μέσα σε Docker. -->
npm ci
npm run build
npm run start


<!-- diagrafh olvn  -->


sudo find . -name "*.pyc" -delete
sudo find . -name "__pycache__" -type d -exec rm -r {} +
sudo find . -path "*/migrations/*.py" -not -name "__init__.py" -delete

docker compose up -d
./scripts/reset.sh
<!-- diagrafh olvn  -->
Σβήνουμε όλα τα migration αρχεία σε κάθε app
Σε κάθε φάκελο migrations/ (εκτός __init__.py), διαγράφεις όλα τα αρχεία .py.

find . -path "*/migrations/*.py" -not -name "__init__.py" -delete



-

# Δημιουργούμε όλες τις απαραίτητες migrations
python manage.py makemigrations

# Κάνουμε migrate στη public βάση (shared apps)
python manage.py migrate
python manage.py migrate announcements

# Κάνουμε migrate στο shared schema (δηλαδή τα public tables στους tenants)
python manage.py migrate_schemas --shared

# Δημιουργούμε tenants (αν δεν υπάρχουν)

# Κάνουμε migrate όλα τα tenants (tenant-specific apps)
python manage.py migrate_schemas --tenant


python manage.py makemigrations user_requests
python manage.py makemigrations users
python manage.py migrate

python manage.py makemigrations
python manage.py migrate


# Φτιάχνουμε διαχειριστή
python manage.py createsuperuser 

npm install
npm run dev 

python manage.py migrate
python manage.py makemigrations

python manage.py createsuperuser




echo "# linux_version" >> README.md
git init

git add .
git commit -m "επισημανση αιτηματων"  
git branch -M main
git remote add origin https://github.com/theostamp/linux_version.git
git push -u origin main

git push --force

cd frontend
npm install
npm run build
npm run dev



docker compose exec python manage.py shell < scripts/reset_and_create_tenant.py


Get-Content scripts/reset_and_create_tenant.py | docker compose exec -T web python manage.py shell




# Διακοπή και διαγραφή όλων των containers
docker-compose down --volumes --remove-orphans

# Εάν έχεις standalone containers που δεν είναι μέρος του docker-compose
docker stop $(docker ps -a -q)
docker rm $(docker ps -a -q)

# Διαγραφή volumes που δεν χρησιμοποιούνται
docker volume prune -f

# Διαγραφή δικτύων που δημιουργήθηκαν από το Docker Compose
docker network prune -f
docker system prune -a --volumes

docker volume rm $(docker volume ls -q)
docker network rm $(docker network ls -q)
docker builder prune -af



docker-compose down
docker-compose up --build


docker-compose down
docker image prune -a
docker image prune -a -f
docker system prune -a --volumes

docker rm $(docker ps -aq)
docker rmi $(docker images -q)
docker volume rm $(docker volume ls -q)
docker network rm $(docker network ls -q)
docker system prune -a

docker-compose down
docker-compose up --build


python manage.py exporttree --output dev_tree.md