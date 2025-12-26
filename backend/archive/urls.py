from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"documents", views.ArchiveDocumentViewSet)

app_name = "archive"

urlpatterns = [
    path("", include(router.urls)),
]
