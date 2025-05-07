# backend/api/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from announcements.views import AnnouncementViewSet
from votes.views import VoteViewSet
from user_requests.views import UserRequestViewSet  # Adjust the import path as needed
# … import κι άλλων ViewSets …

router = DefaultRouter()
router.register(r'announcements', AnnouncementViewSet, basename='announcement')
router.register(r'votes',         VoteViewSet,        basename='vote')
router.register("user-requests", UserRequestViewSet, basename="userrequest")

# … register κι άλλα routes …

urlpatterns = [
    path('api/', include(router.urls)),
    # π.χ. path('api-auth/', include('rest_framework.urls')),
]
