"""
URL configuration for notifications app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    NotificationTemplateViewSet,
    NotificationViewSet,
    NotificationRecipientViewSet,
    MonthlyNotificationTaskViewSet,
    NotificationEventViewSet,
)

router = DefaultRouter()
router.register(r'templates', NotificationTemplateViewSet, basename='notification-template')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'recipients', NotificationRecipientViewSet, basename='notification-recipient')
router.register(r'monthly-tasks', MonthlyNotificationTaskViewSet, basename='monthly-task')
router.register(r'events', NotificationEventViewSet, basename='notification-event')

urlpatterns = [
    path('', include(router.urls)),
]
