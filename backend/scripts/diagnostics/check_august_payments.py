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
from django.db.models import Sum
from django.db.models import Count

def check_august_payments():
    """Επιβεβαίωση συνολικών πληρωμών για τον Αύγουστο 2024"""
    
    with schema_context('demo'):
        # Εύρεση όλων των πληρωμών για τον Αύγουστο 2025
        august_payments = Payment.objects.filter(
            date__year=2025,
            date__month=8
        ).order_by('date')
        
        # Υπολογισμός συνολικού ποσού
        total_amount = august_payments.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        # Εκτύπωση αποτελεσμάτων
        print("=" * 60)
        print("ΕΠΙΒΕΒΑΙΩΣΗ ΠΛΗΡΩΜΩΝ ΑΥΓΟΥΣΤΟΥ 2025")
        print("=" * 60)
        print(f"Συνολικό ποσό πληρωμών: {total_amount:.2f} €")
        print(f"Αριθμός πληρωμών: {august_payments.count()}")
        print()
        
        if august_payments.exists():
            print("Λεπτομέρειες πληρωμών:")
            print("-" * 60)
            for payment in august_payments:
                apartment_info = f"Διαμέρισμα {payment.apartment.number}" if payment.apartment else "Άγνωστο"
                print(f"Ημερομηνία: {payment.date.strftime('%d/%m/%Y')}")
                print(f"Διαμέρισμα: {apartment_info}")
                print(f"Ποσό: {payment.amount:.2f} €")
                print(f"Τύπος: {payment.payment_type}")
                print(f"Περιγραφή: {payment.notes or 'Δεν υπάρχει'}")
                print("-" * 40)
        else:
            print("Δεν βρέθηκαν πληρωμές για τον Αύγουστο 2025")
        
        # Έλεγχος αν υπάρχουν πληρωμές για άλλους μήνες του 2025
        print("\n" + "=" * 60)
        print("ΣΥΝΟΛΙΚΕΣ ΠΛΗΡΩΜΕΣ ΓΙΑ ΤΟ 2025 (ΑΝΑ ΜΗΝΑ)")
        print("=" * 60)
        
        from django.db.models.functions import TruncMonth
        
        monthly_totals = Payment.objects.filter(
            date__year=2025
        ).annotate(
            month=TruncMonth('date')
        ).values('month').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('month')
        
        for month_data in monthly_totals:
            month_name = month_data['month'].strftime('%B %Y')
            total = month_data['total']
            count = month_data['count']
            print(f"{month_name}: {total:.2f} € ({count} πληρωμές)")

if __name__ == "__main__":
    check_august_payments()
