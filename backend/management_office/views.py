from rest_framework import viewsets, permissions
from rest_framework.response import Response
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta

from buildings.models import Building
from apartments.models import Apartment
from financial.models import MonthlyBalance, Expense, Transaction, Payment
from user_requests.models import UserRequest
from billing.models import UserSubscription, BillingCycle

class OfficeDashboardViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        """
        Get high-level office stats
        """
        # 1. Total Buildings & Units
        total_buildings = Building.objects.count()
        total_apartments = Apartment.objects.count()

        # 2. Financial Overview (Global)
        # Total Outstanding Debt (from tenants)
        # Assuming positive balance = debt
        total_debt = Apartment.objects.filter(current_balance__gt=0).aggregate(Sum('current_balance'))['current_balance__sum'] or 0
        
        # Monthly Revenue (Management Fees) - Last 30 days
        last_30_days = timezone.now() - timedelta(days=30)
        
        # Billed Revenue (Expenses created)
        monthly_billed_revenue = Expense.objects.filter(
            category='management_fees',
            date__gte=last_30_days
        ).aggregate(Sum('amount'))['amount__sum'] or 0

        # Collected Revenue (Payments received for management fees)
        # This is trickier as payments are often lump sum. 
        # We can approximate by checking transactions linked to management fee expenses, 
        # or simply assume a collection rate. 
        # For now, let's track Total Payments Received in last 30 days as a proxy for "Cash Flow",
        # but for P&L we ideally want the specific management fee portion.
        # Since we don't strictly tag payments to expense categories 1:1 always, we will use Total Collected Cash Flow as a separate metric.
        
        # 3. Office P&L (Platform Costs vs Management Income)
        # Expenses: Platform Subscription
        # We look for the active subscription for the current user (who is the manager)
        try:
            subscription = UserSubscription.objects.filter(user=request.user, status='active').first()
            platform_cost = subscription.price if subscription else 0
        except:
            platform_cost = 0

        # Income: Management Fees (Annualized or Monthly)
        # We use the billed amount as "Revenue"
        office_revenue = monthly_billed_revenue

        # Net Profit (from management perspective)
        net_profit = float(office_revenue) - float(platform_cost)

        # 4. Critical Alerts
        critical_buildings = []
        buildings = Building.objects.all()
        for building in buildings:
            # Check for negative reserve
            last_balance = MonthlyBalance.objects.filter(building=building).order_by('-year', '-month').first()
            if last_balance and last_balance.reserve_fund_amount < 0:
                 critical_buildings.append({
                     'id': building.id,
                     'name': building.name,
                     'issue': 'Negative Reserve',
                     'value': float(last_balance.reserve_fund_amount)
                 })
            
            # Check for high debt
            building_debt = Apartment.objects.filter(building=building, current_balance__gt=0).aggregate(Sum('current_balance'))['current_balance__sum'] or 0
            if building_debt > 1000: # Threshold for alert
                 critical_buildings.append({
                     'id': building.id,
                     'name': building.name,
                     'issue': 'High Debt',
                     'value': float(building_debt)
                 })

        # 5. Maintenance/Requests Overview
        pending_requests = UserRequest.objects.filter(status__in=['pending', 'in_progress']).count()
        
        return Response({
            'overview': {
                'total_buildings': total_buildings,
                'total_apartments': total_apartments,
                'total_debt': float(total_debt),
                'monthly_management_revenue': float(monthly_billed_revenue),
                'pending_requests': pending_requests
            },
            'financials': {
                'revenue': float(office_revenue),
                'expenses': float(platform_cost),
                'net_profit': float(net_profit),
                'currency': 'EUR'
            },
            'critical_alerts': critical_buildings
        })
