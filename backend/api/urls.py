# backend/api/urls.py

from django.urls import path, include 
 
from rest_framework.routers import DefaultRouter
from announcements.views import AnnouncementViewSet
from votes.views import VoteViewSet
from user_requests.views import UserRequestViewSet  
from django.views.decorators.csrf impf_cignore
 
from django.http import JsonResponse
 



router = DefaultRouter()
router.register(r'announcements', AnnouncementViewSet, basename='announcement')
router.register(r'votes',         VoteViewSet,        basename='vote')
router.register("user-requests", UserRequestViewSet, basename="userrequest")

# … register κι άλλα routes …
@ensure_csrf_cookie
def csrf_token_view(request):
    return JsonResponse({"message": "CSRF cookie set"})
  
urlpatterns = [
    path('api/', include(router.urls)),
    # π.χ. path('api-auth/', include('rest_framework.urls')),
    path('api/', include(router.urls)),
    path('api/csrf/', csrf_token_view, name='csrf-token'), 
]
