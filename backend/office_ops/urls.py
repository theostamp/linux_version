from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BulkJobViewSet, BulkTemplateViewSet

router = DefaultRouter()
router.register(r"bulk/jobs", BulkJobViewSet, basename="office-ops-bulk-job")
router.register(r"bulk/templates", BulkTemplateViewSet, basename="office-ops-bulk-template")

urlpatterns = [
    path("", include(router.urls)),
]
