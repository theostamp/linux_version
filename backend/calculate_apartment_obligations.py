import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Apartment, Expense, Payment, Transaction
from buildings.models import Building
from decimal import Decimal
from django.db.models import Sum
from datetime import date

def calculate_apartment_obligations():
    """Υπολογίζει τις συσσωρευμένες οφειλές ανά διαμέρισμα"""
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)  # Αραχώβης 12
        apartments = Apartment.objects.filter(building_id=building.id)
        expenses = Expense.objects.filter(building_id=building.id)
        
        print("🔍 ΥΠΟΛΟΓΙΣΜΟΣ ΣΥΣΣΩΡΕΥΜΕΝΩΝ ΟΦΕΙΛΩΝ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ")
        print("=" * 60)
        
        # Αρχικοποίηση αποτελεσμάτων
        apartment_obligations = {}
        for apt in apartments:
            apartment_obligations[apt.id] = {
                'apartment_id': apt.id,
                'apartment_number': apt.number,
                'owner_name': apt.owner_name or 'Άγνωστος',
                'participation_mills': apt.participation_mills or 0,
                'current_balance': apt.current_balance or Decimal('0.00'),
                'total_obligations': Decimal('0.00'),
                'total_payments': Decimal('0.00'),
                'net_obligation': Decimal('0.00'),
                'expense_breakdown': [],
                'payment_breakdown': []
            }
        
        # Υπολογισμός συνολικών χιλιοστών
        total_mills = sum(apt.participation_mills or 0 for apt in apartments)
        apartments_count = apartments.count()
        
        print(f"📊 ΣΤΑΤΙΣΤΙΚΑ ΚΤΙΡΙΟΥ:")
        print(f"   • Συνολικά διαμερίσματα: {apartments_count}")
        print(f"   • Συνολικά χιλιοστά: {total_mills}")
        print(f"   • Μέσος όρος χιλιοστών ανά διαμέρισμα: {total_mills/apartments_count:.0f}")
        
        # Επεξεργασία δαπανών
        print(f"\n💰 ΕΠΕΞΕΡΓΑΣΙΑ ΔΑΠΑΝΩΝ:")
        total_expenses = Decimal('0.00')
        
        for expense in expenses:
            print(f"\n   📋 Δαπάνη: {expense.title}")
            print(f"      Ποσό: {expense.amount:,.2f}€")
            print(f"      Κατηγορία: {expense.get_category_display()}")
            print(f"      Κατανομή: {expense.get_distribution_type_display()}")
            
            total_expenses += expense.amount
            
            # Κατανομή ανά διαμέρισμα βάσει τύπου κατανομής
            if expense.distribution_type == 'by_participation_mills':
                # Κατανομή ανά χιλιοστά
                for apt in apartments:
                    mills = apt.participation_mills or 0
                    if total_mills > 0:
                        share = expense.amount * (Decimal(str(mills)) / Decimal(str(total_mills)))
                    else:
                        share = expense.amount / Decimal(str(apartments_count))
                    
                    apartment_obligations[apt.id]['total_obligations'] += share
                    apartment_obligations[apt.id]['expense_breakdown'].append({
                        'expense_id': expense.id,
                        'expense_title': expense.title,
                        'expense_amount': expense.amount,
                        'share_amount': share,
                        'distribution_type': 'by_participation_mills',
                        'mills': mills,
                        'total_mills': total_mills
                    })
                    
                    print(f"      → Apartment {apt.number}: {share:,.2f}€ ({mills}χλ.)")
            
            elif expense.distribution_type == 'equal_share':
                # Ισόποσα κατανομή
                share_per_apartment = expense.amount / Decimal(str(apartments_count))
                for apt in apartments:
                    apartment_obligations[apt.id]['total_obligations'] += share_per_apartment
                    apartment_obligations[apt.id]['expense_breakdown'].append({
                        'expense_id': expense.id,
                        'expense_title': expense.title,
                        'expense_amount': expense.amount,
                        'share_amount': share_per_apartment,
                        'distribution_type': 'equal_share'
                    })
                    
                    print(f"      → Apartment {apt.number}: {share_per_apartment:,.2f}€ (ισόποσα)")
            
            elif expense.distribution_type == 'by_meters':
                # Κατανομή ανά μετρητές (απλοποιημένη - χρησιμοποιούμε χιλιοστά)
                print(f"      ⚠️  Μετρητές - χρησιμοποιούμε χιλιοστά ως fallback")
                for apt in apartments:
                    mills = apt.participation_mills or 0
                    if total_mills > 0:
                        share = expense.amount * (Decimal(str(mills)) / Decimal(str(total_mills)))
                    else:
                        share = expense.amount / Decimal(str(apartments_count))
                    
                    apartment_obligations[apt.id]['total_obligations'] += share
                    apartment_obligations[apt.id]['expense_breakdown'].append({
                        'expense_id': expense.id,
                        'expense_title': expense.title,
                        'expense_amount': expense.amount,
                        'share_amount': share,
                        'distribution_type': 'by_meters',
                        'mills': mills,
                        'total_mills': total_mills
                    })
                    
                    print(f"      → Apartment {apt.number}: {share:,.2f}€ ({mills}χλ.)")
            
            elif expense.distribution_type == 'specific_apartments':
                # Συγκεκριμένα διαμερίσματα (απλοποιημένη - χρησιμοποιούμε χιλιοστά)
                print(f"      ⚠️  Συγκεκριμένα διαμερίσματα - χρησιμοποιούμε χιλιοστά ως fallback")
                for apt in apartments:
                    mills = apt.participation_mills or 0
                    if total_mills > 0:
                        share = expense.amount * (Decimal(str(mills)) / Decimal(str(total_mills)))
                    else:
                        share = expense.amount / Decimal(str(apartments_count))
                    
                    apartment_obligations[apt.id]['total_obligations'] += share
                    apartment_obligations[apt.id]['expense_breakdown'].append({
                        'expense_id': expense.id,
                        'expense_title': expense.title,
                        'expense_amount': expense.amount,
                        'share_amount': share,
                        'distribution_type': 'specific_apartments',
                        'mills': mills,
                        'total_mills': total_mills
                    })
                    
                    print(f"      → Apartment {apt.number}: {share:,.2f}€ ({mills}χλ.)")
        
        # Επεξεργασία πληρωμών
        print(f"\n💳 ΕΠΕΞΕΡΓΑΣΙΑ ΠΛΗΡΩΜΩΝ:")
        total_payments = Decimal('0.00')
        
        payments = Payment.objects.filter(apartment__building_id=building.id)
        for payment in payments:
            apt_id = payment.apartment.id
            amount = payment.amount
            
            apartment_obligations[apt_id]['total_payments'] += amount
            apartment_obligations[apt_id]['payment_breakdown'].append({
                'payment_id': payment.id,
                'payment_date': payment.date,
                'payment_amount': amount,
                'payer_name': payment.payer_name
            })
            
            total_payments += amount
            print(f"   💰 Apartment {payment.apartment.number}: {amount:,.2f}€ ({payment.payer_name})")
        
        # Υπολογισμός καθαρών οφειλών
        print(f"\n📊 ΥΠΟΛΟΓΙΣΜΟΣ ΚΑΘΑΡΩΝ ΟΦΕΙΛΩΝ:")
        total_net_obligations = Decimal('0.00')
        
        for apt_id, data in apartment_obligations.items():
            net_obligation = data['total_obligations'] - data['total_payments']
            data['net_obligation'] = net_obligation
            
            if net_obligation < 0:
                total_net_obligations += abs(net_obligation)
            
            print(f"\n   🏠 Apartment {data['apartment_number']}:")
            print(f"      Ιδιοκτήτης: {data['owner_name']}")
            print(f"      Χιλιοστά: {data['participation_mills']}")
            print(f"      Συνολικές υποχρεώσεις: {data['total_obligations']:,.2f}€")
            print(f"      Συνολικές πληρωμές: {data['total_payments']:,.2f}€")
            print(f"      Καθαρή οφειλή: {net_obligation:,.2f}€")
            print(f"      Τρέχον balance: {data['current_balance']:,.2f}€")
            
            # Εμφάνιση breakdown
            if data['expense_breakdown']:
                print(f"      📋 Breakdown δαπανών:")
                for expense in data['expense_breakdown']:
                    print(f"         • {expense['expense_title']}: {expense['share_amount']:,.2f}€")
        
        print(f"\n" + "=" * 60)
        print("📈 ΣΥΝΟΨΗ:")
        print(f"   • Συνολικές δαπάνες: {total_expenses:,.2f}€")
        print(f"   • Συνολικές πληρωμές: {total_payments:,.2f}€")
        print(f"   • Έλλειμα: {total_expenses - total_payments:,.2f}€")
        print(f"   • Συνολικές καθαρές οφειλές: {total_net_obligations:,.2f}€")
        
        # Ελέγχος συνέπειας
        print(f"\n🔍 ΕΛΕΓΧΟΣ ΣΥΝΕΠΕΙΑΣ:")
        calculated_deficit = total_expenses - total_payments
        actual_deficit = abs(building.current_reserve) if building.current_reserve < 0 else Decimal('0.00')
        
        print(f"   • Υπολογισμένο έλλειμα: {calculated_deficit:,.2f}€")
        print(f"   • Πραγματικό έλλειμα: {actual_deficit:,.2f}€")
        
        if abs(calculated_deficit - actual_deficit) < Decimal('0.01'):
            print(f"   ✅ Τα νούμερα είναι συνεπή!")
        else:
            print(f"   ❌ Διαφορά: {abs(calculated_deficit - actual_deficit):,.2f}€")
            print(f"   🔍 Πιθανή αιτία: Διαχειριστικά τέλη ή άλλες χρεώσεις")
        
        return apartment_obligations

if __name__ == "__main__":
    calculate_apartment_obligations()
