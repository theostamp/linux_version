from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EventViewSet, EventNoteViewSet

router = DefaultRouter()
router.register(r'', EventViewSet, basename='event')
router.register(r'notes', EventNoteViewSet, basename='eventnote')

urlpatterns = [
    path('', include(router.urls)),
]