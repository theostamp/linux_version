# backend/obligations/urls.py
from django.urls import path  # type: ignore  # type: ignore
from .views import obligations_summary

urlpatterns = [
    path("summary/", obligations_summary, name="obligations-summary"),
]
