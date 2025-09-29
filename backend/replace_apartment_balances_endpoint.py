import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

# Διόρθωση του apartment_balances endpoint στα views.py
print("=== Fixing apartment_balances endpoint ===")

# Διαβάζουμε το αρχείο
with open('/app/financial/views.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Βρίσκουμε το πρώτο apartment_balances method (γραμμή ~1325)
start_marker = "    @action(detail=False, methods=['get'])\n    def apartment_balances(self, request):"
end_marker = "            )"  # Το τέλος του method

# Βρίσκουμε τη θέση του method
start_pos = content.find(start_marker)
if start_pos == -1:
    print("❌ Could not find apartment_balances method!")
    exit(1)

# Βρίσκουμε το τέλος (μετά το return Response)
# Πρέπει να βρούμε τη σωστή γραμμή return Response που τελειώνει
search_from = start_pos
method_level = 0
in_method = False
lines = content[start_pos:].split('\n')
end_line_index = 0

for i, line in enumerate(lines):
    if line.strip().startswith('def apartment_balances'):
        in_method = True
        method_level = len(line) - len(line.lstrip())
        continue
    
    if in_method:
        current_level = len(line) - len(line.lstrip())
        # Αν βρίσκουμε γραμμή στο ίδιο επίπεδο με το def, το method τέλειωσε
        if current_level <= method_level and line.strip() and not line.strip().startswith('#'):
            if line.strip().startswith('@') or line.strip().startswith('def '):
                end_line_index = i
                break

# Δημιουργούμε τη νέα μέθοδο
new_method = '''    @action(detail=False, methods=['get'])
    def apartment_balances(self, request):
        """Λήψη αναλυτικών ισοζυγίων διαμερισμάτων με ιστορικό οφειλών"""
        building_id = request.query_params.get('building_id')
        month = request.query_params.get('month')
        
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # ΔΙΟΡΘΩΣΗ: Χρησιμοποιούμε το FinancialDashboardService που έχει τη σωστή λογική
            from .services import FinancialDashboardService
            
            service = FinancialDashboardService(building_id=building_id)
            apartment_balances = service.get_apartment_balances(month=month)
            
            # Υπολογισμός summary statistics από τα δεδομένα του service
            total_obligations = sum(float(apt.get('current_balance', 0)) for apt in apartment_balances if float(apt.get('current_balance', 0)) > 0)
            total_payments = sum(float(apt.get('last_payment_amount', 0)) for apt in apartment_balances if apt.get('last_payment_amount'))
            total_net_obligations = sum(float(apt.get('net_obligation', 0)) for apt in apartment_balances if float(apt.get('net_obligation', 0)) > 0)
            
            # Count apartments by status
            active_count = len([apt for apt in apartment_balances if apt['status'] == 'Ενεργό'])
            debt_count = len([apt for apt in apartment_balances if apt['status'] in ['Οφειλή', 'Κρίσιμο']])
            critical_count = len([apt for apt in apartment_balances if apt['status'] == 'Κρίσιμο'])
            credit_count = len([apt for apt in apartment_balances if apt['status'] == 'Πιστωτικό'])
            
            return Response({
                'apartments': apartment_balances,
                'summary': {
                    'total_obligations': total_obligations,
                    'total_payments': total_payments,
                    'total_net_obligations': total_net_obligations,
                    'active_count': active_count,
                    'debt_count': debt_count,
                    'critical_count': critical_count,
                    'credit_count': credit_count,
                    'total_apartments': len(apartment_balances),
                    'data_month': month,  # Add the actual month of the data
                    'requested_month': month  # Add the requested month for comparison
                }
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error calculating apartment balances: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

'''

# Αντικαθιστούμε το παλιό method
if end_line_index > 0:
    old_method_lines = lines[:end_line_index]
    remaining_content = '\n'.join(lines[end_line_index:])
    
    new_content = content[:start_pos] + new_method + remaining_content
    
    # Γράφουμε το νέο αρχείο
    with open('/app/financial/views.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("✅ Successfully replaced apartment_balances endpoint!")
    print("   Now using FinancialDashboardService.get_apartment_balances()")
    print("   This should fix the frontend apartment balances display")
else:
    print("❌ Could not find the end of apartment_balances method")