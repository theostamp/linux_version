# backend/buildings/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BuildingViewSet, 
    ServicePackageViewSet, 
    get_current_context_view,
    add_user_to_building,
    remove_membership
)

router = DefaultRouter()
router.register(r'list', BuildingViewSet, basename='building')
router.register(r'service-packages', ServicePackageViewSet, basename='service-package')

# Custom URL paths for BuildingViewSet actions that need to be at root level
# This allows /api/buildings/current-context/ instead of /api/buildings/list/current-context/

urlpatterns = [
    # Custom paths BEFORE router to ensure they match first
    # Using specific namespace to avoid conflicts
    # Support both with and without trailing slash to avoid 301/405 issues
    path('actions/add-membership/', add_user_to_building, name='building-add-membership'),
    path('actions/add-membership', add_user_to_building, name='building-add-membership-no-slash'),
    
    path('actions/remove-membership/', remove_membership, name='building-remove-membership'),
    path('actions/remove-membership', remove_membership, name='building-remove-membership-no-slash'),
    
    # Legacy paths for backward compatibility
    path('add-membership/', add_user_to_building),
    path('remove-membership/', remove_membership),
    
    path('current-context/', get_current_context_view, name='building-current-context'),
    path('current-context', get_current_context_view, name='building-current-context-no-slash'),
    
    # Router URLs last
    path('', include(router.urls)),
]
