docker compose exec db psql -U postgres

\dn


DROP TABLE IF EXISTS public.users_customuser CASCADE;
DROP TABLE IF EXISTS public.users_customuser_groups CASCADE;
DROP TABLE IF EXISTS public.users_customuser_user_permissions CASCADE;
DROP TABLE IF EXISTS public.obligations_obligation CASCADE;
DROP TABLE IF EXISTS public.residents_resident CASCADE;
DROP TABLE IF EXISTS public.buildings_building CASCADE;
DROP TABLE IF EXISTS public.announcements_announcement CASCADE;
DROP TABLE IF EXISTS public.user_requests_userrequest CASCADE;
DROP TABLE IF EXISTS public.votes_vote CASCADE;
-- Πρόσθεσε ό,τι άλλο έχεις από custom tables στο public schema

-- Μπορείς να κάνεις:
-- \dt public.*
-- για να δεις ΟΛΟΥΣ τους πίνακες και να σβήσεις όποιον δεν πρέπει να υπάρχει στο public.




DROP SCHEMA galatsi CASCADE;
\dn


docker compose exec backend python scripts/delete_tenant.py galatsi
docker compose exec backend python scripts/create_tenant_and_migrate.py galatsi


docker compose exec backend python scripts/create_tenant_and_migrate.py mytenant -p mypass123 \
    --manager-email=admin@mytenant.com \
    --resident-email=user@mytenant.com \
    --resident-password=residentpass
