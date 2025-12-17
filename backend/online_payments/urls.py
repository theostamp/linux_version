from django.urls import path

from . import views


urlpatterns = [
    # Charges
    path("charges/", views.ChargeViewSet.as_view({"get": "list", "post": "create"}), name="charges"),
    path(
        "charges/<uuid:pk>/",
        views.ChargeViewSet.as_view({"get": "retrieve", "patch": "partial_update"}),
        name="charge-detail",
    ),
    path(
        "charges/<uuid:pk>/mark-paid/",
        views.ChargeViewSet.as_view({"post": "mark_paid"}),
        name="charge-mark-paid",
    ),
    # Checkout
    path("checkout/", views.CheckoutView.as_view(), name="checkout"),
    path("checkout", views.CheckoutView.as_view(), name="checkout-no-slash"),
    # Payments history
    path("payments/my/", views.MyPaymentsView.as_view(), name="payments-my"),
    path("payments/building/", views.BuildingPaymentsView.as_view(), name="payments-building"),
    # Reconciliation & exports
    path("reconciliation/summary/", views.ReconciliationSummaryView.as_view(), name="reconciliation-summary"),
    path("exports/reconciliation.csv", views.ReconciliationExportCsvView.as_view(), name="reconciliation-export-csv"),
    # Payee settings (Two-IBAN)
    path("settings/payee/", views.PayeeSettingsView.as_view(), name="payee-settings"),
]


