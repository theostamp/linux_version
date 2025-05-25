from rest_framework.routers import DefaultRouter # type: ignore
from .views import UserRequestViewSet

router = DefaultRouter()
router.register(r'', UserRequestViewSet, basename='user-request')
urlpatterns = router.urls
