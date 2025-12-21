"""
Assembly URLs
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AssemblyViewSet, AgendaItemViewSet,
    AssemblyAttendeeViewSet, AssemblyVoteViewSet,
    AssemblyMinutesTemplateViewSet,
    UpcomingAssemblyView, EmailVoteView,
    CommunityPollViewSet, PollVoteViewSet
)

router = DefaultRouter()
router.register(r'assemblies', AssemblyViewSet, basename='assembly')
router.register(r'agenda-items', AgendaItemViewSet, basename='agenda-item')
router.register(r'assembly-attendees', AssemblyAttendeeViewSet, basename='assembly-attendee')
router.register(r'assembly-votes', AssemblyVoteViewSet, basename='assembly-vote')
router.register(r'minutes-templates', AssemblyMinutesTemplateViewSet, basename='minutes-template')
router.register(r'community-polls', CommunityPollViewSet, basename='community-poll')
router.register(r'poll-votes', PollVoteViewSet, basename='poll-vote')

urlpatterns = [
    path('', include(router.urls)),
    
    # Public endpoints (no auth required)
    path('assemblies/upcoming/', UpcomingAssemblyView.as_view(), name='upcoming-assembly'),
    path('vote-by-email/<str:token>/', EmailVoteView.as_view(), name='email-vote'),
]

