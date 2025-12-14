# backend/votes/urls.py

from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import VoteViewSet
from .public_views import PublicVoteResultsView

router = DefaultRouter()
# θα καταλήξει στο /api/votes/   (list, create, …)
router.register(r'', VoteViewSet, basename='vote')

urlpatterns = [
    # Public kiosk endpoint (no auth)
    path('public/<int:vote_id>/results/', PublicVoteResultsView.as_view(), name='public-vote-results'),
]

urlpatterns += router.urls
