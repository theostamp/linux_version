.PHONY: up down restart logs migrate createsuperuser collectstatic shell test

up:
    docker-compose up --build

down:
    docker-compose down

restart:
    docker-compose down && docker-compose up --build

logs:
    docker-compose logs -f

migrate:
    docker-compose exec backend python manage.py migrate

createsuperuser:
    docker-compose exec backend python manage.py createsuperuser

collectstatic:
    docker-compose exec backend python manage.py collectstatic --noinput

shell:
    docker-compose exec backend python manage.py shell

test:
    docker-compose exec backend pytest
