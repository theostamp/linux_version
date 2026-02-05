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
    EmailBatchViewSet,
    DeviceTokenViewSet,
    ViberLinkView,
    ViberSubscriptionView,
    NotificationTasksStatusView,
)

router = DefaultRouter()
router.register(r'templates', NotificationTemplateViewSet, basename='notification-template')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'recipients', NotificationRecipientViewSet, basename='notification-recipient')
router.register(r'monthly-tasks', MonthlyNotificationTaskViewSet, basename='monthly-task')
router.register(r'events', NotificationEventViewSet, basename='notification-event')
router.register(r'email-batches', EmailBatchViewSet, basename='email-batch')
router.register(r'devices', DeviceTokenViewSet, basename='device-token')

notification_action_urls = [
    path(
        'notifications/send_common_expenses/',
        NotificationViewSet.as_view({'post': 'send_common_expenses'}),
        name='notification-send-common-expenses',
    ),
    path(
        'notifications/send_personalized_common_expenses/',
        NotificationViewSet.as_view({'post': 'send_personalized_common_expenses'}),
        name='notification-send-personalized-common-expenses',
    ),
    path(
        'notifications/send_personalized_common_expenses_bulk/',
        NotificationViewSet.as_view({'post': 'send_personalized_common_expenses_bulk'}),
        name='notification-send-personalized-common-expenses-bulk',
    ),
]

urlpatterns = [
    *notification_action_urls,
    path('', include(router.urls)),
    path('viber/link/', ViberLinkView.as_view(), name='viber-link'),
    path('viber/subscription/', ViberSubscriptionView.as_view(), name='viber-subscription'),
    path('tasks/status/', NotificationTasksStatusView.as_view(), name='notification-tasks-status'),
]
