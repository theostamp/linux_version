# backend\votes\apps.py
from django.apps import AppConfig  # type: ignore  # type: ignore


class VotesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'votes'
