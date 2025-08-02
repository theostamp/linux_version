from django.urls import path
from .views import building_info

urlpatterns = [
    path('<int:building_id>/', building_info, name='public-building-info'),
]