from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    TodoCategoryViewSet,
    TodoItemViewSet,
    TodoTemplateViewSet,
    TodoNotificationViewSet,
)

router = DefaultRouter()
router.register(r"categories", TodoCategoryViewSet, basename="todo-category")
router.register(r"items", TodoItemViewSet, basename="todo-item")
router.register(r"templates", TodoTemplateViewSet, basename="todo-template")
router.register(r"notifications", TodoNotificationViewSet, basename="todo-notification")

urlpatterns = [
    path("", include(router.urls)),
]


