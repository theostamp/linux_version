from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PaymentViewSet,
    FinancialReceiptViewSet,
    BuildingAccountViewSet,
    FinancialTransactionViewSet
)

router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'receipts', FinancialReceiptViewSet, basename='financial-receipt')
router.register(r'accounts', BuildingAccountViewSet, basename='building-account')
router.register(r'transactions', FinancialTransactionViewSet, basename='financial-transaction')

urlpatterns = [
    path('', include(router.urls)),
] 