# backend/votes/urls.py

from rest_framework.routers import DefaultRouter
from .views import VoteViewSet

router = DefaultRouter()
# θα καταλήξει στο /api/votes/   (list, create, …)
router.register(r'', VoteViewSet, basename='vote')

urlpatterns = router.urls
