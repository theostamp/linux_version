import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth

def check_all_payments():
    """Έλεγχος όλων των πληρωμών στη βάση δεδομένων"""
    
    with schema_context('demo'):
        # Συνολικές πληρωμές
        all_payments = Payment.objects.all()
        total_count = all_payments.count()
        
        print("=" * 60)
        print("ΣΥΝΟΛΙΚΕΣ ΠΛΗΡΩΜΕΣ ΣΤΗ ΒΑΣΗ ΔΕΔΟΜΕΝΩΝ")
        print("=" * 60)
        print(f"Συνολικός αριθμός πληρωμών: {total_count}")
        
        if total_count > 0:
            total_amount = all_payments.aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            print(f"Συνολικό ποσό: {total_amount:.2f} €")
            
            # Πρώτη και τελευταία πληρωμή
            first_payment = all_payments.order_by('date').first()
            last_payment = all_payments.order_by('date').last()
            
            print(f"Πρώτη πληρωμή: {first_payment.date.strftime('%d/%m/%Y')}")
            print(f"Τελευταία πληρωμή: {last_payment.date.strftime('%d/%m/%Y')}")
            
            # Πληρωμές ανά έτος
            print("\n" + "=" * 60)
            print("ΠΛΗΡΩΜΕΣ ΑΝΑ ΕΤΟΣ")
            print("=" * 60)
            
            yearly_totals = all_payments.extra(
                select={'year': 'EXTRACT(year FROM date)'}
            ).values('year').annotate(
                total=Sum('amount'),
                count=Count('id')
            ).order_by('year')
            
            for year_data in yearly_totals:
                year = int(year_data['year'])
                total = year_data['total']
                count = year_data['count']
                print(f"{year}: {total:.2f} € ({count} πληρωμές)")
            
            # Πληρωμές ανά μήνα για το 2024
            print("\n" + "=" * 60)
            print("ΠΛΗΡΩΜΕΣ ΑΝΑ ΜΗΝΑ ΓΙΑ ΤΟ 2024")
            print("=" * 60)
            
            monthly_totals = all_payments.filter(
                date__year=2024
            ).annotate(
                month=TruncMonth('date')
            ).values('month').annotate(
                total=Sum('amount'),
                count=Count('id')
            ).order_by('month')
            
            if monthly_totals:
                for month_data in monthly_totals:
                    month_name = month_data['month'].strftime('%B %Y')
                    total = month_data['total']
                    count = month_data['count']
                    print(f"{month_name}: {total:.2f} € ({count} πληρωμές)")
            else:
                print("Δεν βρέθηκαν πληρωμές για το 2024")
            
            # Λεπτομέρειες των τελευταίων 10 πληρωμών
            print("\n" + "=" * 60)
            print("ΤΕΛΕΥΤΑΙΕΣ 10 ΠΛΗΡΩΜΕΣ")
            print("=" * 60)
            
            recent_payments = all_payments.order_by('-date')[:10]
            for payment in recent_payments:
                apartment_info = f"Διαμέρισμα {payment.apartment.number}" if payment.apartment else "Άγνωστο"
                print(f"Ημερομηνία: {payment.date.strftime('%d/%m/%Y')}")
                print(f"Διαμέρισμα: {apartment_info}")
                print(f"Ποσό: {payment.amount:.2f} €")
                print(f"Τύπος: {payment.payment_type}")
                print(f"Μέθοδος: {payment.method}")
                print(f"Σημειώσεις: {payment.notes or 'Δεν υπάρχουν'}")
                print("-" * 40)
        else:
            print("Δεν βρέθηκαν καθόλου πληρωμές στη βάση δεδομένων")

if __name__ == "__main__":
    check_all_payments()
