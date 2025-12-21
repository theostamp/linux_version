from django.urls import path

from . import views
from .analytics_views import AdAnalyticsSummaryView
from .admin_views import AdPlacementListView, AdPlacementUpdateView, AdTokenCreateView


urlpatterns = [
    path("landing/<uuid:token>/", views.LandingBootstrapView.as_view(), name="ad-portal-landing"),
    path("trial/start/", views.StartTrialView.as_view(), name="ad-portal-trial-start"),
    path("manage/<uuid:manage_token>/", views.ManageView.as_view(), name="ad-portal-manage"),
    path("manage/<uuid:manage_token>/creative/", views.UpdateCreativeView.as_view(), name="ad-portal-creative"),
    path("manage/<uuid:manage_token>/checkout/manual/", views.CheckoutManualView.as_view(), name="ad-portal-checkout-manual"),
    path("manage/<uuid:manage_token>/checkout/subscription/", views.CheckoutSubscriptionView.as_view(), name="ad-portal-checkout-subscription"),
    path("analytics/summary/", AdAnalyticsSummaryView.as_view(), name="ad-portal-analytics-summary"),

    # Ultra-admin only management
    path("admin/placements/", AdPlacementListView.as_view(), name="ad-portal-admin-placements"),
    path("admin/placements/<str:code>/", AdPlacementUpdateView.as_view(), name="ad-portal-admin-placements-update"),
    path("admin/tokens/", AdTokenCreateView.as_view(), name="ad-portal-admin-tokens-create"),
]


