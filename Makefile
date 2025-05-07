# Makefile for Digital Concierge using docker compose v2

PROJECT_NAME=newconcierge

# === Basic Commands ===
up:
	docker compose -p $(PROJECT_NAME) up --build

down:
	docker compose -p $(PROJECT_NAME) down

restart:
	docker compose -p $(PROJECT_NAME) down && docker compose -p $(PROJECT_NAME) up --build

clean:
	docker compose -p $(PROJECT_NAME) down -v --remove-orphans

# === Django Management ===
migrate:
	docker compose -p $(PROJECT_NAME) exec backend python manage.py migrate

makemigrations:
	docker compose -p $(PROJECT_NAME) exec backend python manage.py makemigrations

createsuperuser:
	@echo "🛠 Δημιουργία superuser από .env"
	docker compose -p $(PROJECT_NAME) exec backend python manage.py shell -c "\
from django.contrib.auth import get_user_model;\
User = get_user_model();\
User.objects.update_or_create(\
	email='${DJANGO_SUPERUSER_EMAIL}',\
	defaults={\
		'first_name': '${DJANGO_SUPERUSER_FIRSTNAME}',\
		'last_name': '${DJANGO_SUPERUSER_LASTNAME}',\
		'is_staff': True,\
		'is_superuser': True\
	},\
)"

collectstatic:
	docker compose -p $(PROJECT_NAME) exec backend python manage.py collectstatic --noinput

# === Utilities ===
logs:
	docker compose -p $(PROJECT_NAME) logs -f

ps:
	docker compose -p $(PROJECT_NAME) ps

shell:
	docker compose -p $(PROJECT_NAME) exec backend bash

frontend:
	docker compose -p $(PROJECT_NAME) exec frontend bash

# === Testing ===
test:
	docker compose -p $(PROJECT_NAME) exec backend pytest -v --disable-warnings

# === Custom startup using dynamic wsgi detection ===
start:
	docker compose -p $(PROJECT_NAME) exec backend ./start.sh

fix-permissions:
	sudo chown -R $$(whoami):$$(whoami) .
