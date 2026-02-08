from rest_framework.routers import DefaultRouter

from .views import DunningEventViewSet, DunningPolicyViewSet, DunningRunViewSet, PromiseToPayViewSet

router = DefaultRouter()
router.register(r"policies", DunningPolicyViewSet, basename="collections-policy")
router.register(r"runs", DunningRunViewSet, basename="collections-run")
router.register(r"events", DunningEventViewSet, basename="collections-event")
router.register(r"promises", PromiseToPayViewSet, basename="collections-promise")

urlpatterns = router.urls
