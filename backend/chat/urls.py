from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ChatRoomViewSet, 
    ChatMessageViewSet,
    DirectConversationViewSet,
    DirectMessageViewSet,
    OnlineStatusViewSet,
    PushSubscriptionViewSet,
    ChatNotificationPreferenceViewSet
)

# Use trailing_slash=False to support both /path and /path/ URLs
# This fixes 405 errors when Next.js (with trailingSlash: false) strips trailing slashes
router = DefaultRouter(trailing_slash=False)
# Building chat
router.register(r'rooms', ChatRoomViewSet, basename='chatroom')
router.register(r'messages', ChatMessageViewSet, basename='chatmessage')
# Direct messaging (private chat)
router.register(r'direct', DirectConversationViewSet, basename='direct-conversation')
router.register(r'direct-messages', DirectMessageViewSet, basename='direct-message')
# Online status
router.register(r'online', OnlineStatusViewSet, basename='online-status')
# Push notifications
router.register(r'push-subscriptions', PushSubscriptionViewSet, basename='push-subscription')
router.register(r'notification-preferences', ChatNotificationPreferenceViewSet, basename='notification-preference')

urlpatterns = [
    path('', include(router.urls)),
] 