"""
Office Analytics API Views
Provides REST endpoints for the Office Dashboard.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
import logging

from .services import office_analytics_service

logger = logging.getLogger(__name__)


class OfficeDashboardView(APIView):
    """
    GET /api/office-analytics/dashboard/
    
    Επιστρέφει όλα τα δεδομένα για το Office Dashboard.
    Απαιτεί authentication και manager/staff role.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Έλεγχος ρόλου - μόνο managers/staff/superusers
            user = request.user
            allowed_roles = ['manager', 'staff', 'superuser', 'internal_manager']
            
            if not hasattr(user, 'role') or user.role not in allowed_roles:
                return Response(
                    {'error': 'Δεν έχετε δικαίωμα πρόσβασης στο Office Dashboard'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            data = office_analytics_service.get_full_dashboard()
            return Response(data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in OfficeDashboardView: {e}")
            return Response(
                {'error': 'Σφάλμα κατά την ανάκτηση δεδομένων'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PortfolioOverviewView(APIView):
    """
    GET /api/office-analytics/portfolio/
    
    Επιστρέφει συνοπτική εικόνα του χαρτοφυλακίου.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            data = office_analytics_service.get_portfolio_overview(user=request.user)
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error in PortfolioOverviewView: {e}")
            return Response(
                {'error': 'Σφάλμα κατά την ανάκτηση δεδομένων'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BuildingsFinancialStatusView(APIView):
    """
    GET /api/office-analytics/buildings-status/
    
    Επιστρέφει οικονομική κατάσταση ανά κτίριο.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            data = office_analytics_service.get_buildings_financial_status()
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error in BuildingsFinancialStatusView: {e}")
            return Response(
                {'error': 'Σφάλμα κατά την ανάκτηση δεδομένων'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TopDebtorsView(APIView):
    """
    GET /api/office-analytics/top-debtors/
    
    Επιστρέφει τους μεγαλύτερους οφειλέτες.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            limit = int(request.query_params.get('limit', 10))
            data = office_analytics_service.get_top_debtors(limit=limit)
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error in TopDebtorsView: {e}")
            return Response(
                {'error': 'Σφάλμα κατά την ανάκτηση δεδομένων'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PendingMaintenanceView(APIView):
    """
    GET /api/office-analytics/pending-maintenance/
    
    Επιστρέφει εκκρεμή αιτήματα συντήρησης.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            data = office_analytics_service.get_pending_maintenance_tasks()
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error in PendingMaintenanceView: {e}")
            return Response(
                {'error': 'Σφάλμα κατά την ανάκτηση δεδομένων'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CashFlowView(APIView):
    """
    GET /api/office-analytics/cash-flow/
    
    Επιστρέφει cash flow για τους τελευταίους μήνες.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            months = int(request.query_params.get('months', 6))
            data = office_analytics_service.get_monthly_cash_flow(months=months)
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error in CashFlowView: {e}")
            return Response(
                {'error': 'Σφάλμα κατά την ανάκτηση δεδομένων'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AlertsView(APIView):
    """
    GET /api/office-analytics/alerts/
    
    Επιστρέφει alerts/ειδοποιήσεις για τον διαχειριστή.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            data = office_analytics_service.get_alerts()
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error in AlertsView: {e}")
            return Response(
                {'error': 'Σφάλμα κατά την ανάκτηση δεδομένων'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

