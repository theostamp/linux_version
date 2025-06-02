docker compose exec db psql -U postgres
\dn

DROP SCHEMA galatsi CASCADE;
\dn


docker compose exec backend python scripts/delete_tenant.py galatsi
docker compose exec backend python scripts/create_tenant_and_migrate.py galatsi


docker compose exec backend python scripts/create_tenant_and_migrate.py mytenant -p mypass123 \
    --manager-email=admin@mytenant.com \
    --resident-email=user@mytenant.com \
    --resident-password=residentpass
