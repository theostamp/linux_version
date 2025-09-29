from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentUploadViewSet

app_name = 'document_parser'

router = DefaultRouter()
router.register(r'documents', DocumentUploadViewSet, basename='documentupload')

urlpatterns = [
    path('', include(router.urls)),
]