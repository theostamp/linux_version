from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'uploads', views.DocumentUploadViewSet)

app_name = 'document_parser'

urlpatterns = [
    path('', include(router.urls)),
]


