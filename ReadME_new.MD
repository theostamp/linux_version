docker compose exec backend python manage.py migrate_schemas --shared
docker compose exec backend python manage.py migrate_schemas --tenant --schema=public


docker compose exec backend python scripts/initial_user_setup.py


rm -rf .next
npm run build
npm run dev


rm -rf .next
rm -rf node_modules/.cache
npx tsc --noEmit
npm run build
npm run dev
