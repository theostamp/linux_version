#!/usr/bin/env python3
"""
Απλό script για τη διαγραφή όλων των οικονομικών ποσών από τη βάση δεδομένων

Χρήση:
1. Αντιγράψτε το script στο Docker container
2. Εκτελέστε το μέσα στο container
3. Ακολουθήστε τις οδηγίες για επιβεβαίωση

⚠️  ΠΡΟΣΟΧΗ: Αυτό το script διαγράφει ΜΟΝΙΜΑ όλα τα οικονομικά δεδομένα!
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.db import transaction

def clear_financial_data():
    """Διαγράφει όλα τα οικονομικά δεδομένα"""
    
    print("🚨 ΕΚΚΙΝΗΣΗ ΔΙΑΓΡΑΦΗΣ ΟΛΩΝ ΤΩΝ ΟΙΚΟΝΟΜΙΚΩΝ ΔΕΔΟΜΕΝΩΝ 🚨")
    print("=" * 60)
    
    # Επιβεβαίωση
    confirmation = input("Διαγράφω ΟΛΑ τα οικονομικά δεδομένα; (yes/no): ")
    if confirmation.lower() != 'yes':
        print("❌ Ακύρωση.")
        return
    
    try:
        with schema_context('demo'):
            with transaction.atomic():
                
                # Διαγραφή σε σωστή σειρά (αποφυγή foreign key errors)
                
                # 1. Συναλλαγές
                from financial.models import Transaction
                t_count = Transaction.objects.count()
                Transaction.objects.all().delete()
                print(f"✅ Διαγράφηκαν {t_count} συναλλαγές")
                
                # 2. Εισπράξεις
                from financial.models import Payment
                p_count = Payment.objects.count()
                Payment.objects.all().delete()
                print(f"✅ Διαγράφηκαν {p_count} εισπράξεις")
                
                # 3. Αποδείξεις
                from financial.models import FinancialReceipt
                r_count = FinancialReceipt.objects.count()
                FinancialReceipt.objects.all().delete()
                print(f"✅ Διαγράφηκαν {r_count} αποδείξεις")
                
                # 4. Σχέσεις δαπανών-διαμερισμάτων
                from financial.models import ExpenseApartment
                ea_count = ExpenseApartment.objects.count()
                ExpenseApartment.objects.all().delete()
                print(f"✅ Διαγράφηκαν {ea_count} σχέσεις δαπανών-διαμερισμάτων")
                
                # 5. Μερίδια διαμερισμάτων
                from financial.models import ApartmentShare
                s_count = ApartmentShare.objects.count()
                ApartmentShare.objects.all().delete()
                print(f"✅ Διαγράφηκαν {s_count} μερίδια διαμερισμάτων")
                
                # 6. Περίοδοι κοινοχρήστων
                from financial.models import CommonExpensePeriod
                cp_count = CommonExpensePeriod.objects.count()
                CommonExpensePeriod.objects.all().delete()
                print(f"✅ Διαγράφηκαν {cp_count} περίοδοι κοινοχρήστων")
                
                # 7. Μετρήσεις
                from financial.models import MeterReading
                m_count = MeterReading.objects.count()
                MeterReading.objects.all().delete()
                print(f"✅ Διαγράφηκαν {m_count} μετρήσεις")
                
                # 8. Δαπάνες
                from financial.models import Expense
                e_count = Expense.objects.count()
                Expense.objects.all().delete()
                print(f"✅ Διαγράφηκαν {e_count} δαπάνες")
                
                # 9. Προμηθευτές
                from financial.models import Supplier
                sup_count = Supplier.objects.count()
                Supplier.objects.all().delete()
                print(f"✅ Διαγράφηκαν {sup_count} προμηθευτές")
                
                # 10. Μηδενισμός υπόλοιπων διαμερισμάτων
                from apartments.models import Apartment
                apt_count = Apartment.objects.count()
                
                for apt in Apartment.objects.all():
                    apt.current_balance = Decimal('0.00')
                    apt.save()
                
                print(f"✅ Μηδενίστηκαν τα υπόλοιπα για {apt_count} διαμερίσματα")
                
                # 11. Audit logs (αν υπάρχουν)
                try:
                    from financial.audit import FinancialAuditLog
                    audit_count = FinancialAuditLog.objects.count()
                    FinancialAuditLog.objects.all().delete()
                    print(f"✅ Διαγράφηκαν {audit_count} audit logs")
                except:
                    print("ℹ️  Audit logs δεν βρέθηκαν")
                
                print("\n🎉 ΕΠΙΤΥΧΗΣ ΔΙΑΓΡΑΦΗ!")
                print(f"📊 Σύνολο: {t_count + p_count + r_count + ea_count + s_count + cp_count + m_count + e_count + sup_count} εγγραφές")
                
    except Exception as e:
        print(f"❌ Σφάλμα: {str(e)}")
        raise

if __name__ == "__main__":
    clear_financial_data()
