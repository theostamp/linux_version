# backend/buildings/public_urls.py
from django.urls import path
from .views import public_buildings_list

urlpatterns = [
    path('', public_buildings_list, name='public_buildings_list'),
] 