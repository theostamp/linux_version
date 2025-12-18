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

# DRF's DefaultRouter `trailing_slash` is a *regex string* (default: "/").
# We want to support BOTH variants because:
# - Next.js rewrites/proxies may strip or add trailing slashes depending on config,
# - our server-side proxy (`/backend-proxy`) normalizes paths with a trailing slash,
# - Django has APPEND_SLASH = False in production (so mismatches become hard 404s).
#
# Using "/?" makes the trailing slash optional, so both `/rooms` and `/rooms/` resolve.
router = DefaultRouter(trailing_slash="/?")
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