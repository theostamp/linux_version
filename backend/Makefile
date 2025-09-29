# Makefile στη ρίζα του backend (π.χ. ~/projects/digital_concierge/Makefile)

.PHONY: clean build up down logs shell makemigrations migrate-shared create-tenant delete-tenant

clean:
	docker compose down -v
	find . -path "*/migrations/*.py" -not -name "__init__.py" -delete
	find . -path "*/migrations/*.pyc" -delete

build:
	docker compose build --no-cache

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs backend

shell:
	docker compose exec backend bash

makemigrations:
	docker compose exec backend python manage.py makemigrations

migrate-shared:
	docker compose exec backend python manage.py migrate_schemas --shared

create-tenant:
	# Πέρασε ό,τι θες ως όνομα tenant π.χ. make create-tenant name=galatsi
	docker compose exec backend python backend/scripts/create_tenant_and_migrate.py $(name) --password $(password)

delete-tenant:
	# Πέρασε ό,τι θες ως όνομα tenant π.χ. make delete-tenant name=galatsi
	docker compose exec backend python backend/scripts/delete_tenant.py $(name)
