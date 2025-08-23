from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Q
from decimal import Decimal
from datetime import datetime, timedelta
from apartments.models import Apartment
from financial.models import Expense, Transaction

@api_view(['GET'])
def obligations_breakdown(request):
    """
    API endpoint για λεπτομερή ανάλυση των υποχρεώσεων κτιρίου με ημερομηνίες
    """
    building_id = request.query_params.get('building_id')
    
    if not building_id:
        return Response(
            {'error': 'building_id parameter is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        from buildings.models import Building
        building = Building.objects.get(id=building_id)
        
        # Get apartments with debts (negative balance)
        apartments_with_debts = Apartment.objects.filter(
            building_id=building_id,
            current_balance__lt=0
        ).order_by('number')
        
        apartment_debts = []
        total_apartment_debts = Decimal('0.00')
        
        for apt in apartments_with_debts:
            debt_amount = abs(apt.current_balance or Decimal('0.00'))
            total_apartment_debts += debt_amount
            
            # Ψάξε για transaction history
            transactions = Transaction.objects.filter(apartment=apt).order_by('date')
            
            debt_info = analyze_debt_creation(apt, transactions, debt_amount)
            
            apartment_debt = {
                'apartment_number': apt.number,
                'owner_name': apt.owner_name or '',
                'debt_amount': float(debt_amount),
                'balance': float(apt.current_balance or Decimal('0.00')),
                'debt_start_date': debt_info['debt_start_date'],
                'debt_start_month': debt_info['debt_start_month'],
                'debt_creation_type': debt_info['creation_type'],  # 'actual' ή 'estimated'
                'days_in_debt': debt_info['days_in_debt'],
                'months_in_debt': debt_info['months_in_debt'],
                'urgency_level': debt_info['urgency_level'],
                'urgency_color': debt_info['urgency_color'],
                'debt_message': debt_info['debt_message']  # Το μήνυμα που θα δείχνουμε
            }
            apartment_debts.append(apartment_debt)
        
        # Get total expenses for building
        total_expenses = Expense.objects.filter(
            building_id=building_id
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Get management fees
        management_fee_per_apartment = getattr(building, 'management_fee_per_apartment', Decimal('0.00')) or Decimal('0.00')
        apartments_count = Apartment.objects.filter(building_id=building_id).count()
        total_management_fees = management_fee_per_apartment * apartments_count
        
        # Calculate total obligations
        total_obligations = total_apartment_debts + total_expenses + total_management_fees
        
        # Calculate debt summary
        debt_summary = {
            'recent_debts': len([d for d in apartment_debts if d['days_in_debt'] <= 30]),
            'moderate_debts': len([d for d in apartment_debts if 30 < d['days_in_debt'] <= 60]),
            'serious_debts': len([d for d in apartment_debts if 60 < d['days_in_debt'] <= 90]),
            'critical_debts': len([d for d in apartment_debts if d['days_in_debt'] > 90]),
            'has_transaction_history': any(d['debt_creation_type'] == 'actual' for d in apartment_debts),
            'estimated_debts': len([d for d in apartment_debts if d['debt_creation_type'] == 'estimated']),
            'average_debt_duration_days': sum(d['days_in_debt'] for d in apartment_debts) / len(apartment_debts) if apartment_debts else 0
        }
        
        breakdown_data = {
            'building_name': building.name,
            'apartment_debts': apartment_debts,
            'total_apartment_debts': float(total_apartment_debts),
            'total_expenses': float(total_expenses),
            'total_management_fees': float(total_management_fees),
            'total_obligations': float(total_obligations),
            'apartments_with_debt': len(apartment_debts),
            'apartments_count': apartments_count,
            'debt_summary': debt_summary,
            'analysis_date': datetime.now().isoformat()
        }
        
        return Response(breakdown_data, status=status.HTTP_200_OK)
        
    except Building.DoesNotExist:
        return Response(
            {'error': 'Building not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': f'Internal server error: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

def analyze_debt_creation(apartment, transactions, debt_amount):
    """
    Αναλύει πότε δημιουργήθηκε η οφειλή - πραγματικά ή εκτιμώμενα
    """
    if transactions.exists():
        # Υπάρχει transaction history - χρησιμοποίησε πραγματικά δεδομένα
        running_balance = Decimal('0.00')
        debt_start_date = None
        
        for trans in transactions:
            running_balance += trans.amount
            if running_balance < 0 and debt_start_date is None:
                debt_start_date = trans.date
                break
        
        if debt_start_date is None:
            # Αν δεν βρέθηκε συγκεκριμένη ημερομηνία, χρησιμοποίησε την τελευταία συναλλαγή
            debt_start_date = transactions.last().date
            
        debt_start_month = get_greek_month_year(debt_start_date)
        days_in_debt = (datetime.now().date() - debt_start_date).days
        months_in_debt = round(days_in_debt / 30.44, 1)
        
        debt_message = f"Οφειλή από {debt_start_month}"
        creation_type = "actual"
        
    else:
        # Δεν υπάρχει transaction history - χρησιμοποίησε εκτιμήσεις
        # Εκτίμησε ότι η οφειλή δημιουργήθηκε πρόσφατα (1-3 μήνες πριν)
        # Βάσει του μεγέθους της οφειλής
        if debt_amount < 50:
            estimated_months_ago = 1
        elif debt_amount < 100:
            estimated_months_ago = 2
        else:
            estimated_months_ago = 3
            
        estimated_date = datetime.now().date() - timedelta(days=estimated_months_ago * 30)
        debt_start_date = estimated_date.isoformat()
        debt_start_month = get_greek_month_year(estimated_date)
        days_in_debt = estimated_months_ago * 30
        months_in_debt = estimated_months_ago
        
        debt_message = f"Εκτίμηση: {debt_start_month}"
        creation_type = "estimated"
    
    # Κατηγοριοποίηση επιπέδου επείγοντος
    if days_in_debt <= 30:
        urgency_level = "Πρόσφατη"
        urgency_color = "🟢"
    elif days_in_debt <= 60:
        urgency_level = "Μέτρια"
        urgency_color = "🟡"
    elif days_in_debt <= 90:
        urgency_level = "Σοβαρή"
        urgency_color = "🟠"
    else:
        urgency_level = "Κρίσιμη"
        urgency_color = "🔴"
    
    return {
        'debt_start_date': debt_start_date,
        'debt_start_month': debt_start_month,
        'creation_type': creation_type,
        'days_in_debt': days_in_debt,
        'months_in_debt': months_in_debt,
        'urgency_level': urgency_level,
        'urgency_color': urgency_color,
        'debt_message': debt_message
    }

def get_greek_month_year(date):
    """
    Μετατρέπει ημερομηνία σε ελληνικό μήνα και έτος
    """
    greek_months = {
        1: 'Ιανουάριος', 2: 'Φεβρουάριος', 3: 'Μάρτιος', 4: 'Απρίλιος',
        5: 'Μάιος', 6: 'Ιούνιος', 7: 'Ιούλιος', 8: 'Αύγουστος',
        9: 'Σεπτέμβριος', 10: 'Οκτώβριος', 11: 'Νοέμβριος', 12: 'Δεκέμβριος'
    }
    
    month_name = greek_months.get(date.month, f"Μήνας {date.month}")
    return f"{month_name} {date.year}"