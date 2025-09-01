import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date
from django.db.models import Sum, Count

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment, Expense, Transaction
from apartments.models import Apartment
from buildings.models import Building

def analyze_payment_discrepancy():
    """Analyze the discrepancy between period balance and payment status analysis"""
    
    building_id = 4  # Αλκμάνος 22
    
    with schema_context('demo'):
        print("🔍 ΑΝΑΛΥΣΗ ΑΣΥΜΦΩΝΙΑΣ ΠΛΗΡΩΜΩΝ")
        print("=" * 60)
        print(f"🏢 Κτίριο: Αλκμάνος 22 (ID: {building_id})")
        print()
        
        # 1. Υπολογισμός Υπόλοιπου Περιόδου (Snapshot View)
        print("📊 1. ΥΠΟΛΟΓΙΣΜΟΣ ΥΠΟΛΟΙΠΟΥ ΠΕΡΙΟΔΟΥ (SNAPSHOT VIEW)")
        print("-" * 50)
        
        # Συνολικές πληρωμές μέχρι σήμερα
        total_payments = Payment.objects.filter(
            apartment__building_id=building_id
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Συνολικές δαπάνες μέχρι σήμερα
        total_expenses = Expense.objects.filter(
            building_id=building_id
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Υπόλοιπο Περιόδου = Πληρωμές - Δαπάνες
        period_balance = total_payments - total_expenses
        
        print(f"💰 Συνολικές πληρωμές: {total_payments:,.2f}€")
        print(f"💸 Συνολικές δαπάνες: {total_expenses:,.2f}€")
        print(f"📊 Υπόλοιπο Περιόδου: {period_balance:,.2f}€")
        print()
        
        # 2. Ανάλυση Πληρωμών ανά Διαμέρισμα
        print("📊 2. ΑΝΑΛΥΣΗ ΠΛΗΡΩΜΩΝ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ")
        print("-" * 50)
        
        apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
        
        apartment_payments = {}
        apartment_balances = {}
        
        for apartment in apartments:
            # Πληρωμές ανά διαμέρισμα
            apartment_total_payments = Payment.objects.filter(
                apartment=apartment
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            apartment_payments[apartment.id] = apartment_total_payments
            
            # Τρέχον υπόλοιπο διαμερίσματος
            current_balance = apartment.current_balance or Decimal('0.00')
            apartment_balances[apartment.id] = current_balance
            
            print(f"🏠 Διαμέρισμα {apartment.number}:")
            print(f"   💰 Συνολικές πληρωμές: {apartment_total_payments:,.2f}€")
            print(f"   📊 Τρέχον υπόλοιπο: {current_balance:,.2f}€")
            
            # Ανάλυση πληρωμών ανά τρόπο
            payments_by_method = Payment.objects.filter(
                apartment=apartment
            ).values('method').annotate(
                count=Count('id'),
                total=Sum('amount')
            ).order_by('-total')
            
            for method_data in payments_by_method:
                method_label = dict(Payment.PAYMENT_METHODS).get(method_data['method'], method_data['method'])
                print(f"     • {method_label}: {method_data['count']} πληρωμές, {method_data['total']:,.2f}€")
            print()
        
        # 3. Ανάλυση Καταστάσεων Πληρωμών (Payment Status Analysis)
        print("📊 3. ΑΝΑΛΥΣΗ ΚΑΤΑΣΤΑΣΕΩΝ ΠΛΗΡΩΜΩΝ")
        print("-" * 50)
        
        # Υπολογισμός μηνιαίας οφειλής (χρησιμοποιώντας τον calculator)
        from financial.services import CommonExpenseCalculator
        
        try:
            calculator = CommonExpenseCalculator(building_id)
            shares = calculator.calculate_shares()
            
            current_apartments = 0
            behind_apartments = 0
            critical_apartments = 0
            
            print("🏠 Καταστάσεις διαμερισμάτων:")
            for apartment in apartments:
                share_data = shares.get(apartment.id, {})
                total_due = share_data.get('total_due', 0)
                previous_balance = share_data.get('previous_balance', 0)
                total_amount = share_data.get('total_amount', 0)
                
                # Κατηγοριοποίηση βάσει οφειλών
                if total_due >= 0:
                    status = "Ενημερωμένο"
                    current_apartments += 1
                elif abs(total_due) <= total_amount * 2:
                    status = "Οφειλή"
                    behind_apartments += 1
                else:
                    status = "Κρίσιμο"
                    critical_apartments += 1
                
                print(f"   Διαμέρισμα {apartment.number}: {status}")
                print(f"     • Συνολικό οφειλόμενο: {total_due:,.2f}€")
                print(f"     • Προηγούμενο υπόλοιπο: {previous_balance:,.2f}€")
                print(f"     • Μηνιαία οφειλή: {total_amount:,.2f}€")
                print()
            
            print("📈 ΣΥΝΟΠΤΙΚΑ ΣΤΑΤΙΣΤΙΚΑ:")
            print(f"   ✅ Ενημερωμένα: {current_apartments} διαμερίσματα")
            print(f"   ⚠️  Οφειλή: {behind_apartments} διαμερίσματα")
            print(f"   ❌ Κρίσιμα: {critical_apartments} διαμερίσματα")
            
        except Exception as e:
            print(f"❌ Σφάλμα στον υπολογισμό: {e}")
        
        # 4. Ανάλυση Ασυμφωνίας
        print("\n🔍 4. ΑΝΑΛΥΣΗ ΑΣΥΜΦΩΝΙΑΣ")
        print("-" * 50)
        
        # Έλεγχος αν το υπόλοιπο περιόδου ταιριάζει με τις πληρωμές
        total_apartment_payments = sum(apartment_payments.values())
        total_apartment_balances = sum(apartment_balances.values())
        
        print(f"💰 Συνολικές πληρωμές διαμερισμάτων: {total_apartment_payments:,.2f}€")
        print(f"📊 Συνολικό υπόλοιπο διαμερισμάτων: {total_apartment_balances:,.2f}€")
        print(f"📈 Υπόλοιπο περιόδου (API): {period_balance:,.2f}€")
        
        # Υπολογισμός αναμενόμενου υπολοίπου
        expected_balance = total_apartment_payments - total_expenses
        print(f"📊 Αναμενόμενο υπόλοιπο: {expected_balance:,.2f}€")
        
        difference = period_balance - expected_balance
        print(f"🔍 Διαφορά: {difference:,.2f}€")
        
        if abs(difference) > Decimal('0.01'):
            print("❌ ΑΣΥΜΦΩΝΙΑ: Το υπόλοιπο περιόδου δεν ταιριάζει με τις πληρωμές!")
        else:
            print("✅ Τα ποσά ταιριάζουν σωστά!")
        
        # 5. Ανάλυση Λόγου Ασυμφωνίας
        print("\n🔍 5. ΑΝΑΛΥΣΗ ΛΟΓΟΥ ΑΣΥΜΦΩΝΙΑΣ")
        print("-" * 50)
        
        # Έλεγχος για διαφορετικούς τύπους πληρωμών
        payment_types = Payment.objects.filter(
            apartment__building_id=building_id
        ).values('payment_type').annotate(
            count=Count('id'),
            total=Sum('amount')
        ).order_by('-total')
        
        print("📊 Τύποι πληρωμών:")
        for type_data in payment_types:
            type_label = dict(Payment.PAYMENT_TYPES).get(type_data['payment_type'], type_data['payment_type'])
            print(f"   • {type_label}: {type_data['count']} πληρωμές, {type_data['total']:,.2f}€")
        
        # Έλεγχος για reserve fund payments
        reserve_payments = Payment.objects.filter(
            apartment__building_id=building_id,
            payment_type='reserve_fund'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"\n💰 Εισφορές αποθεματικού: {reserve_payments:,.2f}€")
        
        # Έλεγχος για άλλους τύπους πληρωμών που μπορεί να μην υπολογίζονται στο payment status
        other_payments = Payment.objects.filter(
            apartment__building_id=building_id
        ).exclude(
            payment_type__in=['common_expenses', 'reserve_fund']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"💰 Άλλες πληρωμές: {other_payments:,.2f}€")
        
        # 6. Συμπέρασμα
        print("\n📋 6. ΣΥΜΠΕΡΑΣΜΑ")
        print("-" * 50)
        
        if abs(difference) > Decimal('0.01'):
            print("🔍 ΠΙΘΑΝΟΙ ΛΟΓΟΙ ΑΣΥΜΦΩΝΙΑΣ:")
            print("   1. Διαφορετική λογική υπολογισμού μεταξύ snapshot view και payment status")
            print("   2. Εκκρεμείς δαπάνες που δεν έχουν χρεωθεί ακόμα")
            print("   3. Διαφορετικά φίλτρα ημερομηνίας")
            print("   4. Πληρωμές που δεν ανήκουν σε κοινόχρηστα")
            print("   5. Σφάλμα στον υπολογισμό του payment status analysis")
        else:
            print("✅ Δεν υπάρχει ασυμφωνία στα ποσά")
        
        print(f"\n💡 ΠΡΟΤΑΣΕΙΣ:")
        print("   1. Επιβεβαίωση λογικής υπολογισμού payment status")
        print("   2. Έλεγχος φίλτρων ημερομηνίας")
        print("   3. Διαχωρισμός τύπων πληρωμών")
        print("   4. Ενημέρωση documentation")

if __name__ == "__main__":
    analyze_payment_discrepancy()
