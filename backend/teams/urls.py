from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TeamViewSet, TeamRoleViewSet, TeamMemberViewSet,
    TeamTaskViewSet, TeamMeetingViewSet, TeamPerformanceViewSet
)

router = DefaultRouter()
router.register(r'teams', TeamViewSet)
router.register(r'roles', TeamRoleViewSet)
router.register(r'members', TeamMemberViewSet)
router.register(r'tasks', TeamTaskViewSet)
router.register(r'meetings', TeamMeetingViewSet)
router.register(r'performance', TeamPerformanceViewSet)

urlpatterns = [
    path('', include(router.urls)),
] 