from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProjectViewSet,
    OfferViewSet,
    OfferFileViewSet,
    ProjectVoteViewSet,
    ProjectExpenseViewSet,
    PublicProjectsAPIView,
)

router = DefaultRouter()
router.register(r'projects', ProjectViewSet)
router.register(r'offers', OfferViewSet)
router.register(r'offer-files', OfferFileViewSet)
router.register(r'project-votes', ProjectVoteViewSet)
router.register(r'project-expenses', ProjectExpenseViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('public/approved-in-progress/', PublicProjectsAPIView.as_view({'get': 'list'}), name='public-projects-list'),
]
