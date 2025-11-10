from rest_framework.routers import DefaultRouter 
from .views import UserRequestViewSet

router = DefaultRouter()
router.register(r'', UserRequestViewSet, basename='userrequest')
urlpatterns = router.urls
