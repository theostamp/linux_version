

## 📤 Ενημέρωση GitHub Repository

## Βασικές Εντολές Git
Για ΜΕΓΑΛΕΣ αλλαγές (financial logic, critical features):

# 1. Τρέξε critical tests
cd linux_version
./run_tests_before_commit.sh

# 2. Restart containers & smoke test
docker-compose restart backend frontend
sleep 30
# Δοκίμασε στο browser

# 3. Έλεγξε logs για errors
docker logs linux_version-backend-1 --tail 50

# 4. Αν όλα OK:
git add .
git commit -m "feat: Major overall update"

git add .
git commit -m "fix κιοσκ "

cd linux_version
./run_tests_before_commit.sh

git branch -M main 
git remote add origin https://github.com/theostamp/linux_version.git
git push -u origin main

git branch -M main 
git remote add origin https://github.com/theostamp/Public-App.git
git push -u origin main
---



git reset --hard :::6fb119f

### Πλήρης Καθαρισμός Docker
```bash

docker stop $(docker ps -aq)

docker rm $(docker ps -aq)
docker volume prune -f
docker network prune -f
docker builder prune -af
docker system prune -af --volumes

docker compose up --build -d

